const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Screen}=require('../src/ui/screen.js');
const {drawSprite}=require('../src/ui/sprites.js');
const frame=(width=80,height=30)=>new Screen(width,height,'230;237;249','11;16;32');

test('unchanged frames emit no output; a moving sprite updates only old and new cells',()=>{
  const a=frame(),b=frame(),c=frame();
  for(const s of [a,b,c])s.text(2,2,'SNAKE — HISOB 0');
  a.text(10,10,'  ','230;237;249','48;158;139');b.text(10,10,'  ','230;237;249','48;158;139');
  c.text(12,10,'  ','230;237;249','48;158;139');
  assert.equal(b.diff(a),'');
  const patch=c.diff(b);
  assert.ok(!patch.includes('\x1b[2J'));assert.ok(!patch.includes('SNAKE'));
  assert.ok(patch.includes('\x1b[10;10H'));assert.ok(patch.includes('\x1b[10;12H'));
  assert.ok(patch.length<150);
});
test('overlapping sprite layers are composed before output without exposing erasures',()=>{
  const a=frame(),b=frame();
  const paint=s=>{
    s.text(4,5,'     ','230;237;249','33;54;77');
    s.text(4,6,'     ','230;237;249','33;54;77');
    drawSprite(s,4,5,[' ### ','  #  ',' ### ','     '],'237;245;255','33;54;77');
  };
  paint(a);paint(b);assert.equal(b.diff(a),'');
  assert.ok(a.diff().includes('▀'));
});
test('shorter messages and removed panels erase stale content without clearing the screen',()=>{
  const a=frame(),b=frame();a.text(1,1,'Bot o‘ylayapti...');b.text(1,1,'Oq navbati');
  const patch=b.diff(a);assert.ok(!patch.includes('\x1b[2J'));assert.ok(patch.includes(' '));
  const blank=frame(),erased=blank.diff(a).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
  assert.equal(erased,' '.repeat(a.cells.filter(c=>c.text!==' ').length));
});
test('first draw and terminal resize clear once; normal redraws do not',()=>{
  const a=frame();a.text(1,1,'CHESS');
  assert.equal((a.diff().match(/\x1b\[2J/g)||[]).length,1);
  const resized=frame(100,40);assert.equal((resized.diff(a).match(/\x1b\[2J/g)||[]).length,1);
  assert.equal(frame(100,40).diff(resized),'');
});
