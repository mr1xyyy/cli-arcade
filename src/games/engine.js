'use strict';
const xy = s => /^[a-h][1-8]$/.test(s) ? [8 - Number(s[1]), s.charCodeAt(0) - 97] : null;
const inside = (r,c) => r >= 0 && c >= 0 && r < 8 && c < 8;
const side = p => p === '.' ? -1 : p === p.toUpperCase() ? 0 : 1;
function initial(game) {
  if (game === 'ttt') return {game, board: Array(9).fill('.'), turn: 0, result: null};
  const board = Array.from({length:8}, () => Array(8).fill('.'));
  if (game === 'chess') {
    board[0] = [...'rnbqkbnr']; board[1] = [...'pppppppp'];
    board[6] = [...'PPPPPPPP']; board[7] = [...'RNBQKBNR'];
  } else if (game === 'checkers') {
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) if((r+c)%2 && (r<3 || r>4)) board[r][c] = r<3 ? 'm' : 'M';
  } else throw Error('Unknown game');
  const state={game, board, turn:0, result:null, rights:[true,true,true,true], ep:null, forced:null, quiet:0, history:[]};
  if(game==='chess')state.history.push(JSON.stringify([board,0,state.rights,null]));
  return state;
}
function attacked(b,r,c,by) {
  for(let y=0;y<8;y++) for(let x=0;x<8;x++) {
    const p=b[y][x]; if(side(p)!==by) continue;
    const dr=r-y, dc=c-x, a=Math.abs(dr), d=Math.abs(dc), k=p.toLowerCase();
    if(k==='p' && dr===(by===0?-1:1) && d===1) return true;
    if(k==='n' && a*d===2) return true;
    if(k==='k' && Math.max(a,d)===1) return true;
    if((k==='b' && a===d || k==='r' && (!dr || !dc) || k==='q' && (a===d || !dr || !dc)) && (a || d)) {
      let yy=y+Math.sign(dr), xx=x+Math.sign(dc), clear=true;
      while(yy!==r || xx!==c) { if(b[yy][xx]!=='.') {clear=false;break;} yy+=Math.sign(dr);xx+=Math.sign(dc); }
      if(clear) return true;
    }
  } return false;
}
function inCheck(b,s) {
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]===(s===0?'K':'k')) return attacked(b,r,c,1-s);
  return true;
}
function chessMove(s,from,to,promotion='q') {
  const [r,c]=from,[y,x]=to,b=s.board,p=b[r][c],target=b[y][x],who=s.turn;
  if(side(p)!==who || side(target)===who || target.toLowerCase()==='k') return null;
  const dr=y-r,dc=x-c,a=Math.abs(dr),d=Math.abs(dc),k=p.toLowerCase();
  let ok=false, epCapture=false, castle=false;
  if(k==='p') {
    const dir=who===0?-1:1;
    ok=dc===0 && target==='.' && (dr===dir || dr===2*dir && r===(who===0?6:1) && b[r+dir][c]==='.');
    if(d===1 && dr===dir) { epCapture=target==='.' && s.ep && s.ep[0]===y && s.ep[1]===x; ok=target!=='.' || epCapture; }
  } else if(k==='n') ok=a*d===2;
  else if(k==='k') {
    ok=Math.max(a,d)===1;
    if(r===(who===0?7:0) && c===4 && dr===0 && d===2 && (x===2 || x===6)) {
      const right=who*2+(x===6?0:1), rook=x===6?7:0;
      castle=s.rights[right] && b[r][rook]===(who===0?'R':'r') && !inCheck(b,who);
      for(let col=Math.min(c,rook)+1;col<Math.max(c,rook);col++) if(b[r][col]!=='.') castle=false;
      if(attacked(b,r,c+Math.sign(dc),1-who) || attacked(b,y,x,1-who)) castle=false;
      ok=castle;
    }
  } else {
    ok=(k==='b' && a===d || k==='r' && (!dr || !dc) || k==='q' && (a===d || !dr || !dc)) && !!(a||d);
    if(ok) for(let yy=r+Math.sign(dr),xx=c+Math.sign(dc); yy!==y || xx!==x;yy+=Math.sign(dr),xx+=Math.sign(dc)) if(b[yy][xx]!=='.') {ok=false;break;}
  }
  if(!ok) return null;
  const n=structuredClone(s); n.board[r][c]='.';n.board[y][x]=p;
  if(epCapture) n.board[r][x]='.';
  if(castle) {n.board[r][x===6?5:3]=b[r][x===6?7:0];n.board[r][x===6?7:0]='.';}
  if(k==='p' && (y===0 || y===7)) {if(!'qrbn'.includes(promotion)) return null;n.board[y][x]=who===0?promotion.toUpperCase():promotion;}
  if(inCheck(n.board,who)) return null;
  if(k==='k') {n.rights[who*2]=false;n.rights[who*2+1]=false;}
  for(const [rr,cc,i] of [[7,7,0],[7,0,1],[0,7,2],[0,0,3]]) if((r===rr && c===cc)||(y===rr && x===cc)) n.rights[i]=false;
  n.ep=k==='p' && a===2 ? [(r+y)/2,c] : null;
  n.quiet=k==='p' || target!=='.' || epCapture ? 0 : s.quiet+1;
  n.turn=1-who;return n;
}
function chessHasMove(s) {
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(side(s.board[r][c])===s.turn)
    for(let y=0;y<8;y++) for(let x=0;x<8;x++) if(chessMove(s,[r,c],[y,x])) return true;
  return false;
}
function jumps(s,r,c) {
  const p=s.board[r][c], out=[];
  for(const dr of p.toLowerCase()==='k'?[-1,1]:[s.turn===0?-1:1]) for(const dc of [-1,1]) {
    const y=r+2*dr,x=c+2*dc;
    if(inside(y,x) && s.board[y][x]==='.' && side(s.board[r+dr][c+dc])===1-s.turn) out.push([y,x]);
  } return out;
}
function move(s,input) {
  if(s.result) throw Error('O‘yin tugagan.');
  if(s.game==='ttt') {
    const i=Number(input)-1;if(!Number.isInteger(i)||i<0||i>8||s.board[i]!=='.') throw Error('Bo‘sh katak raqamini kiriting: 1–9.');
    const n=structuredClone(s);n.board[i]=s.turn===0?'X':'O';
    for(const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) if(n.board[a]!=='.'&&n.board[a]===n.board[b]&&n.board[a]===n.board[c]) n.result=`${n.board[a]} yutdi!`;
    if(!n.result && !n.board.includes('.')) n.result='Durrang!';n.turn=1-s.turn;return n;
  }
  const match=input.toLowerCase().trim().match(/^([a-h][1-8])\s*[- ]?\s*([a-h][1-8])(?:\s*([qrbn]))?$/);
  if(!match) throw Error('Yurish formati: e2 e4 (yoki e7 e8 q).');
  const from=xy(match[1]),to=xy(match[2]);
  if(s.game==='chess') {
    const n=chessMove(s,from,to,match[3]||'q');if(!n) throw Error('Bu yurish mumkin emas.');
    if(!chessHasMove(n)) n.result=inCheck(n.board,n.turn)?`${s.turn===0?'Oq':'Qora'} yutdi — mat!`:'Durrang — pat!';
    if(!n.result && n.quiet>=100) n.result='Durrang — 50 yurish.';
    const key=JSON.stringify([n.board,n.turn,n.rights,n.ep]);n.history.push(key);
    if(!n.result && n.history.filter(k=>k===key).length>=3) n.result='Durrang — uch marta takrorlanish.';
    return n;
  }
  const [r,c]=from,[y,x]=to,p=s.board[r][c],dr=y-r,dc=x-c;
  if(side(p)!==s.turn || s.board[y][x]!=='.' || s.forced && (r!==s.forced[0]||c!==s.forced[1])) throw Error('Boshqa dona yoki katakni tanlang.');
  let must=false;for(let rr=0;rr<8;rr++) for(let cc=0;cc<8;cc++) if(side(s.board[rr][cc])===s.turn && jumps(s,rr,cc).length) must=true;
  const capture=jumps(s,r,c).some(([yy,xx])=>yy===y&&xx===x);
  const step=Math.abs(dr)===1 && Math.abs(dc)===1 && (p.toLowerCase()==='k'||dr===(s.turn===0?-1:1));
  if(!capture && (!step || must)) throw Error(must?'Urish majburiy.':'Bu yurish mumkin emas.');
  const n=structuredClone(s);n.board[r][c]='.';n.board[y][x]=p;
  if(capture) n.board[(r+y)/2][(c+x)/2]='.';
  const crowned=p.toLowerCase()==='m' && (y===0||y===7);
  if(crowned) n.board[y][x]=s.turn===0?'K':'k';
  n.forced=capture && !crowned && jumps(n,y,x).length ? [y,x] : null;
  if(!n.forced) n.turn=1-s.turn;
  n.quiet=capture||crowned?0:s.quiet+1;
  let legal=false;
  for(let rr=0;rr<8;rr++) for(let cc=0;cc<8;cc++) if(side(n.board[rr][cc])===n.turn) {
    if(jumps(n,rr,cc).length) legal=true;
    for(const dy of n.board[rr][cc].toLowerCase()==='k'?[-1,1]:[n.turn===0?-1:1]) for(const dx of [-1,1]) if(inside(rr+dy,cc+dx)&&n.board[rr+dy][cc+dx]==='.') legal=true;
  }
  if(!legal) n.result=`${s.turn===0?'Oq':'Qora'} yutdi!`;
  else if(n.quiet>=80) n.result='Durrang — 40 yurish urishsiz.';
  return n;
}
function render(s) {
  if(s.game==='ttt') return [0,3,6].map(r=>' '+s.board.slice(r,r+3).map((v,i)=>v==='.'?r+i+1:v).join(' | ')).join('\n---+---+---\n');
  return '    a b c d e f g h\n'+s.board.map((row,r)=>`${8-r}   ${row.join(' ')}   ${8-r}`).join('\n')+'\n    a b c d e f g h';
}
module.exports={initial,move,render,inCheck,chessMove};
