// The standalone page owns the #game named window property and native handlers.
const $=id=>document.getElementById(id),canvas=DEV?$('game'):game,ctx=canvas.getContext('2d'),keys=DEV?new Set():new Uint8Array(128);
function clearKeys(){if(DEV)keys.clear();else keys.fill(0);}
ctx.imageSmoothingEnabled=false;
const atlas=DEV?document.createElement('canvas'):canvas.cloneNode(),art=atlas.getContext('2d');
const background=DEV?document.createElement('canvas'):canvas.cloneNode();if(DEV){background.width=372;background.height=252;}
const floor=background.getContext('2d');
let room,player,sprite=104,last=0,bank=0,seed,dev;
function transform(c,x,y,a=0,sx=1,sy=1){c.save();c.translate(x,y);c.rotate(a);c.scale(sx,sy);}
function tile(c,index,x,y,size=12,source=12){c.drawImage(atlas,index*12,0,source,source,x,y,size,size);}
function statusTile(index,x,y){ctx.save();ctx.shadowColor='#080d13';ctx.shadowOffsetX=ctx.shadowOffsetY=1;tile(ctx,index,Math.round(x)-6,Math.round(y)-6);ctx.restore();}
// Shared ink center; ring quarters mirror around it without storing duplicate pixels.
function entranceLayer(index,size,angle=0){
 transform(floor,room.gate.x*12,room.gate.y*12,angle*Math.PI/180);
 if(index===assets.ring||index===assets.ring+4){
  const n=2,unit=size*19/24/n;
  for(const x of [-1,1])for(const y of [-1,1]){
   floor.save();floor.scale(x,y);
   for(let i=0;i<n*n;i++)tile(floor,index+i,(i%n-n)*unit,((i/n|0)-n)*unit,unit);
   floor.restore();
  }
 }else{
  const moon=index===assets.sky+4,scale=size/12;
  for(let i=0;i<4;i++)tile(floor,index+i,i%2*size-(moon?12:12.5)*scale,(i>>1)*size-(moon?11.5:12.5)*scale,size);
 }
 floor.restore();
}
// Centred lettering with a hard drop shadow.
function writeTiles(text,y,font='bold 14px monospace'){
 ctx.font=font;ctx.textAlign='center';
 for(const d of [2,0]){ctx.fillStyle=d?'#101722':'#fff';ctx.fillText(text,186+d,y*12+12+d);}
}

