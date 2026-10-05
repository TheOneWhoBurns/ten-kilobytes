// One authoritative grid: 0 wall, 1 floor, 2 fixture, 4 water.
// Only value 1 is walkable. Appearance and collision use the same cell type.
function randomFor(value){let s=0;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const W=31,H=21;
// Functional bays share a circulation spine; damage interrupts their original rhythm.
function generate(seed,shapeKind){
 const random=randomFor(seed),int=n=>Math.floor(random()*n);
 const cells=new Uint8Array(W*H),props=[],spawn={x:15.5,y:10.5},tone=shapeKind===undefined?int(3):shapeKind,condition=int(3);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)cells[y*W+x]=1;
 const add=(x,y,t)=>props.push({x,y,t});
 const bays=2+int(3),gap=Math.floor(23/bays),damaged=int(bays);
 for(const side of [-1,1])for(let bay=0;bay<bays;bay++){
  const x=4+bay*gap,y=side<0?3+int(2):14,w=tone===2?gap-2:2+int(Math.max(1,gap-3)),h=tone===0?2:tone===1?4:1+int(2),breakAt=int(h)*w,ruined=bay===damaged;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
   const xx=x+i,yy=y+j,n=yy*W+xx;
   if(ruined&&(i+j*w===breakAt||condition===2&&i===0)){add(xx,yy,3+tone*6);continue;}
   cells[n]=tone===1?4:2;
   if(tone!==1)add(xx,yy,tone*6+(tone===0?int(2):0));
  }
  add(x-1,y+1,tone*6+2);
  if(condition===1)add(x+w,y+h-1,tone*6+4);
  if(condition===2)for(let k=0;k<3;k++)add(x-1-k,y,tone*6+3+k%3);
 }
 // Additional functional fixtures stay outside the central route and door approaches.
 for(let y=3;y<19;y+=3)for(const x of [2,28])if(random()<.65)add(x,y,tone*6+2+int(4));
 return{cells,props,spawn,tone,condition,detail:Math.floor(random()*4294967296)};
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
