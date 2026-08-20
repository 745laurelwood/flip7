// The round machine, driven off a stacked deck so every draw is known.

import { describe, expect, it } from 'vitest';
import { Action, gameReducer, INITIAL_STATE, makeEmptyPlayer } from '../gameReducer';
import { Flip7Card, GameState } from '../types';
import { FLIP_7_BONUS, WINNING_SCORE } from '../rules';

const num = (v: number, tag = ''): Flip7Card => ({ kind: 'number', value: v, id: `n${v}-${tag}` });
const mod = (m: any): Flip7Card => ({ kind: 'modifier', modifier: m, id: `m-${m}` });
const act = (a: any, tag = ''): Flip7Card => ({ kind: 'action', action: a, id: `a-${a}-${tag}` });

/** A table of `seats` players with a known draw pile on top. */
function table(seats: number, deck: Flip7Card[]): GameState {
  return {
    ...INITIAL_STATE,
    gamePhase: 'PLAYING',
    players: Array.from({ length: seats }, (_, i) => makeEmptyPlayer(i, `P${i}`, i === 0)),
    deck,
    discard: [],
    currentTurn: 0,
    firstPlayer: 0,
    roundNumber: 1,
  };
}

const run = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce(gameReducer, state);

const hit = (i: number): Action => ({ type: 'HIT', payload: { playerIndex: i } });
const stay = (i: number): Action => ({ type: 'STAY', payload: { playerIndex: i } });
const aim = (i: number, target: number): Action =>
  ({ type: 'AIM_ACTION', payload: { playerIndex: i, target } });
const flipStep = (): Action => ({ type: 'RESOLVE_FLIP_THREE' });

describe('hitting and staying', () => {
  it('passes the turn on after a plain number', () => {
    const state = gameReducer(table(3, [num(5), num(6)]), hit(0));
    expect(state.players[0].line).toHaveLength(1);
    expect(state.currentTurn).toBe(1);
  });

  it('only lets the seat whose turn it is act', () => {
    const t = table(3, [num(5)]);
    expect(gameReducer(t, hit(1))).toBe(t);
    expect(gameReducer(t, stay(2))).toBe(t);
  });

  it('takes a stayed seat out of the rotation but keeps its points', () => {
    const state = run(table(2, [num(9), num(3), num(4)]), hit(0), hit(1), stay(0));
    expect(state.players[0].status).toBe('stayed');
    expect(state.currentTurn).toBe(1);
  });

  it('ends the round once everyone has stayed', () => {
    const state = run(table(2, [num(9), num(3)]), stay(0), stay(1));
    expect(state.gamePhase).toBe('ROUND_OVER');
  });
});

