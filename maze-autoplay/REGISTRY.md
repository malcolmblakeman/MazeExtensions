# Autoplayer Registry — every room, steps & difficulty

> Live highlight: open any maze level — the panel shows ○ + coverage
> (`N / 86 gem rooms`) on unsolved rooms, ⛔ + reason on proven
> solo-unwinnable ones. Solved rooms get the full autoplay panel.

40 rooms, all paths replay-verified in the real engine (`solver/verify_one.js`,
single-room). Moves are world-space `U/D/L/R`. The extension picks up new
entries automatically — just add `{ label, moves, source, path }` keyed by
`level_<A>x<B>`.

Difficulty is subjective (solver's view: state-space size, box count,
mechanics; player's view: length, precision). Tiers: Trivial · Easy ·
Moderate · Hard · Brutal. `expanded` is shown where measured; bundled
historical paths list `n/a`.

## Registry (40)

### Trivial
- **AxP — 9** · official A*, n/a · A hallway with a gem in it. Warm-up.
- **PxA — 9** · official A*, n/a · Same energy. Blink and it's done.
- **PxP — 9** · official A*, n/a · Nine rights. That's the level.
- **MxL — 74** · engine BFS, 84 expanded, ~0s · 0 boxes: a 74-step victory
  lap. Longest trivial in the registry — bring a podcast.

### Easy
- **IxI — 34** · official A*, n/a · 1 box. The tutorial puzzle, basically.
- **ExM — 35** · official A*, n/a · Small, honest boxes.
- **AxM — 39** · official A*, 60,662 expanded, 5.5s · 22 boxes + 2 punchers
  sounds scary, plays friendly — wide-open room, the gem practically queues up.
- **PxC — 40** · official A*, n/a · A clone, but the room is tiny. Cute.
- **LxP — 43** · official A*, n/a · 2 clones, 1 box. Fiddly fingers, short path.
- **DxN — 46** · official A*, n/a · 55 boxes sounds like a lot until you see
  how open it is. Bulk without bite.
- **DxH — 56** · official A*, n/a · A puncher and 4 boxes. Polite.
- **HxH — 56** · classic BFS optimal, n/a · The intended solution reads
  naturally once you see the first push.

### Moderate
- **DxM — 176** · manual 200 + machine-shortened (−12 wiggles, −12 windows),
  engine-verified · 5 boxes + orange button. Small room, long war — the
  button choreography eats moves.
- **HxP — 32** · official A*, n/a · Short but maximally weird (clones +
  lift + puncher). Every move matters; nothing is long.
- **NxF — 33** · official A*, n/a · Compact. No fat on it.
- **PxL — 32** · official A*, n/a · Snappy corridor puzzle.
- **MxN — 38** · official A*, n/a · 3 boxes, tidy.
- **NxE — 39** · official A*, n/a · 0 boxes, but the routing is the puzzle.
- **FxF — 92** · classic BFS optimal, n/a · Repetitive push patterns — easy
  to understand, long to execute. Endurance moderate.
- **OxD — 90** · official A*, n/a · 74 boxes, but most are scenery. Looks
  brutal, plays moderate.
- **HxC — 81** · official A*, n/a · 10 punchers herd you down one line.
  Loud, not hard.
- **FxB — 82** · official A*, n/a · 5 punchers + 8 boxes in a small room.
  Busy moderate.
- **PxD — 81** · official A*, n/a · 10 boxes of honest work.
- **CxL — 99** · official A*, n/a · Button + 7 boxes. The button is the boss.
- **MxD — 103** · official A*, n/a · Over 100 moves of mopping up. Long day.
- **FxO — 118** · official A*, n/a · Puncher tempo puzzle. Don't rush it.
- **LxI — 117** · official A*, n/a · Ice-block flavored. Slippery moderate.
- **JxH — 117** · official A*, n/a · 3 boxes, but every push is load-bearing.
- **DxG — 202** · official A*, n/a · The marathon moderate: 200+ moves, never
  cruel, never kind. Floaters keep you honest.

### Hard
- **HxF — 88** · classic BFS optimal, n/a · Short on paper, dense in practice.
  The classic skill check.
- **JxL — 127** · official A*, n/a · Button + 24 boxes. A logistics problem.
- **JxG — 134** · official A*, n/a · Five boxes that all hate you personally.
- **JxE — 174** · official A*, n/a · The second-longest solve. A war of
  attrition against 6 boxes.
- **GxH — 164** · classic BFS optimal, n/a · 13 boxes of tight corridors.
- **GxG — 220** · classic BFS optimal, n/a · The longest classic. You earn it.
- **GxF — 219** · C BFS, n/a · As long as GxG with pits for penalties.
- **IxE — 161** · C BFS, n/a · 24 boxes; 15M+ states to prove optimal. The
  solver sweated more than the player will.
- **FxE — 125** · C A*, 19,034,286 expanded, ~48s, ~600MB · The hardest bark
  in the registry: 125 moves hiding behind 19M states. Impossible in a
  browser tab; the native solver ate it for breakfast (600MB).
- **PxG — 78** · official A*, n/a · Deceptively technical for 78 moves.
- **PxH — 76** · official A*, n/a · PxG's meaner sibling.
- **NxN — 78** · official A*, n/a · 5 boxes, no slack anywhere.

### Brutal
- **BxI — 365** (was 463) · manual solution (human!) + machine-shortened,
  engine-verified, not proven optimal · 4 boxes + lift. Defeated everything:
  BFS capped @1M, official capped @2M/@5M/@8M, engine-A* OOM ~1.9M — then a
  human solved it in 463 moves, and the sliding-window idea took it down in
  layers: −32 wiggle removal → −22 (50/20 windows) → −14 (25/10 windows) →
  −16 more wiggles the splices exposed → −14 (25/10 round 2, incl. a −10
  single window). Fixpoint confirmed: wiggles clean, 25/10 clean, dense
  50/10 clean. Suffix re-solves (5 splits @1M) had already found nothing.
  463 → 365 (−98, −21%), still longest in the registry by far. The room that
  proved the human pipeline — and the window trick.

## Proven solo-inaccessible (19)

Exhaustive search from reset, no win. Proof size = states expanded to
exhaustion (or prior batch proof).

Old: ExC · CxE · FxC · BxF · IxJ · LxC · AxA · AxI · AxK · BxG · CxD · CxG ·
MxF · MxI · MxJ · OxK · PxN · CxO (needs cross-room means) · PxM (official
path blocked at step 35 single-room; engine BFS OOMs — false positive).

New this session:
- **NxI** — 125 states. 0 boxes and still impossible: the gem sits across
  unreachable space. Smallest proof in the file.
- **ExF** — 81,020 states. 4 floaters, fully mapped, no win.
- **AxG** — 135,634 states. 34 boxes, exhausted.
- **FxK** — 67,882 states. 233 boxes but a tiny reachable space — the room
  is mostly decoration around an unwinnable core.
- **MxO** — 1,869,837 states (7+ min). Button + 3 boxes, fully mapped.
- **PxO** — 2,545,927 states. Puncher + 5 boxes, fully mapped.

## Still open (triage data, 2026-09-20)

`capped @N` = search still growing at N states (winnable?, needs bigger
iron). Machine ceiling here is ~2–5M node states (8GB box, ~2GB free).

- **DxL** (3 floaters + puncher) — BFS capped @1M; official capped @2M, @5M.
- **GxI** (3 floaters) — BFS capped @1M; official capped @2M, @5M.
- **DxM** (5 boxes + button) — BFS capped @1M; official capped @4M.
- **ExP** (clones, 0 boxes) — BFS capped @1M.
- **OxC** (6 boxes + lift) — BFS capped @1M; official capped @4M.
- **PxE** (5 boxes + puncher) — official capped @2M.
- **BxI** (4 boxes + lift) — official capped @5M; engine-A* OOM ~1.9M/3GB.
- **IxP** (6 boxes + lift + floater) — official capped @5M.
- **CxP** (9 boxes + clone) — triage capped @0.3M; official OOM at 2GB heap.
- **BxM** (13 boxes + button) — triage capped @0.3M.
- **PxJ** (13 boxes + 3 punchers) — triage capped @0.3M.
- **AxO** (11 boxes + lift) — triage capped @0.3M.
- **AxL** (23 boxes + 2 lifts) — triage capped @0.3M.
- **AxF** (22 boxes + ice) — triage capped @0.3M.
- **JxC** (48 boxes + ice/lift) — triage timed out (slow giant states).
- **HxK** (41 boxes + ice) — triage timed out (slow giant states).
- **ExO** (44 boxes + lift/ice) — triage timed out (slow giant states).
- **DxO** (82 boxes, 2 gems!) — triage timed out. Note: twin-gem room; a
  solve must collect both.
- **FxL** (224 boxes + lift) — triage timed out. Almost certainly needs a
  different algorithm, not a bigger cap.
- **NxP** (3 boxes + 39 clones) — timed out at 1M official. Clone fan-out.
- **IxB** (15 boxes + 8 punchers) — timed out at 1M official.

## Method legend

- **classic BFS** — optimal, tiny model (C or lab solver).
- **C A\*** — native `solver/csolve.exe`, Manhattan heuristic; the only
  thing that survives 10M+ flat states. Caveat (2026-09-20): C provably
  under-explores some flat runtime rooms (FxF: C exhausts at 90 states from
  both reset and side entry while the engine walks 5000+; all inputs
  byte-verified) — so C-found paths on runtime rooms are verified wins,
  but their optimality is no longer claimed. Classics keep exact-count
  parity. C is retired for runtime rooms until the model gap is found.
- **engine BFS** — `solver/engsolve.js`, real physics, optimal, ~1M ceiling.
- **official A\*** — built-in `solveWithAStar` via `solver/official.js`;
  best for mid-size mechanic rooms (2–5M ceiling here).
- **verify** — every path replayed move-for-move in the real engine
  (`verify_one.js`); registry self-check: `node verify_registry.js` (temp).
