/* csolve.c — native BFS / A* solver for the MazeBench flat 2D box model.
 *
 * Rules (verified 1:1 against the real engine on the classic levels):
 *  - 4-dir moves. Walls / map edge block. Stepping into a pit with no box dies.
 *  - Walking into a box pushes its whole rigid group; groups chain-push.
 *  - A push blocked by a wall/edge (incl. via chain) does nothing.
 *  - A group pushed fully onto pits falls in and is removed.
 *  - The cell a pushed box vacates must be floor — if it's a pit, you fall in.
 *  - Step on the gem to win. Death states are pruned (never enqueued).
 *
 * Level file format:
 *   16 16
 *   16 rows of 16 chars: '#' wall, 'o' pit, '.' floor,
 *     'A'-'F' box cells (same letter = one rigid group),
 *     'P' player start (on floor), 'G' gem (on floor).
 *
 * Usage: csolve level.lvl [bfs|astar] [capM]
 *   capM = state cap in millions (default 250). Prints one line:
 *   SOLVED moves=88 expanded=2705799 visited=2761323 time=6.2s path=LLLL...
 *   or: NO_SOLUTION expanded=... / CAPPED expanded=... (same trailing fields)
 *
 * Memory: ~40 bytes/node + hash table. 20M states ~= 1.6GB worst case.
 * Compile: gcc -O2 -o csolve csolve.c   (C99, libc only)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>

#define MAXN 256
#define MAXG 6
#define DX4 ((const int[4]){0, 0, -1, 1})
#define DY4 ((const int[4]){-1, 1, 0, 0})
#define MVCH ((const char[4]){'U', 'D', 'L', 'R'})

static int W, H, G;
static uint8_t iswall[MAXN], ishole[MAXN];
static int start_p, gem, gemx, gemy;
static int goff[MAXG][MAXN], goffn[MAXG];
static int gax0[MAXG], gay0[MAXG];

/* node storage (parallel arrays) */
static uint8_t *nd_p;
static uint8_t *nd_a;    /* nnodes * G anchors */
static uint8_t *nd_pr;   /* nnodes * G present */
static int32_t *nd_par;
static uint8_t *nd_mv;
static int32_t *nd_dep;
static size_t nnodes, ncap;

static int use_astar;
static int64_t *heap;    /* A* binary heap of node indices */
static int32_t *hpri;    /* f = g + h */
static size_t hlen, hcap;
static int32_t *queue;   /* BFS fifo */
static size_t qhead, qtail, qcap;

/* visited: open addressing, FNV-1a 64 over canonical state bytes */
static uint64_t *vhash;
static int32_t *vnode;
static size_t vcap, vmask, vsize;

static uint64_t fnv(const uint8_t *b, size_t n) {
    uint64_t h = 1469598103934665603ULL;
    for (size_t i = 0; i < n; i++) { h ^= b[i]; h *= 1099511628211ULL; }
    return h ? h : 1;
}

static void die(const char *m) { fprintf(stderr, "csolve: %s\n", m); exit(2); }

static void *xmalloc(size_t n) { void *p = malloc(n ? n : 1); if (!p) die("out of memory"); return p; }
static void *xrealloc(void *p, size_t n) { p = realloc(p, n ? n : 1); if (!p) die("out of memory"); return p; }

static void state_bytes(int32_t ni, uint8_t *out) {
    out[0] = nd_p[ni];
    for (int i = 0; i < G; i++) { out[1 + 2 * i] = nd_a[(size_t)ni * MAXG + i]; out[1 + 2 * i + 1] = nd_pr[(size_t)ni * MAXG + i]; }
}

/* returns node index if seen, else -1 (and inserts) */
static int32_t vis_check_add(int32_t ni) {
    uint8_t buf[1 + 2 * MAXG];
    state_bytes(ni, buf);
    uint64_t h = fnv(buf, (size_t)(1 + 2 * G));
    size_t m = (size_t)(h & vmask);
    for (;;) {
        if (vnode[m] == -1) {
            if ((vsize + 1) * 4 > vcap * 3) return -2; /* grow needed */
            vhash[m] = h; vnode[m] = ni; vsize++;
            return -1;
        }
        if (vhash[m] == h) {
            /* full compare to rule out collision */
            uint8_t ob[1 + 2 * MAXG];
            state_bytes(vnode[m], ob);
            if (memcmp(buf, ob, (size_t)(1 + 2 * G)) == 0) return vnode[m];
        }
        m = (m + 1) & vmask;
    }
}

