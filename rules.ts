// rules.ts — Single source of truth for Flip 7's rules.

import { ActionKind, Flip7Card, ModifierKind, Player } from './types';

// ============================================================
// TABLE
// ============================================================

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const DEFAULT_PLAYERS = 4;

/** First past this at the end of a round wins. */
export const WINNING_SCORE = 200;

// ============================================================
// DECK — 94 cards
// ============================================================
// Numbers are self-weighting: there are N copies of card N, so the deck tells
// you how likely a duplicate is. The lone 0 is a free card, and the twelve 12s
// are the ones that bust people.

export const MAX_NUMBER = 12;

/** How many copies of each number the deck holds. One 0, one 1, two 2s, ... */
export const numberCardCount = (value: number): number => (value === 0 ? 1 : value);

export const ACTION_COUNTS: Record<ActionKind, number> = {
  freeze: 3,
  flipThree: 3,
  secondChance: 3,
};

/** One of each. `x2` doubles the number total; the rest are added after it. */
export const MODIFIERS: readonly ModifierKind[] = [
  'plus2', 'plus4', 'plus6', 'plus8', 'plus10', 'x2',
];

export const MODIFIER_VALUES: Record<ModifierKind, number> = {
  plus2: 2, plus4: 4, plus6: 6, plus8: 8, plus10: 10,
  x2: 0, // not additive — see scoreLine
};

// ============================================================
// FLIP 7
// ============================================================

/** Unique number cards that end the round on the spot. */
export const FLIP_7_COUNT = 7;
export const FLIP_7_BONUS = 15;

// ============================================================
// LABELS
// ============================================================

export const ACTION_LABELS: Record<ActionKind, string> = {
  freeze: 'Freeze',
  flipThree: 'Flip Three',
  secondChance: 'Second Chance',
};

export const MODIFIER_LABELS: Record<ModifierKind, string> = {
  plus2: '+2', plus4: '+4', plus6: '+6', plus8: '+8', plus10: '+10', x2: '×2',
};

export const cardLabel = (card: Flip7Card): string => {
  if (card.kind === 'number') return String(card.value);
  if (card.kind === 'modifier') return MODIFIER_LABELS[card.modifier];
  return ACTION_LABELS[card.action];
};

// ============================================================
// SCORING
// ============================================================

/** The number cards in a line, in the order they were drawn. */
export const numbersIn = (line: Flip7Card[]): number[] =>
  line.filter((c): c is Extract<Flip7Card, { kind: 'number' }> => c.kind === 'number')
    .map(c => c.value);

/** True once a line holds FLIP_7_COUNT distinct numbers. */
export const hasFlip7 = (line: Flip7Card[]): boolean =>
  new Set(numbersIn(line)).size >= FLIP_7_COUNT;

/**
 * What a line is worth at the end of a round.
 *
 * The x2 doubles the number total only. Additive modifiers land after it, and
 * the Flip 7 bonus after those — neither gets doubled.
 */
export const scoreLine = (line: Flip7Card[], opts: { busted: boolean }): number => {
  if (opts.busted) return 0;

  const numberTotal = numbersIn(line).reduce((sum, v) => sum + v, 0);
  const doubled = line.some(c => c.kind === 'modifier' && c.modifier === 'x2');
  const additive = line
    .filter((c): c is Extract<Flip7Card, { kind: 'modifier' }> => c.kind === 'modifier')
    .reduce((sum, c) => sum + MODIFIER_VALUES[c.modifier], 0);

  return numberTotal * (doubled ? 2 : 1) + additive + (hasFlip7(line) ? FLIP_7_BONUS : 0);
};

/** Score a player's line, respecting whether they busted out of the round. */
export const scorePlayer = (player: Player): number =>
  scoreLine(player.line, { busted: player.status === 'busted' });

// ============================================================
// HUMAN-READABLE SUMMARY
// ============================================================

export const RULES_SUMMARY = `
Flip 7 is a push-your-luck card game. First to ${WINNING_SCORE} points wins.

DECK (94 cards): number cards 0-12, where each number appears as many times as its value (twelve 12s, one 1) plus a single 0. Six modifiers: +2, +4, +6, +8, +10 and x2. Nine action cards: three each of Freeze, Flip Three and Second Chance.

TURN: on your turn, Hit to take one card, or Stay to bank what you have and sit the rest of the round out.

BUST: draw a number you already have and you are out of the round with nothing — unless you are holding a Second Chance, which is discarded along with the duplicate to keep you alive.

FLIP 7: get ${FLIP_7_COUNT} different numbers in front of you and the round ends immediately for everyone, with ${FLIP_7_BONUS} bonus points to you.

ACTION CARDS: when you draw one, you choose who it lands on — yourself or any other player still in the round. If you are the last one in, it lands on you.
  FREEZE: that player stays right now, banking whatever they have.
  FLIP THREE: that player draws three cards, one at a time. Busting stops the run.
  SECOND CHANCE: that player holds it against a duplicate. Nobody holds two; a spare goes to someone without one, or is discarded.

SCORING: add up your number cards. An x2 doubles that total. Then add the +N modifiers, and ${FLIP_7_BONUS} more if you flipped 7. Busting scores nothing at all.

ROUND END: when everyone has stayed or busted, or someone flips 7.

GAME END: at the end of the round in which anyone reaches ${WINNING_SCORE}, the highest score wins.
`.trim();
