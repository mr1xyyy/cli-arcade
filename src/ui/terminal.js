'use strict';
const ESC='\x1b[';
const {Screen}=require('./screen.js');
const palette={bg: '#0b1020',panel:'#151f36',muted:'#8293b0',text:'#e6edf9',accent:'#61e5c1',blue:'#7baaff',danger:'#ff7c93',light:'#b5c7df',dark:'#293d5b',selected:'#b98bfa'};
const rgb=hex=>hex.replace('#','').match(/../g).map(x=>parseInt(x,16)).join(';');
const color=(text,fg='text',bg='bg')=>`${ESC}38;2;${rgb(palette[fg]||fg)}m${ESC}48;2;${rgb(palette[bg]||bg)}m${text}${ESC}0m`;
// Variation selectors and combining marks modify a glyph, not its cell width.
function clipText(text,columns){let out='',width=0;for(const ch of String(text)){const n=/\p{Mark}/u.test(ch)?0:1;if(width+n>columns)break;out+=ch;width+=n;}return out;}

// A streaming decoder keeps split mouse/escape sequences intact.
class InputDecoder {
  constructor(emit){this.emit=emit;this.buffer='';}
  feed(chunk) {
    if(chunk.toString().includes('\x03')){this.buffer='';this.emit({type:'key',name:'exit',text:'\x03'});return;}
    this.buffer+=chunk.toString();
    while(this.buffer) {
      if(this.buffer==='\x1b')return;
      if(this.buffer.startsWith('\x1b[M')){
        if(this.buffer.length<6)return;
        const code=this.buffer.charCodeAt(3)-32,x=this.buffer.charCodeAt(4)-32,y=this.buffer.charCodeAt(5)-32;
        this.buffer=this.buffer.slice(6);
        if((code&3)!==3&&(code&32)===0&&(code&64)===0)this.emit({type:'mouse',x,y,button:code&3});
        continue;
      }
      if(this.buffer.startsWith('\x1b[<')) {
        const m=this.buffer.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
        if(!m){if(this.buffer.length<40)return;this.buffer='';return;}
        this.buffer=this.buffer.slice(m[0].length);
        const code=Number(m[1]);if(m[4]==='M'&&(code&32)===0&&(code&64)===0)this.emit({type:'mouse',x:Number(m[2]),y:Number(m[3]),button:code&3});
        continue;
      }
      if(this.buffer.startsWith('\x1b[')||this.buffer.startsWith('\x1bO')) {
        const m=this.buffer.match(/^\x1b(?:\[[0-9;]*|O)([A-Za-z~])/);
        if(!m)return;
        this.buffer=this.buffer.slice(m[0].length);const name={A:'up',B:'down',C:'right',D:'left',H:'home',F:'end'}[m[1]];
        if(name)this.emit({type:'key',name});continue;
      }
      const ch=[...this.buffer][0];this.buffer=this.buffer.slice(ch.length);
      this.emit({type:'key',name:({'\r':'enter','\n':'enter','\x7f':'backspace','\b':'backspace','\x03':'exit','\x1b':'escape',' ':'space','\t':'tab'})[ch]||ch.toLowerCase(),text:ch});
    }
  }
  flushEscape(){const standalone=this.buffer==='\x1b';if(this.buffer.startsWith('\x1b'))this.buffer='';if(standalone)this.emit({type:'key',name:'escape',text:'\x1b'});}
}
class Terminal {
  constructor(onInput){this.onInput=onInput;this.hits=[];this.decoder=new InputDecoder(e=>this.onInput(e));this.data=d=>{clearTimeout(this.escapeTimer);this.decoder.feed(d);this.escapeTimer=setTimeout(()=>this.decoder.flushEscape(),35);};this.resize=()=>this.render?.();}
  start(){
    process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');
    process.stdin.on('data',this.data);process.stdin.resume();
    process.stdout.on('resize',this.resize);process.stdout.write(`${ESC}?1049h${ESC}?25l${ESC}?1000h${ESC}?1006h`);
    this.previous=null;
    this.inputStatus='KLAVIATURA TAYYOR';
    if(process.platform==='win32')this.stopHelper=require('../platform/windows/input.js').windowsInput({
      onReady:()=>{process.stdin.pause();process.stdin.removeListener('data',this.data);},
      onActive:()=>{process.stdout.write(`${ESC}?1000h${ESC}?1006h`);this.inputStatus='KLAVIATURA + SICHQONCHA TAYYOR';this.resize();},
      onInput:e=>this.onInput(e),onData:this.data,onResize:this.resize,
      onFail:()=>{process.stdin.setRawMode(false);process.stdin.setRawMode(true);process.stdin.removeListener('data',this.data);process.stdin.on('data',this.data);process.stdin.resume();this.inputStatus='KLAVIATURA TAYYOR / SGR';this.resize();}
    });
  }
  stop(){clearTimeout(this.escapeTimer);this.stopHelper?.();process.stdin.removeListener('data',this.data);process.stdout.removeListener('resize',this.resize);process.stdin.setRawMode(false);process.stdin.pause();process.stdin.unref?.();process.stdout.write(`${ESC}?1006l${ESC}?1000l${ESC}?25h${ESC}?1049l${ESC}0m`);}
  begin(){this.hits=[];this.width=process.stdout.columns||90;this.height=process.stdout.rows||30;this.frame=new Screen(this.width,this.height,rgb(palette.text),rgb(palette.bg));}
  text(x,y,text,fg='text',bg='bg'){this.frame.text(x,y,text,rgb(palette[fg]||fg),rgb(palette[bg]||bg));}
  hit(x,y,w,h,action){this.hits.push({x,y,w,h,action});}
  button(x,y,w,text,action,active=false){this.text(x,y,' '+text.padEnd(w-2).slice(0,w-2)+' ',active?'bg':'text',active?'accent':'panel');this.hit(x,y,w,1,action);}
  click(e){const hit=this.hits.findLast(h=>e.x>=h.x&&e.x<h.x+h.w&&e.y>=h.y&&e.y<h.y+h.h);return hit?.action;}
  end(){const patch=this.frame.diff(this.previous);this.previous=this.frame;if(patch)process.stdout.write(patch);}
}
module.exports={Terminal,InputDecoder,color,clipText};
