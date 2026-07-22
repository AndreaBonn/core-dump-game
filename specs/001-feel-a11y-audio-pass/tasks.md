# Tasks — 001-feel-a11y-audio-pass

Formato: id | dipendenze | requisito tracciato

- T1 | — | (audio) soundSpecs.ts + test
- T2 | T1 | (audio) renderSpec.ts + test con context mock
- T3 | T2 | (audio) AudioManager rewrite (factory DI, lazy-init, resume, mute, play) + test
- T4 | T3 | (audio) factory reale nel singleton + sblocco context al primo gesto
- T5 | — | (refactor) estrai FxRenderer da RenderSystem + coverage.exclude
- T6 | — | (preview) trajectory.ts predictLanding puro + test
- T7 | T5,T6 | (preview) RenderScene.trajectory + GameEngine.drawFrame calcola + RenderSystem disegna
- T8 | — | (swap) CpuCursor.swap() + test
- T9 | T8 | (swap) InputSystem.onSwap su button 2 + test
- T10 | T9 | (swap) GameEngine.swap wiring + tasto KeyS + test
- T11 | — | (urgenza) urgency.ts frontUrgency puro + test
- T12 | T5,T11 | (urgenza) RenderScene.urgency + GameEngine popola + RenderSystem pulsa/desatura testa
- T13 | — | (reduced-motion) VisualFx.setReducedMotion + GameEngine.setReducedMotion + test
- T14 | T13 | (reduced-motion) GameCanvas matchMedia + listener + aria-label canvas
- T15 | — | (pausa) GameScreen visibilitychange -> pausa se playing, no auto-resume
- T16 | — | (a11y) Modal focus-trap + Escape + focus init/restore; PauseOverlay onClose
- T17 | T16 | (a11y) a11y-gate sugli overlay + fix finding (contrasto muted, ecc.)

Commit atomici: G1=T1-4, G2=T5, G3=T6-7, G4=T8-10, G5=T11-12, G6=T13-17.
