// guards.js — guard AI: patrol waypoints, vision cones with line-of-sight
// raycasts, detection meter contributions, suspicious investigation and
// alarm chases. A guard is patrol / suspicious / chase; the shared
// detection meter (in game state) decides which.

import {
  CONE_RANGE,
  CONE_HALF_ANGLE,
  GUARD_RADIUS,
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  DETECT_BASE_RATE,
  DETECT_CLOSE_BOOST,
  DETECT_SNEAK_FACTOR,
  DETECT_SHADOW_FACTOR,
  SUSPICIOUS_AT,
  CATCH_DISTANCE,
} from './config.js';
import { blocksSight, isShadow, collides } from './level.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function moveToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Axis-separated sliding so guards glide along walls instead of sticking.
  if (!collides(level, nx, guard.y, GUARD_RADIUS)) guard.x = nx;
  if (!collides(level, guard.x, ny, GUARD_RADIUS)) guard.y = ny;
  guard.facing = Math.atan2(dy, dx);
  return dist <= step + 1;
}

export class Guard {
  constructor(x, y, waypoints) {
    this.x = x;
    this.y = y;
    this.waypoints = waypoints;
    this.wpIndex = 1 % waypoints.length;
    this.wpDir = 1;
    this.facing = 0; // radians; 0 = east
    this.state = 'patrol';
    this.lastSeen = null; // {x, y} of the player when last spotted
    this.scanTimer = 0;
    this.stepTimer = 0; // footstep sound pacing
  }

  // Line of sight: sample the segment in small steps; walls and crates block.
  hasLineOfSight(level, px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (blocksSight(level, this.x + dx * t, this.y + dy * t)) return false;
    }
    return true;
  }

  // Can this guard see the player right now? Returns the detection rate
  // (per second) the sighting contributes, or 0 when the player is unseen.
  seesPlayer(level, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE) return 0;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.facing)) > CONE_HALF_ANGLE) return 0;
    if (!this.hasLineOfSight(level, player.x, player.y)) return 0;
    let rate = DETECT_BASE_RATE * (1 - 0.55 * (dist / CONE_RANGE));
    if (dist < 70) rate *= DETECT_CLOSE_BOOST;
    if (player.sneaking) rate *= DETECT_SNEAK_FACTOR;
    if (isShadow(level, player.x, player.y)) rate *= DETECT_SHADOW_FACTOR;
    return rate;
  }

  update(dt, state) {
    const { level, player } = state;
    const seenRate = this.seesPlayer(level, player);
    if (seenRate > 0) this.lastSeen = { x: player.x, y: player.y };

    if (state.alarm) {
      this.state = 'chase';
      moveToward(this, player.x, player.y, GUARD_CHASE_SPEED, dt, level);
    } else if (state.detection >= SUSPICIOUS_AT && this.lastSeen) {
      this.state = 'suspicious';
      const arrived = moveToward(this, this.lastSeen.x, this.lastSeen.y, GUARD_SUSPICIOUS_SPEED, dt, level);
      if (arrived) {
        // Reached the last seen spot and found nothing: scan around.
        this.scanTimer += dt;
        this.facing += dt * 1.6;
        if (this.scanTimer > 2.2) {
          this.scanTimer = 0;
          this.lastSeen = null;
        }
      }
    } else {
      this.state = 'patrol';
      const target = this.waypoints[this.wpIndex];
      const arrived = moveToward(this, target.x, target.y, GUARD_PATROL_SPEED, dt, level);
      if (arrived) {
        // Ping-pong along the waypoint list.
        this.wpIndex += this.wpDir;
        if (this.wpIndex >= this.waypoints.length) {
          this.wpIndex = this.waypoints.length - 2;
          this.wpDir = -1;
        } else if (this.wpIndex < 0) {
          this.wpIndex = 1;
          this.wpDir = 1;
        }
        if (this.waypoints.length === 1) this.wpIndex = 0;
      }
    }

    // Footstep pacing for the audio engine: it reads stepTimer.
    this.stepTimer += dt;
    const pace = this.state === 'chase' ? 0.34 : this.state === 'suspicious' ? 0.42 : 0.55;
    if (this.stepTimer >= pace) this.stepTimer = 0;
    return seenRate;
  }

  // True when this guard has just caught the player.
  catches(player) {
    return Math.hypot(player.x - this.x, player.y - this.y) < CATCH_DISTANCE + GUARD_RADIUS * 0.4;
  }
}
