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

---

## 2026-09-04 | Sessione #3 [FEATURE] [FIX] [REFACTOR] [TEST]

### Richiesta

Analisi dello stato del progetto in vista della produzione, poi implementazione di tutto quanto
emerso: i nove finding di prontezza (F1-F9) e il completamento del piano
`specs/002-game-features-expansion` (Incrementi B, C, D; E resta fuori per decisione).

### Azioni Eseguite

Pianificazione con workflow RPI: `planner` per la scomposizione, `architect` per due decisioni
architetturali, `security-reviewer` e `database-reviewer` per la validazione di dominio. Artefatti
in `specs/003-hardening-and-features/`. 30 commit atomici.

**Messa in sicurezza e infrastruttura**

- Motore riportato da 391 a 333 righe con sei estrazioni in moduli puri, tutti al 100% di
  copertura. Il target di 300 righe non era raggiungibile senza riscrivere i test che pilotano 22
  membri privati: numero misurato, deroga decisa dall'utente e registrata nel piano.
- Classifica ridisegnata: un documento per giocatore per modalità
  (`leaderboards/{mode}/scores/{uid}`), aggiornabile solo verso l'alto. Il difetto per cui il
  record personale veniva calcolato sui primi 50 salvataggi non è più rappresentabile. Endless non
  inquina più la classifica della campagna. Le regole di sicurezza sono state eseguite per la prima
  volta: 19 casi sull'emulatore Firestore, verificati rossi con le regole precedenti.
- Giocabilità su telefono: in verticale si adatta il quadrato che il gioco occupa invece del board
  intero. A 375 px l'area di gioco passa da 234 a 375 px e un pacchetto da ~6 a ~21 px; il desktop
  resta identico. Simulazione, tracciati e semi non toccati, quindi la sfida del giorno resta la
  stessa su ogni dispositivo.
- Test: da 190 a 464 unitari più 10 end-to-end su due profili di viewport e 19 sulle regole.
  Copertura estesa a store e hook, soglie in CI al 95%.
- Error boundary al posto della pagina nera, e aggiornamento della PWA che chiede invece di
  sostituire l'app a metà partita.
- CI allineata al branch reale: prima puntava a `main`, che in questo repository non esiste, quindi
  non era mai stata eseguita.

**Feature (piano 002 residuo)**

- Progressi persistenti: stelle per livello, statistiche, 18 achievement, selezione livello,
  profilo, toast di sblocco. Tutto sul dispositivo, nulla caricato online.
- Varietà di gioco: pacchetti ostacolo che non si combinano, tre power-up nuovi (kill -9,
  try/catch, regex), due tracciati oltre la spirale.
- Colpo che pesa: fermo immagine sulle combo e scia dietro ai proiettili, entrambi soppressi con
  reduced-motion.
- Tutorial al primo avvio, skippabile e rigiocabile.

**Legale e dati**

Licenza Apache 2.0, pagina privacy raggiungibile dalle impostazioni, cancellazione reale dei
propri punteggi online e del profilo locale. Due ADR (0007 classifica, 0008 viewport) che
dichiarano anche ciò che non difendono.

### Verifica

- 464 test unitari, 10 end-to-end, 19 sulle regole: tutti verdi. Typecheck e lint puliti. Build ok.
- Comportamento osservato a runtime, non solo compilato: partita giocata fino al game over con il
  profilo che compare in `localStorage` e il primo achievement sbloccato; prompt di aggiornamento
  provato con due build successive; livello con ostacoli e tracciato serpentina osservato in gioco.
- Gate cross-artefatto `/analyze` a fine sessione: ha prodotto tre difetti reali, tutti riprodotti
  prima di essere corretti e ognuno con un test che fallisce senza la correzione.

### Debito Tecnico e Note Aperte

- `GameEngine.ts` è a 390 righe, sopra il limite di 300 delle convenzioni. Le estrazioni hanno
  ridotto il file, le feature successive lo hanno riempito di nuovo. Rientrare davvero richiede di
  riscrivere i test dell'engine su un'API di ispezione: mezza giornata, decisione dell'utente.
- App Check non attivato: è l'unica difesa che chiude la scrittura da script fuori dal browser, e
  l'ADR-0007 fissa la condizione, va attivato prima della pubblicazione, non dopo il primo abuso.
- Nessun workflow di deploy: non esiste ancora un progetto Firebase reale contro cui verificarlo.
- Avvio offline della PWA non ancora provato dopo le modifiche al rendering.
- Incremento E (boss) fuori sequenza per decisione: si riapre da un design doc.

