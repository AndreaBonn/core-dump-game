import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/locales/en';
import { it as itMessages } from '@/i18n/locales/it';
import { ACHIEVEMENTS } from '@/engine/core/achievements';
import { POWER_UPS } from '@/config/powerUps';

type Tree = { readonly [key: string]: string | Tree };

/** Every leaf as `dotted.path -> value`, so two dictionaries compare as flat maps. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      leaves.set(path, value);
    } else {
      for (const [childPath, childValue] of flatten(value, path)) {
        leaves.set(childPath, childValue);
      }
    }
  }
  return leaves;
}

const enLeaves = flatten(en);
const itLeaves = flatten(itMessages);

/** Terminal jargon: part of the game's voice, identical in every language. */
const SHARED_JARGON = [
  'app.name',
  'common.nicknamePlaceholder',
  'common.multiplier',
  'language.it',
  'language.en',
  'game.won',
  'game.lost',
  ...ACHIEVEMENTS.map(({ id }) => `achievements.items.${id}.name`),
  ...Object.keys(POWER_UPS).map((type) => `powerUps.${type}`),
  'combo.segfault',
  'combo.stackOverflow',
  'combo.kernelPanic',
  // Job titles the Italian trade uses in English; only "intern" translates.
  ...['script-kiddie', 'junior-dev', 'sysadmin', 'devops', 'sre', 'kernel-hacker', 'root'].map(
    (id) => `profile.ranks.${id}`,
  ),
  // Same format in both languages: numbers and the XP unit.
  'profile.xpProgress',
  'profile.xpTotal',
];

describe('dictionaries', () => {
  it('define exactly the same keys in Italian and English', () => {
    expect([...itLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
  });

  it('leave no value empty', () => {
    const empty = [...enLeaves, ...itLeaves].filter(([, value]) => value.trim() === '');
    expect(empty).toEqual([]);
  });

  it('give terminal jargon the same value in both languages', () => {
    for (const path of SHARED_JARGON) {
      expect(enLeaves.has(path), path).toBe(true);
      expect(itLeaves.get(path), path).toBe(enLeaves.get(path));
    }
  });

  it('translate everything that is not jargon', () => {
    // The jargon check above passes trivially if both files were copies of
    // each other; this pins that the rest really is Italian.
    const shared = new Set(SHARED_JARGON);
    const untranslated = [...enLeaves]
      .filter(([path, value]) => !shared.has(path) && itLeaves.get(path) === value)
      .map(([path]) => path);
    // Words Italian borrows unchanged from English.
    expect(untranslated.sort()).toEqual(
      [
        'common.menu',
        'menu.tutorial',
        'privacy.title',
        'settings.audio',
        'settings.nickname',
        'game.nickname',
        'tutorial.label',
        'game.boss',
        'levelSelect.boss',
      ].sort(),
    );
  });

  it('cover a name and a description for every achievement', () => {
    const missing = ACHIEVEMENTS.flatMap(({ id }) =>
      ['name', 'description']
        .map((field) => `achievements.items.${id}.${field}`)
        .filter((path) => !enLeaves.has(path)),
    );
    expect(missing).toEqual([]);
    expect(Object.keys(en.achievements.items)).toHaveLength(ACHIEVEMENTS.length);
  });
});
