import React from 'react';
import { Flip7Card as Card } from '../types';
import { ACTION_LABELS, MODIFIER_LABELS } from '../rules';

/**
 * A Flip 7 card. Nothing here comes from @laurelwood/card-class's
 * CardComponent: that draws a suit and a rank, and these have neither.
 *
 * The three kinds have to be told apart at a glance across a table of lines,
 * so each gets its own colour and shape rather than only its own text.
 */

const NUMBER_FACE = 'linear-gradient(180deg, #faf9f5 0%, #ece8de 100%)';
const MODIFIER_FACE = 'linear-gradient(180deg, #f6efd8 0%, #e6d9ae 100%)';
const ACTION_FACES: Record<string, string> = {
  freeze: 'linear-gradient(180deg, #dcefff 0%, #b6d8f5 100%)',
  flipThree: 'linear-gradient(180deg, #ffe3d6 0%, #f7c3a6 100%)',
  secondChance: 'linear-gradient(180deg, #dcf7e3 0%, #b2e4c2 100%)',
};

export type CardSize = 'sm' | 'md';

const SIZES: Record<CardSize, string> = {
  sm: 'w-9 h-12 text-[11px] rounded-md',
  md: 'w-12 h-16 sm:w-14 sm:h-20 text-sm rounded-lg',
};

export const Flip7CardFace: React.FC<{
  card: Card;
  size?: CardSize;
  /** Dims the card without hiding it — a line that no longer counts. */
  faded?: boolean;
  /** Rings the card, for the one that just landed. */
  fresh?: boolean;
  className?: string;
}> = ({ card, size = 'md', faded = false, fresh = false, className = '' }) => {
  const background =
    card.kind === 'number' ? NUMBER_FACE
      : card.kind === 'modifier' ? MODIFIER_FACE
        : ACTION_FACES[card.action];

  const label =
    card.kind === 'number' ? String(card.value)
      : card.kind === 'modifier' ? MODIFIER_LABELS[card.modifier]
        : ACTION_LABELS[card.action];

  // Action names don't fit at card size, so they stack onto two short lines.
  const stacked = card.kind === 'action' ? label.split(' ') : [label];

  return (
    <div
      data-card-id={card.id}
      className={`
        relative shrink-0 card-shadow card-transition select-none
        ${SIZES[size]} ${className}
        flex flex-col items-center justify-center text-center
        ${fresh ? 'ring-2 ring-[color:var(--accent)]' : 'ring-1 ring-black/10'}
      `}
      style={{
        background,
        color: '#14202c',
        fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif",
        fontWeight: 600,
        ...(faded ? { filter: 'grayscale(1) brightness(0.6)' } : {}),
      }}
      title={label}
    >
      {card.kind === 'number' ? (
        <span className={size === 'sm' ? 'text-base' : 'text-xl sm:text-2xl'}>{label}</span>
      ) : (
        <span className="leading-tight px-0.5" style={{ fontSize: card.kind === 'action' ? '0.6em' : '1em' }}>
          {stacked.map((part, i) => <div key={i}>{part}</div>)}
        </span>
      )}
    </div>
  );
};

/** The face-down pile, shown as a count rather than a fan. */
export const DeckBack: React.FC<{ count: number }> = ({ count }) => (
  <div
    className="relative w-12 h-16 sm:w-14 sm:h-20 rounded-lg flex items-center justify-center card-shadow"
    style={{
      background: 'linear-gradient(155deg, #182335 0%, #0c121c 60%, #131a26 100%)',
      border: '1px solid rgba(111,176,255,0.18)',
      color: 'rgba(111,176,255,0.75)',
    }}
    title={`${count} cards left in the draw pile`}
  >
    <span className="font-display text-sm tabular-nums">{count}</span>
  </div>
);
