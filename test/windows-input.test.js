const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const cp=require('node:child_process');

function withSpawn(spawn,fn){
  const original=cp.spawn,modulePath=require.resolve('../src/platform/windows/input.js');
  try{cp.spawn=spawn;delete require.cache[modulePath];return fn(require('../src/platform/windows/input.js').windowsInput);}
  finally{cp.spawn=original;delete require.cache[modulePath];}
}
test('Windows input waits for a handshake, forwards events and falls back once on failure',async()=>{
  const helper=new EventEmitter();helper.stdin=new PassThrough();helper.stdout=new PassThrough();helper.stderr=new PassThrough();helper.kill=()=>{};
  const events=[];let command='';helper.stdin.on('data',d=>{command+=d;});
  const stop=withSpawn(()=>helper,windowsInput=>windowsInput({onReady:()=>events.push('pause'),onActive:()=>events.push('active'),onFail:()=>events.push('fallback'),onData:s=>events.push(s),onInput:e=>events.push(e),onResize:()=>events.push('resize')}));
  assert.deepEqual(events,[]);assert.equal(command,'');
  helper.stdout.write('REA');assert.deepEqual(events,[]);helper.stdout.write('DY\n');
  await new Promise(r=>setImmediate(r));assert.equal(command,'GO\n');assert.deepEqual(events,['pause']);
  helper.stdout.write('ACTIVE\nK;MQ==\nM;13;10;0\nRESIZE\n');
  assert.deepEqual(events.slice(1),['active','1',{type:'mouse',x:13,y:10,button:0},'resize']);
  helper.emit('exit',1);helper.emit('error',Error('disconnected'));assert.equal(events.filter(e=>e==='fallback').length,1);stop();
});
test('blocked helper launch immediately falls back without disabling keyboard',()=>{
  let fallback=0,paused=0;
  const stop=withSpawn(()=>{throw Error('EPERM');},windowsInput=>windowsInput({onReady:()=>paused++,onFail:()=>fallback++}));
  assert.equal(fallback,1);assert.equal(paused,0);assert.doesNotThrow(stop);
});
