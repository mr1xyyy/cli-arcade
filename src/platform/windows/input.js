'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');

function windowsInput({onReady,onActive,onInput,onData,onResize,onFail}) {
  const source=path.join(__dirname,'WindowsInput.cs').replace(/'/g,"''");
  const command=`$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Add-Type -Path '${source}'; [CliInput]::Run(${process.pid})`;
  let helper,stopped=false,settled=false,timeout,buffer='';
  function fail(){if(stopped||settled)return;settled=true;clearTimeout(timeout);helper?.kill();onFail();}
  try {
    helper=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    helper.on('error',fail);helper.on('exit',fail);helper.stdin.on('error',fail);helper.stderr.resume();
    helper.stdout.setEncoding('utf8');helper.stdout.on('data',chunk=>{
      if(stopped||settled)return;buffer+=chunk;
      let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);
        if(line==='READY'){onReady();process.nextTick(()=>{if(!stopped&&!settled)helper.stdin.write('GO\n');});}
        else if(line==='ACTIVE'){clearTimeout(timeout);onActive();}
        else if(line==='RESIZE')onResize();
        else if(line.startsWith('K;'))onData(Buffer.from(line.slice(2),'base64').toString('utf8'));
        else if(/^M;\d+;\d+;[02]$/.test(line)){const [,x,y,button]=line.split(';').map(Number);onInput({type:'mouse',x,y,button});}
      }
    });
    timeout=setTimeout(fail,5000);
  }catch{fail();}
  return ()=>{stopped=true;clearTimeout(timeout);helper?.kill();};
}
module.exports={windowsInput};
