// audio.js — all sound is synthesized with WebAudio: no audio files.
// Footsteps tell the player where a guard is (volume falls with distance),
// the alarm stings when the meter fills, pickups chime, winning jingles.
// M toggles mute. The context is created lazily on the first user gesture
// so browsers never block it.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    // One second of white noise, reused for every footstep tick.
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short filtered-noise tick: `volume` 0..1, `low` for heavier steps.
  tick(volume, low) {
    if (!this.ctx || this.muted || volume <= 0.01) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low ? 320 : 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t, Math.random() * 0.5, 0.1);
    src.stop(t + 0.12);
  }

  // The player's own step: soft, always the same volume.
  playerStep(sneaking) {
    this.tick(sneaking ? 0.05 : 0.12, false);
  }

  // A guard's step: volume falls with distance so you can hear how near
  // a guard is without seeing them.
  guardStep(distance) {
    const volume = Math.max(0, 0.55 * (1 - distance / 520));
    this.tick(volume, true);
  }

  // A pure tone with a quick attack and decay.
  tone(freq, dur, volume, when = 0, type = 'sine') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Two-tone alarm sting when the detection meter fills.
  alarm() {
    this.tone(660, 0.16, 0.22, 0, 'square');
    this.tone(440, 0.16, 0.22, 0.16, 'square');
    this.tone(660, 0.22, 0.22, 0.32, 'square');
  }

  // Rising chime when an artifact is pocketed.
  pickup() {
    this.tone(880, 0.12, 0.18);
    this.tone(1318, 0.18, 0.18, 0.09);
  }

  // A short jingle for clearing a level, longer for winning the vault.
  jingle(win) {
    const notes = win ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    notes.forEach((f, i) => this.tone(f, 0.22, 0.18, i * 0.11, 'triangle'));
  }

  // A low thud when a guard spots you hard (meter crossing suspicious).
  spotted() {
    this.tone(180, 0.18, 0.2, 0, 'sawtooth');
  }
}
