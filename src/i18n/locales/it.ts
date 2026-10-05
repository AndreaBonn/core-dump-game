import { en, type Messages } from '@/i18n/locales/en';

/** Italian dictionary. Terminal jargon reuses the English value on purpose. */
export const it: Messages = {
  common: {
    back: 'Indietro',
    menu: 'Menu',
    nicknamePlaceholder: en.common.nicknamePlaceholder,
    multiplier: en.common.multiplier,
  },
  app: {
    name: en.app.name,
    tagline: 'compila i pacchetti prima che la catena arrivi a /dev/null',
  },
  menu: {
    playCampaign: 'Gioca la campagna',
    selectLevel: 'Scegli livello',
    endless: 'Infinita',
    daily: 'Sfida del giorno',
    leaderboard: 'Classifica',
    profile: 'Profilo',
    achievements: 'Obiettivi',
    tutorial: 'Tutorial',
    settings: 'Impostazioni',
  },
  settings: {
    title: 'Impostazioni',
    audio: 'Audio',
    audioHint: 'Effetti sonori',
    mute: 'Disattiva',
    unmute: 'Attiva',
    nickname: 'Nickname',
    privacy: 'Privacy e i tuoi dati',
  },
  language: {
    label: 'Lingua',
    it: en.language.it,
    en: en.language.en,
  },
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
  privacy: {
    title: 'Privacy',
    onDeviceTitle: 'su questo dispositivo',
    onDeviceBody:
      'Progressi, stelle, statistiche, obiettivi, nickname, impostazioni audio e lingua sono salvati in questo browser e non lo lasciano mai. Cancellando i dati del browser li rimuovi.',
    onLeaderboardTitle: 'in classifica',
    onLeaderboardBody:
      "Se salvi un punteggio vengono inviate tre cose: il nickname che scrivi, il punteggio e il livello raggiunto, più l'ora del salvataggio e un id anonimo creato per questo browser. Niente email, niente nome, niente account.",
    onLeaderboardWarning:
      'Il nickname è visibile a chiunque apra la classifica. Non usare il tuo nome reale.',
    retentionTitle: 'per quanto tempo',
    retentionBody:
      'Un punteggio salvato resta finché non lo cancelli. Si tiene solo il tuo record per ogni modalità: un nuovo record sostituisce il precedente.',
    deletingTitle: 'come cancellarli',
    deletingBody: 'Puoi rimuovere tutto, in qualsiasi momento, senza chiedere a nessuno.',
    deleteOnline: 'Cancella i miei punteggi online',
    deleteOnlineConfirm: 'Cancellare i tuoi punteggi da tutte le classifiche?',
    eraseDevice: 'Cancella questo dispositivo',
    eraseDeviceConfirm:
      'Cancellare progressi, stelle, obiettivi, nickname e impostazioni su questo dispositivo?',
    eraseWorking: 'Cancellazione in corso...',
    eraseDone: 'I tuoi punteggi sono stati cancellati dalla classifica.',
    eraseError: 'Cancellazione non riuscita: controlla la connessione e riprova.',
    eraseUnavailable:
      'Questa versione non ha una classifica online, quindi online non è salvato nulla.',
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
  game: {
    canvasLabel:
      'Campo di gioco di Core Dump. Mira con il puntatore, fai clic o premi spazio per sparare, clic destro o S per scambiare il pacchetto pronto.',
    score: 'punti',
    level: 'livello',
    next: 'prossimo',
    pause: 'Pausa',
    paused: 'IN PAUSA',
    resume: 'Riprendi',
    restartLevel: 'Ricomincia il livello',
    quitToMenu: 'Esci al menu',
    levelCleared: 'LIVELLO SUPERATO',
    levelScore: 'punti del livello',
    clearBonus: 'bonus completamento',
    total: 'totale',
    continue: 'Continua',
    won: en.game.won,
    lost: en.game.lost,
    finalScore: 'punteggio finale',
    levelReached: 'livello raggiunto',
    nickname: 'nickname',
    saveScore: 'Salva il punteggio',
    retry: 'Riprova',
    saving: 'Salvataggio...',
    saved: 'Punteggio salvato in classifica.',
    notABest: 'Il tuo record salvato per questa modalità è ancora più alto.',
    saveError: 'Punteggio non salvato: controlla la connessione.',
    saveUnavailable: 'La classifica non è configurata.',
    notScored: 'Le partite del tutorial non hanno punteggio.',
  },
  combo: { ...en.combo },
  powerUps: { ...en.powerUps },
  tutorial: {
    label: 'Tutorial',
    step: 'passo {{current}} di {{total}}',
    gotIt: 'Capito',
    skip: 'Salta il tutorial',
    aimTitle: 'mira e spara',
    aimBody:
      'Muovi il puntatore per orientare il cursore della CPU. Fai clic, o premi Spazio, per sparare il pacchetto che tiene. Sul telefono tocca il punto dove vuoi sparare.',
    matchTitle: 'fai tris',
    matchBody:
      'Allinea tre pacchetti dello stesso tipo e spariscono. La linea tratteggiata mostra dove finirà il colpo.',
    swapTitle: 'scambia la coda',
    swapBody:
      "L'HUD mostra il prossimo pacchetto. Clic destro, o S, per scambiarlo con quello che hai in mano.",
    holdTitle: 'tieni la linea',
    holdBody:
      'La catena scorre verso /dev/null al centro. Eliminala prima che ci arrivi. Ripulire un livello intero tutto di fila vale un bonus.',
  },
  update: {
    message: 'È pronta una nuova versione di Core Dump. Aggiornare riavvia il gioco.',
    now: 'Aggiorna ora',
    later: 'Più tardi',
  },
  error: {
    title: 'Qualcosa è andato storto',
    body: 'Il gioco ha incontrato un errore imprevisto e si è fermato. Ricaricando parte una nuova sessione; impostazioni e punteggi salvati non vengono toccati.',
    reload: 'Ricarica il gioco',
  },
};
