import {
  ActionCard, ActionKind, ChatMessage, Flip7Card, GameState, PendingAction,
  Player, Spectator,
} from './types';
import { createDeck, drawCard, shuffle } from './utils/deck';
import { EMPTY_SLOT_NAME, MAX_LOG_ENTRIES, CHAT_MAX_HISTORY, pickBotNames } from './constants';
import {
  ACTION_LABELS, DEFAULT_PLAYERS, FLIP_7_BONUS, MAX_PLAYERS, MIN_PLAYERS,
  MODIFIER_LABELS, WINNING_SCORE, hasFlip7, scorePlayer,
} from './rules';

export type Action =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'INIT_LOBBY'; payload: { isHost: boolean; roomId?: string; hostName?: string; seats?: number } }
  | { type: 'SET_SEATS'; payload: { seats: number } }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SET_PLAYER_OFFLINE'; payload: { peerId: string } }
  | { type: 'START_GAME'; payload: { playerName: string; numPlayers: number } }
  | { type: 'START_ROUND' }
  | { type: 'HIT'; payload: { playerIndex: number } }
  | { type: 'STAY'; payload: { playerIndex: number } }
  | { type: 'AIM_ACTION'; payload: { playerIndex: number; target: number } }
  | { type: 'RESOLVE_FLIP_THREE' }
  | { type: 'END_ROUND' }
  | { type: 'RETURN_TO_LOBBY'; payload: { playerIndex: number } }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SEND_CHAT'; payload: ChatMessage }
  | { type: 'ADD_SPECTATOR'; payload: Spectator }
  | { type: 'REMOVE_SPECTATOR'; payload: { peerId: string } };

export const INITIAL_STATE: GameState = {
  gamePhase: 'LOBBY',
  players: [],
  deck: [],
  discard: [],
  currentTurn: 0,
  firstPlayer: 0,
  roundNumber: 0,
  pendingAction: null,
  flipThree: null,
  flipped7By: -1,
  lastSave: null,
  gameLog: [],
  chatLog: [],
  spectators: [],
};

export function makeEmptyPlayer(id: number, name: string, isHuman: boolean, peerId?: string): Player {
  return {
    id, name, isHuman, peerId,
    line: [],
    status: 'active',
    hasSecondChance: false,
    total: 0,
    lastRoundScore: 0,
    isOnline: true,
  };
}

export const isValidGameState = (s: any): s is GameState =>
  !!s && typeof s === 'object' && Array.isArray(s.players) && !!s.gamePhase;

const logPush = (log: string[], entry: string): string[] =>
  [...log, entry].slice(-MAX_LOG_ENTRIES);

const clampSeats = (n: number): number =>
  Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.round(n)));

/** Seats a bot in every chair nobody claimed. */
function fillEmptySeats(players: Player[]): Player[] {
  const empties = players.filter(p => !p.isHuman && p.name === EMPTY_SLOT_NAME).length;
  if (empties === 0) return players;
  const taken = players.filter(p => p.name !== EMPTY_SLOT_NAME).map(p => p.name);
  const names = pickBotNames(empties, taken);
  let next = 0;
  return players.map(p =>
    !p.isHuman && p.name === EMPTY_SLOT_NAME
      ? { ...p, name: names[next++] ?? `Bot ${p.id + 1}` }
      : p,
  );
}

// ============================================================
// Turn helpers
// ============================================================

const isInRound = (p: Player): boolean => p.status === 'active';

/** Next seat still choosing, starting after `from`. -1 when nobody is left. */
function nextActive(players: Player[], from: number): number {
  for (let step = 1; step <= players.length; step++) {
    const i = (from + step) % players.length;
    if (isInRound(players[i])) return i;
  }
  return -1;
}

/** A round is over once nobody is still choosing, or someone flipped seven. */
const roundIsOver = (state: GameState): boolean =>
  state.flipped7By >= 0 || !state.players.some(isInRound);