static void vis_grow(void) {
    size_t ncap2 = vcap ? vcap * 2 : (1u << 20);
    uint64_t *oh = vhash; int32_t *on = vnode; size_t oc = vcap;
    vhash = (uint64_t *)xmalloc(ncap2 * sizeof(uint64_t));
    vnode = (int32_t *)xmalloc(ncap2 * sizeof(int32_t));
    for (size_t i = 0; i < ncap2; i++) vnode[i] = -1;
    vcap = ncap2; vmask = ncap2 - 1; vsize = 0;
    if (oc) {
        for (size_t i = 0; i < oc; i++) if (on[i] != -1) {
            uint64_t h = oh[i];
            size_t m = (size_t)(h & vmask);
            while (vnode[m] != -1) m = (m + 1) & vmask;
            vhash[m] = h; vnode[m] = on[i]; vsize++;
        }
        free(oh); free(on);
    }
}

static void nodes_grow(void) {
    size_t nc = ncap ? ncap * 2 : (1u << 20);
    nd_p = (uint8_t *)xrealloc(nd_p, nc);
    nd_a = (uint8_t *)xrealloc(nd_a, nc * MAXG);
    nd_pr = (uint8_t *)xrealloc(nd_pr, nc * MAXG);
    nd_par = (int32_t *)xrealloc(nd_par, nc * sizeof(int32_t));
    nd_mv = (uint8_t *)xrealloc(nd_mv, nc);
    nd_dep = (int32_t *)xrealloc(nd_dep, nc * sizeof(int32_t));
    hpri = (int32_t *)xrealloc(hpri, nc * sizeof(int32_t));
    ncap = nc;
}

static int32_t node_new(void) {
    if (nnodes >= ncap) nodes_grow();
    return (int32_t)(nnodes++);
}

static int manhattan(int p) {
    int dx = (p % W) - gemx, dy = (p / W) - gemy;
    if (dx < 0) dx = -dx;
    if (dy < 0) dy = -dy;
    return dx + dy;
}

/* heap (A*): smaller f, then smaller depth, then smaller index */
static int hless(size_t a, size_t b) {
    int32_t ia = (int32_t)heap[a], ib = (int32_t)heap[b];
    if (hpri[ia] != hpri[ib]) return hpri[ia] < hpri[ib];
    if (nd_dep[ia] != nd_dep[ib]) return nd_dep[ia] < nd_dep[ib];
    return ia < ib;
}
static void hpush(int32_t ni, int f) {
    if (hlen >= hcap) { hcap = hcap ? hcap * 2 : (1u << 20); heap = (int64_t *)xrealloc(heap, hcap * sizeof(int64_t)); }
    hpri[ni] = f;
    size_t c = hlen++;
    heap[c] = ni;
    while (c > 0) {
        size_t p = (c - 1) >> 1;
        if (!hless(c, p)) break;
        int64_t t = heap[p]; heap[p] = heap[c]; heap[c] = t;
        c = p;
    }
}
static int32_t hpop(void) {
    int32_t top = (int32_t)heap[0];
    int64_t last = heap[--hlen];
    if (hlen) {
        heap[0] = last;
        size_t c = 0;
        for (;;) {
            size_t l = c * 2 + 1, r = l + 1, m = c;
            if (l < hlen && hless(l, m)) m = l;
            if (r < hlen && hless(r, m)) m = r;
            if (m == c) break;
            int64_t t = heap[m]; heap[m] = heap[c]; heap[c] = t;
            c = m;
        }
    }
    return top;
}
static void qpush(int32_t ni) {
    if (qtail >= qcap) { qcap = qcap ? qcap * 2 : (1u << 20); queue = (int32_t *)xrealloc(queue, qcap * sizeof(int32_t)); }
    queue[qtail++] = ni;
}

/* occupancy of present groups for node ni; occ[c] = group or -1 */
static void build_occ(int32_t ni, int8_t *occ, int *tmp) {
    (void)tmp;
    for (int c = 0; c < W * H; c++) occ[c] = -1;
    for (int gi = 0; gi < G; gi++) {
        if (!nd_pr[(size_t)ni * MAXG + gi]) continue;
        int a = nd_a[(size_t)ni * MAXG + gi];
        int ax = a % W, ay = a / W;
        for (int k = 0; k < goffn[gi]; k++) {
            int c = (ay + goff[gi][2 * k + 1]) * W + (ax + goff[gi][2 * k]);
            occ[c] = (int8_t)gi;
        }
    }
}

