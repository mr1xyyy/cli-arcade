'use strict';
const random=n=>Math.floor(Math.random()*n);
function minesState(){return {game:'mines',size:9,bombs:new Set(),opened:new Set(),flags:new Set(),started:false,result:null};}
function neighbors(i,size=9){const out=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const r=Math.floor(i/size)+dr,c=i%size+dc;if((dr||dc)&&r>=0&&c>=0&&r<size&&c<size)out.push(r*size+c);}return out;}
const count=(s,i)=>neighbors(i).filter(x=>s.bombs.has(x)).length;
function openMine(s,i,flag=false){
  if(s.result||i<0||i>=81)return;
  if(flag){if(!s.opened.has(i)){if(s.flags.has(i))s.flags.delete(i);else s.flags.add(i);}return;}
  if(s.flags.has(i)||s.opened.has(i))return;
  if(!s.started){const safe=new Set([i,...neighbors(i)]);while(s.bombs.size<10){const p=random(81);if(!safe.has(p))s.bombs.add(p);}s.started=true;}
  if(s.bombs.has(i)){s.result='Mina! Yutqazdingiz.';return;}
  const stack=[i];while(stack.length){const p=stack.pop();if(s.opened.has(p)||s.flags.has(p)||s.bombs.has(p))continue;s.opened.add(p);if(!count(s,p))stack.push(...neighbors(p));}
  if(s.opened.size===71)s.result='Yutdingiz! Barcha xavfsiz kataklar ochildi.';
}
function mazeState(w=25,h=13){
  const board=Array.from({length:h},()=>Array(w).fill('#')),stack=[[1,1]];board[1][1]=' ';
  while(stack.length){const [r,c]=stack.at(-1),opts=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dr,dc])=>r+dr>0&&r+dr<h-1&&c+dc>0&&c+dc<w-1&&board[r+dr][c+dc]==='#');if(!opts.length){stack.pop();continue;}const [dr,dc]=opts[random(opts.length)];board[r+dr/2][c+dc/2]=' ';board[r+dr][c+dc]=' ';stack.push([r+dr,c+dc]);}
  return {game:'maze',board,r:1,c:1,moves:0,result:null};
}
function mazeStep(s,dr,dc){if(s.result)return;const r=s.r+dr,c=s.c+dc;if(Math.abs(dr)+Math.abs(dc)!==1||!s.board[r]||s.board[r][c]!==' ')return;s.r=r;s.c=c;s.moves++;if(r===s.board.length-2&&c===s.board[0].length-2)s.result=`Yutdingiz! ${s.moves} qadam.`;}
function snakeFood(s){if(s.body.length===s.w*s.h){s.result='Yutdingiz!';return;}do{s.food=[random(s.h),random(s.w)];}while(s.body.some(([r,c])=>r===s.food[0]&&c===s.food[1]));}
function snakeState(){const s={game:'snake',w:25,h:13,body:[[6,8],[6,7],[6,6]],dir:[0,1],next:[0,1],turned:false,paused:false,score:0,result:null};snakeFood(s);return s;}
function snakeDirection(s,dr,dc){if(!s.turned&&(dr!==-s.dir[0]||dc!==-s.dir[1])){s.next=[dr,dc];s.turned=true;}}
function snakeTick(s){
  if(s.paused||s.result)return;s.dir=s.next;s.turned=false;const head=[s.body[0][0]+s.dir[0],s.body[0][1]+s.dir[1]],eat=head[0]===s.food[0]&&head[1]===s.food[1];
  if(head[0]<0||head[0]>=s.h||head[1]<0||head[1]>=s.w||(eat?s.body:s.body.slice(0,-1)).some(([r,c])=>r===head[0]&&c===head[1])){s.result=`O'yin tugadi! Hisob: ${s.score}`;return;}
  s.body.unshift(head);if(eat){s.score++;snakeFood(s);}else s.body.pop();
}
module.exports={minesState,openMine,count,mazeState,mazeStep,snakeState,snakeDirection,snakeTick};
