// One-command launcher for players: checks Node, installs and builds only when
// something is missing, then serves the built game and opens the browser. The
// decisions live in lib/playLogic.mjs; this file only performs them.
//
// Vite is invoked through process.execPath rather than `npm run`, because npm is
// a .cmd shim on Windows and the indirection buys nothing here. npm is spawned
// for the install alone, where it is genuinely needed.
//
// Kept parseable by old Node on purpose: someone on Node 16 must reach the
// "upgrade Node" message instead of a SyntaxError.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildUnsupportedNodeMessage,
  isNodeSupported,
  parseNodeMajor,
  parseRequiredMajor,
  planSteps,
  resolveInstallCommand,
} from './lib/playLogic.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VITE_BIN = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const REBUILD_FLAG = '--rebuild';

function say(line) {
  process.stdout.write(`${line}\n`);
}

function fail(line) {
  process.stderr.write(`${line}\n`);
  process.exit(1);
}

/**
 * Run a child with the terminal attached and stop the launcher if it fails.
 * A Ctrl+C is the player closing the game, not an error.
 */
function runOrExit(command, args, shell) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell });
  if (result.error) {
    fail(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.signal) {
    process.exit(0);
  }
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}

function readEnginesRange() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  return manifest.engines ? manifest.engines.node : undefined;
}

function checkNode() {
  const required = parseRequiredMajor(readEnginesRange());
  const current = parseNodeMajor(process.versions.node);
  if (!isNodeSupported(current, required)) {
    fail(buildUnsupportedNodeMessage({ current, required }));
  }
  if (required === null) {
    say('Note: package.json declares no readable engines.node, skipping the version check.');
  }
}

function prepare() {
  const steps = planSteps({
    hasNodeModules: existsSync(join(ROOT, 'node_modules')),
    hasDist: existsSync(join(ROOT, 'dist', 'index.html')),
    forceRebuild: process.argv.slice(2).includes(REBUILD_FLAG),
  });

  if (steps.install) {
    say('Installing dependencies. This happens once and takes a few minutes.');
    const install = resolveInstallCommand({
      hasLockfile: existsSync(join(ROOT, 'package-lock.json')),
      platform: process.platform,
    });
    runOrExit(install.command, install.args, install.shell);
  }

  if (!existsSync(VITE_BIN)) {
    fail('The dependencies look incomplete. Delete node_modules, then run this again.');
  }

  if (steps.build) {
    say('Building the game. This happens once and takes a few seconds.');
    runOrExit(process.execPath, [VITE_BIN, 'build'], false);
  } else {
    say(`Serving the existing build. After a git pull, run this with ${REBUILD_FLAG}.`);
  }
}

checkNode();
prepare();
say('Opening the game in your browser. Press Ctrl+C here to stop it.');
runOrExit(process.execPath, [VITE_BIN, 'preview', '--open'], false);
