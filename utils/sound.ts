import { sounds as shared, seq, type Tone } from '@laurelwood/card-class';
import { MomentKind } from '../types';

/**
 * Flip 7's cue set, on top of the shared engine.
 *
 * Every one of these is a couple of oscillator tones, so the whole set costs
 * nothing to ship. The gains are deliberately low: a card lands every second
 * or so for a whole match, and anything loud enough to notice once is far too
 * loud by the fiftieth time.
 *
 * They are pitched to be told apart with the screen off. The three that
 * matter most sit in opposition — a bust falls, a save rises, a Freeze is
 * brittle and high — so you can hear which one happened.
 */
const cue = (tones: Tone[]) => () => seq(tones);

export const sounds = {
  ...shared,

  /** A card landing. The one heard constantly, so it is barely there. */
  flip: cue([
    { freq: 740, dur: 0.04, type: 'triangle', gain: 0.045 },
    { freq: 1180, dur: 0.05, type: 'triangle', gain: 0.028, delay: 0.028 },
  ]),

  /** Banking what you have. Two notes down: settled, not sorry. */
  stay: cue([
    { freq: 587, dur: 0.09, type: 'triangle', gain: 0.05 },
    { freq: 392, dur: 0.18, type: 'triangle', gain: 0.05, delay: 0.07 },
  ]),

  /** A duplicate. Falls away, then drops through the floor. */
  bust: cue([
    { freq: 300, dur: 0.10, type: 'sawtooth', gain: 0.05 },
    { freq: 190, dur: 0.14, type: 'sawtooth', gain: 0.045, delay: 0.07 },
    { freq: 110, dur: 0.28, type: 'sine', gain: 0.06, delay: 0.14 },
  ]),

  /** Ice: high and brittle, with a tail that hangs. */
  freeze: cue([
    { freq: 1568, dur: 0.06, type: 'sine', gain: 0.05 },
    { freq: 2093, dur: 0.05, type: 'sine', gain: 0.04, delay: 0.045 },
    { freq: 1319, dur: 0.26, type: 'sine', gain: 0.035, delay: 0.10 },
  ]),

  /** A Second Chance spent, heard as the opposite of the bust it prevented. */
  save: cue([
    { freq: 523, dur: 0.09, type: 'triangle', gain: 0.055 },
    { freq: 784, dur: 0.09, type: 'triangle', gain: 0.055, delay: 0.07 },
    { freq: 1046, dur: 0.22, type: 'triangle', gain: 0.05, delay: 0.14 },
  ]),

  /** Seven different numbers. The one moment in the game worth a fanfare. */
  flip7: cue([
    { freq: 523, dur: 0.10, type: 'triangle', gain: 0.06 },
    { freq: 659, dur: 0.10, type: 'triangle', gain: 0.06, delay: 0.08 },
    { freq: 784, dur: 0.10, type: 'triangle', gain: 0.06, delay: 0.16 },
    { freq: 1046, dur: 0.34, type: 'triangle', gain: 0.065, delay: 0.24 },
    { freq: 1568, dur: 0.34, type: 'sine', gain: 0.03, delay: 0.24 },
  ]),

  /** The round is done and the scores are in. Neutral: nobody has won yet. */
  roundOver: cue([
    { freq: 440, dur: 0.12, type: 'sine', gain: 0.045 },
    { freq: 660, dur: 0.22, type: 'sine', gain: 0.04, delay: 0.10 },
  ]),

  /** Somebody got there. */
  win: cue([
    { freq: 523, dur: 0.12, type: 'triangle', gain: 0.06 },
    { freq: 659, dur: 0.12, type: 'triangle', gain: 0.06, delay: 0.11 },
    { freq: 784, dur: 0.12, type: 'triangle', gain: 0.06, delay: 0.22 },
    { freq: 1046, dur: 0.16, type: 'triangle', gain: 0.065, delay: 0.33 },
    { freq: 1318, dur: 0.45, type: 'triangle', gain: 0.06, delay: 0.46 },
    { freq: 784, dur: 0.45, type: 'sine', gain: 0.03, delay: 0.46 },
  ]),
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
