const {test}=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const {session}=require('../src/network/connection.js');
test('full-screen multiplayer transport syncs moves, rejects illegal input and closes', {timeout:6000},async t=>{
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  let hostState,guestState,guestNotice='',disconnected=false,ready=false;
  const host=session({hosting:true,game:'ttt',port,onState:s=>{hostState=s;},onNotice:()=>{ready=true;},onClose:()=>{disconnected=true;}});t.after(()=>host.close());
  async function until(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail('TCP event timed out');}
  await until(()=>ready);
  const guest=session({hosting:false,host:'127.0.0.1',port,onState:s=>{guestState=s;},onNotice:msg=>{guestNotice=msg;},onClose:()=>{}});t.after(()=>guest.close());
  await until(()=>hostState&&guestState);assert.equal(guestState.game,'ttt');
  host.play('1');await until(()=>guestState.turn===1);guest.play('1');await until(()=>guestNotice.includes('Bo‘sh'));assert.equal(hostState.turn,1);
  guest.play('4');await until(()=>hostState.turn===0);host.play('2');await until(()=>guestState.turn===1);guest.play('5');await until(()=>hostState.turn===0);host.play('3');await until(()=>guestState.result);assert.match(guestState.result,/X yutdi/);
  guest.close();await until(()=>disconnected);
});