describe('busting', () => {
  it('ends that seat\'s round with nothing', () => {
    const state = run(table(2, [num(5, 'a'), num(1), num(5, 'b')]), hit(0), hit(1), hit(0));
    expect(state.players[0].status).toBe('busted');
    expect(state.players[0].line.some(c => c.kind === 'number' && c.value === 5)).toBe(true);
  });

  it('scores zero however good the rest of the line was', () => {
    const state = run(
      table(2, [num(12, 'a'), num(1), mod('plus10'), num(2), num(12, 'b'), num(3)]),
      hit(0), hit(1), hit(0), hit(1), hit(0),
    );
    expect(state.players[0].status).toBe('busted');
    const ended = gameReducer({ ...state, players: state.players.map(p => ({ ...p, status: p.status === 'active' ? 'stayed' as const : p.status })) }, { type: 'END_ROUND' });
    expect(ended.players[0].lastRoundScore).toBe(0);
  });

  it('is survived once by a Second Chance, which is then spent', () => {
    const state = run(
      table(1, [act('secondChance'), num(7, 'a'), num(7, 'b'), num(2)]),
      hit(0), hit(0), hit(0),
    );
    expect(state.players[0].status).toBe('active');
    expect(state.players[0].hasSecondChance).toBe(false);
    // The duplicate never joins the line, and the used card leaves it.
    expect(state.players[0].line.filter(c => c.kind === 'number')).toHaveLength(1);
    expect(state.players[0].line.some(c => c.kind === 'action')).toBe(false);
    // Neither card is anywhere on the table afterwards, so the save is the
    // only record of what happened.
    expect(state.lastSave).toEqual({ playerIndex: 0, value: 7, seq: 1 });
  });

  it('counts each save, so a resent state does not read as a new one', () => {
    const start = table(1, [
      act('secondChance', '1'), num(7, 'a'), num(7, 'b'),
      act('secondChance', '2'), num(4, 'a'), num(4, 'b'),
    ]);
    expect(start.lastSave).toBeNull();

    const first = run(start, hit(0), hit(0), hit(0));
    expect(first.lastSave).toEqual({ playerIndex: 0, value: 7, seq: 1 });

    const second = run(first, hit(0), hit(0), hit(0));
    expect(second.lastSave).toEqual({ playerIndex: 0, value: 4, seq: 2 });
  });

  it('leaves the save alone when the next duplicate actually busts', () => {
    const saved = run(
      table(1, [act('secondChance'), num(7, 'a'), num(7, 'b'), num(4, 'a'), num(4, 'b')]),
      hit(0), hit(0), hit(0),
    );
    const busted = run(saved, hit(0), hit(0));
    expect(busted.players[0].status).toBe('busted');
    expect(busted.lastSave).toEqual(saved.lastSave);
  });

  it('busts on the next duplicate once the Second Chance is gone', () => {
    const state = run(
      table(1, [act('secondChance'), num(7, 'a'), num(7, 'b'), num(4, 'a'), num(4, 'b')]),
      hit(0), hit(0), hit(0), hit(0), hit(0),
    );
    expect(state.players[0].status).toBe('busted');
  });
});

describe('flipping seven', () => {
  it('ends the round for everyone the moment it lands', () => {
    const seven = [0, 1, 2, 3, 4, 5, 6].map((v, i) => num(v, String(i)));
    // One seat, so every hit is theirs.
    const state = run(table(1, seven), ...seven.map(() => hit(0)));
    expect(state.gamePhase).toBe('ROUND_OVER');
    expect(state.players[0].status).toBe('flipped7');
  });

  it('is worth the bonus on top of the numbers', () => {
    const seven = [0, 1, 2, 3, 4, 5, 6].map((v, i) => num(v, String(i)));
    const state = run(table(1, seven), ...seven.map(() => hit(0)));
    expect(state.players[0].lastRoundScore).toBe(21 + FLIP_7_BONUS);
  });

  it('cuts other seats off where they stand', () => {
    const seven = [0, 1, 2, 3, 4, 5, 6].map((v, i) => num(v, String(i)));
    // Seat 1 takes a 9 first, then seat 0 runs the seven out.
    const deck = [num(9), ...seven];
    let state = table(2, deck);
    state = gameReducer(state, hit(0));       // seat 0 draws 9
    state = gameReducer(state, stay(1));      // seat 1 stays on nothing
    // seat 0 now needs six more distinct numbers; 0..5 are next and 9 is held.
    for (let i = 0; i < 6; i++) state = gameReducer(state, hit(0));
    expect(state.players[0].status).toBe('flipped7');
    expect(state.gamePhase).toBe('ROUND_OVER');
  });
});

