# Piano RPI: script di avvio locale cross-platform

## Obiettivo

Chi clona il repo e non sa cosa sia npm avvia il gioco con un doppio click (Windows, macOS) o
con un comando solo (Linux). Node resta un prerequisito dichiarato: se manca o è sotto la
soglia, lo script lo dice in chiaro con il link a nodejs.org ed esce non-zero.

## Definition of Done

Ogni voce è un comando eseguibile con esito osservabile. `<CLONE>` = clone locale usa-e-getta
nella scratchpad, senza `node_modules` e senza `dist`.

- [ ] **DoD-1 (primo avvio a freddo)** In `<CLONE>`, `./play.sh` esegue install, poi build, poi
      apre il browser su `http://localhost:4173` con il gioco giocabile. Comando:
      `cd <CLONE> && ./play.sh`; osservabile: le tre fasi stampate in ordine e la pagina che
      risponde (`curl -s -o /dev/null -w '%{http_code}' http://localhost:4173` = `200`).
- [ ] **DoD-2 (secondo avvio, idempotenza)** Il secondo `./play.sh` non esegue né install né
      build e apre il browser in meno di 5 secondi. Osservabile: assenza delle righe di install
      e build, presenza di una riga che dichiara quale build sta servendo.
- [ ] **DoD-3 (solo build)** Con `node_modules` presente e `dist` rimossa, `./play.sh` esegue la
      build e non l'install.
- [ ] **DoD-4 (rebuild forzato)** `./play.sh --rebuild` ricostruisce anche con `dist` presente.
      Osservabile: la build gira e `dist/index.html` cambia mtime.
- [ ] **DoD-5 (Node troppo vecchio)** In `<CLONE>` con `engines.node` portato a `">=99"`,
      `./play.sh` stampa un messaggio che contiene la versione trovata, quella richiesta e
      `https://nodejs.org`, non esegue install né build, ed esce con codice 1. Comando:
      `./play.sh; echo "exit=$?"` → `exit=1`.
- [ ] **DoD-6 (Node assente)** Con `PATH` privato di node
      (`env PATH=/usr/bin:/bin sh -c 'command -v node'` vuoto), `./play.sh` stampa il messaggio
      con il link ed esce 1, senza mai invocare `node`.
- [ ] **DoD-7 (test verdi e rossi prima)** `npx vitest run tests/scripts/playLogic.test.ts`
      passa; rompendo intenzionalmente una funzione pura il test corrispondente fallisce (rosso
      osservato prima del verde).
- [ ] **DoD-8 (nessuna regressione sui gate)** `npm run lint`, `npm run typecheck`,
      `npm run test:coverage`, `npm run build` tutti verdi. `typecheck` è il gate a rischio,
      vedi R1.
- [ ] **DoD-9 (formattazione dei soli file nuovi)**
      `npx prettier --check scripts/play.mjs scripts/lib/playLogic.mjs tests/scripts/playLogic.test.ts README.md`
      esce 0. Volutamente NON `prettier --check .`, vedi R2.
