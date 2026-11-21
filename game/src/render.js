// render.js — everything drawn on the canvas: the museum floor, walls,
// crates, shadow patches, artifacts, the exit, guards with their vision
// cones, the thief, the HUD and every screen overlay. All drawing happens
// in 1280 x 800 logical pixels; main.js scales the context 2x for crispness.

import {
  TILE,
  COLS,
  ROWS,
  VIEW_W,
  VIEW_H,
  CONE_RANGE,
  CONE_HALF_ANGLE,
  ARTIFACTS_PER_LEVEL,
  COLORS,
} from './config.js';
import { blocksSight } from './level.js';

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Raycast one cone edge: walk out from the guard until a wall/crate or range.
function coneEdge(level, gx, gy, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = 8; d <= CONE_RANGE; d += 8) {
    if (blocksSight(level, gx + dx * d, gy + dy * d)) return d - 8;
  }
  return CONE_RANGE;
}

// The vision cone as a polygon, clipped by walls so it reads honestly:
// it stops where sight stops.
function conePolygon(level, guard) {
  const pts = [{ x: guard.x, y: guard.y }];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = guard.facing - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / steps;
    const d = coneEdge(level, guard.x, guard.y, a);
    pts.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
  }
  return pts;
}

function drawFloor(ctx, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(px, py, TILE, TILE);
    }
  }
  ctx.fillStyle = COLORS.floorSpeck;
  for (const s of level.speckles) ctx.fillRect(s.x, s.y, 2, 2);
}

function drawTiles(ctx, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = level.grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 5);
      } else if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.cratePlank;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + TILE - 2, py + TILE - 2);
        ctx.moveTo(px + TILE - 2, py + 2);
        ctx.lineTo(px + 2, py + TILE - 2);
        ctx.stroke();
      } else if (ch === 'S') {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.shadowEdge;
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(px + 5 + i * 6, py + 5 + ((i * 7) % 28), 3, 3);
        }
      }
    }
  }
}

