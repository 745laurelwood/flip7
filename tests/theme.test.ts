import { describe, expect, it } from 'vitest';
import { createDeck } from '../utils/deck';
import { ACTION_COUNTS, MAX_NUMBER, MODIFIERS } from '../rules';
import {
  ACTION_WORDS, MODIFIER_WORDS, NUMBER_PALETTE, NUMBER_WORDS, numberInk,
} from '../theme';
import { ActionKind } from '../types';

/**
 * The deck is the source of truth and the theme has to keep up with it: a
 * fourteenth number or a fourth action would otherwise render as a blank.
 */
describe('the deck all has faces', () => {
  const deck = createDeck();

  it('has a word and a colour for every number in the deck', () => {
    for (let value = 0; value <= MAX_NUMBER; value++) {
      expect(NUMBER_WORDS[value], `word for ${value}`).toBeTruthy();
      expect(NUMBER_PALETTE[value], `colour for ${value}`).toBeDefined();
    }
    expect(NUMBER_WORDS).toHaveLength(MAX_NUMBER + 1);
    expect(NUMBER_PALETTE).toHaveLength(MAX_NUMBER + 1);
  });

  it('has a word for every modifier and every action', () => {
    for (const modifier of MODIFIERS) {
      expect(MODIFIER_WORDS[modifier], `word for ${modifier}`).toBeTruthy();
    }
    for (const action of Object.keys(ACTION_COUNTS) as ActionKind[]) {
      expect(ACTION_WORDS[action]?.length, `word for ${action}`).toBeGreaterThan(0);
    }
  });

  it('gives every card in a real deck something to render', () => {
    for (const card of deck) {
      if (card.kind === 'number') {
        expect(NUMBER_WORDS[card.value]).toBeTruthy();
        expect(numberInk(card.value).hue).toMatch(/^\d+ \d+ \d+$/);
        expect(numberInk(card.value).ink).toMatch(/^\d+ \d+ \d+$/);
      } else if (card.kind === 'modifier') {
        expect(MODIFIER_WORDS[card.modifier]).toBeTruthy();
      } else {
        expect(ACTION_WORDS[card.action].length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to the last colour rather than nothing off the end', () => {
    expect(numberInk(MAX_NUMBER + 5)).toEqual(NUMBER_PALETTE[MAX_NUMBER]);
  });
});
