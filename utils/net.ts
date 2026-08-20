import { Flip7Card, GameState } from '../types';

export const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';

export const roomTopic = (roomId: string): string => `flip7_game_${roomId}`;

/**
 * What goes on the wire.
 *
 * Flip 7 has no hidden hands — every card in play is face up in front of its
 * owner, which is why there is no separate spectator feed here the way there
 * is in the trick-taking games. The one secret is the draw pile, so it is
 * replaced with blanks of the same length: the table shows how many cards are
 * left without anyone being able to read what is coming.
 */
export const redactForWire = (state: GameState): GameState => ({
  ...state,
  deck: state.deck.map((_, i) => FACE_DOWN(i)),
});

const FACE_DOWN = (i: number): Flip7Card => ({ kind: 'number', value: -1, id: `hidden-${i}` });

/** True for a state that came off the wire, whose deck is blanks. */
export const isRedacted = (state: GameState): boolean =>
  state.deck.some(c => c.kind === 'number' && c.value === -1);
