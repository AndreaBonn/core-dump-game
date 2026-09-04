# Piano RPI — Core Dump: chiusura finding di produzione + completamento espansione feature

Slug proposto: `003-hardening-and-features` (branch base: `master`).
Riusa e aggiorna `specs/002-game-features-expansion/plan.md` (ADR-006 resta valido salvo dove
indicato in § Divergenze). Non riprogetta ciò che è già deciso lì.

---

## Obiettivo

Portare Core Dump da "clone corretto ma non pubblicabile" a prodotto giocabile su mobile,
verificabile end-to-end e completo delle feature di retention/varietà già pianificate,
tenendo il sim deterministico, `EngineEvents` come unico confine engine→React e i limiti
dimensionali delle rules di progetto.

---

## Stato di partenza (Research, misurato ora)

| Fatto                                                                                                                                                       | BASIS                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Incremento A completato, ma A2 (`applyPowerUp`→PowerUpSystem), A3 (`RunState`) saltati e A8 (`onRunEnd`) rimandato                                          | measured — `src/engine/GameEngine.ts:327` contiene ancora lo switch power-up; `src/types/game.types.ts:22-31` non ha `onRunEnd`; nessun `RunState` in `src/` |
| `GameEngine.ts` a 391 righe contro il limite di 300                                                                                                         | measured — `wc -l src/engine/GameEngine.ts`                                                                                                                  |
| 190 test verdi, coverage 99,31% sul sottoinsieme incluso, typecheck e lint puliti, build ok                                                                 | riportato dall'orchestratore come misurato in questa sessione; non rieseguito qui                                                                            |
| Coverage include solo `src/engine/** src/config/** src/services/**`, exclude 5 renderer (RenderSystem, EngineRenderer, VisualFx, FxRenderer, GuideRenderer) | measured — `vite.config.ts:68-79`                                                                                                                            |
| Nessun test su `src/components/**`, `src/store/**`, `src/hooks/**`; nessuna dipendenza RTL o Playwright                                                     | measured — `find tests -type f` e `package.json` devDependencies                                                                                             |
| Il progetto non è deployato: nessun git remote, nessun `.firebaserc` (solo `.example`)                                                                      | measured — `git remote -v` vuoto, `ls -a` mostra solo `.firebaserc.example`                                                                                  |
| La CI non è mai girata: triggers su `main`, l'unico branch è `master`, e non esiste remote                                                                  | measured — `.github/workflows/ci.yml:4-7` + `git branch -a`                                                                                                  |
| Il board 960x600 ha ~180 px morti per lato: la spirale sta in un quadrato centrale di lato ~572 (`startRadius` max 270 + `PACKET_RADIUS` 16)                | inferred — derivato da `paths.ts:12,19-30` e `levels.ts:43-52`; da confermare con il test del sub-task 2.2                                                   |

**Conseguenza che ordina il piano**: F1 (anti-cheat) e F8 (legal/GDPR) non sono incidenti in
corso, sono **precondizioni del primo deploy**. Non c'è nessuno che oggi possa barare o subire
un trattamento dati. Questo li sposta in coda senza costo, e li fa guadagnare informazione
(F1 dovrà difendere anche i progressi introdotti dal blocco B).

---

## Decisioni architetturali consolidate

Sintesi di `architect` (ADR-0001 e ADR-0002), `security-reviewer` (rules) e `database-reviewer`
(schema e indici). Dove i tre divergono, la scelta finale e la sua provenienza sono dichiarate.

### ADR-007 — Integrità dei punteggi (F1)

**Contesto.** Score calcolato client-side e scritto direttamente in Firestore; le rules validano
solo il range. Nessun rate limit: un client può creare documenti illimitati. Chiunque apra la
console scrive il punteggio che vuole.

| Alternativa                                                           | Impl.  | Ricorrente                     | Ferma davvero                                       | Resta possibile               |
| --------------------------------------------------------------------- | ------ | ------------------------------ | --------------------------------------------------- | ----------------------------- |
| A. Un documento per utente + `update` solo se lo score cresce         | 3-5 h  | zero, anzi meno documenti      | flood, costo Firestore, mescolamento delle modalità | score inventato dalla console |
| B. A + App Check (reCAPTCHA v3)                                       | +2-4 h | quota gratuita a questo volume | scripting fuori dal browser, curl, emulatore        | browser reale strumentato     |
| C. Cloud Function di plausibilità                                     | 1-2 g  | piano Blaze, cold start        | valori assurdi                                      | score plausibile ma falso     |
| D. Classifica dichiarata non autorevole + board separata per modalità | 2-3 h  | zero                           | l'aspettativa sbagliata dell'utente                 | tutto il resto                |

Scartate a monte: replay deterministico server-side (richiederebbe di portare l'engine su Node e
tenerne due copie allineate: settimane, sproporzionato); firma HMAC lato client (la chiave vive
nel bundle).

**Decisione: A + D subito, B solo se compare traffico anomalo.** Non vale la pena difendere lo
score falso scritto da console: costa un backend e un'euristica lo ferma comunque solo in parte.

**Difetto trovato prima del cheating**, e più urgente di esso: endless non ha `finalLevel`, quindi
i suoi punteggi sono illimitati per costruzione e finiscono nella stessa classifica della
campagna. La board si degrada da sola, senza avversari disonesti. Da qui il campo/percorso per
modalità, che è parte della decisione e non un abbellimento.

