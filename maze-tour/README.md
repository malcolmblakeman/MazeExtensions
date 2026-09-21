# MazeBench World Tour (Chrome extension)

![route map](route-map.svg)

Two precomputed tours, one panel (**A · MxE / B · FxF** switch, resets
progress):

- **Path A** (45 legs): start in **HxI**, gems in **HxH → GxH → HxF → GxF →
  FxE → IxE → IxI → JxH → JxG → JxE**, finish in **MxE** — 2152 moves.
  **Every reachable gem: 10/10** (IxJ's gem is proven solo-unreachable; all
  other gem rooms live in disconnected map components with no walkable
  portal).
- **Path B** (29 legs): same trunk through the FxE gem, then south instead
  of IxE, with the GxG loop and the southern run to ExF: `HxI → HxH 💎 → GxH 💎 → HxH → HxG → HxF 💎 → GxF 💎 → HxF → HxE → GxE → FxE 💎 → FxF 💎 → FxG → GxG 💎 → FxG → FxH → FxI → FxJ → ExJ → ExI → ExH → ExG → ExF` (tour ends, arrival only — the gem is proven solo-unreachable, twice at exactly 81,020 states) — 1916 moves, 7 gems.
  (legs: 35 + 55 + 8 + 167 + 40 + 8 + 27 + 90 + 2 + 227 + 30 + 12 + 13 + 48 + 127 + 20 + 95 + 17 + 166 + 222 + 17 + 121 + 36 + 65 + 34 + 43 + 58 + 49 + 84).
  FxG transits are manual solves: south 135 → 103, east 267 → 165. The
  east→south join came from your bridge idea (walk back to your own start
  line, run the proven play) — 152 → machine-shortened to 120. Southern
  chain (all engine BFS from your route): FxH 35, FxI 64, FxJ 33, ExJ 42,
  ExI 57, ExH 48, ExG 83, every portal inline-checked.

All motion planned offline by chained engine BFS from exact states, plus
native C A* where the browser model drowns.

Route (A): `HxI → HxH 💎 → GxH 💎 → HxH → HxG → HxF 💎 → GxF 💎 → HxF → HxE → GxE → FxE 💎 → GxE → HxE → IxE 💎 → HxE → IxE → IxF → IxG → IxH → IxI 💎 → JxI → JxH 💎 → JxI → KxI → KxH → KxG → JxG 💎 → KxG → KxF → JxF → JxE 💎 → JxF → KxF → KxE → LxE → MxE`
(legs: 35 + 55 + 8 + 167 + 40 + 8 + 27 + 90 + 2 + 227 + 30 + 12 + 13 + 48 + 127 + 9 + 33 + 58 + 168 + 25 + 1 + 80 + 21 + 22 + 42 + 34 + 14 + 25 + 117 + 11 + 8 + 16 + 43 + 39 + 134 + 5 + 11 + 49 + 41 + 172 + 12 + 8 + 13 + 19 + 33).

## Install

1. `chrome://extensions` → Developer mode → **Load unpacked** → this folder.
2. Open <https://mazebench.com/play/maze/level_HxI> fresh (start room,
   untouched), wait for load. The **MazeBench World Tour** panel appears
   bottom-right.
3. Press **▶ Play**. Don't touch anything until it finishes; each room
   crossing pauses briefly while the next room loads. Reload the extension
   on `chrome://extensions` after any update.

## Use

- **A · MxE / B · FxF** path switch (resets progress), **▶ Play / ⏸ Pause**,
  **Step** (one solver move at a time), speed 1–10/s, progress bar +
  leg/move counters + gem tally (💎 n/10 on A, n/7 on B), ✕ hide with 🗺
  reopen pill.
- If a crossing ever reports "Room didn't change", it idle-waits and
  retries the edge step twice on its own before pausing — press Play to
  retry again.
- If it ever waits on the wrong room (you moved manually), navigate to the
  expected room yourself and press Play — legs key off the live room.
