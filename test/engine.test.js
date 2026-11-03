const {test}=require('node:test');
const assert=require('node:assert/strict');
const {initial,move,inCheck}=require('../src/games/engine.js');
const play=(game,moves)=>moves.reduce((s,m)=>move(s,m),initial(game));
test('tic-tac-toe win, occupied square and draw',()=>{
  assert.match(play('ttt',['1','4','2','5','3']).result,/X/);
  assert.throws(()=>play('ttt',['1','1']));
  assert.equal(play('ttt',['1','2','3','5','4','6','8','7','9']).result,'Durrang!');
});
test('chess rejects blocked pieces, wrong turn and pinned moves',()=>{
  assert.throws(()=>move(initial('chess'),'a1 a4'));
  assert.throws(()=>move(initial('chess'),'e7 e5'));
  const s=initial('chess');s.board=Array.from({length:8},()=>Array(8).fill('.'));
  s.board[7][4]='K';s.board[6][4]='R';s.board[0][4]='r';s.board[0][0]='k';
  assert.throws(()=>move(s,'e2 d2'));
});
test('fools mate ends game',()=>{
  const s=play('chess',['f2 f3','e7 e5','g2 g4','d8 h4']);
  assert.match(s.result,/mat/);assert.ok(inCheck(s.board,0));assert.throws(()=>move(s,'a2 a3'));
});
test('castling moves king and rook and clears rights',()=>{
  const s=play('chess',['e2 e4','e7 e5','g1 f3','b8 c6','f1 c4','g8 f6','e1 g1']);
  assert.equal(s.board[7][6],'K');assert.equal(s.board[7][5],'R');assert.equal(s.board[7][7],'.');assert.equal(s.rights[0],false);
});
test('en passant removes pawn and expires',()=>{
  const moves=['e2 e4','a7 a6','e4 e5','d7 d5'];
  const s=play('chess',[...moves,'e5 d6']);assert.equal(s.board[3][3],'.');assert.equal(s.board[2][3],'P');
  assert.throws(()=>play('chess',[...moves,'a2 a3','a6 a5','e5 d6']));
});
test('promotion and stalemate',()=>{
  const s=initial('chess');s.board=Array.from({length:8},()=>Array(8).fill('.'));
  s.board[7][7]='K';s.board[0][7]='k';s.board[1][0]='P';
  assert.equal(move(s,'a7 a8 n').board[0][0],'N');
  s.board=Array.from({length:8},()=>Array(8).fill('.'));s.board[0][0]='k';s.board[2][2]='K';s.board[2][1]='Q';
  assert.match(move(s,'b6 c7').result,/pat/);
});
test('threefold repetition includes initial position',()=>{
  assert.match(play('chess',Array(2).fill(['g1 f3','g8 f6','f3 g1','f6 g8']).flat()).result,/takrorlanish/);
});
test('checkers mandatory capture and continuation',()=>{
  const s=initial('checkers');s.board=Array.from({length:8},()=>Array(8).fill('.'));
  s.board[5][0]='M';s.board[4][1]='m';s.board[2][3]='m';s.board[0][7]='m';s.board[5][4]='M';
  assert.throws(()=>move(s,'e3 f4'));
  const n=move(s,'a3 c5');assert.deepEqual(n.forced,[3,2]);assert.equal(n.turn,0);
  assert.throws(()=>move(n,'e3 f4'));
  const end=move(n,'c5 e7');assert.equal(end.turn,1);assert.equal(end.board[2][3],'.');
});
test('checkers promotion and victory',()=>{
  const s=initial('checkers');s.board=Array.from({length:8},()=>Array(8).fill('.'));
  s.board[2][1]='M';s.board[1][2]='m';
  const n=move(s,'b6 d8');assert.equal(n.board[0][3],'K');assert.ok(n.result);
});
test('moves do not mutate previous state',()=>{
  for(const game of ['ttt','chess','checkers']){const s=initial(game),before=JSON.stringify(s);move(s,{ttt:'1',chess:'e2 e4',checkers:'a3 b4'}[game]);assert.equal(JSON.stringify(s),before);}
});
