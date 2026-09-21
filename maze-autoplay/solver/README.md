# solver/ — native parallel solving for the extension registry

The extension only needs a verified path string per level. This folder
produces those strings on your own machine — natively, in parallel, and
past what a browser tab can do (a tab caps one visited-set at ~16.7M
entries and shares ~2GB of heap with the page).

Two backends, because levels come in two physics:

- **C (`csolve.c`)** — BFS + A* (binary heap, Manhattan) for the flat 2D
  model: walls, pits, rigid box-groups, chain pushes, pit removal, gem.
  Verified move-for-move against the lab solver: HxF/GxH/GxG expand to the
  *exact* same state counts (HxH differs only in which optimal path wins
  the tie-break). FxE's 19,034,286-state A* runs here in ~48s using
  ~600MB — outright impossible in a browser tab.
- **node (`engsolve.js`, `official.js`)** — the REAL engine physics (ice,
  punchers, lifts, floaters, orange walls, clones) for mechanic levels C
  can't model. Same code the lab used,parameterized by `MB_RUNTIME`.

## Build

```powershell
gcc -O2 -o csolve.exe csolve.c
```

Any C99 compiler works (libc only, no deps). Binary intentionally kept
next to source; `.lvl` files live in `levels/`.

## Level files

`levels/<ID>.lvl` — ASCII grid, first line `16 16`:

```
16 16
######....######
.Goo...........#
...
```

`#` wall · `o` pit · `.` floor · `A`–`F` box groups (same letter = one
rigid group) · `P` player start · `G` gem. Generated from the lab by
`levels.txt` provenance — regenerate with the lab's `genlvl.js` if rooms
change. (Generator lives in temp workspace, not shipped: the `.lvl` files
are the artifact.)

## solve_all.ps1 — the parallel batch

```powershell
.\solve_all.ps1                  # 6 classics (C) + CxO (node A*)
.\solve_all.ps1 -All             # + all 10 engine rooms
.\solve_all.ps1 -Only HxF,OxD    # just these
.\solve_all.ps1 -Runtime D:\x\_runtime -EngineJobs 3
```

Each job solves, writes `solutions/<ID>.txt`, then replays the path in the
real engine (`verify_one.js`) and checks the optimal length where known —
`PASS <ID>: 92 moves, engine-verified` or `FAIL` with the reason. C jobs
all run at once (tiny memory); node engine jobs are throttled to
`-EngineJobs` (default 2, each can take ~2GB).

## Provenance (what's already solved, all engine-verified)

Classic (C re-solved, same optimals): HxF 88 · HxH 56 · GxH 164 ·
FxE 125 · FxF 92 · GxG 220 · GxF 219 · IxE 161.
Engine rooms (bundled official/engine-BFS paths, verified): JxH 117 ·
DxG 202 · JxL 127 · FxB 82 · JxG 134 · OxD 90 · HxC 81 · JxE 174 ·
IxI 34 · NxE 39 · AxP 9 · DxH 56 · DxN 46 · ExM 35 · LxP 43 · MxD 103 ·
MxN 38 · NxF 33 · NxN 78 · PxA 9 · PxG 78 · PxH 76 · PxL 32 · PxP 9 ·
CxL 99 · FxO 118 · LxI 117 · PxD 81 · HxP 32 (clones+lift+puncher; note: verify HxP single-room —
T.applyMove silently switches rooms on edge steps, which once
fake-failed it; use verify_one.js, now single-room).
New (2026-09-20 sweep, verified): MxL 74 (engine BFS, 84 states) ·
AxM 39 (official A*, 60k states) · BxI 463→365 (manual + windows) · DxM 176
(manual 200 + windows; the pasted path turned out to be for DxM, not BxM —
verified first, asked questions later).
Proven solo-inaccessible (exhaustive search, no win from reset): ExC ·
CxE · FxC · BxF · IxJ · LxC · AxA · AxI · AxK · BxG · CxD · CxG · MxF ·
MxI · MxJ · OxK · PxN · CxO (needs cross-room means) · NxI (125 states) ·
ExF (81k) · AxG (135k) · FxK (67k) · MxO (1.87M) · PxO (2.5M).
Solver false positive (official path blocked at step 35 single-room,
engine BFS OOMs — excluded): PxM.
Still open (capped/OOM/timeout, retry with bigger caps): AxF · AxL ·
AxO · BxM · CxP · DxL · DxO · ExO · ExP · GxI · HxK · FxL ·
IxB · IxP · JxC · NxP · OxC · PxE · PxJ. Full triage table + per-room
difficulty notes: `../REGISTRY.md`.
CxO (orange+lift+slope, 9 boxes) is the open one: engine BFS OOMs at
~1.3M states, official A* capped at 2M, engine A* searched 3M states
(~13 min) with no solution. Its `CxO` job stays in `solve_all.ps1` —
rerun with a bigger cap / more RAM if you want to take another run at it.
To add a room: solve it (batch or by hand), verify with
`node verify_one.js <ID> <pathfile>`, append to `../solutions.js`.

## Files

- `csolve.c` — the native solver (`csolve level.lvl [bfs|astar] [capM]`,
  prints `SOLVED moves=… expanded=… visited=… time=… path=…`).
- `levels/` — 6 classic rooms in `.lvl` format.
- `engsolve.js` — engine BFS/A* over real states (`MB_RUNTIME`, `MB_OUT` env).
- `official.js` — built-in A* wrapper (for rooms like DxG where BFS drowns).
- `verify_one.js` — real-engine replay check (`VERIFIED <ID> <moves>`).
- `solve_all.ps1` — parallel batch + verify + report.
- `solutions/` — batch output (raw paths), created on first run.