- Reload the page to restart cleanly.

## How it works

- `manifest.json` — MV3, content scripts on
  `https://mazebench.com/play/maze/*` in the page's **MAIN** world.
- `legs/level_*.js` — one file per room pass in **tour flow order**
  (canonical source; revisits get `_north`/`_return`/`_south`/`_gem`/
  `_east` companions since the tour alternates rooms). Each pushes its legs
  (room, world-space path with the final step off the edge included, gem
  flag). Generated, never hand-edited. Flow order is load-bearing: legs
  execute in manifest order, so a revisit leg grouped with its roommates
  would execute in the wrong position (this exact mistake broke all returns
  in v0.2–0.4.2 — see below).
- `tour.js` — full Path-A bundle regenerated from `legs/` (reference /
  back-compat; not loaded by the manifest).
- `legsB/level_*_B.js` + `tour_pathb.js` — Path B (reference bundle,
  same generator pattern). Trunk files mirror `legs/`; branch is `FxE→S` +
  FxF gem + FxF→S + FxG south transit (manual 135→103), tour ends in FxH.
  (FxG transit is a proven machine-wall — engine OOM past 1.2M states, C
  exhausts at 210k — and C is fired for runtime rooms after the FxF false
  negative; southern FxI approach mapped for a future expedition.)
- Path B v3 (GxG loop, shipped): `…FxF → FxG → GxG 💎 → FxG → FxH`.
  FxG north→east manual 267→165, GxG gem 222 from west entry (C, classic
  parity holds) + 16-move west return (no trap), FxG east→south from your
  bridge idea (19-walk + proven 133 = 152 → shortened to 120). Join attempts
  had failed cleanly first (exact-state snap depth ≤8: none; player-match
  splices: 4 tested, 0 valid) — the bridge beat the join.
