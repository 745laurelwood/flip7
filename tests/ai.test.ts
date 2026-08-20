// The bots reason from public information only: the deck list and every
// face-up card. These tests pin the judgements that make them play sensibly.

import { describe, expect, it } from 'vitest';
import { INITIAL_STATE, makeEmptyPlayer } from '../gameReducer';
import { Flip7Card, GameState, Player } from '../types';
import { bustChance, chooseTarget, shouldHit } from '../utils/ai';

const num = (v: number, tag = ''): Flip7Card => ({ kind: 'number', value: v, id: `n${v}-${tag}` });

function withLines(lines: Flip7Card[][]): GameState {
  return {
    ...INITIAL_STATE,
    gamePhase: 'PLAYING',
    players: lines.map((line, i) => ({ ...makeEmptyPlayer(i, `P${i}`, i === 0), line })),
    deck: [],
    discard: [],
  };
}

const seat = (state: GameState, i: number): Player => state.players[i];

describe('reading the bust risk', () => {
  it('is zero on an empty line', () => {
    const s = withLines([[]]);
    expect(bustChance(s, seat(s, 0))).toBe(0);
  });

  it('is zero while a Second Chance is held', () => {
    const s = withLines([[num(12)]]);
    s.players[0] = { ...s.players[0], hasSecondChance: true };
    expect(bustChance(s, seat(s, 0))).toBe(0);
  });

  it('rates a 12 far more dangerous than a 1', () => {
    const twelve = withLines([[num(12)]]);
    const one = withLines([[num(1)]]);
    expect(bustChance(twelve, seat(twelve, 0))).toBeGreaterThan(bustChance(one, seat(one, 0)));
  });

  it('falls as copies of the dangerous number turn up elsewhere', () => {
    const before = withLines([[num(12, 'mine')]]);
    const after = withLines([
      [num(12, 'mine')],
      [num(12, 'a'), num(12, 'b'), num(12, 'c'), num(12, 'd')],
    ]);
    expect(bustChance(after, seat(after, 0))).toBeLessThan(bustChance(before, seat(before, 0)));
  });
});

describe('hitting or staying', () => {
  it('always hits on an empty line', () => {
    const s = withLines([[]]);
    expect(shouldHit(s, seat(s, 0))).toBe(true);
  });

  it('always hits while holding a Second Chance', () => {
    const s = withLines([[num(12), num(11), num(10), num(9)]]);
    s.players[0] = { ...s.players[0], hasSecondChance: true };
    expect(shouldHit(s, seat(s, 0))).toBe(true);
  });

  it('stays on a fat line that is likely to bust', () => {
    const s = withLines([[num(12), num(11), num(10), num(9), num(8)]]);
    expect(shouldHit(s, seat(s, 0))).toBe(false);
  });

  it('hits on a thin line that is unlikely to bust', () => {
    const s = withLines([[num(1)]]);
    expect(shouldHit(s, seat(s, 0))).toBe(true);
  });

  it('reaches for a Flip 7 when one card away', () => {
    // Six low uniques: the standing score is small and the bonus is large.
    const line = [0, 1, 2, 3, 4, 5].map(v => num(v));
    const s = withLines([line]);
    expect(shouldHit(s, seat(s, 0))).toBe(true);
  });
});

describe('aiming an action card', () => {
  it('freezes whoever is closest to a Flip 7', () => {
    const s = withLines([
      [num(3)],
      [1, 2, 4, 5, 6].map(v => num(v, 'b')),   // five uniques
      [num(9, 'c')],
    ]);
    expect(chooseTarget(s, 0, 'freeze')).toBe(1);
  });

  it('freezes the smallest line when nobody is close', () => {
    const s = withLines([[num(3)], [num(11, 'b'), num(10, 'b')], [num(2, 'c')]]);
    expect(chooseTarget(s, 0, 'freeze')).toBe(2);
  });

  it('points a Flip Three at whoever is most exposed', () => {
    const s = withLines([
      [num(1)],
      [num(12, 'b'), num(11, 'b'), num(10, 'b')],  // heavily exposed
      [],
    ]);
    expect(chooseTarget(s, 0, 'flipThree')).toBe(1);
  });

  it('takes a Flip Three itself when nobody is exposed', () => {
    const s = withLines([[], [], []]);
    expect(chooseTarget(s, 0, 'flipThree')).toBe(0);
  });

  it('keeps a Second Chance when it has none', () => {
    const s = withLines([[num(5)], [num(6, 'b')]]);
    expect(chooseTarget(s, 0, 'secondChance')).toBe(0);
  });

  it('passes a spare Second Chance to the player it helps least', () => {
    const s = withLines([[num(5)], [num(6, 'b')], [num(7, 'c')]]);
    s.players[0] = { ...s.players[0], hasSecondChance: true };
    s.players[1] = { ...s.players[1], total: 90 };
    s.players[2] = { ...s.players[2], total: 10 };
    expect(chooseTarget(s, 0, 'secondChance')).toBe(2);
  });

  it('has to use an action on itself when it is the last one in', () => {
    const s = withLines([[num(5)], []]);
    s.players[1] = { ...s.players[1], status: 'stayed' };
    expect(chooseTarget(s, 0, 'freeze')).toBe(0);
    expect(chooseTarget(s, 0, 'flipThree')).toBe(0);
  });
});
