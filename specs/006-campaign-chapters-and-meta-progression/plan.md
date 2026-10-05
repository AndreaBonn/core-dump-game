# Piano RPI — Core Dump: campagna a capitoli (O2) e progressione meta del profilo (O4)

Slug: `006-campaign-chapters-and-meta-progression` (branch base: `main`).
Formato e convenzioni come `specs/003-hardening-and-features/plan.md`. La scomposizione
operativa, una riga per task, è in `tasks.md`.

---

## Obiettivo

La campagna passa da 10 livelli lineari a 30 livelli in 5 capitoli, ciascuno con una meccanica
propria e un boss finale, con una curva a dente di sega (picco sul boss, respiro all'inizio del
capitolo dopo). Il profilo acquista XP, gradi e cosmetici sbloccabili (cursore, catena, palette)
selezionabili dalla schermata Profilo. Endless e daily restano bit-identici a oggi, i salvataggi
esistenti continuano a caricarsi, e due bug di registrazione delle stelle vengono chiusi prima.

---

## Stato di partenza (Research)

| Fatto                                                                                                                                                                                                                                                                                                                                                                                                                | BASIS                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `GameScreen.tsx:51` chiama `recordLevelResult(level, score)` in ogni modo; lo store distingue la campagna solo con `level > TOTAL_LEVELS` (`useProgressStore.ts:158-167`): un livello 1-10 superato in endless/daily assegna stelle e sblocca livelli della campagna (R1)                                                                                                                                            | measured, letto il codice                                             |
| **Bug nuovo (R1b)**: l'ultimo livello della campagna non riceve mai stelle. `completeLevel` (`GameEngine.ts:318-333`) su vittoria emette solo `onRunEnd`, non `onLevelComplete`; `recordRunEnd` chiama `recordRun`, che ignora `levelScore`. Conseguenze: livello 10 sempre a 0 stelle, `levelsCleared` sottocontato di 1 per run vinta, `isCampaignPerfect` irraggiungibile, achievement `all-stars` non ottenibile | measured sul codice, inferred sull'effetto (non riprodotto a runtime) |
| `GameEngine.ts` 405 righe (oltre 300); `tests/engine/gameEngine.test.ts:17-44` pilota 22 membri privati (`sleepTimer`, `baseSpeed`, `updateSleep`, `fixedUpdate`...): rinominarli rompe la suite                                                                                                                                                                                                                     | measured                                                              |
| `RenderSystem.ts` 284 righe, `VisualFx.ts` 285: margine minimo, nuova grafica va in file nuovi                                                                                                                                                                                                                                                                                                                       | measured                                                              |
| `en.ts` 228 righe, `it.ts` 249: ~45 chiavi nuove (capitoli, boss, gradi, cosmetici) le portano oltre 300                                                                                                                                                                                                                                                                                                             | measured (`wc -l`); stima chiavi inferred                             |
| `colorForType` ha 9 consumer (`ShotSystem`, `HUD`, `GameEngine` x2, `RenderSystem` x5)                                                                                                                                                                                                                                                                                                                               | measured, grep                                                        |
| Nessuna `.size-baseline.json`: il ratchet dimensionale non è attivo, il limite 300 è solo di regola                                                                                                                                                                                                                                                                                                                  | measured                                                              |
| Coverage: include `engine/config/services/store/hooks`, 5 renderer esclusi, soglie 95/95/92/92 (`vite.config.ts:75-100`)                                                                                                                                                                                                                                                                                             | measured                                                              |
| `e2e/smoke.spec.ts:24,113` asseriscono `hud-level` = `1/10`                                                                                                                                                                                                                                                                                                                                                          | measured                                                              |
| Repo su GitHub (`origin`) con dependabot attivo; nessun workflow di deploy. Se il gioco sia pubblicato e abbia giocatori con salvataggi reali è `unknown`                                                                                                                                                                                                                                                            | measured / unknown                                                    |
| `TOTAL_LEVELS` è importato da 8 file sorgente e 8 test                                                                                                                                                                                                                                                                                                                                                               | measured                                                              |

---

## Definition of Done

Ogni voce ha il suo Given/When/Then; i comandi sono in § Criteri di verifica.

**Bug (Fase 0)**

- [ ] Given un profilo vuoto, When in modo `endless` viene superato il livello 3, Then `progress.stars` resta `{}`, `unlockedThrough` resta 1 e `stats.levelsCleared` sale a 1.
- [ ] Given una run campagna che vince l'ultimo livello con `levelScore` pari alla soglia delle 3 stelle, When la run termina, Then `starsOf(progress, TOTAL_LEVELS) === 3` e `levelsCleared` conta anche quel livello.
- [ ] Given un profilo con tutti i livelli a 3 stelle tramite il percorso reale (non solo `recordLevel` diretto), Then `all-stars` viene assegnato.

**Determinismo (trasversale)**

- [ ] `buildLevelConfig(n, seed)` per n = 1..50 e 3 seed (campagna, daily di una data fissa, 12345) e la catena generata da `buildLevelState` coincidono con il fixture catturato in Fase 0, a ogni fase.

