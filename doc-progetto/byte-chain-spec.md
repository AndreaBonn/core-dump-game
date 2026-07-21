# Byte Chain / Core Dump — Documento di Specifica Tecnica e Funzionale

> Spec per implementazione autonoma da parte di Claude Code. Documento auto-contenuto: contiene tutte le informazioni necessarie per costruire l'applicazione da zero senza bisogno di chiarimenti aggiuntivi. Dove esistono ambiguità, sono già state risolte con una decisione esplicita.

---

## 1. Panoramica del progetto

**Nome di lavoro:** Byte Chain (in-game: schermata di game over mostra "Core Dump")

**Genere:** Puzzle arcade — clone concettuale del genere "marble shooter / tunnel shooter" (tipo Zuma), con reskin tematico completo a tema informatico/hacker. Nessun asset, nome, logo o codice del gioco originale viene riutilizzato: meccaniche di gioco generiche reimplementate da zero.

**Piattaforma:** Web app (PWA), responsive, giocabile da browser desktop e mobile.

**Target:** Single player, con salvataggio punteggi online e classifica globale. Nessun multiplayer realtime in questa versione (out of scope, vedi sezione 12).

---

## 2. Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Rendering di gioco | HTML5 Canvas 2D (via `<canvas>` nativo, no PixiJS — il gioco è abbastanza semplice da non richiedere una libreria di rendering dedicata) |
| State management globale (menu, auth, UI) | Zustand |
| State del gioco (loop, entità) | Gestito internamente al game engine (classe/hook dedicato), NON tramite Zustand/React state per evitare re-render ad ogni frame |
| Backend | Firebase (Spark free tier) |
| Autenticazione | Firebase Auth (Anonymous Auth di default, opzionale login Google per persistenza cross-device) |
| Database | Firestore |
| Hosting | Firebase Hosting |
| PWA | Vite PWA plugin (`vite-plugin-pwa`), service worker con precaching |
| Audio | Web Audio API (o semplice `<audio>` tag per suoni brevi, vedi sezione 9) |

---

## 3. Concept tematico: "Core Dump"

Reskin completo del genere marble-shooter con estetica hacker/terminale.

- **Percorso della catena:** invece del sentiero serpentino "esotico" dell'originale, il percorso è rappresentato come un **circuito stampato (PCB)** stilizzato che serpeggia sullo schermo, con tracce dorate/verdi su sfondo scuro.
- **Le "palline":** sono **pacchetti dati** rappresentati come piccoli esagoni o quadrati arrotondati, ciascuno con un colore diverso associato a un "tipo di dato" (vedi sezione 5.2 per naming e palette).
- **Il buco/statua finale (dove la catena viene "inghiottita" se il giocatore fallisce):** rappresentato come un **buco nero `/dev/null`** stilizzato, con un piccolo effetto di distorsione/glitch quando i pacchetti vengono inghiottiti.
- **Lo sparatore (controllato dal giocatore):** rappresentato come un **cursore a forma di CPU/chip** posizionato al centro dello schermo, che ruota per puntare e "compila" (spara) pacchetti dati nella catena.
- **Palette colori:** dark mode by default. Sfondo quasi nero (`#0a0e14`), tracce del circuito verde terminale (`#39ff14` attenuato, tipo `#2fb344`), testo e UI in monospace font (es. `JetBrains Mono` o `Fira Code`, caricati da Google Fonts o self-hosted).
- **Font:** tutta l'interfaccia (menu, punteggi, HUD) usa un font monospace per rinforzare l'estetica "terminale".

---

## 4. Meccaniche di gioco (core loop)

Questa sezione descrive la meccanica generica del genere, che deve essere implementata fedelmente per garantire un gameplay riconoscibile e divertente.

### 4.1 Struttura della partita

1. Una catena di **pacchetti dati** (elementi colorati) avanza lungo un percorso a curve (il "circuito") verso il buco nero `/dev/null` al centro/fine del percorso.
2. Il giocatore controlla un **cursore CPU** fisso al centro dello schermo (o in una posizione dedicata), che può ruotare a 360° e "sparare" pacchetti dati verso la catena.
3. Il pacchetto sparato si inserisce nella catena nel punto in cui colpisce.
4. Se l'inserimento crea un **gruppo di 3 o più pacchetti dello stesso colore/tipo consecutivi**, quel gruppo esplode (viene rimosso) e viene assegnato un punteggio.
5. Dopo un'esplosione, la catena si ricompatta: i segmenti adiacenti si uniscono, il che può generare esplosioni a catena (combo).
6. Il giocatore ha in ogni momento un pacchetto "corrente" pronto da sparare e uno "successivo" mostrato in anteprima (queue di 2).
7. La partita termina in **game over** quando la testa della catena raggiunge il buco nero `/dev/null` (i pacchetti vengono "inghiottiti").
8. Il giocatore vince il livello (o avanza) quando l'intera catena viene eliminata prima che raggiunga la fine del percorso.

