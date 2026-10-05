# Tasks — 006-campaign-chapters-and-meta-progression

Formato: `id | dipendenze | requisito tracciato | verify`. Stima 10-30 min per task salvo dove
indicato. Motivazioni, rischi e DoD in `plan.md`. Requisiti: R1/R1b bug, DET determinismo, CAMP
campagna, ARM corazzati, REV inversione, XP, RANK, COS cosmetici, UI, LIM limiti dimensionali,
I18N parità dizionari, WAV ondate.

## Fase 0 — Bug e rete di sicurezza

- [x] T001 | - | R1 | test endless/daily su livello 3 rosso sul codice attuale (stelle assegnate)
- [x] T002 | T001 | R1 | T001 verde; `GameScreen.test.tsx`: `onLevelComplete` in endless non scrive `progress.stars`; typecheck verde
- [x] T003 | - | R1b | test vittoria campagna sull'ultimo livello rosso (`starsOf(TOTAL_LEVELS) === 0` oggi)
- [x] T004 | T003 | R1b | T003 verde; tutorial vinto e campagna persa senza stelle; `all-stars` assegnato dal percorso `recordLevelResult` x(N-1) + `recordRunEnd` vinto
- [x] T005 | - | DET | `levelGolden.test.ts` verde sul codice attuale; cambiando `SEED_STEP` in locale diventa rosso (poi ripristinato)

## Fase 1 — Capitoli 1-2 (12 livelli)

- [ ] T010 | - | I18N, LIM | dizionari divisi per sezione, `locales.test.ts` verde, ogni file < 300 righe, nessuna chiave rinominata (`git diff` senza righe `-` su chiavi)
- [ ] T011 | T005 | CAMP, DET | `LevelConfig` con `chapter/isBoss/armorChance/reversal`; T005 verde; typecheck verde
- [ ] T012 | T011 | CAMP | `difficulty.test.ts`: aumentare un parametro alla volta alza `difficultyIndex`
- [ ] T013 | T012 | CAMP | `campaign.test.ts`: curva (ramp 1-5 non decrescente, boss max e ≥ +15% sul 5, capitolo 2 parte sotto il boss 1), un `isBoss` per capitolo
- [ ] T014 | T013 | CAMP | `TOTAL_LEVELS === 12` derivato; `contentBox.test.ts` copre `LEVELS`; T005 verde; suite intera verde (30-45 min)
- [ ] T015 | T014, T010 | CAMP, I18N | `boss-down`/`all-bosses` testati; profilo con `halfway` già in `earned` lo conserva; parità i18n verde
- [ ] T016 | T014, T010 | UI | `metaScreens.test.tsx`: 2 intestazioni capitolo, tile boss con testo; render 320/375 senza overflow orizzontale (30 min)
- [ ] T017 | T014 | UI | `HUD.test.tsx`: badge boss solo su `isBoss`; fine capitolo mostra il testo della meccanica successiva
- [ ] T018 | T016, T017 | UI | `npm run test:e2e` verde con totale derivato e caso level select
- [ ] T019 | T015-T018 | tutti | typecheck, lint, test:coverage (soglie invariate), e2e, `a11y-gate` level select, render 375/1280, click-through annotato

## Fase 2 — Pacchetti corazzati (18 livelli)

- [ ] T020 | T019 | ARM | `createPacket` default `armor: 0`; test DataPacket verde
- [ ] T021 | T020 | ARM, DET | `applyArmor` trasformazione pura post-generazione con sub-RNG `createRng(hash(seed,'armor'))`; T005 verde; `armorChance: 0.3` → stessi tipi e stessi pacchetti del cursore a parità di seed, armatura solo su matchable senza power-up
- [ ] T022 | T021 | ARM | test `MatchSystem`: crack (nessuna rimozione, armor 0, `CRACK_SCORE`), secondo colpo esplode i 4, cascata si ferma sulla run corazzata (30 min)
- [ ] T023 | T022 | ARM | `ShotOutcome.cracked` propagato; kill -9/regex/garbage collect rimuovono corazzati (test `PowerUpSystem`)
- [ ] T024 | T020 | ARM, LIM | `MechanicRenderer.ts` in exclude coverage; geometria anelli testata; `RenderSystem.ts` ≤ 300 righe
- [ ] T025 | T022, T013 | CAMP, I18N | capitolo 3 in tabella; `TOTAL_LEVELS === 18`; test curva e content box verdi; parità i18n
- [ ] T026 | T023-T025 | tutti | gate di fase come T019 + playtest livelli 13-18 annotato qui

