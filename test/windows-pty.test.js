const {test}=require('node:test');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('real Windows pseudoconsole accepts menu keys, mouse and Ctrl+C', {skip:process.platform!=='win32',timeout:25000},()=>{
  const quote=s=>"'"+s.replace(/'/g,"''")+"'";
  const script=`$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue';
    Add-Type -Path ${quote(path.join(__dirname,'..','fixtures','WindowsPty.cs'))};
    $pty = [WindowsPty]::new(${quote(process.execPath)},${quote(path.join(__dirname,'..','fixtures','console-cli.cjs'))});
    try {
      $pty.Expect('YINNI TANLANG',0,5000);
      $pty.Expect('KLAVIATURA + SICHQONCHA TAYYOR',0,5000);
      $mark=$pty.Mark; $pty.Send('1'); $pty.Expect('Kompyuterga', $mark, 4000);
      $mark=$pty.Mark; $pty.Send('2'); $pty.Expect('LOCAL MULTIPLAYER',$mark,4000);
      $mark=$pty.Mark; $pty.Send('1'); $pty.Expect('O navbati',$mark,4000);
      $mark=$pty.Mark; $pty.Send('q'); $pty.Expect('YINNI TANLANG',$mark,4000);
      $mark=$pty.Mark; $pty.Mouse(13,10,1);
      $pty.Expect('Qanday',$mark,4000);
      $mark=$pty.Mark; $pty.Send('2'); $pty.Expect('LOCAL MULTIPLAYER',$mark,4000);
      $mark=$pty.Mark;
      $pty.Mouse(18,10,1);
      $pty.Expect('O navbati',$mark,4000);
      $pty.Send([string][char]3); $pty.ExpectExit();
    } finally { $pty.Dispose(); }
    $pty = [WindowsPty]::new(${quote(process.execPath)},${quote(path.join(__dirname,'..','fixtures','console-cli.cjs'))});
    try {
      $pty.Expect('YINNI TANLANG',0,5000);
      $pty.Send([string][char]3); $pty.ExpectExit();
    } finally { $pty.Dispose(); }`;
  try{execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,encoding:'utf8',timeout:22000,stdio:['ignore','pipe','pipe']});}
  catch(e){throw Error(e.stderr?.match(/Missing [^<]{0,160}/)?.[0]||e.stderr?.slice(-1000)||e.message);}
});
