// input.js — keyboard (WASD / arrows, Shift sneak, P/Esc pause, M mute)
// plus mouse position and clicks. Keys are tracked as a live set so the
// game loop reads held state every frame instead of one-shot events.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this.pressed = new Set(); // keys pressed since the last frame was read
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', () => {
      this.mouse.clicked = true;
    });
  }

  get up() {
    return this.keys.has('w') || this.keys.has('arrowup');
  }
  get down() {
    return this.keys.has('s') || this.keys.has('arrowdown');
  }
  get left() {
    return this.keys.has('a') || this.keys.has('arrowleft');
  }
  get right() {
    return this.keys.has('d') || this.keys.has('arrowright');
  }
  get sneak() {
    return this.keys.has('shift');
  }

  // True once per physical press; the game loop clears it each frame.
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