**Campagna (Fasi 1-3)**

- [ ] `TOTAL_LEVELS === 30`, derivato dalla tabella dei capitoli, non scritto a mano.
- [ ] Capitolo 5 (livelli 25-30): meccanica "ondate". Quando la catena si svuota ne entra un'altra sullo stesso percorso, da un sub-RNG `createRng(hash(seed,'waves'))`; il livello è superato solo dopo l'ultima ondata. Le meccaniche dei capitoli 2-4 ricompaiono mescolate a densità ridotta. L'HUD mostra `ondata k/n`.
- [ ] 4 capitoli da 6 livelli; il sesto di ogni capitolo ha `isBoss: true`.
- [ ] Curva, verificata da test su `difficultyIndex`: dentro un capitolo i livelli 1-5 sono non decrescenti; il boss è il massimo del capitolo e supera il livello 5 di almeno il 15%; il primo livello del capitolo N+1 è sotto il boss del capitolo N.
- [ ] Capitolo 1 base, 2 hazard, 3 pacchetti corazzati, 4 inversione di direzione; ogni meccanica compare per la prima volta nel suo capitolo e resta, a densità ridotta, in quelli successivi.
- [ ] Corazzato: Given una run di 3 pacchetti dello stesso tipo di cui uno con `armor: 1`, When un colpo la completa, Then nessun pacchetto viene rimosso, tutti escono con `armor: 0` e il punteggio sale di `CRACK_SCORE`; When un secondo colpo dello stesso tipo la porta a 4, Then i 4 esplodono.
- [ ] Inversione: Given un livello con `reversal {period: 8, duration: 1.5, factor: -0.5}`, When `levelTime` è in [8, 9.5), Then `chain.frontDistance` diminuisce fra due step; fuori dalla finestra aumenta. Il segnale visivo compare almeno 0,75 s prima dell'inversione.
- [ ] Ogni waypoint di ogni livello della campagna sta in `CONTENT_BOX` (estensione di `contentBox.test.ts`).
- [ ] Level select: i livelli sono raggruppati per capitolo con intestazione, il boss è marcato con testo (non solo icona o colore), nessun overflow a 320 e 375 px.
- [ ] HUD: `hud-level` mostra `n/30`; sul boss compare un badge testuale.
- [ ] Achievement: `halfway` e `all-stars` derivano da `TOTAL_LEVELS`; aggiunti `boss-down` (un boss superato) e `all-bosses` (4 boss superati); gli achievement già guadagnati non vengono revocati.

**Progressione meta (Fasi 4-5)**

- [ ] XP derivato dallo stato salvato, nessun campo XP persistito. Given `levelsCleared 12, totalStars 20, earned 5 achievement, 1 boss a ≥1 stella`, Then `xpFor(...)` = valore della formula in § Decisioni (test con il numero esatto).
- [ ] 8 gradi con soglie crescenti; `rankFor(0)` è il primo grado; `rankFor(soglia_k)` è il grado k, `rankFor(soglia_k - 1)` il k-1.
- [ ] Dopo `clearProfile()` XP e grado tornano al primo; dopo `hydrateFromFile` l'XP è ≥ quello di entrambi i profili di partenza.
- [ ] Profilo: grado, XP e barra verso il grado successivo (`role="progressbar"` con `aria-valuenow/min/max`).
- [ ] Cosmetici: 3 slot (cursore, catena, palette), almeno 3 voci per slot inclusa la default, sbloccate da predicati puri su grado, stelle o boss. Una voce bloccata è visibile, disabilitata, con la condizione di sblocco in testo.
- [ ] Selezione persistita: ricaricando la pagina la scelta resta; un id sconosciuto o una voce non più sbloccata (dopo reset) ricade sulla default senza errori.
- [ ] Palette: ogni palette ha 7 colori distinti e ciascuno ha contrasto ≥ 3:1 sullo sfondo del board; una palette è adatta al daltonismo (Okabe-Ito). Cambiare palette cambia il colore di catena, cursore, prossimo pacchetto in HUD e fx, e non cambia il layout né la sequenza RNG.

**Trasversali**

- [ ] `npm run typecheck`, `npm run lint`, `npm run test:coverage` (soglie invariate), `npm run test:e2e` verdi a ogni fase.
- [ ] Parità chiavi i18n en/it (`tests/i18n/locales.test.ts`) verde a ogni fase.
- [ ] Nessun file sorgente toccato oltre 300 righe che non lo fosse già; `GameEngine.ts` non cresce (≤ 405 righe a fine piano).
- [ ] `git diff --stat tests/engine/gameEngine.test.ts` alla fine di ogni fase mostra solo aggiunte.

---

## Assunzioni

