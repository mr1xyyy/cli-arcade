'use strict';
const {move,chessMove,inCheck}=require('./engine.js');
const square=(r,c)=>String.fromCharCode(97+c)+(8-r);
const owner=p=>p==='.'?-1:p===p.toUpperCase()?0:1;

function legalMoves(s) {
  if(s.result)return [];
  const out=[];
  if(s.game==='ttt') {
    s.board.forEach((p,i)=>{if(p==='.')out.push({input:String(i+1),state:move(s,String(i+1))});});
    return out;
  }
  for(let r=0;r<8;r++)for(let c=0;c<8;c++) {
    const p=s.board[r][c];if(owner(p)!==s.turn)continue;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
      if(s.game==='checkers' && (Math.abs(y-r)!==Math.abs(x-c)||Math.abs(y-r)>2||y===r))continue;
      const promotions=s.game==='chess'&&p.toLowerCase()==='p'&&(y===0||y===7)?['q','n','r','b']:['q'];
      for(const promotion of promotions) {
        const input=`${square(r,c)} ${square(y,x)}${promotions.length>1?' '+promotion:''}`;
        if(s.game==='chess') {
          // Search copies omit repetition history; the actual move uses engine.move.
          const state=chessMove({...s,history:[]},[r,c],[y,x],promotion);
          if(state)out.push({input,state});
        } else {try{out.push({input,state:move(s,input)});}catch{ /* illegal candidate */ }}
      }
    }
  }
  return out;
}
function evaluate(s,root) {
  if(s.result) {
    if(s.result.startsWith('Durrang'))return 0;
    const winner=s.game==='ttt'?(s.result.startsWith('X')?0:1):(s.result.startsWith('Oq')?0:1);
    return winner===root?100000:-100000;
  }
  if(s.game==='ttt')return 0;
  let score=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++) {
    const p=s.board[r][c];if(p==='.')continue;
    const who=owner(p),k=p.toLowerCase();
    let value=s.game==='chess'?({p:100,n:320,b:335,r:500,q:900,k:20000}[k]):(k==='k'?180:100);
    value+=(3.5-Math.abs(c-3.5))*4;
    if(k==='p'||s.game==='checkers'&&k==='m')value+=(who===0?7-r:r)*4;
    score+=who===root?value:-value;
  }
  return score;
}
function chooseMove(s,difficulty='normal',options={}) {
  const moves=legalMoves(s);if(!moves.length)return null;
  if(difficulty==='easy')return moves[Math.floor(Math.random()*moves.length)].input;
  const root=s.turn,deadline=Date.now()+(options.budgetMs||650);
  const maxDepth=s.game==='ttt'?9:difficulty==='hard'?4:2;
  let best=moves[0].input;
  const timeout=Symbol('timeout');
  function search(state,depth,alpha,beta,ply) {
    if(Date.now()>deadline)throw timeout;
    if(state.result)return evaluate(state,root);
    const next=legalMoves(state);
    if(!next.length)return state.game==='chess'&&!inCheck(state.board,state.turn)?0:state.turn===root?-100000+ply:100000-ply;
    if(!depth)return evaluate(state,root);
    const maximizing=state.turn===root;
    next.sort((a,b)=>maximizing?evaluate(b.state,root)-evaluate(a.state,root):evaluate(a.state,root)-evaluate(b.state,root));
    let value=maximizing?-Infinity:Infinity;
    for(const m of next) {
      const v=search(m.state,depth-1,alpha,beta,ply+1);
      value=maximizing?Math.max(value,v):Math.min(value,v);
      if(maximizing)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);
      if(beta<=alpha)break;
    }return value;
  }
  for(let depth=1;depth<=maxDepth;depth++) {
    let candidate=best,value=-Infinity,alpha=-Infinity;
    const ordered=[...moves].sort((a,b)=>(b.input===best?1:0)-(a.input===best?1:0)||evaluate(b.state,root)-evaluate(a.state,root));
    try {
      for(const m of ordered) {const score=search(m.state,depth-1,alpha,Infinity,1);if(score>value){value=score;candidate=m.input;}alpha=Math.max(alpha,value);}
      best=candidate;
      if(value>=99900)return best;
    }catch(e){if(e!==timeout)throw e;break;}
  }return best;
}
module.exports={legalMoves,chooseMove,square,owner};
