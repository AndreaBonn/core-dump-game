# Piano di Implementazione — Espansione feature Core Dump

Slug: `002-game-features-expansion` — branch base: `master`.
Sintesi di `planner` (scomposizione RPI) + `architect` (ADR-006 refactor engine/mode).

## Obiettivo generale

Aggiungere 10 feature al marble-shooter Core Dump trasformando un clone corretto in un
gioco con varieta, retention e meta-progressione, senza rompere il determinismo del sim
(RNG seedato, nessun `Math.random` nel core) ne l'interfaccia `EngineEvents`, e rientrando
nei limiti dimensionali delle rules (file 300 righe, funzione 30, classe 200).

## Decisioni architetturali fissate (ADR-006 + Qualify)

| Tema | Decisione | Alternativa scartata |
|---|---|---|
| Modalita di gioco | `RunConfig` union discriminata (`campaign\|endless\|daily\|tutorial`) + `levelProvider(index)=>LevelConfig\|null` iniettato nell'engine. Loop fisico invariante. | Sottoclassi/strategy per mode (duplica il loop caldo per variare 3 punti-dato) |
| Rientro <300 righe engine | Estrai `applyPowerUp`→`PowerUpSystem` (modulo esistente) + oggetto-dato `RunState`. NO `LevelDirector` (YAGNI, coperto da levelProvider) | Estrazione speculativa di piu coordinatori |
| Hazard non-matchabile | Campo `matchable: boolean` su `DataPacket` + 1 guardia in `findRun` (`MatchSystem.ts:32`) | `PacketType 'HAZARD'` (bug latente match spurio hazard↔hazack); Set-id esterno (stato parallelo) |
| Fine run | Un solo evento `onRunEnd(RunResult)`; il "nuovo record" lo decide il meta layer Zustand, non l'engine | Evento-per-mode nell'engine |
| Soglie stelle | Assolute per livello in `LevelConfig` (`starThresholds: [s1,s2,s3]`) | Relative al punteggio massimo teorico |
| Boss (feature 6) | **Confermato dall'utente: entita vera con HP + pattern d'attacco** → Incremento E dedicato, alto rischio, sistema nuovo accanto al core | Variante di regole config-driven |

## Ordine e dipendenze fra incrementi

```
A (fondamenta) ──┬──> B (meta retention)   [indipendenti fra loro dopo A]
                 ├──> C (varieta gameplay) ──> E (boss entity)
                 └──> D (onboarding + rifiniture)
```

Sequenza consigliata: **A → B → C → D → E**. A abilita tutto (levelProvider/RunConfig).
E richiede C (riusa hazard e pattern di livello). B e D non toccano il core puro.

---

## Incremento A — Fondamenta (refactor engine/mode + Endless + Daily)

### Definition of Done
- `GameEngine` parametrizzato da `RunConfig`; `GameEngine.ts` sotto 300 righe.
- Campaign identica a oggi (nessuna regressione: 10 livelli, stessi seed, stesso finale).
- Endless: run infinita, livelli estrapolati oltre il 10, nessuna schermata "hai vinto";
  termina solo con game over; punteggio cumulativo salvato per la leaderboard.
- Daily: run con seed deterministico derivato dalla data corrente; stessa data ⇒ stesso layout
  (verificabile: due `dailySeed(new Date('2026-07-22'))` danno lo stesso numero).
- MainMenu offre scelta modalita (Campaign / Endless / Daily).
- Test verdi su `RunController`/level provider e `dailySeed` (moduli puri).

### Assunzioni
- Endless estrapola `tuningForLevel` (`levels.ts:31`) oltre lo step 9 senza cap (colorCount resta clampato a 7 come oggi).
- Daily usa la data locale del client (no server time); un solo tentativo/giorno NON e richiesto in v1.
- La leaderboard esistente accetta i punteggi endless/daily senza nuovi campi schema (si riusa `score`+`levelReached`).

### Approccio
Refactor-first sotto regressione: prima blindare la campagna con test, poi introdurre
`RunConfig`/`levelProvider`, poi le due mode come provider diversi. `EngineEvents` migrato a
2 passi (aggiungi `onRunEnd` accanto ai vecchi, poi rimuovi i ridondanti) per non rompere
`GameCanvas.tsx:26`.

