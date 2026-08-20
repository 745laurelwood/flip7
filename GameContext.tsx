import React, { createContext, useContext } from 'react';
import { GameState } from './types';
import { Action } from './gameReducer';

export interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  myIndex: number;

  /** Whose turn it is, and whether that is me. */
  isMyTurn: boolean;
  canHit: boolean;
  canStay: boolean;
  executeHit: () => void;
  executeStay: () => void;

  /** Set while I hold an action card that still has to be pointed at someone. */
  awaitingMyAim: boolean;
  legalTargets: number[];
  executeAim: (target: number) => void;

  /** The card that landed most recently, for the ring that marks it. */
  freshCardId: string | null;

  startRound: () => void;
  returnToLobby: () => void;

  logEndRef: React.RefObject<HTMLDivElement | null>;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ value: GameContextValue; children: React.ReactNode }> = ({ value, children }) => (
  <GameContext.Provider value={value}>{children}</GameContext.Provider>
);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside a GameProvider');
  return ctx;
}
