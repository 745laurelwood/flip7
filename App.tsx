import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GameLog, ChatRoom } from '@laurelwood/card-class';
import { gameReducer, INITIAL_STATE } from './gameReducer';
import { GameProvider, GameContextValue } from './GameContext';
import { FeltContent } from './components/FeltContent';
import { RoundSummary } from './components/RoundSummary';
import { Lobby } from './views/Lobby';
import { sounds } from './utils/sound';
import { chooseTarget, shouldHit } from './utils/ai';
import {
  AI_AIM_DELAY_MS, AI_TURN_DELAY_MS, FLIP_THREE_STEP_MS, ROUND_END_DELAY_MS, Z_HUD,
} from './constants';
import { DEFAULT_PLAYERS } from './rules';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('flip7_playerName') || '');
  const [numPlayers, setNumPlayers] = useState(DEFAULT_PLAYERS);
  const [started, setStarted] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Seat 0 is the human in single player.
  const myIndex = 0;

  useEffect(() => { localStorage.setItem('flip7_playerName', playerName); }, [playerName]);

  // The card that landed most recently, so the table can ring it briefly.
  const freshCardId = useMemo(() => {
    const lines = state.players.flatMap(p => p.line);
    return lines.length > 0 ? lines[lines.length - 1].id : null;
  }, [state.players]);

  const me = state.players[myIndex];
  const myTurn =
    state.gamePhase === 'PLAYING'
    && state.currentTurn === myIndex
    && !state.pendingAction
    && !state.flipThree
    && me?.status === 'active';

  const awaitingMyAim = !!state.pendingAction && state.pendingAction.drawnBy === myIndex;
  const legalTargets = state.players.filter(p => p.status === 'active').map(p => p.id);

  // ── Bots: hit or stay ──
  useEffect(() => {
    if (state.gamePhase !== 'PLAYING') return;
    if (state.pendingAction || state.flipThree) return;
    const player = state.players[state.currentTurn];
    if (!player || player.isHuman || player.status !== 'active') return;

    const timer = setTimeout(() => {
      if (shouldHit(state, player)) {
        sounds.flip();
        dispatch({ type: 'HIT', payload: { playerIndex: player.id } });
      } else {
        dispatch({ type: 'STAY', payload: { playerIndex: player.id } });
      }
    }, AI_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.gamePhase, state.currentTurn, state.players, state.pendingAction, state.flipThree]);

  // ── Bots: aim a drawn action card ──
  useEffect(() => {
    const pending = state.pendingAction;
    if (state.gamePhase !== 'PLAYING' || !pending) return;
    const drawer = state.players[pending.drawnBy];
    if (!drawer || drawer.isHuman) return;

    const timer = setTimeout(() => {
      const target = chooseTarget(state, drawer.id, pending.action);
      if (pending.action === 'freeze') sounds.freeze();
      dispatch({ type: 'AIM_ACTION', payload: { playerIndex: drawer.id, target } });
    }, AI_AIM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.gamePhase, state.pendingAction, state.players]);

  // ── Flip Three draws itself out, one card at a time ──
  // Stepping it from here rather than inside the reducer is what makes it read
  // as three separate flips instead of one.
  useEffect(() => {
    if (state.gamePhase !== 'PLAYING') return;
    if (!state.flipThree) return;
    const timer = setTimeout(() => {
      sounds.flip();
      dispatch({ type: 'RESOLVE_FLIP_THREE' });
    }, FLIP_THREE_STEP_MS);
    return () => clearTimeout(timer);
  }, [state.gamePhase, state.flipThree]);

  // ── Sound for the moments worth hearing ──
  const lastLogRef = useRef<string>('');
  useEffect(() => {
    const latest = state.gameLog[state.gameLog.length - 1] ?? '';
    if (latest === lastLogRef.current) return;
    lastLogRef.current = latest;
    if (latest.includes('busts')) sounds.bust();
    else if (latest.includes('flipped 7')) sounds.flip7();
  }, [state.gameLog]);

  // ── Round end ──
  useEffect(() => {
    if (state.gamePhase !== 'PLAYING') return;
    const stillIn = state.players.some(p => p.status === 'active');
    if (stillIn || state.pendingAction || state.flipThree) return;
    const timer = setTimeout(() => dispatch({ type: 'END_ROUND' }), ROUND_END_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.gamePhase, state.players, state.pendingAction, state.flipThree]);

  const startSinglePlayer = () => {
    dispatch({ type: 'START_GAME', payload: { playerName: playerName || 'You', numPlayers } });
    setStarted(true);
  };

  useEffect(() => {
    if (started && state.gamePhase === 'LOBBY' && state.players.length > 0) {
      dispatch({ type: 'START_ROUND' });
    }
  }, [started, state.gamePhase, state.players.length]);

  const ctx: GameContextValue = {
    state, dispatch, myIndex,
    isMyTurn: myTurn,
    canHit: myTurn,
    canStay: myTurn,
    executeHit: () => {
      if (!myTurn) return;
      sounds.flip();
      dispatch({ type: 'HIT', payload: { playerIndex: myIndex } });
    },
    executeStay: () => {
      if (!myTurn) return;
      dispatch({ type: 'STAY', payload: { playerIndex: myIndex } });
    },
    awaitingMyAim,
    legalTargets,
    executeAim: (target: number) => {
      if (!awaitingMyAim) return;
      dispatch({ type: 'AIM_ACTION', payload: { playerIndex: myIndex, target } });
    },
    freshCardId,
    startRound: () => dispatch({ type: 'START_ROUND' }),
    returnToLobby: () => {
      dispatch({ type: 'RETURN_TO_LOBBY', payload: { playerIndex: myIndex } });
      setStarted(false);
    },
    logEndRef,
  };

  if (state.gamePhase === 'LOBBY') {
    return (
      <Lobby
        playerName={playerName}
        setPlayerName={setPlayerName}
        numPlayers={numPlayers}
        setNumPlayers={setNumPlayers}
        onStart={startSinglePlayer}
      />
    );
  }

  const roundOver = state.gamePhase === 'ROUND_OVER' || state.gamePhase === 'GAME_OVER';

  return (
    <GameProvider value={ctx}>
      <div className="min-h-screen min-h-dvh royal-bg" style={{ color: 'var(--fg)' }}>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-t) + 0.75rem)' }}>
          <header className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl sm:text-2xl" style={{ color: 'var(--accent)' }}>Flip 7</h1>
            <div className="pointer-events-auto">
              <GameLog entries={state.gameLog} logEndRef={logEndRef} />
            </div>
          </header>

          {roundOver ? <RoundSummary /> : <FeltContent />}
        </div>

        {!roundOver && (
          <div
            className="fixed left-0 right-0 flex items-center justify-center gap-3 px-4"
            style={{ zIndex: Z_HUD, bottom: 'calc(var(--safe-b) + 1rem)' }}
          >
            <button
              onClick={ctx.executeStay}
              disabled={!ctx.canStay}
              className="rounded-2xl px-6 h-[52px] font-display transition-all active:scale-[0.96]"
              style={{
                background: ctx.canStay ? 'rgba(127,215,169,0.18)' : 'var(--bg-1)',
                color: ctx.canStay ? 'var(--good)' : 'var(--dimmer)',
                border: `1px solid ${ctx.canStay ? 'rgba(127,215,169,0.55)' : 'var(--line-soft)'}`,
                cursor: ctx.canStay ? 'pointer' : 'not-allowed',
              }}
            >
              Stay
            </button>
            <button
              onClick={ctx.executeHit}
              disabled={!ctx.canHit}
              className={`rounded-2xl px-8 h-[52px] font-display transition-all active:scale-[0.96] ${ctx.canHit ? 'btn-accent' : ''}`}
              style={!ctx.canHit ? {
                background: 'var(--bg-1)', color: 'var(--dimmer)',
                border: '1px solid var(--line-soft)', cursor: 'not-allowed',
              } : undefined}
            >
              Hit
            </button>
          </div>
        )}
      </div>
    </GameProvider>
  );
}
