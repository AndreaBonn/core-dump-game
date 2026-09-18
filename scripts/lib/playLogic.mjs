// Every decision the launcher makes lives here, as pure functions with no I/O,
// so it can be tested without spawning a process or touching the filesystem.
// scripts/play.mjs is the shell that feeds it and acts on the answers.
//
// This file must parse on an old Node: a player running Node 16 has to reach
// the "upgrade Node" message rather than a SyntaxError. No top-level await, no
// class fields, no logical assignment operators.

const UNION_SEPARATOR = '||';
const FIRST_NUMBER = /\d+/;
const LEADING_VERSION = /^v?(\d+)/;
const DOWNLOAD_URL = 'https://nodejs.org';

/**
 * Read the major version from the string Node reports, with or without the
 * leading `v`.
 *
 * @param {string} versionString
 * @returns {number | null} null when no leading number can be read.
 */
export function parseNodeMajor(versionString) {
  const match = LEADING_VERSION.exec(String(versionString));
  return match ? Number(match[1]) : null;
}

/**
 * Read the lowest major accepted by an `engines.node` range. Deliberately not a
 * semver parser: the launcher runs before `npm install`, so it cannot depend on
 * one, and the only question it asks is "which major is the floor".
 *
 * @param {string | undefined} enginesRange
 * @returns {number | null} null when the field is missing or carries no number.
 */
export function parseRequiredMajor(enginesRange) {
  if (typeof enginesRange !== 'string') {
    return null;
  }
  const majors = enginesRange
    .split(UNION_SEPARATOR)
    .map((part) => FIRST_NUMBER.exec(part))
    .filter((match) => match !== null)
    .map((match) => Number(match[0]));

  return majors.length > 0 ? Math.min(...majors) : null;
}

/**
 * Decide whether the running Node is new enough. Blocks only what it can prove
 * is too old: an unreadable version or requirement lets the player through,
 * because npm checks `engines` at install time anyway and a launcher that
 * refuses to start on a parsing doubt is worse than one that defers.
 *
 * @param {number | null} current
 * @param {number | null} required
 * @returns {boolean}
 */
export function isNodeSupported(current, required) {
  if (current === null || required === null) {
    return true;
  }
  return current >= required;
}

/**
 * Compose the message shown when Node is too old. It names both versions so the
 * player can tell what to install, instead of being told only that something is
 * wrong.
 *
 * @param {{ current: number | null, required: number | null }} versions
 * @returns {string}
 */
export function buildUnsupportedNodeMessage(versions) {
  const found = versions.current === null ? 'unknown' : String(versions.current);
  const needed = versions.required === null ? 'unknown' : String(versions.required);

  return [
    `This game needs Node.js ${needed} or newer, and found version ${found}.`,
    `Install a current version from ${DOWNLOAD_URL}, then run this again.`,
  ].join('\n');
}

/**
 * Decide which preparation steps the launch needs. A missing `dist` is the only
 * automatic trigger for a build: staleness after a `git pull` is handled by the
 * player passing `--rebuild`, which keeps the warm start instant.
 *
 * @param {{ hasNodeModules: boolean, hasDist: boolean, forceRebuild: boolean }} state
 * @returns {{ install: boolean, build: boolean }}
 */
export function planSteps(state) {
  return {
    install: !state.hasNodeModules,
    build: !state.hasDist || state.forceRebuild,
  };
}

/**
 * Pick the install command. `npm ci` when a lockfile is present, so a first run
 * by a stranger cannot leave the working tree dirty by rewriting it.
 *
 * On Windows `npm` is a `.cmd` shim, and since the fix for CVE-2024-27980 Node
 * refuses to spawn one without a shell. The arguments are literals and the repo
 * path travels in `cwd`, which does not pass through the shell.
 *
 * @param {{ hasLockfile: boolean, platform: string }} environment
 * @returns {{ command: string, args: string[], shell: boolean }}
 */
export function resolveInstallCommand(environment) {
  return {
    command: 'npm',
    args: [environment.hasLockfile ? 'ci' : 'install'],
    shell: environment.platform === 'win32',
  };
}