export const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return isValidGameState(action.payload)
        ? {
            ...action.payload,
            chatLog: action.payload.chatLog ?? [],
            lastSave: action.payload.lastSave ?? null,
          }
        : state;

    case 'INIT_LOBBY': {
      const seats = clampSeats(action.payload.seats ?? DEFAULT_PLAYERS);
      return {
        ...INITIAL_STATE,
        gamePhase: 'LOBBY',
        roomId: action.payload.roomId,
        players: Array.from({ length: seats }, (_, i) =>
          makeEmptyPlayer(i, i === 0 ? (action.payload.hostName || 'You (Host)') : EMPTY_SLOT_NAME, false)
        ),
      };
    }

    case 'SET_SEATS': {
      if (state.gamePhase !== 'LOBBY') return state;
      const seats = clampSeats(action.payload.seats);
      const seated = state.players.filter(p => p.isHuman).length;
      // Never shrink past the people already in the room.
      if (seats < seated) return state;
      const players = Array.from({ length: seats }, (_, i) =>
        state.players[i] ?? makeEmptyPlayer(i, EMPTY_SLOT_NAME, false),
      );
      return { ...state, players };
    }

    case 'START_GAME': {
      const { playerName, numPlayers } = action.payload;
      const botNames = pickBotNames(numPlayers - 1, [playerName]);
      return {
        ...INITIAL_STATE,
        gamePhase: 'LOBBY',
        players: [
          makeEmptyPlayer(0, playerName, true),
          ...botNames.map((n, i) => makeEmptyPlayer(i + 1, n, false)),
        ],
      };
    }

    case 'UPDATE_PLAYERS':
      return { ...state, players: action.payload };

    case 'SET_PLAYER_OFFLINE': {
      const idx = state.players.findIndex(p => p.peerId === action.payload.peerId);
      if (idx === -1) return state;
      const np = [...state.players];
      np[idx] = { ...np[idx], isOnline: false };
      return { ...state, players: np };
    }

    case 'START_ROUND': {
      const isFirstRound = state.gamePhase === 'LOBBY';
      const roundNumber = state.roundNumber + 1;

      // Anyone who never turned up gets a bot in their chair, named so it
      // cannot collide with a human already at the table.
      const seated = isFirstRound ? fillEmptySeats(state.players) : state.players;
      // The lead passes on by one each round so nobody keeps the advantage of
      // drawing into an empty discard pile first.
      const firstPlayer = isFirstRound ? 0 : (state.firstPlayer + 1) % state.players.length;

      const players = seated.map(p => ({
        ...p,
        line: [],
        status: 'active' as const,
        hasSecondChance: false,
        lastRoundScore: 0,
      }));

      return {
        ...state,
        gamePhase: 'PLAYING',
        players,
        // Everything that was face up goes back before the shuffle.
        deck: shuffle(createDeck()),
        discard: [],
        currentTurn: firstPlayer,
        firstPlayer,
        roundNumber,
        pendingAction: null,
        flipThree: null,
        flipped7By: -1,
        gameLog: [`Round ${roundNumber} — ${players[firstPlayer].name} goes first`],
      };
    }

    case 'STAY': {
      const { playerIndex } = action.payload;
      if (state.gamePhase !== 'PLAYING') return state;
      if (state.currentTurn !== playerIndex) return state;
      if (state.pendingAction || state.flipThree) return state;
      const player = state.players[playerIndex];
      if (!player || !isInRound(player)) return state;

      const stayed = withStatus(state, playerIndex, 'stayed');
      return advance(
        {
          ...stayed,
          gameLog: logPush(state.gameLog, `${player.name} stays on ${scorePlayer(stayed.players[playerIndex])}`),
        },
        playerIndex,
      );
    }

    case 'HIT': {
      const { playerIndex } = action.payload;
      if (state.gamePhase !== 'PLAYING') return state;
      if (state.currentTurn !== playerIndex) return state;
      if (state.pendingAction || state.flipThree) return state;
      const player = state.players[playerIndex];
      if (!player || !isInRound(player)) return state;

      const drawn = dealTo(state, playerIndex);
      // A drawn action card stops play until it is aimed; a Flip Three run
      // takes over the turn entirely. Otherwise the turn passes on.
      if (drawn.pendingAction || drawn.flipThree) return drawn;
      return advance(drawn, playerIndex);
    }

    case 'AIM_ACTION': {
      const { playerIndex, target } = action.payload;
      if (state.gamePhase !== 'PLAYING') return state;
      const pending = state.pendingAction;
      if (!pending || pending.drawnBy !== playerIndex) return state;
      const targetPlayer = state.players[target];
      if (!targetPlayer || !isInRound(targetPlayer)) return state;

      return resolveAction(state, pending, target);
    }

    case 'RESOLVE_FLIP_THREE': {
      if (state.gamePhase !== 'PLAYING') return state;
      const run = state.flipThree;
      if (!run) return state;

      const target = state.players[run.target];
      // Busting stops the run where it stands.
      if (!target || !isInRound(target) || run.remaining <= 0) {
        return finishFlipThree(state);
      }

      const next = dealTo({ ...state, flipThree: { ...run, remaining: run.remaining - 1 } }, run.target);
      // Cards drawn mid-run wait: the run finishes first.
      return next;
    }

    case 'END_ROUND':
      return endRound(state);

    case 'RETURN_TO_LOBBY': {
      if (state.gamePhase !== 'GAME_OVER') return state;
      const { playerIndex } = action.payload;
      const ready = new Set(state.readyForLobbyIndices || []);
      ready.add(playerIndex);
      const humans = state.players.filter(p => p.isHuman);
      if (!humans.every(p => ready.has(p.id))) {
        return { ...state, readyForLobbyIndices: Array.from(ready) };
      }
      return {
        ...INITIAL_STATE,
        gamePhase: 'LOBBY',
        roomId: state.roomId,
        players: state.players.map(p => ({
          ...p, line: [], status: 'active' as const,
          hasSecondChance: false, total: 0, lastRoundScore: 0,
        })),
      };
    }

    case 'ADD_LOG':
      return { ...state, gameLog: logPush(state.gameLog, action.payload) };

    case 'SEND_CHAT':
      return {
        ...state,
        chatLog: [...(state.chatLog ?? []), action.payload].slice(-CHAT_MAX_HISTORY),
      };

    case 'ADD_SPECTATOR': {
      const list = state.spectators ?? [];
      if (list.some(sp => sp.peerId === action.payload.peerId)) return state;
      return { ...state, spectators: [...list, action.payload] };
    }

    case 'REMOVE_SPECTATOR': {
      const list = state.spectators ?? [];
      return { ...state, spectators: list.filter(sp => sp.peerId !== action.payload.peerId) };
    }

    default:
      return state;
  }
};

