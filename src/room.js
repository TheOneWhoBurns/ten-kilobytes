const W=31,H=21;
function generate(seed,shapeKind){
  let state=2166136261;
  for(const c of String(seed))state=Math.imul(state^c.charCodeAt(0),16777619);
  const random=()=>{state+=0x6D2B79F5;let n=Math.imul(state^state>>>15,1|state);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};
  const int=(a,b)=>a+Math.floor(random()*(b-a+1));
  const cells=new Uint8Array(W*H),features=new Uint8Array(W*H),spawn={x:15.5,y:10.5};
  // Superellipses vary continuously from angular to rounded to squared.
  function shape(cx,cy,rx,ry,p){
    const result=[];
    for(let y=Math.max(1,Math.ceil(cy-ry));y<=Math.min(H-2,Math.floor(cy+ry));y++)for(let x=Math.max(1,Math.ceil(cx-rx));x<=Math.min(W-2,Math.floor(cx+rx));x++)
      if(Math.abs((x-cx)/rx)**p+Math.abs((y-cy)/ry)**p<=1)result.push(y*W+x);
    return result;
  }
  function carve(cx,cy,rx,ry,p){for(const n of shape(cx,cy,rx,ry,p))cells[n]=1;}
  const power=shapeKind===undefined?1.4+random()*3:1.4+shapeKind*1.3+random()*.4;
  // A screen-sized chamber with seed-carved obstacles and readable edge doors.
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)cells[y*W+x]=1;
  function connected(){
    const seen=new Set([10*W+15]),queue=[10*W+15];
    for(let i=0;i<queue.length;i++)for(const d of [-1,1,-W,W]){
      const n=queue[i]+d;if(cells[n]&&!seen.has(n)){seen.add(n);queue.push(n);}
    }
    return seen.size===cells.reduce((a,v)=>a+v,0);
  }
  const wanted=int(3,6);
  for(let attempt=0,placed=0;attempt<50&&placed<wanted;attempt++){
    const x=int(4,W-5),y=int(3,H-4),long=random()<.5,rx=long?int(2,4):1.5,ry=long?1.5:int(2,3);
    const cut=shape(x,y,rx,ry,power);
    if(!cut.length||cut.some(n=>Math.hypot(n%W-15,Math.floor(n/W)-10)<3.5||[-1,0,1,-W,W,-W-1,-W+1,W-1,W+1].some(d=>!cells[n+d])))continue;
    for(const n of cut)cells[n]=0;
    if(!connected()){for(const n of cut)cells[n]=1;continue;}
    const material=random()<.5?1:2;
    for(const n of cut)features[n]=material;
    placed++;
  }
  // Remove any diagonal-only fringe created by rasterizing a rounded lobe.
  const queue=[10*W+15],seen=new Set(queue);
  for(let i=0;i<queue.length;i++)for(const d of [-1,1,-W,W]){
    const n=queue[i]+d;if(cells[n]&&!seen.has(n)){seen.add(n);queue.push(n);}
  }
  for(let n=0;n<cells.length;n++)if(cells[n]&&!seen.has(n))cells[n]=0;
  return {cells,features,spawn,tone:int(0,2),detail:state>>>0};
}
function canFit(cells,x,y){
  const radius=.27;
  for(const yy of [y-radius,y+radius])for(const xx of [x-radius,x+radius])
    if(xx<0||yy<0||xx>=W||yy>=H||!cells[Math.floor(yy)*W+Math.floor(xx)])return false;
  return true;
}
function movePlayer(cells,p,dx,dy,dt){
  const length=Math.hypot(dx,dy);
  if(!length)return;
  const distance=5*Math.min(dt,.05),steps=Math.ceil(distance/.1);
  dx=dx/length*distance/steps;dy=dy/length*distance/steps;
  for(let i=0;i<steps;i++){
    if(canFit(cells,p.x+dx,p.y))p.x+=dx;
    if(canFit(cells,p.x,p.y+dy))p.y+=dy;
  }
}
