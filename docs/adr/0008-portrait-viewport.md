# ADR-0008: Fitting the board on a portrait screen

Status: Accepted
Date: 2026-09-04

## Context

The board is 960x600 and the canvas fitted all of it. On a 375x700 phone the
width sets the scale, so the game sat in a 375x234 strip with packets about six
pixels across: measured, not estimated. The specification lists "playable on
mobile" as a completion criterion, so this was a gap, not a nicety.

The non-obvious part: rotating does not help. In landscape 700x375 the scale is
`min(700/960, 375/600) = 0.625`, the same figure a portrait board would give.
What sets the multiplier is the short side of the viewport against the long side
of the board, not the orientation.

## Options considered

| Option                                     | Impact                                 | Determinism                             | Cost                     |
| ------------------------------------------ | -------------------------------------- | --------------------------------------- | ------------------------ |
| Fit the square the game occupies           | viewport only                          | untouched                               | half a day               |
| Rotate the rendering 90 degrees            | pointer mapping, HUD alignment         | untouched                               | more, for the same scale |
| Board dimensions derived from the viewport | paths, collisions, level tuning, tests | a seed plays differently on each device | 2-3 days                 |
| Ask the player to rotate                   | none                                   | untouched                               | minimal, and not a fix   |

## Decision

Fit a square region of interest instead of the whole board. In portrait that is
the area the levels actually draw in, centred on the board centre and sized from
the widest starting radius a level can ask for plus one packet radius.

`BOARD_WIDTH`, `BOARD_HEIGHT`, the paths, the collisions and the seeds are
untouched, so the same daily challenge plays identically on every device. Only
the mapping from board to screen changed, and it is a pure function with a
round-trip test, so pointer input still lands where the player aimed.

Board dimensions derived from the viewport were rejected for exactly that: the
daily challenge would stop being the same game on two phones, which is its only
reason to exist.

## Consequences

At 375 px wide the play area goes from 375x234 to 375x375 and a packet from
about 6 to about 21 px. The desktop transform is unchanged bit for bit, held by
a test.

Anything a level draws outside that square would be cropped on a phone, so a
test walks fifty levels, including the extrapolated ones an endless run reaches,
and fails if a waypoint falls outside. Any new track shape has to pass it.

Still open: about 21 px is better but not generous for a finger, and the real
limit is that a tap aims and fires in the same gesture, so there is no chance to
correct before releasing. If portrait still feels awkward, tap-to-aim with a
separate confirm is the next thing to try, not more scaling.
