const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
test('two CLI processes play over TCP; host validates remote moves', {timeout:15000},async t=>{
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  function client(){
    const p=spawn(process.execPath,[path.join(__dirname,'..','bin','cli.js')],{stdio:['pipe','pipe','pipe']});let output='';const listeners=new Set();
    p.stdout.on('data',d=>{output+=d;for(const f of listeners)f();});p.stderr.on('data',d=>{output+=d;});
    t.after(()=>p.kill());
    return {send:s=>p.stdin.write(s+'\n'),wait:text=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{listeners.delete(check);reject(Error(`Missing ${text}: ${output}`));},4000);function check(){if(output.includes(text)){output=output.slice(output.indexOf(text)+text.length);clearTimeout(timer);listeners.delete(check);resolve();}}listeners.add(check);check();})};
  }
  const host=client();await host.wait('Tanlang:');host.send('1');await host.wait('Rejim:');host.send('2');await host.wait('Port [4040]:');host.send(String(port));await host.wait('raqib kutilmoqda');
  const guest=client();await guest.wait('Tanlang:');guest.send('2');await guest.wait('Rejim:');guest.send('3');await guest.wait('Host IP');guest.send('127.0.0.1');await guest.wait('Port [4040]:');guest.send(String(port));
  await host.wait('Sizning navbatingiz');await guest.wait('Raqib yurishini');host.send('1');await guest.wait('Sizning navbatingiz');guest.send('1');await guest.wait('Bo‘sh katak');guest.send('4');await host.wait('Sizning navbatingiz');host.send('2');await guest.wait('Sizning navbatingiz');guest.send('5');await host.wait('Sizning navbatingiz');host.send('3');await host.wait('X yutdi!');await guest.wait('X yutdi!');guest.send('q');await host.wait('Raqib uzildi');assert.ok(true);
});
