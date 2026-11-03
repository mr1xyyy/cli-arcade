'use strict';

async function run() {
  const interactive=process.stdin.isTTY&&process.stdout.isTTY&&!process.argv.includes('--plain');
  try {
    const ui=interactive?require('./ui/tui.js'):require('./ui/plain.js');
    await ui.run();
  } catch(error) {
    if(interactive){
      process.stdin.setRawMode(false);
      process.stdout.write('\x1b[?1006l\x1b[?1000l\x1b[?25h\x1b[?1049l');
    }
    console.error(error.message);
    process.exitCode=1;
  }
}

module.exports={run};