// ============================================================
// Helpers
// ============================================================

function withStatus(state: GameState, index: number, status: Player['status']): GameState {
  const players = [...state.players];
  players[index] = { ...players[index], status };
  return { ...state, players };
}

/**
 * Moves the turn on, or ends the round if there is nobody left to move it to.
 * `from` is the seat that just acted.
 */
function advance(state: GameState, from: number): GameState {
  if (roundIsOver(state)) return endRound(state);
  const next = nextActive(state.players, from);
  if (next === -1) return endRound(state);
  return { ...state, currentTurn: next };
}

/**
 * Deals one card to a seat and applies it. Returns a state that may be waiting
 * on an action card, mid Flip Three, or ready for the turn to pass.
 */
function dealTo(state: GameState, index: number): GameState {
  const { card, deck, discard } = drawCard(state.deck, state.discard);
  if (!card) {
    // Both piles are empty, which can only happen if every card is face up.
    // Nothing left to draw, so the seat is done.
    return withStatus({ ...state, deck, discard }, index, 'stayed');
  }

  const base = { ...state, deck, discard };
  const player = base.players[index];

  if (card.kind === 'number') return applyNumber(base, index, card.value, card);
  if (card.kind === 'modifier') {
    const players = [...base.players];
    players[index] = { ...player, line: [...player.line, card] };
    return {
      ...base,
      players,
      gameLog: logPush(base.gameLog, `${player.name} drew ${MODIFIER_LABELS[card.modifier]}`),
    };
  }
  return applyAction(base, index, card);
}

