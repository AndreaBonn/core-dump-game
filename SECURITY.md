**English** | [Italiano](./SECURITY.it.md)

# Security Policy

Core Dump is a client-side browser game. The hosted build has no server of its own: the only backend it can talk to is a Firebase project that the person deploying it owns, and only when they configure it. When a player starts the game with the local launcher, a Vite server on their machine also serves a save-file route. The attack surface is the leaderboard write path, the hosting configuration, and that local save route.

## Supported Versions

The repository has no release tags. Security updates are applied to the latest commit on the `main` branch.

## Reporting a Vulnerability

To report a security vulnerability, use [GitHub Security Advisories](https://github.com/AndreaBonn/core-dump-game/security/advisories/new).

Please include:

- Description of the vulnerability
- Steps to reproduce
- Expected versus actual behaviour
- Impact assessment: what an attacker could achieve

Response timeline:

- Acknowledgment within 72 hours
- Fix for critical issues within 30 days
- Coordinated public disclosure after the fix is released

## Security Measures Implemented

Each item below was verified in the code of this repository.

- **Server-side validation of every leaderboard write**: the Firestore rules re-validate the whole document on create and on update, not just the changed field, so bounds checked at creation cannot be bypassed later and extra fields cannot be injected (`firestore.rules:14`, `firestore.rules:39`).
- **Document ownership**: a player can only write the document whose id equals their own uid, and the payload `userId` must match both the path and the authenticated uid (`firestore.rules:32`).
- **Mode in the path, not in the payload**: the leaderboard mode is a path segment, so it cannot be forged in the document body (`firestore.rules:8`).
- **Monotonic scores**: an update is accepted only when the new score is strictly greater than the stored one, which caps the number of writes a client can usefully make (`firestore.rules:39`).
- **Bounded fields**: score is an integer in `[0, 1000000)`, level in `[1, 100]`, display name a non-empty string of at most 24 characters, timestamp equal to the server time (`firestore.rules:14`).
- **Client-side normalisation before the write**: scores, levels and nicknames are clamped and trimmed to the ranges the rules accept, so a malformed local state is rejected before it reaches the network (`src/services/scoreValidation.ts:10`, `src/services/scoreValidation.ts:29`).
- **Right to erasure**: a player can delete their own leaderboard row, and nobody else's (`firestore.rules:46`, `src/services/leaderboardService.ts:95`).
- **Local save route limited to this machine and to same-origin requests**: `GET` and `PUT /api/save` are refused with 403 unless the `Host` header is `localhost`, `127.0.0.1` or `[::1]`, and unless the browser's `Origin` matches that host. The first check stops DNS rebinding, where the attacker's domain resolves to 127.0.0.1 and `Origin` and `Host` both name that domain; it lives in the route itself because the route is mounted before Vite's own host validation. The second stops a page on another site from reading or overwriting the save (`scripts/lib/saveFile.mjs:46`, `scripts/lib/saveFile.mjs:24`, `scripts/lib/saveFile.mjs:80`).
- **Bounded and well-formed save writes**: a body over 64 KB is cut off while it is still being read and answered with 413; anything that is not a JSON object is refused with 400; the file is written to a temporary sibling and renamed, so an interrupted write leaves the previous save intact (`scripts/lib/saveFile.mjs:11`, `scripts/lib/saveFile.mjs:91`, `scripts/lib/saveFile.mjs:143`).
- **Save contents re-validated on load**: the profile read back from the file is parsed field by field with type checks and fallbacks before it is merged, so a malformed file degrades to an empty profile instead of breaking the game (`src/store/useProgressStore.ts:91`).
- **Anonymous authentication only**: no password, no email, no credential is ever handled by the game. Sign-in failure degrades to offline behaviour instead of throwing (`src/services/authService.ts:10`).
- **Security headers on the hosted build**: `Content-Security-Policy` with `default-src 'self'`, `object-src 'none'` and `frame-ancestors 'none'`, plus HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin` (`firebase.json`).
- **No HTML injection surface**: the interface is React with no `dangerouslySetInnerHTML`, no `innerHTML` assignment and no `eval` anywhere in `src/`.
- **Dependency pinning and updates**: `package-lock.json` is committed and Dependabot opens weekly grouped updates for npm and GitHub Actions (`.github/dependabot.yml`).
- **Security rules under test**: the Firestore rules run against the emulator in CI, in a dedicated job (`.github/workflows/ci.yml`).

### Not implemented

Stated explicitly, because absence is easier to misread than presence:

- **No rate limiting.** Nothing limits how often an authenticated client can attempt a write. The monotonic-score rule bounds useful writes, not attempts.
- **No `npm audit` or equivalent scanner in CI.** Dependency updates rely on Dependabot alone.
- **No server-side verification that a score is reachable.** Scores are computed in the browser; the rules enforce shape and bounds, not plausibility. A determined client can submit any value inside those bounds.

## Security Best Practices for Deployers

The `VITE_FIREBASE_*` values are Firebase Web SDK configuration: they are public by design and end up in the built bundle. They are not secrets, and the security boundary is elsewhere. What matters when deploying:

- Deploy the Firestore rules in this repository (`firebase deploy --only firestore:rules`). Without them, the default rules of the project apply, and the guarantees listed above do not exist.
- Keep Anonymous Auth as the only enabled sign-in provider unless you add and review another one.
- Serve over HTTPS and keep the headers in `firebase.json`, which is what makes the CSP effective.
- Keep `.env` and `.firebaserc` out of version control, as `.gitignore` already does.

## Out of Scope

The following are not considered vulnerabilities for this project:

- Submitting an implausibly high but in-range score from a modified client. Scores are computed client side by design, and this is documented above rather than defended against.
- Self-XSS, meaning attacks that require the victim to paste code into their own console.
- Reading or altering the local profile in `localStorage` or in `save/progress.json` from the player's own machine. Both belong to the player and hold no credentials.
- Social engineering and physical attacks.
- Publicly disclosed vulnerabilities in third-party dependencies. Report those upstream.
- Denial of service through excessive legitimate use.

## Acknowledgments

Security researchers who responsibly disclose vulnerabilities will be listed here.

---

[Back to README](./README.md)
