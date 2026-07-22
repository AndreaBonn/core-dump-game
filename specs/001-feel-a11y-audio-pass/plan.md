# Piano — Feel, accessibilità e audio pass (core-dump)

Slug: `001-feel-a11y-audio-pass` — branch: master.

## Obiettivo

Aggiungere audio procedurale, tre feature di game-feel (preview traiettoria, swap
current/next, urgenza sul fronte catena), il rispetto di `prefers-reduced-motion`, la pausa
automatica su tab nascosta e l'accessibilità degli overlay/menu; il tutto senza intaccare la
simulazione deterministica né la copertura al 100% dello scope engine/config/services.

## Definition of Done (verificabile)

- [ ] Il gioco emette suoni sintetizzati (WebAudio) per shoot/match/combo-2/3/4/powerup/
      game-over/level-complete; il mute di `useSettingsStore` li silenzia.
- [ ] Nessun asset audio binario aggiunto al repo.
- [ ] Preview: durante il gioco una linea puntata mostra dove atterrerebbe il colpo, coerente
      con lo sparo reale (stesso algoritmo di collisione).
- [ ] Swap: right-click e il tasto scelto scambiano pacchetto pronto e in coda; l'HUD "next"
      si aggiorna.
- [ ] Urgenza: quando il fronte catena è entro soglia dal void, i pacchetti di testa pulsano/
      desaturano.
- [ ] Con `prefers-reduced-motion: reduce` shake e particelle sono azzerati.
- [ ] Nascondendo la tab il gioco va in pausa (nessun auto-resume).
- [ ] Gli overlay (`Modal`) hanno focus-trap, chiusura con Escape (dove sensato), focus
      spostato all'apertura e ripristinato alla chiusura; il canvas ha `aria-label`.
- [ ] `a11y-gate` sugli overlay renderizzati: nessun gate a `1` (contrasto, focus, dialog).
- [ ] `RenderSystem.ts` sotto 300 righe dopo l'estrazione di `FxRenderer`.
- [ ] I 151 test attuali restano verdi; coverage 100% righe/statement nello scope; la nuova
      logica pura (soundSpecs, renderSpec, trajectory, urgency, swap) è testata comportamentalmente.

## Assunzioni

- Vitest/jsdom: `AudioContext` e `window.matchMedia` assenti → isolati nel layer React o
  iniettati; i test audio moccano il context.
- La simulazione resta la fonte di verità; preview/urgenza sono view-only e girano solo in
  `drawFrame`/render, mai in `fixedUpdate`/`applyShot`.
- Nessun cambiamento allo schema Firestore né alla logica di punteggio.

## Approccio (ADR consolidati da architect)

- **ADR-001** Audio: `soundSpecs.ts` (dati puri: freq, tipo oscillatore, durata, envelope,
  sweep) separato da `renderSpec(ctx, spec, now)` che rende via WebAudio. La spec è testata
  senza AudioContext.
