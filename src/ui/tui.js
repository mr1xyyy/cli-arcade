'use strict';
const {Terminal}=require('./terminal.js');
const {initial,move,inCheck}=require('../games/engine.js');
const {legalMoves,chooseMove,square,owner}=require('../games/bot.js');
const {minesState,openMine,count,mazeState,mazeStep,snakeState,snakeDirection,snakeTick}=require('../games/solo.js');
const {session}=require('../network/connection.js');
const {icons,chess:chessIcons,toggleIcons,isAscii}=require('./icons.js');
const {sprites,pieces,compactPieces,drawSprite}=require('./sprites.js');
const names={ttt:'TIC TAC TOE',chess:'CHESS',checkers:'CHECKERS',mines:'MINESWEEPER',snake:'SNAKE',maze:'MAZE RUNNER'};

async function run() {
  return new Promise(resolve=>{
    let screen='home',menu=[],focus=0,game,mode,difficulty='normal',human=0,state,selected=null,cursor=[0,0],notice='',timer=null,botTimer=null,network=null,form='',field='host',netHost='',hosting=false,thinking=false,closed=false,options=[],generation=0;
    const t=new Terminal(input);t.render=draw;
    function stopTimers(){clearInterval(timer);clearTimeout(botTimer);timer=null;botTimer=null;thinking=false;generation++;}
    function exit(){if(closed)return;closed=true;stopTimers();network?.close();t.stop();process.removeListener('SIGTERM',exit);process.removeListener('SIGINT',exit);resolve();}
    function home(){stopTimers();network?.close();network=null;screen='home';state=null;notice='';focus=0;draw();}
    function setup(next){screen=next;focus=0;notice='';draw();}
    function begin(){
      stopTimers();selected=null;cursor=[0,0];notice='';options=[];
      state=['ttt','chess','checkers'].includes(game)?initial(game):game==='mines'?minesState():game==='maze'?mazeState():snakeState();
      screen='play';refresh();
      if(game==='snake')timer=setInterval(()=>{snakeTick(state);draw();},140);
      scheduleBot();
    }
    function refresh(){options=state&&['ttt','chess','checkers'].includes(state.game)?legalMoves(state):[];draw();}
    function scheduleBot(){
      if(mode!=='bot'||state.result||state.turn===human)return;
      thinking=true;draw();const version=generation;
      botTimer=setTimeout(()=>{if(version!==generation)return;try{const answer=chooseMove(state,difficulty);if(answer)state=move(state,answer);}catch(e){notice=e.message;}thinking=false;selected=null;refresh();scheduleBot();},220);
    }
    function submit(command){
      if(network){network.play(command);return;}
      try{state=move(state,command);notice='';selected=null;refresh();scheduleBot();}catch(e){notice=e.message;draw();}
    }
    function cell(r,c,button=0){
      cursor=[r,c];if(state.result||thinking)return;
      if(state.game==='mines'){openMine(state,r*9+c,button===2);draw();return;}
      if(state.game==='maze'){mazeStep(state,r-state.r,c-state.c);draw();return;}
      if(state.game==='snake'){const dr=r-state.body[0][0],dc=c-state.body[0][1];if(Math.abs(dr)>Math.abs(dc))snakeDirection(state,Math.sign(dr),0);else if(dc)snakeDirection(state,0,Math.sign(dc));return;}
      if(mode==='bot'&&state.turn!==human || network&&state.turn!==(hosting?0:1))return;
      if(state.game==='ttt'){submit(String(r*3+c+1));return;}
      const pos=square(r,c);
      if(selected===pos){selected=null;draw();return;}
      if(owner(state.board[r][c])===state.turn){selected=pos;notice=`${pos.toUpperCase()} tanlandi — belgilangan katakka bosing`;draw();return;}
      if(selected){
        const choices=options.filter(m=>m.input.startsWith(selected+' '+pos));
        if(choices.length>1){screen='promotion';menu=choices.map(m=>{const p=m.input.at(-1);return {label:`${chessIcons[state.turn===0?p.toUpperCase():p]}  ${({q:'Farzin',r:'Rux',b:'Fil',n:'Ot'})[p]}`,action:()=>{screen='play';submit(m.input);}};});focus=0;draw();return;}
        submit(`${selected} ${pos}`);
      }else{notice='Avval o‘z donangizni tanlang.';draw();}
    }
    function connect(){
      const port=form.trim()===''?4040:Number(form);if(!Number.isInteger(port)||port<1||port>65535){notice='Port: 1–65535';draw();return;}
      screen='waiting';notice=hosting?`Port ${port}: raqib kutilmoqda...`:'Ulanmoqda...';draw();
      network=session({hosting,host:netHost,port,game,onState:s=>{state=s;game=s.game;screen='play';selected=null;notice='';refresh();},onNotice:msg=>{notice=msg;draw();},onClose:msg=>{notice=msg;network=null;screen='disconnected';draw();}});
    }
    function acceptForm(){if(field==='host'){netHost=form.trim()||'127.0.0.1';field='port';form='';draw();}else connect();}
    function direction(dr,dc){
      if(state.game==='snake'){snakeDirection(state,dr,dc);return;}
      if(state.game==='maze'){mazeStep(state,dr,dc);draw();return;}
      const n=state.game==='ttt'?3:state.game==='mines'?9:8;cursor=[(cursor[0]+dr+n)%n,(cursor[1]+dc+n)%n];draw();
    }
    function input(e){
      try{
        if(e.name==='exit'){exit();return;}
        if(e.name==='i'&&screen!=='form'){toggleIcons();draw();return;}
        if(e.type==='mouse'){const action=t.click(e);if(action)action(e);return;}
        if(screen==='form'){
          if(e.name==='escape'){setup('mode');return;}if(e.name==='enter'){acceptForm();return;}if(e.name==='backspace')form=form.slice(0,-1);else if(e.text&&/^[a-zA-Z0-9.:[\]_-]$/.test(e.text)&&form.length<100)form+=e.text;draw();return;
        }
        if(e.name==='q'||e.name==='escape'){if(screen==='home')exit();else home();return;}
        if(screen==='play'){
          if(e.name==='r'&&state.result&&!network){begin();return;}
          if(state.result)return;
          const d={up:[-1,0],w:[-1,0],down:[1,0],s:[1,0],left:[0,-1],a:[0,-1],right:[0,1],d:[0,1]}[e.name];if(d){direction(...d);return;}
          if(state.game==='snake'&&e.name==='space'){state.paused=!state.paused;draw();return;}
          if(e.name==='enter'||e.name==='space'){cell(...cursor);return;}
          if(state.game==='mines'&&e.name==='f'){cell(...cursor,2);return;}
          if(state.game==='ttt'&&/^[1-9]$/.test(e.name)){const n=Number(e.name)-1;cell(Math.floor(n/3),n%3);return;}
          return;
        }
        if(['home','mode','difficulty','side','promotion'].includes(screen)){
          if(['down','right','tab'].includes(e.name))focus=(focus+1)%menu.length;
          else if(['up','left'].includes(e.name))focus=(focus+menu.length-1)%menu.length;
          else if(e.name==='enter'||e.name==='space'){menu[focus]?.action();return;}
          else if(/^[1-9]$/.test(e.name)){menu[Number(e.name)-1]?.action();return;}draw();
        }
      }catch(e){notice=e.message;draw();}
    }
    function header(title,sub){
      t.text(ox,2,'  C L I   A R C A D E','accent');t.text(ox,3,'  '+ '━'.repeat(54),'dark');
      t.text(ox+2,5,title,'text');t.text(ox+2,6,sub,'muted');
      t.text(ox+2,4,t.inputStatus||'KLAVIATURA TAYYOR','muted');
      t.button(ox+45,4,12,isAscii()?'I: ASCII':'I: PIXEL',()=>{toggleIcons();draw();});
      if(screen!=='home')t.button(ox+45,2,12,'< MENYU',home);
    }
    let ox=1;
    function draw(){
      if(closed)return;t.begin();ox=Math.max(1,Math.floor((t.width-62)/2));
      if(t.width<64||t.height<24){t.text(2,2,'Terminalni kattalashtiring: kamida 64 x 24.','accent');t.text(2,4,'Q — chiqish.');t.end();return;}
      if(screen==='home'){
        header('O‘YINNI TANLANG','Sichqoncha bilan bosing yoki ↑ ↓ va Enter ishlating.');
        const games=[['ttt','01   TIC TAC TOE','Uchta belgi. Bitta g‘alaba.'],['chess','02   CHESS','Har bir yurish — yangi reja.'],['mines','03   MINESWEEPER','Xavfsiz kataklarni toping.'],['checkers','04   CHECKERS','Urish, damka va strategiya.'],['snake','05   SNAKE','Tezlik. Oziq. Yangi rekord.'],['maze','06   MAZE RUNNER','Labirintdan yo‘l toping.']];
        menu=games.map(([g])=>({action:()=>{game=g;if(['ttt','chess','checkers'].includes(g))setup('mode');else{mode='solo';begin();}}}));
        games.forEach(([g,title,sub],i)=>{
          const x=ox+2+(i%2)*30,y=(t.height<28?8:9)+Math.floor(i/2)*(t.height<28?4:5),fg=i===focus?'accent':'blue';
          t.text(x,y,'┌'+'─'.repeat(26)+'┐',i===focus?'accent':'dark');
          t.text(x,y+1,' '.repeat(28),'text','panel');t.text(x,y+2,' '.repeat(28),'text','panel');
          if(isAscii())t.text(x+1,y+1,icons.game[g],fg,'panel');else drawSprite(t,x+2,y+1,sprites.game[g],fg,'panel');
          t.text(x+7,y+1,title.replace('   ',' ').slice(0,20),i===focus?'accent':'text','panel');
          t.text(x+7,y+2,sub.slice(0,20),'muted','panel');
          t.text(x,y+3,'└'+'─'.repeat(26)+'┘',i===focus?'accent':'dark');t.hit(x,y,28,4,menu[i].action);
        });
        const exitY=t.height<28?21:25;t.button(ox+2,exitY,20,'Q  CHIQISH',exit);t.text(ox+25,exitY,'LOCAL  /  BOT  /  LAN','muted');
      }else if(['mode','difficulty','side','promotion'].includes(screen)){
        header(names[game],screen==='mode'?'Qanday o‘ynaysiz?':screen==='difficulty'?'Bot kuchini tanlang.':screen==='side'?'Qaysi tomonda o‘ynaysiz?':'Piyodani qaysi donaga almashtirasiz?');
        if(screen==='mode')menu=[{label:'BOT BILAN',detail:'Kompyuterga qarshi',action:()=>{mode='bot';setup('difficulty');}},{label:'IKKI KISHI',detail:'Bitta terminalda',action:()=>{mode='local';begin();}},{label:'LAN HOST',detail:'Do‘stingiz uchun xona oching',action:()=>{mode='online';hosting=true;field='port';form='';setup('form');}},{label:'LAN JOIN',detail:'IP orqali xonaga kiring',action:()=>{mode='online';hosting=false;field='host';form='';setup('form');}}];
        if(screen==='difficulty')menu=[['easy','OSON','Tasodifiy qonuniy yurishlar'],['normal','O‘RTACHA','Oldindan o‘ylaydigan raqib'],['hard','QIYIN','Chuqurroq qidiruv']].map(([level,label,detail])=>({label,detail,action:()=>{difficulty=level;setup('side');}}));
        if(screen==='side')menu=[{label:game==='ttt'?'X — BIRINCHI':'OQ — BIRINCHI',action:()=>{human=0;begin();}},{label:game==='ttt'?'O — IKKINCHI':'QORA — IKKINCHI',action:()=>{human=1;begin();}}];
        menu.forEach((m,i)=>{const y=(t.height<28?8:9)+i*(t.height<28?3:4);t.button(ox+4,y,52,`${i+1}. ${m.label}`,m.action,i===focus);if(m.detail)t.text(ox+6,y+1,m.detail,'muted');});
      }else if(screen==='form'){
        header(names[game],hosting?'LAN xona ochish':'Do‘stingizning xonasiga ulanish');t.text(ox+4,10,field==='host'?'HOST IP / NOMI':'TCP PORT (standart: 4040)','accent');t.text(ox+4,12,('  '+form+'▏').padEnd(50),'text','panel');t.button(ox+4,15,24,field==='host'?'DAVOM ETISH →':'ULANISH →',acceptForm,true);t.text(ox+4,18,'Matn kiriting va Enter bosing. Esc — orqaga.','muted');
      }else if(screen==='waiting'||screen==='disconnected'){
        header(names[game],screen==='waiting'?'LAN MULTIPLAYER':'ULANISH TUGADI');t.text(ox+4,11,notice,'accent');t.button(ox+4,15,30,'MENYUGA QAYTISH',home,true);
      }else if(screen==='play'){
        const versus=mode==='bot'?`BOT / ${difficulty.toUpperCase()} / Siz: ${human===0?'birinchi':'ikkinchi'}`:mode==='online'?'LAN MULTIPLAYER':mode==='local'?'LOCAL MULTIPLAYER':'SOLO';
        header(names[state.game],versus);
        if(['ttt','chess','checkers'].includes(state.game))drawBoard();else if(state.game==='mines')drawMines();else drawRunner();
      }
      if(notice&&!['waiting','disconnected'].includes(screen))t.text(ox+2,t.height-3,notice.slice(0,58),'danger');
      t.text(ox+2,t.height-1,screen==='home'?'CLICK / ↑↓ / ENTER                                    v2.0':'Q / ESC  menyu      CTRL+C  chiqish','muted');t.end();
    }
    function drawBoard(){
      const compact=t.height<28,small=state.game==='ttt',n=small?3:8,cw=small?12:6,ch=small?(compact?3:4):(compact?1:2),bx=ox+6,by=8;
      if(!small)for(let c=0;c<n;c++)t.text(bx+c*cw+2,7,String.fromCharCode(97+c),'muted');
      for(let r=0;r<n;r++){
        if(!small)t.text(bx-3,by+r*ch, String(8-r),'muted');
        for(let c=0;c<n;c++){
          const p=small?state.board[r*3+c]:state.board[r][c],pos=small?'':square(r,c);
          const target=selected&&options.some(m=>m.input.startsWith(selected+' '+pos));
          const bg=selected===pos?'selected':target?'#426f68':cursor[0]===r&&cursor[1]===c?'#435780':small?((r+c)%2?'dark':'light'):((r+c)%2?'#21364d':'#405976');
          for(let dy=0;dy<ch;dy++)t.text(bx+c*cw,by+r*ch+dy,' '.repeat(cw),'text',bg);
          let icon=p==='.'?(small?String(r*3+c+1):target?icons.target:' '):small?(p==='X'?icons.cross:icons.circle):state.game==='chess'?chessIcons[p]:icons.checker[p];
          const fg=p==='.'?(bg==='light'?'#61748e':'#b5c7df'):small?(p==='X'?(bg==='light'?'#075b70':'#69e7ef'):(bg==='light'?'#9d204b':'#ff86ab')):owner(p)===0?'#edf5ff':'#ffb477';
          if(!isAscii()&&p!=='.'){
            const mask=small?(p==='X'?sprites.cross:sprites.circle):state.game==='chess'?(compact?compactPieces:pieces)[p.toLowerCase()]:p.toLowerCase()==='k'?(compact?compactPieces.q:sprites.king):(compact?[' ### ',' ### ']:sprites.checker);
            drawSprite(t,bx+c*cw+Math.floor((cw-mask[0].length)/2),by+r*ch+Math.floor((ch-mask.length/2)/2),mask,fg,bg);
          }else t.text(bx+c*cw+Math.floor(cw/2)-1,by+r*ch+(small?1:0),icon,fg,bg);
          t.hit(bx+c*cw,by+r*ch,cw,ch,e=>cell(r,c,e.button));
        }
      }
      if(!small){
        const y=compact?17:24;
        t.text(ox+4,y,'OQ','text');t.text(ox+9,y,'QORA','#ffb477');
        t.text(ox+16,y,state.game==='chess'?'Shoh / Farzin / Rux / Fil / Ot / Piyoda':isAscii()?'o/x dona  O/X damka':'Dumaloq — dona   Toj — damka','muted');
      }
      let status=state.result|| (thinking?'Bot o‘ylayapti...':`${state.turn===0?(small?'X':'Oq'):(small?'O':'Qora')} navbati${state.forced?' — urishni davom ettiring':''}${state.game==='chess'&&inCheck(state.board,state.turn)?' — SHOH!':''}`);
      t.text(ox+4,compact?19:small?22:25,status,'accent');
      if(state.result){if(!network)t.button(ox+4,compact?20:small?24:26,30,'R  QAYTA O‘YNASH',begin,true);}
      else t.text(ox+4,compact?20:small?24:26,small?'Katakka bosing / 1–9':'Dona → katak  |  ↑↓←→ + Enter','muted');
    }
    function drawMines(){
      const compact=t.height<28,ch=compact?1:2,bx=ox+8,by=8;for(let r=0;r<9;r++)for(let c=0;c<9;c++){
        const i=r*9+c,isOpen=state.opened.has(i),bomb=state.result&&state.bombs.has(i),v=count(state,i);
        const bg=cursor[0]===r&&cursor[1]===c?'#435780':isOpen?((r+c)%2?'#19253b':'#203049'):((r+c)%2?'#304964':'#3b5874');
        const text=bomb?icons.mine:state.flags.has(i)?icons.flag:isOpen?(v||' '):icons.hidden;
        for(let d=0;d<ch;d++)t.text(bx+c*5,by+r*ch+d,' '.repeat(4),'text',bg);
        if(!isAscii()&&(bomb||state.flags.has(i))){
          const mask=compact?(bomb?[' # ','###']:['###','#  ']):bomb?sprites.mine:sprites.flag;
          drawSprite(t,bx+c*5,by+r*ch,mask.map(row=>row.slice(0,4)),bomb?'danger':'accent',bg);
        }else{
          const fg=bomb?'danger':state.flags.has(i)?'accent':isOpen?({1:'blue',2:'accent',3:'#ffbe79',4:'#c8a5ff',5:'danger',6:'#68d6ec',7:'text',8:'muted'}[v]||'muted'):'muted';
          t.text(bx+c*5+1,by+r*ch,String(text),fg,bg);
        }
        t.hit(bx+c*5,by+r*ch,4,ch,e=>cell(r,c,e.button));
      }
      t.text(ox+4,7,`10 MINA   /   ${state.flags.size} BAYROQ   /   ${state.opened.size}/71 OCHILDI`,'muted');
      if(state.result){t.text(ox+4,compact?19:26,state.result,'accent');t.button(ox+39,compact?20:26,18,'R  QAYTA',begin,true);}else t.text(ox+4,compact?20:26,'Chap bosish: ochish   O‘ng bosish / F: bayroq','muted');
    }
    function drawRunner(){
      const compact=t.height<28,bx=ox+4,by=compact?7:8,snake=state.game==='snake',h=snake?state.h:state.board.length,w=snake?state.w:state.board[0].length;
      for(let r=0;r<h;r++)for(let c=0;c<w;c++){
        let text='  ',fg='text',bg='panel',mask=null,detail='bg';
        if(snake){
          const idx=state.body.findIndex(([y,x])=>y===r&&x===c);
          if(idx>=0){
            const [dr,dc]=state.dir,head=dr<0?'up':dr>0?'down':dc<0?'left':'right';
            bg=idx===0?'accent':idx===state.body.length-1?'#207c72':'#309e8b';
            if(isAscii()){text=(idx===0?icons.head[head]:icons.body)+' ';fg='bg';}
            else if(idx===0){mask=sprites.head[head];fg='accent';}
          }else if(state.food[0]===r&&state.food[1]===c){if(isAscii())text=icons.food+' ';else{mask=['.#','##'];detail='accent';}fg='danger';}
        }else if(r===state.r&&c===state.c){if(isAscii())text=icons.player+' ';else{mask=['##','#.'];bg='#24564f';}fg='accent';}
        else if(r===h-2&&c===w-2){if(isAscii())text=icons.exit+' ';else mask=sprites.exit;fg='#ffcf7c';detail='accent';}
        else if(state.board[r][c]==='#'){text=icons.wall;fg='dark';}
        t.text(bx+c*2,by+r,text,fg,bg);if(mask)drawSprite(t,bx+c*2,by+r,mask,fg,bg,detail);
        t.hit(bx+c*2,by+r,2,1,e=>cell(r,c,e.button));
      }
      t.text(ox+4,compact?20:22,state.result||(snake?`HISOB ${state.score}   ${icons.food} oziq${state.paused?'   PAUZA':''}`:`QADAM ${state.moves}    ${icons.player} siz → ${icons.exit} chiqish`),'accent');
      const controlY=compact?21:24,dirs=[['↑',-1,0],['←',0,-1],['↓',1,0],['→',0,1]];dirs.forEach(([text,dr,dc],i)=>t.button(ox+4+i*7,controlY,6,text,()=>direction(dr,dc)));
      if(state.result)t.button(ox+35,controlY,20,'R  QAYTA',begin,true);else if(snake)t.button(ox+35,controlY,20,state.paused?'DAVOM ETISH':'PAUZA',()=>{state.paused=!state.paused;draw();});
      t.text(ox+4,compact?22:26,snake?'WASD / ↑↓←→ / tugmalar  |  Space: pauza':'WASD / ↑↓←→ / yon katakni bosing','muted');
    }
    process.once('SIGTERM',exit);process.once('SIGINT',exit);t.start();draw();
  });
}
module.exports={run};
