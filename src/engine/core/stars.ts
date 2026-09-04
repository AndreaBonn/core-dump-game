/** How many stars a level was cleared with. */
export type Stars = 0 | 1 | 2 | 3;

/** The three score marks that earn one, two and three stars, ascending. */
export type StarThresholds = readonly [number, number, number];

/**
 * Stars earned by scoring `levelScore` in a level. The score of the level
 * alone, not the run total: a long run must not turn its last level into
 * three stars for free.
 */
export function starsFor(levelScore: number, thresholds: StarThresholds): Stars {
  if (!Number.isFinite(levelScore)) {
    return 0;
  }
  let earned = 0;
  for (const threshold of thresholds) {
    if (levelScore >= threshold) {
      earned += 1;
    }
  }
  return earned as Stars;
}
