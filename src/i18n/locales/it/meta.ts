import { en, type Messages } from '@/i18n/locales/en';

export const meta: Pick<Messages, 'profile' | 'leaderboard' | 'levelSelect' | 'achievements'> = {
  profile: {
    title: 'Profilo',
    runsPlayed: 'partite giocate',
    campaignsCompleted: 'campagne completate',
    levelsCleared: 'livelli superati',
    stars: 'stelle',
    bestCombo: 'combo migliore',
    powerUpsTriggered: 'power-up attivati',
    bestCampaign: 'record campagna',
    bestEndless: 'record infinita',
    bestDaily: 'record sfida del giorno',
    deepestEndless: 'livello massimo in infinita',
    erase: 'Cancella i progressi locali',
    eraseConfirm: 'Cancellare progressi, stelle e obiettivi su questo dispositivo?',
    emptyTitle: 'Nessuna partita registrata',
    emptyBody:
      'Le statistiche compaiono qui dopo la prima partita. Non viene caricato nulla: il profilo resta su questo dispositivo.',
    playFirst: 'Gioca la prima partita',
  },
  leaderboard: {
    title: 'Classifica',
    modeGroup: 'Modalità della classifica',
    campaign: 'Campagna',
    endless: 'Infinita',
    daily: 'Del giorno',
    loading: 'Caricamento punteggi...',
    error: 'Impossibile caricare la classifica.',
    unavailable: 'La classifica online non è configurata in questa versione.',
    empty: 'Ancora nessun punteggio. Sii il primo.',
    yourBest: 'il tuo record',
    disclaimer:
      'I punteggi sono inviati dal browser di ogni giocatore e non sono verificati. Prendi la classifica come una gara tra amici, non come un albo dei record.',
    levelShort: 'liv {{level}}',
  },
  levelSelect: {
    title: 'Campagna',
    hint: 'Supera un livello per sbloccare il successivo. Rigiocarlo può solo migliorarne il punteggio in stelle.',
    level: 'Livello {{level}}',
    levelLocked: 'Livello {{level}} [bloccato]',
    levelAria_one: 'Livello {{level}}, {{count}} stella su 3',
    levelAria_other: 'Livello {{level}}, {{count}} stelle su 3',
    levelLockedAria: 'Livello {{level}}, bloccato. Supera prima il livello {{previous}}.',
    bossAria_one: 'Livello {{level}}, boss, {{count}} stella su 3',
    bossAria_other: 'Livello {{level}}, boss, {{count}} stelle su 3',
    bossLockedAria: 'Livello {{level}}, boss, bloccato. Supera prima il livello {{previous}}.',
    boss: en.levelSelect.boss,
    chapterTitle: 'Capitolo {{chapter}} · {{mechanic}}',
    chapterStars: '{{earned}}/{{total}} stelle',
    mechanics: {
      base: 'Basi',
      hazard: 'Ostacoli',
      armor: 'Pacchetti corazzati',
      reversal: 'Inversione',
      waves: 'Ondate',
    },
  },
  achievements: {
    title: 'Obiettivi',
    unlocked: 'sbloccato',
    locked: 'bloccato',
    toast: 'obiettivo sbloccato',
    items: {
      'hello-world': {
        name: en.achievements.items['hello-world'].name,
        description: 'Finisci la tua prima partita.',
      },
      'first-commit': {
        name: en.achievements.items['first-commit'].name,
        description: 'Supera il tuo primo livello.',
      },
      segfault: {
        name: en.achievements.items.segfault.name,
        description: 'Concatena due esplosioni con un solo colpo.',
      },
      'stack-overflow': {
        name: en.achievements.items['stack-overflow'].name,
        description: 'Concatena tre esplosioni con un solo colpo.',
      },
      'kernel-panic': {
        name: en.achievements.items['kernel-panic'].name,
        description: 'Concatena quattro esplosioni con un solo colpo.',
      },
      sudo: {
        name: en.achievements.items.sudo.name,
        description: 'Attiva il tuo primo power-up.',
      },
      'garbage-collector': {
        name: en.achievements.items['garbage-collector'].name,
        description: 'Attiva 50 power-up.',
      },
      halfway: {
        name: en.achievements.items.halfway.name,
        description: 'Raggiungi il livello {{level}} della campagna.',
      },
      'root-access': {
        name: en.achievements.items['root-access'].name,
        description: 'Completa la campagna.',
      },
      'three-stars': {
        name: en.achievements.items['three-stars'].name,
        description: 'Ottieni tre stelle in un livello qualsiasi.',
      },
      'boss-down': {
        name: en.achievements.items['boss-down'].name,
        description: 'Termina il processo di un boss della campagna.',
      },
      'all-bosses': {
        name: en.achievements.items['all-bosses'].name,
        description: 'Termina i processi di tutti i boss della campagna.',
      },
      'twenty-stars': {
        name: en.achievements.items['twenty-stars'].name,
        description: 'Raccogli 20 stelle.',
      },
      'all-stars': {
        name: en.achievements.items['all-stars'].name,
        description: 'Ottieni tre stelle in ogni livello della campagna.',
      },
      uptime: {
        name: en.achievements.items.uptime.name,
        description: 'Gioca 10 partite.',
      },
      daemon: {
        name: en.achievements.items.daemon.name,
        description: 'Gioca 50 partite.',
      },
      'memory-leak': {
        name: en.achievements.items['memory-leak'].name,
        description: 'Raggiungi il livello 15 in una partita infinita.',
      },
      'no-oom': {
        name: en.achievements.items['no-oom'].name,
        description: 'Raggiungi il livello 25 in una partita infinita.',
      },
      cron: {
        name: en.achievements.items.cron.name,
        description: 'Gioca una sfida del giorno.',
      },
      'five-figures': {
        name: en.achievements.items['five-figures'].name,
        description: 'Fai 10000 punti in una sola partita.',
      },
    },
  },
};