describe('action cards', () => {
  it('wait to be aimed before play moves on', () => {
    const state = gameReducer(table(3, [act('freeze')]), hit(0));
    expect(state.pendingAction).toEqual({ action: 'freeze', drawnBy: 0, cardId: 'a-freeze-' });
    expect(state.currentTurn).toBe(0);
  });

  it('land on the drawer with nobody else left, without asking', () => {
    const state = gameReducer(table(1, [act('freeze')]), hit(0));
    expect(state.pendingAction).toBeNull();
    expect(state.players[0].status).toBe('stayed');
  });

  it('cannot be aimed at someone already out of the round', () => {
    // Seat 0 takes a number, seat 1 stays, seat 2 turns up the Freeze.
    const t = run(table(3, [num(4), act('freeze')]), hit(0), stay(1), hit(2));
    expect(t.pendingAction?.drawnBy).toBe(2);
    expect(t.players[1].status).toBe('stayed');
    expect(gameReducer(t, aim(2, 1))).toBe(t);
  });

  it('cannot be aimed by anyone but the seat that drew it', () => {
    const t = gameReducer(table(3, [act('freeze')]), hit(0));
    expect(gameReducer(t, aim(1, 2))).toBe(t);
  });

  describe('freeze', () => {
    it('stays the target on the spot, banking what they had', () => {
      const state = run(table(3, [num(8), num(2), act('freeze')]), hit(0), hit(1), hit(2));
      const aimed = gameReducer(state, aim(2, 0));
      expect(aimed.players[0].status).toBe('stayed');
      expect(aimed.pendingAction).toBeNull();
    });
  });

  describe('flip three', () => {
    it('draws the target three cards, one at a time', () => {
      const state = gameReducer(table(2, [act('flipThree'), num(1), num(2), num(3)]), hit(0));
      const aimed = gameReducer(state, aim(0, 0));
      expect(aimed.flipThree).toEqual({ target: 0, remaining: 3, deferred: [] });

      let s = aimed;
      s = gameReducer(s, flipStep());
      expect(s.players[0].line).toHaveLength(1);
      s = gameReducer(s, flipStep());
      s = gameReducer(s, flipStep());
      expect(s.players[0].line).toHaveLength(3);
      // One more step finishes the run and hands the turn on.
      s = gameReducer(s, flipStep());
      expect(s.flipThree).toBeNull();
      expect(s.currentTurn).toBe(1);
    });

    it('stops where it stands when the target busts partway', () => {
      const state = gameReducer(
        table(2, [act('flipThree'), num(6, 'a'), num(6, 'b'), num(9)]),
        hit(0),
      );
      let s = gameReducer(state, aim(0, 0));
      s = gameReducer(s, flipStep());   // 6
      s = gameReducer(s, flipStep());   // second 6 → bust
      expect(s.players[0].status).toBe('busted');
      s = gameReducer(s, flipStep());   // run gives up
      expect(s.flipThree).toBeNull();
      // The third card was never drawn.
      expect(s.deck.some(c => c.kind === 'number' && c.value === 9)).toBe(true);
    });

    it('holds an action drawn mid-run until the run is finished', () => {
      const state = gameReducer(
        table(2, [act('flipThree'), num(1), act('freeze'), num(3)]),
        hit(0),
      );
      let s = gameReducer(state, aim(0, 0));
      s = gameReducer(s, flipStep());   // 1
      s = gameReducer(s, flipStep());   // freeze — deferred, not pending
      expect(s.pendingAction).toBeNull();
      expect(s.flipThree?.deferred).toHaveLength(1);
      s = gameReducer(s, flipStep());   // 3
      s = gameReducer(s, flipStep());   // run ends, deferred freeze comes up
      expect(s.pendingAction?.action).toBe('freeze');
      expect(s.pendingAction?.drawnBy).toBe(0);
    });
  });

  describe('second chance', () => {
    it('goes to the target and arms them', () => {
      const state = gameReducer(table(2, [act('secondChance')]), hit(0));
      const aimed = gameReducer(state, aim(0, 1));
      expect(aimed.players[1].hasSecondChance).toBe(true);
      expect(aimed.players[0].hasSecondChance).toBe(false);
    });

    it('is passed on rather than stacked when the target already holds one', () => {
      const state = run(
        table(2, [act('secondChance', 'a'), num(1), act('secondChance', 'b')]),
        hit(0),          // seat 0 draws one
      );
      const armed = gameReducer(state, aim(0, 0));
      expect(armed.players[0].hasSecondChance).toBe(true);
      const s = run(armed, hit(1), hit(0));
      // Seat 0 draws the second one and aims it at themselves; it should land
      // on seat 1 instead, since nobody holds two.
      const aimed = gameReducer(s, aim(0, 0));
      expect(aimed.players[0].line.filter(c => c.kind === 'action')).toHaveLength(1);
      expect(aimed.players[1].hasSecondChance).toBe(true);
    });

    it('is discarded when everyone already holds one', () => {
      let s = gameReducer(table(1, [act('secondChance', 'a'), act('secondChance', 'b')]), hit(0));
      expect(s.players[0].hasSecondChance).toBe(true);
      s = gameReducer(s, hit(0));
      expect(s.players[0].line.filter(c => c.kind === 'action')).toHaveLength(1);
      expect(s.discard.some(c => c.id === 'a-secondChance-b')).toBe(true);
    });
  });
});

