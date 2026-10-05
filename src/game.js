const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),keys=new Set();
ctx.imageSmoothingEnabled=false;
const atlas=document.createElement('canvas'),art=atlas.getContext('2d');
const background=document.createElement('canvas');background.width=372;background.height=252;
const floor=background.getContext('2d');
let room,player,sprite=104,last=0,seed=1,dev;
function tile(c,index,x,y){c.drawImage(atlas,index*12,0,12,12,x,y,12,12);}
function reset(){
  level=1;chamber=0;health=8;power=null;weapon=0;world=makeLevel(seed,level);enterRoom();
}
function enterRoom(from){
  keys.clear();room=world.rooms[chamber];player={...room.spawn};shots=[];hurt=1;travel=0;resetActions();
  const door=room.doors.find(d=>d.to===from);if(door){const [dx,dy]=directions[door.dir];player.x=door.x-dx*1.5;player.y=door.y-dy*1.5;facing=Math.atan2(-dy,-dx);}
  room.visited=true;
  art.globalCompositeOperation='source-atop';
  for(const [start,count,offset] of [[assets.pantry,16,0],[assets.pantry+16,16,30],[assets.pantry+32,16,150],[assets.pantry+48,20,210],[assets.weapon,3,60],[assets.enemies,assets.enemyCount,180]]){art.fillStyle=worldColor(65,offset);art.fillRect(start*12,0,count*12,12);}art.globalCompositeOperation='source-over';
  const palette=[worldColor(12),worldColor(19,30),worldColor(42,30)];
  floor.fillStyle='#080a08';floor.fillRect(0,0,372,252);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const n=y*W+x,px=x*12,py=y*12,q=Math.imul((chamber===6?y*W+Math.abs(x-15):n)^room.detail,1597334677)>>>0;
    if(room.cells[n]){
      floor.fillStyle=palette[0];floor.fillRect(px,py,12,12);
      floor.fillStyle=palette[1];
      floor.globalAlpha=.045;tile(floor,assets.pantry+(world.shape*5+q%4)%16,px,py);floor.globalAlpha=1;
      if(chamber!==6&&q%5===0&&Math.hypot(x-15,y-10)>3){floor.globalAlpha=.5;tile(floor,assets.pantry+32+q%16,px,py);floor.globalAlpha=1;}
      if(!room.cells[n-W]&&room.features[n-W]!==2){floor.fillStyle='#0005';floor.fillRect(px,py,12,3);}
    }else if(room.features[n]===2){
      floor.fillStyle='#060a0b';floor.fillRect(px,py,12,12);floor.fillStyle=palette[2];
      for(const [d,a,b,w,h] of [[-W,0,0,12,1],[W,0,11,12,1],[-1,0,0,1,12],[1,11,0,1,12]])if(room.cells[n+d])floor.fillRect(px+a,py+b,w,h);
      floor.fillStyle='#183033';if(q%3===0)floor.fillRect(px+3,py+6,5,1);
    }else if(room.features[n]||[-1,1,-W,W,-W-1,-W+1,W-1,W+1].some(d=>room.cells[n+d]&&Math.abs((n+d)%W-x)<2)){
      floor.fillStyle=palette[1];floor.fillRect(px,py,12,12);floor.globalAlpha=.55;tile(floor,assets.pantry+16+(world.shape*5+q%3)%16,px,py);floor.globalAlpha=1;
      if(q%3===0)tile(floor,assets.pantry+48+q%20,px,py-4);
      floor.fillStyle=palette[2];if(room.cells[n+W])floor.fillRect(px,py+9,12,2);
      floor.fillStyle='#0007';if(room.cells[n+W])floor.fillRect(px,py+11,12,1);
    }
  }
  if(DEV)$('info').textContent='Room ready · '+room.cells.reduce((a,v)=>a+v,0)+' floor tiles';
  if(DEV)$('room-select').value=chamber;
}
function choose(value){sprite=Number.isFinite(+value)?Math.max(104,Math.min(assets.last,Math.round(+value))):104;if(DEV)$('sprite').value=sprite;makeActor();}
function nextRoom(){const n=new Uint32Array(1);crypto.getRandomValues(n);seed=n[0];if(DEV)$('seed').value=seed;reset();}
function cycle(d){choose(sprite+d>assets.last?104:sprite+d<104?assets.last:sprite+d);}
if(DEV){
 $('generate').onclick=()=>{seed=$('seed').value||'1';reset();canvas.focus();};
 $('new').onclick=()=>{nextRoom();canvas.focus();};
 $('seed').onkeydown=e=>{if(e.key==='Enter')$('generate').click();};
 $('sprite').onchange=e=>choose(e.target.value);
 $('prev').onclick=()=>cycle(-1);$('next').onclick=()=>cycle(1);
 $('room-select').onchange=e=>{chamber=+e.target.value;enterRoom();canvas.focus();};
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
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','r','[',']',' ','e'].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(!DEV){if(k===' ')holdAction('attack');if(k==='e')holdAction('interact');}
  if(k==='r')nextRoom();if(DEV){if(k==='[')cycle(-1);if(k===']')cycle(1);}
});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(DEV)dev.keyup(k);else{if(k===' ')releaseAction('attack');if(k==='e')releaseAction('interact');}});
addEventListener('blur',()=>{keys.clear();releaseActions();});
document.addEventListener('visibilitychange',()=>{keys.clear();releaseActions();last=0;});
document.addEventListener('focusin',e=>{if(e.target!==canvas&&e.target!==$('attack')&&e.target!==$('interact')){keys.clear();releaseActions();}});
function resize(){const r=canvas.parentElement.getBoundingClientRect(),scale=Math.min((r.width-24)/372,(r.height-24)/252),s=Math.max(.1,scale);canvas.style.width=372*s+'px';canvas.style.height=252*s+'px';}
new ResizeObserver(resize).observe(canvas.parentElement);
function frame(time){
  const dt=last?(time-last)/1000:0;last=time;
  {
    const oldX=player.x,oldY=player.y;
    const down=(a,b)=>+(keys.has(a)||keys.has(b));
    if(health&&travel<=0){if(DEV)dev.move(dt);else{
      const dx=down('d','arrowright')-down('a','arrowleft'),dy=down('s','arrowdown')-down('w','arrowup');
      faceMovement(dx,dy);movePlayer(room.solid,player,dx,dy,dt*movementFactor());
    }}
    const distance=Math.hypot(player.x-oldX,player.y-oldY);
    if(!(DEV&&dev.paused)){walking=distance>.00001;if(walking)gait=(gait+distance*2.5)%4;else gait=0;}
    ctx.drawImage(background,0,0);
    const step=DEV&&dev.paused?0:Math.min(dt,.05);
    tickActions(health?step:0);tickWorld(step);drawWorld();
    const x=Math.round(player.x*12)-6,y=Math.round(player.y*12)-6;
    ctx.fillStyle='#090c08';ctx.fillRect(x+2,y+10,8,3);ctx.globalAlpha=hurt>0&&Math.floor(hurt*12)%2?.45:1;drawActor(x,y);ctx.globalAlpha=1;
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
for(let i=0;i<bits.length;i++)for(let b=0;b<8;b++)if(bits.charCodeAt(i)&1<<b){
 const tileIndex=Math.floor(i/18),pixel=(i%18)*8+b;
 art.fillStyle=tileIndex===assets.loot?'#8bcfb8':tileIndex?'#efefdb':'#93978c';art.fillRect(tileIndex*12+pixel%12,Math.floor(pixel/12),1,1);
}
makeActor();
if(DEV)dev=setupDev();
reset();resize();requestAnimationFrame(frame);
