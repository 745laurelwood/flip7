import React from 'react';
import { useGame } from '../GameContext';
import { PlayerLine } from './PlayerLine';
import { DeckBack } from './Flip7Card';
import { ACTION_LABELS, WINNING_SCORE } from '../rules';

/** The table: every seat's line, the draw pile, and whatever is being asked. */
export const FeltContent: React.FC = () => {
  const {
    state, myIndex, awaitingMyAim, legalTargets, executeAim, freshCardId,
  } = useGame();

  const pending = state.pendingAction;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DeckBack count={state.deck.length} />
          <div className="text-[11px] leading-tight" style={{ color: 'var(--dim)' }}>
            <div>draw pile</div>
            <div>{state.discard.length} discarded</div>
          </div>
        </div>
        <div className="text-right text-[11px]" style={{ color: 'var(--dim)' }}>
          <div>Round {state.roundNumber}</div>
          <div>first to {WINNING_SCORE}</div>
        </div>
      </div>

      {awaitingMyAim && pending && (
        <div
          className="rounded-2xl px-4 py-3 text-center"
          style={{ background: 'rgba(111,176,255,0.08)', border: '1px solid var(--accent-soft)' }}
        >
          <div className="font-display text-sm sm:text-base" style={{ color: 'var(--accent)' }}>
            You drew {ACTION_LABELS[pending.action]}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--fg-soft)' }}>
            {pending.action === 'secondChance'
              ? 'Pick who keeps it — you can hold it yourself.'
              : pending.action === 'freeze'
                ? 'Pick who has to stop right now.'
                : 'Pick who draws three cards.'}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {state.players.map(p => (
          <PlayerLine
            key={p.id}
            player={p}
            isMe={p.id === myIndex}
            isTurn={state.gamePhase === 'PLAYING' && state.currentTurn === p.id && !state.pendingAction && !state.flipThree}
            targetable={awaitingMyAim && legalTargets.includes(p.id)}
            onTarget={() => executeAim(p.id)}
            freshCardId={freshCardId}
          />
        ))}
      </div>
    </div>
  );
};