function reset(fresh=false){
  if(fresh){const n=new Uint32Array(1);crypto.getRandomValues(n);seed=n[0];if(DEV)$('seed').value=seed;}
  bank=0;uranium=false;score=0;beat=beatClock=0;level=0;chamber=0;maxHealth=health=2;weaponArt=0;hitFlash=0;weapon=0;world=makeEntrance();makeActor();enterRoom();
}
function enterRoom(from){
  clearKeys();routes.clear();room=world.rooms[chamber];room.blood=room.blood||[];for(const e of room.enemies)e.exposure=0;bleedClock=0;player=tilePoint(room.spawn);shots=[];fields=[];blows=[];dash=null;gaze=iceX=iceY=0;if(!uranium)radiation=0;hurt=1;travel=0;resetActions();collectUranium();
  const door=room.doors.find(d=>d.to===from);if(door){const [dx,dy]=directions[door.dir];player.x=door.x-dx*1.5;player.y=door.y-dy*1.5;facing=Math.atan2(-dy,-dx);}
  reveal=level?.45:0;revealAt=door||{x:player.x,y:player.y};
  if(!level)facing=0;
  art.globalCompositeOperation='source-atop';
  for(const [start,count,color] of [[assets.pantry,PANTRY_COUNT,worldColor(40)],[assets.pantry+FLOOR_COUNT,WALL_COUNT,worldColor(32,180)],[assets.weapon,assets.weaponCount,'#bdeddf'],[assets.thrust,assets.thrustCount,'#bdeddf'],[assets.punch,assets.punchCount,'#efefdb'],[assets.starter,2,'rgb(164,165,165)'],[assets.starter+2,2,'rgb(198,159,39)'],[assets.mini,1,'#fff'],[assets.mini+1,1,'#bded70'],[assets.mini+2,1,'#bde87c'],[assets.mini+3,2,'#ffcfac'],[assets.mini+5,1,'#bdeddf'],[assets.mini+6,1,'#efefdb'],[assets.enemies,assets.enemyCount,worldColor(76,180)],[assets.bosses,BOSS_COUNT*4,'#edc9d3'],[assets.armors,assets.armorCount,'#bdcbed'],[assets.effects,1,'#ffcfac'],[assets.blood,10,'#ff2222'],[assets.doors,8,worldColor(36,180)],[assets.corpses,5,'#8f7d86'],[assets.sky,4,'#'+assets.entrance.sunColor],[assets.sky+4,4,'#'+assets.entrance.moonColor],[assets.sky+8,1,'#4b6a7d'],[assets.sky+9,1,'#fff'],[assets.ring,4,'#'+assets.entrance.outerRingColor],[assets.ring+4,4,'#'+assets.entrance.middleRingColor],[assets.ring+8,4,'#'+assets.entrance.innerRingColor],[assets.title,9,'#fff'],[assets.effects+1,4,'#d7a7ff'],[assets.warning,2,'#c394ff'],[assets.flame,3,'#ff9365'],[assets.traps,2,worldColor(55,80)],[assets.effects+5,1,'#e1ff9f']]){art.fillStyle=color;art.fillRect(start*12,0,count*12,12);}art.fillStyle=worldColor(55,80);art.fillRect((assets.pantry+PROP_START)*12,0,(PANTRY_COUNT-PROP_START)*12,12);for(const [tag,color]of [[ICE,'#9bd7ed'],[RADIATION,'#bde87c']]){art.fillStyle=color;art.fillRect((assets.pantry+tag-1)*12,0,12,12);}art.globalCompositeOperation='source-over';
  floor.imageSmoothingEnabled=false;
  for(let n=0;n<W*H;n++){
   const x=n%W*12,y=(n/W|0)*12,open=room.cells[n]&1;
   floor.fillStyle=level?worldColor(open?22:8,open?0:180):open?'#2a3d4a':'#101722';floor.fillRect(x,y,12,12);
   floor.globalAlpha=!level&&open?1:open?.12:.32;tile(floor,!level&&open?assets.sky+8:assets.pantry+(open?room.floorTile:room.wall),x,y);floor.globalAlpha=1;
   const tag=room.cells[n]>>1;if(tag&&tag<HAZARD_START)tile(floor,assets.pantry+tag-1,x,y);
  }
  // A sun or a moon lies under the entrance ring.
  if(!level){const setup=assets.entrance,sky=assets.sky+(setup.astralBody==='moon'?4:setup.astralBody==='sun'?0:Math.random()<.5?0:4);starterMoon=+(sky===assets.sky+4);if(DEV)dev.entrance(sky);else for(const [index,size,angle] of [[sky,sky===assets.sky?setup.sunSize:setup.moonSize,setup.astralRotation],[assets.ring,setup.outerRingSize,setup.outerRingRotation],[assets.ring+4,setup.middleRingSize,setup.middleRingRotation],[assets.ring+8,setup.innerRingSize,setup.innerRingRotation]])entranceLayer(index,size*12,angle);}
  if(DEV)$('info').textContent=level?'Floor '+level+' / Room '+(chamber+1):'Room Zero';
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
 $('hazard-test').onchange=e=>{const tag={web:WEB,ice:ICE,fire:FIRE,needle:NEEDLE,spike:SPIKE,trap:TRAP,radiation:RADIATION}[e.target.value];if(!tag)return;if(!level){level=1;world=makeLevel(seed,level);}chamber=0;room=world.rooms[0];room.cells.fill(0);fillShape(room.cells,12,8);room.enemies=[];room.loot=[];room.reward=-1;room.offset=0;health=maxHealth=2;const radius=[WEB,ICE,FIRE,NEEDLE].includes(tag)?2:0;for(let y=10-radius;y<=10+radius;y++)for(let x=20-radius;x<=20+radius;x++)room.cells[y*W+x]=1|(tag<<1);for(const d of room.doors){const [dx,dy]=directions[d.dir];tunnel(room.cells,(d.x|0)-dx*2,(d.y|0)-dy*2);for(let k=0;k<3;k++)room.cells[((d.y|0)-dy*k)*W+(d.x|0)-dx*k]=1;}enterRoom();canvas.focus();};
 $('armor-test').onclick=()=>{if(health)takeLoot({kind:4,value:0});canvas.focus();};
 $('boss-room').onclick=()=>{if(!level){level=1;world=makeLevel(seed,level);}chamber=world.boss;enterRoom();canvas.focus();};
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
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(!health){if(!e.repeat){e.preventDefault();reset(true);}return;}
  if(DEV&&dev.keydown(e))return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','r','[',']','i','o'].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(!DEV){if(k==='i')holdAction('attack');if(k==='o')holdAction('interact');}
  if(k==='r')nextRoom();if(DEV){if(k==='[')cycle(-1);if(k===']')cycle(1);}
};
onkeyup=e=>{const k=e.key.toLowerCase();keys.delete(k);if(DEV)dev.keyup(k);else{if(k==='i')releaseAction('attack');if(k==='o')releaseAction('interact');}};
}else{
 onkeydown=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;startAudio();if(!health){if(!e.repeat){e.preventDefault();reset(true);}return;}const k=e.keyCode;keys[k]=1;if(k>32&&k<91)e.preventDefault();if(!e.repeat){if(k===73)holdAction('attack');if(k===79)performAction('interact');if(k===82)reset(true);}};
 onkeyup=e=>{keys[e.keyCode]=0;if(e.keyCode===73)releaseAction('attack');};
}
onblur=()=>{clearKeys();releaseActions();radiationAudio(0);};
document.onvisibilitychange=()=>{clearKeys();releaseActions();radiationAudio(0);last=bank=0;};
// Only the dev/diagnostic page has other focusable controls.
if(DEV/*diagnostics*/)document.addEventListener('focusin',e=>{if(e.target!==canvas&&(!(DEV/*diagnostics*/)||e.target!==$('attack')&&e.target!==$('interact'))){clearKeys();releaseActions();}});
function resize(){const r=canvas.parentElement.getBoundingClientRect(),scale=Math.min((r.width-24)/372,(r.height-24)/252),s=Math.max(.1,scale);canvas.style.width=372*s+'px';canvas.style.height=252*s+'px';}
if(DEV)new ResizeObserver(resize).observe(canvas.parentElement);
function simulate(){
 const dt=1/60;
    const oldX=player.x,oldY=player.y;
    const down=(a,b)=>keys[a]|keys[b];
    if(health&&travel<=0&&!reveal&&!dash){if(DEV)dev.move(dt);else{
      const dx=down(68,39)-down(65,37),dy=down(83,40)-down(87,38);
      faceMovement(dx,dy);moveHero(dx,dy,dt);
    }}
    const distance=Math.hypot(player.x-oldX,player.y-oldY);
    {walking=distance>.00001;if(walking){const old=gait;gait=(gait+distance*2.5)%4;if(Math.floor(old)!==Math.floor(gait)&&Math.floor(gait)%2===0)tone(room.floorTile===1?150:80,.025,'triangle',.004);}else gait=0;}

 tickActions(health&&!reveal&&travel<=0?dt:0);tickWorld(dt);
}
function frame(time){
 const dt=last?Math.min((time-last)/1000,.1):0;last=time;
 bank=DEV&&dev.paused?0:bank+dt;
 while(bank+1e-9>=1/60){bank-=1/60;simulate();}
 ctx.drawImage(background,0,0);drawLoot();radiationAudio(DEV&&dev.paused?0:dt);drawWorld();
 {
    const x=Math.round(player.x*12)-6,y=Math.round(player.y*12)-10,blade=health&&blows.find(b=>b.kind===0),pose=blade?starterMotion(blade):null;
    ctx.fillStyle='#090c08';ctx.fillRect(x+2+(pose?Math.round(pose[4]):0),y+10+(pose?Math.round(pose[5]):0),8,3);drawStarter(true);ctx.globalAlpha=hurt>0&&Math.floor(hurt*12)%2?.45:1;drawActor(x,y);ctx.globalAlpha=1;if(uranium&&health)tile(ctx,assets.pantry+RADIATION-1,x+8,y+1);drawCombat();
    if(hitFlash){ctx.fillStyle='#df5665';ctx.globalAlpha=hitFlash;ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;}
    if(DEV)dev.draw(dt,time);
    drawTransition();
    if(!health){ctx.save();ctx.globalAlpha=.45;ctx.fillStyle='#080a10';ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;ctx.fillRect(38,88,296,68);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 20px monospace';ctx.fillText('SCORE '+score,186,114);ctx.font='12px monospace';ctx.fillText('Press any key to revive',186,140);ctx.restore();}
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
