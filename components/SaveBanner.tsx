import React from 'react';
import { Flip7CardFace } from './Flip7Card';
import { SaveMoment } from '../types';

/**
 * Holds up the two cards a Second Chance just spent.
 *
 * The reducer discards both the moment the save happens, so without this the
 * only thing that changes on screen is a card quietly leaving a line, and the
 * duplicate that would have busted them is never seen at all.
 *
 * It renders above the table rather than inside it, because a save is often
 * followed by everyone else staying out in quick succession, and the round
 * ending should not cut the news short.
 */
export const SaveBanner: React.FC<{
  save: SaveMoment;
  name: string;
  isMe: boolean;
}> = ({ save, name, isMe }) => (
  <div className="f7-save-panel rounded-2xl px-4 py-3 mb-3 flex items-center gap-4">
    <div className="f7-save-pair">
      <Flip7CardFace card={{ kind: 'action', action: 'secondChance', id: 'save-chance' }} size="lg" />
      <Flip7CardFace card={{ kind: 'number', value: save.value, id: 'save-dup' }} size="lg" />
    </div>
    <div className="min-w-0">
      <div className="font-display text-sm sm:text-base" style={{ color: 'var(--good)' }}>
        Second Chance
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-soft)' }}>
        {isMe
          ? <>Your second {save.value} is discarded with it. You are still in.</>
          : <>{name}&rsquo;s second {save.value} is discarded with it. Still in.</>}
      </div>
    </div>
  </div>
);
