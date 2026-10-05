# 005 - Interfaccia bilingue IT/EN

## Obiettivo

Tutte le stringhe visibili passano per i18n, con italiano come lingua di default e inglese come alternativa. Un selettore a bandiere cambia lingua senza ricaricare la pagina e la scelta persiste tra le sessioni.

## Decisioni approvate

- **D1, libreria**: `i18next` + `react-i18next`. Scartato un `t()` scritto a mano su Zustand: zero dipendenze, ma avrebbe richiesto di riscrivere la gestione dei plurali.
- **D2, termini condivisi**: il gergo da terminale ha lo stesso valore nei due dizionari. Rientrano il nome del gioco, i nomi degli achievement, i nomi dei power-up, le esclamazioni di combo, `SYSTEM STABLE`/`CORE DUMPED`, il placeholder `anon` e la notazione `x{n}`. Tutto il resto si traduce. La premessa del brief ("UI italiana con termini inglesi") non valeva: la UI di partenza era interamente in inglese.
- **D3, posizione del selettore**: in Impostazioni, sulla riga dell'etichetta Nickname. Il gioco non mostra un nome utente in nessun altro punto.

## Struttura

- `src/i18n/locales/en.ts`: dizionario di riferimento (`as const`). Fissa la forma che le altre lingue devono rispettare.
- `src/i18n/locales/it.ts`: tipizzato su `Messages`. Se manca una chiave, il typecheck fallisce. Per il gergo riusa i valori di `en`.
- `src/i18n/index.ts`: init sincrono, `applyLanguage()` (che aggiorna anche `<html lang>`), costanti di persistenza.
- Chiavi in forma `area.elemento`, camelCase. Plurali con i suffissi `_one`/`_other`.
- Engine e config mantengono solo gli id. Il testo sta nei dizionari, indicizzato per id (`achievements.items.<id>`, `powerUps.<TYPE>`, `combo.<id>`).
- Persistenza: `useSettingsStore.language`, salvata con la chiave `coredump.language` tramite `persistence.ts`. "Cancella questo dispositivo" riporta la lingua al default.

## Fuori scope

- Manifest PWA e meta description restano in inglese, perché sono valori fissati a build time.
- I numeri non vengono formattati con `Intl`: cambierebbe il comportamento attuale (`10000` diventerebbe `10.000`).
- README e docs non sono stati toccati.

## Verifica

- Test di parità chiavi, test sui termini condivisi, test di traduzione effettiva, persistenza e plurali italiani.
- La suite esistente gira in inglese grazie al seed in `tests/setup.ts`.
- E2E: lo smoke test gira in inglese; `e2e/language.spec.ts` copre il default IT, il cambio di lingua e la persistenza dopo il reload.
- Una sola esecuzione di `eslint-plugin-i18next` (`no-literal-string`) su componenti e config, senza aggiungerlo al `package.json`. Risultato: 0 testi JSX letterali.
