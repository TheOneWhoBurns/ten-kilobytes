// Snap the generated sheet to the game's binary pixel grid; preserve Urizen's original walk.
const fs=require('node:fs'),{PNG}=require('pngjs');
const generated=PNG.sync.read(fs.readFileSync('assets/generated/104-clean-sheet.png'));
const original=PNG.sync.read(fs.readFileSync('assets/source/urizen.png'));
const out=new PNG({width:72,height:48});
function white(p,x,y){const n=(y*p.width+x)*4;return p.data[n+3]>127&&p.data[n]>127;}
function put(col,row,x,y,on){const n=((row*12+y)*out.width+col*12+x)*4;out.data[n]=out.data[n+1]=out.data[n+2]=255;out.data[n+3]=on?255:0;}
for(let row=0;row<3;row++)for(let col=0;col<6;col++){
 const x0=Math.floor(col*generated.width/6),x1=Math.floor((col+1)*generated.width/6),y0=[0,335,595][row],y1=[335,595,generated.height][row];
 let left=x1,right=x0,top=y1,bottom=y0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(white(generated,x,y)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 // Register every head to the same center and explicitly retain the original neck gap.
 let headLeft=right,headRight=left;
 for(let x=left;x<=right;x++)if(white(generated,x,top+5)){headLeft=Math.min(headLeft,x);headRight=Math.max(headRight,x);}
 const center=(headLeft+headRight+1)/2,unit=(headRight-headLeft+1)/3;
 let gap=-1;
 for(let y=top+Math.floor((bottom-top)*.3);y<top+(bottom-top)*.6;y++){
  let ink=0;for(let x=left;x<=right;x++)ink+=white(generated,x,y);
  if(!ink){gap=y;break;}
 }
 if(gap<0)gap=top+Math.round((bottom-top)*.42);
 let body=gap;while(body<bottom&&!Array.from({length:right-left+1},(_,i)=>white(generated,left+i,body)).some(Boolean))body++;
 const crouch=col===5,headY=crouch?3:1,bodyY=crouch?8:6;
 for(let y=headY;y<12;y++)for(let x=0;x<12;x++){
  if(y===bodyY-1)continue;
  const sy=y<bodyY?Math.floor(top+(y-headY+.5)*(gap-top)/4):Math.floor(body+(y-bodyY+.5)*(bottom-body+1)/(12-bodyY));
  const sx=Math.floor(center+(x-6)*unit);
  if(sx>=x0&&sx<x1&&sy>=y0&&sy<y1)put(col,row===0?0:row+1,x,y,white(generated,sx,sy));
 }

}
// Original idle and two original leg poses, not generated approximations.
for(let col=0;col<3;col++)for(let y=0;y<12;y++)for(let x=0;x<12;x++)put(col,0,x,y,white(original,1+(104+col)*13+11-x,1+46*13+y));
// Generated action heads reversed the facial silhouette. Reuse the original head
// across every side pose so attacking cannot appear to turn the character around.
for(const col of [3,4])for(let y=0;y<6;y++)for(let x=0;x<12;x++)put(col,0,x,y,white(out,x,y));
// The generated pickup leaned backward: reflect its body, then lower the same
// right-facing head into the crouch. The full left row is reflected below.
const pickup=Array.from({length:144},(_,i)=>white(out,60+i%12,Math.floor(i/12)));
for(let y=0;y<12;y++)for(let x=0;x<12;x++)put(5,0,x,y,y>=8?pickup[y*12+11-x]:y>=2&&y<7?white(out,x,y-2):false);
// Left is an exact reflection and costs no additional design variation.
for(let col=0;col<6;col++)for(let y=0;y<12;y++)for(let x=0;x<12;x++)put(col,1,x,y,white(out,col*12+11-x,y));
// User correction: swap only idle + walking left/right; retain action poses.
for(let col=0;col<3;col++)for(let y=0;y<12;y++)for(let x=0;x<12;x++){
 const a=white(out,col*12+x,y),b=white(out,col*12+x,12+y);
 put(col,0,x,y,b);put(col,1,x,y,a);
}
fs.writeFileSync('assets/generated/104-sheet.png',PNG.sync.write(out));
const preview=new PNG({width:864,height:576});for(let y=0;y<preview.height;y++)for(let x=0;x<preview.width;x++){const n=(y*preview.width+x)*4,s=(Math.floor(y/12)*out.width+Math.floor(x/12))*4,on=out.data[s+3]>0;preview.data[n]=on?239:16;preview.data[n+1]=on?239:19;preview.data[n+2]=on?219:16;preview.data[n+3]=255;}
fs.writeFileSync('assets/generated/104-sheet-preview.png',PNG.sync.write(preview));
console.log('104 sheet: 24 frames, 12×12, 432 bytes before compression');
