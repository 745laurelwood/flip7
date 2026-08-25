import { isMuted } from '@laurelwood/card-class';
import { MomentKind } from '../types';

/**
 * Flip 7's sound.
 *
 * The shared engine plays one bare oscillator per note into one gain. That is
 * enough for a chime, and it is why everything made out of it comes out
 * sounding like a test tone: no noise source, no filtering, no pitch movement
 * and nowhere for anything to decay into. A card landing is not a pitch at
 * all — it is a broadband transient, paper on felt — so no choice of
 * frequency was ever going to make it sound like one.
 *
 * So the cues are built here instead, out of four things the engine has none
 * of: filtered noise, gliding pitch, filter envelopes, and a small room.
 * Everything still runs through the package's mute.
 */

interface Rig {
  ctx: AudioContext;
  /** Everything lands here, through a limiter, so stacked cues do not clip. */
  master: GainNode;
  /** Reverb send. */
  room: GainNode;
  noise: AudioBuffer;
}

let rig: Rig | null = null;

/** Noise with an exponential tail: a small room, generated rather than loaded. */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay;
    }
  }
  return buf;
}

function whiteNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function audio(): Rig | null {
  if (isMuted()) return null;
  try {
    if (!rig) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();

      // A gentle limiter. Cues overlap constantly — a card lands while the
      // last one is still decaying — and without this the sum clips.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;
      limiter.connect(ctx.destination);

      const master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(limiter);

      const convolver = ctx.createConvolver();
      convolver.buffer = impulse(ctx, 0.7, 2.6);
      const room = ctx.createGain();
      room.gain.value = 0.5;
      room.connect(convolver).connect(master);

      rig = { ctx, master, room, noise: whiteNoise(ctx, 1) };
    }
    if (rig.ctx.state === 'suspended') void rig.ctx.resume();
    return rig;
  } catch {
    return null;
  }
}

interface Filter {
  type: BiquadFilterType;
  freq: number;
  /** Sweeps the cutoff across the life of the sound. */
  sweepTo?: number;
  q?: number;
}

interface Common {
  /** Seconds from now. */
  at?: number;
  dur: number;
  gain?: number;
  attack?: number;
  filter?: Filter;
  /** How much of it goes to the room, 0 to 1. */
  room?: number;
}

interface Voice extends Common {
  freq: number;
  /** Bends the pitch across the life of the sound. */
  glideTo?: number;
  type?: OscillatorType;
  detune?: number;
}

/**
 * An exponential attack and decay. Ramping up from near-silence rather than
 * from zero is what gives a transient its snap; a linear attack rounds it off
 * into a beep.
 */
function envelope(r: Rig, t0: number, dur: number, peak: number, attack: number): GainNode {
  const g = r.ctx.createGain();
  const top = Math.max(peak, 0.0002);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(top, t0 + Math.max(attack, 0.001));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  return g;
}

function biquad(r: Rig, f: Filter, t0: number, dur: number): BiquadFilterNode {
  const b = r.ctx.createBiquadFilter();
  b.type = f.type;
  b.frequency.setValueAtTime(f.freq, t0);
  if (f.sweepTo !== undefined) {
    b.frequency.exponentialRampToValueAtTime(Math.max(f.sweepTo, 20), t0 + dur);
  }
  if (f.q !== undefined) b.Q.setValueAtTime(f.q, t0);
  return b;
}

function route(r: Rig, out: GainNode, send: number): void {
  out.connect(r.master);
  if (send > 0) {
    const s = r.ctx.createGain();
    s.gain.value = send;
    out.connect(s).connect(r.room);
  }
}