function applyNumber(state: GameState, index: number, value: number, card: Flip7Card): GameState {
  const player = state.players[index];
  const already = player.line.some(c => c.kind === 'number' && c.value === value);
  const players = [...state.players];

  if (already) {
    if (player.hasSecondChance) {
      // The duplicate and the Second Chance both go; the line is untouched.
      const line = player.line.filter(
        c => !(c.kind === 'action' && c.action === 'secondChance'),
      );
      players[index] = { ...player, line, hasSecondChance: false };
      const discarded = player.line.filter(
        c => c.kind === 'action' && c.action === 'secondChance',
      );
      return {
        ...state,
        players,
        discard: [...state.discard, card, ...discarded],
        // Both cards have just left the table, so the save is recorded rather
        // than shown. Rounds do not reset it: the count is per match.
        lastSave: { playerIndex: index, value, seq: (state.lastSave?.seq ?? 0) + 1 },
        gameLog: logPush(state.gameLog, `${player.name} drew a second ${value} — Second Chance saves them`),
      };
    }
    players[index] = { ...player, line: [...player.line, card], status: 'busted' };
    return {
      ...state,
      players,
      gameLog: logPush(state.gameLog, `${player.name} drew a second ${value} and busts`),
    };
  }

  const line = [...player.line, card];
  const flipped = hasFlip7(line);
  players[index] = { ...player, line, status: flipped ? 'flipped7' : player.status };
  const withCard: GameState = {
    ...state,
    players,
    flipped7By: flipped ? index : state.flipped7By,
    gameLog: logPush(
      state.gameLog,
      flipped
        ? `${player.name} flipped 7 — round over, +${FLIP_7_BONUS}`
        : `${player.name} drew ${value}`,
    ),
  };
  return withCard;
}

function applyAction(state: GameState, index: number, card: ActionCard): GameState {
  const player = state.players[index];
  const pending: PendingAction = { action: card.action, drawnBy: index, cardId: card.id };
  const log = logPush(state.gameLog, `${player.name} drew ${ACTION_LABELS[card.action]}`);

  // Mid Flip Three, anything drawn waits until the run is done.
  if (state.flipThree) {
    return {
      ...state,
      flipThree: { ...state.flipThree, deferred: [...state.flipThree.deferred, card] },
      gameLog: log,
    };
  }

  // With nobody else left in the round it can only land on the drawer, so
  // don't make them click.
  const others = state.players.filter(p => p.id !== index && isInRound(p));
  if (others.length === 0) {
    return resolveAction({ ...state, pendingAction: pending, gameLog: log }, pending, index);
  }
  return { ...state, pendingAction: pending, gameLog: log };
}

