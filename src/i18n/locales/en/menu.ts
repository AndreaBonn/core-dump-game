export const menu = {
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
