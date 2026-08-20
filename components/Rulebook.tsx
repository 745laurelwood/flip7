import React from 'react';
import { FLIP_7_BONUS, FLIP_7_COUNT, MAX_NUMBER, MODIFIERS, WINNING_SCORE } from '../rules';
import { ActionKind } from '../types';
import { Flip7CardFace } from './Flip7Card';

/** A few numbers spread across the ramp, to show what it is telling you. */
const SAMPLE_NUMBERS = [0, 3, 7, 12];

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
    text: 'That player holds it against a duplicate. Nobody holds two \u2014 a spare goes to someone without one, or is discarded.',
  },
];

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

      <section className="mb-8">
        <h2 className="font-display text-xl sm:text-2xl mb-3">The deck</h2>
        <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
          94 cards. The number cards run 0 to {MAX_NUMBER}, and each number appears as many times as
          its value &mdash; twelve 12s, a single 1, and one lone 0. That is the whole tension of the
          game: the big cards are worth the most and are also the likeliest to come back and bust you.
        </p>
        <div className="f7-line mb-4">
          {SAMPLE_NUMBERS.map(value => (
            <Flip7CardFace key={value} card={{ kind: 'number', value, id: `rule-n${value}` }} />
          ))}
        </div>
        <p className="mb-4" style={{ color: 'var(--fg-soft)' }}>
          A number's colour runs with how many of it are out there: the lone 0 is a cold slate and the
          twelve 12s are as hot as the deck gets. The card only shows you what the odds already say.
        </p>
        <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
          Six modifiers (+2, +4, +6, +8, +10 and &times;2) and nine action cards &mdash; three each of
          Freeze, Flip Three and Second Chance &mdash; make up the rest.
        </p>
        <div className="f7-line">
          {MODIFIERS.map(modifier => (
            <Flip7CardFace key={modifier} card={{ kind: 'modifier', modifier, id: `rule-${modifier}` }} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl sm:text-2xl mb-3">Your turn</h2>
        <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
          <strong>Hit</strong> to take one card, or <strong>Stay</strong> to bank what is in front of
          you and sit out the rest of the round.
        </p>
        <p style={{ color: 'var(--fg-soft)' }}>
          Draw a number you already have and you <strong>bust</strong>: out of the round, scoring
          nothing at all, however good the line looked.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl sm:text-2xl mb-3">Flip 7</h2>
        <p style={{ color: 'var(--fg-soft)' }}>
          Get {FLIP_7_COUNT} different numbers in front of you and the round ends immediately for
          everyone, with <strong>{FLIP_7_BONUS} bonus points</strong> to you. Modifiers and action
          cards do not count towards the seven.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl sm:text-2xl mb-3">Action cards</h2>
        <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
          Draw one and you choose who it lands on, yourself included. If you are the last player still
          in the round, it lands on you.
        </p>
        <ul className="space-y-3" style={{ color: 'var(--fg-soft)' }}>
          {ACTION_NOTES.map(({ action, name, text }) => (
            <li key={action} className="flex items-start gap-3">
              <Flip7CardFace card={{ kind: 'action', action, id: `rule-${action}` }} />
              <span className="pt-1"><strong>{name}:</strong> {text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl sm:text-2xl mb-3">Scoring</h2>
        <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
          Add up your number cards. A &times;2 doubles <em>that total only</em>. Then add the +N
          modifiers, and {FLIP_7_BONUS} more if you flipped 7. So 3 + 4 + 12 with a &times;2 and a +10
          is 19, doubled to 38, then 48.
        </p>
        <p style={{ color: 'var(--fg-soft)' }}>
          At the end of the round in which anyone reaches <strong>{WINNING_SCORE}</strong>, the highest
          score wins.
        </p>
      </section>

      <div className="text-center py-4">
        <button onClick={onClose} className="btn-accent px-6 py-2.5 rounded-xl text-sm sm:text-base font-semibold">
          Back
        </button>
      </div>
    </div>
  </div>
);
