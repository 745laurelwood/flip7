import React from 'react';
import {
  FLIP_7_BONUS, FLIP_7_COUNT, MAX_NUMBER, MODIFIERS, WINNING_SCORE,
} from '../rules';
import { ActionKind, Flip7Card, ModifierKind } from '../types';
import { Flip7CardFace } from './Flip7Card';
import { Pips, StatusBadge } from './PlayerLine';

/**
 * The rules, shown with the cards they are about.
 *
 * Every card on this page is the same component the table draws, so a Freeze
 * here is the Freeze you will be handed, down to the colour. Nothing is a
 * screenshot and nothing can drift out of date.
 */

const num = (value: number, tag = ''): Flip7Card =>
  ({ kind: 'number', value, id: `rb-n${value}${tag}` });
const mod = (modifier: ModifierKind): Flip7Card =>
  ({ kind: 'modifier', modifier, id: `rb-m-${modifier}` });
const act = (action: ActionKind): Flip7Card =>
  ({ kind: 'action', action, id: `rb-a-${action}` });

/** A few numbers spread across the ramp, to show what it is telling you. */
const SAMPLE_NUMBERS = [0, 3, 7, 12];

/** Seven different numbers: what ending a round looks like. */
const A_SEVEN = [2, 9, 0, 12, 5, 7, 11];

const ACTION_NOTES: { action: ActionKind; name: string; text: React.ReactNode }[] = [
  {
    action: 'freeze',
    name: 'Freeze',
    text: 'That player stays right now, banking whatever they have.',
  },
  {
    action: 'flipThree',
    name: 'Flip Three',
    text: 'That player draws three cards, one at a time. Busting stops the run, and anything they turn up along the way waits until it is over.',
  },
  {
    action: 'secondChance',
    name: 'Second Chance',
    text: 'You keep it, and it saves you from the first duplicate you draw. Nobody holds two, so a spare goes to someone without one, or is discarded.',
  },
];

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title, children, className = 'mb-8',
}) => (
  <section className={className}>
    <h2 className="font-display text-xl sm:text-2xl mb-3">{title}</h2>
    {children}
  </section>
);

const P: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = 'mb-3',
}) => (
  <p className={className} style={{ color: 'var(--fg-soft)' }}>{children}</p>
);

/** A worked example, boxed off from the prose it belongs to. */
const Example: React.FC<{ children: React.ReactNode; note?: React.ReactNode }> = ({
  children, note,
}) => (
  <div
    className="rounded-2xl px-3 py-3 mb-4"
    style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
  >
    {children}
    {note && (
      <div className="text-xs mt-2.5" style={{ color: 'var(--dim)' }}>{note}</div>
    )}
  </div>
);

