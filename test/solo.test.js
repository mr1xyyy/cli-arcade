const {test}=require('node:test');
const assert=require('node:assert/strict');
const {minesState,openMine,mazeState,mazeStep,snakeState,snakeTick,snakeDirection}=require('../src/games/solo.js');
test('mines first click safe, flags toggle, reveal wins or loses',()=>{
  const s=minesState();openMine(s,40,true);assert.ok(s.flags.has(40));openMine(s,40);assert.equal(s.started,false);openMine(s,40,true);openMine(s,40);
  assert.equal(s.bombs.size,10);assert.ok(s.opened.has(40));assert.equal(s.result,null);
  for(let i=0;i<81;i++)if(!s.bombs.has(i))openMine(s,i);assert.match(s.result,/Yutdingiz/);
  const lose=minesState();openMine(lose,0);openMine(lose,[...lose.bombs][0]);assert.match(lose.result,/Mina/);
});
test('generated maze has a reachable exit and rejects wall clicks',()=>{
  const s=mazeState(),before=[s.r,s.c];mazeStep(s,-1,0);assert.deepEqual([s.r,s.c],before);
  const queue=[[1,1,[]]],seen=new Set(['1,1']);let route;
  while(queue.length){const [r,c,path]=queue.shift();if(r===s.board.length-2&&c===s.board[0].length-2){route=path;break;}for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const y=r+dr,x=c+dc,key=`${y},${x}`;if(s.board[y]?.[x]===' '&&!seen.has(key)){seen.add(key);queue.push([y,x,[...path,[dr,dc]]]);}}}
  assert.ok(route);for(const d of route)mazeStep(s,...d);assert.match(s.result,/Yutdingiz/);
});
test('snake forbids reverse, pauses, eats and collides with walls',()=>{
  const s=snakeState();snakeDirection(s,0,-1);assert.deepEqual(s.next,[0,1]);s.food=[6,9];snakeTick(s);assert.equal(s.score,1);assert.equal(s.body.length,4);
  s.paused=true;const before=JSON.stringify(s.body);snakeTick(s);assert.equal(JSON.stringify(s.body),before);s.paused=false;
  for(let i=0;i<30;i++)snakeTick(s);assert.ok(s.result);
});