**Schema: `leaderboards/{mode}/scores/{uid}`.** `architect` proponeva `scores/{uid}` con un campo
`mode`; `database-reviewer` ha obiettato che ogni query "classifica della modalità X" diventa
`where mode == X` + `orderBy score desc`, cioè un indice composito per combinazione, e ha
contro-proposto tre campi nello stesso documento. La subcollection per modalità è la sintesi che
prende il meglio delle due e non è stata prodotta da nessuno dei due agent (BASIS: inferred, da
validare con un test sull'emulatore nel sub-task 7.1):

- ogni classifica è una collezione a sé: `orderBy('score','desc')` è un indice single-field
  automatico, **nessun indice composito da dichiarare e mantenere**;
- il personal best è un `getDoc` diretto sul path: **1 lettura**, e il difetto F4 sparisce alla
  radice invece di essere corretto;
- `mode` sta nel path, quindi non è falsificabile in un payload;
- un documento per utente per modalità: niente flood, niente scansione, `delete` del proprio
  documento banale (serve a F8);
- costo: aprire il profilo completo sono 3 letture invece di 1. Irrilevante a questo volume.

Si perde lo storico dei run: accettato, oggi nessuna funzione lo usa.

**Rules (versione da `security-reviewer`, adattata al path per modalità).** La bozza iniziale
(`update` con il solo confronto sullo score) aveva quattro buchi, tutti da chiudere: senza
`hasOnly` si iniettano campi extra sull'update; senza rivalidare `displayName`/`levelReached` i
bound valgono solo alla creazione; `timestamp` non rivalidato è falsificabile; `userId` non
ribadito immutabile.

```
match /leaderboards/{mode}/scores/{uid} {
  allow read: if true;

  function validShape() {
    let d = request.resource.data;
    return d.keys().hasOnly(['userId','displayName','score','levelReached','timestamp'])
      && d.userId == uid && d.userId == request.auth.uid
      && d.displayName is string && d.displayName.size() > 0 && d.displayName.size() <= 24
      && d.score is int && d.score >= 0 && d.score < 1000000
      && d.levelReached is int && d.levelReached >= 1 && d.levelReached <= 100
      && d.timestamp == request.time
      && mode in ['campaign','endless','daily'];
  }

  allow create: if request.auth != null && uid == request.auth.uid && validShape();
  allow update: if request.auth != null && uid == request.auth.uid
    && resource.data.userId == request.auth.uid
    && validShape() && request.resource.data.score > resource.data.score;
  allow delete: if request.auth != null && request.auth.uid == uid;
}
```

**Cosa resta scoperto, dichiarato invece che nascosto**: score falsi scritti da console;
`allow read: if true` consente di leggere l'intera collezione ignorando il `limit(10)`
applicativo (P1 secondo `security-reviewer`, mitigabile solo con App Check o una Function di
lettura); creazione massiva di identità anonime, frenata solo dalle quote di Google
(BASIS: inferred); nessuna moderazione dei nickname.

### ADR-008 — Board su mobile portrait (F2)

**Il punto non ovvio**: ruotare non serve. In landscape 700x375 lo scale è
`min(700/960, 375/600) = 0.625`, esattamente lo stesso che si ottiene con un riquadro quadrato in
portrait. Il moltiplicatore lo detta il rapporto fra lato corto del viewport e lato lungo del
board, non l'orientamento. Costo maggiore, guadagno zero: la rotazione non è un'alternativa reale.

**Decisione: view-box adattivo (opzione A della disambiguazione D2)**, con il suggerimento di
ruotare come solo complemento cosmetico. Il fit non è più sul board 960x600 ma su un riquadro di
interesse: in portrait il quadrato centrale che contiene la spirale. `BOARD_WIDTH/HEIGHT`,
`paths.ts`, collisioni, seed e test di invarianza **non sono toccati**: il sim resta identico e lo
stesso seed daily produce lo stesso gioco su ogni device.

Scartata la via del board a proporzioni variabili (`architect` la valutava come profili logici
distinti, 1-1,5 g): cambia la geometria dei path, quindi lo stesso seed non è più confrontabile
fra device e il daily perde la sua unica ragione di esistere. Costa di più e toglie una garanzia.

**Resta scoperto** (BASIS: unknown, nessuna misura di precisione touch): a 375 px il raggio
renderizzato passa da ~6 a ~10 px, meglio ma ancora piccolo per un dito. Il limite vero è che
`InputSystem.onPointerDown` mira e spara nello stesso gesto: su schermo stretto non c'è modo di
correggere prima del rilascio. Se dopo il Blocco 2 il portrait resta scomodo, il candidato
successivo è il tap-per-mirare con conferma separata, non un ulteriore ritocco di scala.

---

## Definition of Done (per blocco, verificabile)

Ogni voce è un fatto osservabile con un comando. Le voci contrassegnate `[DEC]` dipendono da
una decisione utente aperta (vedi § Decisioni da confermare).

### DoD Blocco 0 — Rientro limiti GameEngine — CHIUSO, obiettivo rivisto

- [x] `npx vitest run` da 190 a 219 test verdi **senza un solo assert esistente modificato**
      (il diff su `tests/` contiene solo aggiunte).
- [x] Ogni modulo nuovo sotto `src/engine/core/` ha un file di test proprio e riporta 100%
      statements; nessun modulo nuovo è stato aggiunto a `coverage.exclude`.
- [x] Comportamento invariato: il test di parità campagna passa senza modifiche.
- [~] `wc -l src/engine/GameEngine.ts` < 300: **non raggiunto, 333 righe** (da 391, -15%).

**Perché il target è stato rivisto (decisione utente, misurata non stimata).** Le due condizioni
"sotto 300 righe" e "nessun assert esistente modificato" non sono soddisfacibili insieme. Il file
non è grande per il codice che contiene ma per il numero di membri che deve **esporre**: 28 righe
di import, 44 di campi e costruttore, ~58 per le 9 API pubbliche e ~170 per i 15 metodi privati
che `tests/engine/gameEngine.test.ts:17-40` pilota direttamente. Svuotando ogni corpo residuo in
wrapper di una riga si resta intorno a 300; estrarre il clock del loop (`loop`, `start`, `rafId`,
`lastTime`, `accumulator`, ~35 righe) porterebbe a ~306 e romperebbe 3 test.

L'utente ha scelto di accettare 333 e proseguire, invece di pagare ora la riscrittura dei test su
un'API di ispezione (opzione C della disambiguazione D1, ~mezza giornata, ~550 righe di test).
Conseguenza sul resto del piano: i verify `wc -l < 300` dei sub-task C7 e D2 diventano **"non
peggiora rispetto a 333"**. Se un blocco futuro viene di nuovo bloccato dai test, l'opzione C
torna sul tavolo con un caso concreto invece che in astratto.

Cosa è uscito dall'engine, tutto in moduli con test propri: le regole dei power-up
(`PowerUpSystem.resolvePowerUp`), la costruzione del livello (`core/levelBuilder`), la
composizione del frame (`EngineRenderer.present`), la tastiera (`InputSystem`), il feedback del
colpo (`VisualFx.reactToShot`, `AudioManager.playMatch`), i limiti del board (`core/bounds`), la
regola di vittoria (`runController.isRunWon`) e lo spawn dei proiettili (`ShotSystem`).

### DoD Blocco 1 — F4 personal best e schema della leaderboard

Il draft trattava F4 come fix isolato (`orderBy` + indice composito) e accettava che diventasse
codice morto se l'ADR avesse scelto il documento per utente. Ora che ADR-007 ha deciso, il fix
isolato non si scrive proprio: si adotta subito lo schema definitivo, che elimina il difetto alla
radice invece di correggerlo. Nessun indice composito verrà mai dichiarato.

- [ ] Esiste un test che, con 60 punteggi dello stesso utente dove il massimo è oltre i primi 50
      restituiti, oggi fallisce (rosso visto prima del verde) e dopo il cambio di schema non è più
      rappresentabile: il test viene sostituito da uno che verifica il `getDoc` diretto.
- [ ] `fetchPersonalBest` è un `getDoc` su `leaderboards/{mode}/scores/{uid}`: 1 lettura, nessuna
      scansione, nessun massimo calcolato in JS.
- [ ] `saveScore` scrive sullo stesso path e passa la modalità della run.
- [ ] `fetchTopScores(mode)` legge dalla collezione della modalità richiesta.
- [ ] Le rules di ADR-007 sono in `firestore.rules` e verificate sull'emulatore: seconda `create`
      rifiutata, `update` con score minore rifiutato, con score maggiore accettato, `delete` del
      proprio documento accettato e quello altrui rifiutato.
- [ ] Nessun `firestore.indexes.json`: se serve, lo schema è sbagliato.

### DoD Blocco 2 — F2 mobile portrait

- [ ] A 375x700 CSS il board occupa un'area quadrata di lato >= 370 px (contro i 375x234 di
      oggi) e il diametro renderizzato di un packet è >= 18 px CSS.
- [ ] A 1280x800 il rendering è **identico pixel-per-pixel** a prima del blocco (nessuna
      regressione desktop): verificato da unit test su `fitViewport` che riproduce scale e
      offset attuali per quella coppia di dimensioni.
- [ ] `screenToBoard(pointer)` resta l'inverso esatto della trasformazione di disegno in
      entrambi gli orientamenti (test di round-trip su 4 punti).
- [ ] Un test dimostra che tutti i waypoint di `buildLevelConfig(level)` per `level` 1..50
      cadono dentro il content box: il crop non taglia mai gioco.
- [ ] Il sim non è toccato: `BOARD_WIDTH`/`BOARD_HEIGHT`, `paths.ts`, collisioni e seed
      invariati; i test di invarianza esistenti passano senza modifiche.

### DoD Blocco 3 — F3 test UI e E2E

- [ ] `npx vitest run` include almeno un test per: `useGameStore`, `useSettingsStore`,
      `useLeaderboard`, `MainMenu`, `GameOverScreen`.
- [ ] `npx playwright test` esegue uno smoke: menu → Play Campaign → click sul canvas → lo
      score nell'HUD cambia; e cattura screenshot a 375x700 e 1280x800.
- [ ] Nessun `waitForTimeout`/sleep arbitrario nelle spec E2E: solo attese su condizione.
- [ ] `npm run test:coverage` include `src/store/**` e `src/hooks/**` e il report non regredisce
      sotto l'80% di righe sui moduli inclusi. `[DEC]` (soglia da fissare, vedi Blocco 5)

### DoD Blocco 4 — F5 error boundary + F6 prompt update PWA

- [ ] Un componente che lancia in render viene intercettato: test RTL verifica che compaia il
      fallback con azione di ricarica e che l'errore non propaghi oltre il boundary.
- [ ] `main.tsx` monta `App` dentro il boundary.
- [ ] Con `registerType: 'prompt'`, dopo un nuovo build l'utente vede un avviso "nuova versione
      disponibile" con azione esplicita di aggiornamento; l'avviso rispetta z-index toast 500.
- [ ] Nessun SDK di monitoring esterno introdotto senza decisione: `[DEC]`.

### DoD Blocco 5 — F7 CI

- [ ] Il workflow gira sul branch reale del repo (`master` incluso nei trigger, oppure il branch
      rinominato): `grep -n "branches" .github/workflows/ci.yml` mostra il branch corrente.