### Note per il Cliente (linguaggio NON tecnico)

Il gioco era un buon prototipo ma non era pubblicabile: su telefono era di fatto ingiocabile, la
classifica si sarebbe rovinata da sola, e non c'era nulla che trattenesse un giocatore dopo la
prima partita. Ora si gioca bene anche in verticale sul telefono, la classifica è divisa per
modalità e tiene solo il record di ciascun giocatore, e chi gioca trova stelle da conquistare,
statistiche, obiettivi da sbloccare e un tutorial che spiega le regole al primo avvio. Sono stati
aggiunti ostacoli e nuovi potenziamenti perché le partite non si somiglino tutte. Il gioco ora
dichiara anche, in una pagina dedicata, quali dati conserva e permette di cancellarli davvero.
Restano due cose da fare prima di pubblicare: attivare la protezione contro gli invii automatici
di punteggi falsi, e preparare la procedura di pubblicazione vera e propria.

### Riepilogo (Complessità / Stato)

Complessità: Alta. Stato: Completato per i blocchi pianificati.
30 commit atomici, 464 test unitari più 10 end-to-end e 19 sulle regole, tutti verdi. Nove finding
di prontezza chiusi su nove, con due condizioni esplicite rimaste aperte (App Check e deploy) e un
debito dimensionale sull'engine dichiarato invece che nascosto. Nessun push effettuato.

---

## 2026-09-18 | Sessione #4 [FEATURE] [TEST]

### Richiesta

Aggiungere un launcher locale cross-platform, così chi clona il repository può giocare senza
conoscere npm. Workflow RPI completo (Research, planner, Qualify/Plan, Implement), 9 commit
atomici da `731b367` a `0c77cca`.

### Azioni Eseguite

- Core puro in `scripts/lib/playLogic.mjs` con sei funzioni: `parseNodeMajor`,
  `parseRequiredMajor`, `isNodeSupported`, `buildUnsupportedNodeMessage`, `planSteps`,
  `resolveInstallCommand`.
- Guscio imperativo `scripts/play.mjs`: installa e builda solo ciò che manca, poi serve la build
  di produzione e apre il browser.
- Tre wrapper minimi (`play.sh`, `play.command`, `play.cmd`) che verificano solo la presenza di
  `node` e delegano al guscio imperativo.
- `.gitattributes` nuovo nel repository, per fissare `eol=lf` sugli script Unix e `eol=crlf` su
  `play.cmd`.

**Decisioni**

- Node è un prerequisito dichiarato, non scaricato dallo script. Variante scelta dall'utente fra
  tre opzioni proposte, le altre due erano il bootstrap di Node in locale e un HTML autocontenuto.
- La soglia di versione si legge da `engines.node`, non è hardcodata: evita una terza copia del
  numero che resterebbe indietro al primo bump.
- `allowJs` in `tsconfig.json` serve perché `tsconfig.include` contiene `tests/`, e un test `.ts`
  che importa un `.mjs` romperebbe `npm run typecheck`, che gira in CI.
- Vite è invocato via `process.execPath` e non via `npm run`, perché su Windows `npm` è uno shim
  `.cmd`. npm resta solo per l'installazione, con `shell: true` limitato a win32.
- `--rebuild` forza installazione e build: correzione emersa in review, un `git pull` può
  aggiungere una dipendenza che il check "solo ciò che manca" non vedrebbe.

### File Modificati

| File                                  | Tipo       | Descrizione                                                                   |
| ------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| scripts/lib/playLogic.mjs             | Nuovo      | Core puro: parsing versione Node, pianificazione step, scelta comando install |
| scripts/play.mjs                      | Nuovo      | Guscio imperativo: install/build condizionati, avvio server, apertura browser |
| play.sh                               | Nuovo      | Wrapper Unix (modo 755), verifica node e delega a play.mjs                    |
| play.command                          | Nuovo      | Copia di play.sh per il doppio click su macOS (modo 755)                      |
| play.cmd                              | Nuovo      | Wrapper Windows (fine riga CRLF), verifica node e delega a play.mjs           |
| .gitattributes                        | Nuovo      | Fissa eol=lf sugli script Unix e eol=crlf su play.cmd                         |
| tests/scripts/playLogic.test.ts       | Nuovo      | 23 test comportamentali sul core puro                                         |
| specs/004-local-play-scripts/plan.md  | Nuovo      | Piano del workflow RPI                                                        |
| specs/004-local-play-scripts/tasks.md | Nuovo      | Scomposizione in task del piano                                               |
| tsconfig.json                         | Modificato | Aggiunto allowJs, per permettere a un test .ts di importare un .mjs           |
| package.json                          | Modificato | Aggiunto script npm play                                                      |
| README.md                             | Modificato | Aggiunta la sezione "Play it"                                                 |

