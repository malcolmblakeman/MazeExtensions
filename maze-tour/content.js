"use strict";
/* MazeBench World Tour — content script (runs in MAIN world, see manifest).
 *
 * Plays window.MB_TOUR leg by leg. Every step (including the final
 * step off the edge) goes through
 * window.__MAZEBENCH_WORLD_SOLVER_MOVE__ (world-space U/D/L/R, waits for
 * animations) at user speed, so the real input pipeline
 * (movePlayers -> edgeTransitionForMove / continuePlayerMoveAcrossEdge)
 * performs the handoff; the script then waits for the game to show the
 * next room (stabilized read) before continuing. Legacy tours with a
 * separate leg.cross (compass N/S/W/E) are still supported via the same
 * hook. Room identity is game-primary (app.currentLevelId), URL fallback.
 *
 * Assumptions (demo): default camera (arrows = world dirs), no manual
 * input during the run, rooms entered fresh except HxH revisit (leg paths
 * were chained offline from exact states, boxes included).
 */
(function () {
  var KEY_FOR_DIR = { N: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight", S: "ArrowDown", W: "ArrowLeft", E: "ArrowRight", U: "ArrowUp" };
  // Crossing keys in tour.js are compass (N/S/W/E with legacy D/L/R/U aliases);
  // fold them into the leg path as world-space solver steps (U/D/L/R).
  var CROSS_TO_WORLD = { N: "U", U: "U", S: "D", D: "D", L: "L", W: "L", R: "R", E: "R" };
  var DEFAULT_SPEED = 5;
  var ROUTE_RE = /^\/play\/maze\/([^/?#]+)/;

  var legIdx = 0;
  var moveIdx = 0;
  var playing = false;
  var runId = 0;
  var speed = DEFAULT_SPEED;
  var ready = false;
  var root = null;
  var ui = {};
  var miniBtn = null;
  var lastPath = "";

  var activePath = "A";
  function tour() { return activePath === "B" ? (window.MB_TOUR_B || []) : (window.MB_TOUR || []); }
  function normalizeLevelId(v) {
    var m = String(v || "").trim().match(/^(?:level_)?([A-Za-z])x([A-Za-z])$/);
    return m ? "level_" + m[1].toUpperCase() + "x" + m[2].toUpperCase() : "";
  }
  function routeLevelId() {
    var m = String(location.pathname || "").match(ROUTE_RE);
    return m ? normalizeLevelId(decodeURIComponent(m[1])) : "";
  }
  function gameLevelId() {
    try {
      var app = window.__PIXEL_GAME_APP__;
      if (app && app.currentLevelId) return normalizeLevelId(app.currentLevelId);
    } catch (e) {}
    return "";
  }
  // Room detection: the GAME is authoritative, the URL is fallback.
  // The URL and app.currentLevelId flip at different moments during a room
  // transition (revisits are fast — cached level state — so the split-brain
  // window is widest exactly when returning to a level). URL precedence
  // caused false "room arrived" reads: the tour advanced into the next
  // room's legs while the game was still in the old room (garbage moves,
  // then "Waiting for X" forever) or re-stepped the edge after arriving
  // (ping-pong back). Game-primary fixes the class.
  function currentLevel() { return gameLevelId() || routeLevelId(); }

  function solverMove(label) {
    try {
      var fn = window.__MAZEBENCH_WORLD_SOLVER_MOVE__;
      if (typeof fn !== "function") return Promise.resolve(false);
      return Promise.race([
        Promise.resolve().then(function () { return fn(label); }).then(function () { return true; }, function () { return false; }),
        new Promise(function (res) { setTimeout(function () { res(false); }, 8000); })
      ]);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function sendKey(code) {
    try {
      var t = document.body || document.documentElement;
      t.dispatchEvent(new KeyboardEvent("keydown", { code: code, key: code, bubbles: true, cancelable: true }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function setStatus(txt) {
    if (ui.status) ui.status.textContent = txt;
  }

  function crossCount(leg) { return leg && leg.cross && CROSS_TO_WORLD[leg.cross] ? 1 : 0; }
  function totalMoves() {
    return tour().reduce(function (a, l) { return a + l.path.length + crossCount(l); }, 0);
  }
  function movesDone() {
    var n = 0;
    for (var i = 0; i < legIdx; i++) n += tour()[i].path.length + crossCount(tour()[i]);
    return n + Math.min(moveIdx, (tour()[legIdx] || { path: "" }).path.length);
  }
  function gemsDone() {
    var n = 0;
    for (var i = 0; i < legIdx; i++) if (tour()[i].gem) n += 1;
    return n;
  }
  function totalGems() {
    return tour().reduce(function (a, l) { return a + (l.gem ? 1 : 0); }, 0);
  }
  function gemNames() {
    return tour().filter(function (l) { return l.gem; }).map(function (l) { return l.room.replace("level_", ""); }).join(",");
  }

  function paint() {
    var T = tour();
    if (!T.length) return;
    var leg = T[Math.min(legIdx, T.length - 1)];
    if (ui.count) ui.count.textContent = "leg " + Math.min(legIdx + 1, T.length) + "/" + T.length + " · " + leg.room.replace("level_", "") + " · move " + Math.min(moveIdx, leg.path.length) + "/" + leg.path.length;
    if (ui.bar) {
      var tot = totalMoves() || 1;
      ui.bar.style.width = (100 * movesDone() / tot).toFixed(1) + "%";
    }
    if (ui.gems) ui.gems.textContent = "💎 " + gemsDone() + "/" + totalGems();
    if (ui.play) ui.play.textContent = playing ? "⏸ Pause" : "▶ Play";
  }

  // Stabilized room wait: the room must read the same for 3 consecutive
  // polls (~0.75s) before it counts. Kills flicker/early-flip false
  // positives at leg handoffs — the "Waiting for GxH while standing in it"
  // class of stalls.
  function waitStableRoom(roomId, timeoutMs, done) {
    var t0 = Date.now(), steady = 0, last = "";
    (function poll() {
      var here = currentLevel();
      if (here === roomId && here !== "") {
        steady = (last === here) ? steady + 1 : 1;
      } else {
        steady = 0;
      }
      last = here;
      if (steady >= 3) return done(true);
      if (Date.now() - t0 > (timeoutMs || 20000)) return done(currentLevel() === roomId);
      setTimeout(poll, 250);
    })();
  }

  function gameIdle() {
    try {
      var app = window.__PIXEL_GAME_APP__;
      if (!app || typeof app.runAction !== "function") return true;
      return !app.isAnimating && !app.isTransitioningLevel && !app.levelTransition && !app.queuedAction;
    } catch (e) {
      return true;
    }
  }

  function waitIdle(timeoutMs) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function poll() {
        if (gameIdle()) return res(true);
        if (Date.now() - t0 > (timeoutMs || 4000)) return res(false);
        setTimeout(poll, 25);
      })();
    });
  }

  function waitReady(roomId, timeoutMs) {
    // room arrived AND solver hook back AND game idle
    return new Promise(function (res) {
      var t0 = Date.now();
      (function poll() {
        var here = currentLevel() === roomId;
        var api = typeof window.__MAZEBENCH_WORLD_SOLVER_MOVE__ === "function";
        if (here && api && gameIdle()) return res(true);
        if (Date.now() - t0 > (timeoutMs || 15000)) return res(here && api);
        setTimeout(poll, 250);
      })();
    });
  }

  var crossRun = -1;
  var crossRetry = 0; // folded-crossing retries (replay final step if room doesn't change)
  function doCrossing(leg, myRun, attempt) {
    if (crossRun === myRun) return; // already armed for this run (step+play double taps)
    crossRun = myRun;
    attemptCross(leg, myRun, attempt || 1);
  }

  function attemptCross(leg, myRun, attempt) {
    var worldDir = CROSS_TO_WORLD[leg.cross];
    var code = KEY_FOR_DIR[leg.cross];
    if (!worldDir) {
      playing = false; paint();
      setStatus("Unknown crossing key '" + leg.cross + "'. Press Play to retry.");
      return;
    }
    setStatus("Crossing to the next room… (don't touch anything)");
    // the previous leg move may still be animating; the game drops inputs
    // that arrive mid-animation, so wait for idle before stepping across.
    // The crossing is folded into the leg path: same solver hook, same
    // user speed pacing (performPlayerMove -> continuePlayerMoveAcrossEdge
    // does the handoff). Synthetic key is fallback only.
    waitIdle(4000).then(function () {
      if (myRun !== runId) return;
      solverMove(worldDir).then(function (ok) {
        if (myRun !== runId) return;
        if (!ok && code) sendKey(code);
        var expect = tour()[legIdx + 1] ? tour()[legIdx + 1].room : "";
        // last leg crosses out of the tour (no next room): count it done
        if (!expect) {
          legIdx += 1; moveIdx = 0;
          playing = false; paint();
          setStatus("🏆 Tour complete! " + totalGems() + " gems (" + gemNames() + ").");
          return;
        }
        waitStableRoom(expect, 15000, function (found) {
          if (myRun !== runId) return;
          if (!found) {
            if (attempt < 3) {
              setStatus("Crossing didn't take — retrying (" + (attempt + 1) + "/3)…");
              setTimeout(function () { attemptCross(leg, myRun, attempt + 1); }, Math.max(30, Math.round(1000 / speed)));
              return;
            }
            playing = false; paint();
            setStatus("Room didn't change after 3 tries. Press Play to retry the crossing.");
            return;
          }
          waitReady(expect, 15000).then(function () {
            if (myRun !== runId) return;
            legIdx += 1; moveIdx = 0;
            paint();
            playLoop(myRun);
          });
        });
      });
    });
  }

  function tourStep(myRun) {
    if (!playing || myRun !== runId) return;
    var T = tour();
    if (legIdx >= T.length) {
      playing = false; paint();
      setStatus("🏆 Tour complete! " + totalGems() + " gems (" + gemNames() + ").");
      return;
    }
    var leg = T[legIdx];
    var here = currentLevel();
    if (here !== leg.room) {
      // already crossed (or user navigated)? fast-forward to the matching leg
      var adv = -1, k;
      for (k = legIdx + 1; k < T.length; k++) {
        if (T[k].room === here) { adv = k; break; }
      }
      if (adv >= 0) {
        legIdx = adv; moveIdx = 0; paint();
        setStatus("Picked up in " + here.replace("level_", "") + " — continuing.");
        tourStep(myRun);
        return;
      }
      playing = false; paint();
      setStatus("Waiting for " + leg.room.replace("level_", "") + "… (navigate there or press Play here to hold)");
      return;
    }
    if (moveIdx >= leg.path.length) {
      if (leg.cross) { doCrossing(leg, myRun); return; }
      // Folded tour: path already ends with the step off the edge.
      // Same room next -> advance at once; different room -> the last
      // solver step just triggered the handoff, so wait for the URL/game
      // to show the next room before continuing.
      var next = T[legIdx + 1];
      if (!next || next.room === leg.room) {
        legIdx += 1; moveIdx = 0; paint();
        tourStep(myRun);
        return;
      }
      setStatus("Crossing to the next room… (don't touch anything)");
      waitStableRoom(next.room, 20000, function (found) {
        if (myRun !== runId) return;
        if (!found) {
          // Re-check first: a slow transition may have landed after the
          // last poll. Never re-step blindly — replaying the edge step
          // inside the NEW room would cross straight back (ping-pong).
          if (currentLevel() === next.room) {
            crossRetry = 0;
            waitReady(next.room, 15000).then(function () {
              if (myRun !== runId) return;
              legIdx += 1; moveIdx = 0;
              paint();
              playLoop(myRun);
            });
            return;
          }
          // Handoff flaky/slow (or edge step dropped): idle-gate, re-check,
          // then replay the final edge step, up to 2 retries.
          if (crossRetry < 2) {
            crossRetry += 1;
            setStatus("Room didn't change — retrying the crossing (" + crossRetry + "/2)…");
            waitIdle(4000).then(function () {
              if (myRun !== runId) return;
              if (currentLevel() === next.room) {
                crossRetry = 0;
                waitReady(next.room, 15000).then(function () {
                  if (myRun !== runId) return;
                  legIdx += 1; moveIdx = 0;
                  paint();
                  playLoop(myRun);
                });
                return;
              }
              moveIdx = leg.path.length - 1; paint();
              setTimeout(function () { tourStep(myRun); }, Math.max(30, Math.round(1000 / speed)));
            });
            return;
          }
          crossRetry = 0;
          playing = false; paint();
          setStatus("Room didn't change after 3 tries. Press Play to retry the crossing.");
          return;
        }
        crossRetry = 0;
        waitReady(next.room, 15000).then(function () {
          if (myRun !== runId) return;
          legIdx += 1; moveIdx = 0;
          paint();
          playLoop(myRun);
        });
      });
      return;
    }
    var nextRoom = T[legIdx + 1] ? T[legIdx + 1].room : null;
    var isEdgeStep = !!nextRoom && nextRoom !== leg.room && moveIdx === leg.path.length - 1;
    var doMove = function () {
      solverMove(leg.path[moveIdx]).then(function (ok) {
        if (!playing || myRun !== runId) return;
        if (!ok) {
          playing = false; paint();
          setStatus("Game is busy — close any dialogs, then press Play to resume.");
          return;
        }
        moveIdx += 1; paint();
        setTimeout(function () { tourStep(myRun); }, Math.max(30, Math.round(1000 / speed)));
      });
    };
    if (isEdgeStep) {
      // The handoff is silently dropped when sent mid-animation (the game
      // has a single action slot; outside its late window the input
      // vanishes and the tour waits for a room that never comes). The old
      // separate-crossing design waited for idle first — do the same for
      // the folded final step.
      waitIdle(4000).then(function () {
        if (!playing || myRun !== runId) return;
        doMove();
      });
    } else {
      doMove();
    }
  }

  function playLoop(myRun) { tourStep(myRun); }

  function onPlay() {
    if (!tour().length) return;
    playing = !playing;
    paint();
    if (playing) {
      crossRetry = 0;
      setStatus("Tour running…");
      playLoop(++runId);
    } else {
      runId += 1;
      setStatus("Paused.");
    }
  }

  function onStep() {
    playing = false; runId += 1; paint();
    var T = tour();
    if (legIdx >= T.length) { setStatus("Tour complete."); return; }
    var leg = T[legIdx];
    var hereStep = currentLevel();
    if (hereStep !== leg.room) {
      // Same fast-forward as Play: jump to the matching later leg instead
      // of dead-ending with "Waiting for X".
      var advStep = -1, ks;
      for (ks = legIdx + 1; ks < T.length; ks++) {
        if (T[ks].room === hereStep) { advStep = ks; break; }
      }
      if (advStep >= 0) {
        legIdx = advStep; moveIdx = 0; paint();
        setStatus("Picked up in " + hereStep.replace("level_", "") + " — continuing.");
        return;
      }
      setStatus("Waiting for " + leg.room.replace("level_", "") + "."); return;
    }
    if (moveIdx >= leg.path.length) {
      if (leg.cross) { doCrossing(leg, runId); return; }
      var next = T[legIdx + 1];
      if (!next || next.room === leg.room) { setStatus("Leg done."); return; }
      if (currentLevel() === next.room) {
        legIdx += 1; moveIdx = 0; paint();
        setStatus("Crossed to " + next.room.replace("level_", "") + " — continuing.");
        return;
      }
      setStatus("Crossing step done — waiting for " + next.room.replace("level_", "") + ". Press Play.");
      return;
    }
    var myRun = runId;
    solverMove(leg.path[moveIdx]).then(function (ok) {
      if (myRun !== runId) return;
      if (ok) { moveIdx += 1; paint(); }
      setStatus("Stepped to leg " + (legIdx + 1) + " move " + moveIdx + ".");
    });
  }

  function onSpeed(ev) {
    speed = Math.max(1, Math.min(10, parseInt(ev.target.value, 10) || DEFAULT_SPEED));
    if (ui.speedVal) ui.speedVal.textContent = speed + "/s";
  }

  var CSS = [
    ":host { all: initial; }",
    ".mbt { position: fixed; right: 16px; bottom: 16px; width: 280px; z-index: 2147483647;",
    "  font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #e8edf5;",
    "  background: rgba(10, 13, 22, .94); border: 1px solid #2b3153;",
    "  border-radius: 12px; padding: 12px 14px; box-shadow: 0 8px 28px rgba(0,0,0,.5); }",
    ".mbt h1 { font-size: 13px; margin: 0 0 2px; color: #fff; }",
    ".mbt .meta { font-size: 11px; color: #9aa3b8; margin-bottom: 8px; }",
    ".mbt .bar { height: 6px; background: #232842; border-radius: 4px; overflow: hidden; margin: 6px 0; }",
    ".mbt .bar > div { height: 100%; width: 0%; background: #34e7f0; }",
    ".mbt .row { display: flex; gap: 6px; margin: 8px 0; }",
    ".mbt button { flex: 1; font-size: 12px; font-weight: 600; padding: 6px 4px; border-radius: 8px;",
    "  border: 1px solid #3a4670; background: #1a2138; color: #e8edf5; cursor: pointer; }",
    ".mbt button:hover { background: #232c4d; }",
    ".mbt button.wide { flex: 2; }",
    ".mbt .x { position: absolute; top: 6px; right: 8px; flex: none; border: none; background: none;",
    "  color: #9aa3b8; font-size: 14px; padding: 2px 6px; }",
    ".mbt .status { font-size: 11px; color: #9aa3b8; min-height: 16px; }",
    ".mbt .count { font-variant-numeric: tabular-nums; color: #9aa3b8; font-size: 11px; }",
    ".mbt input[type=range] { width: 100%; accent-color: #34e7f0; }",
    ".mbt button.on { background: #0e7490; border-color: #34e7f0; color: #fff; }"
  ].join("\n");

  function markBtn(el, on) {
    if (el && el.classList) el.classList.toggle("on", !!on);
  }

  function setPath(p) {
    if (p !== "A" && p !== "B") return;
    activePath = p;
    legIdx = 0; moveIdx = 0; playing = false; runId += 1; crossRetry = 0;
    paint();
    if (ui.meta) ui.meta.textContent = tour().map(function (l) { return l.room.replace("level_", ""); }).join(" → ");
    markBtn(ui.patha, p === "A");
    markBtn(ui.pathb, p === "B");
    setStatus("Path " + p + " selected — start in HxI, then press Play. " + tour().length + " legs, " + totalMoves() + " moves, " + totalGems() + " gems.");
  }

  function buildPanel() {
    root = document.createElement("div");
    var shadow = root.attachShadow({ mode: "closed" });
    var box = document.createElement("div");
    box.className = "mbt";
    var rooms = tour().map(function (l) { return l.room.replace("level_", ""); }).join(" → ");
    box.innerHTML =
      '<button class="x" type="button" title="Hide panel">✕</button>' +
      '<h1><svg width="15" height="15" viewBox="0 0 16 16" style="vertical-align:-2px"><path d="M8 1.5a4.2 4.2 0 0 0-4.2 4.2c0 3.1 4.2 8.8 4.2 8.8s4.2-5.7 4.2-8.8A4.2 4.2 0 0 0 8 1.5z" fill="#34e7f0"/><circle cx="8" cy="5.7" r="1.8" fill="#0a0d16"/></svg> MazeBench World Tour</h1>' +
      '<div class="meta">' + rooms + '</div>' +
      '<div class="count">leg 1/' + tour().length + '</div>' +
      '<div class="bar"><div></div></div>' +
      '<div class="gems">💎 0/…</div>' +
      '<div class="row">' +
      '  <button class="patha on" type="button" title="Full tour to MxE">A · MxE</button>' +
      '  <button class="pathb" type="button" title="F-column gems, ends FxF">B · FxF</button>' +
      '</div>' +
      '<div class="row">' +
      '  <button class="play wide" type="button">▶ Play</button>' +
      '  <button class="step" type="button">Step</button>' +
      '</div>' +
      '<div class="row"><input class="speed" type="range" min="1" max="10" step="1" value="' + DEFAULT_SPEED + '" title="Moves per second"></div>' +
      '<div class="status"></div>';
    var style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);
    shadow.appendChild(box);
    document.documentElement.appendChild(root);
    ui = {
      box: box,
      meta: box.querySelector(".meta"),
      count: box.querySelector(".count"),
      bar: box.querySelector(".bar > div"),
      play: box.querySelector(".play"),
      gems: box.querySelector(".gems"),
      status: box.querySelector(".status"),
      patha: box.querySelector(".patha"),
      pathb: box.querySelector(".pathb"),
      speedVal: null
    };
    var speedInput = box.querySelector(".speed");
    speedInput.addEventListener("input", onSpeed);
    var speedLabel = document.createElement("div");
    speedLabel.className = "count";
    speedInput.before(speedLabel);
    ui.speedVal = speedLabel;
    updateSpeedLabel();
    box.querySelector(".play").addEventListener("click", onPlay);
    box.querySelector(".step").addEventListener("click", onStep);
    box.querySelector(".patha").addEventListener("click", function () { setPath("A"); });
    box.querySelector(".pathb").addEventListener("click", function () { setPath("B"); });
    box.querySelector(".x").addEventListener("click", hidePanel);
  }

  function updateSpeedLabel() {
    if (ui.speedVal) ui.speedVal.textContent = "Speed: " + speed + " moves/s";
  }

  function hidePanel() {
    if (root) root.style.display = "none";
    if (!miniBtn) {
      miniBtn = document.createElement("button");
      miniBtn.textContent = "🗺 Tour";
      miniBtn.type = "button";
      miniBtn.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;font:600 12px system-ui,sans-serif;color:#062a2d;background:#34e7f0;border:none;border-radius:20px;padding:8px 12px;cursor:pointer;";
      miniBtn.addEventListener("click", function () {
        if (root) root.style.display = "";
        miniBtn.style.display = "none";
      });
      document.documentElement.appendChild(miniBtn);
    }
    miniBtn.style.display = "";
  }

  function waitForGame() {
    var tries = 0;
    setStatus("Waiting for the game to load…");
    (function poll() {
      tries += 1;
      var hasApi = typeof window.__MAZEBENCH_WORLD_SOLVER_MOVE__ === "function";
      var hasApp = !!(window.__PIXEL_GAME_APP__ && window.__PIXEL_GAME_APP__.currentLevelId);
      if (hasApi || hasApp) {
        setStatus("Ready — start in HxI, then press Play. " + tour().length + " legs, " + totalMoves() + " moves (crossings included), " + totalGems() + " gems.");
        paint();
        return;
      }
      if (tries > 240) {
        setStatus("Game API not found. Reload the level page and try again.");
        return;
      }
      setTimeout(poll, 500);
    })();
  }

  function checkNav() {
    // legs key off the live room each step; just track location here
    lastPath = location.pathname;
  }

  lastPath = location.pathname;
  buildPanel();
  paint();
  waitForGame();
  setInterval(checkNav, 1000);
})();
