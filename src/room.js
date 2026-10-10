function geomDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function geomBearing(a,b){return Math.atan2(a.y-b.y,a.x-b.x)}
// Bit zero is walkability. The upper seven bits store decoration index + 1.
// Bit zero determines walkability; appearance and collision share one grid.
function randomFor(value){let s=0;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const W=31,H=21;
let rng;
function pick(n){return rng()*n|0;}
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
// A tile index stores a room spawn; entity positions use the tile center.
function tilePoint(n){return{x:n%W+.5,y:(n/W|0)+.5};}
function generate(random,doors=[]){
 rng=random;
 const cells=new Uint8Array(W*H),spawn=325,safe=new Uint8Array(W*H);fillShape(cells,4,4);
 for(const p of [...doors.map(d=>{const [x,y]=directions[d.dir];return{x:d.x-x*2,y:d.y-y*2};})])tunnel(cells,p.x|0,p.y|0,safe);
 for(let i=32;i--;)tunnel(cells,2+pick(W-4),2+pick(H-4),0);
 return{cells,spawn,safe};
}
function tunnel(cells,x,y,safe=new Uint8Array(W*H)){while(x!==15||y!==10){const n=y*W+x;cells[n]|=1;if(safe)safe[n]=1;if(x!==15&&(y===10||rng()<.5))x+=(x<15?1:-1);else y+=(y<10?1:-1);}}
// The arrival pocket, boss arena and exit chamber share one superellipse brush.
function fillShape(cells,a,b,p=2,merge=1){
 for(let n=0;n<W*H;n++)cells[n]=(merge&&cells[n])|+(((n%W-15)/a)**p+(((n/W|0)-10)/b)**p<1);
}
function canFit(cells,x,y,radius=.27){
  for(const yy of [y-radius,y+radius])for(const xx of [x-radius,x+radius])
    if(xx<0||yy<0||xx>=W||yy>=H||!(cells[(yy|0)*W+(xx|0)]&1))return false;
  return true;
}
function movePlayer(cells,p,dx,dy,dt,speed=5){
 const distance=speed*Math.min(dt,.05)/(Math.hypot(dx,dy)||1);dx*=distance;dy*=distance;
 if(canFit(cells,p.x+dx,p.y))p.x+=dx;
 if(canFit(cells,p.x,p.y+dy))p.y+=dy;
}


function patch(available,count){
 const out=[],edge=[sample([...available])];
 while(edge.length&&out.length<count){const n=edge.splice(pick(edge.length),1)[0];if(!available.delete(n))continue;out.push(n);edge.push(n-1,n+1,n-W,n+W);}
 return out;
}

function neighbors(n){return[n%W<W-1?n+1:-1,n%W?n-1:-1,n+W,n-W];}
function flood(cells,root){const values=new Int16Array(W*H),queue=[root];values[root]=1;for(const n of queue){for(const k of neighbors(n))if((cells[k]&1)&&!values[k]){values[k]=values[n]+1;queue.push(k);}}return values;}

function sample(a){return a[pick(a.length)];}
