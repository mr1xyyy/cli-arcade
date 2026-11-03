#!/usr/bin/env node
'use strict';
const {version}=require('../package.json');
const args=process.argv.slice(2);
if(args.includes('--help')||args.includes('-h')){
  console.log(`CLI Arcade ${version}

Usage: cliarcade [options]

Six games: tic-tac-toe, chess, minesweeper, checkers, snake, maze.
Local multiplayer, LAN multiplayer and bots are available.

Options:
  --plain        Use the text interface
  --ascii-icons  Use ASCII instead of pixel icons
  -h, --help     Show this help
  -v, --version  Show the version

Controls: mouse or arrows + Enter. Q/Esc: menu. Ctrl+C: quit.`);
}else if(args.includes('--version')||args.includes('-v'))console.log(version);
else require('../src/app.js').run();
