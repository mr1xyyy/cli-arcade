'use strict';
// Raster masks use the same block characters as the maze walls. Two vertical
// pixels share one terminal row, so no icon font or emoji sizing is involved.
const pieces={
  k:['  #  ',' ### ','#####','     '],
  q:['# # #','#####','#####','     '],
  r:['## ##',' ### ','#####','     '],
  b:['  ## ',' ### ','#####','     '],
  n:['  ###','## # ','#####','     '],
  p:[' ### ','  #  ',' ### ','     ']
};
const compactPieces={k:['  #  ',' ### '],q:['# # #','#####'],r:['## ##','#####'],b:['  ## ',' ##  '],n:['  ###','## # '],p:['  #  ',' ### ']};
const sprites={
  cross:['##   ##',' ## ## ','  ###  ','  ###  ',' ## ## ','##   ##'],
  circle:[' ##### ','##   ##','##   ##','##   ##','##   ##',' ##### '],
  checker:[' ### ','#####','#####',' ### '],
  king:['# # #','#####','# # #',' ### '],
  mine:[' # # ','#####','#####',' # # '],
  flag:['#### ','###  ','#    ','#    '],
  player:['##','##'],exit:['# ',' #'],food:[' #','# '],
  head:{up:['.#','##'],down:['##','#.'],left:['##','.#'],right:['##','#.']},
  game:{ttt:['# #',' # ','# #','   '],chess:[' ##','## ',' # ','###'],mines:[' # ','###','###',' # '],checkers:[' # ','###','###',' # '],snake:['## ',' ##','## ','   '],maze:['###','# #','#  ','###']}
};
function drawSprite(t,x,y,mask,fg,bg,details=fg){
  for(let r=0;r<mask.length;r+=2)for(let c=0;c<mask[0].length;c++){
    const pixel=(row)=>mask[row]?.[c]==='#'?fg:mask[row]?.[c]==='.'?details:bg;
    const top=pixel(r),bottom=pixel(r+1);
    if(top===bottom)t.text(x+c,y+r/2,' ',top,top);
    else t.text(x+c,y+r/2,'▀',top,bottom);
  }
}
module.exports={sprites,pieces,compactPieces,drawSprite};
