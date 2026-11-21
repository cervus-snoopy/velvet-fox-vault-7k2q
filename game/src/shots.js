// shots.js — stages the four screenshot scenes from the real game state.
// Each shot is a frozen frame of actual gameplay: the same level data,
// the same guard AI positions, the same renderer — nothing is drawn
// specially for the camera. main.js renders the staged state once and
// sets window.__shotReady so the capture script knows the frame is done.

import { TILE } from './config.js';
import { newGame } from './level.js';

const IDLE_INPUT = { up: false, down: false, left: false, right: false, sneak: false };

// Find the first tile holding character `ch`, scanning top to bottom.
function findTile(level, ch) {
  for (let y = 0; y < level.grid.length; y++) {
    for (let x = 0; x < level.grid[y].length; x++) {
      if (level.grid[y][x] === ch) return { x, y };
    }
  }
  return null;
}

// Run the real simulation for `seconds` with the player standing still,
// so guards settle mid-patrol instead of at their spawn tiles.
function settle(state, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    state.player.update(1 / 60, IDLE_INPUT, state.level);
    for (const g of state.guards) g.update(1 / 60, state);
  }
}

function stageCover(seed) {
  // Level 2, mid-play: the thief sneaks behind a crate while a guard's
  // cone sweeps close by; an artifact and the exit are both in frame.
  const state = newGame(1, seed);
  settle(state, 2.2);
  const crate = findTile(state.level, 'C');
  state.player.x = crate.x * TILE + TILE / 2;
  state.player.y = (crate.y + 1) * TILE + TILE / 2;
  state.player.sneaking = true;
  state.player.facing = Math.PI; // facing the guard, back to the crate
  const guard = state.guards[0];
  guard.x = state.player.x + 4.2 * TILE;
  guard.y = state.player.y;
  guard.facing = Math.PI + 0.3; // cone sweeping just below the thief: a near-miss
  guard.state = 'patrol';
  state.detection = 0.45;
  state.level.artifacts[0].taken = true;
  state.artifactsGot = 1;
  state.time = 42.3;
  state.screen = 'play';
  return state;
}

function stagePatrol(seed) {
  // Level 1 from above: two guards on their beats, cones sweeping the hall.
  const state = newGame(0, seed);
  settle(state, 2.6);
  state.time = 8.0;
  state.screen = 'play';
  return state;
}

function stageAlarm(seed) {
  // High meter, alarm on, a guard closing in on the thief.
  const state = newGame(1, seed);
  settle(state, 1.0);
  const crate = findTile(state.level, 'C');
  state.player.x = crate.x * TILE + TILE / 2;
  state.player.y = (crate.y + 2) * TILE + TILE / 2;
  state.player.facing = -Math.PI / 2;
  const guard = state.guards[0];
  guard.x = state.player.x + 2.2 * TILE;
  guard.y = state.player.y + 0.6 * TILE;
  guard.facing = Math.atan2(state.player.y - guard.y, state.player.x - guard.x);
  guard.state = 'chase';
  state.detection = 0.97;
  state.alarm = true;
  state.level.artifacts[0].taken = true;
  state.level.artifacts[1].taken = true;
  state.artifactsGot = 2;
  state.time = 88.1;
  state.screen = 'play';
  return state;
}

function stageWin(seed) {
  // The win screen after the final vault is emptied.
  const state = newGame(2, seed);
  for (const a of state.level.artifacts) a.taken = true;
  state.artifactsGot = 3;
  state.totalTime = 187.4;
  state.time = 187.4;
  state.screen = 'win';
  return state;
}

export function stageShot(name, seed = 1) {
  switch (name) {
    case 'cover':
      return stageCover(seed);
    case 'patrol':
      return stagePatrol(seed);
    case 'alarm':
      return stageAlarm(seed);
    case 'win':
      return stageWin(seed);
    default:
      throw new Error(`unknown shot: ${name}`);
  }
}
