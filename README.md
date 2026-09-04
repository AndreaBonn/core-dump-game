# Core Dump

A hacker-themed marble/tunnel shooter puzzle game, built as an installable PWA.
Data packets travel along a printed-circuit path toward a `/dev/null` void; you
rotate a CPU cursor, fire packets into the chain, and clear runs of three or more
matching packets before the chain reaches the void.

This is an original implementation of the generic marble-shooter genre. No assets,
names, or code from any existing commercial game are used.

## Stack

- React 18 + TypeScript (strict)
- Vite 6 build tooling
- HTML5 Canvas 2D for game rendering (no rendering library)
- Zustand for UI/menu/auth state (never per-frame game state)
- Firebase (Anonymous Auth + Firestore) for the online leaderboard, loaded on demand
- Vitest for unit tests, ESLint + Prettier for linting/formatting
- `vite-plugin-pwa` for offline install

## Requirements

- Node.js 24 (see `.nvmrc`; Node 20+ works)
- npm 10+

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a local URL (default http://localhost:5173).

The game runs fully offline without any configuration. The online leaderboard
and score saving require a Firebase project (see below); when it is not
configured, those features are shown as unavailable and every gameplay feature
still works.

## How to play

- Clear the chain of data packets before its front reaches `/dev/null`.
- Aim the CPU cursor at the centre of the board and fire packets into the chain.
- Line up three or more packets of the same type to make them explode.
- Explosions that trigger further matches during compaction score a combo
  multiplier (`SEGFAULT!`, `STACK OVERFLOW!`, `KERNEL PANIC!!`).
- Matched power-up packets trigger effects: `sleep()` slows the chain, `fork()`
  makes the next shot fire three spread packets, `garbage collect` removes a
  random colour, and `rollback()` retreats the chain.

### Controls

- Desktop: move the mouse to aim, left click or press Space to fire.
- Touch: tap to aim and fire in one gesture.

## Commands

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the dev server                 |
| `npm run build`         | Type-check and build for production  |
| `npm run preview`       | Preview the production build         |
| `npm test`              | Run unit tests once                  |
| `npm run test:coverage` | Run tests with a coverage report     |
| `npm run typecheck`     | Type-check without emitting          |
| `npm run lint`          | Lint the codebase                    |
| `npm run format`        | Format the codebase with Prettier    |
| `npm run icons`         | Regenerate the placeholder PWA icons |

## Project structure

```
src/
  components/   React UI: game overlays (game/), menus (menu/), shared widgets
  engine/       Game engine: loop, entities, systems, math, audio
    core/       Pure chain operations (generation, insertion, compaction)
    systems/    Collision, match/scoring, power-ups, rendering, input
  config/       Difficulty levels, packet palette, power-ups, combos, constants
  services/     Firebase init, auth, leaderboard, score validation
  store/        Zustand stores (game UI, settings, auth)
  hooks/        React hooks bridging the engine and services to components
  types/        Shared TypeScript types
tests/          Unit tests, mirroring src/ for the pure engine and services
```

## Testing

```bash
npm test
```

Unit tests cover the pure game-domain logic (chain matching, scoring, combos,
level configuration, path sampling, power-up effects, score validation). Canvas
rendering and live Firebase calls are not unit-tested by design.

## Firebase configuration (optional)

1. Create a Firebase project and a Web app in the Firebase console.
2. Copy `.env.example` to `.env` and fill in the `VITE_FIREBASE_*` values.
3. Copy `.firebaserc.example` to `.firebaserc` and set your project id.
4. Deploy the Firestore security rules: `firebase deploy --only firestore:rules`.

The `VITE_FIREBASE_*` values are read at build time, so set them before
`npm run build` when deploying.

## Deployment (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

Security headers (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`) are configured in `firebase.json`.

## Design decisions

Key architectural decisions are recorded in
[`docs/adr/0001-core-architecture.md`](docs/adr/0001-core-architecture.md).
Summary: the game loop runs outside React state and draws to the canvas
directly; the path is arc-length parametrised so packets move at uniform speed;
the chain is a distance-keyed list rather than per-marble physics; pure gameplay
logic is separated from I/O and unit-tested; Firebase is optional and lazily
loaded so the app runs offline.

## Assumptions

The specification left a few points open; the decisions taken here are:

- UI language is English, matching the technical naming (`ERROR`, `SEGFAULT!`).
- Graphics and audio are placeholders: packets are drawn as coloured rounded
  squares on the canvas and sound files are optional (see `public/audio/`).
- Google sign-in is deferred; v1 uses anonymous auth only, as required by the
  definition of done. The auth service is structured to add it later.
- Unit tests cover the pure core only, agreed as proportionate for this MVP.

## License

Licensed under the Apache License, Version 2.0. See [`LICENSE`](LICENSE).

## Privacy

The game keeps progress, stars, statistics and settings in the browser, and they
never leave the device. Saving a score to the online leaderboard sends only the
nickname you type, the score, the level reached and an anonymous account id.
Everything can be deleted from Settings, under "Privacy and your data".