### 4.2 Controlli

- **Desktop:** il cursore CPU segue il mouse per la mira; click sinistro (o barra spaziatrice) per sparare.
- **Mobile/touch:** tap sullo schermo per mirare e sparare nella direzione del tap (tap singolo = mira + sparo immediato, per semplicità di controllo touch).
- Nessuna tastiera direzionale richiesta.

### 4.3 Power-up (elementi extra rispetto al genere base, per varietà)

Implementare almeno questi 4 power-up, che appaiono come pacchetti dati speciali (con icona distintiva) inseriti occasionalmente nella catena:

| Power-up | Nome in-game | Effetto |
|---|---|---|
| Rallentamento catena | `sleep()` | Rallenta la velocità di avanzamento della catena per 5 secondi |
| Sparo multiplo | `fork()` | Il prossimo sparo del giocatore duplica il pacchetto in 3 direzioni ravvicinate |
| Rimozione colore | `garbage collect` | Rimuove tutti i pacchetti di un colore casuale attualmente in catena |
| Retrocessione catena | `rollback()` | La catena arretra di un tratto fisso lungo il percorso |

I power-up appaiono con probabilità configurabile (default: 5% di possibilità per ogni pacchetto generato nella catena) e sono attivati automaticamente quando il pacchetto power-up viene colpito da un match (non serve una logica di "raccolta" separata).

### 4.4 Difficoltà progressiva

- Il gioco è strutturato in **livelli** (default: 10 livelli per la v1).
- Ogni livello aumenta: velocità di avanzamento della catena, lunghezza totale della catena, numero di colori/tipi di pacchetto in gioco (da 4 colori al livello 1 fino a 6-7 ai livelli avanzati).
- I parametri di difficoltà per livello devono essere centralizzati in un unico file di configurazione (es. `src/config/levels.ts`) per facilitare il bilanciamento senza toccare la logica di gioco.

---

## 5. Entità di gioco e naming

### 5.1 Entità

- **DataPacket** (pacchetto dati): l'unità base della catena. Proprietà: `id`, `color/type`, `position` (lungo il path), `isPowerUp`, `powerUpType`.
- **Chain** (catena): array ordinato di `DataPacket`, con velocità di avanzamento corrente e riferimento alla `Path`.
- **Path** (circuito): sequenza di punti (spline/bezier) che definisce il percorso visivo che la catena segue. Deve essere definito come una serie di waypoint interpolati, non hardcoded pixel-per-pixel, per poter facilmente definire percorsi diversi per livello.
- **CpuCursor** (cursore/sparatore): entità controllata dal giocatore. Proprietà: `position` (fissa), `angle` (calcolato da input), `currentPacket`, `nextPacket`.
- **VoidHole** (`/dev/null`): punto finale del percorso, trigger di game over.

### 5.2 Tipi di pacchetto dati e colori (naming tematico)

| Tipo/colore | Colore hex | Nome in-game |
|---|---|---|
| Rosso | `#ff5555` | `ERROR` |
| Verde | `#50fa7b` | `SUCCESS` |
| Blu | `#8be9fd` | `INFO` |
| Giallo | `#f1fa8c` | `WARNING` |
| Viola | `#bd93f9` | `DEBUG` |
| Arancione | `#ffb86c` | `TRACE` |
| Rosa (solo livelli avanzati) | `#ff79c9` | `FATAL` |

Nota: questi nomi/colori sono ispirati ai livelli di log standard (info, warning, error, debug) — scelta intenzionale per rinforzare il tema "informatico" in modo riconoscibile senza scimmiottare palette di prodotti/brand esistenti.

---

## 6. Sistema di punteggio

- Match base (3 pacchetti dello stesso tipo): **+30 punti**
- Ogni pacchetto aggiuntivo oltre i 3 nello stesso match: **+15 punti** extra ciascuno
- Combo a catena (esplosione consecutiva generata dalla ricompattazione): moltiplicatore progressivo `x2`, `x3`, `x4`... visualizzato a schermo con etichette testuali in stile terminale:
  - Combo x2 → `SEGFAULT!`
  - Combo x3 → `STACK OVERFLOW!`
  - Combo x4+ → `KERNEL PANIC!!`
- Livello completato senza che nessun pacchetto raggiunga `/dev/null`: bonus fisso **+500 punti**
- Il punteggio finale della run (somma di tutti i livelli raggiunti prima del game over) è ciò che viene salvato in classifica.

