import { describe, expect, it } from 'vitest';
import { resolveSaveFilePath, SAVE_FILE_ENV } from '../../scripts/lib/saveFile.mjs';

const DEFAULT = '/repo/save/progress.json';

describe('resolveSaveFilePath', () => {
  it('uses the path the environment names, so a test run can keep off the player save', () => {
    expect(resolveSaveFilePath({ [SAVE_FILE_ENV]: '/tmp/e2e/progress.json' }, DEFAULT)).toBe(
      '/tmp/e2e/progress.json',
    );
  });

  it.each([{}, { [SAVE_FILE_ENV]: '' }, { [SAVE_FILE_ENV]: '   ' }])(
    'falls back to the player save when the variable is missing or blank (%o)',
    (env) => {
      expect(resolveSaveFilePath(env, DEFAULT)).toBe(DEFAULT);
    },
  );
});
