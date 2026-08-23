// Flip 7 deals from its own deck, so none of the suit-and-rank vocabulary in
// @laurelwood/card-class applies. The skin's card renderer doesn't fit either;
// components/Flip7Card.tsx draws these.

export type CardKind = 'number' | 'modifier' | 'action';

/** The three things an action card can do. */
export type ActionKind = 'freeze' | 'flipThree' | 'secondChance';

/** Additive modifiers add their value; `x2` doubles the number total. */
export type ModifierKind = 'plus2' | 'plus4' | 'plus6' | 'plus8' | 'plus10' | 'x2';

export interface NumberCard {
  kind: 'number';
  /** 0 through 12. Duplicates in one line are what busts a player. */
  value: number;
  id: string;
}

export interface ModifierCard {
  kind: 'modifier';
  modifier: ModifierKind;
  id: string;
}

export interface ActionCard {
  kind: 'action';
  action: ActionKind;
  id: string;
}

export type Flip7Card = NumberCard | ModifierCard | ActionCard;

/** What a seat is doing in the round in progress. */
export type PlayerStatus =
  | 'active'   // still choosing whether to hit
  | 'stayed'   // banked, out of the round with points
  | 'busted'   // drew a duplicate, out of the round with nothing
  | 'flipped7';// seven unique numbers, ended the round

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  isOnline?: boolean;
  peerId?: string;
  /** Face-up cards in front of this player, in the order they arrived. */
  line: Flip7Card[];
  status: PlayerStatus;
  /** Unused Second Chance, held against a future duplicate. */
  hasSecondChance: boolean;
  /**
   * Stopped by a Freeze rather than by choice. The status is `stayed` either
   * way, because the effect is the same, but the two do not read the same.
   */
  frozen?: boolean;
  /** Banked across rounds. First past the target wins. */
  total: number;
  /** What this seat scored in the round just finished, for the summary. */
  lastRoundScore: number;
}

export interface Spectator {
  name: string;
  peerId: string;
}

export type GamePhase =
  | 'LOBBY'
  | 'PLAYING'      // seats take turns hitting or staying
  | 'ROUND_OVER'
  | 'GAME_OVER';

/**
 * An action card that has been drawn and is waiting to be pointed at someone.
 * Play stops until it is aimed, because where it lands changes the round.
 */
export interface PendingAction {
  action: ActionKind;
  /** Seat that drew it and therefore chooses the target. */
  drawnBy: number;
  /** The card itself, so it can be discarded once resolved. */
  cardId: string;
}

/**
 * A Flip Three in progress. The target draws three cards one at a time, and
 * anything they draw along the way waits until the run is over.
 */
export interface FlipThreeRun {
  target: number;
  remaining: number;
  /** Action cards drawn mid-run, resolved once the run finishes. */
  deferred: ActionCard[];
}

/** Things worth hearing, and sometimes worth stopping the table for. */
export type MomentKind = 'save' | 'freeze' | 'bust' | 'flip7';

/**
 * The last thing that happened worth reacting to.
 *
 * Cues used to be picked by matching words in the newest log line, which
 * misses anything that ends the round: `endRound` appends a score line per
 * seat in the same dispatch, so the bust or the seven is no longer the last
 * thing written. What happened is recorded here instead of being read back
 * out of the prose.
 *
 * A save is the case with nothing left on the table afterwards — the
 * duplicate and the Second Chance both go straight to the discard — so this
 * is also the only record the table has to draw it from.
 */
export interface TableMoment {
  kind: MomentKind;
  /** The seat it happened to. */
  playerIndex: number;
  /** The seat that did it, when somebody else did. */
  byIndex?: number;
  /** The number that matters: saved from, busted on, or banked by a Freeze. */
  value?: number;
  /**
   * Bumped on every moment, and monotonic for the life of a match. The table
   * watches this rather than the object, so a rebroadcast of the same state
   * does not read as another one.
   */
  seq: number;
}

export interface ChatMessage {
  id: string;
  playerIndex: number;
  name: string;
  text: string;
  ts: number;
}

export interface GameState {
  gamePhase: GamePhase;
  roomId?: string;
  players: Player[];

  /** Face-down draw pile. Refilled from `discard` when it empties. */
  deck: Flip7Card[];
  discard: Flip7Card[];

  /** Seat whose turn it is to hit or stay. */
  currentTurn: number;
  /** Seat that acts first next round; moves on by one each round. */
  firstPlayer: number;
  roundNumber: number;

  /** Set while a drawn action card is waiting to be aimed. */
  pendingAction: PendingAction | null;
  /** Set while a Flip Three is being drawn out. */
  flipThree: FlipThreeRun | null;

  /** Seat that ended the round by flipping seven, or -1. */
  flipped7By: number;

  /** The last thing worth reacting to, or null if nothing has happened yet. */
  lastMoment: TableMoment | null;

  /**
   * The card that landed most recently, for the flip that marks it.
   *
   * Recorded when it is dealt rather than worked out from the table: the last
   * card in seat order belongs to whichever seat sits furthest down, which is
   * almost never the one that just drew.
   */
  lastCardId: string | null;

  gameLog: string[];
  chatLog: ChatMessage[];
  readyForLobbyIndices?: number[];
  spectators: Spectator[];
}

// Network Types
export type NetworkAction =
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'PLAYER_JOINED'; payload: { index: number; name: string; peerId: string } }
  | { type: 'CLIENT_ACTION'; payload: any };