- [ ] Il job fallisce se la copertura scende sotto la soglia scelta (dimostrato abbassando
      artificialmente un test una volta e osservando il rosso).
- [ ] Esiste `.github/dependabot.yml` valido (npm settimanale + github-actions).
- [ ] Il job E2E Playwright gira in CI e pubblica gli screenshot come artefatto.
- [ ] Deploy: `[DEC]` — workflow presente e verificato solo se esiste un progetto Firebase reale.

### DoD Blocco 6 — F8 licenza e privacy

- [ ] Esiste `LICENSE` a root e il README non dice più "Not yet specified". `[DEC]` sulla licenza.
- [ ] Esiste un'informativa privacy raggiungibile dall'app (non solo un file in `docs/`) che
      dichiara: uid anonimo, nickname pubblico, punteggio, timestamp, finalità, conservazione,
      e come ottenere la cancellazione.
- [ ] `firestore.rules` consente `delete` a chi possiede il documento
      (`request.auth.uid == resource.data.userId`) e a nessun altro, dimostrato da test rules
      sull'emulator: il proprietario cancella, un altro utente riceve permission-denied.
- [ ] Dalla UI l'utente può cancellare i propri punteggi in meno di 3 interazioni.

### DoD Blocco 7 — F1 anti-cheat

- [ ] Esiste ADR-007 che sceglie l'approccio e nomina esplicitamente ciò che NON difende.
- [ ] Un client che invia uno score arbitrario alto viene rifiutato, o è dichiarato
      esplicitamente accettabile nell'ADR con la ragione.
