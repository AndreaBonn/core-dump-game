import { en, type Messages } from '@/i18n/locales/en';

export const menu: Pick<
  Messages,
  'common' | 'app' | 'menu' | 'settings' | 'language' | 'privacy' | 'update' | 'error'
> = {
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
