const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),keys=new Set();
ctx.imageSmoothingEnabled=false;
const atlas=document.createElement('canvas'),art=atlas.getContext('2d');
const background=document.createElement('canvas');background.width=372;background.height=252;
const floor=background.getContext('2d');
let room,player,sprite=104,last=0,seed,dev;
function tile(c,index,x,y){c.drawImage(atlas,index*12,0,12,12,x,y,12,12);}
function writeTiles(text,x,y){
 for(const c of text){const i=assets.letters.indexOf(c);if(i>=0)tile(ctx,assets.font+i,x*12,y*12);else if(DEV&&c!==' '){ctx.font='12px monospace';ctx.fillStyle='#e7e5ce';ctx.fillText(c,x*12,y*12+12);}x++;}
}
function reset(fresh=false){
  if(fresh){const n=new Uint32Array(1);crypto.getRandomValues(n);seed=n[0];if(DEV)$('seed').value=seed;}
  level=0;chamber=0;health=2;hitFlash=0;weapon=0;temper=0;world=makeEntrance();makeActor();enterRoom();
}
function enterRoom(from){
  keys.clear();navSolid=navDistances=null;room=world.rooms[chamber];player={...room.spawn};shots=[];hurt=1;travel=0;resetActions();
  const door=room.doors.find(d=>d.to===from);if(door){const [dx,dy]=directions[door.dir];player.x=door.x-dx*1.5;player.y=door.y-dy*1.5;facing=Math.atan2(-dy,-dx);}
  if(!level)facing=0;
  room.visited=true;
  art.globalCompositeOperation='source-atop';
  for(const [start,count,color] of [[assets.pantry,24,worldColor(38,25)],[assets.weapon,assets.weaponCount,'#bdeddf'],[assets.enemies,assets.enemyCount,worldColor(76,180)],[assets.bosses,4,'#edc9d3']]){art.fillStyle=color;art.fillRect(start*12,0,count*12,12);}for(let i=0;i<18;i++)if(i%6>1){art.fillStyle=i===2?'#d7b77c':worldColor(38,80);art.fillRect((assets.pantry+i)*12,0,12,12);}art.globalCompositeOperation='source-over';
  floor.fillStyle='#080c14';floor.fillRect(0,0,372,252);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const n=y*W+x,px=x*12,py=y*12;
   if(room.cells[n]===1){
    floor.fillStyle=worldColor(14);floor.fillRect(px,py,12,12);
    floor.globalAlpha=.09;tile(floor,assets.pantry+18+world.shape,px,py);floor.globalAlpha=1;
    if(room.cells[n-W]!==1){floor.fillStyle='#0006';floor.fillRect(px,py,12,4);}
   }else if(room.cells[n]===4){
    floor.fillStyle=worldColor(7,10);floor.fillRect(px,py,12,12);floor.fillStyle=worldColor(25,15);if((x+y)%2===0)floor.fillRect(px+3,py+6,5,1);
   }else if(!level||!room.cells[n]&&![-1,1,-W,W].some(d=>room.cells[n+d]===1)){floor.fillStyle='#101722';floor.fillRect(px,py,12,12);}else{
    floor.fillStyle=worldColor(18,20);floor.fillRect(px,py,12,12);floor.globalAlpha=.32;tile(floor,assets.pantry+21+world.shape,px,py);floor.globalAlpha=1;
    if(room.cells[n+W]===1){floor.fillStyle=worldColor(32,20);floor.fillRect(px,py+9,12,2);floor.fillStyle='#0009';floor.fillRect(px,py+11,12,1);}
   }
   if(!level&&room.cells[n]===1){
    const turn=room.cells[n-W]===1&&room.cells[n+W]===1;
    floor.fillStyle='#324957';floor.fillRect(px,py,12,12);
    for(let k=0;k<12;k+=6){floor.fillStyle='#66818a';floor.fillRect(px+(turn?0:k),py+(turn?k:0),turn?12:1,turn?1:12);floor.fillStyle='#1a2c38';floor.fillRect(px+(turn?0:k+4),py+(turn?k+4:0),turn?12:2,turn?2:12);}
   }
  }
  if(!level){floor.fillStyle='#101722';floor.fillRect(156,108,48,48);for(let i=0;i<4;i++)floor.drawImage(atlas,(assets.ring+i)*12,0,12,12,156+i%2*24,108+(i>>1)*24,24,24);}
  for(const p of room.props){const x=p.x*12,y=p.y*12;if(p.t%6<3){floor.fillStyle='#050a1077';floor.fillRect(x+2,y+10,10,3);}tile(floor,assets.pantry+p.t,x,y-(p.t%6<3?2:0));}
  if(DEV)$('info').textContent=level?['Ossuary','Cistern','Archive'][world.shape]:'Room Zero';
  if(DEV)$('room-select').value=level?chamber:-1;
}
function choose(value){sprite=Number.isFinite(+value)?Math.max(104,Math.min(assets.last,Math.round(+value))):104;if(DEV)$('sprite').value=sprite;makeActor();}
function nextRoom(){reset(true);}
function cycle(d){choose(sprite+d>assets.last?104:sprite+d<104?assets.last:sprite+d);}
if(DEV){
 $('generate').onclick=()=>{seed=$('seed').value||'1';reset();canvas.focus();};
 $('new').onclick=()=>{nextRoom();canvas.focus();};
 $('seed').onkeydown=e=>{if(e.key==='Enter')$('generate').click();};
 $('sprite').onchange=e=>choose(e.target.value);
 $('prev').onclick=()=>cycle(-1);$('next').onclick=()=>cycle(1);
 $('room-select').onchange=e=>{if(+e.target.value<0)reset();else{if(!level){level=1;world=makeLevel(seed,level);}chamber=+e.target.value;enterRoom();}canvas.focus();};
 $('clear-room').onclick=()=>{for(const e of room.enemies)if(e.hp>0)hitEnemy(e,10000);canvas.focus();};
}
for(const type of ['attack','interact']){
 const button=$(type);
 button.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();canvas.focus();button.setPointerCapture(e.pointerId);holdAction(type,'pointer'+e.pointerId);};
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>releaseAction(type,'pointer'+e.pointerId);
 button.onclick=e=>{if(!e||e.detail===0)performAction(type);};
}
$('sound').onclick=()=>{if(!audio)audio=new AudioContext();audio.resume();muted=!muted;$('sound').textContent=muted?'Sound off':'Sound on';};
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.isContentEditable)return;
  if(DEV&&dev.keydown(e))return;
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','r','[',']','i','o'].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(!DEV){if(k==='i')holdAction('attack');if(k==='o')holdAction('interact');}
  if(k==='r')nextRoom();if(DEV){if(k==='[')cycle(-1);if(k===']')cycle(1);}
});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(DEV)dev.keyup(k);else{if(k==='i')releaseAction('attack');if(k==='o')releaseAction('interact');}});
addEventListener('blur',()=>{keys.clear();releaseActions();});
document.addEventListener('visibilitychange',()=>{keys.clear();releaseActions();last=0;});
document.addEventListener('focusin',e=>{if(e.target!==canvas&&e.target!==$('attack')&&e.target!==$('interact')){keys.clear();releaseActions();}});
function resize(){const r=canvas.parentElement.getBoundingClientRect(),scale=Math.min((r.width-24)/372,(r.height-24)/252),s=Math.max(.1,scale);canvas.style.width=372*s+'px';canvas.style.height=252*s+'px';}
if(DEV)new ResizeObserver(resize).observe(canvas.parentElement);
function frame(time){
  const dt=last?(time-last)/1000:0;last=time;
  {
    const oldX=player.x,oldY=player.y;
    const down=(a,b)=>+(keys.has(a)||keys.has(b));
    if(health&&travel<=0){if(DEV)dev.move(dt);else{
      const dx=down('d','arrowright')-down('a','arrowleft'),dy=down('s','arrowdown')-down('w','arrowup');
      faceMovement(dx,dy);movePlayer(room.cells,player,dx,dy,dt,10*movementFactor());
    }}
    const distance=Math.hypot(player.x-oldX,player.y-oldY);
    if(!(DEV&&dev.paused)){walking=distance>.00001;if(walking){const old=gait;gait=(gait+distance*2.5)%4;if(Math.floor(old)!==Math.floor(gait)&&Math.floor(gait)%2===0)tone(world.shape===1?150:80,.025,'triangle',.004);}else gait=0;}
    ctx.drawImage(background,0,0);
    const step=DEV&&dev.paused?0:Math.min(dt,.05);
    tickActions(health?step:0);tickWorld(step);drawWorld();
    const x=Math.round(player.x*12)-6,y=Math.round(player.y*12)-6;
    ctx.fillStyle='#090c08';ctx.fillRect(x+2,y+10,8,3);ctx.globalAlpha=hurt>0&&Math.floor(hurt*12)%2?.45:1;drawActor(x,y);ctx.globalAlpha=1;
    if(hitFlash){ctx.fillStyle='#df5665';ctx.globalAlpha=hitFlash;ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;}
    if(DEV)dev.draw(dt,time);
    if(DEV)canvas.dataset.action=action? action.type:'idle';
    if(DEV)canvas.dataset.frame=actionFrame();
    if(DEV)canvas.dataset.sprite=sprite;
    if(DEV)canvas.dataset.direction=actorDirection();
    if(DEV)canvas.dataset.pickups=collected;
    if(DEV)canvas.dataset.position=player.x.toFixed(2)+','+player.y.toFixed(2);
  }
  requestAnimationFrame(frame);
}
const bits=atob(assets.bits);atlas.width=bits.length/18*12;atlas.height=12;
for(let i=0;i<bits.length;i++)for(let b=0;b<8;b++)if(bits.charCodeAt(i)&128>>b){
 const tileIndex=Math.floor(i/18),pixel=(i%18)*8+b;
 art.fillStyle='#efefdb';art.fillRect(tileIndex*12+pixel%12,Math.floor(pixel/12),1,1);
}
makeActor();
if(DEV)dev=setupDev();
reset(true);if(DEV)resize();requestAnimationFrame(frame);
