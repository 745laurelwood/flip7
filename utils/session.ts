import { createSessionStore } from '@laurelwood/card-class';
import type { SavedSession as SharedSavedSession } from '@laurelwood/card-class';
import type { GameState } from '../types';

const store = createSessionStore<GameState>({
  key: 'flip7_session_v1',
  isValidState: s => Array.isArray(s.players) && !!s.gamePhase && Array.isArray(s.deck),
});

export type SavedSession = SharedSavedSession<GameState>;
export const saveSession = store.save;
export const loadSession = store.load;
export const clearSession = store.clear;
