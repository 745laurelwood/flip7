import React from 'react';
import { Player } from '../types';
import { FLIP_7_COUNT, numbersIn, scoreLine } from '../rules';
import { Flip7CardFace } from './Flip7Card';

const STATUS_LABEL: Record<Player['status'], string> = {
  active: '',
  stayed: 'Stayed',
  busted: 'Bust',
  flipped7: 'Flip 7!',
};

const STATUS_COLOR: Record<Player['status'], string> = {
  active: 'var(--fg)',
  stayed: 'var(--good)',
  busted: 'var(--red)',
  flipped7: 'var(--gold)',
};

/**
 * One seat: name, running total, what they are holding, and the line itself.
 *
 * Everything in Flip 7 is face up, so a seat is a row rather than a hand. The
 * unique-number count is spelled out because it is the number that actually
 * decides whether hitting again is sane.
 */
export const PlayerLine: React.FC<{
  player: Player;
  isMe: boolean;
  isTurn: boolean;
  /** Highlighted as a legal target while an action card is being aimed. */
  targetable?: boolean;
  onTarget?: () => void;
  freshCardId?: string | null;
}> = ({ player, isMe, isTurn, targetable = false, onTarget, freshCardId }) => {
  const busted = player.status === 'busted';
  const standing = scoreLine(player.line, { busted });
  const uniques = new Set(numbersIn(player.line)).size;

  const Wrapper: React.ElementType = targetable ? 'button' : 'div';

  return (
    <Wrapper
      onClick={targetable ? onTarget : undefined}
      className={`
        w-full text-left rounded-2xl px-3 py-2 transition-all
        ${targetable ? 'cursor-pointer hover:brightness-125 animate-accent-pulse' : ''}
      `}
      style={{
        background: isMe ? 'var(--bg-2)' : 'var(--bg-1)',
        border: `1px solid ${
          targetable ? 'var(--accent)' : isTurn ? 'var(--accent-soft)' : 'var(--line)'
        }`,
        boxShadow: isTurn ? '0 0 0 1px var(--accent-soft), 0 4px 16px rgba(0,0,0,0.35)' : undefined,
        opacity: busted ? 0.65 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="font-display text-sm sm:text-base" style={{ color: 'var(--fg)' }}>
          {player.name}
          {isMe && <span className="ml-1 text-[10px]" style={{ color: 'var(--dim)' }}>(you)</span>}
        </span>

        <span
          className="text-[10px] px-1.5 py-0.5 rounded-md tabular-nums"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-soft)' }}
          title="Banked across the match"
        >
          {player.total}
        </span>

        {player.status !== 'active' && (
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-bold"
            style={{ color: STATUS_COLOR[player.status] }}
          >
            {STATUS_LABEL[player.status]}
          </span>
        )}

        {player.hasSecondChance && player.status === 'active' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(127,215,169,0.16)', color: 'var(--good)' }}>
            2nd chance
          </span>
        )}

        {isTurn && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full animate-accent-pulse"
            style={{ background: 'var(--accent)', color: '#06121f', fontWeight: 600 }}
          >
            {isMe ? 'Your turn' : 'Thinking'}
          </span>
        )}

        <span className="ml-auto text-[11px] tabular-nums" style={{ color: 'var(--dim)' }}>
          {uniques}/{FLIP_7_COUNT} · {busted ? 0 : standing}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap min-h-[4rem]">
        {player.line.length === 0 && (
          <span className="text-[11px] italic" style={{ color: 'var(--dimmer)' }}>nothing yet</span>
        )}
        {player.line.map(card => (
          <Flip7CardFace
            key={card.id}
            card={card}
            faded={busted}
            fresh={card.id === freshCardId}
          />
        ))}
      </div>
    </Wrapper>
  );
};
