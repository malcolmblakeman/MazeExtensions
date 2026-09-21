// Engine-driven BFS/A* over REAL engine states. Usage: engsolve.js <LVL> <bfs|astar> [capM]
// Env: MB_RUNTIME = path to mazebench_cli/_runtime (default below), MB_OUT = dir for solve JSON (default: temp).
const path = require("path");
const fs = require("fs");
const TMP = "C:\\Users\\issac\\AppData\\Local\\Temp\\opencode\\";
const rt = process.env.MB_RUNTIME || (TMP + "mazebench_pkg\\mazebench_cli\\_runtime");
const OUT = process.env.MB_OUT || TMP;
const T = require(path.join(rt, "scripts", "maze-terminal.js"));
const LVL = process.argv[2], MODE = process.argv[3] || "bfs", CAP = Math.floor(Number(process.argv[4] || 8) * 1e6);

async function main() {
  const mazeEngine = T.loadMazeEngine();
  const ctx = T.createTerminalContext(mazeEngine, { gameId: "maze", levelId: "level_" + LVL, pitch: 1, yaw: 0, gameWonGemCount: 100, hideNames: false, hideNamesSeed: "1", omniscient: true });
  const eng = ctx.engine;
  let pIdx = -1;
  const gems = [];
  for (let i = 0; i < eng.actorCount; i++) {
    if (eng.actorTypes[i] === "player" && pIdx < 0) pIdx = i;
    if (eng.actorTypes[i] === "gem") gems.push(i);
  }
  const isDFS = false;
  const isAstar = MODE === "astar";
  const DIRS = [[0, -1, "U"], [0, 1, "D"], [-1, 0, "L"], [1, 0, "R"]];
  const SH = 64;
  const stores = Array.from({ length: SH }, () => new Set());
  const vhas = k => stores[k.charCodeAt(0) % SH].has(k);
  const vadd = k => { stores[k.charCodeAt(0) % SH].add(k); };
  const t0 = Date.now();
  const states = [], par = [], pmv = [], dep = [], pri = [], heap = [];
  const root = eng.createStateBuffer();
  eng.copyStateInto(root, ctx.state);
  const k0 = eng.stateKey(root);
  states.push(root); par.push(-1); pmv.push(-1); dep.push(0); pri.push(0); vadd(k0);
  const hOf = st => {
    let best = Infinity, hp = false, hg = false;
    for (let i = 0; i < eng.actorCount; i++) {
      if (eng.actorTypes[i] === "player" && !st.actorRemoved[i]) { hp = true; var px = st.actorX[i], py = st.actorY[i]; }
    }
    for (const g of gems) {
      if (!st.actorRemoved[g]) {
        hg = true;
        const d = Math.abs(st.actorX[g] - px) + Math.abs(st.actorY[g] - py);
        if (d < best) best = d;
      }
    }
    return hp && hg ? best : 0;
  };
  const less = (a, b) => pri[a] !== pri[b] ? pri[a] < pri[b] : dep[a] !== dep[b] ? dep[a] < dep[b] : a < b;
  const hpush = i => {
    heap.push(i);
    let c = heap.length - 1;
    while (c > 0) { const p = (c - 1) >> 1; if (less(heap[p], heap[c])) break; const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p; }
  };
  const hpop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let m = c;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === c) break;
        const t = heap[m]; heap[m] = heap[c]; heap[c] = t; c = m;
      }
    }
    return top;
  };
  let head = 0;
  if (isAstar) hpush(0);
  let expanded = 0, found = -1;
  const order = [0, 1, 2, 3];
  while ((isAstar ? heap.length > 0 : head < states.length) && expanded < CAP) {
    const si = isAstar ? hpop() : head++;
    const st = states[si];
    expanded++;
    if (expanded % 200000 === 0) {
      let vs = 0; for (const s of stores) vs += s.size;
      console.log(`... expanded=${expanded} frontier=${isAstar ? heap.length : states.length - head} visited=${vs} elapsed=${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    const d = dep[si];
    for (const di of order) {
      const [dx, dy] = DIRS[di];
      const ns = eng.createStateBuffer();
      eng.copyStateInto(ns, st);
      const r = eng.moveForSearch(ns, dx, dy);
      if (!r.moved) continue;
      if (ns.actorRemoved[pIdx]) continue; // dead
      if (eng.isSolved(ns)) {
        states.push(ns); par.push(si); pmv.push(di); dep.push(d + 1); pri.push(d + 1);
        found = states.length - 1;
        break;
      }
      const kk = eng.stateKey(ns);
      if (vhas(kk)) continue;
      vadd(kk);
      states.push(ns); par.push(si); pmv.push(di); dep.push(d + 1);
      const f = d + 1 + (isAstar ? hOf(ns) : 0);
      pri.push(f);
      if (isAstar) hpush(states.length - 1);
    }
    if (found >= 0) break;
  }
  const elapsed = (Date.now() - t0) / 1000;
  if (found < 0) { console.log(`ENG_${MODE}_${LVL}: NO_SOLUTION expanded=${expanded} elapsed=${elapsed.toFixed(0)}s`); process.exit(2); }
  let pathStr = "", cur = found;
  while (par[cur] >= 0) { pathStr = DIRS[pmv[cur]][2] + pathStr; cur = par[cur]; }
  let vs = 0; for (const s of stores) vs += s.size;
  console.log(`ENG_${MODE}_${LVL}: moves=${pathStr.length} expanded=${expanded} visited=${vs} elapsed=${elapsed.toFixed(1)}s`);
  fs.writeFileSync(OUT + `solve_${LVL}_eng${MODE}.json`, JSON.stringify({ level: LVL, mode: "eng-" + MODE, moves: pathStr.length, expanded, visited: vs, elapsed: Number(elapsed.toFixed(1)), path: pathStr }));
}
main().catch(e => { console.error(e); process.exit(1); });
