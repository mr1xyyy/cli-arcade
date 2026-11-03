const {test}=require('node:test');
const assert=require('node:assert/strict');
const terminal=require('../src/ui/terminal.js');
let ui;
let dimensions=[90,32];
class VirtualTerminal extends terminal.Terminal {
  constructor(input){super(input);ui=this;this.snapshot=[];}
  start(){} stop(){this.stopped=true;}
  begin(){this.hits=[];this.snapshot=[];[this.width,this.height]=dimensions;}
  text(x,y,text,fg,bg){this.snapshot.push({x,y,text:String(text),fg,bg});}
  end(){}
}
terminal.Terminal=VirtualTerminal;
const {run}=require('../src/ui/tui.js');
const key=name=>ui.onInput({type:'key',name,text:name});
const click=(x,y,button=0)=>ui.onInput({type:'mouse',x,y,button});
const has=text=>ui.snapshot.some(s=>s.text.includes(text));
test('full-screen flow: mouse menu, local game, mines flags and restart',async()=>{
  const done=run();assert.ok(has('O‘YINNI TANLANG'));
  // 90-column terminal has origin 14; first game card starts at 16,9.
  click(18,10);assert.ok(has('Qanday o‘ynaysiz'));key('2');
  // Tic-tac-toe board origin 20,8; cells 12 x 4.
  click(22,9);click(22,13);click(34,9);click(34,13);click(46,9);assert.ok(has('X yutdi'));
  key('r');assert.ok(has('X navbati'));key('q');key('3');
  const flagPixels=()=>ui.snapshot.filter(s=>s.x>=22&&s.x<26&&s.y>=8&&s.y<10&&(s.fg==='accent'||s.bg==='accent')).length;
  click(23,8,2);assert.ok(flagPixels()>0);click(23,8,2);assert.equal(flagPixels(),0);
  click(23,8);assert.ok(has('/71 OCHILDI'));key('q');key('q');await done;assert.ok(ui.stopped);
});
test('bot can play first and UI returns to menu cleanly',async()=>{
  const done=run();key('1');key('1');key('1');key('2');assert.ok(has('Bot o‘ylayapti'));
  await new Promise(r=>setTimeout(r,350));assert.ok(ui.snapshot.some(s=>(s.text==='▀'&&s.fg==='#69e7ef')||s.bg==='#075b70'));assert.ok(has('O navbati'));key('q');key('q');await done;
});
test('pixel chess renders without font icons and preserves selection when view changes',async()=>{
  const done=run();key('2');key('2');
  assert.ok(ui.snapshot.some(s=>s.text==='▀'));
  assert.ok(!ui.snapshot.some(s=>/[♔-♟]/u.test(s.text)));
  click(45,20);key('i');assert.ok(ui.snapshot.some(s=>s.text==='P'));
  click(45,16);assert.ok(has('Qora navbati'));key('i');key('q');key('q');await done;
});
test('80x24 compact terminal keeps every game and controls on screen',async()=>{
  dimensions=[80,24];const done=run();
  for(const choice of ['1','2','3','4','5','6']){
    key(choice);if(['1','2','4'].includes(choice))key('2');
    assert.ok(ui.snapshot.every(s=>s.y>=1&&s.y<=24));
    assert.ok(ui.hits.every(h=>h.y>=1&&h.y+h.h-1<=24));key('q');
  }
  key('q');await done;dimensions=[90,32];
});