- `content.js` — per leg: every step through
  `window.__MAZEBENCH_WORLD_SOLVER_MOVE__` (exact, animation-aware) at
  user speed. The **final edge step is idle-gated**: the game's single
  action slot silently drops inputs sent mid-animation (outside its late
  window), which used to strand the tour with "waiting for X" forever —
  now the handoff waits for idle first, then waits for the expected room
  (stabilized: 3 identical reads) with 2 guarded retries with re-checks
  (never re-stepping inside the new room), then it pauses with
  instructions. **Room identity is game-primary** (`app.currentLevelId`),
  URL only as fallback: the URL and game flip at different moments
  mid-transition (widest on fast cached revisits — the "Waiting for GxH /
  GxF on return" stalls), and URL precedence caused false arrivals,
  wrong-room moves, and ping-pong re-crossings. Legacy `cross` legs use
  the same hook (compass N/S/W/E mapped to world U/D/L/R); synthetic arrow
  keys are fallback only. If the room already changed it fast-forwards to
  the matching leg instead of stalling (Step does this too). Gem/progress
  counters are computed from the tour (no hardcoded totals). No
  undo/reset is ever used.

## Room-state model

Rooms **reset when you leave and return** (boxes back to start). All
revisit legs (HxH/HxF north, HxE return, IxE second pass, JxI/JxF/KxF second
passes) are solved from reset boxes with the entry-placed player — verified
in the real engine.

## West rewrite (2026-09-20)

The whole west half (S0–S12: HxI→…→HxE) was re-solved from scratch in one
process with the current engine and the reset model — every transit
re-solved, both gems in range re-solved (S1/S3), S7/S9 replay-verified
(S7 needs ~5GB to re-solve; its 90-move path replays gem-exact). Result:
**all 11 rewritten paths are byte-identical to the originals**, and both
gem replays pass. The legs were never the problem.

## Ordering postmortem (2026-09-20, v0.4.3)

The real return-killer was tour order, not paths or detection: splitting
legs per room grouped the HxH revisit (S5) and HxF revisit (S11) with
their first-pass roommates, so the tour ran
`…S2 → S5 → S3 → S4 → S6…` instead of `…S2 → S3 → S4 → S5 → S6…`. After
S2's crossing the tour skipped the GxH gem entirely; after S4's return it
sat in HxH expecting HxG — every "Waiting for GxH / GxF on return" report.
(The east half never had this: its revisits already lived in separate
`_return`/`_south`/`_east` files.) Fix: `level_HxH_north.js` (S5) and
`level_HxF_north.js` (S11) in flow position. Permanent guard:
`check_handoffs.js` — every room-changing leg must end with the correct
crossing char for its room delta (29/29 green).

## Solving notes

- GxF/JxH/JxE are dead-end gem rooms (single portal each): in for the gem,
  back out the same way. HxE/IxF/IxG/IxH/JxI/KxI/KxH/KxG/JxF/LxE have **no
  gems** — pure transits (IxG/KxI/JxI have 0 boxes: plain walks).
- HxE→IxE is the only H→I gate in its band (single lane `y=1`); the J/K
  column is entered via IxI→JxI east, and exited east via LxE→MxE (LxE has
  ice + empties, 2 boxes — engine BFS handles the slides). KxE→MxE runs
  through LxE (no gem there). KxF (20 boxes) is crossed twice, KxE has 25 —
  both transit cleanly (48/12/18 moves). Narrow gates: JxF↔JxE at `x=4`,
  KxF↔KxE at `x=12–13`.
- IxE gem spur: enter → gem (168 via native C A*) → back west (24) → HxE →
  single step back east → second pass south (79, reset boxes). A direct
  gem-then-south fails (exhaustive post-gem search: 151,752 states, south
  unreachable) — hence leave-and-return. JxH/JxE gems need no spur (south
  returns are 10/11 moves).
- IxE (24 boxes) defeats browser-side search from the west entry (node BFS
  MISS 500k, node A* OOM ~1M/2GB). Both IxE paths came from the native C
  A* (`maze-autoplay/solver/csolve.exe`) via reformulated `.lvl` files
  (entry-moved P; virtual exit gem): transit 79 moves/1.9s, gem 168
  moves/32s — each replay-verified in the real engine from the exact root.
- FxE spur (same toolkit): HxE→GxE→FxE, gem 127 moves/19M states/27s via
  `FxE_entry.lvl` (P at east entry `(15,9)`), return east 8 moves (no trap),
  back through reset GxE/HxE. JxG spur at KxG: west exit 38, gem 134,
  return 4, north re-entry 10 (all node BFS, 5-box room).
- Reachability audit (2026-09-20): full 256-room survey + floor/type/height
  portal graph → the world is 102 disconnected components; the tour's
  component holds 33 rooms / 11 gems, of which IxJ's is proven
  solo-unreachable — so 10/10 collectible reached. Notable dead ends:
  LxI (ice/elevation barrier at KxI south), the NxE/NxF/MxF/MxG pocket (no
  portal in), FxF (north wall). No `exit`-type portals anywhere on the
  surveyed edges — every `e` is void.
- Offline buffer chaining lesson: the engine's incremental state hash can
  disagree across engine instances (and JSON `key` strings with lone
  surrogates are fragile), so the J/K/M legs were solved in a single
  process with in-memory handoff — same-room continuations never touch
  disk mid-chain. Only coordinates cross rooms (fresh boxes + entry
  placement).
- Every leg was replay-verified in the real engine from its exact root
  (edge cells + gem flags exact) plus portal type+height checks per hop.

## Limitations

- Demo route only (H→I→J→K→L→M corridor); general touring is future work.
- Assumes default camera/keys, fresh start in HxI (revisit rooms reset on
  their own — don't freelance between legs), and no dialogs open.
- If the site renames its `__MAZEBENCH_*` hooks, legs stall with
  "Game is busy".
