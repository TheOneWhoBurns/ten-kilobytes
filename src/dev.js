// Included only in the development build; no editor code ships in dist/.
function setupDev(){
 const defaults=()=>({speed:5,attackRate:12,attackCooldown:150,interactRate:12,attackMode:'hold',interactMode:'press',layout:'wasd',bindings:{up:'w',left:'a',down:'s',right:'d',attack:'i',interact:'o'},grid:false,hitbox:false,collapsed:false});
 const presets={wasd:{up:'w',left:'a',down:'s',right:'d'},arrows:{up:'arrowup',left:'arrowleft',down:'arrowdown',right:'arrowright'},ijkl:{up:'i',left:'j',down:'k',right:'l'}};
 const directions=['up','left','down','right'],bindings=[...directions,'attack','interact'],reserved=['r','[',']','p'];
 const validKey=k=>typeof k==='string'&&(k===' '||/^[a-z0-9]$/.test(k)||/^arrow(up|left|down|right)$/.test(k))&&!reserved.includes(k);
 const label=k=>({' ':'Space',arrowup:'↑',arrowleft:'←',arrowdown:'↓',arrowright:'→'}[k]||k.toUpperCase());
 let settings=defaults(),paused=false,collision=true,pending=null,fps=0,reportAt=0;
 try{
  const saved=JSON.parse(localStorage.getItem('room-zero-dev-v1'));
  if(saved){
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
 function pause(){paused=!paused;keys.clear();releaseActions();last=0;sync();}
 for(const id of ['speed','speed-range'])$(id).oninput=e=>{
  if(!Number.isFinite(+e.target.value)||!e.target.value)return;
  settings.speed=Math.max(.5,Math.min(20,+e.target.value));sync();save();
 };
 $('speed').onchange=()=>sync();
 $('attack-cooldown').oninput=e=>{if(!e.target.value||!Number.isFinite(+e.target.value))return;settings.attackCooldown=Math.max(0,Math.min(2000,+e.target.value));sync();save();};
 $('attack-cooldown').onchange=()=>sync();
 for(const type of ['attack','interact']){
  for(const id of [type+'-rate',type+'-range'])$(id).oninput=e=>{if(!e.target.value||!Number.isFinite(+e.target.value))return;settings[type+'Rate']=Math.max(.5,Math.min(30,+e.target.value));sync();save();};
  $(type+'-rate').onchange=()=>sync();
  $(type+'-mode').onchange=e=>{settings[type+'Mode']=e.target.value;releaseActions();save();};
 }

 $('layout').onchange=e=>{const layout=e.target.value;cancel();if(presets[layout]&&['attack','interact'].some(d=>Object.values(presets[layout]).includes(settings.bindings[d]))){$('binding-status').textContent='Key conflict';return;}settings.layout=layout;if(presets[settings.layout])settings.bindings={...settings.bindings,...presets[settings.layout]};keys.clear();releaseActions();sync();save();};
 for(const d of bindings)$('bind-'+d).onclick=()=>{keys.clear();releaseActions();pending=d;$('binding-status').textContent=d+': press key';sync();};
 $('pause').onclick=pause;
 $('dev-toggle').onclick=()=>{cancel();settings.collapsed=!settings.collapsed;sync();save();};
 $('collision').onchange=e=>{collision=e.target.checked;keys.clear();if(collision&&!canFit(room.cells,player.x,player.y))player={...room.spawn};sync();};
 $('respawn').onclick=()=>{keys.clear();releaseActions();player={...room.spawn};canvas.focus();};
 for(const id of ['grid','hitbox'])$(id).onchange=e=>{settings[id]=e.target.checked;save();};
 $('defaults').onclick=()=>{settings=defaults();collision=true;paused=false;pending=null;keys.clear();releaseActions();last=0;if(!canFit(room.cells,player.x,player.y))player={...room.spawn};$('binding-status').textContent='';sync();save();};
 sync();
 return {
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
   const dx=held('right')-held('left'),dy=held('down')-held('up'),length=Math.hypot(dx,dy),time=Math.min(dt,.05)*movementFactor();
   faceMovement(dx,dy);
   if(!length||time<=0)return;
   if(collision){const steps=Math.ceil(settings.speed/5);for(let i=0;i<steps;i++)movePlayer(room.cells,player,dx,dy,time*settings.speed/5/steps);}
   else{player.x=Math.max(.5,Math.min(W-.5,player.x+dx/length*time*settings.speed));player.y=Math.max(.5,Math.min(H-.5,player.y+dy/length*time*settings.speed));}
  },
  draw(dt,time){
   if(settings.grid){ctx.strokeStyle='#8baf5244';ctx.lineWidth=.5;ctx.beginPath();for(let x=0;x<=W;x++){ctx.moveTo(x*12,0);ctx.lineTo(x*12,H*12);}for(let y=0;y<=H;y++){ctx.moveTo(0,y*12);ctx.lineTo(W*12,y*12);}ctx.stroke();}
   if(settings.hitbox){ctx.strokeStyle='#c8f474';ctx.lineWidth=.7;ctx.strokeRect((player.x-.27)*12,(player.y-.27)*12,.54*12,.54*12);}
   if(dt>0)fps=fps?fps*.9+.1/dt:1/dt;
   if(time-reportAt>150){$('info').textContent='x '+player.x.toFixed(2)+' · y '+player.y.toFixed(2)+' · '+Math.round(fps)+' fps'+(paused?' · PAUSED':'');reportAt=time;}
  }
 };
}
