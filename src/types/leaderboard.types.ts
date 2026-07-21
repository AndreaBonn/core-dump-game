export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unavailable';

export interface ScoreEntry {
  id: string;
  userId: string;
  displayName: string;
  score: number;
  levelReached: number;
  timestampMs: number;
}

export interface NewScore {
  displayName: string;
  score: number;
  levelReached: number;
}