- **ADR-002** `AudioManager` riceve una **factory di AudioContext** iniettata (DI dell'I/O);
  lazy-init al primo `play()` (dentro il gesto utente), `resume()` idempotente; `load()`
  resta no-op vestigiale. Il singleton usa la factory di default `() => new AudioContext()`;
  i test istanziano `AudioManager` con una factory mock.
- **ADR-003** Preview: `systems/trajectory.ts` puro, ray-march a step fisso (8px) che **riusa
  `findCollisionIndex`** → coerenza garantita con lo sparo. Ritorna `{ point, hit }`.
- **ADR-004** Swap: metodo `CpuCursor.swap()` (stato coeso sull'entità).
- **ADR-005** Urgenza: `systems/urgency.ts` puro `frontUrgency(frontDistance, pathLength,
  threshold) -> 0..1`, consumato via `RenderScene.urgency`.
- Principio trasversale: calcolo puro → `systems/`, stato coeso → entità, popolamento DTO e
  side-effect → shell (`GameEngine`). Nessuna delle feature è un metodo di logica su GameEngine.
- **Refactor prima dei wiring**: estrarre `FxRenderer` da `RenderSystem` (a 274/300) prima di
  aggiungere il disegno di preview e urgenza, per non sforare il limite.

## Disambiguazioni (con default)

- **Auto-resume su tab visibile** → NO: si resta in pausa, l'utente riprende (evita resume
  sopra game-over/pausa volontaria).
- **matchMedia** letto in `GameCanvas` (+ listener change) → setter su engine/fx.
- **Reduced-motion** → azzeramento completo di shake e particelle (non attenuazione).
- **Tasto swap** → right-click (button 2, contextmenu prevenuto) + `KeyS`. *Unica scelta da
  confermare con l'utente.*

## Sub-task (raggruppati per commit atomico, ordinati per dipendenza)

### G1 — feat(audio): SFX sintetizzati
1. `soundSpecs.ts` + test (mappa pura SoundName → parametri). (20m)
2. `renderSpec.ts` + test con context mock (crea oscillator/gain, connect/start/stop). (25m)
3. Riscrivere `AudioManager` (factory DI, lazy-init, resume, mute, play→renderSpec) + riscrivere `audioManager.test.ts`. (30m)
4. Wiring browser: factory reale nel singleton; sblocco context al primo gesto. (10m)

### G2 — refactor(render): estrai FxRenderer
5. Nuovo `FxRenderer.ts` (particelle/ripple) + aggiungerlo a `coverage.exclude`; `RenderSystem` lo delega. (25m)

### G3 — feat: preview traiettoria
6. `trajectory.ts` puro `predictLanding(...)` + test. (25m)
7. Estendere `RenderScene` con `trajectory`; `GameEngine.drawFrame` la calcola (solo se playing); `RenderSystem` disegna la linea puntata. (20m)

### G4 — feat: swap current/next
8. `CpuCursor.swap()` + test. (10m)
9. `InputSystem`: `onSwap` su button 2 (+ preventDefault contextmenu) + test. (15m)
10. `GameEngine`: `swap()` (cursor.swap + onNextPacketChange), wiring input + tasto `KeyS` in onKeyDown + test. (15m)

### G5 — feat: urgenza fronte catena
11. `urgency.ts` puro + test. (10m)
12. `RenderScene.urgency`; `GameEngine` la popola; `RenderSystem` pulsa/desatura i pacchetti di testa. (20m)

### G6 — feat(a11y) + reduced-motion + pausa tab
13. `VisualFx.setReducedMotion` (azzera shake/particelle) + `GameEngine.setReducedMotion` + test. (15m)
14. `GameCanvas`: matchMedia→setReducedMotion (+ listener), `aria-label` sul canvas. (10m)
15. `GameScreen`: `visibilitychange` → pausa se playing (no auto-resume). (10m)
16. `Modal`: focus-trap, Escape→onClose opzionale, focus init/restore; `PauseOverlay` passa onResume come onClose. (25m)
17. Gate `a11y-gate` sugli overlay renderizzati; risolvere eventuali finding (contrasto muted, ecc.). (20m)

## File da modificare

| File | Tipo | Motivo |
|---|---|---|
| src/engine/audio/soundSpecs.ts | nuovo | spec pura dei suoni |
| src/engine/audio/renderSpec.ts | nuovo | render WebAudio di una spec |
| src/engine/audio/AudioManager.ts | mod | factory DI, synth, mute, resume |
| src/engine/systems/trajectory.ts | nuovo | predizione atterraggio (puro) |
| src/engine/systems/urgency.ts | nuovo | urgenza fronte catena (puro) |
| src/engine/systems/FxRenderer.ts | nuovo | disegno particelle/ripple (view) |
| src/engine/systems/RenderSystem.ts | mod | delega FxRenderer, preview, urgenza |
| src/engine/systems/InputSystem.ts | mod | onSwap su button 2 |
| src/engine/entities/CpuCursor.ts | mod | swap() |
| src/engine/systems/VisualFx.ts | mod | setReducedMotion |
| src/engine/GameEngine.ts | mod | swap, reduced-motion, trajectory/urgency nel DTO |
| src/components/game/GameCanvas.tsx | mod | matchMedia, aria-label |
| src/components/game/GameScreen.tsx | mod | visibilitychange |
| src/components/shared/Modal.tsx | mod | focus-trap, Escape, focus mgmt |
| vite.config.ts | mod | exclude FxRenderer |
| tests/** | nuovo/mod | test moduli puri + engine |

## Rischi (con mitigazioni)

- **Coverage 100% obbligata su nuovi file engine** → tutta la logica nuova è pura e testata;
  solo `FxRenderer` (view) va in `exclude`.
- **jsdom senza AudioContext/matchMedia** → DI della factory audio; matchMedia solo in React
  con guardia.
- **Determinismo** → preview/urgenza solo in render; i 151 test sim sono il gate; nessuna nuova
  branch non coperta in GameEngine (chiamate incondizionate nei rami già testati).
- **`RenderSystem` oltre 300 righe** → estrazione `FxRenderer` prima dei wiring; se serve,
  estrarre anche Path/Cursor renderer.
- **Autoplay policy** → lazy-init del context al primo `play()` (gesto utente), `resume()`.

## Criteri di successo

- `npm test` verde (151 + nuovi), coverage 100% righe nello scope, `tsc`/eslint puliti, build ok.
- `a11y-gate` sugli overlay: nessun gate `1`.
- Verifica runtime (Playwright): suono al fuoco, linea di preview, swap, pulsazione urgenza,
  reduced-motion attenua, tab-hide mette in pausa.