export const Rulebook: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 200, background: 'var(--bg)', color: 'var(--fg)' }}>
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12 relative" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)' }}>
      <button
        onClick={onClose}
        aria-label="Close rulebook"
        className="sticky float-right w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[color:var(--bg-2)]"
        style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', color: 'var(--fg-soft)', top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        title="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <header className="mb-8 pt-2">
        <h1 className="font-display text-3xl sm:text-4xl mb-1" style={{ color: 'var(--accent)' }}>Flip 7 — Rulebook</h1>
        <p className="text-xs sm:text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>Push your luck</p>
      </header>

      <Section title="The deck">
        <P>
          94 cards. The number cards run 0 to {MAX_NUMBER}, and each number appears as many times as
          its value &mdash; twelve 12s, a single 1, and one lone 0. That is the whole tension of the
          game: the big cards are worth the most and are also the likeliest to come back and bust you.
        </P>
        <Example note="A number's colour runs with how many of it are out there, so the card only shows you what the odds already say.">
          <div className="f7-line">
            {SAMPLE_NUMBERS.map(v => <Flip7CardFace key={v} card={num(v)} />)}
          </div>
        </Example>

        <P>
          Six modifiers add to your score at the end of the round. None of them count towards the
          seven.
        </P>
        <Example>
          <div className="f7-line">
            {MODIFIERS.map(m => <Flip7CardFace key={m} card={mod(m)} />)}
          </div>
        </Example>

        <P className="mb-0">
          And nine action cards: three each of Freeze, Flip Three and Second Chance.
        </P>
      </Section>

      <Section title="Your turn">
        <P>
          <strong>Hit</strong> to take one card, or <strong>Stay</strong> to bank what is in front of
          you and sit out the rest of the round.
        </P>
        <P>
          Draw a number you already have and you <strong>bust</strong>: out of the round, scoring
          nothing at all, however good the line looked.
        </P>
        <Example note="The pair that did it stays in colour. Everything else on a dead line goes grey.">
          <div className="f7-line">
            <Flip7CardFace card={num(8)} faded />
            <Flip7CardFace card={num(4, 'a')} faded duplicate />
            <Flip7CardFace card={num(11)} faded />
            <Flip7CardFace card={num(4, 'b')} faded duplicate />
          </div>
        </Example>
      </Section>

      <Section title="Flip 7">
        <P>
          Get {FLIP_7_COUNT} different numbers in front of you and the round ends immediately for
          everyone, with <strong>{FLIP_7_BONUS} bonus points</strong> to you. Modifiers and action
          cards do not count towards the seven.
        </P>
        <Example note={<>Seven different numbers, worth 46 plus the {FLIP_7_BONUS}.</>}>
          <div className="f7-line">
            {A_SEVEN.map(v => <Flip7CardFace key={v} card={num(v)} size="sm" />)}
          </div>
        </Example>
      </Section>

      <Section title="Action cards">
        <P>
          Draw a Freeze or a Flip Three and you choose who it lands on, yourself included. If you are
          the last player still in the round, it lands on you. A Second Chance is not a choice: it is
          yours. Only a spare, drawn when you are already holding one, has to be given away.
        </P>
        <ul className="space-y-3" style={{ color: 'var(--fg-soft)' }}>
          {ACTION_NOTES.map(({ action, name, text }) => (
            <li key={action} className="flex items-start gap-3">
              <Flip7CardFace card={act(action)} />
              <span className="pt-1"><strong>{name}:</strong> {text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Scoring">
        <P>
          Add up your number cards. A &times;2 doubles <em>that total only</em>. Then add the +N
          modifiers, and {FLIP_7_BONUS} more if you flipped 7.
        </P>
        <Example
          note={
            <span className="tabular-nums">
              3 + 4 + 12 = <strong style={{ color: 'var(--fg-soft)' }}>19</strong>
              {' · '}the &times;2 doubles that to <strong style={{ color: 'var(--fg-soft)' }}>38</strong>
              {' · '}then the +10 makes <strong style={{ color: 'var(--gold)' }}>48</strong>
            </span>
          }
        >
          <div className="f7-line">
            {[3, 4, 12].map(v => <Flip7CardFace key={v} card={num(v)} />)}
          </div>
          <div className="f7-line f7-line--extras">
            <Flip7CardFace card={mod('x2')} size="sm" />
            <Flip7CardFace card={mod('plus10')} size="sm" />
          </div>
        </Example>
        <P className="mb-0">Busting scores nothing at all.</P>
      </Section>

      <Section title="Reading the table">
        <P>
          Seven pips beside a name are how close that line is to ending the round. They turn gold at
          six, which is the point at which everyone else needs to know.
        </P>
        <Example note="Three of seven, then six of seven.">
          <div className="flex items-center gap-5">
            <Pips filled={3} />
            <Pips filled={6} />
          </div>
        </Example>

        <P>
          Numbers sit on the top row and everything else underneath, so the top row of a seat is
          always the count and nothing below it moves anyone closer to seven.
        </P>
        <Example>
          <div className="f7-line">
            {[6, 9].map(v => <Flip7CardFace key={v} card={num(v)} />)}
          </div>
          <div className="f7-line f7-line--extras">
            <Flip7CardFace card={mod('plus4')} size="sm" />
            <Flip7CardFace card={act('secondChance')} size="sm" held />
          </div>
        </Example>

        <P>
          A seat that has stopped says why. Staying was their choice; being frozen was not.
        </P>
        <Example>
          <div className="flex items-center gap-5">
            <StatusBadge status="stayed" />
            <StatusBadge status="stayed" frozen />
            <StatusBadge status="busted" />
            <StatusBadge status="flipped7" />
          </div>
        </Example>

        <P className="mb-0">
          Anyone out of the round goes quiet, so the seats still deciding are the ones that stand out.
        </P>
      </Section>

      <Section title="Winning" className="mb-10">
        <P className="mb-0">
          At the end of the round in which anyone reaches <strong>{WINNING_SCORE}</strong>, the highest
          score wins.
        </P>
      </Section>

      <div className="text-center py-4">
        <button onClick={onClose} className="btn-accent px-6 py-2.5 rounded-xl text-sm sm:text-base font-semibold">
          Back
        </button>
      </div>
    </div>
  </div>
);
