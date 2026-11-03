// Test runner stdout is piped. Bind the child to its actual ConPTY console,
// as happens when npm start is launched from an interactive terminal.
const fs=require('node:fs');
const tty=require('node:tty');
Object.defineProperty(process,'stdin',{value:new tty.ReadStream(fs.openSync('\\\\.\\CONIN$','r+'))});
Object.defineProperty(process,'stdout',{value:new tty.WriteStream(fs.openSync('\\\\.\\CONOUT$','w+'))});
Object.defineProperty(process,'stderr',{value:process.stdout});
process.stdout.unref();
// Mirror Node's standard stdin pause hook for this custom console stream.
process.stdin.on('pause',()=>process.nextTick(()=>{
  const input=process.stdin;
  if(input._handle?.reading&&!input.readableFlowing){input._readableState.reading=false;input._handle.reading=false;input._handle.readStop();}
}));
require('../bin/cli.js');
