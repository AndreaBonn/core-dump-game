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
| File | Tipo | Descrizione |
|---|---|---|
| src/engine/audio/soundSpecs.ts | Nuovo | Specifica pura dei suoni sintetizzati |
| src/engine/audio/renderSpec.ts | Nuovo | Renderer che traduce le specifiche in segnali Web Audio |
| src/engine/systems/trajectory.ts | Nuovo | Funzione pura predictLanding per l'anteprima di traiettoria |
| src/engine/systems/urgency.ts | Nuovo | Funzione pura frontUrgency per l'effetto pulsante |
| src/engine/systems/FxRenderer.ts | Nuovo | Renderer effetti visivi estratto da RenderSystem |
| src/engine/systems/GuideRenderer.ts | Nuovo | Renderer linea guida estratto da RenderSystem |
| AudioManager.ts | Modificato | Gestione AudioContext iniettabile, lazy-init, mute, fix rejection resume |
| RenderSystem.ts | Modificato | Ridotto sotto le 300 righe dopo le estrazioni |
| VisualFx.ts | Modificato | Supporto prefers-reduced-motion |
| InputSystem.ts | Modificato | Gestione scambio current/next |
| CpuCursor.ts | Modificato | Metodo swap per lo scambio pallina |
| GameEngine.ts | Modificato | Cablaggio nuovi sistemi (audio, traiettoria, urgenza, reduced-motion) |
| Modal.tsx | Modificato | Focus-trap, Escape, gestione focus |
| GameScreen.tsx | Modificato | Pausa automatica su scheda nascosta |
| GameCanvas.tsx | Modificato | prefers-reduced-motion e aria-label sul canvas |
| PauseOverlay.tsx | Modificato | Coerenza con nuova gestione pausa (Escape) |
| index.html | Modificato | Rimosso user-scalable=no dal viewport |
| tailwind.config.js | Modificato | Aggiornato colore terminal-muted per contrasto WCAG AA |
| vite.config.ts | Modificato | Esclusione dei nuovi renderer view-only dalla copertura |

### Note per il Cliente (linguaggio NON tecnico)
Il gioco ora ha effetti sonori, generati direttamente dal codice senza bisogno di file audio da scaricare. È stata aggiunta una linea che anticipa dove finirà il colpo, e la possibilità di scambiare la pallina pronta con quella successiva usando il tasto destro del mouse o il tasto S. Quando la catena di pacchetti si avvicina al punto critico, un lampeggio rosso avvisa il giocatore. Il gioco si mette in pausa da solo se si cambia scheda del browser, riduce gli effetti di movimento per chi preferisce un'esperienza più tranquilla, ed è più accessibile sia da tastiera sia per chi ha difficoltà visive, grazie a contrasti di colore a norma.

### Riepilogo (Complessità / Stato)
Complessità: Alta. Stato: Completato.
177 test superati, copertura del 100% sulle righe nell'ambito engine/config/services, controlli di tipo e lint puliti, build funzionante, gate di accessibilità superato (zero violazioni axe su menu e finestre di dialogo, contrasto e focus-trap verificati). 8 commit atomici prodotti. Nessun push effettuato: in attesa di richiesta esplicita dall'utente.
