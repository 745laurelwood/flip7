import React from 'react';
import { Flip7Card, Player } from '../types';
import { FLIP_7_COUNT, numbersIn, scoreLine } from '../rules';
import { Flip7CardFace } from './Flip7Card';
import { IconFreeze } from './cardArt';

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
 * Why this seat stopped.
 *
 * Being frozen and staying leave the same status behind, because they have
 * the same effect, but one of them was a choice and the other was done to
 * you. The snowflake is the same one on the card that did it.
 */
const StatusBadge: React.FC<{ player: Player }> = ({ player }) => {
  if (player.status === 'active') return null;

  if (player.frozen) {
    return (
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-bold inline-flex items-center gap-1"
        style={{ color: 'var(--freeze)' }}
        title="Frozen — stopped by a Freeze card"
      >
        <span className="w-3 h-3 shrink-0"><IconFreeze /></span>
        Frozen
      </span>
    );
  }

  return (
    <span
      className="text-[10px] uppercase tracking-[0.14em] font-bold"
      style={{ color: STATUS_COLOR[player.status] }}
    >
      {STATUS_LABEL[player.status]}
    </span>
  );
};

/**
 * The number that turned up twice and ended this line, if one did.
 *
 * A bust leaves both copies face up, so the pair can be marked rather than
 * leaving the reader to scan a dead line for the match themselves. A line
 * saved by a Second Chance has no pair left in it: the duplicate is discarded.
 */
const bustedOn = (line: Flip7Card[]): number | null => {
  const seen = new Set<number>();
  for (const card of line) {
    if (card.kind !== 'number') continue;
    if (seen.has(card.value)) return card.value;
    seen.add(card.value);
  }
  return null;
};

/**
 * How close this line is to the seven that ends the round. A busted line is
 * passed nothing: it is not on its way anywhere.
 */
const Pips: React.FC<{ filled: number }> = ({ filled }) => (
  <span className="f7-pips" title={`${filled} of ${FLIP_7_COUNT} different numbers`}>
    {Array.from({ length: FLIP_7_COUNT }, (_, i) => (
      <span
        key={i}
        className={
          'f7-pip'
          + (i >= filled ? '' : filled >= FLIP_7_COUNT - 1 ? ' f7-pip--close' : ' f7-pip--on')
        }
      />
    ))}
  </span>
);

/**
 * One seat: name, running total, how close it is to seven, and the line itself.
 *
 * Everything in Flip 7 is face up, so a seat is a row rather than a hand.
 */
export const PlayerLine: React.FC<{
  player: Player;
  isMe: boolean;
  isTurn: boolean;
  /** Highlighted as a legal target while an action card is being aimed. */
  targetable?: boolean;
  onTarget?: () => void;
  freshCardId?: string | null;
  /** Flashes the seat while a moment it is part of is being shown. */
  flash?: 'save' | 'freeze' | null;
}> = ({ player, isMe, isTurn, targetable = false, onTarget, freshCardId, flash = null }) => {
  const busted = player.status === 'busted';
  const standing = scoreLine(player.line, { busted });
  const uniques = new Set(numbersIn(player.line)).size;
  const duplicate = busted ? bustedOn(player.line) : null;

  const Wrapper: React.ElementType = targetable ? 'button' : 'div';

  return (
    <Wrapper
      onClick={targetable ? onTarget : undefined}
      className={`
        w-full text-left rounded-2xl px-3 py-2 transition-all
        ${targetable ? 'cursor-pointer hover:brightness-125 animate-accent-pulse' : ''}
        ${busted ? 'f7-seat--bust' : ''}
        ${player.status === 'flipped7' ? 'f7-seat--seven' : ''}
        ${flash ? `f7-seat--flash-${flash}` : ''}
      `}
      style={{
        background: isMe ? 'var(--bg-2)' : 'var(--bg-1)',
        border: `1px solid ${
          targetable ? 'var(--accent)' : isTurn ? 'var(--accent-soft)' : 'var(--line)'
        }`,
        boxShadow: isTurn ? '0 0 0 1px var(--accent-soft), 0 4px 16px rgba(0,0,0,0.35)' : undefined,
        opacity: busted ? 0.72 : 1,
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

        <StatusBadge player={player} />

        {isTurn && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full animate-accent-pulse"
            style={{ background: 'var(--accent)', color: '#06121f', fontWeight: 600 }}
          >
            {isMe ? 'Your turn' : 'Thinking'}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2">
          <Pips filled={busted ? 0 : uniques} />
          <span
            className="font-display text-sm tabular-nums"
            style={{ color: busted ? 'var(--dim)' : 'var(--fg-soft)' }}
            title="What this line is worth right now"
          >
            {busted ? 0 : standing}
          </span>
        </span>
      </div>

      <div className="f7-line min-h-[4.9rem] sm:min-h-[5.6rem]">
        {player.line.length === 0 && (
          <span className="text-[11px] italic self-center" style={{ color: 'var(--dimmer)' }}>
            nothing yet
          </span>
        )}
        {player.line.map(card => (
          <Flip7CardFace
            key={card.id}
            card={card}
            faded={busted}
            fresh={card.id === freshCardId}
            duplicate={duplicate !== null && card.kind === 'number' && card.value === duplicate}
            held={card.kind === 'action' && card.action === 'secondChance'}
          />
        ))}
      </div>
    </Wrapper>
  );
};
