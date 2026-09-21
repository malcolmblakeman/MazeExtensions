"use strict";
/* MazeBench Autoplayer — content script (runs in MAIN world, see manifest).
 *
 * Detects a /play/maze/<level> page, and if solutions.js has a saved path
 * for it, shows a replay-style panel: autoplay, step, back (undo), reset,
 * speed. Moves go through window.__MAZEBENCH_WORLD_SOLVER_MOVE__ (the
 * page's own solver hook: world-space U/D/L/R, waits for animations),
 * with synthetic arrow/Z/R key events as fallback.
 */
(function () {
  var ROUTE_RE = /^\/play\/maze\/([^/?#]+)/;
  var KEY_FOR = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
  var DEFAULT_SPEED = 5; // moves per second

  var levelId = "";
  var entry = null;
  var idx = 0;
  var playing = false;
  var runId = 0;
  var ready = false;
  var speed = DEFAULT_SPEED;
  var root = null;      // shadow host
  var ui = {};          // panel element refs
  var lastPath = "";

  function normalizeLevelId(v) {
    var m = String(v || "").trim().match(/^(?:level_)?([A-Za-z])x([A-Za-z])$/);
    return m ? "level_" + m[1].toUpperCase() + "x" + m[2].toUpperCase() : "";
  }

  function routeLevelId() {
    var m = String(location.pathname || "").match(ROUTE_RE);
    return m ? normalizeLevelId(decodeURIComponent(m[1])) : "";
  }

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

  function sendKey(code, key, type) {
    try {
      var t = document.body || document.documentElement;
      t.dispatchEvent(new KeyboardEvent(type || "keydown", { code: code, key: key || code, bubbles: true, cancelable: true }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function runAppAction(type) {
    try {
      var app = window.__PIXEL_GAME_APP__;
      if (app && typeof app.runAction === "function") {
        app.runAction({ type: type });
        return true;
      }
    } catch (e) { /* fall through to keys */ }
    return false;
  }

  function sendMove(label) {
    return solverMove(label).then(function (ok) {
      if (ok) return true;
      if (window.__MAZEBENCH_WORLD_SOLVER_MOVE__) return false; // API present but busy/failed: don't double-move
      sendKey(KEY_FOR[label], label);
      return new Promise(function (res) { setTimeout(function () { res(true); }, 300); });
    });
  }

  var appWrapped = null, selfActing = false, holdKeysActive = false, heldCalls = 0;

  // Mirror in-game undo/reset (site buttons or Z/U/R keys — everything
  // funnels through app.runAction) into our counter so it never desyncs.
  // Skipped while our own reset (selfActing) or key-hold (holdKeysActive,
  // counted exactly via history depth instead) is in flight.
  function wrapAppActions() {
    try {
      var app = window.__PIXEL_GAME_APP__;
      if (!app || typeof app.runAction !== "function") return;
      if (appWrapped === app || app.__mbAutoplayWrapped) { appWrapped = app; return; }
      var orig = app.runAction.bind(app);
      app.runAction = function (a) {
        var t = a && a.type;
        if (entry && ready) {
          if (holdKeysActive) {
            if (t === "undo") heldCalls += 1; // fallback tally; depth resync preferred
          } else if (!selfActing) {
            if (t === "undo" && idx > 0) {
              idx -= 1; paint();
              setStatus("Undone in game — counter " + idx + ".");
            } else if (t === "reset") {
              idx = 0; playing = false; runId += 1; paint();
              setStatus("Reset in game — counter 0.");
            }
          }
        }
        return orig(a);
      };
      app.__mbAutoplayWrapped = true;
      appWrapped = app;
    } catch (e) { /* game not ready yet; retried on next tick */ }
  }

  function sendResetSelf() {
    selfActing = true;
    try {
      if (!runAppAction("reset")) sendKey("KeyR", "r");
    } finally {
      selfActing = false;
    }
    return new Promise(function (res) { setTimeout(res, 400); });
  }

  function setStatus(txt) {
    if (ui.status) ui.status.textContent = txt;
  }

  function paint() {
    if (!entry) return;
    var n = entry.path.length;
    if (ui.count) ui.count.textContent = Math.min(idx, n) + " / " + n;
    if (ui.bar) ui.bar.style.width = (n ? (100 * Math.min(idx, n) / n) : 0).toFixed(1) + "%";
    if (ui.play) ui.play.textContent = playing ? "⏸ Pause" : "▶ Play";
  }

  function stepOnce() {
    if (!entry || !ready) { setStatus("Waiting for the game…"); return Promise.resolve(false); }
    if (idx >= entry.path.length) {
      playing = false; paint();
      setStatus("🏆 Solution complete (" + entry.path.length + " moves).");
      return Promise.resolve(false);
    }
    return sendMove(entry.path[idx]).then(function (ok) {
      if (!ok) {
        playing = false; paint();
        setStatus("Game is busy — close any dialogs, then press Play to resume.");
        return false;
      }
      idx += 1; paint();
      return true;
    });
  }

  function playLoop(myRun) {
    if (!playing || myRun !== runId) return;
    stepOnce().then(function (advanced) {
      if (!playing || myRun !== runId) return;
      if (!advanced) return;
      setStatus(ready ? "Playing… (you can Pause any time)" : "Waiting for the game…");
      setTimeout(function () { playLoop(myRun); }, Math.max(30, Math.round(1000 / speed)));
    });
  }

  function onPlay() {
    if (!entry) return;
    if (idx >= entry.path.length) idx = 0; // replay from the top
    playing = !playing;
    paint();
    if (playing) {
      setStatus("Playing…");
      playLoop(++runId);
    } else {
      runId += 1;
      setStatus("Paused at move " + idx + ".");
    }
  }

  function onStep() {
    playing = false; runId += 1; paint();
    stepOnce().then(function () { setStatus("Stepped to move " + idx + "."); });
  }

  // Hold-Back = an emulated held-U key: one KeyU keydown on press, repeats
  // every 100ms like OS auto-repeat, keyup on release. The site's own queue
  // paces and coalesces exactly as a physical hold — we never count sends.
  // Counting is exact via moveHistory depth: pops == applied undos, so the
  // counter follows reality even when the game coalesces rapid undos.
  var BACK_ARM_MS = 300;
  var BACK_KEY_MS = 100;
  var BACK_LIVE_MS = 300;
  var HOLD_RESYNC_MS = 600;
  var backArmTimer = 0, backKeyTimer = 0, backLiveTimer = 0;
  var backPressActive = false, holdSession = 0, holdDepth0 = -1, holdIdx0 = 0;

  function readDepth() {
    try {
      var app = window.__PIXEL_GAME_APP__;
      var h = app && app.moveHistory;
      if (h && typeof h.length === "number") return h.length;
    } catch (e) {}
    return -1;
  }

  function undoKey(down) {
    sendKey("KeyU", "u", down ? "keydown" : "keyup");
  }

  function resyncFromDepth() {
    if (holdDepth0 < 0) return false;
    var d = readDepth();
    if (d < 0) return false;
    var drop = holdDepth0 - d;
    if (drop < 0) drop = 0;
    idx = Math.max(0, holdIdx0 - drop);
    paint();
    return true;
  }

  function backClearAll() {
    if (backArmTimer) { clearTimeout(backArmTimer); backArmTimer = 0; }
    if (backKeyTimer) { clearTimeout(backKeyTimer); backKeyTimer = 0; }
    if (backLiveTimer) { clearInterval(backLiveTimer); backLiveTimer = 0; }
  }

  function backHoldStart(e) {
    if (e && e.pointerType === "mouse" && e.button !== 0) return;
    if (e && e.preventDefault) { try { e.preventDefault(); } catch (_) {} }
    if (!entry || !ready) { setStatus("Waiting for the game…"); return; }
    if (idx <= 0) { setStatus("Already at the start."); return; }
    if (backPressActive) backHoldEnd();
    backPressActive = true;
    var session = ++holdSession;
    holdDepth0 = readDepth();
    holdIdx0 = idx;
    heldCalls = 0;
    holdKeysActive = true;
    playing = false; runId += 1; paint();
    undoKey(true);
    backLiveTimer = setInterval(function () {
      if (session !== holdSession) return;
      if (resyncFromDepth()) setStatus("Backed to move " + idx + " (holding…)");
    }, BACK_LIVE_MS);
    backArmTimer = setTimeout(function () {
      backArmTimer = 0;
      if (session !== holdSession) return;
      var repeat = function () {
        if (session !== holdSession) return;
        undoKey(true);
        backKeyTimer = setTimeout(repeat, BACK_KEY_MS);
      };
      backKeyTimer = setTimeout(repeat, BACK_KEY_MS);
    }, BACK_ARM_MS);
  }

  function backHoldEnd() {
    if (!backPressActive) return;
    backPressActive = false;
    var session = holdSession;
    backClearAll();
    holdKeysActive = false;
    undoKey(false);
    if (!entry || !ready) return;
    setTimeout(function () {
      if (session !== holdSession) return;
      if (!resyncFromDepth()) {
        idx = Math.max(0, holdIdx0 - heldCalls);
        paint();
      }
      setStatus("Backed to move " + idx + ".");
    }, HOLD_RESYNC_MS);
  }

  function doBackOnce() {
    // keyboard activation: same tap path as a quick pointer tap
    if (!entry || !ready) { setStatus("Waiting for the game…"); return; }
    if (idx <= 0) { setStatus("Already at the start."); return; }
    backHoldStart(null);
    setTimeout(function () { backHoldEnd(); }, 120);
  }

  function onReset() {
    playing = false; runId += 1;
    setStatus("Resetting level…");
    sendResetSelf().then(function () {
      idx = 0; paint();
      setStatus("Level reset. Press Play to run the solution.");
    });
  }

  function onSpeed(ev) {
    speed = Math.max(1, Math.min(10, parseInt(ev.target.value, 10) || DEFAULT_SPEED));
    if (ui.speedVal) ui.speedVal.textContent = speed + "/s";
  }

  var CSS = [
    ":host { all: initial; }",
    ".mbap { position: fixed; right: 16px; bottom: 16px; width: 264px; z-index: 2147483647;",
    "  font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #e8edf5;",
    "  background: rgba(10, 13, 22, .94); border: 1px solid #2b3153;",
    "  border-radius: 12px; padding: 12px 14px; box-shadow: 0 8px 28px rgba(0,0,0,.5); }",
    ".mbap h1 { font-size: 13px; margin: 0 0 2px; color: #fff; }",
    ".mbap .meta { font-size: 11px; color: #9aa3b8; margin-bottom: 8px; }",
    ".mbap .bar { height: 6px; background: #232842; border-radius: 4px; overflow: hidden; margin: 6px 0; }",
    ".mbap .bar > div { height: 100%; width: 0%; background: #34e7f0; }",
    ".mbap .row { display: flex; gap: 6px; margin: 8px 0; }",
    ".mbap button { flex: 1; font-size: 12px; font-weight: 600; padding: 6px 4px; border-radius: 8px;",
    "  border: 1px solid #3a4670; background: #1a2138; color: #e8edf5; cursor: pointer; }",
    ".mbap button:hover { background: #232c4d; }",
    ".mbap button.wide { flex: 2; }",
    ".mbap .back { touch-action: none; user-select: none; -webkit-user-select: none; }",
    ".mbap .x { position: absolute; top: 6px; right: 8px; flex: none; border: none; background: none;",
    "  color: #9aa3b8; font-size: 14px; padding: 2px 6px; }",
    ".mbap .status { font-size: 11px; color: #9aa3b8; min-height: 16px; }",
    ".mbap .count { font-variant-numeric: tabular-nums; color: #9aa3b8; font-size: 11px; }",
    ".mbap input[type=range] { width: 100%; accent-color: #34e7f0; }",
    ".mbap-mini { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;",
    "  font: 600 12px system-ui, sans-serif; color: #062a2d; background: #34e7f0;",
    "  border: none; border-radius: 20px; padding: 8px 12px; cursor: pointer; }"
  ].join("\n");

  function buildPanel() {
    root = document.createElement("div");
    var shadow = root.attachShadow({ mode: "closed" });
    var box = document.createElement("div");
    box.className = "mbap";
    box.innerHTML =
      '<button class="x" type="button" title="Hide panel">✕</button>' +
      '<h1><svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect x="0.5" y="0.5" width="15" height="15" rx="4" fill="#0a0d16" stroke="#2b3153"/><path d="M5.8 4.8v6.4L11.6 8z" fill="#34e7f0"/></svg> MazeBench Autoplayer</h1>' +
      '<div class="meta"></div>' +
      '<div class="count">0 / 0</div>' +
      '<div class="bar"><div></div></div>' +
      '<div class="row">' +
      '  <button class="play wide" type="button">▶ Play</button>' +
      '  <button class="step" type="button">Step</button>' +
      '</div>' +
      '<div class="row">' +
      '  <button class="back" type="button">‹ Back</button>' +
      '  <button class="reset" type="button">Reset</button>' +
      '</div>' +
      '<div class="row"><input class="speed" type="range" min="1" max="10" step="1" value="' + DEFAULT_SPEED + '" title="Moves per second — the game animation is the real limit"></div>' +
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
      status: box.querySelector(".status"),
      speedVal: null
    };
    var speedInput = box.querySelector(".speed");
    speedInput.addEventListener("input", onSpeed);
    var speedLabel = document.createElement("div");
    speedLabel.className = "count";
    speedInput.before(speedLabel);
    ui.speedVal = speedLabel;
    box.querySelector(".play").addEventListener("click", onPlay);
    box.querySelector(".step").addEventListener("click", onStep);
    var backBtn = box.querySelector(".back");
    backBtn.addEventListener("pointerdown", backHoldStart);
    backBtn.addEventListener("pointerup", function () { backHoldEnd(); });
    backBtn.addEventListener("pointercancel", function () { backHoldEnd(); });
    backBtn.addEventListener("pointerleave", function () { backHoldEnd(); });
    backBtn.addEventListener("contextmenu", function (e) { if (e && e.preventDefault) e.preventDefault(); });
    // click = keyboard activation only (detail 0); mouse/touch go through pointer handlers
    backBtn.addEventListener("click", function (e) { if (e && e.detail !== 0) return; doBackOnce(); });
    if (typeof window.addEventListener === "function") {
      window.addEventListener("pointerup", function () { backHoldEnd(); });
    }
    box.querySelector(".reset").addEventListener("click", onReset);
    box.querySelector(".x").addEventListener("click", hidePanel);
    updateSpeedLabel();
  }

  function updateSpeedLabel() {
    if (ui.speedVal) ui.speedVal.textContent = "Speed: " + speed + " moves/s";
  }

  var miniBtn = null;
  function hidePanel() {
    if (root) root.style.display = "none";
    if (!miniBtn) {
      miniBtn = document.createElement("button");
      miniBtn.textContent = "▶ MB";
      miniBtn.className = "mbap-mini";
      miniBtn.type = "button";
      // mini button lives outside shadow (page CSS is fine for one pill)
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
        ready = true;
        wrapAppActions();
        setStatus("Ready — press Play to run the " + entry.path.length + "-move solution.");
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

  // Rooms with no saved path: proven solo-unwinnable (exhaustive search)
  // vs still open. Shown in the panel so unsolved rooms are visible.
  var INACCESSIBLE = { level_AxA: 1, level_AxI: 1, level_AxK: 1, level_BxF: 1, level_BxG: 1, level_CxD: 1, level_CxE: 1, level_CxG: 1, level_ExC: 1, level_FxC: 1, level_IxJ: 1, level_LxC: 1, level_MxF: 1, level_MxI: 1, level_MxJ: 1, level_OxK: 1, level_PxN: 1, level_CxO: 1, level_PxM: 1, level_NxI: 1, level_ExF: 1, level_AxG: 1, level_FxK: 1, level_MxO: 1, level_PxO: 1 };
  var GEM_ROOMS = 86; // world survey count
  function setupForLevel(id) {
    levelId = id;
    entry = (window.MB_SOLUTIONS || {})[id] || null;
    idx = 0; playing = false; runId += 1; ready = false;
    if (!entry) {
      if (!root) buildPanel();
      root.style.display = "";
      if (miniBtn) miniBtn.style.display = "none";
      var solved = Object.keys(window.MB_SOLUTIONS || {}).length;
      var pretty = id ? id.replace("level_", "Level ") : "this room";
      ui.meta.textContent = pretty + " · no saved solution yet";
      if (ui.count) ui.count.textContent = "○ " + solved + " / " + GEM_ROOMS + " gem rooms covered";
      if (ui.bar) ui.bar.style.width = "0%";
      if (ui.play) { ui.play.textContent = "▶ Play"; ui.play.disabled = true; }
      setStatus(INACCESSIBLE[id] ? "⛔ Proven solo-unwinnable (exhaustive search) — see REGISTRY.md." : "○ Unsolved — no verified path banked yet. See REGISTRY.md.");
      return;
    }
    if (ui.play) ui.play.disabled = false;
    if (!root) buildPanel();
    root.style.display = "";
    if (miniBtn) miniBtn.style.display = "none";
    ui.meta.textContent = entry.label + " · " + entry.path.length + " moves (saved optimal)";
    paint();
    waitForGame();
  }

  function checkNav() {
    wrapAppActions(); // re-wrap if the page recreated the app object
    var id = routeLevelId();
    if (id !== levelId) {
      lastPath = location.pathname;
      if (!id) {
        if (root) root.style.display = "none";
        levelId = ""; entry = null; playing = false; runId += 1;
        return;
      }
      setupForLevel(id);
    }
  }

  // L toggles nothing here (game has no L binding); panel buttons are the UI.
  // Keyboard: keep the page's own bindings untouched.
  lastPath = location.pathname;
  setupForLevel(routeLevelId());
  setInterval(checkNav, 1000);
})();