### Verifica

- Gate verdi: lint, typecheck, test:coverage (487 test), build.
- Verifica runtime su un clone pulito nella scratchpad: avvio a freddo (installazione, build,
  risposta HTTP 200 sulla porta 4173), avvio a caldo (246 ms, con controllo preventivo che la
  porta fosse libera), sola build con `dist` rimossa, `--rebuild`, Node troppo vecchio (misurato
  sia impostando `engines` a `">=99"` sia contro un Node 18 reale presente in `/usr/bin`), Node
  assente dal PATH. Rosso osservato prima del verde sui test.
- Fine riga e bit di esecuzione verificati su un clone fresco.
- Review: `code-reviewer` (2 finding MAJOR e 1 MINOR, tutti risolti), `comment-analyzer` (2
  commenti che affermavano come certo qualcosa di dedotto, corretti), `/analyze` (nessun finding
  CRITICAL).

### Debito Tecnico e Note Aperte

Non verificato: il percorso Windows (`play.cmd`, doppio click, messaggio di pausa, Ctrl+C) e il
doppio click su macOS. Nessuna delle due piattaforme è disponibile su questa macchina di sviluppo.
L'utente dispone di una macchina Windows e lo proverà lì.

### Note per il Cliente (linguaggio NON tecnico)

Chi scarica il progetto ora può avviare il gioco con un solo doppio click, senza installare nulla
oltre a Node.js e senza conoscere gli strumenti da riga di comando degli sviluppatori. Esiste un
file di avvio per Windows, uno per macOS e uno per Linux: al primo avvio il programma prepara da
solo tutto il necessario, alle volte successive parte in pochi secondi perché riusa quanto già
pronto. Se il progetto viene aggiornato con nuove dipendenze, basta lanciarlo di nuovo forzando la
reinstallazione. Il percorso su Windows e il doppio click su macOS sono stati scritti e controllati
nel codice, ma non ancora provati su un computer vero con quei sistemi operativi: la prova pratica
resta da fare.

### Riepilogo (Complessità / Stato)

Complessità: Media. Stato: Completato, con verifica pratica limitata a Linux.
9 commit atomici, 487 test superati, lint e typecheck puliti, build funzionante. Review di codice e
di commenti superate con correzioni applicate, gate di consistenza `/analyze` senza finding
bloccanti. Verifica runtime completa sui percorsi Linux, dichiarata esplicitamente non eseguita su
Windows e macOS. Nessun push effettuato.

---

## 2026-09-19 | Sessione #5 [DOCS]

### Richiesta

Rigenerare da zero la documentazione del repository con la skill `repo-readme-generator`, in
versione bilingue (inglese canonico più italiano), comprensiva di guida utente che spieghi come
avviare il gioco, le regole e come si gioca, politica di sicurezza, diagrammi, schermate catturate
dal gioco reale e badge aggiornati dalla CI.

### Azioni Eseguite

- Discovery strutturata sul repository: manifest, script, configurazione di build, CI, regole
  Firestore, contenuti di gioco (livelli, power-up, achievement, modalità) e superficie di
  sicurezza, con ogni affermazione ricondotta al file che la sostiene.
- README riscritto in inglese e tradotto in italiano, con due diagrammi Mermaid (architettura a
  layer e sequenza del salvataggio punteggio) validati renderizzandoli davvero.
- Guida utente nuova, in entrambe le lingue: avvio passo passo per Windows, macOS e Linux, tabella
  dei fallimenti del launcher, installazione come PWA, regole, comandi, tipi di pacchetto, combo,
  power-up, ostacoli, punteggio e stelle, modalità, achievement, classifica e dati personali.
- Politica di sicurezza nuova, in entrambe le lingue: solo misure verificate nel codice con
  riferimento `file:riga`, più una sezione esplicita su ciò che non è implementato (nessun rate
  limiting, nessuno scanner delle dipendenze in CI, nessuna verifica di plausibilità dei punteggi).
- Sette asset catturati con Playwright sulla build di produzione servita in locale, GIF inclusa.
- Badge dinamici: file seed in `badges/`, generazione in CI da JUnit XML e riepilogo di copertura.
- Scrittura sul repository isolata in un quarto job `badges`, che gira solo sul push a `main`: è
  l'unico con `contents: write`, ha un gruppo di `concurrency` proprio e riprova il push con
  rebase. Gli altri tre job hanno `contents: read`, tutti i checkout `persist-credentials: false`
  e il push usa un token esplicito invece della credenziale persistita.

