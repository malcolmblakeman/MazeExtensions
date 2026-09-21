// Replay a path in the REAL engine and confirm the win. Usage: verify_one.js <LVL> <pathfile>
// Single-room only (moveForSearch): T.applyMove can silently switch rooms on
// edge steps, which once fake-failed HxP. Prints VERIFIED <LVL> <moves>.
// Exit 0 iff the gem is collected with the player alive.
// Env: MB_RUNTIME (default below).
const path = require("path");
const fs = require("fs");
const TMP = "C:\\Users\\issac\\AppData\\Local\\Temp\\opencode\\";
const rt = process.env.MB_RUNTIME || (TMP + "mazebench_pkg\\mazebench_cli\\_runtime");
const T = require(path.join(rt, "scripts", "maze-terminal.js"));
const DCH = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
async function main() {
  const LVL = process.argv[2];
  const raw = fs.readFileSync(process.argv[3], "utf8").trim();
  let p;
  try {
    const j = JSON.parse(raw);
    p = typeof j === "string" ? j : j.path;
  } catch (e) { p = raw; }
  if (!/^[UDLR]+$/.test(p)) { console.log(`MISMATCH ${LVL}: bad path chars`); process.exit(2); }
  const mazeEngine = T.loadMazeEngine();
  const ctx = T.createTerminalContext(mazeEngine, { gameId: "maze", levelId: "level_" + LVL, pitch: 1, yaw: 0, gameWonGemCount: 100, hideNames: false, hideNamesSeed: "1", omniscient: true });
  const eng = ctx.engine;
  const st = eng.cloneState(ctx.state);
  const pIdx = eng.actorTypes.findIndex(t => t === "player");
  for (let i = 0; i < p.length; i++) {
    const r = eng.moveForSearch(st, ...DCH[p[i]]);
    if (!r.moved) { console.log(`BLOCKED ${LVL} at ${i + 1}/${p.length}`); process.exit(2); }
    if (st.actorRemoved[pIdx]) { console.log(`DIED ${LVL} at ${i + 1}/${p.length}`); process.exit(2); }
  }
  if (eng.isSolved(st) && !st.actorRemoved[pIdx]) console.log(`VERIFIED ${LVL} ${p.length}`);
  else { console.log(`MISMATCH ${LVL}: solved=${eng.isSolved(st)}`); process.exit(2); }
}
main().catch(e => { console.error(e); process.exit(1); });
