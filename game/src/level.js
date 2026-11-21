// level.js — the three museum floors of SHADOW VAULT.
// Maps are 32 x 20 character grids (one char per 40px tile):
//   # wall (blocks movement and sight)   C crate (blocks movement and sight)
//   S shadow patch (hides the player)    . open floor
//   P player spawn  G guard spawn         A artifact   E exit
// Guard patrol waypoints are tile coordinates, listed in spawn order
// (the order the G characters appear when the map is read top to bottom).

import { COLS, ROWS, TILE, LEVEL_NAMES } from './config.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { mulberry32 } from './random.js';

const MAPS = [
  {
    name: LEVEL_NAMES[0],
    rows: [
      '################################',
      '#......#..........#............#',
      '#..P...#....A.....#.....A......#',
      '#......#..........#............#',
      '#..CC..#....CC....#....CC......#',
      '#..CC.......CC.........CC......#',
      '#.....S...........S............#',
      '#..G.....S........S.......G....#',
      '#..............................#',
      '#....####......######..........#',
      '#....####......######.....A....#',
      '#..............................#',
      '#..S........CC.......CC....S...#',
      '#..S........CC.......CC....S...#',
      '#..............................#',
      '#..............................#',
      '#..........................E...#',
      '#....CC...........CC...........#',
      '#....CC...........CC...........#',
      '################################',
    ],
    // Two guards on simple horizontal beats.
    waypoints: [
      [
        [3, 7],
        [14, 7],
      ],
      [
        [26, 7],
        [17, 7],
      ],
    ],
  },
  {
    name: LEVEL_NAMES[1],
    rows: [
      '################################',
      '#....#.......#........#........#',
      '#..P.#...A...#...CC...#...A....#',
      '#....#.......#........#........#',
      '#.CC.#...CC..#..CC....#..CC....#',
      '#.CC.....CC.....CC.......CC....#',
      '#..S.....S......S....S.........#',
      '#..G.....S......S....S....G....#',
      '#..............................#',
      '#..####.....######.....####....#',
      '#..####.....######.....####....#',
      '#.......A......................#',
      '#..CC......CC......CC....CC....#',
      '#..CC......CC......CC....CC....#',
      '#.......S.......S..............#',
      '#....G.......S.......S.........#',
      '#..............................#',
      '#..S.........CC.........E......#',
      '#..S.........CC................#',
      '################################',
    ],
    // Three guards: two on the gallery beat, one sweeping the lower hall.
    waypoints: [
      [
        [3, 7],
        [13, 7],
      ],
      [
        [26, 7],
        [18, 7],
      ],
      [
        [5, 15],
        [14, 15],
      ],
    ],
  },
  {
    name: LEVEL_NAMES[2],
    rows: [
      '################################',
      '#..P......#........#......#....#',
      '#..#..A...#...CC...#..A...#....#',
      '#..#......#........#......#....#',
      '#..#..CC..#..CC....#..CC..#....#',
      '#.....CC.....CC.......CC.......#',
      '#.S......S.......S......S......#',
      '#.G......S.......S......S...G..#',
      '#..............................#',
      '#..####....########....####....#',
      '#..####....########....####....#',
      '#........A.....................#',
      '#.CC.......CC......CC.....CC...#',
      '#.CC.......CC......CC.....CC...#',
      '#....S.........S...............#',
      '#.G.......S.........S......G...#',
      '#..............................#',
      '#..CC........CC..........E.....#',
      '#..CC........CC................#',
      '################################',
    ],
    // Four guards on crossing beats; fewer shadows than level 2.
    waypoints: [
      [
        [2, 7],
        [13, 7],
      ],
      [
        [28, 7],
        [17, 7],
      ],
      [
        [2, 15],
        [13, 15],
      ],
      [
        [27, 15],
        [17, 15],
      ],
    ],
  },
];

// Parse one map into a level object the rest of the game can query.
export function parseLevel(index) {
  const def = MAPS[index];
  if (!def) throw new Error(`no level ${index}`);
  const grid = def.rows.map((row) => row.split(''));
  if (grid.length !== ROWS) throw new Error(`level ${index}: ${grid.length} rows, expected ${ROWS}`);
  for (let y = 0; y < ROWS; y++) {
    if (grid[y].length !== COLS) {
      throw new Error(`level ${index} row ${y}: ${grid[y].length} cols, expected ${COLS}`);
    }
  }

  const level = {
    index,
    name: def.name,
    grid,
    artifacts: [],
    exit: null,
    playerSpawn: null,
    guardSpawns: [],
    // Seeded speckles so the floor has texture but stays deterministic.
    speckles: [],
  };

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (ch === 'P') level.playerSpawn = { x: cx, y: cy };
      else if (ch === 'G') level.guardSpawns.push({ x: cx, y: cy });
      else if (ch === 'A') level.artifacts.push({ x: cx, y: cy, taken: false, kind: level.artifacts.length });
      else if (ch === 'E') level.exit = { x: cx, y: cy };
    }
  }
  if (!level.playerSpawn) throw new Error(`level ${index}: no player spawn`);
  if (!level.exit) throw new Error(`level ${index}: no exit`);
  if (level.artifacts.length !== 3) {
    throw new Error(`level ${index}: ${level.artifacts.length} artifacts, expected 3`);
  }
  if (level.guardSpawns.length !== def.waypoints.length) {
    throw new Error(
      `level ${index}: ${level.guardSpawns.length} guard spawns but ${def.waypoints.length} waypoint lists`,
    );
  }

  const rng = mulberry32(1000 + index * 77);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rng() * COLS);
    const y = Math.floor(rng() * ROWS);
    if (grid[y][x] === '.') {
      level.speckles.push({ x: x * TILE + 4 + rng() * (TILE - 8), y: y * TILE + 4 + rng() * (TILE - 8) });
    }
  }
  return level;
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

export function isSolid(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'C';
}

export function blocksSight(level, px, py) {
  return isSolid(level, px, py);
}

export function isShadow(level, px, py) {
  return tileAt(level, px, py) === 'S';
}

// Circle-vs-tiles collision: true when a circle of radius r centred at
// (px, py) overlaps any solid tile. Checks the four bounding-box corners
// plus the edge midpoints so thin walls still catch the circle.
export function collides(level, px, py, r) {
  const pts = [
    [px - r, py - r],
    [px + r, py - r],
    [px - r, py + r],
    [px + r, py + r],
    [px, py - r],
    [px, py + r],
    [px - r, py],
    [px + r, py],
  ];
  return pts.some(([x, y]) => isSolid(level, x, y));
}

// Fresh game state for a level: player, guards, detection, timer.
export function newGame(levelIndex, seed = 1) {
  const level = parseLevel(levelIndex);
  const def = MAPS[levelIndex];
  const guards = level.guardSpawns.map((spawn, i) => {
    const wps = def.waypoints[i].map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }));
    return new Guard(spawn.x, spawn.y, wps);
  });
  return {
    levelIndex,
    level,
    player: new Player(level.playerSpawn.x, level.playerSpawn.y),
    guards,
    detection: 0,
    alarm: false,
    artifactsGot: 0,
    time: 0,
    screen: 'play',
    seed,
    message: '',
    messageTimer: 0,
    caughtBy: null,
  };
}

export function levelCount() {
  return MAPS.length;
}