/* returns 1 + sets out_* on win, 0 to enqueue child in nA/nR, -1 dead/blocked */
static int apply_step(const int8_t *occ, int p, int di,
                      uint8_t *nA, uint8_t *nR, int *won) {
    int dx = DX4[di], dy = DY4[di];
    int px = p % W, py = p / W;
    int nx = px + dx, ny = py + dy;
    *won = 0;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return -1;
    int nk = ny * W + nx;
    if (iswall[nk]) return -1;
    int hit = occ[nk];
    if (ishole[nk] && hit < 0) return -1; /* died */
    if (hit < 0) {
        if (nk == gem) *won = 1;
        return 0;
    }
    /* chain closure */
    uint8_t inM[MAXG] = {0};
    inM[hit] = 1;
    int stable = 0, ok = 1;
    while (!stable && ok) {
        stable = 1;
        for (int gi = 0; gi < G; gi++) {
            if (!inM[gi]) continue;
            int ax = nA[gi] % W, ay = nA[gi] / W;
            for (int k = 0; k < goffn[gi]; k++) {
                int cx = ax + goff[gi][2 * k] + dx, cy = ay + goff[gi][2 * k + 1] + dy;
                if (cx < 0 || cy < 0 || cx >= W || cy >= H) { ok = 0; break; }
                int ck = cy * W + cx;
                if (iswall[ck]) { ok = 0; break; }
                int q2 = occ[ck];
                if (q2 >= 0 && q2 != gi && !inM[q2]) { inM[q2] = 1; stable = 0; }
            }
            if (!ok) break;
        }
    }
    if (!ok) return -1;
    /* destination collision */
    uint8_t seen[MAXN] = {0};
    for (int gi = 0; gi < G && ok; gi++) {
        if (!inM[gi]) continue;
        int ax = nA[gi] % W, ay = nA[gi] / W;
        for (int k = 0; k < goffn[gi]; k++) {
            int ck = (ay + goff[gi][2 * k + 1] + dy) * W + (ax + goff[gi][2 * k] + dx);
            if (seen[ck]) { ok = 0; break; }
            seen[ck] = 1;
        }
    }
    if (!ok) return -1;
    for (int gi = 0; gi < G; gi++) {
        if (!inM[gi]) continue;
        nA[gi] = (uint8_t)((nA[gi] / W + dy) * W + (nA[gi] % W + dx));
    }
    for (int gi = 0; gi < G; gi++) {
        if (!inM[gi]) continue;
        int allh = 1;
        int ax = nA[gi] % W, ay = nA[gi] / W;
        for (int k = 0; k < goffn[gi]; k++) {
            if (!ishole[(ay + goff[gi][2 * k + 1]) * W + (ax + goff[gi][2 * k])]) { allh = 0; break; }
        }
        if (allh) nR[gi] = 0;
    }
    if (ishole[nk]) return -1; /* stepped into vacated pit: died */
    if (nk == gem) *won = 1;
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: csolve level.lvl [bfs|astar] [capM]\n"); return 2; }
    use_astar = (argc >= 3 && strcmp(argv[2], "astar") == 0);
    double capM = (argc >= 4) ? atof(argv[3]) : 250.0;
    int64_t cap = (int64_t)(capM * 1000000.0);

    FILE *f = fopen(argv[1], "r");
    if (!f) die("cannot open level file");
    if (fscanf(f, "%d %d", &W, &H) != 2) die("bad header");
    if (W * H > MAXN) die("board too big");
    char row[64];
    int pc = 0, gc = 0, nP = 0, nG = 0;
    int8_t cellgrp[MAXN];
    for (int c = 0; c < W * H; c++) cellgrp[c] = -1;
    memset(iswall, 0, sizeof iswall);
    memset(ishole, 0, sizeof ishole);
    for (int y = 0; y < H; y++) {
        if (!fgets(row, sizeof row, f)) die("short file");
        /* skip blank line right after header */
        if (y == 0 && (row[0] == '\n' || row[0] == '\r')) { y--; continue; }
        if ((int)strlen(row) < W) die("short row");
        for (int x = 0; x < W; x++) {
            char ch = row[x];
            int c = y * W + x;
            if (ch == '#') iswall[c] = 1;
            else if (ch == 'o') ishole[c] = 1;
            else if (ch == 'P') { pc = c; nP++; }
            else if (ch == 'G') { gc = c; nG++; }
            else if (ch >= 'A' && ch <= 'F') cellgrp[c] = (int8_t)(ch - 'A');
            else if (ch != '.') die("bad cell char");
        }
    }
    fclose(f);
    if (nP != 1 || nG != 1) die("need exactly one P and one G");
    start_p = pc; gem = gc; gemx = gc % W; gemy = gc / W;
    /* groups: collect cells per letter present */
    G = 0;
    int gmap[6];
    for (int i = 0; i < 6; i++) gmap[i] = -1;
    for (int c = 0; c < W * H; c++) if (cellgrp[c] >= 0 && gmap[cellgrp[c]] < 0) gmap[cellgrp[c]] = G++;
    if (G > MAXG) die("too many groups");
    if (G == 0) die("no boxes");
    for (int c = 0; c < W * H; c++) {
        if (cellgrp[c] < 0) continue;
        int gi = gmap[cellgrp[c]];
        int x = c % W, y = c / W;
        goff[gi][2 * goffn[gi]] = x; goff[gi][2 * goffn[gi] + 1] = y;
        goffn[gi]++;
    }
    /* normalize: anchor = min (y,x), offsets relative */
    for (int gi = 0; gi < G; gi++) {
        int mx = W, my = H;
        for (int k = 0; k < goffn[gi]; k++) {
            if (goff[gi][2 * k + 1] < my || (goff[gi][2 * k + 1] == my && goff[gi][2 * k] < mx)) {
                mx = goff[gi][2 * k]; my = goff[gi][2 * k + 1];
            }
        }
        for (int k = 0; k < goffn[gi]; k++) { goff[gi][2 * k] -= mx; goff[gi][2 * k + 1] -= my; }
        gax0[gi] = mx; gay0[gi] = my;
    }

    clock_t t0 = clock();
    vis_grow();
    int32_t root = node_new();
    nd_p[root] = (uint8_t)start_p;
    for (int gi = 0; gi < G; gi++) {
        nd_a[(size_t)root * MAXG + gi] = (uint8_t)(gay0[gi] * W + gax0[gi]);
        nd_pr[(size_t)root * MAXG + gi] = 1;
    }
    nd_par[root] = -1; nd_mv[root] = 0; nd_dep[root] = 0;
    vis_check_add(root);
    if (!use_astar) qpush(root);
    else hpush(root, manhattan(start_p));

    int8_t occ[MAXN];
    uint8_t nA[MAXG], nR[MAXG];
    int64_t expanded = 0;
    int32_t found = -1;
    int capped = 0;
    for (;;) {
        int32_t si;
        if (use_astar) { if (!hlen) break; si = hpop(); }
        else { if (qhead >= qtail) break; si = queue[qhead++]; }
        if (expanded >= cap) { capped = 1; break; }
        expanded++;
        int p = nd_p[si];
        for (int i = 0; i < G; i++) { nA[i] = nd_a[(size_t)si * MAXG + i]; nR[i] = nd_pr[(size_t)si * MAXG + i]; }
        build_occ(si, occ, NULL);
        int d = nd_dep[si];
        for (int di = 0; di < 4; di++) {
            int dx = DX4[di], dy = DY4[di];
            int px = p % W, py = p / W;
            int nx = px + dx, ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            int nk = ny * W + nx;
            if (iswall[nk]) continue;
            int hit = occ[nk];
            if (ishole[nk] && hit < 0) continue;
            int won = 0;
            for (int i = 0; i < G; i++) { nA[i] = nd_a[(size_t)si * MAXG + i]; nR[i] = nd_pr[(size_t)si * MAXG + i]; }
            int r = apply_step(occ, p, di, nA, nR, &won);
            if (r < 0) {
                continue;
            }
            int32_t ni = node_new();
            nd_p[ni] = (uint8_t)nk;
            for (int i = 0; i < G; i++) { nd_a[(size_t)ni * MAXG + i] = nA[i]; nd_pr[(size_t)ni * MAXG + i] = nR[i]; }
            nd_par[ni] = si; nd_mv[ni] = (uint8_t)di; nd_dep[ni] = d + 1;
            if (won) { found = ni; break; }
            int32_t seen = vis_check_add(ni);
            if (seen == -2) { vis_grow(); seen = vis_check_add(ni); }
            if (seen >= 0) { nnodes--; continue; }
            if (use_astar) hpush(ni, d + 1 + manhattan(nk));
            else qpush(ni);
            for (int i = 0; i < G; i++) { nA[i] = nd_a[(size_t)si * MAXG + i]; nR[i] = nd_pr[(size_t)si * MAXG + i]; }
        }
        if (found >= 0) break;
        for (int i = 0; i < G; i++) { nA[i] = nd_a[(size_t)si * MAXG + i]; nR[i] = nd_pr[(size_t)si * MAXG + i]; }
    }
    double el = (double)(clock() - t0) / CLOCKS_PER_SEC;
    if (found >= 0) {
        /* reconstruct */
        static char path[1 << 20];
        int len = 0, cur = found;
        while (nd_par[cur] >= 0) { path[len++] = MVCH[nd_mv[cur]]; cur = nd_par[cur]; }
        for (int i = 0; i < len / 2; i++) { char t = path[i]; path[i] = path[len - 1 - i]; path[len - 1 - i] = t; }
        path[len] = 0;
        printf("SOLVED moves=%d expanded=%lld visited=%llu time=%.1fs path=%s\n",
            len, (long long)expanded, (unsigned long long)vsize, el, path);
        return 0;
    }
    printf("%s expanded=%lld visited=%llu time=%.1fs\n",
        capped ? "CAPPED" : "NO_SOLUTION", (long long)expanded, (unsigned long long)vsize, el);
    return 1;
}
