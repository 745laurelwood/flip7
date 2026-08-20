import { ActionKind, Flip7Card } from '../types';
import { ACTION_COUNTS, MAX_NUMBER, MODIFIERS, numberCardCount } from '../rules';

/** The full 94-card deck, unshuffled. */
export const createDeck = (): Flip7Card[] => {
  const deck: Flip7Card[] = [];

  for (let value = 0; value <= MAX_NUMBER; value++) {
    for (let copy = 0; copy < numberCardCount(value); copy++) {
      deck.push({ kind: 'number', value, id: `n${value}-${copy}` });
    }
  }

  for (const modifier of MODIFIERS) {
    deck.push({ kind: 'modifier', modifier, id: `m-${modifier}` });
  }

  for (const action of Object.keys(ACTION_COUNTS) as ActionKind[]) {
    for (let copy = 0; copy < ACTION_COUNTS[action]; copy++) {
      deck.push({ kind: 'action', action, id: `a-${action}-${copy}` });
    }
  }

  return deck;
};

export const shuffle = <T,>(cards: T[]): T[] => {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export interface DrawResult {
  card: Flip7Card | null;
  deck: Flip7Card[];
  discard: Flip7Card[];
}

/**
 * Takes the top card, reshuffling the discard pile back into the deck when it
 * runs dry. Cards already face up in front of players stay where they are, so
 * a long round can genuinely exhaust both piles — hence the null.
 */
export const drawCard = (deck: Flip7Card[], discard: Flip7Card[]): DrawResult => {
  if (deck.length > 0) {
    return { card: deck[0], deck: deck.slice(1), discard };
  }
  if (discard.length === 0) {
    return { card: null, deck, discard };
  }
  const refilled = shuffle(discard);
  return { card: refilled[0], deck: refilled.slice(1), discard: [] };
};