- [ ] Un client anonimo non può creare più di N documenti in un intervallo dichiarato
      (l'attuale "illimitati" non è più vero), dimostrato da test rules.
- [ ] Il fix del Blocco 1 resta coerente o è dichiarato superato (vedi § Rischi, interazione F1↔F4).

### DoD Blocco B — Retention meta

Eredita la DoD di `002/plan.md` § Incremento B, con queste modifiche:

- [ ] Le soglie stelle sono **derivate** dal tuning del livello, quindi definite anche oltre
      `TOTAL_LEVELS` (endless e daily), non una tabella di 10 valori.
- [ ] Il level-select avvia una run campagna da un livello specifico usando `RunConfig.startIndex`
      già esistente, senza aggiungere un secondo meccanismo di avvio.
- [ ] I progressi sopravvivono al reload e a un `localStorage` che lancia (modalità privata):
      il reader non deve poter rompere l'avvio dell'app.
- [ ] La logica valutabile (`stars`, `stats`, `achievements`) sta in `src/engine/core/` puri al
      100% di copertura; gli store restano gusci di I/O.

### DoD Blocco C — Varietà gameplay

Eredita `002/plan.md` § Incremento C, più:

- [ ] I nuovi path (serpentina, loop) producono waypoint **dentro il content box** definito nel
      Blocco 2, dimostrato dallo stesso test del sub-task 2.2 esteso ai nuovi `pathKind`.
- [ ] `wc -l src/engine/GameEngine.ts` non peggiora rispetto alle 333 righe del Blocco 0.

### DoD Blocco D — Onboarding e rifiniture

Eredita `002/plan.md` § Incremento D, più:

- [ ] Il tutorial è verificato da uno spec Playwright che lo completa dall'inizio alla fine.
- [ ] `wc -l src/engine/GameEngine.ts` non peggiora rispetto alle 333 righe del Blocco 0.

---

## Assunzioni

1. Il progetto non è pubblicato e non ha utenti reali oggi. **Se questa è falsa, l'ordine dei
   blocchi cambia: F1 e F8 diventano bloccanti e salgono subito dopo il Blocco 1.** [BLOCCANTE
   da confermare]
2. Le decisioni di ADR-006 (`RunConfig` union, `matchable:boolean`, soglie assolute, un solo
   `onRunEnd`) restano valide. Il piano le riusa, non le riapre.
3. Il target mobile è il browser mobile in portrait, non una app nativa; nessun requisito di
   orientation lock a livello di OS.
4. Il gioco resta single-player e la leaderboard resta un elemento accessorio: perderla non
   rende il gioco inutilizzabile. Questo è ciò che consente a F1 di stare in coda.
5. Firebase resta opzionale (`isFirebaseConfigured`): tutte le feature del blocco B sono
   locali e non richiedono cloud.
6. Il piano Firebase disponibile è Spark salvo indicazione contraria: una Cloud Function per
   F1 richiede Blaze e va confermata come costo. [da confermare solo se l'ADR sceglie quella via]
7. La suite Vitest resta jsdom; Playwright gira su Chromium in CI, non su matrice multi-browser.
8. Nessun requisito di i18n: l'interfaccia resta in inglese come oggi.

---

## Disambiguazione

Tre punti hanno interpretazioni che portano ad architetture diverse. Elencati prima, valutati poi.

### D1 — Come far rientrare `GameEngine` sotto 300 righe

Approcci plausibili:

- **A** — Estrarre in moduli puri mantenendo invariati i nomi dei campi e metodi privati che i
  test già leggono; `RunState` cancellato definitivamente.
- **B** — Introdurre `RunState` come da piano 002 e aggiornare i ~200 punti di test che leggono
  `internals.score`, `internals.level`, `internals.sleepTimer`, `internals.pendingFork`.
- **C** — Esporre un'API pubblica di ispezione (`engine.snapshot()`), riscrivere i test su
  quella, poi `RunState` diventa libero.

Conseguenze:

- A: costo minimo (wrapper privati di 3-5 righe), zero rischio sul determinismo, ma i test
  restano accoppiati alla struttura privata di `GameEngine` (`tests/engine/gameEngine.test.ts:17-40`
  dichiara 22 membri privati). Il debito di accoppiamento resta, non peggiora.
- B: paga il costo dell'accoppiamento senza rimuoverlo (i test continuerebbero a leggere lo
  stato privato, solo annidato di un livello). È la ragione per cui A3 fu saltato la prima volta:
  il problema non era estrarre, era che i test conoscono la forma interna.
- C: rimuove l'accoppiamento una volta per tutte e sblocca ogni refactor futuro, ma è un blocco
  a sé (riscrittura di ~550 righe di test) e introduce superficie pubblica solo per i test, che
  è esattamente l'astrazione speculativa che le rules vietano.

**Raccomandata: A.** `RunState` era un mezzo per il fine "sotto 300 righe", non un requisito: la
tabella di decisione delle rules (guadagno marginale, costo in indirezione) dice di scartarlo.
C si valuta solo se un blocco futuro viene di nuovo bloccato dai test, non prima.

### D2 — Come rendere giocabile il portrait (F2)

Approcci plausibili:

- **A** — View-box adattivo: il fit non è più sul board 960x600 ma su un riquadro di interesse;
  in portrait si usa il quadrato centrale che contiene la spirale.
- **B** — Rotazione del rendering di 90° in portrait.
- **C** — Board a proporzioni variabili: `BOARD_WIDTH`/`BOARD_HEIGHT` diventano dinamici.
- **D** — Nessun fix tecnico: schermata "ruota il dispositivo".

Conseguenze:

- A: tocca `EngineRenderer.configure` e `screenToBoard` più una costante; il sim, i path, le
  collisioni, i seed e i test di invarianza non sono toccati. A 375x700 dà scale 0.625 contro
  0.39 di oggi (area di gioco da 375x234 a 375x375).
- B: **matematicamente non migliore di A**. Ruotando, il vincolo diventa la larghezza schermo
  375 contro l'altezza board 600: `min(375/600, 700/960) = 0.625`, lo stesso numero di A. In più
  richiede di invertire i pointer event e disallinea l'HUD DOM dal canvas ruotato. Costo
  maggiore, guadagno zero.
- C: cambia la geometria dei path, quindi cambia il layout a parità di seed. Il daily challenge
  smetterebbe di essere lo stesso gioco su device diversi, che è la sua unica ragione di
  esistere. Tocca `paths.ts`, collisioni, e i test di invarianza.
- D: costo quasi nullo, ma su iOS Safari il lock di orientamento fuori da fullscreen non è
  disponibile, quindi resta una richiesta all'utente, non una garanzia. Rinuncia al mobile
  portrait invece di risolverlo.

**Raccomandata: A**, con D come complemento cosmetico solo se dopo A il portrait resta stretto
su schermi molto piccoli. C è da escludere a priori se il daily deve restare confrontabile fra
device (vedi Decisione 3).

### D3 — Dove vive la logica del viewport (vincolo di coverage)

`EngineRenderer.ts` è in `coverage.exclude` (`vite.config.ts:74`). Se il calcolo del view-box
finisce lì dentro, non è coperto e non è testabile senza allentare il gate.

- **A** — Funzione pura `fitViewport()` in `src/engine/core/viewport.ts` (in coverage, 100%),
  `EngineRenderer` la chiama e applica il risultato.
- **B** — Logica dentro `EngineRenderer` e rimozione del file dall'exclude.

**Raccomandata: A.** È lo stesso pattern già usato per `runController` e `dailySeed`, e mantiene
il gate di coverage intatto. B trascinerebbe in coverage anche `setTransform` e `draw`, che
richiedono un canvas vero.

---

## Divergenze fra `002/plan.md` e il codice attuale (da aggiornare, non riprogettare)

| Punto del piano 002                         | Stato reale                                                                                               | Azione                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| A2 `applyPowerUp` → PowerUpSystem           | non fatto, switch a `GameEngine.ts:327`                                                                   | Blocco 0, sub-task 0.1                                                 |
| A3 oggetto-dato `RunState`                  | non fatto                                                                                                 | **Cancellato** per decisione D1, non rimandato                         |
| A8 `onRunEnd(RunResult)`                    | non fatto                                                                                                 | Primo sub-task del Blocco B, dove nasce il consumatore                 |
| A10 "GameEngine < 300 righe"                | non raggiunto (391)                                                                                       | Blocco 0                                                               |
| B2 "`starThresholds` per i 10 livelli"      | i livelli ora sono **procedurali** (`buildLevelConfig(level, seedBase)`, `levels.ts:60`), non una tabella | Soglie derivate da `tuningForLevel`, valide anche oltre `TOTAL_LEVELS` |
| C9 "assegna path ai livelli in `levels.ts`" | stessa causa: non esiste più una tabella per livello                                                      | `pathKindFor(level)` derivato, dentro `buildLevelConfig`               |
| C "GameEngine di nuovo verso 300 righe"     | è già oltre                                                                                               | Il Blocco 0 diventa precondizione di C, non un follow-up               |
| Nota "coverage esclude 4 renderer"          | gli exclude sono 5 (aggiunto `EngineRenderer.ts`)                                                         | Aggiornare la nota                                                     |

---

## Blocchi

Ogni blocco è committabile da solo e lascia la suite verde. Stime per sub-task fra 10 e 30
minuti; le stime a blocco includono verifica e review, non il buffer globale.

### Blocco 0 — Rientro limiti `GameEngine` (comportamento invariato) — 0,5 g

Perché per primo: dà il budget di righe che B, C e D consumeranno tutti e tre, ed è l'unico
commit del piano a comportamento rigorosamente invariato, quindi il più sicuro da fare per primo.

| #   | Sub-task                                                                                                                                                                            | Stima | Verify                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | Estrarre lo switch power-up in `PowerUpSystem.resolvePowerUp(type, ctx)` che ritorna un descrittore di effetto; `GameEngine.applyPowerUp` resta wrapper privato con la stessa firma | 25m   | `grep -n "case 'SLEEP'" src/engine/GameEngine.ts` non trova nulla; `npx vitest run tests/engine/powerup.test.ts tests/engine/gameEngine.test.ts` verde senza modifiche agli assert |
| 0.2 | Test di `resolvePowerUp` per tutti e 4 i tipi più il caso "nessun candidato" di GARBAGE_COLLECT                                                                                     | 20m   | `npm run test:coverage` mostra `PowerUpSystem.ts` 100% statements                                                                                                                  |
| 0.3 | Estrarre `buildLevel`+`drawType` in `src/engine/core/levelBuilder.ts` puro: `buildLevelState(config)` → `{path, voidHole, chain, cursor, rng, types, baseSpeed}`                    | 30m   | `npx vitest run tests/engine` verde; il test di parità campagna passa invariato                                                                                                    |
| 0.4 | Test `levelBuilder`: due chiamate con lo stesso `LevelConfig` danno `packets.map(p=>p.type)` identici                                                                               | 20m   | `npx vitest run tests/engine/core/levelBuilder.test.ts` verde, coverage 100% del file                                                                                              |
| 0.5 | Spostare la costruzione della `RenderScene` (`drawFrame`, `isInsideBoard`) dentro `EngineRenderer` (già escluso da coverage)                                                        | 25m   | `npm run typecheck` pulito; `wc -l src/engine/GameEngine.ts` scende                                                                                                                |
| 0.6 | Se ancora >= 300: estrarre la gestione tastiera (`onKeyDown`, `swap`) in `InputSystem`                                                                                              | 25m   | `wc -l src/engine/GameEngine.ts` < 300; `npx vitest run` 190 verdi; `npm run lint` 0 problemi                                                                                      |

Rischio del blocco: ogni estrazione deve preservare i 22 membri privati elencati in
`tests/engine/gameEngine.test.ts:17-40`. Verifica di controllo: `git diff --stat tests/` deve
mostrare solo file nuovi, zero righe rimosse dai test esistenti.

### Blocco 1 — F4 personal best e schema leaderboard per modalità — 0,5 g

Perché qui: F4 è un bug reale in un percorso già scritto, e ADR-007 ha deciso lo schema che lo
rende irrappresentabile. Farlo ora costa mezza giornata e cancella l'interazione F1↔F4 che il
draft segnalava come rischio R1. La parte di F1 che resta nel Blocco 7 è quella non strutturale
(App Check, copy della classifica), non lo schema.

| #   | Sub-task                                                                                                                                         | Stima | Verify                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Test che riproduce F4: 60 documenti dello stesso utente, il massimo oltre i primi 50 restituiti                                                  | 20m   | `npx vitest run tests/services/leaderboardService.test.ts` mostra 1 FAIL con atteso != ottenuto                               |
| 1.2 | `npm i -D @firebase/rules-unit-testing` + script `test:rules`; test delle rules attuali sull'emulatore come baseline                             | 30m   | `firebase emulators:exec --only firestore "npm run test:rules"` verde sulle rules di oggi                                     |
| 1.3 | Nuove rules `leaderboards/{mode}/scores/{uid}` da ADR-007, guidate dai test: create, seconda create, update minore, update maggiore, delete      | 30m   | i 5 casi passano; `delete` altrui rifiutato                                                                                   |
| 1.4 | `leaderboardService`: `saveScore(mode)` su `setDoc`/`updateDoc` del path per modalità, `fetchPersonalBest` come `getDoc`, `fetchTopScores(mode)` | 30m   | `npx vitest run tests/services` verde; il test 1.1 è sostituito da uno sul `getDoc`; nessuna query con `where` resta nel file |
| 1.5 | Propagare la modalità dal punto di salvataggio (`GameScreen.handleSave`) e mostrare la classifica della modalità scelta                          | 25m   | test RTL o verifica runtime: salvare in endless non scrive nella board campaign                                               |
| 1.6 | Migrazione: la vecchia collezione `scores` non ha dati reali (nessun deploy), quindi si dismette senza migrare. Dichiararlo nel report           | 10m   | `git grep -n "COLLECTION = 'scores'"` non trova più il vecchio path                                                           |

### Blocco 2 — F2 giocabilità mobile portrait — 0,5 g

Perché prima di B/C/D: definisce il content box a cui i nuovi path del Blocco C dovranno
conformarsi, e il layout portrait su cui le 4 schermate nuove di B dovranno stare. Farlo dopo
significa ritoccarle tutte.

| #   | Sub-task                                                                                                                                                                                      | Stima | Verify                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | `src/engine/core/viewport.ts` puro: `fitViewport({boardWidth, boardHeight, cssWidth, cssHeight})` → `{scale, offsetX, offsetY}`, estratto identico da `EngineRenderer.configure:33-38`        | 25m   | test: per board 960x600 e css 1280x800 ritorna gli stessi valori che il codice produce oggi (baseline catturata prima della modifica) |
| 2.2 | `CONTENT_BOX` in `constants.ts` con commento che lega il valore a `startRadius` max + `PACKET_RADIUS`; test che per `level` 1..50 tutti i waypoint di `buildLevelConfig` cadono dentro il box | 25m   | `npx vitest run tests/config/contentBox.test.ts` verde; se fallisce, il box va allargato prima di procedere                           |
| 2.3 | `fitViewport` sceglie il box: portrait (`cssHeight > cssWidth`) → content box quadrato, altrimenti board pieno                                                                                | 20m   | test: 375x700 dà scale 0.625 e area disegnata 375x375, con il centro board al centro dello schermo                                    |
| 2.4 | Cablare in `EngineRenderer.configure` e allineare `screenToBoard` allo stesso viewport                                                                                                        | 20m   | test round-trip: `screenToBoard(boardToScreen(p)) == p` (entro 1e-6) su 4 punti, in portrait e in landscape                           |
| 2.5 | Layout portrait dell'HUD: board sopra, HUD sotto invece che overlay, sotto i 640 px di larghezza                                                                                              | 25m   | render osservato a 375x700: l'HUD non copre più il board                                                                              |
| 2.6 | Verifica runtime con screenshot a 375x700 e 1280x800                                                                                                                                          | 25m   | screenshot presenti; diametro packet misurato >= 18 px CSS a 375 di larghezza; il render a 1280 è invariato rispetto alla baseline    |

### Blocco 3 — F3 test UI React e E2E — 1-1,5 g

Perché prima di B e D: B introduce level-select, profilo, achievement e toast; D introduce
l'overlay tutorial. Sono 5 superfici nuove. Costruire l'infrastruttura di test dopo averle
scritte significa scrivere test-after su codice già "funzionante", che è esattamente il modo in
cui i test confermano l'implementazione invece di sfidarla.

Primo della sua specie: la stima include le decisioni di setup che i test successivi ereditano.

| #   | Sub-task                                                                                                                                                                                   | Stima | Verify                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------- |
| 3.1 | `npm i -D @testing-library/react @testing-library/jest-dom @testing-library/user-event`, estendere `tests/setup.ts`, aggiungere `tests/**/*.test.tsx` (già incluso in `vite.config.ts:67`) | 20m   | `npx vitest run` ancora 190 verdi; un render banale di `<Button>` passa                                          |
| 3.2 | Test `useGameStore`: `startGame` resetta la run e preserva il mode, `reportGameOver` imposta il risultato, `advanceLevel` pulisce combo e levelResult                                      | 25m   | `npx vitest run tests/store/useGameStore.test.ts` verde                                                          |
| 3.3 | Test `useSettingsStore` con `localStorage` mockato: muted e nickname persistono e sono riletti al boot                                                                                     | 25m   | idem per `useSettingsStore.test.ts`; include il caso `localStorage.getItem` che lancia                           |
| 3.4 | Test `useLeaderboard` con il service mockato: stati loading, dati, errore                                                                                                                  | 25m   | `useLeaderboard.test.ts` verde, tutti e 3 gli stati asseriti                                                     |
| 3.5 | Test `MainMenu`: ognuno dei 5 pulsanti porta allo screen o al mode atteso                                                                                                                  | 25m   | `MainMenu.test.tsx` verde                                                                                        |
| 3.6 | Test `GameOverScreen`: submit del nickname chiama `onSave` col valore digitato; ogni `saveStatus` rende il messaggio atteso                                                                | 30m   | `GameOverScreen.test.tsx` verde su tutti gli stati di `SaveStatus`                                               |
| 3.7 | Estendere `coverage.include` con `src/store/**` e `src/hooks/**`                                                                                                                           | 15m   | `npm run test:coverage` elenca i nuovi file; annotare la nuova percentuale come baseline per la soglia CI        |
| 3.8 | `npm i -D @playwright/test`, `playwright.config.ts` con `webServer` su `vite preview`, `.gitignore` per artefatti                                                                          | 25m   | `npx playwright test --list` elenca le spec                                                                      |
| 3.9 | Spec E2E smoke: menu → Play Campaign → click sul canvas → lo score nell'HUD cambia; screenshot a 375x700 e 1280x800                                                                        | 30m   | `npx playwright test` verde; nessun `waitForTimeout` nel file (`grep` vuoto); screenshot presenti come artefatto |

### Blocco 4 — F5 error boundary e F6 prompt di aggiornamento — 0,3-0,5 g

Dipende dal Blocco 3 per i test RTL.

| #   | Sub-task                                                                                                 | Stima | Verify                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | `src/components/shared/ErrorBoundary.tsx` con fallback e azione di ricarica                              | 25m   | test RTL: un figlio che lancia produce il fallback, il figlio non è renderizzato, l'errore non propaga                    |
| 4.2 | Montare il boundary in `main.tsx` attorno ad `App`                                                       | 15m   | `npm run build` ok; smoke E2E ancora verde                                                                                |
| 4.3 | `registerType: 'prompt'` in `vite.config.ts` + componente `UpdatePrompt` su `virtual:pwa-register/react` | 30m   | test RTL col modulo virtuale mockato: quando `needRefresh` è true compare l'avviso, il click chiama `updateServiceWorker` |
| 4.4 | Verifica manuale: build, preview, secondo build, ricarica, compare il prompt                             | 20m   | osservato a runtime, riportato nel report; z-index del toast = 500 come da rules                                          |

Monitoring/crash reporting: **non incluso**. Introdurre un SDK esterno (Sentry o simili) è una
decisione con costo privacy che si intreccia con F8, non un dettaglio implementativo. Se serve,
diventa un blocco a sé dopo il Blocco 6.

### Blocco 5 — F7 CI e manutenzione dipendenze — 0,5 g (+0,5-1 g se si aggiunge il deploy)

| #   | Sub-task                                                                                                  | Stima | Verify                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.1 | Allineare i trigger del workflow al branch reale del repo                                                 | 15m   | `grep -n branches .github/workflows/ci.yml` mostra il branch corrente; nota nel report che senza remote la CI non gira comunque (measured) |
| 5.2 | Step coverage con soglia esplicita `[DEC]` (proposta: 80% righe sui moduli inclusi, allineata alle rules) | 20m   | il job fallisce se si abbassa la soglia sotto il valore reale; ripristinato, torna verde                                                   |
| 5.3 | Job E2E Playwright con upload degli screenshot come artefatto                                             | 25m   | il run di CI mostra il job verde e l'artefatto scaricabile                                                                                 |
| 5.4 | `.github/dependabot.yml` (npm settimanale + github-actions)                                               | 15m   | file presente e YAML valido                                                                                                                |
| 5.5 | `[DEC]` Workflow di deploy su Firebase Hosting con service account in secrets                             | 25m   | solo se esiste un progetto reale: il deploy va a buon fine e l'URL risponde                                                                |

### Blocco 6 — F8 licenza, privacy, diritto di cancellazione — 0,5-1 g

Gate di pubblicazione. Da fare prima del primo deploy pubblico, non prima di allora.

| #   | Sub-task                                                                                                                       | Stima | Verify                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | `[DEC]` Scegliere e aggiungere `LICENSE`; aggiornare la sezione License del README                                             | 20m   | `LICENSE` a root; `grep -n "Not yet specified" README.md` vuoto                                                               |
| 6.2 | Informativa privacy raggiungibile in-app (schermata o link da Settings): dati raccolti, finalità, conservazione, cancellazione | 25m   | dal menu Settings si raggiunge l'informativa in 1 click; il testo nomina uid anonimo, nickname pubblico, punteggio, timestamp |
| 6.3 | La `delete` del proprietario è già nelle rules del Blocco 1: qui si verifica che copra il caso reale dalla UI                  | 15m   | test rules già scritti in 1.3 rieseguiti; nessuna regola nuova                                                                |
| 6.4 | Documentare in `docs/` la retention: TTL sui punteggi (proposta 12 mesi) o la scelta esplicita di non averla                   | 20m   | il testo dell'informativa dice per quanto tempo il dato resta                                                                 |
| 6.5 | UI "cancella i miei punteggi" nella schermata Leaderboard, con conferma                                                        | 25m   | E2E o verifica runtime: dopo la conferma il punteggio sparisce dalla lista personale                                          |

Nota da `security-reviewer`: il nickname è dato scelto e pubblicato dall'utente, senza categorie
speciali. Serve una nota nell'informativa ("il nickname è visibile pubblicamente, non usare il tuo
nome reale"), non un DPIA.

### Blocco 7 — F1, parte non strutturale — 0,3-0,7 g

La parte strutturale (schema per modalità, un documento per utente, update solo in crescita,
delete del proprietario) è stata anticipata al Blocco 1 perché ADR-007 è ora deciso. Qui resta
ciò che ha senso solo a ridosso della pubblicazione.

| #   | Sub-task                                                                                                                 | Stima | Verify                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------ |
| 7.1 | Scrivere `docs/adr/0007-leaderboard-integrity.md` e `0008-portrait-viewport.md` dal § Decisioni di questo piano          | 25m   | i due file esistono con Status Accepted e la sezione "cosa non difendiamo"                             |
| 7.2 | Copy della classifica (opzione D dell'ADR): dichiarare in UI che la board è sociale e non verificata                     | 20m   | la schermata Leaderboard mostra la nota; test RTL sul testo                                            |
| 7.3 | `[DEC]` App Check con reCAPTCHA v3, solo se si decide di attivarlo: SDK, CSP, token di debug in dev                      | 30m   | con App Check attivo l'app funziona in dev e in preview; senza il token di debug la scrittura fallisce |
| 7.4 | Se 7.3 è attivo: CSP in `firebase.json` estesa a `https://www.google.com` e `https://www.gstatic.com` per script e frame | 20m   | nessuna violazione CSP in console con reCAPTCHA caricato                                               |

Da `security-reviewer`, P1 che resta aperto in ogni caso: `allow read: if true` permette a un
client di leggere l'intera collezione ignorando il `limit(10)` applicativo. A questo volume è un
costo trascurabile; se il gioco cresce, l'unica difesa reale è App Check sulle letture o una
Function di lettura con cache. Registrato, non risolto.

### Blocco B — Retention meta (dal piano 002, aggiornato) — 3-4 g

| #   | Sub-task                                                                                                                      | Stima | Verify                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B0  | `onRunEnd(RunResult)` in `EngineEvents` + forward in `GameCanvas.tsx:28-37` + handler nello store (i 3 punti del confine)     | 25m   | test engine: a game over e a game won `onRunEnd` è chiamato una volta con `{mode, score, levelReached, won}`; `grep -c onRunEnd src/` = 3 punti attesi |
| B1  | `src/engine/core/stars.ts`: `starsFor(levelScore, thresholds)` puro + test                                                    | 20m   | copertura 100% del file; casi 0, 1, 2, 3 stelle e soglia esatta                                                                                        |
| B2  | Soglie derivate: `starThresholdsFor(level)` dentro `buildLevelConfig`, definite anche oltre `TOTAL_LEVELS`                    | 25m   | test: monotone crescenti, definite per level 1..50, e coerenti con `chainLength` del tuning                                                            |
| B3  | `src/engine/core/stats.ts`: riduttori puri da eventi (packet distrutti, combo massima, run giocate, tempo) + test             | 30m   | copertura 100%; un riduttore applicato due volte allo stesso evento non raddoppia (idempotenza dove attesa)                                            |
| B4  | `useProgressStore` persistito su `coredump.progress`, con reader difensivo (localStorage che lancia non deve rompere il boot) | 30m   | test store: con `getItem` che lancia, lo store parte con i default; con dati validi li rilegge                                                         |
| B5  | `src/engine/core/achievements.ts`: catalogo (>= 15) + `evaluate(state)` puro + test                                           | 30m   | copertura 100%; ogni achievement ha almeno un test che lo sblocca e uno che non lo sblocca                                                             |
| B6  | `useAchievementsStore` persistito + hook su `onRunEnd`                                                                        | 25m   | test: due run che soddisfano lo stesso achievement lo sbloccano una volta sola                                                                         |
| B7  | `LevelSelect.tsx` + estensione della union `Screen`; avvio da livello scelto via `RunConfig.startIndex`                       | 30m   | test RTL: click sul livello 3 chiama `startGame` con startIndex 3; i livelli non sbloccati sono disabilitati                                           |
| B8  | `Profile.tsx` (stats) e `Achievements.tsx` (griglia)                                                                          | 30m   | test RTL: con stats note la vista mostra i valori attesi; con 0 achievement mostra lo stato vuoto (headline + spiegazione + CTA, come da rules UI)     |
| B9  | Cablare gli eventi engine→store per aggiornare stats e achievement a fine run                                                 | 25m   | E2E: completare un livello incrementa il contatore run nella schermata profilo                                                                         |
| B10 | Toast di sblocco achievement (z-index 500)                                                                                    | 20m   | test RTL: allo sblocco compare il toast e sparisce dopo la durata; nessuno sblocco, nessun toast                                                       |
| B11 | Stati mancanti delle nuove viste: loading, empty, error, edge (nickname lungo, 0 progressi)                                   | 25m   | render osservato a 375 e 1280 px; nessuna sovrapposizione, nessun testo tagliato                                                                       |

### Blocco C — Varietà gameplay (dal piano 002, aggiornato) — 4-5,5 g

Blocco più rischioso: tocca il core puro coperto dai test di determinismo. La regressione-first
non è negoziabile.

| #   | Sub-task                                                                                                  | Stima | Verify                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Test di caratterizzazione su `MatchSystem.findRun` e `chainOps` che fissano il comportamento attuale      | 30m   | i nuovi test passano su HEAD prima di ogni modifica; se non passano, il comportamento non è ancora capito                         |
| C2  | `matchable: boolean` su `DataPacket` (default true) + guardia in `findRun` (`MatchSystem.ts:32-46`)       | 30m   | test: un packet non-matchabile interrompe il run e non entra mai in un match; i test C1 restano verdi                             |
| C3  | Generazione hazard in `generateChainPackets` con chance da `LevelConfig`, cappata                         | 25m   | test: con chance 0 nessun hazard, con chance 1 tutti hazard; con seed fisso la sequenza è riproducibile                           |
| C4  | Render distinto dell'hazard                                                                               | 20m   | render osservato: l'hazard è distinguibile senza colore soltanto (forma o glifo), per daltonismo                                  |
| C5  | Estendere `PowerUpType` e `powerUps.ts` con kill-9, try/catch, regex e le costanti di effetto             | 20m   | `npm run typecheck` costringe a gestire i nuovi casi in ogni switch esaustivo                                                     |
| C6  | `PowerUpSystem`: `killRange`, `applyShield`, `removeType` puri + test                                     | 30m   | copertura 100%; `killRange` ai bordi della catena non va fuori indice                                                             |
| C7  | Cablare i nuovi power-up in `resolvePowerUp` (Blocco 0) e lo scudo nel percorso di game over              | 25m   | test: con scudo attivo il primo raggiungimento del void non termina la run, il secondo sì; `wc -l src/engine/GameEngine.ts` non oltre 333 |
| C8  | `buildSerpentine` e `buildLoop` in `paths.ts` + test invarianti (monotonia in arc-length, ingresso→void)  | 30m   | test invarianti verdi per entrambi; e il test 2.2 esteso: i waypoint stanno nel content box                                       |
| C9  | `pathKindFor(level)` derivato dentro `buildLevelConfig` (non tabella statica) e chance hazard per livello | 25m   | test: la campagna resta identica sui livelli dove il kind è la spirale; endless alterna i kind in modo deterministico             |
| C10 | Bilanciamento e verifica runtime: nessun soft-lock da hazard                                              | 30m   | sessione osservata su almeno 3 livelli con hazard al massimo della chance: il livello resta completabile                          |

### Blocco D — Onboarding e rifiniture (dal piano 002) — 2-3 g

| #   | Sub-task                                                                                               | Stima | Verify                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Hit-stop: contatore `hitStopFrames` che salta step interi drenando l'accumulator, mai `dt` frazionario | 30m   | test: dato N, la catena non avanza per N step e poi riprende con la stessa posizione che avrebbe avuto; il fixed-timestep resta invariato |
| D2  | Trigger dell'hit-stop da `outcome.combo` con soglie da costante nominata                               | 20m   | test: combo sotto soglia non congela, combo alta congela per i frame attesi                                                               |
| D3  | Tracer del proiettile in `VisualFx` + disegno in `RenderSystem` (view-only)                            | 30m   | render osservato; nessuna modifica a `fixedUpdate` (`git diff` di GameEngine non tocca il loop fisico)                                    |
| D4  | Reduced-motion sopprime hit-stop e tracer coerentemente con l'esistente                                | 15m   | test: con reduced-motion attivo `hitStopFrames` resta 0 e il tracer è vuoto                                                               |
| D5  | Mode `tutorial` in `runController` con levelProvider scriptato; estendere `RunMode` e lo store         | 25m   | test: il provider tutorial ritorna i livelli scriptati nell'ordine atteso e poi null                                                      |
| D6  | `TutorialOverlay.tsx` con step e hint contestuali                                                      | 30m   | test RTL: ogni step mostra l'hint atteso e avanza sull'evento previsto                                                                    |
| D7  | Flag `coredump.tutorialSeen`: auto-avvio al primo gioco, skippabile, rigiocabile da menu               | 20m   | test store + E2E: con flag assente il tutorial parte, dopo lo skip non riparte, dal menu riparte                                          |
| D8  | Spec E2E che completa il tutorial dall'inizio alla fine                                                | 20m   | `npx playwright test tutorial.spec.ts` verde                                                                                              |

### Blocco E — Boss entity: solo valutazione, non pianificato in dettaglio

Come richiesto, E resta un blocco finale opzionale da confermare a parte. Valutazione:

- **Costo**: +5-8 giorni, la stima più incerta del piano (quadrante "obiettivo chiaro, soluzione
  da definire": nessuno ha ancora fissato HP, fasi, regola di danno e pattern d'attacco).
- **Rischio**: il più alto del progetto. È l'unica feature che introduce un sistema **accanto**
  al marble-shooter invece che dentro: tocca loop, collisioni e render insieme, cioè le tre
  superfici che tutti gli altri blocchi hanno tenuto separate.
- **Dipendenze**: richiede A (fatto), il Blocco 0 (budget righe) e C (riusa hazard e path).
- **Precondizione non tecnica**: un design doc con le regole del boss. Senza, non è stimabile
  meglio di così, e stimarlo meglio senza sarebbe finzione.
- **Alternativa più economica scartata da ADR-006** (boss come variante di regole config-driven,
  ~1-1,5 g): l'utente ha già confermato di volere l'entità vera. Resta però la via di uscita se
  il budget stringe: si può spedire la variante di regole come "mini-boss" e rimandare l'entità.

**Proposta**: trattare E come progetto separato, da avviare solo dopo che B, C e D sono in
produzione e osservati. Il primo deliverable di E non è codice ma il design doc, time-boxed a
mezza giornata, con ri-pianificazione a valle.

---

## File impattati

| File                                                                              | Tipo    | Blocco  | Motivo                                                                                         |
| --------------------------------------------------------------------------------- | ------- | ------- | ---------------------------------------------------------------------------------------------- |
| `src/engine/GameEngine.ts`                                                        | mod     | 0, C, D | Estrazioni per rientrare sotto 300; cablaggio nuovi power-up e hit-stop                        |
| `src/engine/systems/PowerUpSystem.ts`                                             | mod     | 0, C    | Accoglie `resolvePowerUp` estratto e i 3 effetti nuovi                                         |
| `src/engine/core/levelBuilder.ts`                                                 | new     | 0       | Costruzione livello pura e testabile (in coverage)                                             |
| `src/engine/core/viewport.ts`                                                     | new     | 2       | `fitViewport` puro: la logica del view-box fuori da `EngineRenderer` che è escluso da coverage |
| `src/engine/systems/EngineRenderer.ts`                                            | mod     | 0, 2    | Costruzione della scene; applicazione del viewport e inverso in `screenToBoard`                |
| `src/config/constants.ts`                                                         | mod     | 2       | `CONTENT_BOX` legato a `startRadius` + `PACKET_RADIUS`                                         |
| `src/services/leaderboardService.ts`                                              | mod     | 1       | Path per modalità, `getDoc` per il personal best, scrittura in crescita                        |
| `firestore.rules`                                                                 | mod     | 1       | Schema `leaderboards/{mode}/scores/{uid}`, update in crescita, delete del proprietario         |
| `tests/rules/leaderboard.rules.test.ts`                                           | new     | 1       | Rules verificate sull'emulatore, non solo lette                                                |
| `src/components/shared/ErrorBoundary.tsx`                                         | new     | 4       | Nessun boundary oggi: un throw in render lascia lo schermo bianco                              |
| `src/main.tsx`                                                                    | mod     | 4       | Montare il boundary                                                                            |
| `vite.config.ts`                                                                  | mod     | 3, 4    | `coverage.include` esteso a store e hooks; `registerType: 'prompt'`                            |
| `.github/workflows/ci.yml`                                                        | mod     | 5       | Trigger sul branch reale, soglia coverage, job E2E                                             |
| `.github/dependabot.yml`                                                          | new     | 5       | Aggiornamento dipendenze                                                                       |
| `playwright.config.ts`                                                            | new     | 3       | Config E2E con webServer su preview                                                            |
| `LICENSE`, `README.md`                                                            | new/mod | 6       | Licenza assente oggi                                                                           |
| `src/types/game.types.ts`                                                         | mod     | B, C    | `onRunEnd`/`RunResult`; `matchable`; nuovi `PowerUpType`                                       |
| `src/engine/core/stars.ts`, `stats.ts`, `achievements.ts`                         | new     | B       | Logica meta pura in coverage                                                                   |
| `src/store/useProgressStore.ts`, `useAchievementsStore.ts`                        | new     | B       | Persistenza `coredump.*`                                                                       |
| `src/components/menu/LevelSelect.tsx`, `Profile.tsx`, `Achievements.tsx`          | new     | B       | Viste meta                                                                                     |
| `src/config/levels.ts`                                                            | mod     | B, C    | Soglie stelle derivate; `pathKindFor`; chance hazard                                           |
| `src/config/paths.ts`                                                             | mod     | C       | `buildSerpentine`, `buildLoop`                                                                 |
| `src/engine/systems/MatchSystem.ts`, `core/chainOps.ts`, `entities/DataPacket.ts` | mod     | C       | Hazard non-matchabile                                                                          |
| `src/engine/core/runController.ts`                                                | mod     | B, D    | `startIndex` da level-select; mode `tutorial`                                                  |
| `src/components/game/TutorialOverlay.tsx`                                         | new     | D       | Onboarding                                                                                     |
| `src/engine/systems/VisualFx.ts`, `RenderSystem.ts`                               | mod     | C, D    | Render hazard, tracer                                                                          |

---

## Rischi e mitigazioni

**R1 — CHIUSO in fase di consolidamento.** Il draft segnalava che il fix di F4 sarebbe diventato
codice morto se l'ADR avesse scelto il documento per utente. Ora che ADR-007 è deciso, il Blocco 1
adotta direttamente lo schema definitivo: nessun indice composito viene scritto e nessun codice
nasce per essere buttato. Resta come nota storica per spiegare perché il Blocco 1 è cresciuto da
1 h a mezza giornata.

**R1b — Le rules non sono mai state eseguite (certezza, impatto medio).** Le rules attuali sono
state solo lette, mai testate contro l'emulatore (BASIS: unknown, `security-reviewer` lo dichiara
esplicitamente). Il Blocco 1 introduce `@firebase/rules-unit-testing` e un baseline sulle rules
di oggi **prima** di riscriverle, altrimenti la riscrittura non ha un rosso da far diventare
verde. Richiede la Firebase CLI e la JVM per l'emulatore: se non sono disponibili sulla macchina,
il sub-task 1.2 si blocca e va dichiarato, non aggirato scrivendo le rules a occhio.

**R2 — Interazione F2 ↔ C8 (media probabilità, impatto medio).** Poiché il content box del
Blocco 2 è dimensionato sulla sola spirale, i path nuovi del Blocco C (serpentina, loop)
potrebbero uscirne, e in portrait verrebbero tagliati fuori schermo senza che nessun test lo
segnali. Mitigazione: il test del sub-task 2.2 va esteso a ogni nuovo `pathKind` nello stesso
commit che lo introduce (sub-task C8). Responsabile: chi implementa C8.

**R3 — I test engine leggono lo stato privato (certezza, impatto medio).** Poiché
`tests/engine/gameEngine.test.ts:17-40` dichiara 22 membri privati di `GameEngine`, ogni
refactor che li rinomina rompe la suite, il che ha già fatto saltare A2 e A3 una volta.
Mitigazione: decisione D1 opzione A (preservare i nomi); verifica meccanica
`git diff --stat tests/` = solo aggiunte.

**R4 — Il budget di righe di `GameEngine` si riesaurisce (media probabilità, impatto basso).**
Dopo il Blocco 0 restano ~90 righe di margine, e C7 più D1/D2 le consumano entrambe.
Mitigazione: `wc -l src/engine/GameEngine.ts` è un verify esplicito in C7 e D2, non un controllo
finale. Se sfora, l'estrazione successiva è già identificata (`tryInsert` verso un modulo di
risoluzione del tiro).

**R5 — E2E su canvas in tempo reale è fragile (alta probabilità, impatto medio).** Poiché il
gioco simula a 120 Hz e la catena avanza da sola, uno spec che assume un timing fallisce in CI
sotto carico, ritardando ogni PR di ore di indagine. Mitigazione: asserire solo su DOM (HUD,
transizioni di schermata), mai su pixel del canvas; nessun sleep, solo attese su condizione;
un solo smoke in CI, gli altri spec eseguiti su richiesta.

**R6 — Estendere `coverage.include` abbassa la percentuale (certezza, impatto basso).** Poiché
store e hooks entrano in coverage nel Blocco 3, la percentuale scende sotto il 99,31% attuale, e
una soglia CI fissata a quel valore bloccherebbe ogni PR. Mitigazione: fissare la soglia
(sub-task 5.2) **dopo** aver misurato la nuova baseline (sub-task 3.7), non prima.

**R7 — `localStorage` che lancia (bassa probabilità, impatto alto).** Poiché il Blocco B
aggiunge 3 chiavi lette al boot e i reader attuali (`useSettingsStore.ts:7-13`) non hanno
protezione, un browser in modalità restrittiva può impedire l'avvio dell'app. Mitigazione:
reader difensivo nel sub-task B4 e test dedicato nel sub-task 3.3.

**R8 — Il deploy è più vicino di quanto assunto (impatto alto sull'ordine).** Poiché
l'assunzione 1 non è confermata, se il deploy avviene prima del Blocco 6 il gioco pubblica
nickname e uid senza informativa e senza possibilità di cancellazione. Mitigazione: è la
Decisione 1 da confermare; se la risposta è "presto", i Blocchi 6 e 7 salgono subito dopo il
Blocco 1. Responsabile: utente.

---

## Criteri di successo del piano

- `wc -l src/engine/GameEngine.ts` non oltre 333 righe (deroga misurata, vedi DoD Blocco 0) e
  nessun altro file di `src/` oltre 300 righe.
- `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` tutti verdi.
- `npx playwright test` verde con smoke e tutorial, screenshot a 375x700 e 1280x800 allegati.
- Il gioco è giocabile in portrait su 375 px di larghezza, osservato a runtime.
- La suite copre store, hooks e i componenti chiave, con soglia CI applicata.
- Le 10 feature del piano 002 sono tutte spuntate salvo il boss (Incremento E), che resta
  esplicitamente rimandato.
- Nessuno dei 9 finding resta aperto senza una riga che dice o "risolto in X" o "accettato
  nell'ADR Y con questa ragione".

---

## Ordine consigliato e raccomandazione traccia 1 vs traccia 2

```
0 → 1 → 2 → 3 → 4 → 5 → B → C → D → 6 → 7 → [E se confermato]
```

**Non "tutta la traccia 2 prima" né "tutta la traccia 1 prima": ibrido.** L'argomento non è
"sicurezza prima delle feature", che qui non si applica (non c'è produzione da mettere in
sicurezza: nessun remote, nessun `.firebaserc`, CI mai eseguita). L'argomento è il **costo di
ritrofit**:

- **0, 2 e 3 vanno prima di B/C/D perché sono infrastruttura che B/C/D consumano.** Il Blocco 0
  dà il budget di righe che C e D spendono. Il Blocco 2 fissa il content box a cui i path di C
  devono conformarsi. Il Blocco 3 dà i test con cui validare le 5 superfici UI nuove di B e D.
  Farli dopo significa rifare mobile e test su 5 schermate invece che su 2.
- **1, 4 e 5 stanno lì perché costano poco e non verranno riaperti.** Il Blocco 1 è cresciuto in
  consolidamento (mezza giornata invece di un'ora) perché assorbe lo schema deciso da ADR-007:
  in cambio il Blocco 7 si riduce a una coda di rifiniture e il rischio R1 sparisce. 4 e 5
  dipendono solo dal 3.
- **6 e 7 vanno in coda perché sono gate di pubblicazione, non difese di un sistema in uso.**
  Non hanno nessuna interazione con B/C/D, quindi spostarli non costa nulla, e guadagnano
  informazione: F1 dovrà difendere anche i progressi e gli achievement che B rende persistenti,
  e decidere l'anti-cheat prima di sapere cosa c'è da difendere significa deciderlo due volte.
- **E resta fuori dalla sequenza** finché non c'è un design doc.

**Il ribaltamento**: se la risposta alla Decisione 1 è "si deploya prima di finire le feature",
l'ordine diventa `0 → 1 → 2 → 3 → 6 → 7 → 4 → 5 → B → C → D`, e i Blocchi 6 e 7 diventano
bloccanti per il deploy, non semplicemente anticipati.

### Stima complessiva

| Tranche                             | Blocchi          | Stima         |
| ----------------------------------- | ---------------- | ------------- |
| Messa in sicurezza e infrastruttura | 0, 1, 2, 3, 4, 5 | 4-5 g         |
| Feature (piano 002 residuo)         | B, C, D          | 9-12,5 g      |
| Gate di pubblicazione               | 6, 7             | 0,8-1,7 g     |
| **Subtotale**                       |                  | **13,8-19 g** |
| Buffer imprevisti tecnici (+15%)    |                  | +2-3 g        |
| Interazione fra blocchi (+10%)      |                  | +1,5-2 g      |
| **Totale senza boss**               |                  | **17-24 g**   |
| Incremento E (boss), se confermato  |                  | +5-8 g        |

Il buffer è visibile e non negoziabile: copre l'informazione che oggi nessuno ha, non
l'incertezza di chi stima. La voce più incerta resta il Blocco 3 (primo E2E su un gioco canvas,
nessun precedente nel repo); il Blocco 7 non lo è più, ora che l'ADR esiste.

## Decisioni confermate dall'utente

| #    | Decisione                    | Esito                                                                                          |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| DEC1 | Quando si pubblica           | **Dopo B/C/D.** Tiene l'ordine `0→1→2→3→4→5→B→C→D→6→7`; i Blocchi 6 e 7 restano in coda        |
| DEC2 | Licenza                      | **Apache 2.0**: permissiva, con concessione di brevetto e obbligo di dichiarare le modifiche   |
| DEC3 | Crash reporting esterno      | **No.** Solo `ErrorBoundary` locale: nessun SDK di terzi, nessun dato fuori dal browser        |
| DEC4 | Incremento E (boss)          | **Fuori dalla sequenza.** Si riapre dopo B/C/D partendo da un design doc, non da codice        |
| DEC5 | Soglia di copertura in CI    | Fissata dopo il Blocco 3 sulla baseline misurata, non a priori (default tecnico, non chiesta)  |
| DEC6 | `RunState` (task A3 del 002) | Cancellato: era un mezzo per stare sotto 300 righe, non un fine (default tecnico, non chiesta) |

Conseguenze su questo piano: il sub-task 6.1 usa Apache 2.0 (`LICENSE` completo a root); il
Blocco 4 non introduce monitoring e la voce è chiusa, non rimandata; il sub-task 7.3 (App Check)
resta l'unico `[DEC]` aperto e si decide a ridosso del deploy, quando si saprà se c'è traffico
anomalo da fermare.

---

## Handoff

- Blocchi 0, 1, B, C, D e i moduli puri: `tdd-guide` (regressione-first e moduli
  `engine/core/` al 100% di copertura sono esattamente il suo perimetro).
- Blocchi 2, 4 e le viste di B: `fullstack-developer`, con `a11y-gate` sui deliverable UI e il
  render osservato a 375 e 1280 px.
- Blocco 3 (E2E): `browser-tester` per le spec Playwright, `tdd-guide` per i test RTL.
- Blocco 5: `devops-engineer`.
- Blocchi 6 e 7: `architect` per ADR-007 (già in corso in parallelo), poi `senior-backend` per
  le rules e il service.
