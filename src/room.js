// Bit zero is walkability. The upper seven bits store decoration index + 1.
// Bit zero determines walkability; appearance and collision share one grid.
function randomFor(value){let s=0;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const W=31,H=21;
let rng;
function pick(n){return rng()*n|0;}
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
// A tile index stores a room spawn; entity positions use the tile center.
function tilePoint(n){return{x:n%W+.5,y:(n/W|0)+.5};}
// Connected frontier growth: the bias varies between branching patches and narrow paths.
function generate(random){
 rng=random;
 const cells=new Uint8Array(W*H),spawn=325;
 patch(325,140+pick(180),n=>!cells[n]&&n>W&&n<(H-1)*W&&n%W>0&&n%W<W-1&&(cells[n]=1),rng()*.95);
 // 3.1 includes the integer radius-three boundary, but no extra grid cells.
 fillShape(cells,3.1,3.1);
 return{cells,spawn};
}
// The arrival pocket, boss arena and exit chamber share one superellipse brush.
function fillShape(cells,a,b,p=2,merge=1){
 for(let n=0;n<W*H;n++)cells[n]=(merge&&cells[n])|+(Math.abs((n%W-15)/a)**p+Math.abs(((n/W|0)-10)/b)**p<1);
}
function canFit(cells,x,y){
  const radius=.27;
  for(const yy of [y-radius,y+radius])for(const xx of [x-radius,x+radius])
    if(xx<0||yy<0||xx>=W||yy>=H||!(cells[Math.floor(yy)*W+Math.floor(xx)]&1))return false;
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

// One connected growth primitive makes both room outlines and large hazard patches.
// take(n) claims a cell once using the caller's existing grid or available set.
// Both callers accept only interior cells, so expanding a node cannot wrap a row.
function patch(start,count,take,bias=0){
 const edge=[start],out=[];
 while(edge.length&&out.length<count){const n=edge.splice(rng()<bias?-1:pick(edge.length),1)[0];if(!take(n))continue;out.push(n);edge.push(n-1,n+1,n-W,n+W);}
 return out;
}
