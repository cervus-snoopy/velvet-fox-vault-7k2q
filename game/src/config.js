// config.js — every tunable number for SHADOW VAULT in one place.
// Tile grid is 32 x 20 tiles of 40px, so the playfield is exactly 1280 x 800.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 800

export const PLAYER_RADIUS = 14;
export const PLAYER_WALK_SPEED = 175; // px per second
export const PLAYER_SNEAK_SPEED = 95; // px per second, quieter and harder to spot
export const GUARD_RADIUS = 15;
export const GUARD_PATROL_SPEED = 78;
export const GUARD_SUSPICIOUS_SPEED = 115;
export const GUARD_CHASE_SPEED = 168; // a touch slower than a walking player

export const CONE_RANGE = 230; // px, how far a guard can see
export const CONE_HALF_ANGLE = (35 * Math.PI) / 180; // radians either side of facing

// Detection meter 0..1. Rises while any guard sees the player, falls while hidden.
export const DETECT_BASE_RATE = 1.15; // per second at point blank, standing, lit
export const DETECT_CLOSE_BOOST = 1.35; // multiplier under 70px
export const DETECT_SNEAK_FACTOR = 0.55; // sneaking is harder to spot
export const DETECT_SHADOW_FACTOR = 0.33; // inside a shadow the meter crawls
export const DETECT_DECAY_RATE = 0.3; // per second while unseen
export const DETECT_ALARM_DECAY_RATE = 0.12; // per second while unseen during alarm
export const SUSPICIOUS_AT = 0.45; // guards turn toward the last seen spot
export const ALARM_AT = 1.0; // meter full: every guard chases
export const ALARM_ENDS_BELOW = 0.25; // meter must fall this far to stand down
export const CATCH_DISTANCE = 26; // px, guard touches player while alarmed

export const ARTIFACTS_PER_LEVEL = 3;
export const PICKUP_DISTANCE = 26;
export const EXIT_RADIUS = 28;

export const LEVEL_NAMES = ['The Gallery', 'The Vault Corridor', 'The Grand Vault'];

export const COLORS = {
  floorA: '#1b2334',
  floorB: '#1e2839',
  floorSpeck: '#232f45',
  wall: '#3d4356',
  wallTop: '#565e75',
  crate: '#7a5230',
  crateEdge: '#54371d',
  cratePlank: '#9a6b3d',
  shadow: '#0d1a12',
  shadowEdge: '#1d3a28',
  artifactDiamond: '#5fe8ff',
  artifactIdol: '#ffd34d',
  artifactScroll: '#c98bff',
  exitLocked: '#c0392b',
  exitOpen: '#2ecc71',
  guard: '#c0392b',
  guardCoat: '#8e2f26',
  cone: 'rgba(255, 214, 64, 0.20)',
  coneSuspicious: 'rgba(255, 140, 40, 0.28)',
  coneAlarm: 'rgba(255, 60, 40, 0.34)',
  player: '#2e86c1',
  playerHood: '#1a5276',
  hudBg: 'rgba(8, 12, 20, 0.82)',
  hudText: '#e8eef7',
  hudMuted: '#9fb0c8',
  meterLow: '#2ecc71',
  meterMid: '#f1c40f',
  meterHigh: '#e74c3c',
};
