// The draw pile is the only thing in Flip 7 that anyone is not entitled to
// see, so it is the only thing the host redacts.

import { describe, expect, it } from 'vitest';
import { INITIAL_STATE, makeEmptyPlayer } from '../gameReducer';
import { GameState } from '../types';
import { createDeck, shuffle } from '../utils/deck';
import { isRedacted, redactForWire, roomTopic } from '../utils/net';

const table = (): GameState => ({
  ...INITIAL_STATE,
  gamePhase: 'PLAYING',
  players: [makeEmptyPlayer(0, 'A', true), makeEmptyPlayer(1, 'B', false)],
  deck: shuffle(createDeck()),
  discard: [],
});

describe('redacting for the wire', () => {
  it('keeps the pile size so the table still shows a count', () => {
    const s = table();
    expect(redactForWire(s).deck).toHaveLength(s.deck.length);
  });

  it('gives away nothing about what is coming', () => {
    const s = table();
    const wire = redactForWire(s);
    const realIds = new Set(s.deck.map(c => c.id));
    expect(wire.deck.some(c => realIds.has(c.id))).toBe(false);
    expect(isRedacted(wire)).toBe(true);
    expect(isRedacted(s)).toBe(false);
  });

  it('leaves everything face up exactly as it was', () => {
    const s = table();
    s.players[0] = { ...s.players[0], line: [{ kind: 'number', value: 9, id: 'n9-x' }], total: 40 };
    s.discard = [{ kind: 'action', action: 'freeze', id: 'a-freeze-0' }];
    const wire = redactForWire(s);
    expect(wire.players).toEqual(s.players);
    expect(wire.discard).toEqual(s.discard);
    expect(wire.currentTurn).toBe(s.currentTurn);
  });
});

describe('room topics', () => {
  it('are namespaced per game so two games cannot share a room code', () => {
    expect(roomTopic('ABCD')).toBe('flip7_game_ABCD');
  });
});
