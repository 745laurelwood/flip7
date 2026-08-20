import { describe, expect, it } from 'vitest';
import { createDeck } from '../utils/deck';
import {
  ACTION_COUNTS, FLIP_7_BONUS, MAX_NUMBER, MODIFIERS, numberCardCount,
  hasFlip7, numbersIn, scoreLine,
} from '../rules';
import { Flip7Card } from '../types';

const num = (v: number, tag = ''): Flip7Card => ({ kind: 'number', value: v, id: `n${v}${tag}` });
const mod = (m: any): Flip7Card => ({ kind: 'modifier', modifier: m, id: `m-${m}` });
const act = (a: any): Flip7Card => ({ kind: 'action', action: a, id: `a-${a}` });

describe('the deck', () => {
  const deck = createDeck();

  it('holds 94 cards', () => {
    expect(deck).toHaveLength(94);
  });

  it('holds N copies of card N, one 0 and one 1', () => {
    const numbers = deck.filter(c => c.kind === 'number');
    expect(numbers).toHaveLength(79);
    for (let v = 0; v <= MAX_NUMBER; v++) {
      const copies = numbers.filter(c => c.kind === 'number' && c.value === v);
      expect(copies).toHaveLength(numberCardCount(v));
    }
  });

  it('holds three of each action and one of each modifier', () => {
    const actions = deck.filter(c => c.kind === 'action');
    expect(actions).toHaveLength(9);
    for (const [kind, count] of Object.entries(ACTION_COUNTS)) {
      expect(actions.filter(c => c.kind === 'action' && c.action === kind)).toHaveLength(count);
    }
    const mods = deck.filter(c => c.kind === 'modifier');
    expect(mods).toHaveLength(MODIFIERS.length);
    expect(new Set(mods.map(c => c.kind === 'modifier' && c.modifier)).size).toBe(MODIFIERS.length);
  });

  it('gives every card a distinct id', () => {
    expect(new Set(deck.map(c => c.id)).size).toBe(deck.length);
  });
});

describe('scoring a line', () => {
  it('adds the number cards', () => {
    expect(scoreLine([num(3), num(4), num(12)], { busted: false })).toBe(19);
  });

  it('scores nothing at all when busted, however good the line looked', () => {
    expect(scoreLine([num(12), num(11), mod('plus10'), mod('x2')], { busted: true })).toBe(0);
  });

  it('doubles only the number total, then adds the modifiers', () => {
    // The published example: 3 + 4 + 12 = 19, x2 = 38, +10 = 48.
    expect(scoreLine([num(3), num(4), num(12), mod('x2'), mod('plus10')], { busted: false })).toBe(48);
  });

  it('does not double the Flip 7 bonus', () => {
    const seven = [0, 1, 2, 3, 4, 5, 6].map(v => num(v));
    const total = 0 + 1 + 2 + 3 + 4 + 5 + 6;
    expect(scoreLine(seven, { busted: false })).toBe(total + FLIP_7_BONUS);
    expect(scoreLine([...seven, mod('x2')], { busted: false })).toBe(total * 2 + FLIP_7_BONUS);
  });

  it('ignores action cards sitting in the line', () => {
    expect(scoreLine([num(5), act('secondChance')], { busted: false })).toBe(5);
  });

  it('adds several modifiers together', () => {
    expect(scoreLine([num(10), mod('plus2'), mod('plus8')], { busted: false })).toBe(20);
  });
});

describe('flip 7', () => {
  it('needs seven distinct numbers', () => {
    expect(hasFlip7([0, 1, 2, 3, 4, 5].map(v => num(v)))).toBe(false);
    expect(hasFlip7([0, 1, 2, 3, 4, 5, 6].map(v => num(v)))).toBe(true);
  });

  it('does not count modifiers or actions towards the seven', () => {
    const line = [...[1, 2, 3, 4, 5, 6].map(v => num(v)), mod('plus4'), act('secondChance')];
    expect(hasFlip7(line)).toBe(false);
    expect(numbersIn(line)).toHaveLength(6);
  });
});