function drawArtifact(ctx, a, time) {
  const bob = Math.sin(time * 2.4 + a.x) * 3;
  const y = a.y + bob;
  ctx.save();
  ctx.shadowColor = a.kind === 0 ? COLORS.artifactDiamond : a.kind === 1 ? COLORS.artifactIdol : COLORS.artifactScroll;
  ctx.shadowBlur = 14;
  if (a.kind === 0) {
    // Diamond: a tilted square, cyan.
    ctx.fillStyle = COLORS.artifactDiamond;
    ctx.beginPath();
    ctx.moveTo(a.x, y - 12);
    ctx.lineTo(a.x + 10, y);
    ctx.lineTo(a.x, y + 12);
    ctx.lineTo(a.x - 10, y);
    ctx.closePath();
    ctx.fill();
  } else if (a.kind === 1) {
    // Golden idol: a circle with a little crown.
    ctx.fillStyle = COLORS.artifactIdol;
    ctx.beginPath();
    ctx.arc(a.x, y + 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(a.x - 8, y - 6);
    ctx.lineTo(a.x - 4, y - 14);
    ctx.lineTo(a.x, y - 7);
    ctx.lineTo(a.x + 4, y - 14);
    ctx.lineTo(a.x + 8, y - 6);
    ctx.closePath();
    ctx.fill();
  } else {
    // Violet scroll: a rolled tube.
    ctx.fillStyle = COLORS.artifactScroll;
    ctx.beginPath();
    ctx.roundRect(a.x - 11, y - 7, 22, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#efe6ff';
    ctx.fillRect(a.x - 7, y - 3, 14, 2);
    ctx.fillRect(a.x - 7, y + 2, 10, 2);
  }
  ctx.restore();
}

function drawExit(ctx, state) {
  const { exit } = state.level;
  const open = state.artifactsGot >= ARTIFACTS_PER_LEVEL;
  ctx.save();
  ctx.shadowColor = open ? COLORS.exitOpen : COLORS.exitLocked;
  ctx.shadowBlur = open ? 18 : 6;
  ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitLocked;
  ctx.beginPath();
  ctx.roundRect(exit.x - 16, exit.y - 16, 32, 32, 6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#0b1520';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exit.x, exit.y + 1);
  if (!open) {
    // A small padlock rides on the door's top-right corner.
    ctx.fillStyle = '#0b1520';
    ctx.fillRect(exit.x + 7, exit.y - 15, 10, 8);
    ctx.strokeStyle = '#0b1520';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(exit.x + 12, exit.y - 14, 4, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffb0a8';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('LOCKED', exit.x, exit.y + 26);
  }
}

function drawGuard(ctx, level, guard) {
  // Vision cone, clipped by walls.
  const poly = conePolygon(level, guard);
  ctx.fillStyle =
    guard.state === 'chase'
      ? COLORS.coneAlarm
      : guard.state === 'suspicious'
        ? COLORS.coneSuspicious
        : COLORS.cone;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill();

  // Body: maroon coat, facing wedge, pale helmet band.
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardCoat;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 15, guard.facing - 0.9, guard.facing + 0.9);
  ctx.lineTo(guard.x, guard.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 7, guard.y + Math.sin(guard.facing) * 7, 4, 0, Math.PI * 2);
  ctx.fill();

  // Alert marks: "!" while suspicious, "!!" while chasing.
  if (guard.state !== 'patrol') {
    ctx.fillStyle = guard.state === 'chase' ? '#ff5040' : '#ffb020';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(guard.state === 'chase' ? '!!' : '!', guard.x, guard.y - 20);
  }
}

function drawPlayer(ctx, player) {
  ctx.save();
  if (player.sneaking) ctx.globalAlpha = 0.85;
  // Soft pool of light around the thief: lighting shows what is safe.
  const glow = ctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, 70);
  glow.addColorStop(0, 'rgba(120, 180, 255, 0.10)');
  glow.addColorStop(1, 'rgba(120, 180, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
  ctx.fill();
  // Hood: a darker arc on the facing side.
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 14, player.facing - 1.1, player.facing + 1.1);
  ctx.lineTo(player.x, player.y);
  ctx.closePath();
  ctx.fill();
  // Eyes in the dark.
  ctx.fillStyle = '#eaf6ff';
  const ex = Math.cos(player.facing);
  const ey = Math.sin(player.facing);
  ctx.beginPath();
  ctx.arc(player.x + ex * 6 - ey * 4, player.y + ey * 6 + ex * 4, 1.8, 0, Math.PI * 2);
  ctx.arc(player.x + ex * 6 + ey * 4, player.y + ey * 6 - ex * 4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 19, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.78);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function meterColor(d) {
  if (d < 0.45) return COLORS.meterLow;
  if (d < 0.8) return COLORS.meterMid;
  return COLORS.meterHigh;
}

export function drawHUD(ctx, state, ui) {
  const { levelIndex, level, artifactsGot, detection, time } = state;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 46);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`SHADOW VAULT — Level ${levelIndex + 1}: ${level.name}`, 14, 24);

  // Detection meter, centre.
  const mw = 260;
  const mx = VIEW_W / 2 - mw / 2;
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(state.alarm ? 'ALARM!' : 'SEEN', mx - 10, 24);
  ctx.fillStyle = '#101826';
  ctx.fillRect(mx, 12, mw, 22);
  ctx.fillStyle = meterColor(detection);
  ctx.fillRect(mx + 2, 14, Math.max(0, (mw - 4) * detection), 18);
  // Suspicion threshold tick.
  ctx.fillStyle = '#e8eef7';
  ctx.fillRect(mx + mw * 0.45 - 1, 12, 2, 22);
  ctx.textAlign = 'left';

  // Right side: artifacts, timer, best, sound.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  const bestText = ui.best > 0 ? fmtTime(ui.best) : '--:--';
  const right = `ARTIFACTS ${artifactsGot}/${ARTIFACTS_PER_LEVEL}   ${fmtTime(time)}   BEST ${bestText}   ${
    ui.muted ? 'M: MUTED' : 'M: SOUND'
  }`;
  ctx.textAlign = 'right';
  ctx.fillText(right, VIEW_W - 14, 24);
  ctx.textAlign = 'left';

  // Transient hint line under the bar.
  if (state.message && state.messageTimer > 0) {
    ctx.fillStyle = 'rgba(8, 12, 20, 0.75)';
    const w = ctx.measureText(state.message).width + 28;
    ctx.beginPath();
    ctx.roundRect(VIEW_W / 2 - w / 2, 54, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, VIEW_W / 2, 70);
    ctx.textAlign = 'left';
  }

  // "Hidden in shadow" tag when it matters.
  if (state.player.inShadow && state.screen === 'play') {
    ctx.fillStyle = '#9fe8b0';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN IN SHADOW — detection rises 3x slower', VIEW_W / 2, VIEW_H - 16);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, titleColor, lines, prompt) {
  ctx.fillStyle = 'rgba(4, 7, 12, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 130);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 62 + i * 30));
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(prompt, VIEW_W / 2, VIEW_H / 2 + 66);
  ctx.textAlign = 'left';
}

export function drawGame(ctx, state, ui) {
  const { level, player, guards, time } = state;
  drawFloor(ctx, level);
  drawTiles(ctx, level);
  for (const a of level.artifacts) if (!a.taken) drawArtifact(ctx, a, time);
  drawExit(ctx, state);
  for (const g of guards) drawGuard(ctx, level, g);
  drawPlayer(ctx, player);
  drawVignette(ctx);
  drawHUD(ctx, state, ui);

  if (state.screen === 'title') {
    overlay(
      ctx,
      'SHADOW VAULT',
      '#ffd34d',
      [
        'A thief in the museum at night. Pocket all 3 artifacts,',
        'then reach the green EXIT without being seen.',
        '',
        'WASD / arrows — move      SHIFT — sneak (slower, harder to spot)',
        'Hide behind crates and in shadows. Watch the SEEN meter.',
        'P — pause      M — mute      R — retry level',
      ],
      ui.best > 0 ? `Best vault run: ${fmtTime(ui.best)}  —  press ENTER to begin` : 'Press ENTER to begin',
    );
  } else if (state.screen === 'paused') {
    overlay(ctx, 'PAUSED', COLORS.hudText, ['The museum waits. The guards do not sleep.'], 'Press P or ESC to keep sneaking');
  } else if (state.screen === 'caught') {
    overlay(
      ctx,
      'CAUGHT!',
      '#ff5040',
      ['A guard grabbed you under the lights.', `Level ${state.levelIndex + 1}: ${state.level.name} — artifacts ${state.artifactsGot}/3`],
      'Press R to retry the level, ENTER for the title screen',
    );
  } else if (state.screen === 'level') {
    overlay(
      ctx,
      'LEVEL CLEAR',
      COLORS.exitOpen,
      [
        `${state.level.name} — cleared in ${fmtTime(state.levelTime || 0)}.`,
        `Artifacts ${state.artifactsGot}/3 — the vault door swings open.`,
      ],
      'Press ENTER for the next level',
    );
  } else if (state.screen === 'win') {
    overlay(
      ctx,
      'VAULT EMPTIED',
      '#ffd34d',
      [
        'All three floors robbed clean. No guard ever laid a hand on you.',
        `Total time ${fmtTime(state.totalTime || 0)}   —   best ${fmtTime(ui.best)}`,
      ],
      'Press ENTER to steal it all again',
    );
  }
}
