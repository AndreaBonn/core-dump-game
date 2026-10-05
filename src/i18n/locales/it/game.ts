import { en, type Messages } from '@/i18n/locales/en';

export const game: Pick<Messages, 'game' | 'combo' | 'powerUps' | 'tutorial'> = {
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
};
