/**
 * Synthesized retro sound effects using the Web Audio API.
 * No external audio files — everything is generated from oscillators and noise.
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;

  /** Lazily create AudioContext (must happen after user gesture). */
  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get muted(): boolean { return this._muted; }
  set muted(v: boolean) {
    this._muted = v;
    if (this.master) this.master.gain.value = v ? 0 : 0.35;
  }

  /* ---- helpers ---- */

  private osc(
    type: OscillatorType,
    freq: number,
    duration: number,
    gainVal = 0.3,
    detune = 0,
  ): { osc: OscillatorNode; gain: GainNode } {
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    g.gain.value = gainVal;
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.master!);
    o.start();
    o.stop(ctx.currentTime + duration);
    return { osc: o, gain: g };
  }

  private noise(duration: number, gainVal = 0.2): GainNode {
    const ctx = this.ensure();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    src.connect(g);
    g.connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + duration);
    return g;
  }

  /* ---- sound effects ---- */

  /** Building successfully placed */
  place(): void {
    const ctx = this.ensure();
    const { osc } = this.osc('square', 520, 0.1, 0.25);
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.08);
    this.osc('square', 260, 0.06, 0.15);
  }

  /** Invalid placement attempt */
  invalid(): void {
    const ctx = this.ensure();
    const { osc } = this.osc('sawtooth', 120, 0.2, 0.15);
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.2);
  }

  /** Build menu selection click */
  select(): void {
    this.osc('square', 880, 0.06, 0.15);
  }

  /** Deselect / cancel */
  deselect(): void {
    this.osc('square', 440, 0.06, 0.12);
  }

  /** Tax / gold collected (once per sim tick if income > 0) */
  coin(): void {
    const ctx = this.ensure();
    const { osc } = this.osc('sine', 1200, 0.1, 0.1);
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1800, ctx.currentTime + 0.06);
  }

  /** Combat hit */
  hit(): void {
    this.noise(0.08, 0.2);
    this.osc('square', 160, 0.08, 0.15);
  }

  /** Enemy killed */
  kill(): void {
    const ctx = this.ensure();
    const { osc } = this.osc('square', 400, 0.15, 0.2);
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.12);
    this.osc('sine', 600, 0.12, 0.1);
  }

  /** Barbarian warning alarm */
  warning(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(600, t);
    o.frequency.linearRampToValueAtTime(900, t + 0.15);
    o.frequency.linearRampToValueAtTime(600, t + 0.3);
    o.frequency.linearRampToValueAtTime(900, t + 0.45);
    g.gain.setValueAtTime(0.15, t);
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** New invasion wave starts */
  waveStart(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    // War horn
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    o.frequency.linearRampToValueAtTime(165, t + 0.3);
    o.frequency.linearRampToValueAtTime(110, t + 0.6);
    g.gain.setValueAtTime(0.2, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 0.6);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.6);
    // Drum
    this.noise(0.15, 0.25);
  }

  /** Tower fires an arrow */
  arrow(): void {
    const ctx = this.ensure();
    const { osc } = this.osc('sine', 1400, 0.08, 0.12);
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.08);
  }

  /** Building destroyed by invaders */
  destroy(): void {
    const ctx = this.ensure();
    this.noise(0.3, 0.3);
    const { osc } = this.osc('sawtooth', 200, 0.25, 0.15);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.25);
  }

  /** Player demolishes their own building */
  demolish(): void {
    const ctx = this.ensure();
    this.noise(0.15, 0.2);
    const { osc } = this.osc('square', 300, 0.15, 0.15);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
  }

  /** Game over — descending tones */
  gameOver(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const notes = [440, 392, 349, 262];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.2, t + i * 0.3);
      g.gain.linearRampToValueAtTime(0, t + i * 0.3 + 0.4);
      o.connect(g);
      g.connect(this.master!);
      o.start(t + i * 0.3);
      o.stop(t + i * 0.3 + 0.4);
    });
    // Final low rumble
    const { osc } = this.osc('sawtooth', 80, 0.8, 0.15);
    osc.frequency.setValueAtTime(80, t + 1.2);
    osc.frequency.linearRampToValueAtTime(40, t + 2.0);
  }
}

/** Singleton */
export const sound = new SoundManager();
