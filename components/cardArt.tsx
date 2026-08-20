import React from 'react';

/**
 * The symbols printed on the action and modifier cards.
 *
 * A card renders about a thumbnail wide, which is too narrow for "Second
 * Chance" to be read across a table. The icon is what identifies the card at a
 * glance and the word underneath only confirms it, so these are drawn heavy
 * and simple rather than detailed.
 *
 * All of them are stroked in `currentColor` and fill their box, so the card
 * sets the size and the colour.
 */

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** One arm of the snowflake: a spoke with a chevron at each end. */
const SPOKE = (
  <>
    <path d="M12 2.4v19.2" />
    <path d="M9.7 5 12 2.6 14.3 5" />
    <path d="M9.7 19 12 21.4l2.3-2.4" />
  </>
);

export const IconFreeze: React.FC = () => (
  <svg {...svgProps} strokeWidth={1.7}>
    {[0, 60, 120].map(angle => (
      <g key={angle} transform={`rotate(${angle} 12 12)`}>{SPOKE}</g>
    ))}
  </svg>
);

/**
 * Three cards fanned out — what the card makes you draw. Solid rather than
 * outlined: at the size these render, three outlines close up into one blob.
 */
export const IconFlipThree: React.FC = () => (
  <svg {...svgProps} fill="currentColor" stroke="none">
    <rect x="1.3" y="7.5" width="5.4" height="9.4" rx="1.3" transform="rotate(-14 4 12.2)" />
    <rect x="17.3" y="7.5" width="5.4" height="9.4" rx="1.3" transform="rotate(14 20 12.2)" />
    <rect x="9.3" y="7.1" width="5.4" height="9.4" rx="1.3" />
  </svg>
);

/** A go-round arrow: the duplicate is discarded and you carry on. */
export const IconSecondChance: React.FC = () => (
  <svg {...svgProps} strokeWidth={1.9}>
    <path d="M3.6 12a8.4 8.4 0 1 0 8.4-8.4 9.1 9.1 0 0 0-6.3 2.6L3.6 8.4" />
    <path d="M3.6 3.9v4.5h4.9" />
  </svg>
);

/** Rays behind the x2, the one card that can swing a round on its own. */
export const Starburst: React.FC = () => (
  <svg {...svgProps} strokeWidth={1.1}>
    {Array.from({ length: 12 }, (_, i) => (
      <line key={i} x1="12" y1="1.4" x2="12" y2="5.4" transform={`rotate(${i * 30} 12 12)`} />
    ))}
  </svg>
);
