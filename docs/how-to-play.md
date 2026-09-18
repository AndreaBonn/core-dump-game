**English** | [Italiano](./how-to-play.it.md)

# How to play Core Dump

Everything needed to start the game and play it well: starting it from scratch, the rules, the controls, and what each power-up does. No development knowledge assumed.

Back to the [README](../README.md).

## Contents

- [Starting the game](#starting-the-game)
- [When the launcher does not start](#when-the-launcher-does-not-start)
- [Installing it as an app](#installing-it-as-an-app)
- [The board](#the-board)
- [The rules](#the-rules)
- [Controls](#controls)
- [Packet types](#packet-types)
- [Combos](#combos)
- [Power-ups](#power-ups)
- [Hazard packets](#hazard-packets)
- [Scoring and stars](#scoring-and-stars)
- [Game modes](#game-modes)
- [Achievements](#achievements)
- [The leaderboard](#the-leaderboard)
- [Settings and your data](#settings-and-your-data)

## Starting the game

You need Node.js, which is what runs the local web server the game is served from. You do not need to know how to use it.

**Prerequisites: a computer running Windows, macOS, or Linux, and about 400 MB of free disk space.**

1. Install Node.js 20 or newer from <https://nodejs.org>. Take the version marked LTS. Accept the defaults in the installer.
   You should see: the installer finishing without errors.
   If you already have Node.js, skip this step.

2. Download the game. In a terminal:

   ```bash
   git clone https://github.com/AndreaBonn/core-dump-game.git
   ```

   You should see: a `core-dump-game` folder in the directory you ran the command from.
   If you get `git: command not found`, install Git from <https://git-scm.com> and run the command again. Downloading the ZIP from GitHub also works, but on macOS it costs you an extra permission step later.

3. Open the folder that was created:

   ```bash
   cd core-dump-game
   ```

4. Start the game. The command depends on your system:
   - Windows: double-click `play.cmd` in the folder
   - macOS: double-click `play.command` in the folder
   - Linux: run `./play.sh` from the terminal (a double-click usually will not run it)

   You should see: a terminal window with progress messages, then the browser opening on the game.
   The first run installs dependencies and builds the game. It takes a few minutes and happens once.

5. Play. Later runs skip the build and open the browser straight away.

After updating the game with `git pull`, start it once with the `--rebuild` flag so the new version is built:

```bash
./play.sh --rebuild
```

## When the launcher does not start

| What you see                                                 | What it means                                                    | What to do                                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `Node.js is not installed, and the game needs it to run.`    | Node.js is missing, or not on your PATH                          | Install it from <https://nodejs.org>, close the terminal, start the launcher again  |
| `This game needs Node.js 20 or newer, and found version 16.` | Node.js is too old                                               | Install a current version from the same address                                     |
| macOS refuses to open `play.command`                         | The file came from a ZIP and macOS quarantined it                | Allow it under System Settings, Privacy and Security. Using `git clone` avoids this |
| Nothing happens on a Linux double-click                      | Most desktops do not run scripts on double-click                 | Run `./play.sh` from a terminal                                                     |
| A blank page in the browser                                  | The game was opened from the file manager, not from the launcher | Close the tab and use the launcher. Browsers block module scripts on `file://`      |

## Installing it as an app

The game is a PWA, so the browser can install it like a native application: it gets its own window, works offline, and keeps your progress.

1. Start the game with the launcher.
2. In Chrome or Edge, click the install icon in the address bar. On Safari, use Share, then Add to Dock. On Android, use the browser menu, then Install app.
3. You should see: Core Dump in your applications list, opening in its own window.

When a new version is available the game asks before updating, instead of reloading the board mid-run.

## The board

![The board during a run: HUD at the top, the chain on the track, the CPU cursor and the void at the centre](./assets/gameplay-desktop.png)

- **The track** is the dotted spiral. Packets travel along it toward the centre.
- **The void** is the black circle at the centre, ringed in red. When the front of the chain reaches it, the run ends.
- **The CPU cursor** is the square next to the void, holding the packet you are about to fire.
- **The HUD** shows, top left, the current score, and top right the level, the packet coming next, and the pause button.

## The rules

1. A chain of data packets advances along the track toward the void.
2. You fire packets into the chain from the CPU cursor. A fired packet inserts itself where it lands.
3. Three or more packets of the same type in a row explode and are removed. Everything behind them slides forward to close the gap.
4. If that sliding lines up another three of a kind, they explode too. That is a combo, and it scores a multiplier.
5. Clear the whole chain to finish the level. Let it reach the void and the run is over.

The dotted line drawn from the cursor is the trajectory preview: it shows where your shot ends up before you take it.

## Controls

| Action                                 | Desktop                       | Touch                       |
| -------------------------------------- | ----------------------------- | --------------------------- |
| Aim                                    | Move the mouse                | Tap where you want to shoot |
| Fire                                   | Left click, or `Space`        | The same tap aims and fires |
| Swap the held packet with the next one | Right click, or `S`           | Not available               |
| Pause                                  | The `PAUSE` button, top right | The same button             |

Swapping is the control most people miss. The HUD shows the packet coming next; when the one you are holding is useless, swap instead of firing it into the chain.

## Packet types

Packets are named after log levels. A level uses only the first few types, and later levels add more, which is what makes them harder.

| Type      | Label | Colour |
| --------- | ----- | ------ |
| `ERROR`   | E     | red    |
| `SUCCESS` | S     | green  |
| `INFO`    | I     | cyan   |
| `WARNING` | W     | yellow |
| `DEBUG`   | D     | purple |
| `TRACE`   | T     | orange |
| `FATAL`   | F     | pink   |

## Combos

Explosions that chain from a single shot score a multiplier and show a label on screen:

| Explosions from one shot | Label             | Multiplier |
| ------------------------ | ----------------- | ---------- |
| 2                        | `SEGFAULT!`       | x2         |
| 3                        | `STACK OVERFLOW!` | x3         |
| 4 or more                | `KERNEL PANIC!!`  | x4 and up  |

The game briefly freezes on a chained explosion, longer as the combo grows. That pause is deliberate: it is what makes a big cascade readable.

## Power-ups

Some packets carry a power-up, marked with a glyph. They trigger when the packet is part of a match, not when you fire it. Around one packet in twenty is a power-up.

| Power-up          | Glyph | What it does                                                                                           |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `sleep()`         | z     | Slows the chain to about a third of its speed for 5 seconds                                            |
| `fork()`          | Y     | The next shot fires three packets in a spread                                                          |
| `garbage collect` | #     | Removes every packet of one type, picked at random from the types in the chain                         |
| `rollback()`      | <     | Pushes the chain back along the track                                                                  |
| `kill -9`         | K     | Destroys the five packets closest to the void                                                          |
| `try/catch`       | T     | Shields the run: the next time the chain reaches the void, it is pushed back instead of ending the run |
| `regex`           | *     | Removes every packet of the type the chain holds most of                                               |

## Hazard packets

From level 4 onward the chain includes packets that cannot be matched. They never form a run and never extend one, so they split the chain into segments you have to clear around. Their density grows with the level and stops at roughly one packet in eight, which keeps a level from becoming unwinnable.

## Scoring and stars

- A match of exactly three packets scores 30 points. Each extra packet in the same explosion adds 15.
- Each further explosion in the same shot multiplies that by its position in the chain of explosions.
- Clearing a level without letting a packet reach the void adds a 500 point bonus.

Every campaign level has three score thresholds worth one, two, and three stars. Stars are awarded on the score of that level alone, so a long run cannot turn its last level into three stars for free. Replaying a level can only improve its rating.

## Game modes

| Mode                | How it works                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Campaign**        | 10 levels. Clearing one unlocks the next. Each is rated one to three stars                                                                            |
| **Endless**         | Levels keep coming with no final one. The run ends when the chain reaches the void                                                                    |
| **Daily challenge** | The layout is derived from the calendar date: everyone playing on the same day gets the same run, and a given date always produces the same one       |
| **Tutorial**        | Four steps: aim and fire, match three, swap the queue, hold the line. It runs automatically the first time you play, and stays in the menu afterwards |

![The tutorial overlay on the first run](./assets/tutorial.png)

## Achievements

There are 18, unlocked by playing rather than by grinding a single number. They cover first steps (`hello, world`, `first commit`), combos (`SEGFAULT`, `stack overflow`, `kernel panic`), power-ups (`sudo`, `garbage collector`), campaign progress (`halfway through the stack`, `root access`), stars (`clean build`, `code quality`, `fully optimised`), volume of play (`uptime`, `daemon`), endless depth (`memory leak`, `no OOM killer`), the daily challenge (`cron job`), and score (`five figures`).

The Achievements screen shows which ones you hold and what each of the others asks for.

![The achievements screen](./assets/achievements.png)

## The leaderboard

The online leaderboard is optional and needs a configured Firebase project. Without one, the menu entry stays visible and reports that the feature is unavailable; nothing else changes.

When it is configured:

- You are signed in anonymously. There is no account to create, no password, no email.
- Saving a score sends the nickname you type, the score, the level reached, and the anonymous account id. Nothing else.
- Each player holds one row per mode, and it only ever moves up: a new score is stored only if it beats the one already there.
- Nicknames are capped at 24 characters.

## Settings and your data

Progress, stars, statistics, and settings are stored in your browser and never leave the device. Settings holds the nickname used on the leaderboard and the sound toggle.

Under Settings, Privacy and your data, you can erase everything: the local profile, and the leaderboard row if you saved one. The game returns to a first-run state.

![The main menu](./assets/main-menu.png)

## On a phone

The board fits a portrait screen: the square play area is scaled to the width instead of the full landscape board, so the game fills the screen rather than sitting in a strip. Tap to aim and fire in one gesture. Swapping the held packet is not available on touch.

![The game on a portrait phone viewport](./assets/gameplay-mobile.png)
