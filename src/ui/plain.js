'use strict';
const readline = require('node:readline');
const net = require('node:net');
const {initial,move,render,inCheck} = require('../games/engine.js');
const {chooseMove}=require('../games/bot.js');
let rl;
function openInput() { rl=readline.createInterface({input:process.stdin,output:process.stdout}); }
const ask = text => new Promise(resolve=>rl.question(text,resolve));
const clear = () => { if(process.stdout.isTTY) console.clear(); };
const random = n => Math.floor(Math.random()*n);
const label = s => s.game==='ttt'?(s.turn===0?'X':'O'):(s.turn===0?'Oq (KATTA harflar)':'Qora (kichik harflar)');
function show(s) {
  clear();console.log('\n'+render(s)+'\n');
  console.log(s.result || `${label(s)} navbati${s.forced?' — urishni davom ettiring':''}${s.game==='chess'&&inCheck(s.board,s.turn)?' — SHOH!':''}`);
}
async function local(game,bot=false,difficulty='normal') {
  let s=initial(game);
  console.log('Chiqish: q. Shaxmat/shashka: e2 e4; tic-tac-toe: 1–9.');
  while(!s.result) {
    if(bot&&s.turn===1){show(s);console.log('Bot o‘ylayapti...');s=move(s,chooseMove(s,difficulty));continue;}
    show(s);const input=(await ask('Yurish (q = menyu): ')).trim();if(input==='q') return;
    try {s=move(s,input);} catch(e) {console.log(e.message);await ask('Enter...');}
  } show(s);await ask('Enter — menyu...');
}
// Newline-delimited JSON, capped frames; the host owns and validates game state.
function peer(socket,onMessage,onClose) {
  let buffer='', closed=false;
  socket.setEncoding('utf8');socket.setNoDelay(true);
  const end=reason=>{if(!closed){closed=true;onClose(reason);}};
  socket.on('data',chunk=>{
    buffer+=chunk;
    if(buffer.length>65536){socket.destroy();end('Xabar juda katta.');return;}
    let i;
    while((i=buffer.indexOf('\n'))>=0) {
      const line=buffer.slice(0,i);buffer=buffer.slice(i+1);
      try {const msg=JSON.parse(line);if(!msg||typeof msg!=='object') throw Error();onMessage(msg);} catch {socket.destroy();end('Noto‘g‘ri tarmoq xabari.');return;}
    }
  });
  socket.on('error',e=>end(e.message));socket.on('close',()=>end('Raqib uzildi.'));
  return msg=>{if(!socket.destroyed) socket.write(JSON.stringify(msg)+'\n');};
}
async function online(game,hosting) {
  const host=hosting?'0.0.0.0':(await ask('Host IP (masalan 192.168.1.5): ')).trim();
  const raw=(await ask('Port [4040]: ')).trim(),port=raw===''?4040:Number(raw);
  if(!Number.isInteger(port)||port<1||port>65535){console.log('Port 1–65535 bo‘lsin.');return;}
  console.log(hosting?`Port ${port}: raqib kutilmoqda. Bekor qilish: q + Enter.`:'Ulanmoqda... Bekor qilish: q + Enter.');
  await new Promise(resolve=>{
    let server,socket,send,state,finished=false,ready=false;
    const finish=reason=>{
      if(finished)return;finished=true;console.log(reason);
      rl.removeListener('line',line);if(socket)socket.destroy();if(server)server.close();resolve();
    };
    const display=()=>{show(state);console.log(state.result?'q — menyu':state.turn===(hosting?0:1)?'Sizning navbatingiz. Yurish kiriting (q — chiqish):':'Raqib yurishini kuting (q — chiqish).');};
    const line=input=>{
      input=input.trim();if(input==='q'){finish('O‘yin yopildi.');return;}
      if(!ready || !state || state.result || state.turn!==(hosting?0:1)) {console.log('Navbatingizni kuting.');return;}
      if(hosting) apply(input);else send({type:'move',input});
    };
    const apply=input=>{
      try {state=move(state,input);send({type:'state',state});display();}
      catch(e) {if(state.turn===0)console.log(e.message);else send({type:'error',message:e.message});}
    };
    const attach=s=>{
      socket=s;ready=true;
      send=peer(s,msg=>{
        if(hosting) {
          if(msg.type==='move' && state.turn===1 && typeof msg.input==='string' && msg.input.length<100)apply(msg.input);
        } else if(msg.type==='state') {
          if(!msg.state || !['ttt','chess','checkers'].includes(msg.state.game) || !Array.isArray(msg.state.board)) {finish('Noto‘g‘ri o‘yin holati.');return;}
          state=msg.state;display();
        } else if(msg.type==='error')console.log(String(msg.message));
      },finish);
      if(hosting){state=initial(game);send({type:'state',state});display();}
    };
    rl.on('line',line);
    if(hosting) {
      server=net.createServer(s=>{if(ready){s.end();return;}attach(s);});
      server.on('error',e=>finish(e.message));server.listen(port,host);
    } else {socket=net.createConnection({host,port});socket.on('error',e=>finish(e.message));socket.on('connect',()=>attach(socket));socket.setTimeout(15000,()=>{if(!ready)finish('Ulanish vaqti tugadi.');});}
  });
}
async function mines() {
  const size=9,total=10, bombs=new Set(),opened=new Set(),flags=new Set();let started=false;
  const near=i=>{const a=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const r=Math.floor(i/size)+dr,c=i%size+dc;if((dr||dc)&&r>=0&&c>=0&&r<size&&c<size)a.push(r*size+c);}return a;};
  const count=i=>near(i).filter(x=>bombs.has(x)).length;
  function draw(reveal=false){clear();console.log('MINESWEEPER — 10 mina\n    1 2 3 4 5 6 7 8 9');for(let r=0;r<size;r++)console.log(`${r+1}   `+Array.from({length:size},(_,c)=>{const i=r*size+c;return reveal&&bombs.has(i)?'*':flags.has(i)?'F':opened.has(i)?String(count(i)||' '):'#';}).join(' '));}
  while(true) {
    draw();const input=(await ask('o qator ustun / f qator ustun (1–9), q: ')).trim();if(input==='q')return;
    const m=input.match(/^([of])\s+([1-9])\s+([1-9])$/);if(!m)continue;
    const i=(Number(m[2])-1)*size+Number(m[3])-1;
    if(m[1]==='f'){if(!opened.has(i)){if(flags.has(i))flags.delete(i);else flags.add(i);}continue;}
    if(flags.has(i)||opened.has(i))continue;
    if(!started){const safe=new Set([i,...near(i)]);while(bombs.size<total){const b=random(size*size);if(!safe.has(b))bombs.add(b);}started=true;}
    if(bombs.has(i)){draw(true);console.log('Mina! Yutqazdingiz.');break;}
    const stack=[i];while(stack.length){const k=stack.pop();if(opened.has(k)||flags.has(k)||bombs.has(k))continue;opened.add(k);if(count(k)===0)stack.push(...near(k));}
    if(opened.size===size*size-total){draw(true);console.log('Barcha xavfsiz kataklar ochildi — yutdingiz!');break;}
  } await ask('Enter — menyu...');
}
async function maze() {
  const w=31,h=17,b=Array.from({length:h},()=>Array(w).fill('#')),stack=[[1,1]];b[1][1]=' ';
  while(stack.length){const [r,c]=stack.at(-1),opts=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dr,dc])=>r+dr>0&&r+dr<h-1&&c+dc>0&&c+dc<w-1&&b[r+dr][c+dc]==='#');if(!opts.length){stack.pop();continue;}const [dr,dc]=opts[random(opts.length)];b[r+dr/2][c+dc/2]=' ';b[r+dr][c+dc]=' ';stack.push([r+dr,c+dc]);}
  let r=1,c=1,moves=0;const start=Date.now();
  while(true){clear();console.log('ASCII MAZE RUNNER — @ siz, E chiqish');console.log(b.map((row,y)=>row.map((v,x)=>y===r&&x===c?'@':y===h-2&&x===w-2?'E':v).join('')).join('\n'));if(r===h-2&&c===w-2){console.log(`Yutdingiz! ${moves} qadam, ${Math.round((Date.now()-start)/1000)} soniya.`);await ask('Enter...');return;}const key=(await ask('W/A/S/D + Enter, q — menyu: ')).toLowerCase().trim();if(key==='q')return;const d={w:[-1,0],s:[1,0],a:[0,-1],d:[0,1]}[key];if(d&&b[r+d[0]][c+d[1]]!=='#'){r+=d[0];c+=d[1];moves++;}}
}
async function snake() {
  if(!process.stdin.isTTY){console.log('Snake interaktiv terminal talab qiladi.');return;}
  rl.close();rl=null;readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
  const w=30,h=16;let body=[[8,10],[8,9],[8,8]],dir=[0,1],next=dir,food,score=0,paused=false,turned=false;
  const spawn=()=>{do{food=[random(h),random(w)];}while(body.some(([r,c])=>r===food[0]&&c===food[1]));};spawn();
  await new Promise(resolve=>{
    let timer,done=false;
    const end=message=>{if(done)return;done=true;clearInterval(timer);process.stdin.removeListener('keypress',key);process.stdin.setRawMode(false);process.stdout.write('\x1b[?25h');console.log(message);resolve();};
    const key=(str,k={})=>{if(k.name==='q'||k.ctrl&&k.name==='c')return end(`Snake tugadi. Hisob: ${score}`);if(k.name==='space'){paused=!paused;draw();return;}const d={up:[-1,0],w:[-1,0],down:[1,0],s:[1,0],left:[0,-1],a:[0,-1],right:[0,1],d:[0,1]}[k.name];if(d&&!turned&&(d[0]!==-dir[0]||d[1]!==-dir[1])){next=d;turned=true;}};
    const draw=()=>{process.stdout.write('\x1b[H');console.log(`SNAKE | Hisob: ${score} | WASD/arrows | Space pauza | q chiqish${paused?' | PAUZA':''}      `);console.log('+'+'-'.repeat(w)+'+');for(let r=0;r<h;r++)console.log('|'+Array.from({length:w},(_,c)=>body.some(([y,x])=>y===r&&x===c)?(body[0][0]===r&&body[0][1]===c?'@':'o'):food[0]===r&&food[1]===c?'*':' ').join('')+'|');console.log('+'+'-'.repeat(w)+'+');};
    process.stdin.on('keypress',key);clear();process.stdout.write('\x1b[?25l');draw();
    timer=setInterval(()=>{if(paused)return;dir=next;turned=false;const head=[body[0][0]+dir[0],body[0][1]+dir[1]],eat=head[0]===food[0]&&head[1]===food[1];const collision=(eat?body:body.slice(0,-1)).some(([r,c])=>r===head[0]&&c===head[1]);if(head[0]<0||head[0]>=h||head[1]<0||head[1]>=w||collision){end(`Yutqazdingiz! Hisob: ${score}`);return;}body.unshift(head);if(eat){score++;if(body.length===w*h){end('Yutdingiz!');return;}spawn();}else body.pop();draw();},140);
  });openInput();await ask('Enter — menyu...');
}
async function main() {
  while(true) {
    clear();console.log('\n  +--------------------------+\n  |       CLI GAMES          |\n  +--------------------------+\n  1. Tic-tac-toe\n  2. Chess / Shaxmat\n  3. Minesweeper\n  4. Checkers / Shashka\n  5. Snake\n  6. ASCII Maze Runner\n  0. Chiqish\n');
    const choice=(await ask('Tanlang: ')).trim();if(choice==='0')break;
    if(['1','2','4'].includes(choice)) {
      const game={'1':'ttt','2':'chess','4':'checkers'}[choice];
      const mode=(await ask('1. Bitta kompyuterda 2 kishi\n2. LAN host\n3. LAN join\n4. Bot bilan\n0. Orqaga\nRejim: ')).trim();
      if(mode==='1')await local(game);else if(mode==='2'||mode==='3')await online(game,mode==='2');else if(mode==='4')await local(game,true);
    } else if(choice==='3')await mines();else if(choice==='5')await snake();else if(choice==='6')await maze();
  }
}
async function run(){
  openInput();
  try{await main();}finally{if(rl)rl.close();}
}
module.exports={run};
