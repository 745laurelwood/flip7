import { sounds as shared, seq } from '@laurelwood/card-class';
import { MomentKind } from '../types';

/**
 * The shared cue set plus the moments that belong to Flip 7: the sinking
 * feeling of a bust, the fanfare for a completed seven, and the rising three
 * notes of a Second Chance spent, which has to be heard as the opposite of
 * the bust it just prevented.
 */
export const sounds = {
  ...shared,
  flip: shared.throwCard,
  bust: () => seq([
    { freq: 320, dur: 0.14, type: 'sawtooth' as const, gain: 0.07 },
    { freq: 180, dur: 0.24, type: 'sawtooth' as const, gain: 0.07, delay: 0.10 },
  ]),
  flip7: shared.fanfare,
  save: () => seq([
    { freq: 520, dur: 0.10, type: 'triangle' as const, gain: 0.06 },
    { freq: 784, dur: 0.10, type: 'triangle' as const, gain: 0.06, delay: 0.07 },
    { freq: 1046, dur: 0.22, type: 'triangle' as const, gain: 0.055, delay: 0.14 },
  ]),
  freeze: () => seq([
    { freq: 1180, dur: 0.09, type: 'sine' as const, gain: 0.06 },
    { freq: 1560, dur: 0.16, type: 'sine' as const, gain: 0.05, delay: 0.06 },
  ]),
};

/** The cue for each moment the reducer records. */
export const MOMENT_CUES: Record<MomentKind, () => void> = {
  save: sounds.save,
  bust: sounds.bust,
  flip7: sounds.flip7,
};

export { setMuted, isMuted } from '@laurelwood/card-class';
