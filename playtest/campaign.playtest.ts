import { expect, it } from 'vitest';
import { LEVELS } from '@/config/levels';
import { runLevel, type PlaytestResult } from './runLevel';

const FIRST_LEVEL = 1;
const SECONDS_DECIMALS = 2;
const CAMPAIGN_TEST_TIMEOUT_MS = 120_000;
const TABLE_COLUMNS = [
  'Level',
  'Chapter',
  'Boss',
  'Outcome(casual)',
  'Seconds(casual)',
  'Shots(casual)',
  'Score(casual)',
  'Stars(casual)',
  'Outcome(skilled)',
  'Seconds(skilled)',
  'Shots(skilled)',
  'Score(skilled)',
  'Stars(skilled)',
];

interface CampaignRow {
  readonly casual: PlaytestResult;
  readonly skilled: PlaytestResult;
}

function formatCells(cells: readonly (string | number)[]): string {
  return `| ${cells.join(' | ')} |`;
}

function resultCells(result: PlaytestResult): (string | number)[] {
  return [
    result.outcome,
    result.seconds.toFixed(SECONDS_DECIMALS),
    result.shots,
    result.score,
    result.stars,
  ];
}

function formatCampaignTable(rows: readonly CampaignRow[]): string {
  const header = formatCells(TABLE_COLUMNS);
  const separator = formatCells(TABLE_COLUMNS.map(() => '---'));
  const body = rows.map(({ casual, skilled }) =>
    formatCells([
      skilled.level,
      skilled.chapter ?? '-',
      skilled.isBoss ? 'sì' : 'no',
      ...resultCells(casual),
      ...resultCells(skilled),
    ]),
  );
  return [header, separator, ...body].join('\n');
}

function groupChapters(rows: readonly CampaignRow[]): CampaignRow[][] {
  const chapters = [...new Set(rows.map(({ skilled }) => skilled.chapter))];
  return chapters.map((chapter) => rows.filter(({ skilled }) => skilled.chapter === chapter));
}

function formatChapter(rows: readonly CampaignRow[]): string {
  const cleared = rows.filter(({ skilled }) => skilled.outcome === 'cleared');
  const casualCleared = rows.filter(({ casual }) => casual.outcome === 'cleared').length;
  const seconds = cleared.reduce((total, { skilled }) => total + skilled.seconds, 0);
  const mean =
    cleared.length > 0 ? `${(seconds / cleared.length).toFixed(SECONDS_DECIMALS)} s` : 'n/d';
  return `Capitolo ${rows[0]!.skilled.chapter ?? '-'}: casual ${casualCleared}/${rows.length}, skilled ${cleared.length}/${rows.length} superati; tempo medio skilled ${mean}.`;
}

function compareChapterBoss(rows: readonly CampaignRow[]): string[] {
  const boss = rows.find(({ skilled }) => skilled.isBoss)?.skilled;
  if (!boss || boss.outcome !== 'cleared') return [];
  return rows.flatMap(({ skilled }) => {
    if (skilled.isBoss) return [];
    const reasons = [];
    if (skilled.seconds > boss.seconds) reasons.push('tempo');
    if (skilled.shots > boss.shots) reasons.push('colpi');
    return reasons.length > 0
      ? [`livello ${skilled.level}: ${reasons.join(' e ')} superiori al boss ${boss.level}`]
      : [];
  });
}

function comparePreviousBoss(chapters: readonly CampaignRow[][], index: number): string[] {
  const first = chapters[index]?.[0]?.skilled;
  const previousBoss = chapters[index - 1]?.find(({ skilled }) => skilled.isBoss)?.skilled;
  if (first?.outcome !== 'cleared' || previousBoss?.outcome !== 'cleared') return [];
  return first.seconds > previousBoss.seconds
    ? [`livello ${first.level}: tempo superiore al boss precedente ${previousBoss.level}`]
    : [];
}

function reportCampaign(rows: readonly CampaignRow[]): void {
  const chapters = groupChapters(rows);
  const failures = rows
    .filter(({ skilled }) => skilled.outcome !== 'cleared')
    .map(({ skilled }) => `livello ${skilled.level}: skilled ${skilled.outcome}`);
  const anomalies = [
    ...failures,
    ...chapters.flatMap(compareChapterBoss),
    ...chapters.flatMap((_, index) => comparePreviousBoss(chapters, index)),
  ];
  console.log(
    'Proxy automatico deterministico del playtest umano; non sostituisce una prova umana.',
  );
  console.log(formatCampaignTable(rows));
  console.log(chapters.map(formatChapter).join('\n'));
  console.log(`ANOMALIE: ${anomalies.length > 0 ? anomalies.join('; ') : 'nessuna'}`);
}

it(
  'runLevel_campaign_skilledBotClearsTheFirstLevel',
  (): void => {
    const rows = LEVELS.map((config) => ({
      casual: runLevel(config, 'casual'),
      skilled: runLevel(config, 'skilled'),
    }));

    reportCampaign(rows);
    // The rest of the table is data for a design call, not a pass mark: how many
    // levels a one-move-ahead bot clears says as much about the bot as the curve.
    const first = rows.find(({ skilled }) => skilled.level === FIRST_LEVEL);

    expect(first?.skilled.outcome).toBe('cleared');
  },
  CAMPAIGN_TEST_TIMEOUT_MS,
);
