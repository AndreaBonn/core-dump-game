# Audio assets

Place short (< 1s) sound effect files here. The `AudioManager` loads them by
fixed name and fails silently when a file is missing, so the game stays playable
without them.

Expected files:

| File                 | Trigger                        |
| -------------------- | ------------------------------ |
| `shoot.mp3`          | Firing a packet                |
| `match.mp3`          | A match explodes               |
| `combo-2.mp3`        | Two-explosion combo (SEGFAULT) |
| `combo-3.mp3`        | Three-explosion combo          |
| `combo-4.mp3`        | Four-or-more explosion combo   |
| `powerup.mp3`        | A power-up activates           |
| `game-over.mp3`      | The chain reaches `/dev/null`  |
| `level-complete.mp3` | A level is cleared             |