### Sub-task
1. [ ] Test di regressione campagna: run deterministica end-to-end sul core (seed→outcome) (30m)
2. [ ] Estrai `applyPowerUp` da `GameEngine` a `PowerUpSystem.applyPowerUp(runState,...)` + test (25m)
3. [ ] Introduci oggetto-dato `RunState` (score/level/phase/sleepTimer/pendingFork) (20m)
4. [ ] Definisci `RunConfig` union + tipo `LevelProvider` in `types/game.types.ts` (20m)
5. [ ] `src/engine/core/runController.ts` puro: `levelProviderFor(config)` (campaign/endless/daily) + test (30m)
6. [ ] `src/engine/core/dailySeed.ts` puro: `dailySeed(date)` deterministico + test (20m)
7. [ ] Cabla `RunConfig` in `GameEngine` (startRun→startRun(config); completeLevel usa levelProvider→null) (30m)
8. [ ] Aggiungi evento `onRunEnd(RunResult)` a `EngineEvents` + forward in `GameCanvas` + store (25m)
9. [ ] MainMenu: selezione modalita → passa `RunConfig` a GameScreen/GameCanvas (30m)
10. [ ] Verifica <300 righe `GameEngine.ts`; estrai residui se necessario (20m)

### File
| File | Tipo | Motivo |
|---|---|---|
| `src/engine/GameEngine.ts` | mod | Parametrizzare con RunConfig, delegare power-up, ridurre righe |
| `src/engine/systems/PowerUpSystem.ts` | mod | Accogliere `applyPowerUp` estratto |
| `src/engine/core/runController.ts` | new | levelProvider puro per mode (testabile, in coverage) |
| `src/engine/core/dailySeed.ts` | new | Seed deterministico da data (puro, in coverage) |
| `src/config/levels.ts` | mod | Esporre estrapolazione tuning oltre TOTAL_LEVELS per endless |
| `src/types/game.types.ts` | mod | `RunConfig`, `RunMode`, `LevelProvider`, `RunResult`, `onRunEnd` |
| `src/components/menu/MainMenu.tsx` | mod | Scelta modalita |
| `src/components/game/GameScreen.tsx`, `GameCanvas.tsx` | mod | Propagare RunConfig, forward onRunEnd |
| `src/store/useGameStore.ts` | mod | Stato modalita + gestione onRunEnd |
| `tests/engine/core/runController.test.ts`, `dailySeed.test.ts` | new | Copertura moduli puri |

### Rischi
- **Rompere la campagna nel refactor**: mitigato dal sub-task 1 (regressione-first).
- Migrazione `EngineEvents`: se fatta in un passo rompe il forward in GameCanvas → 2 passi.
- Endless senza cap: verificare che `tuningForLevel` non generi valori assurdi a step alti (chainSpeed illimitata) → aggiungere clamp difficolta.

### Criteri di successo
Campagna byte-identica nei test; `dailySeed` deterministico; endless supera il livello 10;
`GameEngine.ts` < 300 righe; suite verde; coverage core invariata o superiore.

---

## Incremento B — Retention meta (progressi+stelle + statistiche + achievements)

### Definition of Done
- Progressi campagna persistiti (livello massimo sbloccato) in localStorage `coredump.*`.
- Stelle 1-3 per livello da soglie assolute; MainMenu mostra level-select con stelle.
- Statistiche personali aggregate (packet distrutti, combo massima, run giocate, tempo) persistite e mostrate.
- Achievements: catalogo locale (~15-20), sblocco reattivo agli eventi, vista dedicata.
- Logica di aggregazione/valutazione in moduli puri `engine/core/` (in coverage), non nello store.

### Assunzioni
- Nessuna sincronizzazione cloud dei progressi in v1 (solo localStorage, come muted/nickname).
- Stelle calcolate su punteggio del singolo livello vs `starThresholds` in `LevelConfig`.
- Achievements sono derivabili da `EngineEvents` + contatori; nessun achievement richiede replay.

### Sub-task
1. [ ] `src/engine/core/stars.ts` puro: `starsFor(levelScore, thresholds)` + test (20m)
2. [ ] Aggiungi `starThresholds` a `LevelConfig` (`levels.ts`) per i 10 livelli (20m)
3. [ ] `src/engine/core/stats.ts` puro: riduttori di statistiche da eventi + test (30m)
4. [ ] `src/store/useProgressStore.ts`: progressi+stelle+stats persistiti (pattern settings) (30m)
5. [ ] `src/engine/core/achievements.ts` puro: catalogo + `evaluate(state)→unlocked[]` + test (30m)
6. [ ] `src/store/useAchievementsStore.ts` persistito + hook su onRunEnd/onScore (25m)
7. [ ] MainMenu: level-select con stelle + entry Achievements/Stats (30m)
8. [ ] `src/components/menu/Profile.tsx` (stats) + `Achievements.tsx` (griglia) (30m)
9. [ ] Cablare eventi engine→store per aggiornare stats/achievements a fine run (25m)
10. [ ] Toast/notifica sblocco achievement (riusa z-index toast:500 delle rules) (20m)

