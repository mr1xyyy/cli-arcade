'use strict';
const net=require('node:net');
const {initial,move}=require('../games/engine.js');
function session({hosting,host='127.0.0.1',port=4040,game,onState,onNotice,onClose}) {
  let server,socket,state,ready=false,closed=false,buffer='';
  const send=msg=>{if(socket&&!socket.destroyed)socket.write(JSON.stringify(msg)+'\n');};
  function close(reason){if(closed)return;closed=true;socket?.destroy();server?.close();if(reason)onClose(reason);}
  function commit(input){try{state=move(state,input);send({type:'state',state});onState(state);}catch(e){onNotice(e.message);send({type:'error',message:e.message});}}
  function attach(s){
    if(closed){s.destroy();return;}if(ready){s.end();return;}ready=true;socket=s;buffer='';s.setEncoding('utf8');s.setNoDelay(true);s.setTimeout(0);
    s.on('error',e=>close(e.message));s.on('close',()=>close('Raqib uzildi.'));
    s.on('data',chunk=>{
      buffer+=chunk;if(buffer.length>65536){close('Xabar juda katta.');return;}
      let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{
        const msg=JSON.parse(line);
        if(hosting){if(msg.type==='move'&&state.turn===1&&typeof msg.input==='string'&&msg.input.length<100)commit(msg.input);}
        else if(msg.type==='state'){
          const n=msg.state;
          if(!n||!['ttt','chess','checkers'].includes(n.game)||![0,1].includes(n.turn)||!Array.isArray(n.board))throw Error();
          if(n.game==='ttt'?(n.board.length!==9||!n.board.every(p=>['.','X','O'].includes(p))):(n.board.length!==8||!n.board.every(row=>Array.isArray(row)&&row.length===8&&row.every(p=>typeof p==='string'&&/^[.prnbqkPRNBQKmM]$/.test(p)))))throw Error();
          state=n;onState(state);
        }else if(msg.type==='error')onNotice(String(msg.message).slice(0,120));
      }catch{close('Noto‘g‘ri tarmoq xabari.');return;}}
    });
    if(hosting){state=initial(game);send({type:'state',state});onState(state);}
  }
  if(hosting){server=net.createServer(attach);server.on('error',e=>close(e.message));server.listen(port,'0.0.0.0',()=>onNotice(`Port ${port}: raqib kutilmoqda...`));}
  else{socket=net.createConnection({host,port});socket.on('error',e=>close(e.message));socket.setTimeout(15000,()=>close('Ulanish vaqti tugadi.'));socket.on('connect',()=>attach(socket));}
  return {close,play(input){if(!ready||!state||state.result||state.turn!==(hosting?0:1)){onNotice('Raqib navbati.');return;}if(hosting)commit(input);else send({type:'move',input});}};
}
module.exports={session};