/** Applies an aimed action card to its target and clears the pending slot. */
function resolveAction(state: GameState, pending: PendingAction, target: number): GameState {
  const players = [...state.players];
  const targetPlayer = players[target];
  const drawer = players[pending.drawnBy];
  const aimed = pending.drawnBy === target
    ? `${drawer.name} keeps ${ACTION_LABELS[pending.action]}`
    : `${drawer.name} gives ${ACTION_LABELS[pending.action]} to ${targetPlayer.name}`;
  const cleared: GameState = {
    ...state,
    pendingAction: null,
    gameLog: logPush(state.gameLog, aimed),
  };

  if (pending.action === 'freeze') {
    const frozen = withStatus(
      { ...cleared, discard: [...cleared.discard, { kind: 'action', action: 'freeze', id: pending.cardId }] },
      target,
      'stayed',
    );
    const banked = logPush(
      frozen.gameLog,
      `${targetPlayer.name} is frozen on ${scorePlayer(frozen.players[target])}`,
    );
    return continueAfterAction({ ...frozen, gameLog: banked }, pending.drawnBy);
  }

  if (pending.action === 'secondChance') {
    // Nobody holds two. A spare goes to someone without one, else it is gone.
    if (targetPlayer.hasSecondChance) {
      const spare = players.find(p => isInRound(p) && !p.hasSecondChance);
      if (!spare) {
        return continueAfterAction({
          ...cleared,
          discard: [...cleared.discard, { kind: 'action', action: 'secondChance', id: pending.cardId }],
          gameLog: logPush(cleared.gameLog, `Nobody can take a second Second Chance — discarded`),
        }, pending.drawnBy);
      }
      return continueAfterAction(giveSecondChance(cleared, spare.id, pending.cardId), pending.drawnBy);
    }
    return continueAfterAction(giveSecondChance(cleared, target, pending.cardId), pending.drawnBy);
  }

  // Flip Three: the target draws three, one at a time.
  return {
    ...cleared,
    discard: [...cleared.discard, { kind: 'action', action: 'flipThree', id: pending.cardId }],
    flipThree: { target, remaining: 3, deferred: [] },
  };
}

function giveSecondChance(state: GameState, target: number, cardId: string): GameState {
  const players = [...state.players];
  const p = players[target];
  const card: ActionCard = { kind: 'action', action: 'secondChance', id: cardId };
  players[target] = { ...p, line: [...p.line, card], hasSecondChance: true };
  return { ...state, players };
}

/**
 * After an action card resolves, the drawer's turn is over — unless the action
 * was drawn inside a Flip Three, in which case the run is still going.
 */
function continueAfterAction(state: GameState, drawnBy: number): GameState {
  if (state.flipThree) return state;
  return advance(state, drawnBy);
}

/**
 * The Flip Three run is finished. Anything drawn during it now resolves, one
 * card at a time, aimed by the player who was flipping.
 */
function finishFlipThree(state: GameState): GameState {
  const run = state.flipThree;
  if (!run) return state;

  const target = state.players[run.target];
  const deferred = [...run.deferred];

  // A player who busted mid-run does not get to use what they turned up.
  if (!isInRound(target)) {
    return advance(
      { ...state, flipThree: null, discard: [...state.discard, ...deferred] },
      run.target,
    );
  }

  const next = deferred.shift();
  if (!next) return advance({ ...state, flipThree: null }, run.target);

  const rest = { ...state, flipThree: null };
  const pending: PendingAction = { action: next.action, drawnBy: run.target, cardId: next.id };
  const queued: GameState = deferred.length > 0
    ? { ...rest, flipThree: { target: run.target, remaining: 0, deferred } }
    : rest;

  const others = queued.players.filter(p => p.id !== run.target && isInRound(p));
  if (others.length === 0) return resolveAction({ ...queued, pendingAction: pending }, pending, run.target);
  return { ...queued, pendingAction: pending };
}

/** Banks every line, then decides whether the match is over. */
function endRound(state: GameState): GameState {
  const players = state.players.map(p => {
    const score = scorePlayer(p);
    return { ...p, lastRoundScore: score, total: p.total + score };
  });

  const best = Math.max(...players.map(p => p.total));
  const isGameOver = best >= WINNING_SCORE;

  let log = logPush(state.gameLog, 'Round over');
  for (const p of players) {
    log = logPush(log, `${p.name} scored ${p.lastRoundScore} (${p.total})`);
  }

  return {
    ...state,
    gamePhase: isGameOver ? 'GAME_OVER' : 'ROUND_OVER',
    players,
    pendingAction: null,
    flipThree: null,
    gameLog: log,
  };
}
