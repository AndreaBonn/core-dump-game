@echo off
rem Starts the game on Windows. The Unix twin of this file is play.sh.
rem
rem cd /d is load-bearing: a double-click can start the script with a working
rem directory that is not the repo, and then nothing below would be found.
rem Both error paths pause, because a console opened by a double-click closes
rem the moment the script ends and would take the message with it.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed, and the game needs it to run.
  echo Get it from https://nodejs.org, then start this again.
  pause
  exit /b 1
)

node scripts\play.mjs %*
if errorlevel 1 pause
