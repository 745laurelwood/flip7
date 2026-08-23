import React from 'react';
import { useGame } from '../GameContext';
import { PlayerLine } from './PlayerLine';
import { DrawPile, Flip7CardFace } from './Flip7Card';
import { ACTION_LABELS, WINNING_SCORE } from '../rules';
import { ActionKind, Flip7Card } from '../types';

const AIM_HINT: Record<ActionKind, string> = {
  freeze: 'Pick who has to stop right now.',
  flipThree: 'Pick who draws three cards.',
  secondChance: 'Pick who keeps it — you can hold it yourself.',
};

/** The table: every seat's line, the draw pile, and whatever is being asked. */
export const FeltContent: React.FC = () => {
  const {
    state, myIndex, awaitingMyAim, legalTargets, executeAim, freshCardId, moment,
  } = useGame();

  const pending = state.pendingAction;
  // The card is not in anyone's line while it waits to be aimed, so it is
  // rebuilt from the pending slot to be shown at the size the choice deserves.
  const pendingCard: Flip7Card | null = pending
    ? { kind: 'action', action: pending.action, id: pending.cardId }
    : null;
  const drawnBy = pending ? state.players[pending.drawnBy] : undefined;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 pb-2">
        <div className="flex items-center gap-2.5">
          <DrawPile count={state.deck.length} />
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

      {pending && pendingCard && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-4"
          style={{ background: 'rgba(111,215,196,0.07)', border: '1px solid var(--accent-soft)' }}
        >
          <Flip7CardFace card={pendingCard} size="lg" fresh />
          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base" style={{ color: 'var(--accent)' }}>
              {awaitingMyAim ? 'You drew' : `${drawnBy?.name ?? 'Someone'} drew`}{' '}
              {ACTION_LABELS[pending.action]}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--fg-soft)' }}>
              {awaitingMyAim
                ? AIM_HINT[pending.action]
                : 'Choosing who it lands on.'}
            </div>
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
            flash={
              moment && moment.playerIndex === p.id
                && (moment.kind === 'save' || moment.kind === 'freeze')
                ? moment.kind
                : null
            }
          />
        ))}
      </div>
    </div>
  );
};
