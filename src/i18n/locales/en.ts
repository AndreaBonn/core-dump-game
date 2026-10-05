/**
 * English dictionary. Its shape is the contract: `it.ts` is typed against it,
 * so a key missing from either language fails the typecheck.
 *
 * Terminal jargon (product name, achievement names, power-up names, combo
 * shouts, end-of-run titles) has the same value in both dictionaries: it is
 * part of the game's voice, not prose to translate.
 */
export const en = {
  common: {
    back: 'Back',
    menu: 'Menu',
    nicknamePlaceholder: 'anon',
    multiplier: 'x{{value}}',
  },
  app: {
    name: 'Core Dump',
    tagline: 'compile the packets before the chain hits /dev/null',
  },
  menu: {
    playCampaign: 'Play Campaign',
    selectLevel: 'Select Level',
    endless: 'Endless',
    daily: 'Daily Challenge',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    achievements: 'Achievements',
    tutorial: 'Tutorial',
    settings: 'Settings',
  },
  settings: {
    title: 'Settings',
    audio: 'Audio',
    audioHint: 'Sound effects',
    mute: 'Mute',
    unmute: 'Unmute',
    nickname: 'Nickname',
    privacy: 'Privacy and your data',
  },
  language: {
    label: 'Language',
    it: 'Italiano',
    en: 'English',
  },
  profile: {
    title: 'Profile',
    runsPlayed: 'runs played',
    campaignsCompleted: 'campaigns completed',
    levelsCleared: 'levels cleared',
    stars: 'stars',
    bestCombo: 'best combo',
    powerUpsTriggered: 'power-ups triggered',
    bestCampaign: 'best campaign',
    bestEndless: 'best endless',
    bestDaily: 'best daily',
    deepestEndless: 'deepest endless level',
    erase: 'Erase local progress',
    eraseConfirm: 'Erase your progress, stars and achievements on this device?',
    emptyTitle: 'No runs recorded yet',
    emptyBody:
      'Statistics appear here once you have played. Nothing is uploaded: this profile stays on this device.',
    playFirst: 'Play a first run',
  },
  privacy: {
    title: 'Privacy',
    onDeviceTitle: 'on this device',
    onDeviceBody:
      'Your progress, stars, statistics, achievements, nickname, sound and language settings are stored in this browser and never leave it. Clearing your browser data removes them.',
    onLeaderboardTitle: 'on the leaderboard',
    onLeaderboardBody:
      'If you save a score, three things are sent: the nickname you type, the score and the level you reached, plus the time of the save and an anonymous account id created for this browser. No email, no name, no account.',
    onLeaderboardWarning:
      'The nickname is shown publicly to everyone who opens the leaderboard. Do not use your real name.',
    retentionTitle: 'how long it is kept',
    retentionBody:
      'A saved score stays until you delete it. Only your best score per mode is kept: a new personal best replaces the previous one.',
    deletingTitle: 'deleting it',
    deletingBody: 'You can remove everything, at any time, without asking anyone.',
    deleteOnline: 'Delete my online scores',
    deleteOnlineConfirm: 'Delete your scores from every leaderboard?',
    eraseDevice: 'Erase this device',
    eraseDeviceConfirm:
      'Erase your progress, stars, achievements, nickname and settings on this device?',
    eraseWorking: 'Deleting...',
    eraseDone: 'Your scores have been deleted from the leaderboard.',
    eraseError: 'Could not delete them - check your connection and try again.',
    eraseUnavailable: 'This build has no online leaderboard, so there is nothing stored online.',
  },
  leaderboard: {
    title: 'Leaderboard',
    modeGroup: 'Leaderboard mode',
    campaign: 'Campaign',
    endless: 'Endless',
    daily: 'Daily',
    loading: 'Loading scores...',
    error: 'Could not load the leaderboard.',
    unavailable: 'The online leaderboard is not configured in this build.',
    empty: 'No scores yet. Be the first.',
    yourBest: 'your best',
    disclaimer:
      "Scores are reported by each player's browser and are not verified. Treat the board as a friendly ranking, not a record book.",
    levelShort: 'lvl {{level}}',
  },
  levelSelect: {
    title: 'Campaign',
    hint: 'Clear a level to unlock the next one. Replaying can only improve its rating.',
    level: 'Level {{level}}',
    levelLocked: 'Level {{level}} [locked]',
    levelAria_one: 'Level {{level}}, {{count}} of 3 stars',
    levelAria_other: 'Level {{level}}, {{count}} of 3 stars',
    levelLockedAria: 'Level {{level}}, locked. Clear level {{previous}} first.',
  },
  achievements: {
    title: 'Achievements',
    unlocked: 'unlocked',
    locked: 'locked',
    toast: 'achievement unlocked',
    items: {
      'hello-world': { name: 'hello, world', description: 'Finish your first run.' },
      'first-commit': { name: 'first commit', description: 'Clear your first level.' },
      segfault: { name: 'SEGFAULT', description: 'Chain two explosions in one shot.' },
      'stack-overflow': {
        name: 'stack overflow',
        description: 'Chain three explosions in one shot.',
      },
      'kernel-panic': { name: 'kernel panic', description: 'Chain four explosions in one shot.' },
      sudo: { name: 'sudo', description: 'Trigger your first power-up.' },
      'garbage-collector': { name: 'garbage collector', description: 'Trigger 50 power-ups.' },
      halfway: {
        name: 'halfway through the stack',
        description: 'Reach level {{level}} of the campaign.',
      },
      'root-access': { name: 'root access', description: 'Complete the campaign.' },
      'three-stars': { name: 'clean build', description: 'Earn three stars on any level.' },
      'twenty-stars': { name: 'code quality', description: 'Collect 20 stars.' },
      'all-stars': {
        name: 'fully optimised',
        description: 'Earn three stars on every campaign level.',
      },
      uptime: { name: 'uptime', description: 'Play 10 runs.' },
      daemon: { name: 'daemon', description: 'Play 50 runs.' },
      'memory-leak': { name: 'memory leak', description: 'Reach level 15 in an endless run.' },
      'no-oom': { name: 'no OOM killer', description: 'Reach level 25 in an endless run.' },
      cron: { name: 'cron job', description: 'Play a daily challenge.' },
      'five-figures': {
        name: 'five figures',
        description: 'Score 10000 points in a single run.',
      },
    },
  },
  game: {
    canvasLabel:
      'Core Dump game board. Aim with the pointer, click or press space to fire, right-click or press S to swap the ready packet.',
    score: 'score',
    level: 'level',
    next: 'next',
    pause: 'Pause',
    paused: 'PAUSED',
    resume: 'Resume',
    restartLevel: 'Restart level',
    quitToMenu: 'Quit to menu',
    levelCleared: 'LEVEL CLEARED',
    levelScore: 'level score',
    clearBonus: 'clear bonus',
    total: 'total',
    continue: 'Continue',
    won: 'SYSTEM STABLE',
    lost: 'CORE DUMPED',
    finalScore: 'final score',
    levelReached: 'level reached',
    nickname: 'nickname',
    saveScore: 'Save score',
    retry: 'Retry',
    saving: 'Saving...',
    saved: 'Score saved to the leaderboard.',
    notABest: 'Your saved best for this mode is still higher.',
    saveError: 'Score not saved - check your connection.',
    saveUnavailable: 'Leaderboard is not configured.',
    notScored: 'Tutorial runs are not scored.',
  },
  combo: {
    segfault: 'SEGFAULT!',
    stackOverflow: 'STACK OVERFLOW!',
    kernelPanic: 'KERNEL PANIC!!',
  },
  powerUps: {
    SLEEP: 'sleep()',
    FORK: 'fork()',
    GARBAGE_COLLECT: 'garbage collect',
    ROLLBACK: 'rollback()',
    KILL_9: 'kill -9',
    TRY_CATCH: 'try/catch',
    REGEX: 'regex',
  },
  tutorial: {
    label: 'Tutorial',
    step: 'step {{current}} of {{total}}',
    gotIt: 'Got it',
    skip: 'Skip tutorial',
    aimTitle: 'aim and fire',
    aimBody:
      'Move the pointer to aim the CPU cursor. Click, or press Space, to fire the packet it is holding. On a phone, tap where you want to shoot.',
    matchTitle: 'match three',
    matchBody:
      'Land three packets of the same type in a row and they are cleared. The dotted line shows where your shot will end up.',
    swapTitle: 'swap the queue',
    swapBody:
      'The HUD shows the packet coming next. Right-click, or press S, to swap it with the one you are holding.',
    holdTitle: 'hold the line',
    holdBody:
      'The chain flows toward /dev/null at the centre. Clear it before it gets there. Clearing a whole level in one go is worth a bonus.',
  },
  update: {
    message: 'A new version of Core Dump is ready. Updating restarts the game.',
    now: 'Update now',
    later: 'Later',
  },
  error: {
    title: 'Something went wrong',
    body: 'The game hit an unexpected error and stopped. Reloading starts a fresh session; your settings and saved scores are not affected.',
    reload: 'Reload the game',
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Same keys as `en`, any string values: what every other language must provide. */
export type Messages = Widen<typeof en>;
