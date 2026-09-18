#!/bin/sh
# Starts the game. Identical to play.command, which is the same script under the
# name macOS needs for a double-click to open it in Terminal.
#
# The cd is load-bearing: Finder starts a .command with the working directory set
# to the home folder, so without it the script looks for the game where it isn't.
# The version number deliberately lives only in package.json; this wrapper checks
# that Node exists at all and leaves the rest to scripts/play.mjs.

cd "$(dirname "$0")" || exit 1

if ! command -v node > /dev/null 2>&1; then
  echo "Node.js is not installed, and the game needs it to run."
  echo "Get it from https://nodejs.org, then start this again."
  exit 1
fi

exec node scripts/play.mjs "$@"