### File Toccati

| File                       | Stato      | Contenuto                                                               |
| -------------------------- | ---------- | ----------------------------------------------------------------------- |
| README.md                  | Riscritto  | README inglese, 287 righe, banner, badge, due diagrammi, screenshot     |
| README.it.md               | Nuovo      | Traduzione italiana speculare, 287 righe                                |
| docs/how-to-play.md        | Nuovo      | Guida utente inglese, 212 righe                                         |
| docs/how-to-play.it.md     | Nuovo      | Guida utente italiana, 212 righe                                        |
| SECURITY.md                | Nuovo      | Politica di disclosure inglese, misure verificate e non implementate    |
| SECURITY.it.md             | Nuovo      | Versione italiana speculare                                             |
| docs/assets/               | Nuovo      | 6 PNG e 1 GIF catturati dal gioco in esecuzione                         |
| badges/test-badge.json     | Nuovo      | Seed del badge dei test                                                 |
| badges/coverage-badge.json | Nuovo      | Seed del badge di copertura                                             |
| .github/workflows/ci.yml   | Modificato | Reporter JUnit e json-summary, generazione e commit dei badge, permessi |
| .gitignore                 | Modificato | Aggiunto `test-results.xml`                                             |

### Verifica

- `npm run test:coverage` eseguito: 617 test su 60 file, copertura 99.89% righe, 99.78% statement,
  99.2% funzioni, 97.89% branch. I numeri nella documentazione vengono da questa esecuzione.
- `npm run build` eseguito, build servita in locale su 4173 e usata per catturare gli asset.
- Gate `md_audit` eseguito sui 6 file Markdown, incluse le tre coppie bilingui: uscita 0 su tutti.
- I 4 blocchi Mermaid renderizzati davvero in un browser headless: nessun errore di sintassi, classi
  semantiche applicate a 9 nodi su 10. Diagramma riletto a 900 px e passato da `LR` a `TB` perché a
  quella larghezza le etichette erano compresse.
- Lo script di generazione dei badge in CI eseguito in locale sul JUnit XML e sul riepilogo di
  copertura reali: produce esattamente i file seed committati.
- `yamllint` pulito sul workflow modificato.
- Le descrizioni di `garbage collect` e `regex` erano invertite nella prima stesura della guida:
  corrette dopo aver letto `resolvePowerUp`.
- Review del solo diff del workflow con `code-reviewer`: un finding MAJOR (push dei badge senza
  rebase né `concurrency`, che avrebbe reso rosso un job verde su due merge ravvicinati) e due
  MINOR (`always()` invece di `!cancelled()`, permesso di scrittura concesso anche ai run da pull
  request). Tutti e tre risolti estraendo il job `badges`.

### Debito Tecnico e Note Aperte

Il README precedente citava quattro power-up e nessun comando di scambio: il codice ne ha sette e
lo scambio esiste da tempo (click destro o `S`). La documentazione nuova segue il codice.

Le schermate di selezione livelli e achievement sono catturate con un profilo di gioco preparato
per l'occasione, perché una partita reale abbastanza lunga non era automatizzabile in modo
affidabile. Le schermate di gioco e la GIF vengono invece da partite vere.

Non verificato: il rendering effettivo delle pagine su GitHub e l'aggiornamento dei badge dinamici,
che richiedono il push e una esecuzione della CI.

### Note per il Cliente (linguaggio NON tecnico)

Il progetto ha ora una documentazione completa in italiano e in inglese. Chi arriva sul repository
trova subito una GIF che mostra il gioco in funzione e, se vuole giocare, una guida che parte
dall'installazione di un solo programma e arriva alla partita, con una tabella di cosa fare quando
qualcosa non parte. Le regole del gioco sono spiegate per intero: come si mira e si spara, come si
fanno esplodere i pacchetti, cosa fa ognuno dei sette potenziamenti, come si guadagnano le stelle e
in cosa differiscono le quattro modalità. C'è anche un documento che spiega come segnalare un
problema di sicurezza e che dichiara apertamente quali difese ci sono e quali no.

### Riepilogo (Complessità / Stato)

Complessità: Media. Stato: Completato, non ancora pubblicato.
6 documenti Markdown (1156 righe complessive), 7 asset catturati dal gioco reale, 2 diagrammi
validati, badge dinamici configurati. Tutti i numeri citati nella documentazione provengono da
comandi eseguiti in questa sessione. Nessun push effettuato.