- Node/npm e toolchain invariati (React 18, TS strict, vitest jsdom, playwright).
- **I livelli sono generati, non disegnati a mano**: un "livello in più" costa una riga di tuning nella tabella, non contenuto. Il costo vero di 24 contro 30 è il bilanciamento e il playtest, non la scrittura.
- Endless e daily **non** ricevono le nuove meccaniche in questo piano: continuano a usare `buildLevelConfig` invariato, così il daily resta riproducibile per data e le classifiche esistenti restano confrontabili. Estenderli è una fase opzionale fuori scope (§ Fuori scope).
- Le catene doppie sono **escluse** (R2): richiedono più `Chain`/`Path`/`VoidHole` nel motore, che oggi ne assume una; il refactor costa più dell'intera Fase 2+3 e toccherebbe i 22 privati pilotati dai test.
- XP, gradi e cosmetici restano locali: nessuna modifica a `firestore.rules`, nessun nuovo campo in classifica. `levelReached <= 100` resta compatibile con 24 livelli.
- La selezione dei cosmetici è una preferenza, quindi vive nello store delle impostazioni (come lingua e audio), non nel profilo: niente regola di merge, niente save file. La disponibilità invece si deriva dal profilo, quindi un reset del profilo fa ricadere la scelta sulla default. Scelta implementativa, rivedibile.
- La palette è applicata con uno stato di modulo in `config/packetTypes.ts` (`setActivePalette`), non passando la palette ai 9 consumer di `colorForType`. È uno stato globale mutabile ma solo di presentazione: il sim non lo legge. Alternativa scartata: iniettare la palette in `ShotSystem`, `HUD`, `GameEngine` e `RenderSystem`, 9 firme cambiate per un dato cosmetico.
- **[BLOCCANTE, Q2]** Salvataggi esistenti: le stelle sono indicizzate per numero di livello e i livelli 1-10 cambiano layout. Default assunto: il gioco non ha ancora giocatori con salvataggi da proteggere, quindi le stelle restano dove sono (un giocatore che aveva il livello 7 a 3 stelle lo ritrova a 3 stelle anche se ora è un altro livello) e `unlockedThrough` resta valido.
- **[DECISO dall'utente, Q4]** Una run campagna continua dal livello scelto fino all'ultimo livello della campagna (30), come oggi (finalLevel = `TOTAL_LEVELS`).

### Anchor incidentali (rivedibili, non vincoli)

- La formula lineare di `tuningForLevel` per la campagna: viene sostituita da una tabella esplicita, resta solo per endless/daily.
- Hazard da L4: nella nuova campagna arrivano al capitolo 2 (L7). Cambia il percorso di un giocatore nuovo, non è un vincolo.
- `run = intera campagna`: è come funziona oggi, non un requisito (Q4).

Vincoli veri: determinismo del daily per data, limiti dimensionali, parità i18n, regole Firestore invariate, test di `gameEngine` che pilotano i privati.

---

## Disambiguazione

### D1 — XP: derivato o accumulato

- Opzione A: XP **derivato** a ogni lettura da `stats`, `progress`, `earned` (come gli achievement) → nessun campo nuovo nel salvataggio, merge e reset coerenti gratis, retroattivo per i profili esistenti; l'XP cresce solo con ciò che le statistiche già contano.
- Opzione B: XP **accumulato** come contatore persistito, incrementato per evento (es. punteggio/100) → ricompensa ogni partita, ma serve parsing, merge (max, che perde l'XP fatto su un secondo dispositivo) e reset; l'XP da punteggio è facile da gonfiare in endless.
- **Raccomandata: A.** La stessa scelta che rende gli achievement ripetibili; zero rischio R3 sul nuovo campo.

### D2 — Numero di livelli

- Opzione A: **24** (4 capitoli x 6) → un capitolo per meccanica (base, hazard, corazzati, inversione).
- Opzione B: **30** (5 x 6) → serve un quinto capitolo: o "mix" di tutte le meccaniche senza novità, o le catene doppie (refactor multi-chain, escluso).
- **Raccomandata: A.** Con le catene doppie escluse, 30 livelli vuol dire un capitolo senza meccanica nuova, contro la richiesta "una meccanica per capitolo". B resta aggiungibile dopo come una sola riga di tabella più un capitolo di tuning.

### D3 — Semantica del pacchetto corazzato

Scelta implementativa (non chiesta): una run che contiene almeno un pacchetto corazzato **si incrina tutta** (armor -1 a ogni pacchetto della run, nessuna rimozione) invece di esplodere solo i pacchetti non corazzati. Motivo: non spezza la catena in punti nuovi, `resolveMatches` cambia in un solo ramo, e la regola si legge sullo schermo ("serve un secondo match"). Una cascata che arriva su una run corazzata la incrina e si ferma. I power-up distruttivi (kill -9, regex, garbage collect) rimuovono i corazzati come gli altri.

### D4 — Inversione: a tempo o a punti del percorso

Scelta implementativa: **a tempo**, con una schedule deterministica nel config (`period`, `duration`, `factor`), senza RNG. Legarla a tratti del percorso richiederebbe di marcare segmenti in `paths.ts` per 3 forme di traccia e coinvolgerebbe il motore di path. La schedule temporale sta tutta in un modulo puro.

---

## Decisioni di design

**Tabella dei capitoli** in `src/config/campaign.ts` (nuovo): `CHAPTERS: ChapterSpec[]`, ognuno con `id`, `mechanic`, `levels: LevelSpec[6]`. `LevelSpec` ha numeri espliciti (`chainLength`, `colorCount`, `chainSpeed`, `turns`, `hazardChance`, `armorChance`, `reversal`), così la curva è leggibile e modificabile senza formule. `LEVELS` e `TOTAL_LEVELS` in `levels.ts` diventano derivati dalla tabella; `getLevel` mantiene la firma.

**Curva** (indicativa, da tarare in playtest): dentro il capitolo i livelli 1-5 salgono, il boss vale il livello 5 + 20-30% (catena più lunga, densità della meccanica al massimo del capitolo), il livello 1 del capitolo successivo riparte dal livello 3 del precedente con la meccanica nuova a bassa densità. `difficultyIndex(config)` in `src/config/difficulty.ts`: funzione pura monotona in `chainLength`, `chainSpeed`, `colorCount`, `hazardChance`, `armorChance`, presenza di `reversal`. Serve solo a testare l'ordinamento, non è mostrata al giocatore.

**Boss**: in questo piano un boss è tuning al picco + meccanica al massimo + `isBoss` (badge HUD, tile marcata, achievement). Un "pacchetto boss" con meccanica propria è fuori scope.

**Determinismo**: `generateChainPackets` aggiunge l'estrazione dell'armatura **in coda** (hazard, power-up, tipo, armatura) e **solo quando `armorChance > 0`**. Con `armorChance = 0` lo stream RNG è identico a oggi: il fixture di Fase 0 lo prova per endless, daily e i capitoli 1-2. L'inversione non usa RNG.

**Motore**: le meccaniche vivono in moduli separati: armatura in `MatchSystem` + `chainOps`; inversione in `src/engine/core/chainMotion.ts` (puro). In `GameEngine` entrano solo un campo `levelTime` e la moltiplicazione del passo per `directionFactor`, compensati da un'estrazione (T030) di membri **non** presenti nell'interfaccia privata dei test. I nomi `sleepTimer`, `baseSpeed`, `updateSleep`, `fixedUpdate` restano invariati.

**Render**: armatura e segnale di inversione in un file nuovo `src/engine/systems/MechanicRenderer.ts` (aggiunto agli exclude di coverage come gli altri renderer); la geometria calcolabile (raggio degli anelli, fase del telegraph) in funzioni pure testate. Skin di cursore e catena in `src/engine/systems/SkinRenderer.ts`, stessa regola.

**XP (D1 = A)**: in `src/engine/core/xp.ts`

```
xp = 100 * levelsCleared + 50 * totalStars + 300 * bossesCleared + 75 * earned.length
```

`bossesCleared` = boss con almeno una stella. Pesi indicativi, da validare con la distribuzione dei gradi (T041). Gradi in `src/engine/core/ranks.ts`: 8 soglie, nomi a tema sysadmin nei dizionari.

**Cosmetici**: catalogo in `src/config/cosmetics.ts`; sblocco in `src/engine/core/cosmeticUnlocks.ts` (`unlockedCosmetics(state)`, `resolveCosmetic(selected, unlocked)`), stessa forma degli achievement. Selezione nello store impostazioni con chiave `coredump.cosmetics`, parsing difensivo. Il motore riceve la skin con `setCosmetics()` sul modello di `setReducedMotion` (cablato in `GameCanvas`).

**i18n**: prima di aggiungere chiavi, i dizionari vengono divisi per sezione (`src/i18n/locales/{en,it}/` con un file per area: menu, game, meta) mantenendo lo stesso oggetto esportato (T010). Ogni fase chiude con il test di parità.

**Achievement (R6)**: `halfway` (ora livello 12) e `all-stars` (ora 72 stelle) restano derivati; gli id già guadagnati restano in `earned` (nessuna revoca: `newlyEarned` aggiunge e basta). Nuovi: `boss-down`, `all-bosses`.

---

## Fasi (ognuna mergiabile da sola)

| Fase | Contenuto                                                                      | Stato del gioco dopo il merge                      | Stima   |
| ---- | ------------------------------------------------------------------------------ | -------------------------------------------------- | ------- |
| 0    | Fix R1 e R1b, fixture di determinismo                                          | 10 livelli come oggi, stelle corrette in ogni modo | 3-4 h   |
| 1    | Capitoli 1-2 (12 livelli, base + hazard), boss, curva, UI capitoli, split i18n | Campagna da 12 livelli a 2 capitoli giocabile      | 1,5-2 d |
| 2    | Pacchetti corazzati + capitolo 3                                               | 18 livelli                                         | 1-1,5 d |
| 3    | Inversione di direzione + capitolo 4                                           | 24 livelli, O2 completo                            | 1-1,5 d |
| 4    | XP e gradi nel Profilo                                                         | Gradi visibili, nessun cosmetico                   | 0,5-1 d |
| 5    | Cosmetici sbloccabili e selezionabili                                          | O4 completo                                        | 1,5-2 d |

Fasi 4-5 dipendono solo dalla Fase 0 e possono procedere in parallelo alle 1-3, ma `bossesCleared` nell'XP ha senso solo da Fase 1 in poi: se la Fase 4 arriva prima, il termine vale 0 e il test lo copre.

Totale: 6-8,5 giorni + buffer 20% (imprevisti, playtest e ritaratura curva) = **7-10 giorni**. La voce più incerta è la taratura della curva: non ha un test che la chiuda, solo il playtest.

---

## Sub-task

Elenco completo con dipendenze e verify in `tasks.md`. Qui il dettaglio dove serve.

### Fase 0 — Bug e rete di sicurezza

- **T001** Test di regressione R1 in `tests/store/useProgressStore.test.ts`: `recordLevelResult(3, three, 'endless')` e `'daily'` lasciano `progress` invariato e incrementano `levelsCleared`. Deve essere rosso sul codice attuale (oggi la firma non accetta il modo: il rosso è il typecheck più l'asserzione con la chiamata esistente per un livello ≤ 10). — rischio basso
- **T002** Fix R1: `recordLevelResult(level, levelScore, mode: RunMode)`; stelle e sblocco solo se `mode === 'campaign'`. `GameScreen.tsx:51` passa `useGameStore.getState().mode`. Aggiornare `metaScreens.test.tsx:30,41` e `useProgressStore.test.ts:52,61,219` alla nuova firma. TWINS: cercare altri consumer mode-blind di eventi engine nel profilo (`noteCombo`, `notePowerUp` contano in ogni modo per scelta: dichiararlo, non cambiarlo). — rischio basso
- **T003** Test di regressione R1b: `recordRunEnd({mode: 'campaign', won: true, levelReached: TOTAL_LEVELS, levelScore: three, ...})` → `starsOf(TOTAL_LEVELS) === 3`, `levelsCleared` +1; con `mode: 'tutorial', won: true` nessun effetto; con `won: false` nessuna stella. — rischio basso
- **T004** Fix R1b in `recordRunEnd`: su vittoria in campagna registra anche il livello finale nello stesso `commit` (una sola scrittura). Nessun cambio a `GameEngine`. — rischio medio (ordine dei due reducer: prima livello poi run, così `newlyEarned` vede entrambi)
- **T005** Fixture di determinismo `tests/config/levelGolden.test.ts` + `tests/config/__fixtures__/levels-golden.json`: per n = 1..50 e 3 seed, config (escluse le chiavi nuove che arriveranno) e catena serializzata (`type`, `matchable`, `powerUpType`, `distance`). Catturato dal codice attuale prima di qualsiasi modifica. — rischio basso

### Fase 1 — Capitoli 1-2

- **T010** Split dei dizionari i18n per sezione senza cambiare chiavi. — rischio basso
- **T011** `LevelConfig` estesa con `chapter: number | null`, `isBoss`, `armorChance`, `reversal: ReversalSchedule | null`; `buildLevelConfig` le imposta a `null/false/0/null`. — rischio basso
- **T012** `src/config/difficulty.ts` con `difficultyIndex` + test di monotonia per parametro. — rischio basso
- **T013** `src/config/campaign.ts` con capitoli 1-2 e test della curva (DoD § Curva). — rischio medio (taratura)
- **T014** `levels.ts`: `buildCampaignLevel(spec, level)` riusa `buildTrack` e `starThresholdsFor`; `LEVELS`/`TOTAL_LEVELS` derivati. `contentBox.test.ts` esteso a `LEVELS`. `levels.test.ts` aggiornato. — rischio medio (tocca 16 file via `TOTAL_LEVELS`, la suite dice dove)
- **T015** Achievement: `HALFWAY_LEVEL` resta derivato; `boss-down`, `all-bosses` con predicati su `progress.stars` dei livelli `isBoss`; chiavi en/it. — rischio basso
- **T016** `LevelSelect.tsx` raggruppato per capitolo (titolo, stelle del capitolo, tile boss con testo "BOSS"). Se il file supera 120 righe, estrarre `ChapterGroup.tsx`. — rischio medio (layout 320 px, commit `0b97dc5` ha appena chiuso un overflow)
- **T017** HUD badge boss + testo di fine capitolo in `LevelCompleteScreen` (meccanica in arrivo). — rischio basso
- **T018** e2e: `smoke.spec.ts:24,113` derivano il totale invece di `1/10`; nuovo caso level select con 2 capitoli. — rischio basso
- **T019** Gate di fase: comandi § Criteri, `a11y-gate` su level select, render 375 e 1280, click-through della griglia. — rischio basso

### Fase 2 — Pacchetti corazzati

- **T020** `DataPacket.armor: number`, default 0 in `createPacket`. — basso
- **T021** `generateChainPackets` con `armorChance` (estrazione in coda, solo se > 0, solo su pacchetti matchable senza power-up). Fixture T005 deve restare verde. — medio (determinismo)
- **T022** `MatchSystem.resolveMatches`: ramo "crack"; `MatchResolution` estesa con `cracked: number`; `scoreForMatch` invariato, `CRACK_SCORE` costante. Test DoD § Corazzato + cascata che si ferma su run corazzata + run corazzata di 5. — alto (cuore del gameplay, combo)
- **T023** `ShotSystem`/`ShotOutcome` propagano `cracked`; fx e audio di incrinatura (riuso di un suono esistente, nessun asset nuovo); test che `PowerUpSystem` rimuove i corazzati. — medio
- **T024** `MechanicRenderer.ts`: anello per livello di armatura; geometria pura testata, file escluso da coverage. — basso
- **T025** Capitolo 3 in tabella + chiavi i18n del capitolo; test curva verde con 3 capitoli. — medio
- **T026** Gate di fase + playtest dei livelli 13-18 (esito annotato in `tasks.md`). — medio

### Fase 3 — Inversione

- **T030** Riduzione di `GameEngine.ts` prima di aggiungere righe: estrarre in un modulo puro un blocco **non** nell'interfaccia privata dei test (candidati: costruzione di `runResult`, logica hit-stop di `freezeForCombo`). Target ≤ 395 righe. Verificare con `git diff --stat tests/engine/gameEngine.test.ts` = 0 righe rimosse. — medio
- **T031** `src/engine/core/chainMotion.ts`: `directionFactor(elapsed, schedule)` puro, test ai bordi (0, inizio finestra, fine finestra, periodi successivi, schedule null → 1). — basso
- **T032** Cablaggio in `GameEngine`: `levelTime` azzerato in `buildLevel`, `chain.advance(dt * factor)` in `fixedUpdate`. SLEEP compone (rallenta anche all'indietro). Test: finestra di inversione, assenza di effetto con `reversal: null` (i test esistenti restano invariati). — alto (fisica condivisa con shield/rollback e void)
- **T033** Telegraph: `telegraphPhase(elapsed, schedule)` puro, disegno in `MechanicRenderer`; con reduced motion il segnale è statico, non assente. — medio
- **T034** Capitolo 4 in tabella + chiavi i18n; test curva con 4 capitoli e `TOTAL_LEVELS === 24`. — medio
- **T035** Gate di fase + playtest 19-24, verifica che nessuna inversione porti la testa della catena sotto distanza 0. — medio

### Fase 4 — XP e gradi

- **T040** `xp.ts` + test con valori esatti, incluso profilo vuoto = 0 e `bossesCleared` = 0 senza tabella capitoli. — basso
- **T041** `ranks.ts` + test ai bordi; tabella di distribuzione (quale grado raggiunge un giocatore che finisce la campagna a 2 stelle) scritta nel commento del test come motivazione delle soglie. — medio (bilanciamento)
- **T042** Selettore `useMetaProgress()` (hook in `src/hooks/`) che deriva XP e grado dallo store; test reset e merge. — basso
- **T043** Profilo: grado, XP, barra `progressbar`; chiavi en/it degli 8 gradi. — basso
- **T044** (Should) Notifica di salita di grado riusando il canale `pending` (tipo discriminato `achievement | rank`). — medio (tocca il toast esistente)
- **T045** Gate di fase: `a11y-gate` su Profilo, render, click-through. — basso

### Fase 5 — Cosmetici

- **T050** `cosmetics.ts`: catalogo 3 slot x ≥ 3 voci, palette Okabe-Ito; test di distinzione e contrasto ≥ 3:1 (funzione pura di contrasto WCAG). — medio
- **T051** `cosmeticUnlocks.ts`: `unlockedCosmetics`, `resolveCosmetic`; test per ogni tipo di requisito e fallback. — basso
- **T052** Store impostazioni: `cosmetics` persistiti, parsing difensivo, `resetSettings` li azzera. — basso
- **T053** `packetTypes.ts`: `setActivePalette`/`colorForType` sulla palette attiva; test; reset tra test in `tests/setup.ts`. — medio (stato globale fra test)
- **T054** `SkinRenderer.ts` + `GameEngine.setCosmetics` (≤ 4 righe, delega al presenter) + cablaggio in `GameCanvas`. — medio
- **T055** Profilo: picker per slot (radio group), voci bloccate disabilitate con condizione in testo; se `Profile.tsx` supera 150 righe estrarre `CosmeticPicker.tsx`. — medio
- **T056** Gate finale: tutti i comandi, e2e del picker (scelta, reload, persistenza), `a11y-gate`, render 375/1280, click-through completo. — basso

---

## File impattati

| File                                                                                                          | Tipo           | Scopo                                                |
| ------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| `src/store/useProgressStore.ts`                                                                               | modifica       | R1, R1b                                              |
| `src/components/game/GameScreen.tsx`                                                                          | modifica       | passa il modo                                        |
| `tests/config/levelGolden.test.ts`, `tests/config/__fixtures__/levels-golden.json`                            | nuovo          | determinismo endless/daily                           |
| `src/config/campaign.ts`, `src/config/difficulty.ts`                                                          | nuovo          | capitoli, curva                                      |
| `src/config/levels.ts`                                                                                        | modifica       | `LevelConfig` estesa, `LEVELS` derivato              |
| `src/engine/core/achievements.ts`, `progress.ts`                                                              | modifica       | nuovi achievement, derivazioni                       |
| `src/types/game.types.ts`, `src/engine/entities/DataPacket.ts`                                                | modifica       | `armor`                                              |
| `src/engine/core/chainOps.ts`, `levelBuilder.ts`                                                              | modifica       | estrazione armatura                                  |
| `src/engine/systems/MatchSystem.ts`, `ShotSystem.ts`                                                          | modifica       | crack                                                |
| `src/engine/core/chainMotion.ts`                                                                              | nuovo          | inversione                                           |
| `src/engine/GameEngine.ts`                                                                                    | modifica       | `levelTime`, `setCosmetics`, estrazione compensativa |
| `src/engine/systems/MechanicRenderer.ts`, `SkinRenderer.ts`                                                   | nuovo          | grafica meccaniche e skin                            |
| `vite.config.ts`                                                                                              | modifica       | exclude dei 2 renderer nuovi                         |
| `src/engine/core/xp.ts`, `ranks.ts`, `cosmeticUnlocks.ts`, `src/config/cosmetics.ts`                          | nuovo          | meta                                                 |
| `src/hooks/useMetaProgress.ts`                                                                                | nuovo          | selettore                                            |
| `src/store/useSettingsStore.ts`                                                                               | modifica       | selezione cosmetici                                  |
| `src/config/packetTypes.ts`                                                                                   | modifica       | palette attiva                                       |
| `src/components/menu/LevelSelect.tsx`, `Profile.tsx`, (+ `ChapterGroup.tsx`, `CosmeticPicker.tsx` se servono) | modifica/nuovo | UI                                                   |
| `src/components/game/HUD.tsx`, `LevelCompleteScreen.tsx`, `GameCanvas.tsx`                                    | modifica       | badge boss, fine capitolo, cablaggio skin            |
| `src/i18n/locales/**`                                                                                         | modifica/split | testi                                                |
| `e2e/smoke.spec.ts` + nuovo `e2e/progression.spec.ts`                                                         | modifica/nuovo | totale livelli, picker                               |

---

## Rischi e mitigazioni

- **R1/R1b**: poiché lo store riconosce la campagna dal numero di livello e la vittoria salta `onLevelComplete`, stelle vengono date dove non devono e negate dove devono; con 24 livelli il primo caso copre tutta la campagna. → Fase 0 prima di tutto, test rossi prima del fix (T001-T004).
- **R2 multi-chain**: le catene doppie toccherebbero collisione, void, render e i privati dei test. → escluse; il loro posto è un'eventuale fase separata con ADR propria.
- **R3 salvataggi**: le stelle per numero di livello cambiano significato. → D1 = XP derivato (nessun campo nuovo nel profilo), selezione cosmetici nelle impostazioni con fallback, Q2 per la politica sulle stelle. `parseProfile` non cambia in questo piano.
- **R4 determinismo**: un'estrazione RNG in più cambia ogni layout successivo. → estrazione dell'armatura in coda e condizionata a `armorChance > 0`; inversione senza RNG; fixture T005 verde a ogni fase; endless/daily non toccati.
- **R5 limiti dimensionali**: `GameEngine` già a 405, `RenderSystem`/`VisualFx` a 285, dizionari a 228/249. → meccaniche in moduli nuovi, T030 prima di T032, split i18n in T010, soglie di estrazione esplicite per `LevelSelect` e `Profile`.
- **R6 achievement**: `halfway` e `all-stars` cambiano soglia. → nessuna revoca (comportamento attuale di `newlyEarned`), test che un profilo con `halfway` già guadagnato lo mantiene dopo il passaggio a 24.
- **R7 (nuovo) curva non verificabile da test**: `difficultyIndex` prova l'ordine, non la giocabilità. → playtest annotato per capitolo (T026, T035), tabella esplicita facile da ritoccare.
- **R8 (nuovo) palette come stato globale**: un test che cambia palette può inquinare gli altri. → reset in `tests/setup.ts` (T053).
- **R9 (nuovo) inversione e void**: una finestra di inversione lunga riporta la testa della catena indietro oltre l'ingresso. → `factor` ≥ -0,6 e `duration` ≤ 2 s validati da test sulla tabella; test che la testa non va sotto 0 (T035).

---

## Fuori scope

- Catene doppie (Won't, R2).
- Nuove meccaniche in endless e daily (Could, fase futura: cambierebbe i layout del daily e richiede una decisione sulle classifiche).
- Pacchetto boss con regole proprie; cosmetici legati alla classifica online; sincronizzazione cloud di XP e cosmetici.

---

## Criteri di verifica

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage   # soglie 95/95/92/92 invariate
npm run test:e2e
wc -l src/engine/GameEngine.ts src/engine/systems/*.ts src/i18n/locales/**/*.ts
git diff --stat main -- tests/engine/gameEngine.test.ts   # solo aggiunte
```

Più, per ogni fase con UI: skill `a11y-gate` sulla schermata toccata, render osservato a 375 e
1280 px, click-through dei controlli con esito annotato. Per le fasi 2 e 3: playtest dei 6
livelli del capitolo, con esito (superato / stelle / note sulla difficoltà) in `tasks.md`.

---

## Decisioni dell'utente (2026-10-05)

1. **Livelli: 30**, 5 capitoli da 6. Il capitolo 5 introduce le ondate (proposta `architect`) e mescola le meccaniche 2-4. Aggiunta la Fase 6.
2. **Salvataggi esistenti: si tiene tutto.** Stelle e sblocchi per numero di livello restano; nessun campo versione.
3. **XP: derivato dallo stato** (default, non chiesto: planner e architect concordavano).
4. **Run campagna: dal livello scelto fino all'ultimo** (30). La risposta diceva "fino al 24", formulata prima che i livelli fossero 30: letta come "fino alla fine della campagna".
5. **Corazzato: match sulla sua fila.** Una run di 3 o più che contiene un corazzato si incrina invece di esplodere; il secondo match la fa esplodere (semantica del planner, DoD § Corazzato).

## Handoff

Implementazione test-first: `tdd-guide` con `[DELEGATE-CODEX]`, 2-4 task per invocazione
(es. T001-T004, poi T005, poi T010-T012...). Le parti UI (T016-T017, T043, T055) a
`fullstack-developer`. Gate `code-reviewer` a fine di ogni fase, `/analyze` a fine piano.

## Decisioni consolidate (planner + architect)

Il piano sopra è del `planner`; l'`architect` ha prodotto in parallelo un ADR su sei decisioni.
Dove divergono vale questa tabella.

| Tema | Planner | Architect | Decisione |
|---|---|---|---|
| Palette dei cosmetici | stato di modulo `setActivePalette` in `packetTypes.ts` | DTO `Theme` passato al renderer | **Theme DTO**. Niente stato globale mutabile in `config/`, nessun reset fra test. Costo: le firme dei consumer di `colorForType` lato render. T053 riscritto |
| Estrazione RNG armatura | in coda al loop, solo se `armorChance > 0` | trasformazione post-generazione con sub-RNG `createRng(hash(seed,'armor'))` | **Sub-RNG post-generazione**. Lo stream principale, che alimenta anche i pacchetti del cursore, resta identico anche sui livelli corazzati; la meccanica si testa da sola |
| Contenimento di `GameEngine.ts` | T030: estrarre un blocco non toccato dai test, target ≤ 395 righe | estrarre `LevelSession` (sim pura) con golden replay test | **T030 del planner** in questo piano: i test pilotano 22 membri privati del motore e `LevelSession` li romperebbe. `LevelSession` resta un follow-up separato, prerequisito per eventuali catene doppie |
| Catene doppie | escluse | escluse; al loro posto modifier `waves` (seconda catena sulla stessa path, sequenziale) | Escluse. `waves` entra solo se Q1 = 30 livelli, come meccanica del capitolo 5 |
| Endless e daily | identici a oggi | identici; modifier per ciclo di capitoli opzionali | Identici a oggi in questo piano |
| XP | derivato dallo stato | derivato dallo stato, pesi mai ribassati | Derivato. Vincolo aggiunto: un test fissa i pesi minimi, ribassarli fa scendere i gradi esistenti |
| Selezione cosmetico | store impostazioni, fallback alla default | idem | Concordi |
| Semantica corazzato | la run con un corazzato si incrina intera, serve un secondo match | il corazzato si incrina quando esplode una run adiacente | **Domanda all'utente (Q5)**: è una regola di gioco, non un dettaglio implementativo |

Validazione di dominio: nessuno specialista aggiuntivo. Il diff non tocca auth, endpoint, schema
Firestore o regole (XP e cosmetici restano locali); `type-design-analyzer` copre tipi Python e
il progetto è TypeScript.

Bug confermato in lettura oltre a R1 (R1b, già in Fase 0): alla vittoria `completeLevel`
(`src/engine/GameEngine.ts`) emette solo `onRunEnd`, quindi l'ultimo livello della campagna non
riceve mai stelle e `all-stars` non è ottenibile.

## Fase 6 — Ondate e capitolo 5 (30 livelli)

Dipende da Fase 3 (T030 ha già liberato righe in `GameEngine`). La logica delle ondate sta in
`src/engine/core/waves.ts` (pura: `waveCount(config)`, `buildWave(config, index)` con sub-RNG);
nel motore entra solo il ramo "catena vuota e ondate rimaste → carica la prossima" al posto di
`completeLevel`. Se il ramo porta `GameEngine.ts` oltre 405 righe, si estrae prima un altro
blocco (stesso criterio di T030).
