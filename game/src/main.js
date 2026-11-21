// main.js — boot, the fixed-timestep game loop, screens (title / play /
// paused / caught / level-clear / win) and the ?shot= staging hook used
// for screenshots. All game rules live in the other modules; this file
// only wires them together.

import { VIEW_W, VIEW_H, ARTIFACTS_PER_LEVEL, SUSPICIOUS_AT, ALARM_AT, ALARM_ENDS_BELOW, DETECT_DECAY_RATE, DETECT_ALARM_DECAY_RATE, EXIT_RADIUS } from './config.js';
import { newGame, levelCount } from './level.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'shadow-vault-best';

function loadBest() {
  try {
    const v = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

function saveBest(t) {
  try {
    window.localStorage.setItem(BEST_KEY, String(t));
  } catch {
    // Private mode or disabled storage: best time just does not persist.
  }
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = new Input(canvas);
  const sound = new SoundEngine();
  const ui = { best: loadBest(), muted: false };

  // Crisp 2x backing store: the canvas is 2560x1600 internally, drawn in
  // 1280x800 logical pixels, so screenshots stay sharp when shrunk.
  canvas.width = VIEW_W * 2;
  canvas.height = VIEW_H * 2;

  // --- Screenshot staging: one frozen frame, then signal readiness. ---
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') || '1');
    const state = stageShot(shot, seed);
    if (state.totalTime) ui.best = state.totalTime;
    document.getElementById('status').textContent =
      'SHADOW VAULT — WASD move · SHIFT sneak · P pause · M mute · R retry';
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    drawGame(ctx, state, ui);
    window.__shotReady = true;
    document.body.dataset.shotReady = 'true';
    document.title = `SHADOW VAULT — shot ${shot}`;
    return;
  }

  // --- Live game ---
  let state = newGame(0, 1);
  state.screen = 'title';
  let runTotal = 0; // seconds across levels in this run
  let wasSuspicious = false;
  let lastFrame = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  // Debug handle for automated playtests (read-only state inspection).
  window.__shadowVault = {
    input,
    get state() {
      return state;
    },
  };

  function startRun() {
    runTotal = 0;
    state = newGame(0, 1);
    state.screen = 'play';
  }

  function nextLevel() {
    runTotal += state.time;
    if (state.levelIndex + 1 >= levelCount()) {
      state.screen = 'win';
      state.totalTime = runTotal;
      if (ui.best === 0 || runTotal < ui.best) {
        ui.best = runTotal;
        saveBest(runTotal);
      }
      sound.jingle(true);
      return;
    }
    state = newGame(state.levelIndex + 1, 1);
    state.screen = 'play';
  }

  function update(dt) {
    if (state.screen !== 'play') return;
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    state.player.update(dt, input, state.level);

    // Guards: the strongest sighting drives the shared detection meter.
    let maxRate = 0;
    for (const g of state.guards) {
      const rate = g.update(dt, state);
      if (rate > maxRate) maxRate = rate;
    }
    if (maxRate > 0) {
      const wasBelow = state.detection < SUSPICIOUS_AT;
      state.detection = Math.min(ALARM_AT, state.detection + maxRate * dt);
      if (wasBelow && state.detection >= SUSPICIOUS_AT) sound.spotted();
      if (state.detection >= ALARM_AT && !state.alarm) {
        state.alarm = true;
        sound.alarm();
      }
    } else {
      const decay = state.alarm ? DETECT_ALARM_DECAY_RATE : DETECT_DECAY_RATE;
      state.detection = Math.max(0, state.detection - decay * dt);
      if (state.alarm && state.detection < ALARM_ENDS_BELOW) state.alarm = false;
    }
    wasSuspicious = state.detection >= SUSPICIOUS_AT;

    // Footsteps: the player's own, and each guard's, louder when nearer.
    if (state.player.moving && state.player.stepTimer >= (state.player.sneaking ? 0.55 : 0.38)) {
      state.player.stepTimer = 0;
      sound.playerStep(state.player.sneaking);
    }
    for (const g of state.guards) {
      if (g.stepTimer === 0) {
        sound.guardStep(Math.hypot(g.x - state.player.x, g.y - state.player.y));
      }
    }

    // Artifact pickup.
    const got = state.player.tryPickup(state.level.artifacts);
    if (got) {
      state.artifactsGot += 1;
      sound.pickup();
      state.message =
        state.artifactsGot >= ARTIFACTS_PER_LEVEL
          ? 'All artifacts pocketed — the EXIT is open!'
          : `Artifact ${state.artifactsGot}/${ARTIFACTS_PER_LEVEL} pocketed`;
      state.messageTimer = 2.2;
    }

    // Exit: locked until all artifacts are pocketed.
    const exit = state.level.exit;
    if (Math.hypot(exit.x - state.player.x, exit.y - state.player.y) < EXIT_RADIUS) {
      if (state.artifactsGot >= ARTIFACTS_PER_LEVEL) {
        state.levelTime = state.time;
        if (state.levelIndex + 1 >= levelCount()) {
          // The last floor: straight to the win screen, no extra prompt.
          runTotal += state.time;
          state.screen = 'win';
          state.totalTime = runTotal;
          if (ui.best === 0 || runTotal < ui.best) {
            ui.best = runTotal;
            saveBest(runTotal);
          }
          sound.jingle(true);
        } else {
          state.screen = 'level';
          sound.jingle(false);
        }
      } else if (state.messageTimer <= 0) {
        state.message = `EXIT LOCKED — find all ${ARTIFACTS_PER_LEVEL} artifacts first (${state.artifactsGot}/${ARTIFACTS_PER_LEVEL})`;
        state.messageTimer = 2.2;
      }
    }

    // Caught: a chasing guard touches the thief.
    if (state.alarm) {
      for (const g of state.guards) {
        if (g.catches(state.player)) {
          state.screen = 'caught';
          state.caughtBy = g;
          break;
        }
      }
    }
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;

    // One-shot keys.
    if (input.wasPressed('m')) {
      ui.muted = sound.toggleMute();
    }
    if (input.wasPressed('enter') || input.mouse.clicked) {
      sound.ensure();
      if (state.screen === 'title') startRun();
      else if (state.screen === 'level') nextLevel();
      else if (state.screen === 'win') startRun();
      else if (state.screen === 'caught') state.screen = 'title';
    }
    if (input.wasPressed('r') && (state.screen === 'play' || state.screen === 'caught')) {
      const idx = state.levelIndex;
      const keptTotal = runTotal;
      state = newGame(idx, 1);
      state.screen = 'play';
      runTotal = keptTotal;
    }
    if ((input.wasPressed('p') || input.wasPressed('escape')) && (state.screen === 'play' || state.screen === 'paused')) {
      state.screen = state.screen === 'play' ? 'paused' : 'play';
    }

    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      update(STEP);
      acc -= STEP;
      guard++;
    }
    if (guard === 5) acc = 0;

    ctx.setTransform(2, 0, 0, 2, 0, 0);
    drawGame(ctx, state, ui);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  window.addEventListener('blur', () => {
    if (state.screen === 'play') state.screen = 'paused';
  });

  document.getElementById('status').textContent =
    'SHADOW VAULT loaded — press ENTER to begin. WASD move, SHIFT sneak, P pause, M mute.';
  requestAnimationFrame(frame);
}

boot();