### File
| File | Tipo | Motivo |
|---|---|---|
| `src/engine/core/stars.ts`, `stats.ts`, `achievements.ts` | new | Logica pura testabile |
| `src/config/levels.ts` | mod | `starThresholds` per livello |
| `src/store/useProgressStore.ts`, `useAchievementsStore.ts` | new | Persistenza meta |
| `src/components/menu/MainMenu.tsx` | mod | Level-select + voci menu |
| `src/components/menu/Profile.tsx`, `Achievements.tsx` | new | Viste meta |
| `src/App.tsx`, `useGameStore.ts` | mod | Nuovi screen |
| `tests/engine/core/stars.test.ts`, `stats.test.ts`, `achievements.test.ts` | new | Copertura |

### Rischi
- Store non in coverage (`vite.config.ts:68-78`): tenere la logica valutabile nei moduli `core/` puri, store solo come guscio I/O.
- Crescita `MainMenu` oltre limiti → estrarre `LevelSelect.tsx`.

### Criteri di successo
Progressi sopravvivono al reload; stelle corrette da test soglie; almeno 15 achievement sbloccabili; stats coerenti con gli eventi; suite verde.

---

## Incremento C — Varieta gameplay (nuovi power-up + hazard + path alternativi)

### Definition of Done
- Nuovi power-up implementati: `kill -9` (distrugge fascia contigua), `try/catch` (scudo 1 raggiungimento void), `regex` (rimuove tutti i packet di un tipo).
- Hazard packet non-matchabile (`null`/`deadlock`): non forma run, va aggirato; modellato con `matchable:boolean`.
- Almeno 2 path nuovi oltre la spirale (serpentina + loop), selezionabili per livello.
- Core puro coperto da regressione PRIMA delle modifiche; nuovi test per ogni power-up/hazard/path.

### Assunzioni
- `try/catch` come stato di run (scudo consumabile), non entita visibile complessa.
- `kill -9` opera su una finestra di N packet attorno al punto di innesco (N costante nominata).
- Path nuovi rispettano gli invarianti spline (monotono in arc-length, entra→void).

### Sub-task
1. [ ] Regressione-first su `MatchSystem.findRun` e `chainOps` (blindare invarianti) (30m)
2. [ ] Aggiungi `matchable:boolean` a `DataPacket` + guardia in `findRun` (`MatchSystem.ts:32`) + test hazard (30m)
3. [ ] Generazione hazard in `chainOps.generateChainPackets` (chance da LevelConfig) + test (25m)
4. [ ] Render hazard distinto in `RenderSystem`/packet draw (20m)
5. [ ] Estendi `PowerUpType` + `powerUps.ts` (kill-9/try-catch/regex) con costanti effetto (20m)
6. [ ] `PowerUpSystem`: `killRange`, `applyShield`, `removeType` puri + test (30m)
7. [ ] Cabla nuovi power-up in `applyPowerUp` + scudo in `hasSwallowed`/endGame (25m)
8. [ ] `paths.ts`: `buildSerpentine`, `buildLoop` + `pathKind` in LevelConfig + test invarianti (30m)
9. [ ] Assegna path/hazard-chance ai livelli in `levels.ts` (20m)
10. [ ] Bilanciamento e verifica runtime (giocabilita, no soft-lock da hazard) (30m)

### File
| File | Tipo | Motivo |
|---|---|---|
| `src/types/game.types.ts` | mod | `matchable`, nuovi `PowerUpType` |
| `src/engine/systems/MatchSystem.ts` | mod | Guardia hazard in findRun |
| `src/engine/core/chainOps.ts` | mod | Generazione hazard |
| `src/engine/entities/DataPacket.ts` | mod | Campo matchable |
| `src/engine/systems/PowerUpSystem.ts` | mod | Nuovi effetti puri |
| `src/engine/GameEngine.ts` | mod | Cablaggio nuovi power-up + scudo |
| `src/config/powerUps.ts`, `paths.ts`, `levels.ts` | mod | Config effetti/path/assegnazioni |
| `src/engine/systems/RenderSystem.ts` | mod | Render hazard/nuovi glyph |
| `tests/engine/**` | new/mod | Regressione + copertura nuovi |

### Rischi
- **Rompere invarianti core testato**: regressione-first obbligatoria (sub-task 1). Il bug `PacketType 'HAZARD'` con match spurio e evitato usando `matchable`.
- Soft-lock: hazard troppo densi rendono un livello impossibile → cap sulla chance e test.
- `GameEngine` di nuovo verso 300 righe → spostare cablaggio power-up in PowerUpSystem.

### Criteri di successo
Hazard non matcha mai; nuovi power-up con effetto verificato da test; path nuovi validi (test invarianti); nessuna regressione core; suite verde.

---

## Incremento D — Onboarding + rifiniture (tutorial + hit-stop/tracer)

