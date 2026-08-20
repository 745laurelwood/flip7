import { sounds as shared, seq } from '@laurelwood/card-class';

/**
 * The shared cue set plus the two moments that belong to Flip 7: the sinking
 * feeling of a bust, and the fanfare for a completed seven.
 */
export const sounds = {
  ...shared,
  flip: shared.throwCard,
  bust: () => seq([
    { freq: 320, dur: 0.14, type: 'sawtooth' as const, gain: 0.07 },
    { freq: 180, dur: 0.24, type: 'sawtooth' as const, gain: 0.07, delay: 0.10 },
  ]),
  flip7: shared.fanfare,
  freeze: () => seq([
    { freq: 1180, dur: 0.09, type: 'sine' as const, gain: 0.06 },
    { freq: 1560, dur: 0.16, type: 'sine' as const, gain: 0.05, delay: 0.06 },
  ]),
};

export { setMuted, isMuted } from '@laurelwood/card-class';
