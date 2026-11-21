// player.js — the thief: movement, sneaking, artifact pickup.
// Movement is axis-separated against solid tiles so the player slides
// along walls instead of stopping dead on a corner.

import { PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED, PICKUP_DISTANCE } from './config.js';
import { collides, isShadow } from './level.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.facing = 0; // radians; 0 = east
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0; // footstep pacing for the audio engine
    this.inShadow = false;
  }

  update(dt, input, level) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    this.sneaking = Boolean(input.sneak) && this.moving;

    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
      const nx = this.x + dx * speed * dt;
      const ny = this.y + dy * speed * dt;
      if (!collides(level, nx, this.y, PLAYER_RADIUS)) this.x = nx;
      if (!collides(level, this.x, ny, PLAYER_RADIUS)) this.y = ny;
      this.facing = Math.atan2(dy, dx);
      this.stepTimer += dt;
    }
    this.inShadow = isShadow(level, this.x, this.y);
  }

  // Collect any artifact within reach. Returns the artifact taken, or null.
  tryPickup(artifacts) {
    for (const a of artifacts) {
      if (!a.taken && Math.hypot(a.x - this.x, a.y - this.y) < PICKUP_DISTANCE + 6) {
        a.taken = true;
        return a;
      }
    }
    return null;
  }
}
