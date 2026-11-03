'use strict';
// ASCII labels are used in legends and the optional text-only view. The
// default board icons are raster masks from sprites.js, not font glyphs.
let ascii=process.argv.includes('--ascii-icons')||process.env.CLI_ASCII_ICONS==='1';
const letters=Object.fromEntries([...'KQRBNPkqrbnp'].map(p=>[p,p]));
const classic={
  game:{ttt:'X/O',chess:'K/Q',mines:'[*]',checkers:'(o)',snake:'~o>',maze:'[#]'},
  cross:'X',circle:'O',checker:{M:'o',m:'x',K:'O',k:'X'},mine:'*',flag:'F',hidden:'.',food:'*',body:'o',head:{up:'^',down:'v',left:'<',right:'>'},player:'@',exit:'E',wall:'##',target:'.'
};
// Avoid uncommon draughts symbols and emoji-like triangles/flags by default.
// Familiar single-column symbols stay legible across terminal font fallbacks.
const standard={...classic,game:{...classic.game,chess:'K/Q'},hidden:'·',wall:'██',target:'•'};
const icons={},chess={};
function setAscii(value){ascii=Boolean(value);Object.assign(icons,ascii?classic:standard);Object.assign(chess,letters);}
function toggleIcons(){setAscii(!ascii);}
setAscii(ascii);
module.exports={icons,chess,toggleIcons,isAscii:()=>ascii};
