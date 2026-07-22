# Report Attività - Core Dump Game

Progetto: Core Dump Game
Data creazione report: 2026-07-22

---

## 2026-07-22 | Sessione #1 [FEATURE] [UI] [A11Y]

### Richiesta

Implementare un pacchetto di miglioramenti di game-feel, audio e accessibilità, pianificato con workflow RPI completo (planner + architect + validazione).

### Azioni Eseguite

Lavoro suddiviso in 8 commit atomici:

- Audio SFX sintetizzati via Web Audio, senza asset binari: specifica pura dei suoni, renderer dedicato e un AudioManager con factory di AudioContext iniettabile, inizializzazione lazy al primo gesto dell'utente e rispetto del mute.
- Refactor: estratto FxRenderer da RenderSystem per riportare il file sotto le 300 righe.
- Anteprima di traiettoria: funzione pura predictLanding che riusa la stessa logica di collisione del motore di gioco, disegnata come linea puntinata.
- Scambio tra pallina corrente e successiva (tasto destro o tasto S), sul modello dei giochi tipo Zuma.
- Segnale d'urgenza sul fronte della catena: i pacchetti in testa pulsano di rosso quando si avvicinano al buco (funzione pura frontUrgency).
- Supporto a prefers-reduced-motion: azzerati shake e particelle per chi lo richiede; pausa automatica quando la scheda del browser non è visibile; focus-trap, tasto Escape e gestione corretta del focus nei Modal; aria-label sul canvas di gioco.
- Gate di accessibilità (skill a11y-gate con axe-core dal vivo): corretto il contrasto del testo secondario (terminal-muted da #5a6b80 a #8593a8, ora conforme WCAG AA) e rimosso user-scalable=no dal viewport, che bloccava lo zoom.
- Estratto anche GuideRenderer da RenderSystem per lo stesso motivo di limite dimensionale.
- Fix da code-review: gestita la rejection della Promise di AudioContext.resume, che poteva restare silenziosa.

### File Modificati

| File                                | Tipo       | Descrizione                                                              |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------ |
| src/engine/audio/soundSpecs.ts      | Nuovo      | Specifica pura dei suoni sintetizzati                                    |
| src/engine/audio/renderSpec.ts      | Nuovo      | Renderer che traduce le specifiche in segnali Web Audio                  |
| src/engine/systems/trajectory.ts    | Nuovo      | Funzione pura predictLanding per l'anteprima di traiettoria              |
| src/engine/systems/urgency.ts       | Nuovo      | Funzione pura frontUrgency per l'effetto pulsante                        |
| src/engine/systems/FxRenderer.ts    | Nuovo      | Renderer effetti visivi estratto da RenderSystem                         |
| src/engine/systems/GuideRenderer.ts | Nuovo      | Renderer linea guida estratto da RenderSystem                            |
| AudioManager.ts                     | Modificato | Gestione AudioContext iniettabile, lazy-init, mute, fix rejection resume |
| RenderSystem.ts                     | Modificato | Ridotto sotto le 300 righe dopo le estrazioni                            |
| VisualFx.ts                         | Modificato | Supporto prefers-reduced-motion                                          |
| InputSystem.ts                      | Modificato | Gestione scambio current/next                                            |
| CpuCursor.ts                        | Modificato | Metodo swap per lo scambio pallina                                       |
| GameEngine.ts                       | Modificato | Cablaggio nuovi sistemi (audio, traiettoria, urgenza, reduced-motion)    |
| Modal.tsx                           | Modificato | Focus-trap, Escape, gestione focus                                       |
| GameScreen.tsx                      | Modificato | Pausa automatica su scheda nascosta                                      |
| GameCanvas.tsx                      | Modificato | prefers-reduced-motion e aria-label sul canvas                           |
| PauseOverlay.tsx                    | Modificato | Coerenza con nuova gestione pausa (Escape)                               |
| index.html                          | Modificato | Rimosso user-scalable=no dal viewport                                    |
| tailwind.config.js                  | Modificato | Aggiornato colore terminal-muted per contrasto WCAG AA                   |
| vite.config.ts                      | Modificato | Esclusione dei nuovi renderer view-only dalla copertura                  |

### Note per il Cliente (linguaggio NON tecnico)

Il gioco ora ha effetti sonori, generati direttamente dal codice senza bisogno di file audio da scaricare. È stata aggiunta una linea che anticipa dove finirà il colpo, e la possibilità di scambiare la pallina pronta con quella successiva usando il tasto destro del mouse o il tasto S. Quando la catena di pacchetti si avvicina al punto critico, un lampeggio rosso avvisa il giocatore. Il gioco si mette in pausa da solo se si cambia scheda del browser, riduce gli effetti di movimento per chi preferisce un'esperienza più tranquilla, ed è più accessibile sia da tastiera sia per chi ha difficoltà visive, grazie a contrasti di colore a norma.

### Riepilogo (Complessità / Stato)

Complessità: Alta. Stato: Completato.
177 test superati, copertura del 100% sulle righe nell'ambito engine/config/services, controlli di tipo e lint puliti, build funzionante, gate di accessibilità superato (zero violazioni axe su menu e finestre di dialogo, contrasto e focus-trap verificati). 8 commit atomici prodotti. Nessun push effettuato: in attesa di richiesta esplicita dall'utente.

---

## 2026-07-22 | Sessione #2 [FEATURE] [REFACTOR]

### Richiesta

Incremento A del piano `specs/002-game-features-expansion/`: introdurre tre modalità di gioco (Campaign, Endless, Daily Challenge) e disaccoppiare il motore dalla campagna a 10 livelli fissa, con workflow RPI completo.

### Azioni Eseguite

- Aggiunte tre modalità di gioco: Campaign (le 10 fasi esistenti, invariate), Endless (run infinita che estrapola la difficoltà oltre il livello 10, con un tetto alla giocabilità, termina solo con il game over) e Daily Challenge (layout deterministico ricavato dalla data locale, uguale per tutti i giocatori nello stesso giorno).
- Nuovo modulo puro `runController.ts`: tipo `RunConfig` (unione campaign/endless/daily) con `levelProvider` e `finalLevel`, più le factory `campaignConfig`, `endlessConfig`, `dailyConfig` e `runConfigForMode`.
- Nuovo modulo puro `dailySeed.ts`: genera un seed deterministico a 32 bit a partire dalla data.
- `levels.ts`: aggiunta `buildLevelConfig(index, seedBase)`, estrapolabile oltre il numero totale di livelli con un tetto alla difficoltà (lunghezza massima della catena, velocità, turni). `getLevel` e l'elenco `LEVELS` restano identici byte per byte: la campagna non è cambiata, verificato con un test di parità dedicato.
- `GameEngine.ts` disaccoppiato dalla campagna hardcoded: `startRun` ora accetta una `RunConfig` opzionale, `startLevel` usa il `levelProvider`, `completeLevel` decide la vittoria confrontando col `finalLevel` invece di ricostruire la configurazione di livello. Estratta la parte di presentazione (viewport, trasformazioni, RenderSystem) nel nuovo modulo `EngineRenderer.ts`; `GameEngine.ts` è sceso da 411 a 389 righe.
- UI: il menu principale espone i tre pulsanti modalità; lo store `useGameStore` ha un nuovo campo `mode`; `GameCanvas` e `GameScreen` costruiscono la `RunConfig` e la propagano, cosicché il retry preserva la modalità scelta.

### File Modificati

| File                                 | Tipo       | Descrizione                                                                        |
| ------------------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| src/engine/core/runController.ts     | Nuovo      | Tipo RunConfig e factory per le tre modalità di gioco                              |
| src/engine/core/dailySeed.ts         | Nuovo      | Seed deterministico a 32 bit dalla data locale                                     |
| src/engine/systems/EngineRenderer.ts | Nuovo      | Presentazione (viewport, transform, RenderSystem) estratta da GameEngine           |
| src/config/levels.ts                 | Modificato | Aggiunta buildLevelConfig estrapolabile oltre TOTAL_LEVELS, con cap di difficoltà  |
| src/engine/GameEngine.ts             | Modificato | startRun/startLevel/completeLevel parametrizzati su RunConfig, ridotto a 389 righe |
| MainMenu                             | Modificato | Tre pulsanti per la scelta della modalità                                          |
| useGameStore                         | Modificato | Nuovo campo mode                                                                   |
| GameCanvas / GameScreen              | Modificato | Costruzione e propagazione della RunConfig, retry che preserva la modalità         |

### Verifica

- `tsc --noEmit` pulito, `eslint .` senza errori, `npm run build` completato senza problemi.
- Suite di test: 190 verdi (aggiunti `dailySeed.test.ts` e `runController.test.ts`, test di parità sulla campagna, nessuna regressione sui 34 test engine preesistenti).
- Code review (agente code-reviewer): esito APPROVE, zero finding critical/high/medium. Un finding LOW risolto: `completeLevel` ora usa `finalLevel` invece di ricostruire una `LevelConfig`.

### Debito Tecnico e Note Aperte

- `GameEngine.ts` resta a 389 righe, sopra il limite di 300 previsto dagli standard di progetto (finding A1 dell'analisi `/analyze`). È un debito pre-esistente (il file partiva da 411 righe), migliorato ma non introdotto da questo incremento. Rientrare del tutto richiede scomporre il combat-loop (`tryInsert`, `updateProjectiles`, `applyPowerUp`, `completeLevel`) in moduli separati: tracciato come follow-up, candidato all'inizio dell'Incremento C. La decisione se accettare il debito o risolverlo subito è in attesa dell'utente.
- I task originari A2 (estrazione di `applyPowerUp`) e A3 (introduzione di `RunState`) non sono stati eseguiti perché avrebbero rotto i test che leggono lo stato interno del motore; sono stati sostituiti dall'estrazione di `EngineRenderer`, che copriva lo stesso obiettivo di riduzione dimensionale senza quel rischio. Il task A8 (`onRunEnd`) è stato rimandato all'Incremento B per evitare di introdurre un'astrazione non ancora necessaria (YAGNI).

### Note per il Cliente (linguaggio NON tecnico)

Il gioco ora offre tre modi per giocare, oltre alla campagna classica a 10 livelli già esistente: una modalità infinita che aumenta gradualmente la difficoltà finché non si perde, e una sfida del giorno uguale per tutti i giocatori, così da poter confrontare i risultati con gli amici. Sotto il cofano, il motore di gioco è stato riorganizzato per supportare queste nuove modalità senza toccare il comportamento della campagna originale, che rimane identica a prima. Resta un punto di manutenzione tecnica aperto (un file del motore più grande del limite consigliato) che non influisce sul funzionamento del gioco ma è stato segnalato per un intervento futuro.

### Riepilogo (Complessità / Stato)

Complessità: Media-Alta. Stato: Completato.
190 test superati, controlli di tipo e lint puliti, build funzionante, code review approvata con un solo finding minore già risolto. Debito tecnico pre-esistente su GameEngine.ts documentato e non nascosto, in attesa di decisione dell'utente su priorità di rientro.
