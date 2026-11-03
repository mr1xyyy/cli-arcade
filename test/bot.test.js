const {test}=require('node:test');
const assert=require('node:assert/strict');
const {initial,move}=require('../src/games/engine.js');
const {legalMoves,chooseMove}=require('../src/games/bot.js');
test('legal move generation matches starting positions and does not mutate',()=>{
  for(const [game,total] of [['ttt',9],['chess',20],['checkers',7]]){
    const s=initial(game),before=JSON.stringify(s),moves=legalMoves(s);assert.equal(moves.length,total);assert.equal(JSON.stringify(s),before);
    for(const m of moves)assert.doesNotThrow(()=>move(s,m.input));
  }
});
test('bot takes tic-tac-toe win and blocks immediate loss',()=>{
  let s=initial('ttt');for(const m of ['1','4','2','5'])s=move(s,m);
  assert.equal(chooseMove(s,'hard',{budgetMs:2000}),'3');
  s=initial('ttt');for(const m of ['1','5','2'])s=move(s,m);
  assert.equal(chooseMove(s,'hard',{budgetMs:2000}),'3');
});
test('chess bot finds mate in one',()=>{
  let s=initial('chess');for(const m of ['f2 f3','e7 e5','g2 g4'])s=move(s,m);
  const answer=chooseMove(s,'hard',{budgetMs:2000});assert.match(move(s,answer).result,/mat/);
});
test('checkers bot completes forced captures',()=>{
  let s=initial('checkers');s.board=Array.from({length:8},()=>Array(8).fill('.'));s.board[5][0]='M';s.board[4][1]='m';s.board[2][3]='m';
  s=move(s,chooseMove(s,'normal'));assert.equal(s.turn,0);assert.deepEqual(s.forced,[3,2]);
  s=move(s,chooseMove(s,'hard'));assert.ok(s.result);
});
test('easy bot only chooses legal moves; ended game has no bot move',()=>{
  for(const g of ['ttt','chess','checkers']){const s=initial(g);assert.doesNotThrow(()=>move(s,chooseMove(s,'easy')));s.result='Durrang!';assert.equal(chooseMove(s),null);}
});