/** One pitched voice. */
function voice(v: Voice): void {
  const r = audio();
  if (!r) return;
  try {
    const t0 = r.ctx.currentTime + (v.at ?? 0);
    const osc = r.ctx.createOscillator();
    osc.type = v.type ?? 'sine';
    osc.frequency.setValueAtTime(v.freq, t0);
    if (v.glideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(v.glideTo, 1), t0 + v.dur);
    }
    if (v.detune) osc.detune.setValueAtTime(v.detune, t0);

    const env = envelope(r, t0, v.dur, v.gain ?? 0.05, v.attack ?? 0.006);
    const head: AudioNode = v.filter ? osc.connect(biquad(r, v.filter, t0, v.dur)) : osc;
    head.connect(env);
    route(r, env, v.room ?? 0);

    osc.start(t0);
    osc.stop(t0 + v.dur + 0.06);
  } catch { /* an unsupported context is not worth crashing a game over */ }
}

/** One burst of shaped noise. The half of the palette the engine never had. */
function burst(b: Common): void {
  const r = audio();
  if (!r) return;
  try {
    const t0 = r.ctx.currentTime + (b.at ?? 0);
    const src = r.ctx.createBufferSource();
    src.buffer = r.noise;
    src.loop = true;

    const env = envelope(r, t0, b.dur, b.gain ?? 0.045, b.attack ?? 0.002);
    const head: AudioNode = b.filter ? src.connect(biquad(r, b.filter, t0, b.dur)) : src;
    head.connect(env);
    route(r, env, b.room ?? 0);

    // A different slice of the buffer each time, so repeats are not identical.
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + b.dur + 0.06);
  } catch { /* see above */ }
}

/** ±(spread) around 1, to keep the cue heard most often from going mechanical. */
const wobble = (spread: number): number => 1 + (Math.random() * 2 - 1) * spread;

