# Tasks: script di avvio locale cross-platform

Scomposizione del piano in `plan.md`. Una riga per sub-task. Le dipendenze sono dirette, mai
transitive. "Requisito" rimanda alle voci della Definition of Done del piano.

| ID  | Fase                | Titolo                                                                | Dipende da | Requisito                         | Stima  |
| --- | ------------------- | --------------------------------------------------------------------- | ---------- | --------------------------------- | ------ |
| 1.1 | 1 - Launcher Unix   | Creare `.gitattributes` con le regole eol per Unix e per Windows      | -          | DoD-10                            | 20 min |
| 1.2 | 1 - Launcher Unix   | Scrivere il core puro `scripts/lib/playLogic.mjs` (sei funzioni)      | -          | DoD-2, DoD-4, DoD-5               | 1h     |
| 1.3 | 1 - Launcher Unix   | Test vitest sul core + `"allowJs": true` in `tsconfig.json`           | 1.2        | DoD-7, DoD-8                      | 1h     |
| 1.4 | 1 - Launcher Unix   | Scrivere il guscio `scripts/play.mjs` (fs, spawn, exit code)          | 1.2        | DoD-1, DoD-2, DoD-3, DoD-4, DoD-5 | 1h 30  |
| 1.5 | 1 - Launcher Unix   | Scrivere `play.sh` e `play.command`, commit con bit di esecuzione     | 1.1, 1.4   | DoD-6, DoD-10                     | 45 min |
| 1.6 | 1 - Launcher Unix   | Verifica runtime dei sei rami su clone pulito nella scratchpad        | 1.5        | DoD-1 ... DoD-6                   | 1h     |
| 1.7 | 1 - Launcher Unix   | README: sezione di avvio locale, `play` in package.json e in Commands | 1.6        | DoD-9, DoD-11                     | 45 min |
| 2.1 | 2 - Wrapper Windows | Scrivere `play.cmd` con `%~dp0`, `where node` e `pause` sugli errori  | 1.4, 1.1   | DoD-10                            | 45 min |
| 2.2 | 2 - Wrapper Windows | README: riga Windows, nota Gatekeeper, limiti di verifica dichiarati  | 2.1, 1.7   | DoD-12                            | 30 min |

## Subtotali

- Fase 1 (1.1 - 1.7): **6h 20**
- Fase 2 (2.1 - 2.2): **1h 15**, più 1h se esiste una macchina Windows per la verifica reale
- Totale grezzo: **7h 35**
- Con buffer +20% (territorio senza precedenti nel repo: primo test fuori dal mirror di `src`,
  primo file eseguibile tracciato, prima `.gitattributes`): **9h - 9h 30, cioè 1 - 1,5 giorni**

## Ordine e mergiabilità

Le due fasi sono indipendentemente mergiabili. A fine Fase 1 chi è su Linux o macOS clona e
gioca; chi è su Windows usa la procedura npm che il README documenta già oggi, quindi nulla
peggiora. La Fase 2 è isolata perché è la sola parte non verificabile su questa macchina.

`2.1` dipende da `1.1` perché la regola `play.cmd text eol=crlf` viene scritta già in Fase 1: una
riga che descrive un file non ancora presente è inerte e costa meno che riaprire il file.

## Bloccante prima di iniziare

Disponibilità di una macchina Windows. Se esiste, `2.1` guadagna un passo di verifica reale
(+1h) e la copertura passa da `unknown` a `measured`. Se non esiste, `play.cmd` e `play.command`
si spediscono con copertura dichiarata `unknown`.

Da confermare anche D1 (sorgente della soglia di versione) e D2 (come rendere typecheckabile il
core): sono le due disambiguazioni a costo di ripensamento alto. D3 e D4 sono a costo basso.
