// One authoritative grid: 0 wall, 1 floor, 2 fixture, 4 water.
// Only value 1 is walkable. Appearance and collision use the same cell type.
function randomFor(value){let s=0;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const W=31,H=21;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
// A tile index stores a room spawn; entity positions use the tile center.
function tilePoint(n){return{x:n%W+.5,y:(n/W|0)+.5};}
// Connected random tunnelling: variable brush widths create pockets, ribbons and caves.
function generate(random,shapeKind){
 const int=n=>Math.floor(random()*n),cells=new Uint8Array(W*H),props=[],spawn=325,tone=shapeKind===undefined?int(3):shapeKind,cut=[],target=140+int(180),style=int(3);
 let x=15,y=10,dx=1,dy=0,r=3;
 for(let step=0;step<2000&&cut.length<target;step++){
  for(let yy=Math.max(1,y-r);yy<=Math.min(H-2,y+r);yy++)for(let xx=Math.max(1,x-r);xx<=Math.min(W-2,x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r){const n=yy*W+xx;if(!cells[n]){cells[n]=1;cut.push(n);}}
  if(step%20===0){const n=cut[int(cut.length)];x=n%W;y=n/W|0;r=style?1+int(style+1):int(2);}
  if(random()<.3)[dx,dy]=directions[int(4)];
  x=Math.max(1,Math.min(W-2,x+dx));y=Math.max(1,Math.min(H-2,y+dy));
 }
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const n=y*W+x,edge=[-1,1,-W,W].some(d=>cells[n+d]===1);
  if(!cells[n]){if(tone===1)cells[n]=4;else if(edge&&random()<.12){cells[n]=2;props.push({x,y,t:tone*6+int(2)});}}
  else if(Math.hypot(x-15,y-10)>4&&[-1,1,-W,W].some(d=>cells[n+d]!==1)&&random()<.14)props.push({x,y,t:tone*6+[2,4,5][int(3)]});
 }
 return{cells,props,spawn,tone};
}
function canFit(cells,x,y){
  const radius=.27;
  for(const yy of [y-radius,y+radius])for(const xx of [x-radius,x+radius])
    if(xx<0||yy<0||xx>=W||yy>=H||cells[Math.floor(yy)*W+Math.floor(xx)]!==1)return false;
  return true;
}
function movePlayer(cells,p,dx,dy,dt,speed=5){
  const length=Math.hypot(dx,dy);
  if(!length)return;
  const distance=speed*Math.min(dt,.05),steps=Math.ceil(distance/.1);
  dx=dx/length*distance/steps;dy=dy/length*distance/steps;
  for(let i=0;i<steps;i++){
    if(canFit(cells,p.x+dx,p.y))p.x+=dx;
    if(canFit(cells,p.x,p.y+dy))p.y+=dy;
  }
}