export const sounds = {
  /**
   * A card landing. Heard about once a second for a whole match, so it is
   * quiet, short, and never twice the same: a band of noise for the card
   * itself and a low thump for it hitting the table.
   */
  flip: () => {
    burst({
      dur: 0.055 * wobble(0.15),
      gain: 0.05 * wobble(0.12),
      attack: 0.001,
      filter: { type: 'bandpass', freq: 2400 * wobble(0.18), q: 0.9 },
      room: 0.08,
    });
    voice({
      freq: 168 * wobble(0.1), glideTo: 118, type: 'sine',
      dur: 0.08, gain: 0.05, attack: 0.002,
    });
  },

  /** Banking. Two notes down, warm and rounded: settled, not sorry. */
  stay: () => {
    burst({ dur: 0.03, gain: 0.022, filter: { type: 'highpass', freq: 1900 } });
    voice({
      freq: 523, type: 'triangle', dur: 0.18, gain: 0.048, attack: 0.008,
      filter: { type: 'lowpass', freq: 2600 }, room: 0.2,
    });
    voice({
      freq: 349, type: 'triangle', dur: 0.34, gain: 0.052, attack: 0.012, at: 0.08,
      detune: -5, filter: { type: 'lowpass', freq: 1900 }, room: 0.26,
    });
  },

  /**
   * A duplicate. The pitch and the filter both fall away, which is what makes
   * it read as dropping rather than as two sad notes in a row.
   */
  bust: () => {
    burst({ dur: 0.11, gain: 0.05, filter: { type: 'lowpass', freq: 900, sweepTo: 200 } });
    voice({
      freq: 320, glideTo: 68, type: 'sawtooth', dur: 0.44, gain: 0.05, attack: 0.004,
      filter: { type: 'lowpass', freq: 1900, sweepTo: 240, q: 3.5 }, room: 0.2,
    });
    voice({ freq: 155, glideTo: 46, type: 'sine', dur: 0.52, gain: 0.055, attack: 0.006 });
  },

  /** Ice. High, detuned and brittle, over a hiss that thins out as it goes. */
  freeze: () => {
    burst({
      dur: 0.55, gain: 0.026, attack: 0.02,
      filter: { type: 'highpass', freq: 3800, sweepTo: 7500 }, room: 0.5,
    });
    [1568, 2093, 2637].forEach((freq, i) => {
      voice({
        freq, type: 'sine', dur: 0.6 - i * 0.09, gain: 0.036, attack: 0.003,
        at: i * 0.035, detune: i * 7, room: 0.42,
      });
    });
  },

  /** A Second Chance spent: bells going up, against the bust that falls. */
  save: () => {
    [523, 784, 1046].forEach((freq, i) => {
      voice({
        freq, type: 'triangle', dur: 0.45, gain: 0.048, attack: 0.004, at: i * 0.075,
        filter: { type: 'lowpass', freq: 4400 }, room: 0.32,
      });
      // A quiet octave on top, which is most of what makes a bell a bell.
      voice({ freq: freq * 2, type: 'sine', dur: 0.26, gain: 0.014, attack: 0.003, at: i * 0.075, room: 0.32 });
    });
  },

  /** Seven different numbers: a run up into a chord that hangs. */
  flip7: () => {
    [523, 659, 784].forEach((freq, i) => {
      voice({
        freq, type: 'triangle', dur: 0.24, gain: 0.048, attack: 0.004, at: i * 0.075,
        filter: { type: 'lowpass', freq: 5200 }, room: 0.25,
      });
    });
    [1046, 1319, 1568].forEach((freq, i) => {
      voice({
        freq, type: 'triangle', dur: 0.95, gain: 0.042, attack: 0.006, at: 0.24,
        detune: (i - 1) * 6, filter: { type: 'lowpass', freq: 6200 }, room: 0.48,
      });
    });
    burst({ at: 0.24, dur: 0.5, gain: 0.018, attack: 0.012, filter: { type: 'highpass', freq: 5200 }, room: 0.5 });
  },

  /** The round is done. Neutral, because nobody has won anything yet. */
  roundOver: () => {
    voice({
      freq: 392, type: 'sine', dur: 0.24, gain: 0.04, attack: 0.01,
      filter: { type: 'lowpass', freq: 2100 }, room: 0.28,
    });
    voice({
      freq: 523, type: 'sine', dur: 0.45, gain: 0.038, attack: 0.012, at: 0.1,
      filter: { type: 'lowpass', freq: 2300 }, room: 0.34,
    });
  },

  /** Somebody got there. The one cue allowed to take its time. */
  win: () => {
    [523, 659, 784, 1046].forEach((freq, i) => {
      voice({
        freq, type: 'triangle', dur: 0.22, gain: 0.048, attack: 0.004, at: i * 0.09,
        filter: { type: 'lowpass', freq: 5400 }, room: 0.25,
      });
    });
    [1046, 1319, 1568, 2093].forEach((freq, i) => {
      voice({
        freq, type: 'triangle', dur: 1.5, gain: 0.038, attack: 0.008, at: 0.42,
        detune: (i - 1.5) * 7, filter: { type: 'lowpass', freq: 6800 }, room: 0.55,
      });
    });
    burst({ at: 0.42, dur: 0.9, gain: 0.02, attack: 0.02, filter: { type: 'highpass', freq: 4600 }, room: 0.55 });
  },

  /** Somebody said something. Small, and out of the way. */
  chat: () => {
    voice({
      freq: 784, type: 'sine', dur: 0.1, gain: 0.032, attack: 0.004,
      filter: { type: 'lowpass', freq: 3200 }, room: 0.2,
    });
    voice({
      freq: 1046, type: 'sine', dur: 0.2, gain: 0.03, attack: 0.004, at: 0.07,
      filter: { type: 'lowpass', freq: 3600 }, room: 0.26,
    });
  },
};

/** The cue for each moment the reducer records. */
export const MOMENT_CUES: Record<MomentKind, () => void> = {
  save: sounds.save,
  freeze: sounds.freeze,
  bust: sounds.bust,
  flip7: sounds.flip7,
  stay: sounds.stay,
};

export { setMuted, isMuted } from '@laurelwood/card-class';