---

## 7. Architettura del codice

### 7.1 Struttura cartelle proposta

```
src/
  components/
    game/
      GameCanvas.tsx          # Wrapper React del canvas, monta/smonta il game engine
      HUD.tsx                 # Punteggio, livello, combo overlay
      GameOverScreen.tsx
      LevelCompleteScreen.tsx
    menu/
      MainMenu.tsx
      Leaderboard.tsx
      Settings.tsx
    shared/
      Button.tsx
      Modal.tsx
  engine/
    GameEngine.ts              # Classe principale, gestisce il game loop (requestAnimationFrame)
    entities/
      DataPacket.ts
      Chain.ts
      Path.ts
      CpuCursor.ts
      VoidHole.ts
    systems/
      CollisionSystem.ts
      MatchSystem.ts           # Rilevamento gruppi di 3+, gestione esplosioni/combo
      PowerUpSystem.ts
      RenderSystem.ts          # Disegno su canvas
      InputSystem.ts           # Mouse/touch → angolo e sparo
    audio/
      AudioManager.ts
  config/
    levels.ts                  # Parametri di difficoltà per livello
    packetTypes.ts              # Colori/naming da sezione 5.2
    powerUps.ts
  store/
    useGameStore.ts             # Zustand: stato UI (score, livello corrente, schermata attiva)
    useAuthStore.ts              # Zustand: stato auth Firebase
  services/
    firebase.ts                  # Init Firebase app
    leaderboardService.ts        # CRUD verso Firestore
    authService.ts
  hooks/
    useGameEngine.ts              # Hook che collega GameEngine al ciclo di vita React
  types/
    game.types.ts
  App.tsx
  main.tsx
```

### 7.2 Principio architetturale chiave

**Il game loop NON deve vivere dentro lo stato React.** Il `GameEngine` gestisce il proprio ciclo con `requestAnimationFrame`, disegna direttamente sul canvas via riferimento diretto (`useRef`), e comunica con React solo per eventi discreti (aggiornamento punteggio, cambio schermata, game over) tramite callback o tramite lo Zustand store, aggiornato non ad ogni frame ma solo quando i valori effettivamente cambiano (es. punteggio cambia solo su un match, non ogni frame).

---

## 8. Schema dati Firestore

### 8.1 Collezione `scores`

```
scores/{scoreId}
  userId: string          // uid Firebase Auth (anche anonimo)
  displayName: string      // nickname scelto dal giocatore o "Anonymous_XXXX" generato
  score: number
  levelReached: number
  timestamp: Timestamp
```

