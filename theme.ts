// theme.ts — What the deck looks like.
//
// The printed deck spells every number out in English under the numeral, puts
// the modifiers on an orange ground, and gives each action card a solid colour
// with an icon on it. All of that is copied here.
//
// The one thing we add is a colour per number. On cardboard every number card
// looks the same, because the deck itself tells you the odds: there is one 1
// and there are twelve 12s, so a 12 is the card most likely to come back and
// bust you. On a screen that information is invisible, so the numbers run cool
// to hot — a calm slate 0 through to a hot magenta 12 — and the colour of a
// line is a read on how exposed it is.

import { ActionKind, ModifierKind } from './types';

/** Spelled out under the numeral, exactly as the card does. */
export const NUMBER_WORDS: readonly string[] = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

export interface NumberInk {
  /** Border, index and word band. Space-separated RGB, for `rgb(... / a)`. */
  hue: string;
  /** The numeral itself — the same colour taken most of the way to black. */
  ink: string;
}

/** Indexed by the number on the card, 0 through 12. */
export const NUMBER_PALETTE: readonly NumberInk[] = [
  { hue: '91 124 138',  ink: '43 69 80'  }, //  0 — slate, the free card
  { hue: '47 143 150',  ink: '16 68 74'  }, //  1
  { hue: '42 148 131',  ink: '15 71 64'  }, //  2
  { hue: '56 153 94',   ink: '21 74 44'  }, //  3
  { hue: '91 155 52',   ink: '40 72 26'  }, //  4
  { hue: '116 140 28',  ink: '54 65 14'  }, //  5
  { hue: '146 130 24',  ink: '68 60 10'  }, //  6
  { hue: '192 125 23',  ink: '87 55 8'   }, //  7
  { hue: '207 102 27',  ink: '92 43 9'   }, //  8
  { hue: '209 80 42',   ink: '92 32 16'  }, //  9
  { hue: '205 59 62',   ink: '90 22 24'  }, // 10
  { hue: '191 47 95',   ink: '84 18 42'  }, // 11
  { hue: '166 45 125',  ink: '73 15 54'  }, // 12 — twelve of them out there
];

export const numberInk = (value: number): NumberInk =>
  NUMBER_PALETTE[value] ?? NUMBER_PALETTE[NUMBER_PALETTE.length - 1];

/** The small word under a modifier. `x2` is the one worth shouting about. */
export const MODIFIER_WORDS: Record<ModifierKind, string> = {
  plus2: 'bonus', plus4: 'bonus', plus6: 'bonus',
  plus8: 'bonus', plus10: 'bonus', x2: 'double',
};

/**
 * Action names, pre-split onto the lines they are drawn on. A card is about a
 * thumbnail wide, so the name has to stack rather than shrink to fit.
 */
export const ACTION_WORDS: Record<ActionKind, readonly string[]> = {
  freeze: ['freeze'],
  flipThree: ['flip', 'three'],
  secondChance: ['second', 'chance'],
};
