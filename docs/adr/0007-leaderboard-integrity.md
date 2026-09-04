# ADR-0007: Leaderboard integrity

Status: Accepted
Date: 2026-09-04

## Context

Scores are computed in the browser and written straight to Firestore. The rules
validated only ranges, so any client could write any value inside them, create
an unbounded number of documents, and there was nothing separating the three
game modes.

Endless is the sharper problem. It has no final level, so its scores are
unbounded by construction, and they landed in the same board as the campaign.
The leaderboard degraded on its own, without anyone cheating.

## Options considered

| Option                                       | Cost              | Stops                              | Leaves open                  |
| -------------------------------------------- | ----------------- | ---------------------------------- | ---------------------------- |
| One document per player, update only upwards | 3-5 h             | flood, storage cost, mixed modes   | a score typed in the console |
| Above plus App Check (reCAPTCHA v3)          | +2-4 h            | scripted clients outside a browser | an instrumented real browser |
| Cloud Function checking plausibility         | 1-2 d, Blaze plan | absurd values                      | a plausible but false score  |
| Say in the UI that the board is not verified | 2-3 h             | a wrong expectation                | everything else              |

Rejected before costing: replaying the run server-side (the engine would have to
run on Node and be kept in step with the browser copy: weeks of work for a
casual game) and signing scores client-side (the key ships in the bundle).

## Decision

One document per player per mode at `leaderboards/{mode}/scores/{uid}`, with the
UI stating that the board is social and unverified. App Check is left for the
day traffic looks wrong.

The mode lives in the path rather than a field: it cannot be forged in a
payload, each board is its own collection so no composite index is needed, and a
player has exactly one row per board to read, raise or erase.

The rules accept a create, or an update that raises the score, and nothing else.
The whole document is re-validated on update, not just the score: otherwise the
bounds checked at creation could be bypassed later, and extra fields injected.
Players can delete their own row, which the previous rules made impossible for
anyone, and that is what makes the right to erasure real rather than a promise.

## Consequences

The personal best is a single document read, so the defect where it was computed
from the first fifty of a player's runs cannot occur: it is not representable.
Run history is gone, which nothing used.

A score typed into the console still reaches the board. **This is accepted, not
overlooked**: stopping it costs a backend, and an heuristic on top of it would
still pass anything plausible. Public read is also unrestricted, so a script can
read the whole collection ignoring the ten-row limit the client asks for. At
this size that is a rounding error on cost; if the game grows, App Check on
reads is the answer.
