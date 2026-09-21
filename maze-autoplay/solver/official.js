// Built-in A* (maze-solver.js solveWithAStar) for one level. Usage: official.js <LVL> [capM]
// Env: MB_RUNTIME (default below), MB_OUT (dir for <LVL>_official.txt, default: temp).
const path = require("path");
const fs = require("fs");
const TMP = "C:\\Users\\issac\\AppData\\Local\\Temp\\opencode\\";
const rt = process.env.MB_RUNTIME || (TMP + "mazebench_pkg\\mazebench_cli\\_runtime");
const OUT = process.env.MB_OUT || TMP;
const T = require(path.join(rt, "scripts", "maze-terminal.js"));
async function main() {
  const LVL = process.argv[2], CAP = Math.floor(Number(process.argv[3] || 1) * 1e6);
  const mazeEngine = T.loadMazeEngine();
  const ctx = T.createTerminalContext(mazeEngine, { gameId: "maze", levelId: "level_" + LVL, pitch: 1, yaw: 0, gameWonGemCount: 100, hideNames: false, hideNamesSeed: "1", omniscient: true, maxExpandedStates: CAP });
  const t0 = Date.now();
  const r = await T.solveContext(ctx);
  console.log(`OFFICIAL_${LVL}: status=${r.status} moves=${r.moves} expanded=${r.expanded} el=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (r.status === "solved") fs.writeFileSync(OUT + LVL + "_official.txt", r.path);
  else process.exit(2);
}
main().catch(e => { console.error(e); process.exit(1); });