- [ ] **DoD-10 (fine riga e bit di esecuzione nell'index)**
      `git ls-files --eol play.sh play.command play.cmd` mostra `lf` sui primi due e `crlf` sul
      terzo; `git ls-files -s play.sh play.command` mostra `100755` su entrambi.
- [ ] **DoD-11 (README)** La sezione di avvio nomina i tre file, dice `./play.sh` da terminale
      per Linux senza promettere il doppio click, e avverte esplicitamente che aprire
      `dist/index.html` da `file://` mostra una pagina bianca.
- [ ] **DoD-12 (limite dichiarato)** README e messaggio di handoff dichiarano che il percorso
      Windows e quello macOS non sono stati eseguiti su questa macchina, invece di tacerlo.

## Assunzioni

- `dist/` è gitignorata e non arriva mai in un clone: al primo avvio la build serve sempre.
  `measured` (`.gitignore` contiene `dist/`; il clone locale non la porta).
- La soglia è **>= 20**, non 24: `.nvmrc` è la versione di sviluppo, `engines.node` è il
  contratto. `measured` (`package.json` dichiara `">=20"`; il README già dice "Node 24 (Node
  20+ works)").
- Il target è `vite preview` e non `vite dev`: scelta dell'utente, non riaperta. Conseguenza
  accettata: il primo avvio paga una build (~10-20s) che `dev` non pagherebbe, in cambio di un
  artefatto di produzione con PWA reale.
- Lo script non tocca `.env`: senza Firebase il gioco è completo tranne la classifica online.
  `measured` (già verificato in Research a `src/services/firebase.ts:21`).
- Il pubblico è chi clona o scarica lo zip, non chi fa deploy. Nessuna promessa di doppio click
  su Linux.
- **[BLOCCANTE da confermare]** Nessuna macchina Windows né macOS è disponibile per la verifica.
  Se ne esiste una, la Fase 2 guadagna un passo di verifica reale e la stima cresce di circa 1h.
  Se non esiste, `play.cmd` e `play.command` vengono spediti con copertura dichiarata `unknown`,
  non `measured`.

## Disambiguazione

Quattro punti dove l'implementazione cambia davvero. Tutti e quattro hanno una raccomandata; il
primo e il secondo sono quelli che conviene confermare prima di scrivere codice.

### D1. Da dove viene la soglia di versione

| Opzione                                                                           | Implica                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Costante `MINIMUM_NODE_MAJOR = 20` in `playLogic.mjs`**                      | Zero parsing. Ma il numero esiste già in `package.json` (`engines`) e nel README: diventa la terza copia, e a un bump di `engines` lo script resta indietro in silenzio                                                                                                             |
| **B. Lettura di `package.json` ed estrazione del primo intero da `engines.node`** | Una sola fonte di verità. Circa 6 righe, nessuna dipendenza (niente `semver`, che non è installabile prima dell'install). Effetto collaterale utile: il ramo d'errore diventa osservabile a runtime alzando temporaneamente `engines` in un clone, senza installare un Node vecchio |
| C. Lettura di `.nvmrc`                                                            | Sbagliata: `.nvmrc` dice `24` e rifiuterebbe un Node 22 perfettamente valido                                                                                                                                                                                                        |

**Raccomandata: B.** Con questa regola sul caso degenere: se `engines.node` manca o non
contiene un intero, lo script stampa un avviso che nomina la causa e **prosegue**, perché npm
applica comunque `engines` al momento dell'install. Non salta il controllo in silenzio e non
muore per una config che non è compito suo validare.

Corollario che risolve una tensione: i wrapper di shell **non** ripetono il numero. Il loro
messaggio, quando `node` proprio non c'è, dice "Node.js is not installed. Get it from
https://nodejs.org, then run this again" senza cifre. Il numero resta in un posto solo.

### D2. Come si rende typecheckabile la logica pura

Questo è il punto che rompe la CI se lo si sceglie male. `tsconfig.json` include `tests`, non
include `scripts`, e non ha `allowJs`. **`measured`**: un `tests/**.test.ts` che importa un
`.mjs` fallisce con `error TS7016: Could not find a declaration file for module ... implicitly
has an 'any' type` (probe eseguita con gli stessi compilerOptions del repo). `npm run typecheck`
è in CI, quindi sarebbe rosso.

| Opzione                                                                  | Implica                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. `"allowJs": true` in `tsconfig.json`**                              | Una riga. `measured`: con `allowJs` la stessa probe passa e TS inferisce i tipi dal `.mjs` (l'annotazione `number \| null` è stata accettata). `measured`: non esiste alcun `.js`/`.jsx` sotto `src` o `tests`, quindi la superficie compilata non cresce di un file |
| B. `scripts/lib/playLogic.d.mts` scritto a mano                          | `tsconfig` intatto, ma le firme sono duplicate e possono divergere dal `.mjs` senza che nulla se ne accorga: un `.d.ts` che mente typechecka verde. È esattamente il fallimento che i test dovrebbero impedire                                                       |
| C. Test scritto in `.mjs` ed estensione di `include` in `vite.config.ts` | Tocca la config condivisa dei test e introduce un secondo linguaggio di test nel repo                                                                                                                                                                                |
| D. Nessun test                                                           | Escluso: la richiesta li prevede e `code-standards` li rende obbligatori su ciò che si implementa                                                                                                                                                                    |

**Raccomandata: A.**

### D3. Quando `dist` è considerata stale

| Opzione                                                                                   | Implica                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Ricostruire solo se `dist/index.html` manca, più il flag `--rebuild`**               | Deterministico e istantaneo al secondo avvio. Buco: dopo un `git pull` il giocatore gioca la build vecchia. Mitigazione obbligatoria: la riga stampata dichiara che sta servendo una build esistente e come forzarla, così il fatto è visibile invece che silenzioso |
| B. Confronto di mtime fra il file più recente sotto `src/` e `dist/index.html`            | Chiude il caso `pull`. Costa circa 30 righe di walk ricorsivo che sono a loro volta codice nuovo da testare, per un caso che una riga di README copre                                                                                                                |
| C. Commit di build scritto in `dist/.build-commit` e confrontato con `git rev-parse HEAD` | Robusto sul `pull`, ma cade su chi scarica lo zip (niente `.git`) e quindi richiede comunque un fallback ad A                                                                                                                                                        |

**Raccomandata: A**, con la riga di stato obbligatoria e una frase nel README ("dopo un
`git pull`, lancia `./play.sh --rebuild`"). Trigger dichiarato per salire a B: la prima
segnalazione reale di qualcuno che ha giocato una build vecchia.

### D4. Come si lancia npm per l'install

Il preview non pone il problema: si lancia `process.execPath` su `node_modules/vite/bin/vite.js`
(**`measured`**: il file esiste e `vite preview --help` su vite 6.4.3 documenta `--open`).
L'install invece npm lo richiede.

| Opzione                                                                                     | Implica                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. `spawn(npmCommand, args, { shell: process.platform === 'win32', stdio: 'inherit' })`** | Su POSIX nessuna shell. Su Windows la shell è necessaria, vedi sotto                                                                                                          |
| B. `spawn('npm.cmd', ...)` senza shell su win32                                             | Non funziona su Node moderno: dal fix di CVE-2024-27980 (Node 18.20 / 20.12) lo spawn di `.bat`/`.cmd` senza `shell: true` solleva `EINVAL`. `inferred`, non verificabile qui |
| C. `shell: true` su tutte le piattaforme                                                    | Un processo di shell in più su POSIX e superficie di quoting in cambio di nulla                                                                                               |

**Raccomandata: A. Rischio di shell injection: non applicabile, per costruzione.** Gli
argomenti passati sono letterali (`ci`, oppure `install`), nessun valore proveniente
dall'ambiente o dal filesystem viene concatenato nella stringa di comando. Il path del repo, che
è l'unica variabile in gioco ed è lo scenario concreto (un clone dentro una cartella con spazi o
con `;`), viaggia nell'opzione `cwd` di `spawn`, che non passa dalla shell.

Sotto-decisione dentro A: **`npm ci` quando `package-lock.json` esiste, `npm install`
altrimenti.** Motivo: `npm install` può riscrivere il lockfile e lasciare l'albero di lavoro
sporco al primo avvio di uno sconosciuto, `npm ci` no. `measured`: il lockfile esiste. Se
`npm ci` fallisce (lockfile disallineato), lo script stampa l'errore ed esce non-zero senza
ripiegare in silenzio su `install`: un fallback muto nasconderebbe un disallineamento vero.

## Approccio

Functional core, imperative shell, che è anche la sola forma in cui questa logica diventa
testabile:

- `scripts/lib/playLogic.mjs`: solo funzioni pure, nessun I/O, nessuna esecuzione al momento
  dell'import. È ciò che i test coprono.
- `scripts/play.mjs`: il guscio. `fs` per l'esistenza di `node_modules` e `dist`, `spawn`,
  `process.exit`. Obiettivo dichiarato: sotto le 80 righe, con ogni decisione delegata al core e
  nessun `if` che decida qualcosa da solo. Stile allineato a `scripts/generate-icons.mjs` (ESM,
  prefisso `node:`, `process.stdout.write`, commento in testa che spiega il perché, `measured`
  leggendo il file).
- I tre wrapper di root sono sottili per contratto: `cd` nella propria directory, controllo di
  esistenza di `node`, `exec` su `scripts/play.mjs` inoltrando gli argomenti. Nessuna logica,
  nessun confronto di versione.

Il `cd` nella directory dello script non è cosmetico: Finder lancia un `.command` con working
directory `$HOME`, quindi senza `cd "$(dirname "$0")"` il doppio click su macOS cerca
`scripts/play.mjs` nella home.

**Vincolo di sintassi su `play.mjs` e `playLogic.mjs`**: entrambi devono _parsare_ su un Node
vecchio, altrimenti l'utente con Node 16 riceve un `SyntaxError` invece del messaggio che lo
script esiste apposta per dargli. Niente top-level `await`, niente `??=`, niente class fields.
Pavimento dichiarato: il messaggio gentile è garantito da Node 14 in su (sotto, gli import con
prefisso `node:` non risolvono); Node 13 e precedenti sono EOL dal 2020 e ricevono l'errore
grezzo, deliberatamente.

**CI: nessuna modifica.** `measured`: eslint gira solo su `**/*.{ts,tsx}`
(`eslint.config.js:14`), quindi `scripts/*.mjs` non è lintato; `coverage.include` copre
`src/engine|config|services|store|hooks` e `scripts/` ne è fuori, quindi le soglie di
`vite.config.ts` non si muovono; il job `verify` continua a passare purché D2 sia risolta.
L'unico gate toccato è `typecheck`, e lo è perché `tests/` è dentro `tsconfig.include`.

## Fasi

Due fasi, entrambe mergiabili da sole. Non tre: una terza fase che contenesse solo il README
renderebbe la prima uno script che nessuno sa che esiste, e sarebbe una fase finta.

**Fase 1 - Launcher Unix, interamente verificabile su questa macchina.** A merge fatto, chi è su
Linux o macOS clona e gioca; chi è su Windows usa la procedura npm che il README già documenta
oggi, quindi nulla peggiora.

**Fase 2 - Wrapper Windows.** Aggiunge `play.cmd` e le righe di README. Isolata di proposito: è
la sola parte non verificabile qui, e tenerla separata mantiene la Fase 1 con verifica
interamente `measured`.

`.gitattributes` viene scritto per intero già in Fase 1, comprese le regole per `play.cmd` che
arriva dopo: una riga che descrive un file non ancora presente è inerte, e costa meno che
riaprire il file in Fase 2.

### Fase 1

| #   | Sub-task                                                                                                                                                                                                                              | Stima  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | Creare `.gitattributes` con `play.sh text eol=lf`, `play.command text eol=lf`, `scripts/*.mjs text eol=lf`, `play.cmd text eol=crlf`. Niente `* text=auto`: è una policy che vale su tutto il repo e va oltre lo scope di questo task | 20 min |

`step -> verify:` `git check-attr eol -- play.sh play.cmd` stampa `lf` e `crlf`;
`git status --porcelain` resta vuoto sui file esistenti, cioè nessuna rinormalizzazione di
massa. Precondizione già misurata: nessun file di testo tracciato contiene CRLF nell'index, solo
i binari (font e PNG).

| #   | Sub-task                                                                                                                                                                                                                                                                                                                                                                                                        | Stima |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1.2 | `scripts/lib/playLogic.mjs`, funzioni pure: `parseNodeMajor(versionString)`, `parseRequiredMajor(enginesRange)`, `isNodeSupported(current, required)`, `buildUnsupportedNodeMessage({ current, required })`, `planSteps({ hasNodeModules, hasDist, forceRebuild })`, `resolveInstallCommand({ hasLockfile, platform })`. Argomento singolo a oggetto dove i campi sono più di due, per il limite di 4 parametri | 1h    |

`step -> verify:`
`node -e "import('./scripts/lib/playLogic.mjs').then(m => console.log(Object.keys(m)))"` elenca
le sei funzioni e non stampa nient'altro, cioè l'import non ha effetti collaterali.

| #   | Sub-task                                                                                                                                    | Stima |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1.3 | `tests/scripts/playLogic.test.ts` con happy path, edge e caso d'errore per ciascuna funzione, più `"allowJs": true` in `tsconfig.json` (D2) | 1h    |

`step -> verify:` `npx vitest run tests/scripts/playLogic.test.ts` verde **dopo** aver visto
almeno un rosso (invertire il confronto in `isNodeSupported` e osservare il fallimento, poi
ripristinare); `npm run typecheck` esce 0. La combinazione test-`.ts` che importa modulo `.mjs`
è **`measured`**: probe eseguita con vitest su questo `node_modules`, 1 test passato.

| #   | Sub-task                                                                                                                                                          | Stima |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1.4 | `scripts/play.mjs`: legge `engines`, applica il core, esegue install e build condizionati, lancia il preview con `--open`, inoltra il codice di uscita del figlio | 1h 30 |

`step -> verify:` nel clone di 1.6, ogni ramo osservato singolarmente; a caldo,
`node scripts/play.mjs` apre il browser e la riga di stato dichiara di stare servendo la build
esistente.

| #   | Sub-task                                                                                                                   | Stima  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.5 | `play.sh` e `play.command` (contenuto identico, due nomi per due modi di lancio), commit con `git update-index --chmod=+x` | 45 min |

`step -> verify:` `git ls-files -s play.sh play.command` mostra `100755`. Nota: **`measured`**,
oggi il repo non ha alcun file tracciato a `100755`, quindi non esiste un precedente da cui il
bit venga ereditato per caso; il `--chmod` è obbligatorio e va verificato, non assunto.

| #   | Sub-task                                                                                                                            | Stima |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1.6 | Verifica runtime su clone pulito: i cinque rami (freddo, tiepido, caldo, `--rebuild`, Node troppo vecchio) più il ramo Node assente | 1h    |

`step -> verify:` sequenza eseguibile, tutta nella scratchpad:

```
git clone <repo> <CLONE> && cd <CLONE>
./play.sh                                  # DoD-1: install, build, browser
./play.sh                                  # DoD-2: nessun install, nessuna build
rm -rf dist && ./play.sh                   # DoD-3: solo build
./play.sh --rebuild                        # DoD-4: build anche con dist presente
# DoD-5: portare engines.node a ">=99" nel clone, poi
./play.sh; echo "exit=$?"                  # messaggio + exit=1
env PATH=/usr/bin:/bin ./play.sh; echo $?  # DoD-6: messaggio del wrapper + 1
```

Il clone è usa-e-getta, quindi la modifica di `engines` per DoD-5 non tocca mai il repo vero.

| #   | Sub-task                                                                                                         | Stima  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 1.7 | README: nuova sezione dopo `## Requirements`, più riga `play` in `package.json` scripts e nella tabella Commands | 45 min |

`step -> verify:` `npx prettier --check README.md package.json` esce 0; la sezione contiene la
stringa `file://` nell'avvertimento e `./play.sh` come unica istruzione Linux.

Subtotale Fase 1: **6h 20**.

### Fase 2

| #   | Sub-task                                                                                                                                                                      | Stima  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | `play.cmd`: `@echo off`, `cd /d "%~dp0"`, `where node` con ramo di errore che stampa, fa `pause` ed esce 1, poi `node scripts\play.mjs %*` seguito da `if errorlevel 1 pause` | 45 min |

`step -> verify:` su Linux la verifica possibile è statica e va dichiarata come tale:
`git ls-files --eol play.cmd` mostra `crlf`, e `file play.cmd` conferma "with CRLF line
terminators". Il comportamento del doppio click, di `pause` e del quoting di `cmd.exe` resta
`unknown`.

| #   | Sub-task                                                                                                                                                                                                       | Stima  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.2 | README: riga Windows, nota macOS su Gatekeeper per chi scarica lo zip (`inferred`: un `git clone` non mette l'attributo di quarantena, un download sì), e dichiarazione esplicita di cosa non è stato eseguito | 30 min |

`step -> verify:` la sezione contiene una frase che nomina Windows e macOS come non verificati
su questa macchina.

Subtotale Fase 2: **1h 15**, più 1h se esiste una macchina Windows su cui eseguire davvero il
doppio click.

### Totale

6h 20 + 1h 15 = 7h 35. Con buffer +20% per imprevisti su un territorio senza precedenti nel repo
(primo test fuori dal mirror di `src`, primo file eseguibile tracciato, prima `.gitattributes`):
**9h - 9h 30, cioè 1 - 1,5 giorni.** Fascia alta se la verifica Windows è nello scope.

## File da modificare

| File                              | Tipo                 | Motivo                                                                                                                                                                                                            |
| --------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitattributes`                  | nuovo                | `eol=lf` sugli script Unix e su `scripts/*.mjs`, `eol=crlf` su `play.cmd`. Senza, `#!/bin/sh\r` fallisce con un errore incomprensibile                                                                            |
| `scripts/lib/playLogic.mjs`       | nuovo                | Funzioni pure: parsing versione, decisione dei passi, composizione dei messaggi. È la superficie testata                                                                                                          |
| `scripts/play.mjs`                | nuovo                | Guscio imperativo: fs, spawn, exit code. Unica sede della logica di avvio                                                                                                                                         |
| `play.sh`                         | nuovo, modo 755      | Wrapper Linux. `cd` nella propria directory, controllo esistenza `node`, exec                                                                                                                                     |
| `play.command`                    | nuovo, modo 755      | Wrapper macOS, contenuto identico a `play.sh`. Il `cd` è load-bearing: Finder lancia da `$HOME`                                                                                                                   |
| `play.cmd`                        | nuovo, CRLF (Fase 2) | Wrapper Windows, con `pause` sui rami di errore perché la console si chiude all'uscita                                                                                                                            |
| `tests/scripts/playLogic.test.ts` | nuovo                | Test comportamentali sulle funzioni pure                                                                                                                                                                          |
| `tsconfig.json`                   | modifica, 1 riga     | `"allowJs": true`. Senza, `npm run typecheck` (in CI) rompe con TS7016                                                                                                                                            |
| `package.json`                    | modifica, 1 riga     | `"play": "node scripts/play.mjs"`, per chi npm lo conosce. Segue il precedente di `"icons"`                                                                                                                       |
| `README.md`                       | modifica             | Sezione di avvio locale, avvertimento su `file://`, limiti di verifica dichiarati                                                                                                                                 |
| `.prettierignore`                 | **nessuna modifica** | `measured`: `npx prettier --check` su una directory con `play.sh`, `play.cmd`, `play.command` e `.gitattributes` esce 0 e li salta, perché prettier filtra per estensione supportata quando espande una directory |
| `.github/workflows/ci.yml`        | **nessuna modifica** | Motivi sopra in Approccio                                                                                                                                                                                         |
| `eslint.config.js`                | **nessuna modifica** | `measured`: gira solo su `**/*.{ts,tsx}`                                                                                                                                                                          |
| `vite.config.ts`                  | **nessuna modifica** | `measured`: `coverage.include` non copre `scripts/`, le soglie non si muovono                                                                                                                                     |

## Cosa è testabile, e come

**Coperto da vitest, `measured` a implementazione fatta:**

| Funzione                      | Casi                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `parseNodeMajor`              | `'v24.12.0'` → 24; `'20.0.0'` → 20; `''` e `'garbage'` → `null`                                                             |
| `parseRequiredMajor`          | `'>=20'` → 20; `'>=20.0.0'` → 20; `'^20 \|\| ^22'` → 20; `undefined` → `null`                                               |
| `isNodeSupported`             | 24/20 true; 20/20 true (il confine, il caso che si sbaglia); 18/20 false                                                    |
| `buildUnsupportedNodeMessage` | Contiene `https://nodejs.org`, la versione trovata e quella richiesta. Asserzione positiva sui contenuti, non "non è vuoto" |
| `planSteps`                   | Le quattro combinazioni di `hasNodeModules` × `hasDist`, più `forceRebuild: true` che forza `build` con `dist` presente     |
| `resolveInstallCommand`       | Con lockfile → `npm ci`; senza → `npm install`; su `win32` l'oggetto ritornato porta `shell: true`, altrove `false`         |

**Verificabile a runtime su questa macchina (Linux), non da vitest ma dalla sequenza di 1.6:** i
cinque rami di `play.mjs`, il ramo Node-assente del wrapper, l'exit code, l'apertura del
browser, l'idempotenza del secondo avvio.

**Non verificabile qui, e va detto invece di fingere copertura:**

| Comportamento                                                                                            | Stato                                                           | Come si dichiara                                                                      |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Doppio click su `play.cmd`, `pause` che trattiene la console, quoting di `cmd.exe`, `%~dp0`              | `unknown`                                                       | Riga nel README e nell'handoff: "non eseguito su Windows"                             |
| `spawn` di npm con `shell: true` su win32, e l'`EINVAL` che giustifica la scelta                         | `inferred` da CVE-2024-27980                                    | Commento nel codice che nomina il motivo, non solo il flag                            |
| Doppio click su `play.command` da Finder, Terminal.app che si apre in `$HOME`, bit di esecuzione onorato | `unknown`                                                       | Stessa riga                                                                           |
| Gatekeeper su uno zip scaricato                                                                          | `inferred`                                                      | Frase condizionale nel README ("se hai scaricato uno zip"), non un'affermazione secca |
| Doppio click su Linux (GNOME Files)                                                                      | `measured` come non supportato dalla documentazione del desktop | Il README dice `./play.sh` da terminale e non promette altro                          |

La formula da usare in consegna, non un "fatto con riserva": "`play.cmd` è implementato ma non
l'ho potuto eseguire perché non ho una macchina Windows. Trattalo come non verificato finché
qualcuno non lo lancia."

## Rischi

| Rischio                                                                                                                                                                                                                                                                            | Mitigazione                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1. `npm run typecheck` rompe in CI.** Poiché `tsconfig.include` contiene `tests` senza `allowJs`, il test che importa il `.mjs` fallisce con TS7016, il che rende rosso il job `verify` e blocca ogni PR. `measured` con probe                                                  | D2 opzione A, e `npm run typecheck` come verify del sub-task 1.3, non come controllo finale                                                                                                 |
| **R2. `npm run format:check` è già rosso su 18 file, tutti preesistenti** (`docs/`, `specs/`, `src/`, `tests/`). `measured`. Non è in CI, quindi nessuno se n'è accorto. Sistemarli qui sarebbe un refactor estetico di codice funzionante, fuori scope per §Modifiche Chirurgiche | Verificare solo i file nuovi (DoD-9). Segnalare i 18 all'utente come finding separato, con la domanda se vuole un commit `chore(format)` dedicato e `format:check` aggiunto al job `verify` |
| **R3. Bit di esecuzione perso.** Poiché il repo non ha alcun file tracciato a `100755` (`measured`), non c'è nulla da cui il bit venga ereditato, e senza `git update-index --chmod=+x` il doppio click su macOS non fa assolutamente nulla, senza errore                          | Verify meccanico su `git ls-files -s` in 1.5, prima del commit                                                                                                                              |
| **R4. Build stale servita in silenzio** dopo un `git pull`. Effetto: il giocatore riporta un bug già corretto                                                                                                                                                                      | D3 opzione A più la riga di stato che dichiara quale build sta servendo, più una frase di README. Trigger esplicito per salire a B                                                          |
| **R5. `play.mjs` non parsa su Node vecchio** e l'utente riceve un `SyntaxError` invece del messaggio. È il fallimento più beffardo possibile per uno script che esiste per gestire quel caso                                                                                       | Vincolo di sintassi dichiarato in Approccio, floor Node 14, e nessun top-level await                                                                                                        |
| **R6. `npm install` sporca `package-lock.json`** al primo avvio di uno sconosciuto, che poi non sa cosa sia quel file modificato                                                                                                                                                   | `npm ci` quando il lockfile esiste (D4), senza fallback silenzioso                                                                                                                          |
| **R7. Porta 4173 occupata.** Vite auto-incrementa e `--open` apre la porta reale                                                                                                                                                                                                   | Non costruire mai l'URL a mano nello script: delegare a `--open`. È la ragione per cui `--open` non è un dettaglio di comodità                                                              |
| **R8. Su questa macchina `dist/` e `node_modules/` esistono già**, quindi lanciare lo script nel repo di lavoro non esercita mai i rami install e build, e li si dichiarerebbe funzionanti senza averli visti                                                                      | Tutta la verifica di 1.6 gira su un clone pulito nella scratchpad, mai nel repo di lavoro                                                                                                   |

## Criteri di successo

Il piano è chiuso quando, nell'ordine:

1. DoD-1 ... DoD-12 sono tutti spuntati con l'output osservato, non dedotto.
2. `npm run lint && npm run typecheck && npm run test:coverage && npm run build` esce 0 in un
   colpo solo.
3. La sequenza di 1.6 è stata eseguita su un clone pulito e i sei esiti sono stati letti a
   video.
4. Il messaggio di consegna porta la riga `BASIS: measured` sui rami Linux e `BASIS: unknown` su
   Windows e macOS, separatamente, invece di un unico verde indistinto.
5. La riga `CHECKS:` prima del commit nomina `code-reviewer` e `verify`; `a11y-gate` è `N/A`,
   nel diff non c'è UI.

## Handoff

Prossimo agent: **`tdd-guide`**. Il cuore del lavoro è un core puro con sei funzioni e confini
netti (il caso 20/20 di `isNodeSupported`, le quattro combinazioni di `planSteps`), che è
esattamente ciò che il ciclo rosso-verde-refactor governa meglio. Il guscio `play.mjs` e i tre
wrapper non sono materiale TDD: passano a `fullstack-developer` o si scrivono di seguito, con la
verifica runtime di 1.6 come gate.

Nota per l'orchestratore: il repo ha `specs/001...003` con `plan.md` + `tasks.md`, quindi se
questo piano viene materializzato come `specs/004-local-play-scripts/`, il gate `/analyze`
diventa applicabile a fine implementazione.

Due punti da confermare prima di partire: l'assunzione bloccante sulla disponibilità di una
macchina Windows, e D1/D2 (le altre due disambiguazioni sono a basso costo di ripensamento,
queste due no).