### Definition of Done
- Tutorial interattivo al primo avvio (rilevato via localStorage): guida aim/fire/swap/match/power-up con hint contestuali; skippabile e rigiocabile.
- Hit-stop: freeze deterministico di N frame su combo grandi (nel loop, non solo VisualFx), con test.
- Tracer: scia luminosa del proiettile in `VisualFx`/`RenderSystem` (view-only).
- Reduced-motion soppresse hit-stop/tracer coerentemente con l'esistente.

### Assunzioni
- Tutorial = `RunConfig` mode `tutorial` con levelProvider scriptato + overlay UI, non un motore separato.
- Hit-stop scala con la dimensione della combo (SEGFAULT<STACK OVERFLOW<KERNEL PANIC).

### Sub-task
1. [ ] Hit-stop: contatore frame-freeze in `GameEngine.loop` (`:234-249`) deterministico + test (30m)
2. [ ] Trigger hit-stop da `outcome.combo` in tryInsert (soglie da costante) (20m)
3. [ ] Tracer proiettile in `VisualFx` (storico posizioni) + render in `RenderSystem` (30m)
4. [ ] Rispetto reduced-motion per hit-stop/tracer (15m)
5. [ ] Mode `tutorial` in runController + levelProvider scriptato (25m)
6. [ ] `src/components/game/TutorialOverlay.tsx` con step + hint contestuali (30m)
7. [ ] Flag `coredump.tutorialSeen` + auto-avvio al primo gioco + rigiocabile da menu (20m)
8. [ ] Verifica runtime tutorial (percorso completo) (20m)

### File
| File | Tipo | Motivo |
|---|---|---|
| `src/engine/GameEngine.ts` | mod | Hit-stop nel loop |
| `src/engine/systems/VisualFx.ts` | mod | Tracer |
| `src/engine/systems/RenderSystem.ts` | mod | Disegno tracer |
| `src/engine/core/runController.ts` | mod | Mode tutorial scriptato |
| `src/components/game/TutorialOverlay.tsx` | new | UI onboarding |
| `src/store/useSettingsStore.ts` | mod | Flag tutorialSeen |
| `tests/engine/**` | new | Copertura hit-stop |

### Rischi
- Hit-stop nel loop puo alterare il determinismo se mal fatto → contatore separato che congela solo l'avanzamento visivo/sim in modo deterministico, con test dedicato.
- Tutorial invadente → skippabile sempre.

### Criteri di successo
Nuovo giocatore completa il tutorial; hit-stop testato deterministico; tracer visibile e soppresso in reduced-motion; suite verde.

---

## Incremento E — Boss entity (feature 6, ALTO RISCHIO, confermato dall'utente)

> Incremento a se: sistema nuovo accanto al marble-shooter. Stima aggiuntiva +5-8 giorni.
> Da avviare solo dopo A e C, con conferma esplicita a valle del piano precedente.

### Definition of Done
- Entita `Boss` con hitpoint, fasi e almeno 1 pattern d'attacco.
- Boss-level ogni 3-4 livelli: il boss interferisce col board (es. inietta hazard, accelera la chain, blocca settori).
- Il boss subisce danno secondo una regola chiara (es. combo/esplosioni vicine); alla morte il livello si completa.
- Sistema boss isolato in moduli propri; core marble-shooter invariato.

### Assunzioni (DA CONFERMARE prima di E)
- Regola di danno al boss e pattern d'attacco vanno concordati (design di gioco, non deducibile).
- Il boss non richiede un motore fisico nuovo: si innesta su loop/collision esistenti.

### Sub-task (bozza, da dettagliare al via)
1. [ ] Design doc regole boss (HP, fasi, danno, attacchi) — CONFERMA UTENTE
2. [ ] `src/engine/entities/Boss.ts` (stato HP/fasi) + test puro
3. [ ] `src/engine/systems/BossSystem.ts` (update, attacchi, danno) + test
4. [ ] Integrazione boss-level in levelProvider + LevelConfig
5. [ ] Render boss in RenderSystem
6. [ ] Collision/danno col board (chain/proiettili)
7. [ ] Bilanciamento + verifica runtime

### Rischi
- Il piu alto del progetto: nuovo sistema che tocca loop/render/collision. Va isolato e testato a parte.
- Rischio scope-creep: definire il minimo giocabile (1 boss, 1 pattern) prima di espandere.

---

## Nota limiti dimensionali (dove serve estrarre moduli)
- `GameEngine.ts` gia >300 righe: A estrae `applyPowerUp`→PowerUpSystem e `RunState`; C sposta il cablaggio dei nuovi power-up in PowerUpSystem per non ricrescere.
- `MainMenu.tsx`: B lo fa crescere → estrarre `LevelSelect.tsx`.
- Logica valutabile (stars/stats/achievements/runController/dailySeed) va in `engine/core/` puri per restare in coverage (`vite.config.ts` include engine/config/services, esclude renderer).
