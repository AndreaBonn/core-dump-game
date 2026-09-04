# Tasks — 003-hardening-and-features

Formato: `id | dipendenze | requisito tracciato`. Stima 10-30 min per task, salvo dove indicato.
Il dettaglio (verify per step, motivazioni, rischi) è in `plan.md`.

## Blocco 0 — Rientro limiti GameEngine (comportamento invariato) [F9] — CHIUSO a 333 righe

- [x] 0.1 | - | Switch power-up estratto in `PowerUpSystem.resolvePowerUp` (`db57846`)
- [x] 0.2 | 0.1 | Test `resolvePowerUp`: 4 tipi + GARBAGE_COLLECT senza candidati
- [x] 0.3 | 0.1 | `buildLevel`/`drawType` estratti in `engine/core/levelBuilder.ts` puro (`c52aa57`)
- [x] 0.4 | 0.3 | Test `levelBuilder`: determinismo del livello a parità di config
- [x] 0.5 | 0.3 | Composizione del frame spostata in `EngineRenderer.present` (`c5c7079`)
- [x] 0.6 | 0.5 | Tastiera spostata in `InputSystem` (`b107804`)
- [x] 0.7 | 0.5 | Feedback del colpo in `VisualFx`/`AudioManager`, bounds e `isRunWon` puri (`30092f2`)
- [x] 0.8 | 0.7 | Spawn dei proiettili come funzione pura in `ShotSystem` (`c42fa12`)
- [~] 0.9 | 0.8 | Target < 300 righe rivisto a 333: le estrazioni residue richiederebbero di
  riscrivere i test che pilotano 22 membri privati. Decisione utente: accettato, vedi DoD
  Blocco 0 in `plan.md`

## Blocco 1 — Leaderboard: schema per modalità e personal best [F4, F1 strutturale]

- 1.1 | - | Test che riproduce F4 (60 documenti, massimo oltre i primi 50): rosso prima del verde
- 1.2 | - | `@firebase/rules-unit-testing` + script `test:rules`; baseline sulle rules attuali
- 1.3 | 1.2 | Nuove rules `leaderboards/{mode}/scores/{uid}` (ADR-007): create, doppia create, update minore/maggiore, delete
- 1.4 | 1.3 | `leaderboardService` sul nuovo path: `saveScore(mode)`, `fetchPersonalBest` come getDoc, `fetchTopScores(mode)`
- 1.5 | 1.4 | Propaga la modalità da `GameScreen.handleSave` e mostra la board della modalità
- 1.6 | 1.4 | Dismetti la vecchia collezione `scores` (nessun dato reale) e dichiaralo nel report

## Blocco 2 — Giocabilità mobile portrait [F2]

- 2.1 | - | `engine/core/viewport.ts` puro: `fitViewport(...)` estratto identico da `EngineRenderer.configure`
- 2.2 | - | `CONTENT_BOX` in `constants.ts` + test: waypoint dei livelli 1..50 dentro il box
- 2.3 | 2.1,2.2 | `fitViewport` sceglie il box: portrait → quadrato di contenuto, altrimenti board pieno
- 2.4 | 2.3 | Cabla in `EngineRenderer.configure`; `screenToBoard` allineato (test di round-trip)
- 2.5 | 2.4 | Layout portrait dell'HUD sotto i 640 px: board sopra, HUD sotto invece che overlay
- 2.6 | 2.5 | Verifica runtime con screenshot a 375x700 e 1280x800

## Blocco 3 — Test UI React ed E2E [F3]

- 3.1 | - | Installa Testing Library, estendi `tests/setup.ts`, primo render di `<Button>`
- 3.2 | 3.1 | Test `useGameStore`: reset run, mode preservato, gameOver, advanceLevel
- 3.3 | 3.1 | Test `useSettingsStore`: persistenza muted/nickname + `localStorage` che lancia
- 3.4 | 3.1 | Test `useLeaderboard`: loading, dati, errore
- 3.5 | 3.1 | Test `MainMenu`: i 5 pulsanti portano allo screen o al mode atteso
- 3.6 | 3.1 | Test `GameOverScreen`: submit del nickname e tutti gli stati di `SaveStatus`
- 3.7 | 3.2,3.3,3.4 | Estendi `coverage.include` a `src/store/**` e `src/hooks/**`; annota la baseline
- 3.8 | - | Installa Playwright, `playwright.config.ts` con webServer su preview, gitignore artefatti
- 3.9 | 3.8 | Spec E2E smoke: menu → campagna → tiro → score cambia; screenshot 375 e 1280

## Blocco 4 — Error boundary e prompt di aggiornamento [F5, F6]

- 4.1 | 3.1 | `components/shared/ErrorBoundary.tsx` con fallback e ricarica
- 4.2 | 4.1 | Monta il boundary in `main.tsx`
- 4.3 | 3.1 | `registerType: 'prompt'` + componente `UpdatePrompt` (z-index toast 500)
- 4.4 | 4.3 | Verifica manuale: build, preview, secondo build, ricarica, compare il prompt

## Blocco 5 — CI e manutenzione dipendenze [F7]

- 5.1 | - | Allinea i trigger del workflow al branch reale
- 5.2 | 3.7 | Step coverage con soglia esplicita [DEC5], fissata sulla baseline misurata
- 5.3 | 3.9 | Job E2E Playwright con upload degli screenshot come artefatto
- 5.4 | - | `.github/dependabot.yml` (npm settimanale + github-actions)
- 5.5 | - | [DEC1] Workflow di deploy su Firebase Hosting, solo con un progetto reale

## Blocco B — Retention meta [piano 002, Incremento B]

