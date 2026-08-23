import React from 'react';
import { Flip7CardFace } from './Flip7Card';
import { Player, TableMoment } from '../types';

/**
 * The moments the table stops to show, rather than only sounding.
 *
 * Both of them leave nothing behind to look at. A Second Chance discards the
 * duplicate and itself, so all that changes in a line is a card quietly
 * disappearing and the number that nearly got you is never seen. A Freeze is
 * discarded on the spot too, and all it leaves is a status flipping over on
 * somebody else's seat.
 */
export const isShownMoment = (m: TableMoment | null): boolean =>
  m?.kind === 'save' || m?.kind === 'freeze';

const nameOf = (players: Player[], index: number | undefined, myIndex: number): string => {
  if (index === undefined) return 'Someone';
  if (index === myIndex) return 'You';
  return players[index]?.name ?? 'Someone';
};

/** Who froze whom, in a sentence that works whoever is reading it. */
const freezeLine = (moment: TableMoment, players: Player[], myIndex: number): string => {
  const by = nameOf(players, moment.byIndex, myIndex);
  const onScore = `on ${moment.value ?? 0}`;

  if (moment.byIndex === moment.playerIndex) {
    return moment.playerIndex === myIndex
      ? `You kept it and banked ${moment.value ?? 0}.`
      : `${by} kept it and banked ${moment.value ?? 0}.`;
  }
  if (moment.playerIndex === myIndex) return `${by} stopped you ${onScore}.`;
  const target = nameOf(players, moment.playerIndex, myIndex);
  return `${by} stopped ${target} ${onScore}.`;
};

export const MomentBanner: React.FC<{
  moment: TableMoment;
  players: Player[];
  myIndex: number;
}> = ({ moment, players, myIndex }) => {
  const isMe = moment.playerIndex === myIndex;

  if (moment.kind === 'freeze') {
    return (
      <div className="f7-moment f7-moment--freeze rounded-2xl px-4 py-3 mb-3 flex items-center gap-4">
        <div className="f7-moment-pair">
          <Flip7CardFace card={{ kind: 'action', action: 'freeze', id: 'moment-freeze' }} size="lg" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm sm:text-base" style={{ color: 'var(--freeze)' }}>
            Freeze
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--fg-soft)' }}>
            {freezeLine(moment, players, myIndex)} That line is banked and out of the round.
          </div>
        </div>
      </div>
    );
  }

  return (
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
            : <>{players[moment.playerIndex]?.name ?? 'They'}&rsquo;s second {moment.value} is
              discarded with it. Still in.</>}
        </div>
      </div>
    </div>
  );
};
