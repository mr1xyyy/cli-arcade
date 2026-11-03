const {test}=require('node:test');
const assert=require('node:assert/strict');
const {InputDecoder,Terminal}=require('../src/ui/terminal.js');
test('SGR mouse works across arbitrary packet boundaries and ignores releases/motion',()=>{
  const events=[],d=new InputDecoder(e=>events.push(e));
  for(const ch of '\x1b[<0;12;9M\x1b[<2;14;10M\x1b[<0;12;9m\x1b[<32;12;9M')d.feed(ch);
  assert.deepEqual(events,[{type:'mouse',x:12,y:9,button:0},{type:'mouse',x:14,y:10,button:2}]);
});
test('keyboard arrows, WASD, Enter, Esc, Ctrl+C decode',()=>{
  const events=[],d=new InputDecoder(e=>events.push(e));d.feed('\x1b[A\x1b[Bw\r');d.feed('\x03');d.feed('\x1b');d.flushEscape();
  assert.deepEqual(events.map(e=>e.name),['up','down','w','enter','exit','escape']);
});
test('hit testing uses exact cell bounds and topmost control',()=>{
  const t=new Terminal(()=>{}),first=()=>{},last=()=>{};t.hit(5,8,6,2,first);t.hit(7,8,1,1,last);
  assert.equal(t.click({x:5,y:8}),first);assert.equal(t.click({x:7,y:8}),last);assert.equal(t.click({x:11,y:8}),undefined);
});
test('Ctrl+C bypasses an incomplete escape sequence',()=>{
  const events=[],d=new InputDecoder(e=>events.push(e));d.feed('\x1b[<0;');d.feed('\x03');assert.equal(events.at(-1).name,'exit');assert.equal(d.buffer,'');
});
test('expired partial escape cannot swallow later menu keys',()=>{
  const events=[],d=new InputDecoder(e=>events.push(e));d.feed('\x1b[');d.flushEscape();d.feed('1');assert.equal(events.at(-1).name,'1');
});
test('classic mouse packets decode across boundaries and releases are ignored',()=>{
  const events=[],d=new InputDecoder(e=>events.push(e));for(const c of '\x1b[M -\x2a\x1b[M#-\x2a')d.feed(c);
  assert.deepEqual(events,[{type:'mouse',x:13,y:10,button:0}]);
});