### 8.2 Regole Firestore (bozza)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.score is int
                    && request.resource.data.score >= 0
                    && request.resource.data.score < 1000000;
      allow update, delete: if false; // punteggi immutabili, no editing post-hoc
    }
  }
}
```

### 8.3 Query leaderboard

- Top 10 globale: `orderBy('score', 'desc').limit(10)`
- Top personale dell'utente corrente: filtrare per `userId == currentUser.uid`, `orderBy('score', 'desc').limit(1)` per il record personale

### 8.4 Flusso di salvataggio

1. Al primo avvio, se l'utente non è autenticato, effettuare login anonimo automatico (`signInAnonymously`) in modo trasparente, senza richiedere azioni all'utente.
2. Al game over, mostrare uno stato "Salvataggio..." (non bloccante) mentre si scrive su Firestore.
3. Se la scrittura fallisce (offline, errore rete), mostrare un messaggio non invasivo ("Punteggio non salvato — controlla la connessione") ma NON bloccare il flusso: l'utente deve poter tornare al menu comunque.
4. Nickname: al primo avvio, chiedere un nickname opzionale (default: generato automaticamente, es. `User_` + 4 cifre random) salvato in `localStorage` e riutilizzato per le run successive.

---

## 9. Audio

Tutti gli effetti sonori devono essere brevi (< 1 secondo) e in stile 8-bit/retro/synth, coerenti col tema:

| Evento | Suono |
|---|---|
| Sparo pacchetto | Beep corto acuto |
| Match/esplosione base | Suono tipo "pop" digitale/glitch breve |
| Combo (x2+) | Suono ascendente più intenso per ogni livello di combo |
| Power-up attivato | Suono distintivo per tipo (es. `sleep()` → suono "rallentato" con pitch-down) |
| Game over | Suono discendente tipo "crash"/errore di sistema |
| Livello completato | Breve jingle ascendente positivo |

Implementazione: `AudioManager.ts` centralizza il caricamento e la riproduzione, con un semplice sistema di pool per evitare latenza alla riproduzione ripetuta. Includere un toggle mute/unmute in Settings, persistito in `localStorage`.

Nota: gli asset audio non sono forniti in questa spec. Claude Code deve implementare l'`AudioManager` in modo che sia pronto a caricare file da `public/audio/*.mp3` con nomi file prevedibili (es. `shoot.mp3`, `match.mp3`, `combo-2.mp3`, ecc.) — i file audio reali verranno aggiunti successivamente, o generati/sostituiti con placeholder silenziosi in sviluppo.

---

## 10. UI/UX — Schermate richieste

1. **Main Menu**: titolo "Core Dump", pulsanti Gioca / Classifica / Impostazioni, estetica terminale (es. cursore lampeggiante `_` accanto al titolo).
2. **Game Screen**: canvas full-viewport, HUD sovrapposto con punteggio corrente, livello corrente, anteprima prossimo pacchetto, pulsante pausa.
3. **Pause overlay**: Riprendi / Riavvia livello / Torna al menu.
4. **Level Complete**: punteggio livello, bonus, pulsante prosegui.
5. **Game Over**: punteggio finale, form nickname (se non già impostato), pulsante salva e torna al menu, pulsante riprova.
6. **Leaderboard**: top 10 globale + posizione/record personale evidenziato.
7. **Settings**: mute audio, reset nickname, (facoltativo) selezione difficoltà iniziale.

Layout responsive: su mobile il canvas occupa l'intero viewport disponibile con HUD compatto in alto; su desktop può avere margini/cornice per un feel più "da monitor".

---

## 11. PWA e deployment

- Configurare `vite-plugin-pwa` con:
  - `manifest.json`: nome "Core Dump", icone (da generare, placeholder accettabile in sviluppo), `display: standalone`, `theme_color` e `background_color` allineati alla palette scura del tema.
  - Service worker con precaching degli asset statici (JS/CSS/font/audio) per permettere l'avvio offline dopo la prima visita (il salvataggio punteggi resterà ovviamente non disponibile offline).
- Deploy target: Firebase Hosting (`firebase deploy --only hosting`), coerente con l'uso di Firestore/Auth dello stesso progetto Firebase.
- Variabili di configurazione Firebase (apiKey, projectId, ecc.) devono essere lette da variabili d'ambiente Vite (`import.meta.env.VITE_FIREBASE_*`), mai hardcoded nel codice sorgente.

---

## 12. Fuori scope per questa versione (non implementare)

- Multiplayer realtime / sfide testa a testa
- Sistema di achievement/trofei
- Monetizzazione, acquisti in-app, pubblicità
- Editor di livelli custom da parte dell'utente
- Login con provider social diversi da Google (no Facebook, Apple, ecc.)
- Localizzazione multilingua (v1 solo italiano o solo inglese, a scelta di implementazione — vedi nota sezione 13)

---

## 13. Note aperte per l'implementatore

- **Lingua UI:** questa spec non impone una lingua specifica per l'interfaccia. Scegliere italiano o inglese in modo coerente in tutto il progetto (non mescolare); in assenza di altre indicazioni, default a **inglese** per coerenza con il naming tecnico già scelto (`ERROR`, `WARNING`, `SEGFAULT!`, ecc., che sono termini universalmente riconosciuti in inglese anche da sviluppatori italiani).
- **Asset grafici e audio reali** (icone pacchetti, font, file mp3) non sono allegati a questa spec: implementare con placeholder geometrici (forme/colori via Canvas, nessuna immagine esterna richiesta per la v1 giocabile) in modo che il gioco sia completamente funzionante anche prima dell'arrivo di asset grafici/audio definitivi.
- **Testing:** non è richiesta una suite di test automatici per la v1; priorità a un MVP giocabile end-to-end (menu → gioco → game over → salvataggio → classifica).

---

## 14. Criteri di completamento (Definition of Done)

L'implementazione si considera completa quando:

1. Il giocatore può avviare una partita dal menu principale.
2. Il gioco è completamente giocabile via mouse (desktop) e touch (mobile): mira, sparo, match, combo, power-up, game over.
3. Il game over salva correttamente il punteggio su Firestore (con login anonimo automatico).
4. La classifica mostra correttamente il top 10 globale.
5. Il progressivo di difficoltà tra almeno i primi 3 livelli è visibilmente diverso (velocità/lunghezza catena/numero colori).
6. L'app è installabile come PWA e si avvia offline (schermata di gioco, non necessariamente il salvataggio punteggi).
7. Il tema visivo "Core Dump" (palette scura, font monospace, naming da log di sistema) è applicato coerentemente in tutte le schermate.
