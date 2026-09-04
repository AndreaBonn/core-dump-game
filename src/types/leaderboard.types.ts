export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'notABest'
  | 'error'
  | 'unavailable'
  | 'notScored';

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
