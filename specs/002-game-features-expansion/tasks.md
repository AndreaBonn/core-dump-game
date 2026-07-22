# Tasks — 002-game-features-expansion

Formato: `id | dipendenze | requisito tracciato`. Stima 10-30 min per task.

## Incremento A — Fondamenta (refactor engine/mode + Endless + Daily)
- A1 | - | Test regressione campagna deterministica end-to-end (core seed→outcome)
- A2 | A1 | Estrai applyPowerUp → PowerUpSystem.applyPowerUp + test
- A3 | A2 | Oggetto-dato RunState (score/level/phase/sleepTimer/pendingFork)
- A4 | A3 | RunConfig union + LevelProvider in types/game.types.ts
- A5 | A4 | runController.ts puro: levelProviderFor(config) + test [Endless]
- A6 | A4 | dailySeed.ts puro: dailySeed(date) deterministico + test [Daily]
- A7 | A5,A6 | Cabla RunConfig in GameEngine (startRun(config), completeLevel via levelProvider→null)
- A8 | A7 | Evento onRunEnd(RunResult) in EngineEvents + forward GameCanvas + store
- A9 | A8 | MainMenu selezione modalita → RunConfig a GameScreen/GameCanvas
- A10 | A7 | Verifica GameEngine.ts < 300 righe; estrai residui se serve

## Incremento B — Retention meta (progressi+stelle + stats + achievements)
- B1 | A | stars.ts puro: starsFor(levelScore, thresholds) + test [feature 9]
- B2 | B1 | starThresholds in LevelConfig per i 10 livelli
- B3 | A | stats.ts puro: riduttori statistiche da eventi + test [feature 10]
- B4 | B1,B3 | useProgressStore.ts persistito (progressi+stelle+stats)
- B5 | A | achievements.ts puro: catalogo + evaluate(state) + test [feature 4]
- B6 | B5 | useAchievementsStore.ts persistito + hook su eventi
- B7 | B4 | MainMenu level-select con stelle + voci Achievements/Stats
- B8 | B4,B6 | Profile.tsx (stats) + Achievements.tsx (griglia)
- B9 | B4,B6 | Cablare eventi engine→store a fine run
- B10 | B6 | Toast sblocco achievement (z-index toast:500)

## Incremento C — Varieta gameplay (power-up + hazard + path)
- C1 | A | Regressione-first su MatchSystem.findRun e chainOps (blinda invarianti)
- C2 | C1 | matchable:boolean su DataPacket + guardia findRun + test hazard [feature 5]
- C3 | C2 | Generazione hazard in generateChainPackets (chance da LevelConfig) + test
- C4 | C3 | Render hazard distinto in RenderSystem
- C5 | A | Estendi PowerUpType + powerUps.ts (kill-9/try-catch/regex) [feature 5]
- C6 | C5 | PowerUpSystem: killRange/applyShield/removeType puri + test
- C7 | C6 | Cabla nuovi power-up in applyPowerUp + scudo in endGame
- C8 | A | paths.ts: buildSerpentine/buildLoop + pathKind + test invarianti [feature 7]
- C9 | C8 | Assegna path/hazard-chance ai livelli in levels.ts
- C10 | C3,C7,C9 | Bilanciamento + verifica runtime (no soft-lock)

## Incremento D — Onboarding + rifiniture (tutorial + hit-stop/tracer)
- D1 | A | Hit-stop: contatore frame-freeze in GameEngine.loop + test [feature 3]
- D2 | D1 | Trigger hit-stop da outcome.combo (soglie costante)
- D3 | A | Tracer proiettile in VisualFx + render RenderSystem [feature 3]
- D4 | D1,D3 | Rispetto reduced-motion per hit-stop/tracer
- D5 | A5 | Mode tutorial in runController + levelProvider scriptato [feature 8]
- D6 | D5 | TutorialOverlay.tsx con step + hint contestuali
- D7 | D6 | Flag coredump.tutorialSeen + auto-avvio + rigiocabile
- D8 | D7 | Verifica runtime tutorial

## Incremento E — Boss entity (feature 6, ALTO RISCHIO, conferma a parte)
- E1 | A,C | Design doc regole boss (HP/fasi/danno/attacchi) — CONFERMA UTENTE
- E2 | E1 | Boss.ts (stato HP/fasi) + test puro
- E3 | E2 | BossSystem.ts (update/attacchi/danno) + test
- E4 | E3 | Integrazione boss-level in levelProvider + LevelConfig
- E5 | E4 | Render boss in RenderSystem
- E6 | E4 | Collision/danno col board
- E7 | E6 | Bilanciamento + verifica runtime

## Requisiti → incremento
- feature 1 Endless → A5,A7,A9
- feature 2 Daily → A6,A7,A9
- feature 3 Juice (hit-stop/tracer) → D1-D4
- feature 4 Achievements → B5,B6,B8,B10
- feature 5 Power-up/hazard → C2,C3,C5,C6,C7
- feature 6 Boss → E (tutto)
- feature 7 Path → C8,C9
- feature 8 Tutorial → D5-D8
- feature 9 Progressi+stelle → B1,B2,B4,B7
- feature 10 Statistiche → B3,B4,B8
