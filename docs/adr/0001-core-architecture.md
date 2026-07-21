# ADR 0001: Core architecture

Status: accepted

## Context

Core Dump is a real-time marble-shooter game rendered on an HTML5 canvas with a
React UI shell and an optional Firebase-backed leaderboard. The main risks are
render performance (a game loop must not re-render React every frame) and
testability of the gameplay rules.

## Decisions

### Game loop outside React state

The `GameEngine` owns a `requestAnimationFrame` loop with a fixed 120 Hz
simulation step and draws directly to the canvas via a ref. It communicates with
React only through discrete callbacks (score, level, combo, game over). React
state never changes per frame, avoiding re-render churn.

### Arc-length parametrised path

The circuit path is a Catmull-Rom spline sampled into a polyline annotated with
cumulative arc length. Packets track a scalar `distance` along the path, so they
move at uniform speed regardless of curvature and new levels are just different
waypoints.

### Distance-based chain, not per-marble physics

The chain is an ordered list of packets keyed by `distance`. Insertion splices
into the list; matching scans the run around the insertion; compaction pulls the
trailing segment forward and re-checks the junction to chain combos. This is
deterministic and unit-testable, at the cost of soft collision physics that the
spec does not require.

### Functional core, imperative shell

Pure gameplay logic (spline sampling, chain generation, match/scoring/combo,
power-up effects, score validation, level config) lives in side-effect-free
modules under `src/engine/**` and `src/config/**` and is covered by unit tests.
Canvas rendering, input, audio, and Firebase are I/O at the edges and are not
unit-tested.

### Firebase optional and lazily loaded

Online features check `isFirebaseConfigured()` (a pure env check). The Firebase
SDK is code-split into its own chunk loaded on demand and excluded from the PWA
precache, so the game installs and runs fully offline. When Firebase is absent,
the leaderboard and score saving report an unavailable state and gameplay is
unaffected.

## Consequences

- Gameplay rules can be tested without a canvas or a browser.
- Adding levels or paths requires only config changes.
- The soft "bounce" feel of some marble shooters is out of scope.
- The leaderboard requires provisioning a Firebase project and deploying the
  Firestore rules; without it the app is single-device only.
