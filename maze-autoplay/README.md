# MazeBench Autoplayer (Chrome extension)

![icon](icons/icon48.png)

Watches you open a MazeBench maze level it knows, and replays a saved
solution on the real site: **autoplay, step, back (undo), reset, speed** —
a replay-style panel injected onto the page. Lightweight on purpose: no
solving happens in the extension, it just presses the moves through the
page's own solver hook.

Scope: **42 rooms**, all re-verified in the real engine — GxH (164),
FxE (125), FxF (92), HxF (88), HxH (56), GxG (220), JxH (117), DxG (202),
JxL (127), FxB (82), JxG (134), OxD (90), HxC (81), JxE (174), IxI (34),
NxE (39), PxC (40), AxP (9), DxH (56), DxN (46), ExM (35), LxP (43),
MxD (103), MxN (38), NxF (33), NxN (78), PxA (9), PxG (78), PxH (76),
PxL (32), PxP (9), CxL (99), FxO (118), LxI (117), PxD (81), GxF (219),
IxE (161), HxP (32), MxL (74), AxM (39), BxI (365), DxM (176).
Most paths are optimal (classics + official A*); manual/heuristic entries
(BxI, DxM, and any future hand solves) are best-known, engine-verified
wins. Full per-room writeups, triage data, and the proven-unwinnable list:
`REGISTRY.md`.
Built to extend to every gem maze: adding a level = one entry in
`solutions.js`, nothing else. New solutions are produced natively with
`solver/` (`solve_all.ps1`: C BFS/A* in parallel past browser caps +
real-engine batch + automatic engine verification) — or solved by hand
and verified in seconds (`verify_one.js`).

## Install (30 seconds)

1. Open `chrome://extensions`, enable **Developer mode** (top right).
2. **Load unpacked** → select this folder (`maze-autoplay`).
3. Go to a bundled level — any of the 42 in scope above — and wait for
   the level to load. A dark panel appears bottom-right.
4. On rooms with no saved path yet, the panel still shows up with a ○
   state, live coverage (`N / 86 gem rooms`), and ⛔ + reason where a room
   is proven solo-unwinnable.

No permissions, no network calls, no login needed. To remove: click
`Remove` on `chrome://extensions`.

## Use

- **▶ Play / ⏸ Pause** — runs the saved solution move by move.
- **Step** — one move. **‹ Back** — tap for one undo, or **hold it**: the
  panel just holds down the game's own undo key (keydown on press, repeats
  every 100ms like OS auto-repeat, keyup on release), so the site paces
  and coalesces exactly as if you held U yourself — 10/s max out of the
  100ms cadence. Counting stays exact via the game's move history: pops
  equal applied undos, so the counter follows reality even when rapid
  undos coalesce mid-animation.
- **Mirroring** — undo/reset done in the game itself (its buttons or Z/U/R
  keys) are picked up through the page's action funnel and move our
  counter too, so the two never drift apart. (Manual arrow-key moves
  aren't tracked — Reset resyncs.)
- **Reset** — the site's level reset; the move counter resyncs to 0.
- **Speed slider** — 1–10 moves/s (default 5). That's the real max: each
  move waits on the game's own animation lockout (~100ms), so GxH's
  164 moves take ~20s flat out.
- **✕** hides the panel; the little **▶ MB** pill brings it back.
- On levels with no saved solution the panel shows ○ coverage status
  instead of hiding (⛔ where proven solo-unwinnable).

Tip: if you move manually mid-run the counter desyncs — hit **Reset** and
Play again. Close any login/save dialogs before playing (the game ignores
input while a modal is open).

## Add a level (the extensible part)

1. Get an optimal path as world-space chars
   (`U` = y−1, `D` = y+1, `L` = x−1, `R` = x+1).
2. **Verify it in the real engine first**: replay step-by-step from the
   level start; it must collect exactly 1 gem with the player alive.
3. Append to `window.MB_SOLUTIONS` in `solutions.js`:
   ```js
   level_HxF: {
     label: "Level HxF",
     moves: 88,
     source: "classic BFS, engine-verified",
     path: "LLLLLU..."
   },
   ```
   Key format: `level_<A>x<B>` with uppercase letters.
4. Reload the extension on `chrome://extensions` and open that level.

## How it works

- `manifest.json` — Manifest V3, one content script on
  `https://mazebench.com/play/maze/*`, running in the page's **MAIN** world
  (required: the move API lives on page globals, invisible to isolated
  content scripts).
- `solutions.js` — the solution registry above. Only file you edit to grow.
- `content.js` — detects the level id from the URL (handles the site's
  in-page navigation), waits for the game, then drives it:
  - Primary: `window.__MAZEBENCH_WORLD_SOLVER_MOVE__("U"|"D"|"L"|"R")` —
    the page's own hook. World-space, camera-independent, and it waits for
    move animations itself (returns a promise).
  - Fallback: synthetic `ArrowUp/Down/Left/Right` keydowns (+ `KeyZ` undo,
    `KeyR` reset) if the hook ever disappears.
  - Back is an emulated held-U key (see above); Reset prefers
    `__PIXEL_GAME_APP__.runAction({type:"reset"})`, else a `KeyR` keydown.

## Limitations

- Forty-two levels bundled today (see scope above); the rest is data entry,
  produced by `solver/solve_all.ps1` (C BFS/A* in parallel past browser
  caps + real-engine batch + automatic engine verification — every path
  is replay-checked, which also catches solver false positives like
  HxP/PxM, where the gem is destroyed rather than collected). Manual
  solutions are welcome too: play the room (the lab at
  `../maze-hxf-bfs` takes play-only levels), paste the path, and it gets
  verified, shortened (wiggle + window splicing), and banked.
- In-game undo/reset are mirrored into the counter; manual arrow-key moves
  aren't tracked (Reset resyncs).
- Needs the page's default setup (arrows = world U/D/L/R at yaw 0). The
  solver-hook path doesn't care about camera; the key fallback assumes you
  haven't rotated the camera or rebound keys.
- If the site renames its `__MAZEBENCH_*` hooks, the key fallback keeps
  basic play working; check the console for the "Game API not found" note.
