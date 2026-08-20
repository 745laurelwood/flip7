import React from 'react';
import { useGame } from '../GameContext';
import { WINNING_SCORE, FLIP_7_BONUS } from '../rules';

/** End-of-round and end-of-match scoreboard. */
export const RoundSummary: React.FC = () => {
  const { state, startRound, returnToLobby } = useGame();
  const over = state.gamePhase === 'GAME_OVER';

  const ranked = [...state.players].sort((a, b) => b.total - a.total);
  const best = ranked[0]?.total ?? 0;
  const winners = ranked.filter(p => p.total === best);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 py-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>
          {over ? 'Game Over' : `Round ${state.roundNumber} complete`}
        </div>
        {over && (
          <div className="mt-1 text-xl sm:text-2xl font-display" style={{ color: 'var(--gold)' }}>
            {winners.length > 1
              ? `${winners.map(w => w.name).join(' and ')} tie on ${best}`
              : `${winners[0]?.name} wins on ${best}`}
          </div>
        )}
        {!over && (
          <div className="mt-1 text-sm" style={{ color: 'var(--fg-soft)' }}>
            First to {WINNING_SCORE} takes it
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {ranked.map((p, i) => {
          const flipped = p.status === 'flipped7';
          const busted = p.status === 'busted';
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)',
                borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
              }}
            >
              <span className="w-5 text-xs tabular-nums" style={{ color: 'var(--dim)' }}>{i + 1}</span>
              <span className="flex-1 truncate text-sm" style={{ color: 'var(--fg)' }}>{p.name}</span>
              {flipped && (
                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--gold)' }}>
                  Flip 7 +{FLIP_7_BONUS}
                </span>
              )}
              {busted && (
                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--red)' }}>Bust</span>
              )}
              <span
                className="text-sm tabular-nums w-10 text-right"
                style={{ color: busted ? 'var(--dim)' : 'var(--good)' }}
              >
                +{p.lastRoundScore}
              </span>
              <span className="font-display text-base tabular-nums w-12 text-right" style={{ color: 'var(--fg)' }}>
                {p.total}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        {over ? (
          <button onClick={returnToLobby} className="btn-accent px-6 py-2.5 rounded-xl text-sm font-semibold">
            Back to Lobby
          </button>
        ) : (
          <button onClick={startRound} className="btn-accent px-6 py-2.5 rounded-xl text-sm font-semibold">
            Next Round
          </button>
        )}
      </div>
    </div>
  );
};
