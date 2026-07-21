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
- Firebase (Anonymous Auth + Firestore) for the online leaderboard
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

## Commands

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the dev server                 |
| `npm run build`         | Type-check and build for production   |
| `npm run preview`       | Preview the production build          |
| `npm test`              | Run unit tests once                  |
| `npm run test:coverage` | Run tests with a coverage report     |
| `npm run typecheck`     | Type-check without emitting          |
| `npm run lint`          | Lint the codebase                    |
| `npm run format`        | Format the codebase with Prettier    |

## Firebase configuration (optional)

1. Create a Firebase project and a Web app in the Firebase console.
2. Copy `.env.example` to `.env` and fill in the `VITE_FIREBASE_*` values.
3. Copy `.firebaserc.example` to `.firebaserc` and set your project id.
4. Deploy the Firestore security rules: `firebase deploy --only firestore:rules`.

## Testing

```bash
npm test
```

Unit tests cover the pure game-domain logic (chain matching, scoring, combos,
level configuration, path sampling). Canvas rendering and live Firebase calls are
not unit-tested by design.

## License

Not yet specified.