## Fase 3 — Inversione di direzione (24 livelli)

- [ ] T030 | T019 | LIM | `GameEngine.ts` ≤ 395 righe; `git diff --stat tests/engine/gameEngine.test.ts` = 0 righe rimosse; suite verde
- [ ] T031 | T011 | REV | `chainMotion.test.ts`: fattore ai bordi della finestra, periodi successivi, `null` → 1
- [ ] T032 | T030, T031 | REV | test engine: `frontDistance` cala nella finestra e cresce fuori; SLEEP compone; test esistenti invariati (30 min)
- [ ] T033 | T031, T024 | REV, UI | `telegraphPhase` testato (attivo ≥ 0,75 s prima); reduced motion → segnale statico
- [ ] T034 | T032, T025 | CAMP, I18N | capitolo 4; `TOTAL_LEVELS === 24`; `factor ≥ -0.6`, `duration ≤ 2` validati sulla tabella
- [ ] T035 | T033, T034 | tutti | gate di fase + playtest 19-24 annotato; nessuna inversione porta la testa sotto distanza 0 (test)

## Fase 4 — XP e gradi (dipende solo da Fase 0)

- [ ] T040 | T004 | XP | `xp.test.ts`: profilo vuoto 0; esempio del plan con valore esatto; `bossesCleared` 0 senza boss
- [ ] T041 | T040 | RANK | `ranks.test.ts`: soglia k → grado k, soglia k-1 → grado k-1, 8 gradi strettamente crescenti
- [ ] T042 | T041 | XP, RANK | `useMetaProgress` testato: dopo `clearProfile` grado 1; dopo `hydrateFromFile` XP ≥ entrambi
- [ ] T043 | T042, T010 | UI, I18N | `metaScreens.test.tsx`: grado e `progressbar` con `aria-valuenow`; 8 nomi en/it, parità verde
- [ ] T044 | T042 | RANK, UI | (Should) toast di salita di grado; test che `pending` distingue achievement e grado
- [ ] T045 | T043 | tutti | gate di fase, `a11y-gate` Profilo, render 375/1280, click-through

## Fase 5 — Cosmetici

- [ ] T050 | T041 | COS | `cosmetics.test.ts`: ogni palette 7 colori distinti, contrasto ≥ 3:1 sul board, una palette Okabe-Ito
- [ ] T051 | T050 | COS | `cosmeticUnlocks.test.ts`: requisito grado/stelle/boss, default sempre sbloccata, `resolveCosmetic` ricade sulla default
- [ ] T052 | T051 | COS, R3 | store impostazioni: persistenza, id sconosciuto → default, `resetSettings` azzera
- [ ] T053 | T050 | COS | `Theme` DTO (`packetColor(type)`, stile cursore, stile catena) passato a `RenderScene.theme` via `GameEngine.setTheme`; HUD legge il colore da un selettore dello store; `colorForType` resta la palette default pura; T005 verde (il tema non tocca l'RNG)
- [ ] T054 | T052, T053, T030 | COS, LIM | `SkinRenderer.ts` in exclude; `GameEngine.setCosmetics` ≤ 4 righe; `GameEngine.ts` ≤ 405 righe; render osservato con ogni skin (30 min)
- [ ] T055 | T052, T043 | UI, I18N | picker: radio group per slot, voce bloccata disabilitata con condizione in testo; parità i18n
- [ ] T056 | T054, T055 | tutti | gate finale: tutti i comandi, e2e scelta + reload + persistenza, `a11y-gate`, render 375/1280, click-through completo

## Fase 6 — Ondate e capitolo 5 (30 livelli)

- [ ] T060 | T011 | WAV, DET | `waves.test.ts`: `waveCount` da config, `buildWave` deterministico per seed e indice, sub-RNG separato (T005 verde)
- [ ] T061 | T060, T030 | WAV | test engine: catena vuota con ondate rimaste → nuova catena e `onWaveChange`, nessun `onLevelComplete`; ultima ondata → level complete; `GameEngine.ts` ≤ 405 righe
- [ ] T062 | T061 | WAV, UI, I18N | HUD `ondata k/n` con `aria-live` polite; parità i18n
- [ ] T063 | T062, T034 | CAMP, I18N | capitolo 5 in tabella (ondate + meccaniche 2-4 a densità ridotta); `TOTAL_LEVELS === 30`; test curva con 5 capitoli e content box verdi
- [ ] T064 | T063 | tutti | gate di fase + playtest 25-30 annotato qui; e2e `hud-level` derivato
