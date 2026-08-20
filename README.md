# flip7

A web version of **Flip 7**, the push-your-luck card game. Hit for one more card, or bank what you have before a duplicate takes the lot.

Built on [@laurelwood/card-class](https://github.com/745laurelwood/card-class), the shared skin behind the other Laurelwood games.

## Rules

### The deck

94 cards.

**Number cards (79).** 0 through 12, and each number appears as many times as its value: twelve 12s, eleven 11s, on down to a single 1, plus one lone 0. That weighting is the whole game — the big cards are worth the most and are also the likeliest to come back and bust you.

**Modifiers (6).** One each of +2, +4, +6, +8, +10 and ×2.

**Action cards (9).** Three each of Freeze, Flip Three and Second Chance.

### Your turn

**Hit** to take one card, or **Stay** to bank what is in front of you and sit out the rest of the round.

Draw a number you already have and you **bust**: out of the round, scoring nothing at all, however good the line looked.

### Flip 7

Get **seven different numbers** in front of you and the round ends immediately for everyone, with **15 bonus points** to you. Modifiers and action cards do not count towards the seven.

### Action cards

Draw one and you choose who it lands on, yourself included. If you are the last player still in the round, it lands on you.

- **Freeze** — that player stays right now, banking whatever they have.
- **Flip Three** — that player draws three cards, one at a time. Busting stops the run, and anything they turn up along the way waits until it is over.
- **Second Chance** — that player holds it against a duplicate. Nobody holds two: a spare goes to someone without one, or is discarded.

### Scoring

Add up your number cards. A ×2 doubles **that total only**. Then add the +N modifiers, and 15 more if you flipped 7.

So 3 + 4 + 12 with a ×2 and a +10 is 19, doubled to 38, then 48.

Busting scores nothing.

### Winning

At the end of the round in which anyone reaches **200**, the highest score wins.

## Run locally

```bash
npm install
npm run dev
```

It serves on port 3007, so it can run alongside the other games.

## What is here

Two to eight players against bots. The bots reason from public information only — the deck list is on the box and every card in play is face up — so they estimate a bust chance from what is showing rather than from the draw pile.

Multiplayer rooms are not wired up yet; that is the next piece.