describe('the match', () => {
  it('ends once someone is past the target at a round end', () => {
    const state = table(2, [num(5)]);
    const nearly: GameState = {
      ...state,
      players: state.players.map((p, i) => ({ ...p, total: i === 0 ? WINNING_SCORE - 3 : 10 })),
    };
    const ended = run(nearly, hit(0), stay(1), stay(0));
    expect(ended.players[0].total).toBe(WINNING_SCORE + 2);
    expect(ended.gamePhase).toBe('GAME_OVER');
  });

  it('keeps going while everyone is short', () => {
    const ended = run(table(2, [num(5)]), hit(0), stay(1), stay(0));
    expect(ended.gamePhase).toBe('ROUND_OVER');
  });

  it('passes the lead on each round', () => {
    const first = gameReducer({ ...INITIAL_STATE, players: [
      makeEmptyPlayer(0, 'A', true), makeEmptyPlayer(1, 'B', false), makeEmptyPlayer(2, 'C', false),
    ] }, { type: 'START_ROUND' });
    expect(first.firstPlayer).toBe(0);
    const second = gameReducer({ ...first, gamePhase: 'ROUND_OVER' }, { type: 'START_ROUND' });
    expect(second.firstPlayer).toBe(1);
    expect(second.currentTurn).toBe(1);
  });
});

describe('the lobby', () => {
  it('seats a bot in every chair nobody claimed', () => {
    const lobby = gameReducer(INITIAL_STATE, {
      type: 'INIT_LOBBY', payload: { isHost: true, roomId: 'ABCD', hostName: 'Host', seats: 4 },
    });
    // The host claims seat 0 the way hostRoom does, one more player joins,
    // and two chairs stay empty.
    const withHumans = gameReducer(lobby, {
      type: 'UPDATE_PLAYERS',
      payload: lobby.players.map((p, i) =>
        i === 0 ? { ...p, isHuman: true, peerId: 'ABCD' }
          : i === 1 ? { ...p, name: 'Rae', isHuman: true, peerId: 'x' }
            : p,
      ),
    });
    const dealt = gameReducer(withHumans, { type: 'START_ROUND' });

    expect(dealt.players).toHaveLength(4);
    expect(dealt.players.every(p => p.name !== 'Waiting...')).toBe(true);
    // Names stay distinct, so nobody is talking to their own double.
    expect(new Set(dealt.players.map(p => p.name)).size).toBe(4);
    expect(dealt.players.filter(p => p.isHuman)).toHaveLength(2);
  });

  it('resizes the table but never below the people already in it', () => {
    const lobby = gameReducer(INITIAL_STATE, {
      type: 'INIT_LOBBY', payload: { isHost: true, seats: 6 },
    });
    const withHumans = gameReducer(lobby, {
      type: 'UPDATE_PLAYERS',
      payload: lobby.players.map((p, i) => (i < 4 ? { ...p, name: `H${i}`, isHuman: true } : p)),
    });
    expect(gameReducer(withHumans, { type: 'SET_SEATS', payload: { seats: 8 } }).players).toHaveLength(8);
    // Four humans are seated, so it will not shrink to three.
    expect(gameReducer(withHumans, { type: 'SET_SEATS', payload: { seats: 3 } })).toBe(withHumans);
  });

  it('clamps the table to the legal range', () => {
    const big = gameReducer(INITIAL_STATE, { type: 'INIT_LOBBY', payload: { isHost: true, seats: 99 } });
    expect(big.players).toHaveLength(8);
    const small = gameReducer(INITIAL_STATE, { type: 'INIT_LOBBY', payload: { isHost: true, seats: 1 } });
    expect(small.players).toHaveLength(2);
  });
});
