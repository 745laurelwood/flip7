import React from 'react';
import { Flip7CardFace } from './Flip7Card';
import { TableMoment } from '../types';

/** The moments the table stops to show. The rest are only heard. */
export const isShownMoment = (m: TableMoment | null): boolean => m?.kind === 'save';

/**
 * Holds up what just happened, for the moments that leave nothing behind.
 *
 * A Second Chance discards both the duplicate and itself, so without this the
 * only thing that changes on screen is a card quietly leaving a line, and the
 * number that would have busted them is never seen at all.
 *
 * It renders above the table rather than inside it, because a save is often
 * followed by everyone else staying out in quick succession, and the round
 * ending should not cut the news short.
 */
export const MomentBanner: React.FC<{
  moment: TableMoment;
  name: string;
  isMe: boolean;
}> = ({ moment, name, isMe }) => (
  <div className="f7-moment f7-moment--save rounded-2xl px-4 py-3 mb-3 flex items-center gap-4">
    <div className="f7-moment-pair">
      <Flip7CardFace card={{ kind: 'action', action: 'secondChance', id: 'moment-chance' }} size="lg" />
      <Flip7CardFace card={{ kind: 'number', value: moment.value ?? 0, id: 'moment-dup' }} size="lg" />
    </div>
    <div className="min-w-0">
      <div className="font-display text-sm sm:text-base" style={{ color: 'var(--good)' }}>
        Second Chance
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-soft)' }}>
        {isMe
          ? <>Your second {moment.value} is discarded with it. You are still in.</>
          : <>{name}&rsquo;s second {moment.value} is discarded with it. Still in.</>}
      </div>
    </div>
  </div>
);
