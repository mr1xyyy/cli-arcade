'use strict';
const ESC='\x1b[';
const same=(a,b)=>a.text===b.text&&a.fg===b.fg&&a.bg===b.bg;

// Compose every layer in memory before emitting changed cells. Erasing and
// drawing sprites never exposes an intermediate blank screen to the terminal.
class Screen {
  constructor(width,height,fg,bg){
    this.width=width;this.height=height;this.fg=fg;this.bg=bg;
    this.blank={text:' ',fg,bg};this.cells=Array(width*height).fill(this.blank);
  }
  text(x,y,text,fg=this.fg,bg=this.bg){
    if(y<1||y>this.height)return;
    let col=x-1;
    for(const ch of String(text)){
      if(/\p{Mark}/u.test(ch)){
        if(col>0&&col<=this.width){const i=(y-1)*this.width+col-1;this.cells[i]={...this.cells[i],text:this.cells[i].text+ch};}
        continue;
      }
      if(col>=this.width)break;
      if(col>=0)this.cells[(y-1)*this.width+col]={text:ch,fg:ch===' '?this.fg:fg,bg};
      col++;
    }
  }
  diff(previous){
    const reset=!previous||previous.width!==this.width||previous.height!==this.height;
    let output=reset?`${ESC}48;2;${this.bg}m${ESC}2J`:'',lastFg,lastBg;
    const before=reset?null:previous.cells;
    for(let r=0;r<this.height;r++)for(let c=0;c<this.width;){
      const i=r*this.width+c,cell=this.cells[i];
      if(same(cell,before?before[i]:this.blank)){c++;continue;}
      const start=c;let run='';
      while(c<this.width){
        const j=r*this.width+c,next=this.cells[j];
        if(next.fg!==cell.fg||next.bg!==cell.bg||same(next,before?before[j]:this.blank))break;
        run+=next.text;c++;
      }
      output+=`${ESC}${r+1};${start+1}H`;
      if(lastFg!==cell.fg){output+=`${ESC}38;2;${cell.fg}m`;lastFg=cell.fg;}
      if(lastBg!==cell.bg){output+=`${ESC}48;2;${cell.bg}m`;lastBg=cell.bg;}
      output+=run;
    }
    return output?output+`${ESC}0m`:'';
  }
}
module.exports={Screen};
