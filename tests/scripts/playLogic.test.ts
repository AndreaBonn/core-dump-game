import { describe, expect, it } from 'vitest';
import {
  buildUnsupportedNodeMessage,
  isNodeSupported,
  parseNodeMajor,
  parseRequiredMajor,
  planSteps,
  resolveInstallCommand,
} from '../../scripts/lib/playLogic.mjs';

describe('parseNodeMajor', () => {
  it('reads the major from the version Node reports', () => {
    expect(parseNodeMajor('v24.12.0')).toBe(24);
  });

  it('reads the major when the v prefix is absent', () => {
    expect(parseNodeMajor('20.0.0')).toBe(20);
  });

  it('returns null for an empty string', () => {
    expect(parseNodeMajor('')).toBeNull();
  });

  it('returns null when there is no number to read', () => {
    expect(parseNodeMajor('garbage')).toBeNull();
  });
});

describe('parseRequiredMajor', () => {
  it('reads the major from a simple lower bound', () => {
    expect(parseRequiredMajor('>=20')).toBe(20);
  });

  it('reads the major from a full lower bound', () => {
    expect(parseRequiredMajor('>=20.0.0')).toBe(20);
  });

  it('reads the lowest major from a union range', () => {
    expect(parseRequiredMajor('^20 || ^22')).toBe(20);
  });

  it('returns null when the field is missing', () => {
    expect(parseRequiredMajor(undefined)).toBeNull();
  });
});

describe('isNodeSupported', () => {
  it('accepts a version above the requirement', () => {
    expect(isNodeSupported(24, 20)).toBe(true);
  });

  it('accepts the exact requirement', () => {
    expect(isNodeSupported(20, 20)).toBe(true);
  });

  it('rejects a version below the requirement', () => {
    expect(isNodeSupported(18, 20)).toBe(false);
  });

  // An unreadable requirement must not lock the player out: npm enforces
  // engines at install time anyway, so the launcher only blocks what it can
  // actually prove is too old.
  it('accepts any version when the requirement is unknown', () => {
    expect(isNodeSupported(18, null)).toBe(true);
  });

  it('accepts an unreadable current version', () => {
    expect(isNodeSupported(null, 20)).toBe(true);
  });
});

describe('buildUnsupportedNodeMessage', () => {
  it('names the version found, the one required and where to get it', () => {
    const message = buildUnsupportedNodeMessage({ current: 18, required: 20 });

    expect(message).toContain('18');
    expect(message).toContain('20');
    expect(message).toContain('https://nodejs.org');
  });
});

describe('planSteps', () => {
  it('installs and builds on a fresh clone', () => {
    expect(planSteps({ hasNodeModules: false, hasDist: false, forceRebuild: false })).toEqual({
      install: true,
      build: true,
    });
  });

  it('only builds when the dependencies are already there', () => {
    expect(planSteps({ hasNodeModules: true, hasDist: false, forceRebuild: false })).toEqual({
      install: false,
      build: true,
    });
  });

  it('only installs when a build is already there', () => {
    expect(planSteps({ hasNodeModules: false, hasDist: true, forceRebuild: false })).toEqual({
      install: true,
      build: false,
    });
  });

  it('skips both when everything is in place', () => {
    expect(planSteps({ hasNodeModules: true, hasDist: true, forceRebuild: false })).toEqual({
      install: false,
      build: false,
    });
  });

  it('builds anyway when a rebuild is forced', () => {
    expect(planSteps({ hasNodeModules: true, hasDist: true, forceRebuild: true })).toEqual({
      install: false,
      build: true,
    });
  });
});

describe('resolveInstallCommand', () => {
  it('uses the lockfile when there is one', () => {
    expect(resolveInstallCommand({ hasLockfile: true, platform: 'linux' })).toEqual({
      command: 'npm',
      args: ['ci'],
      shell: false,
    });
  });

  it('falls back to a plain install without a lockfile', () => {
    expect(resolveInstallCommand({ hasLockfile: false, platform: 'linux' })).toEqual({
      command: 'npm',
      args: ['install'],
      shell: false,
    });
  });

  // npm is a .cmd shim on Windows, and since the fix for CVE-2024-27980 Node
  // refuses to spawn one without a shell.
  it('asks for a shell on Windows', () => {
    expect(resolveInstallCommand({ hasLockfile: true, platform: 'win32' })).toEqual({
      command: 'npm',
      args: ['ci'],
      shell: true,
    });
  });
});
