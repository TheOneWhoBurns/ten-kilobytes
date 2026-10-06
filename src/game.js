// The standalone page owns the #game named window property and native handlers.
const $=id=>document.getElementById(id),canvas=DEV?$('game'):game,ctx=canvas.getContext('2d'),keys=DEV?new Set():new Uint8Array(128);
function clearKeys(){if(DEV)keys.clear();else keys.fill(0);}
ctx.imageSmoothingEnabled=false;
const atlas=DEV?document.createElement('canvas'):canvas.cloneNode(),art=atlas.getContext('2d');
const background=DEV?document.createElement('canvas'):canvas.cloneNode();if(DEV){background.width=372;background.height=252;}
const floor=background.getContext('2d');
let room,player,sprite=104,last=0,seed,dev;
function tile(c,index,x,y){c.drawImage(atlas,index*12,0,12,12,x,y,12,12);}
function writeTiles(text,x,y){
 ctx.font='bold 16px monospace';ctx.fillStyle='#efefdb';
 if(DEV&&text[0]==='@'){tile(ctx,assets.font,x*12,y*12);text='  '+text.slice(1);}
 ctx.fillText(text,x*12,y*12+12);
}

function reset(fresh=false){
  if(fresh){const n=new Uint32Array(1);crypto.getRandomValues(n);seed=n[0];if(DEV)$('seed').value=seed;}
  level=0;chamber=0;score=0;maxHealth=health=2;weaponArt=0;hitFlash=0;weapon=0;temper=0;world=makeEntrance();makeActor();enterRoom();
}
function enterRoom(from){
  clearKeys();room=world.rooms[chamber];player=tilePoint(room.spawn);shots=[];fields=[];blows=[];dash=null;gaze=0;hurt=1;travel=0;resetActions();
  const door=room.doors.find(d=>d.to===from);if(door){const [dx,dy]=directions[door.dir];player.x=door.x-dx*1.5;player.y=door.y-dy*1.5;facing=Math.atan2(-dy,-dx);}
  if(!level)facing=0;
  room.visited=true;
  art.globalCompositeOperation='source-atop';
  for(const [start,count,color] of [[assets.pantry,24,worldColor(38,25)],[assets.weapon,assets.weaponCount,'#bdeddf'],[assets.enemies,assets.enemyCount,worldColor(76,180)],[assets.bosses,4,'#edc9d3'],[assets.armors,assets.armorCount,'#bdcbed'],[assets.effects,1,'#ffcfac'],[assets.effects+2,4,'#d7a7ff'],[assets.warning,2,'#c394ff'],[assets.flame,3,'#ff9365']]){art.fillStyle=color;art.fillRect(start*12,0,count*12,12);}for(let i=0;i<18;i++)if(i%6>1){art.fillStyle=i===2?'#d7b77c':worldColor(38,80);art.fillRect((assets.pantry+i)*12,0,12,12);}art.globalCompositeOperation='source-over';
  floor.imageSmoothingEnabled=false;
  for(let n=0;n<W*H;n++){
   const x=n%W*12,y=(n/W|0)*12,open=room.cells[n]&1;
   floor.fillStyle=level?worldColor(open?14:8):open?'#324957':'#101722';floor.fillRect(x,y,12,12);
   if(level){floor.globalAlpha=open?.09:.25;tile(floor,assets.pantry+(open?18:21)+world.shape,x,y);floor.globalAlpha=1;}
  }
  if(!level)for(let i=0;i<4;i++)floor.drawImage(atlas,(assets.ring+i)*12,0,12,12,156+i%2*24,108+(i>>1)*24,24,24);
  for(let n=0;n<W*H;n++)if(room.cells[n]>>1)tile(floor,assets.pantry+(room.cells[n]>>1)-1,n%W*12,(n/W|0)*12);
  if(DEV)$('info').textContent=level?['Ossuary','Cistern','Archive'][world.shape]:'Room Zero';
  if(DEV){$('room-select').value=level?chamber:-1;$('weapon-test').value=weapon;$('enemy-test').value=room.enemies[0]&&!room.enemies[0].boss?room.enemies[0].kind:-1;}
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
 for(const [id,names] of [['enemy-test',enemyNames],['weapon-test',weaponNames]])names.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=name;$(id).appendChild(option);});
 $('enemy-test').onchange=e=>{const kind=+e.target.value;if(kind<0)return;let found;
  for(let n=0;n<100&&!found;n++){const candidate=makeLevel(seed+':preview:'+kind+':'+n,Math.max(1,level));const i=candidate.rooms.findIndex(r=>r.enemies.some(e=>!e.boss&&e.kind===kind));if(i>=0){world=candidate;chamber=i;found=true;}}
  if(found){level=Math.max(1,level);health=maxHealth=2;enterRoom();}canvas.focus();
 };
 $('weapon-test').onchange=e=>{takeLoot({kind:3,value:+e.target.value});canvas.focus();};
 $('armor-test').onclick=()=>{if(health)takeLoot({kind:4,value:0});canvas.focus();};
 $('clear-room').onclick=()=>{for(const e of room.enemies)if(e.hp>0)hitEnemy(e,10000);canvas.focus();};
}
if(DEV/*diagnostics*/)for(const type of ['attack','interact']){
 const button=$(type);
 button.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();canvas.focus();button.setPointerCapture(e.pointerId);holdAction(type,'pointer'+e.pointerId);};
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>releaseAction(type,'pointer'+e.pointerId);
 button.onclick=e=>{if(!e||e.detail===0)performAction(type);};
}
onpointerdown=startAudio;
if(DEV){onkeydown=e=>{
  startAudio();
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.isContentEditable)return;
  if(DEV&&dev.keydown(e))return;
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','r','[',']','i','o'].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(!DEV){if(k==='i')holdAction('attack');if(k==='o')holdAction('interact');}
  if(k==='r')nextRoom();if(DEV){if(k==='[')cycle(-1);if(k===']')cycle(1);}
};
onkeyup=e=>{const k=e.key.toLowerCase();keys.delete(k);if(DEV)dev.keyup(k);else{if(k==='i')releaseAction('attack');if(k==='o')releaseAction('interact');}};
}else{
 onkeydown=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;startAudio();const k=e.keyCode;keys[k]=1;if([37,38,39,40,65,68,73,79,82,83,87].includes(k))e.preventDefault();if(!e.repeat){if(k===73)holdAction('attack');if(k===79)performAction('interact');if(k===82)reset(true);}};
 onkeyup=e=>{keys[e.keyCode]=0;if(e.keyCode===73)releaseAction('attack');};
}
onblur=()=>{clearKeys();releaseActions();};
document.onvisibilitychange=()=>{clearKeys();releaseActions();last=0;};
// Only the dev/diagnostic page has other focusable controls.
if(DEV/*diagnostics*/)document.addEventListener('focusin',e=>{if(e.target!==canvas&&(!(DEV/*diagnostics*/)||e.target!==$('attack')&&e.target!==$('interact'))){clearKeys();releaseActions();}});
function resize(){const r=canvas.parentElement.getBoundingClientRect(),scale=Math.min((r.width-24)/372,(r.height-24)/252),s=Math.max(.1,scale);canvas.style.width=372*s+'px';canvas.style.height=252*s+'px';}
if(DEV)new ResizeObserver(resize).observe(canvas.parentElement);
function frame(time){
  const dt=last?(time-last)/1000:0;last=time;
  {
    const oldX=player.x,oldY=player.y;
    const down=(a,b)=>keys[a]|keys[b];
    if(health&&travel<=0&&!dash){if(DEV)dev.move(dt);else{
      const dx=down(68,39)-down(65,37),dy=down(83,40)-down(87,38);
      faceMovement(dx,dy);movePlayer(room.cells,player,dx,dy,dt,10*movementFactor());
    }}
    const distance=Math.hypot(player.x-oldX,player.y-oldY);
    if(!(DEV&&dev.paused)){walking=distance>.00001;if(walking){const old=gait;gait=(gait+distance*2.5)%4;if(Math.floor(old)!==Math.floor(gait)&&Math.floor(gait)%2===0)tone(world.shape===1?150:80,.025,'triangle',.004);}else gait=0;}
    ctx.drawImage(background,0,0);
    const step=DEV&&dev.paused?0:Math.min(dt,.05);
    tickActions(health?step:0);tickWorld(step);drawWorld();
    const x=Math.round(player.x*12)-6,y=Math.round(player.y*12)-10;
    ctx.fillStyle='#090c08';ctx.fillRect(x+2,y+10,8,3);ctx.globalAlpha=hurt>0&&Math.floor(hurt*12)%2?.45:1;drawActor(x,y);ctx.globalAlpha=1;drawCombat();
    if(hitFlash){ctx.fillStyle='#df5665';ctx.globalAlpha=hitFlash;ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;}
    if(!health)writeTiles('SCORE '+score,12,1);
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
