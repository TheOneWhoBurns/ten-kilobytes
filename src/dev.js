// Included only in the development build; no editor code ships in dist/.
function setupDev(){
 const defaults=()=>({speed:10,...assets.entrance,attackRate:12,attackCooldown:150,interactRate:12,attackMode:'hold',interactMode:'press',layout:'wasd',bindings:{up:'w',left:'a',down:'s',right:'d',attack:'i',interact:'o'},grid:false,hitbox:false,collapsed:false});
 const presets={wasd:{up:'w',left:'a',down:'s',right:'d'},arrows:{up:'arrowup',left:'arrowleft',down:'arrowdown',right:'arrowright'},ijkl:{up:'i',left:'j',down:'k',right:'l'}};
 const directions=['up','left','down','right'],bindings=[...directions,'attack','interact'],reserved=['r','[',']','p'];
 const validKey=k=>typeof k==='string'&&(k===' '||/^[a-z0-9]$/.test(k)||/^arrow(up|left|down|right)$/.test(k))&&!reserved.includes(k);
 const label=k=>({' ':'Space',arrowup:'↑',arrowleft:'←',arrowdown:'↓',arrowright:'→'}[k]||k.toUpperCase());
 let settings=defaults(),paused=false,collision=true,pending=null,fps=0,reportAt=0;
 const sizeKeys=['sunSize','moonSize','innerRingSize','middleRingSize','outerRingSize'],colorKeys=['sunColor','moonColor','innerRingColor','middleRingColor','outerRingColor'],rotationKeys=['astralRotation','innerRingRotation','middleRingRotation','outerRingRotation'];
 let entranceBase,entranceSky;
 function paintEntrance(){
  if(level||!entranceBase)return;
  floor.drawImage(entranceBase,0,0);
  const sky=settings.astralBody==='sun'?assets.sky:settings.astralBody==='moon'?assets.sky+4:entranceSky;
  starterMoon=+(sky===assets.sky+4);
  for(const [index,name,color] of [[sky,'astral',sky===assets.sky?'sunColor':'moonColor'],[assets.ring,'outerRing','outerRingColor'],[assets.ring+4,'middleRing','middleRingColor'],[assets.ring+8,'innerRing','innerRingColor']]){
   art.save();art.globalCompositeOperation='source-atop';art.fillStyle='#'+settings[color];art.fillRect(index*12,0,4*12,12);art.restore();
   entranceLayer(index,settings[name==='astral'?(sky===assets.sky?'sunSize':'moonSize'):name+'Size']*12,settings[name+'Rotation']);
  }
 }
 try{
  const saved=JSON.parse(localStorage.getItem('room-zero-dev-v1'));
  if(saved){
   if(['random','sun','moon'].includes(saved.astralBody))settings.astralBody=saved.astralBody;
   for(const key of colorKeys)if(typeof saved[key]==='string'&&/^[0-9a-f]{6}$/i.test(saved[key]))settings[key]=saved[key];
   for(const key of rotationKeys)if(Number.isFinite(saved[key]))settings[key]=Math.max(-180,Math.min(180,saved[key]));
   for(const key of sizeKeys)if(Number.isFinite(saved[key]))settings[key]=Math.max(.5,Math.min(20,saved[key]));
   for(const type of ['attack','interact']){if(Number.isFinite(saved[type+'Rate']))settings[type+'Rate']=Math.max(.5,Math.min(30,saved[type+'Rate']));if(['press','hold'].includes(saved[type+'Mode']))settings[type+'Mode']=saved[type+'Mode'];}
   if(Number.isFinite(saved.speed))settings.speed=Math.max(.5,Math.min(20,saved.speed));
   if(Number.isFinite(saved.attackCooldown))settings.attackCooldown=Math.max(0,Math.min(2000,saved.attackCooldown));
   if(presets[saved.layout]||saved.layout==='custom')settings.layout=saved.layout;
   if(saved.bindings&&directions.every(d=>validKey(saved.bindings[d]))&&new Set(directions.map(d=>saved.bindings[d])).size===4){
    for(const d of directions)settings.bindings[d]=saved.bindings[d];
    for(const d of ['attack','interact'])if(validKey(saved.bindings[d]))settings.bindings[d]=saved.bindings[d];
    if(settings.bindings.attack===' '&&settings.bindings.interact==='e'&&!directions.some(d=>['i','o'].includes(settings.bindings[d]))){settings.bindings.attack='i';settings.bindings.interact='o';}
    for(const d of ['attack','interact'])if(bindings.some(k=>k!==d&&settings.bindings[k]===settings.bindings[d]))settings.bindings[d]=[' ','e','f','g'].find(k=>!Object.values(settings.bindings).includes(k));
   }else settings.bindings={...settings.bindings,...(presets[settings.layout]||presets.wasd)};
   for(const k of ['grid','hitbox','collapsed'])settings[k]=saved[k]===true;
  }
 }catch{}
 function save(){try{localStorage.setItem('room-zero-dev-v1',JSON.stringify(settings));}catch{}}
 function sync(){
  $('astralBody').value=settings.astralBody;
  for(const key of colorKeys)$(key).value='#'+settings[key];
  for(const key of rotationKeys){$(key).value=settings[key];$(key+'-value').textContent=settings[key]+'°';}
  for(const key of sizeKeys){$(key).value=settings[key];$(key+'-value').textContent=settings[key].toFixed(1)+'×';}
  for(const type of ['attack','interact']){$(type+'-rate').value=$(type+'-range').value=settings[type+'Rate'];$(type+'-mode').value=settings[type+'Mode'];$(type+'-timing').textContent=Math.round(1000/settings[type+'Rate'])+' ms';}
  $('speed').value=$('speed-range').value=settings.speed;$('layout').value=settings.layout;
  $('attack-cooldown').value=settings.attackCooldown;
  $('grid').checked=settings.grid;$('hitbox').checked=settings.hitbox;$('collision').checked=collision;
  $('dev-panel').hidden=settings.collapsed;$('dev-toggle').textContent=settings.collapsed?'Show controls ↓':'Hide controls ↑';
  $('dev-toggle').setAttribute('aria-expanded',String(!settings.collapsed));
  $('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));
  $('summary').textContent=settings.speed+' tiles/s'+(paused?' · paused':'')+(!collision?' · collision off':'');
  for(const d of bindings)$('bind-'+d).textContent=pending===d?'…':label(settings.bindings[d]);
  $('attack').textContent='Attack · '+label(settings.bindings.attack);$('interact').textContent='Interact · '+label(settings.bindings.interact);
  const controls=directions.map(d=>label(settings.bindings[d])).join(' ')+(settings.layout==='wasd'?' / arrows':'');
  $('control-hint').textContent=controls+' · Move   [ ] · Sprite   R · New room   P · Pause';
  canvas.setAttribute('aria-label','Generated room. Move with '+controls+'.');
 }
 function cancel(){pending=null;sync();}
 function pause(){paused=!paused;clearKeys();releaseActions();last=0;sync();}
 for(const id of ['speed','speed-range'])$(id).oninput=e=>{
  if(!Number.isFinite(+e.target.value)||!e.target.value)return;
  settings.speed=Math.max(.5,Math.min(20,+e.target.value));sync();save();
 };
 $('speed').onchange=()=>sync();
 for(const key of sizeKeys)$(key).oninput=e=>{
  const value=+e.target.value;if(!e.target.value||!Number.isFinite(value))return;
  settings[key]=Math.max(.5,Math.min(20,value));sync();save();paintEntrance();
 };
 $('astralBody').onchange=e=>{if(!['random','sun','moon'].includes(e.target.value))return;settings.astralBody=e.target.value;save();paintEntrance();};
 for(const key of colorKeys)$(key).oninput=e=>{if(!/^#[0-9a-f]{6}$/i.test(e.target.value))return;settings[key]=e.target.value.slice(1);save();paintEntrance();};
 for(const key of rotationKeys)$(key).oninput=e=>{const value=+e.target.value;if(!e.target.value||!Number.isFinite(value))return;settings[key]=Math.max(-180,Math.min(180,value));sync();save();paintEntrance();};
 $('attack-cooldown').oninput=e=>{if(!e.target.value||!Number.isFinite(+e.target.value))return;settings.attackCooldown=Math.max(0,Math.min(2000,+e.target.value));sync();save();};
 $('attack-cooldown').onchange=()=>sync();
 for(const type of ['attack','interact']){
  for(const id of [type+'-rate',type+'-range'])$(id).oninput=e=>{if(!e.target.value||!Number.isFinite(+e.target.value))return;settings[type+'Rate']=Math.max(.5,Math.min(30,+e.target.value));sync();save();};
  $(type+'-rate').onchange=()=>sync();
  $(type+'-mode').onchange=e=>{settings[type+'Mode']=e.target.value;releaseActions();save();};
 }

 $('layout').onchange=e=>{const layout=e.target.value;cancel();if(presets[layout]&&['attack','interact'].some(d=>Object.values(presets[layout]).includes(settings.bindings[d]))){$('binding-status').textContent='Key conflict';return;}settings.layout=layout;if(presets[settings.layout])settings.bindings={...settings.bindings,...presets[settings.layout]};clearKeys();releaseActions();sync();save();};
 for(const d of bindings)$('bind-'+d).onclick=()=>{clearKeys();releaseActions();pending=d;$('binding-status').textContent=d+': press key';sync();};
 $('pause').onclick=pause;
 $('dev-toggle').onclick=()=>{cancel();settings.collapsed=!settings.collapsed;sync();save();};
 $('collision').onchange=e=>{collision=e.target.checked;clearKeys();if(collision&&!canFit(room.cells,player.x,player.y))player=tilePoint(room.spawn);sync();};
 $('respawn').onclick=()=>{clearKeys();releaseActions();player=tilePoint(room.spawn);canvas.focus();};
 for(const id of ['grid','hitbox'])$(id).onchange=e=>{settings[id]=e.target.checked;save();};
 $('defaults').onclick=()=>{settings=defaults();collision=true;paused=false;pending=null;clearKeys();releaseActions();last=0;if(!canFit(room.cells,player.x,player.y))player=tilePoint(room.spawn);$('binding-status').textContent='';sync();save();paintEntrance();};
 sync();
 return {
  entrance(sky){
   entranceSky=sky;
   if(!entranceBase)entranceBase=document.createElement('canvas');entranceBase.width=372;entranceBase.height=252;
   entranceBase.getContext('2d').drawImage(background,0,0);paintEntrance();
  },
  controls:()=>[directions.map(d=>label(settings.bindings[d])).join(' '),label(settings.bindings.attack),label(settings.bindings.interact)],
  get paused(){return paused||pending!==null||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);},
  actionRate:type=>settings[type+'Rate'],
  attackCooldown:()=>settings.attackCooldown,
  actionMode:type=>settings[type+'Mode'],
  keyup(k){for(const type of ['attack','interact'])if(k===settings.bindings[type])releaseAction(type);},
  keydown(e){
   if(e.ctrlKey||e.metaKey||e.altKey)return true;
   const k=e.key.toLowerCase();
   if(pending){
    e.preventDefault();
    if(k==='escape'){cancel();$('binding-status').textContent='';return true;}
    if(!validKey(k)){$('binding-status').textContent='Reserved key';return true;}
    if(bindings.some(d=>d!==pending&&settings.bindings[d]===k)){$('binding-status').textContent='Key in use';return true;}
    settings.bindings[pending]=k;settings.layout='custom';pending=null;sync();save();$('binding-status').textContent='';canvas.focus();return true;
   }
   if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return true;
   for(const type of ['attack','interact'])if(k===settings.bindings[type]){e.preventDefault();if(!e.repeat)holdAction(type);return true;}
   if(k==='p'){e.preventDefault();if(!e.repeat)pause();return true;}
   if(Object.values(settings.bindings).includes(k))e.preventDefault();
   return false;
  },
  move(dt){
   if(this.paused)return;
   const held=d=>+(keys.has(settings.bindings[d])||(settings.layout==='wasd'&&keys.has('arrow'+d)));
   const dx=held('right')-held('left'),dy=held('down')-held('up');
   faceMovement(dx,dy);
   moveHero(dx,dy,dt,settings.speed,collision);
  },
  draw(dt,time){
   if(settings.grid){ctx.strokeStyle='#8baf5244';ctx.lineWidth=.5;ctx.beginPath();for(let x=0;x<=W;x++){ctx.moveTo(x*12,0);ctx.lineTo(x*12,H*12);}for(let y=0;y<=H;y++){ctx.moveTo(0,y*12);ctx.lineTo(W*12,y*12);}ctx.stroke();}
   if(settings.hitbox){
    ctx.save();ctx.lineWidth=.6;
    const body=(e,color)=>{const h=hurtbox(e);ctx.strokeStyle=color;ctx.beginPath();ctx.ellipse(h.x*12,h.y*12,h.rx*12,h.ry*12,0,0,Math.PI*2);ctx.stroke();};
    body(player,'#8fff9b');ctx.strokeStyle='#ffc75c';ctx.strokeRect((player.x-.27)*12,(player.y-.27)*12,6.48,6.48);
    for(const e of room.enemies)if(e.hp>0)body(e,'#ff778a');
    for(const b of blows)if(b.age>=0&&(b.kind!==6||b.age>=.24)&&(b.kind!==0||b.age<.16)&&(b.kind!==5||b.age<=.1)&&b.kind!==8){const h=blowShape(b);ctx.save();ctx.translate(h.x*12,h.y*12);ctx.rotate(h.a);ctx.strokeStyle='#74e9ff';ctx.fillStyle='#74e9ff';ctx.globalAlpha=.35;if(h.width){ctx.fillRect(h.start*12,-h.width*12,(h.end-h.start)*12,h.width*24);}else{ctx.lineCap='round';ctx.lineWidth=h.radius*24;ctx.beginPath();if(h.start===h.end){ctx.arc(0,0,h.radius*12,0,Math.PI*2);ctx.fill();}else{ctx.moveTo(h.start*12,0);ctx.lineTo(h.end*12,0);ctx.stroke();}}ctx.restore();}
    ctx.strokeStyle='#74e9ff';ctx.lineWidth=.6;for(const f of fields)if(f.age>=f.burn&&f.age<=f.burn+1.2)for(let n=0;n<W*H;n++)if(spellCell(f,n)>=0)ctx.strokeRect(n%W*12,(n/W|0)*12,12,12);
    for(const shot of shots){const v=Math.hypot(shot.dx,shot.dy)||1,r=shot.art>=0?.3:.09,t=shot.art>=0?0:.3;ctx.strokeStyle='#ffd277';ctx.lineWidth=r*24;ctx.lineCap='round';ctx.beginPath();if(!t)ctx.arc(shot.x*12,shot.y*12,r*12,0,Math.PI*2);else{ctx.moveTo((shot.x-shot.dx/v*t)*12,(shot.y-shot.dy/v*t)*12);ctx.lineTo((shot.x+shot.dx/v*t)*12,(shot.y+shot.dy/v*t)*12);}ctx.stroke();}
    ctx.restore();
   }
   if(dt>0)fps=fps?fps*.9+.1/dt:1/dt;
   if(time-reportAt>150){$('info').textContent='x '+player.x.toFixed(2)+' · y '+player.y.toFixed(2)+' · '+Math.round(fps)+' fps'+(paused?' · PAUSED':'');reportAt=time;}
  }
 };
}
