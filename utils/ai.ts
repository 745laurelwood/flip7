import { ActionKind, Flip7Card, GameState, Player } from '../types';
import { createDeck } from './deck';
import { FLIP_7_COUNT, numberCardCount, numbersIn, scoreLine, scorePlayer } from '../rules';

/**
 * Bots reason from what anyone at the table could see: the deck list is on the
 * box, and every card in play is face up. They do not look at the draw pile.
 */
function unseenNumberCounts(state: GameState): { counts: Map<number, number>; total: number } {
  const counts = new Map<number, number>();
  for (let v = 0; v <= 12; v++) counts.set(v, numberCardCount(v));

  const seen: Flip7Card[] = [
    ...state.players.flatMap(p => p.line),
    ...state.discard,
  ];
  for (const card of seen) {
    if (card.kind !== 'number') continue;
    counts.set(card.value, Math.max(0, (counts.get(card.value) ?? 0) - 1));
  }

  // Every unseen card, not just the numbers — a modifier or action is a card
  // the draw can land on too, and neither of them busts you.
  const totalCards = createDeck().length - seen.length;
  return { counts, total: Math.max(1, totalCards) };
}

/** Chance the next card busts this player, from public information alone. */
export function bustChance(state: GameState, player: Player): number {
  if (player.hasSecondChance) return 0;
  const mine = new Set(numbersIn(player.line));
  if (mine.size === 0) return 0;

  const { counts, total } = unseenNumberCounts(state);
  let deadly = 0;
  for (const v of mine) deadly += counts.get(v) ?? 0;
  return Math.min(1, deadly / total);
}

/**
 * Whether a bot takes another card.
 *
 * The trade is the whole game: hitting risks everything already in front of
 * you against one more card. A bot hits while the expected gain clears the
 * expected loss, and leans in when it is one card from a Flip 7, because the
 * bonus and the round ending are worth reaching for.
 */
export function shouldHit(state: GameState, player: Player): boolean {
  const standing = scoreLine(player.line, { busted: false });
  const uniques = new Set(numbersIn(player.line)).size;

  // Nothing to lose yet.
  if (standing === 0) return true;
  // A held Second Chance makes the next card free.
  if (player.hasSecondChance) return true;

  const risk = bustChance(state, player);
  const { counts, total } = unseenNumberCounts(state);

  // Average value of a number card still out there, as the reward side.
  let weighted = 0;
  let numbers = 0;
  for (const [value, count] of counts) {
    weighted += value * count;
    numbers += count;
  }
  const averageDraw = numbers > 0 ? weighted / numbers : 0;
  // Only some draws are numbers; the rest are modifiers and actions, which are
  // never worse than neutral.
  const gain = averageDraw * (numbers / total);

  const oneAway = uniques === FLIP_7_COUNT - 1;
  const prize = oneAway ? gain + 15 : gain;

  return (1 - risk) * prize > risk * standing;
}

/** Everyone still in the round who isn't this bot. */
const opponents = (state: GameState, self: number): Player[] =>
  state.players.filter(p => p.id !== self && p.status === 'active');

/**
 * Where a bot points an action card.
 *
 * Freeze and Flip Three are weapons; Second Chance is a gift, so it goes to
 * whoever helps the bot least.
 */
export function chooseTarget(state: GameState, self: number, action: ActionKind): number {
  const others = opponents(state, self);
  if (others.length === 0) return self;
  const me = state.players[self];

  if (action === 'freeze') {
    // Freezing banks the target's points, so it is a poor attack on a leader
    // and a good one on somebody close to a Flip 7 — it takes the bonus and
    // the round-ending away from them.
    const closest = others
      .filter(p => new Set(numbersIn(p.line)).size >= FLIP_7_COUNT - 3)
      .sort((a, b) => new Set(numbersIn(b.line)).size - new Set(numbersIn(a.line)).size)[0];
    if (closest) return closest.id;

    // Otherwise use it on itself if its own position is worth protecting.
    if (scorePlayer(me) > 0 && bustChance(state, me) > 0.35) return self;

    // Failing that, shut down whoever has least on the table, since they lose
    // the most by being stopped early.
    return [...others].sort((a, b) => scorePlayer(a) - scorePlayer(b))[0].id;
  }

  if (action === 'flipThree') {
    // Three forced draws hurt whoever is likeliest to hit a duplicate.
    const ranked = [...others].sort((a, b) => bustChance(state, b) - bustChance(state, a));
    const worst = ranked[0];
    if (bustChance(state, worst) > 0.15) return worst.id;
    // Nobody is really exposed, so take the cards — three free draws on an
    // empty line is a good deal.
    if (bustChance(state, me) < 0.15) return self;
    return worst.id;
  }

  // Second Chance: keep it unless already holding one, then hand it to the
  // opponent it helps least.
  if (!me.hasSecondChance) return self;
  const takers = others.filter(p => !p.hasSecondChance);
  if (takers.length === 0) return self;
  return [...takers].sort((a, b) => a.total - b.total)[0].id;
}
