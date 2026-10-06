[English](./SECURITY.md) | **Italiano**

# Politica di sicurezza

Core Dump è un gioco che gira interamente nel browser. La build pubblicata non ha un server proprio: l'unico backend con cui può parlare è un progetto Firebase di chi lo pubblica, e solo se lo configura. Quando un giocatore avvia il gioco con il launcher locale, un server Vite sulla sua macchina espone anche una route per il file di salvataggio. La superficie di attacco è il percorso di scrittura della classifica, la configurazione dell'hosting e quella route locale.

## Versioni supportate

Il repository non ha tag di release. Gli aggiornamenti di sicurezza vengono applicati all'ultimo commit del branch `main`.

## Segnalare una vulnerabilità

Per segnalare una vulnerabilità, usa i [GitHub Security Advisories](https://github.com/AndreaBonn/core-dump-game/security/advisories/new).

Indica:

- Descrizione della vulnerabilità
- Passi per riprodurla
- Comportamento atteso rispetto a quello osservato
- Valutazione di impatto: cosa potrebbe ottenere un attaccante

Tempi di risposta:

- Presa in carico entro 72 ore
- Fix per i problemi critici entro 30 giorni
- Divulgazione pubblica coordinata dopo il rilascio del fix

## Misure di sicurezza implementate

Ogni voce qui sotto è stata verificata nel codice di questo repository.

- **Validazione server-side di ogni scrittura in classifica**: le regole Firestore rivalidano l'intero documento sia in creazione sia in aggiornamento, non solo il campo modificato, così i limiti verificati alla creazione non possono essere aggirati dopo e non si possono iniettare campi extra (`firestore.rules:14`, `firestore.rules:39`).
- **Proprietà del documento**: un giocatore può scrivere solo il documento il cui id coincide con il proprio uid, e il campo `userId` del payload deve corrispondere sia al path sia all'uid autenticato (`firestore.rules:32`).
- **Modalità nel path, non nel payload**: la modalità di classifica è un segmento del path, quindi non è falsificabile nel corpo del documento (`firestore.rules:8`).
- **Punteggi monotoni**: un aggiornamento viene accettato solo se il nuovo punteggio è strettamente maggiore di quello salvato, il che limita il numero di scritture utili per un client (`firestore.rules:39`).
- **Campi limitati**: punteggio intero in `[0, 1000000)`, livello in `[1, 100]`, nome visualizzato stringa non vuota di massimo 24 caratteri, timestamp uguale all'ora del server (`firestore.rules:14`).
- **Normalizzazione lato client prima della scrittura**: punteggi, livelli e nickname vengono limitati e ripuliti negli intervalli che le regole accettano, così uno stato locale malformato viene respinto prima di arrivare in rete (`src/services/scoreValidation.ts:10`, `src/services/scoreValidation.ts:29`).
- **Diritto alla cancellazione**: un giocatore può eliminare la propria riga di classifica, e nessun'altra (`firestore.rules:46`, `src/services/leaderboardService.ts:95`).
- **Route di salvataggio locale limitata alle richieste same-origin**: `GET` e `PUT /api/save` vengono rifiutate con 403 quando l'`Origin` del browser non coincide con l'`Host` con cui il server è stato raggiunto, quindi una pagina di un altro sito non può leggere né sovrascrivere il salvataggio (`scripts/lib/saveFile.mjs:24`, `scripts/lib/saveFile.mjs:57`).
- **Scritture di salvataggio limitate e ben formate**: un body oltre 64 KB viene interrotto già durante la lettura e riceve 413; tutto ciò che non è un oggetto JSON viene rifiutato con 400; il file viene scritto su un file temporaneo accanto e poi rinominato, così una scrittura interrotta lascia intatto il salvataggio precedente (`scripts/lib/saveFile.mjs:11`, `scripts/lib/saveFile.mjs:68`, `scripts/lib/saveFile.mjs:120`).
- **Contenuto del salvataggio rivalidato al caricamento**: il profilo riletto dal file viene interpretato campo per campo, con controlli di tipo e valori di ripiego, prima di essere unito, quindi un file malformato si riduce a un profilo vuoto invece di rompere il gioco (`src/store/useProgressStore.ts:91`).
- **Solo autenticazione anonima**: il gioco non gestisce nessuna password, email o credenziale. Se l'accesso fallisce, il comportamento degrada in modalità offline invece di sollevare un errore (`src/services/authService.ts:10`).
- **Header di sicurezza sulla build pubblicata**: `Content-Security-Policy` con `default-src 'self'`, `object-src 'none'` e `frame-ancestors 'none'`, più HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` e `Referrer-Policy: strict-origin-when-cross-origin` (`firebase.json`).
- **Nessuna superficie di HTML injection**: l'interfaccia è React senza `dangerouslySetInnerHTML`, senza assegnazioni a `innerHTML` e senza `eval` in tutto `src/`.
- **Dipendenze bloccate e aggiornate**: `package-lock.json` è versionato e Dependabot apre aggiornamenti settimanali raggruppati per npm e GitHub Actions (`.github/dependabot.yml`).
- **Regole di sicurezza sotto test**: le regole Firestore girano contro l'emulatore in CI, in un job dedicato (`.github/workflows/ci.yml`).

### Non implementato

Dichiarato esplicitamente, perché un'assenza si legge male più facilmente di una presenza:

- **Nessun rate limiting.** Niente limita la frequenza con cui un client autenticato può tentare una scrittura. La regola sul punteggio monotono limita le scritture utili, non i tentativi.
- **Nessun `npm audit` o scanner equivalente in CI.** L'aggiornamento delle dipendenze si appoggia al solo Dependabot.
- **La route di salvataggio non è coperta dal controllo host di Vite.** La route è montata prima della validazione dell'`Host` fatta da Vite, quindi una pagina che usa il DNS rebinding, con `Origin` e `Host` concordi sul dominio dell'attaccante, supera il controllo same-origin: con un header `Host` falsificato Vite risponde 403 per la pagina e 204 per una `PUT /api/save`. L'esposizione riguarda i progressi di gioco del giocatore, solo mentre il launcher è in esecuzione e solo verso una pagina che conosce la porta.
- **Nessuna verifica server-side che un punteggio sia raggiungibile.** I punteggi sono calcolati nel browser; le regole impongono forma e limiti, non plausibilità. Un client determinato può inviare qualsiasi valore dentro quei limiti.

## Best practice per chi pubblica il gioco

I valori `VITE_FIREBASE_*` sono la configurazione del Web SDK di Firebase: sono pubblici per costruzione e finiscono nel bundle compilato. Non sono segreti, e il confine di sicurezza sta altrove. Quello che conta al momento del deploy:

- Pubblica le regole Firestore di questo repository (`firebase deploy --only firestore:rules`). Senza, valgono le regole di default del progetto e le garanzie elencate sopra non esistono.
- Tieni Anonymous Auth come unico provider di accesso abilitato, a meno di aggiungerne e revisionarne un altro.
- Servi il sito in HTTPS e mantieni gli header di `firebase.json`, che sono ciò che rende efficace la CSP.
- Tieni `.env` e `.firebaserc` fuori dal controllo di versione, come già fa `.gitignore`.

## Fuori ambito

Non sono considerate vulnerabilità di questo progetto:

- L'invio di un punteggio poco plausibile ma dentro i limiti da un client modificato. I punteggi sono calcolati lato client per scelta, e la cosa è documentata sopra invece di essere difesa.
- Il self-XSS, cioè gli attacchi che richiedono alla vittima di incollare codice nella propria console.
- La lettura o la modifica del profilo locale in `localStorage` o in `save/progress.json` dalla macchina del giocatore. Entrambi appartengono al giocatore e non contengono credenziali.
- Ingegneria sociale e attacchi fisici.
- Vulnerabilità già divulgate pubblicamente in dipendenze di terze parti. Vanno segnalate a monte.
- Denial of service ottenuto con un uso legittimo ma eccessivo.

## Riconoscimenti

Chi segnala vulnerabilità in modo responsabile verrà elencato qui.

---

[Torna al README](./README.it.md)