- B0 | 0.6 | `onRunEnd(RunResult)` in `EngineEvents` + forward in `GameCanvas` + store (i 3 punti del confine)
- B1 | - | `engine/core/stars.ts`: `starsFor(levelScore, thresholds)` puro + test
- B2 | B1 | `starThresholdsFor(level)` derivate dal tuning, definite anche oltre `TOTAL_LEVELS`
- B3 | - | `engine/core/stats.ts`: riduttori puri da eventi + test
- B4 | B2,B3 | `useProgressStore` su `coredump.progress`, reader difensivo
- B5 | - | `engine/core/achievements.ts`: catalogo (>= 15) + `evaluate(state)` + test
- B6 | B5,B0 | `useAchievementsStore` persistito, agganciato a `onRunEnd`
- B7 | B4 | `LevelSelect.tsx` con stelle; avvio da livello via `RunConfig.startIndex`
- B8 | B4,B6 | `Profile.tsx` (stats) e `Achievements.tsx` (griglia)
- B9 | B6 | Cabla gli eventi engine→store a fine run
- B10 | B6 | Toast di sblocco achievement (z-index 500)
- B11 | B7,B8 | Stati mancanti delle viste nuove: loading, empty, error, edge; render a 375 e 1280

## Blocco C — Varietà gameplay [piano 002, Incremento C]

- C1 | - | Test di caratterizzazione su `MatchSystem.findRun` e `chainOps` (passano su HEAD)
- C2 | C1 | `matchable: boolean` su `DataPacket` + guardia in `findRun` + test hazard
- C3 | C2 | Generazione hazard in `generateChainPackets`, chance da `LevelConfig`, cappata
- C4 | C3 | Render distinto dell'hazard (non solo colore: forma o glifo, per daltonismo)
- C5 | 0.1 | Estendi `PowerUpType` e `powerUps.ts` con kill-9, try/catch, regex
- C6 | C5 | `PowerUpSystem`: `killRange`, `applyShield`, `removeType` puri + test
- C7 | C6 | Cabla i nuovi power-up in `resolvePowerUp` e lo scudo nel percorso di game over
- C8 | 2.2 | `buildSerpentine` e `buildLoop` in `paths.ts` + test invarianti + waypoint nel content box
- C9 | C8,C3 | `pathKindFor(level)` derivato in `buildLevelConfig` e chance hazard per livello
- C10 | C7,C9 | Bilanciamento e verifica runtime: nessun soft-lock da hazard

## Blocco D — Onboarding e rifiniture [piano 002, Incremento D]

- D1 | 0.6 | Hit-stop: `hitStopFrames` che salta step interi, mai `dt` frazionario + test
- D2 | D1 | Trigger hit-stop da `outcome.combo`, soglie da costante nominata
- D3 | - | Tracer del proiettile in `VisualFx` + disegno in `RenderSystem` (view-only)
- D4 | D1,D3 | Reduced-motion sopprime hit-stop e tracer
- D5 | B0 | Mode `tutorial` in `runController` con levelProvider scriptato
- D6 | D5 | `TutorialOverlay.tsx` con step e hint contestuali
- D7 | D6 | Flag `coredump.tutorialSeen`: auto-avvio, skip, rigiocabile da menu
- D8 | D7,3.9 | Spec E2E che completa il tutorial dall'inizio alla fine

## Blocco 6 — Licenza, privacy, cancellazione [F8]

- 6.1 | - | [DEC2] Aggiungi `LICENSE` e aggiorna la sezione License del README
- 6.2 | - | Informativa privacy raggiungibile in-app da Settings
- 6.3 | 1.3 | Verifica che la `delete` del proprietario copra il caso reale dalla UI
- 6.4 | 6.2 | Documenta la retention (TTL proposto 12 mesi, o la scelta di non averla)
- 6.5 | 6.3 | UI "cancella i miei punteggi" con conferma

## Blocco 7 — F1, parte non strutturale

- 7.1 | 1.4 | Scrivi `docs/adr/0007-leaderboard-integrity.md` e `0008-portrait-viewport.md`
- 7.2 | 7.1 | Copy in UI: la classifica è sociale e non verificata
- 7.3 | - | [DEC3/DEC1] App Check con reCAPTCHA v3, solo se si decide di attivarlo
- 7.4 | 7.3 | CSP in `firebase.json` estesa ai domini reCAPTCHA

## Blocco E — Boss entity [piano 002, Incremento E]

- E0 | C10 | [DEC4] Design doc regole boss (HP, fasi, danno, attacchi), time-box mezza giornata, poi ri-pianificazione

## Requisiti → blocco

- F1 anti-cheat → 1.2-1.4 (strutturale), 7.1-7.4 (rifiniture)
- F2 mobile portrait → Blocco 2
- F3 test UI/E2E → Blocco 3
- F4 personal best → 1.1, 1.4
- F5 error boundary → 4.1, 4.2
- F6 prompt update PWA → 4.3, 4.4
- F7 CI/dependabot/deploy → Blocco 5
- F8 licenza e privacy → Blocco 6
- F9 GameEngine < 300 righe → Blocco 0, riverificato in C7 e D2
- feature 1-2 (Endless, Daily) → già fatte nell'Incremento A di 002
- feature 3 juice → D1-D4
- feature 4 achievements → B5, B6, B8, B10
- feature 5 power-up/hazard → C2-C7
- feature 6 boss → E0
- feature 7 path → C8, C9
- feature 8 tutorial → D5-D8
- feature 9 progressi+stelle → B1, B2, B4, B7
- feature 10 statistiche → B3, B4, B8
