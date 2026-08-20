import React from 'react';
import { ActionKind, Flip7Card as Card } from '../types';
import { ACTION_LABELS, MODIFIER_LABELS } from '../rules';
import { ACTION_WORDS, MODIFIER_WORDS, NUMBER_WORDS, numberInk } from '../theme';
import { IconFlipThree, IconFreeze, IconSecondChance, Starburst } from './cardArt';

/**
 * A Flip 7 card. Nothing here comes from @laurelwood/card-class's
 * CardComponent: that draws a suit and a rank, and these have neither.
 *
 * The printed deck is the reference. Numbers are a pale card with the numeral
 * filling it and the same number spelled out in a coloured band underneath;
 * modifiers sit on orange; each action card is a solid colour with a symbol
 * on it. See theme.ts for the one place we go further than the cardboard.
 *
 * Everything is laid out in `em` off a font size the card derives from its own
 * width, so one size token rescales a whole face and the proportions hold.
 */

export type CardSize = 'sm' | 'md' | 'lg';

const ACTION_ICONS: Record<ActionKind, React.FC> = {
  freeze: IconFreeze,
  flipThree: IconFlipThree,
  secondChance: IconSecondChance,
};

/** The word band under the numeral or symbol. */
const Band: React.FC<{ lines: readonly string[] }> = ({ lines }) => (
  <span className="f7-band">
    {lines.map(word => <span key={word} className="f7-word">{word}</span>)}
  </span>
);

export const Flip7CardFace: React.FC<{
  card: Card;
  size?: CardSize;
  /** Dims the card without hiding it — a line that no longer counts. */
  faded?: boolean;
  /** Deals the card in with a flip, for the one that just landed. */
  fresh?: boolean;
  /** One of the two matching numbers that busted this line. */
  duplicate?: boolean;
  /** A Second Chance being held rather than spent. */
  held?: boolean;
  className?: string;
}> = ({ card, size = 'md', faded = false, fresh = false, duplicate = false, held = false, className = '' }) => {
  const classes = [
    'f7-card', `f7-card--${size}`,
    faded && 'f7-faded',
    fresh && 'f7-fresh',
    duplicate && 'f7-dup',
    held && 'f7-held',
    className,
  ].filter(Boolean).join(' ');

  if (card.kind === 'number') {
    const { hue, ink } = numberInk(card.value);
    return (
      <div
        data-card-id={card.id}
        className={`${classes} f7-number`}
        style={{ '--hue': hue, '--ink': ink } as React.CSSProperties}
        title={`${NUMBER_WORDS[card.value] ?? card.value}`}
      >
        <span className="f7-index">{card.value}</span>
        <span className="f7-numeral">{card.value}</span>
        <Band lines={[NUMBER_WORDS[card.value] ?? String(card.value)]} />
      </div>
    );
  }

  if (card.kind === 'modifier') {
    const isDouble = card.modifier === 'x2';
    return (
      <div
        data-card-id={card.id}
        className={`${classes} f7-mod${isDouble ? ' f7-mod--double' : ''}`}
        title={`${MODIFIER_LABELS[card.modifier]} — ${MODIFIER_WORDS[card.modifier]}`}
      >
        {isDouble && <span className="f7-rays"><Starburst /></span>}
        <span className="f7-glyph">{MODIFIER_LABELS[card.modifier]}</span>
        <Band lines={[MODIFIER_WORDS[card.modifier]]} />
      </div>
    );
  }

  const Icon = ACTION_ICONS[card.action];
  return (
    <div
      data-card-id={card.id}
      className={`${classes} f7-action f7-action--${card.action}`}
      title={ACTION_LABELS[card.action]}
    >
      <span className="f7-icon"><Icon /></span>
      <Band lines={ACTION_WORDS[card.action]} />
    </div>
  );
};

/** The reverse. Every card in play is face up, so this is only ever the pile. */
export const Flip7CardBack: React.FC<{ size?: CardSize; className?: string }> = ({
  size = 'md', className = '',
}) => (
  <div className={`f7-card f7-card--${size} f7-back ${className}`} aria-hidden="true">
    <span className="f7-back-mark">7</span>
  </div>
);

/**
 * The draw pile. Drawn as a stack rather than a single card so the table reads
 * as having cards left in it, with the count over the front of it.
 */
export const DrawPile: React.FC<{ count: number; size?: CardSize }> = ({ count, size = 'md' }) => (
  <div className="f7-pile" title={`${count} cards left in the draw pile`}>
    {count > 1 && <Flip7CardBack size={size} className="f7-pile-under f7-pile-under--b" />}
    {count > 0 && <Flip7CardBack size={size} className="f7-pile-under f7-pile-under--a" />}
    {count > 0
      ? <Flip7CardBack size={size} />
      : <div className={`f7-card f7-card--${size} f7-pile-empty`} aria-hidden="true" />}
    <span className="f7-pile-count tabular-nums">{count}</span>
  </div>
);
