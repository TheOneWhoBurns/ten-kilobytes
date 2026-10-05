const actionStates={attack:{phase:1,inputs:new Set(),cooldown:0,direction:0},interact:{phase:1,inputs:new Set(),cooldown:0}};
let action=null,facing=0,moveIntent='',objects=[],sparks=[],collected=0,gait=0,walking=false;
const actor=DEV?document.createElement('canvas'):null,actorArt=DEV?actor.getContext('2d'):null;
if(DEV){actor.width=12;actor.height=456;}
function makeActor(){
 // Release frames already occupy an isolated atlas region. Tint them in place
 // instead of allocating and copying a second player sheet.
 if(!DEV){art.globalCompositeOperation='source-atop';art.fillStyle=power?powerRule(P_BODY):'#efefdb';art.fillRect(assets.actor*12,0,288,12);art.globalCompositeOperation='source-over';return;}
 actorArt.clearRect(0,0,12,456);actorArt.imageSmoothingEnabled=false;
 const source=(sprite-103)*12;
 if(DEV)for(let frame=0;frame<7;frame++){
  const y=frame*12;
  actorArt.save();actorArt.translate(12,y);actorArt.scale(-1,1);actorArt.drawImage(atlas,source,0,12,12,0,0,12,12);actorArt.restore();
  if(frame>0){
   // Keep this character's head, clothes and legs. Re-pose the reaching arm.
   actorArt.clearRect(8,y+6,4,4);actorArt.fillStyle='#efefdb';
   if(frame<4){const reach=[0,4,3,1][frame];actorArt.fillRect(7,y+7,reach,1);actorArt.fillRect(7+reach,y+6,2,3);}
   else{const reach=frame===4?2:frame===5?3:1;actorArt.fillRect(7,y+7,2,1);actorArt.fillRect(8,y+8,1,reach);actorArt.fillRect(8,y+7+reach,2,2);}
  }
 }
 if(DEV){actorArt.save();actorArt.translate(12,84);actorArt.scale(-1,1);actorArt.drawImage(actor,0,0,12,84,0,0,12,84);actorArt.restore();}
 if(!DEV||sprite===104)for(let i=0;i<24;i++)actorArt.drawImage(atlas,(assets.actor+i)*12,0,12,12,0,168+i*12,12,12);
 if(power){actorArt.globalCompositeOperation='source-atop';actorArt.fillStyle=powerRule(P_BODY);actorArt.fillRect(0,0,12,456);actorArt.globalCompositeOperation='source-over';}
}
function actionRate(type){return DEV?dev.actionRate(type):12;}
function actionMode(type){return DEV?dev.actionMode(type):type==='attack'?'hold':'press';}
function attackLocked(){const a=actionStates.attack;return a.phase<1||a.inputs.size>0;}
function faceMovement(dx,dy){
 const intent=dx+','+dy;
 // A held attack strafes. Releasing it preserves aim until movement input changes.
 if(intent!==moveIntent&&(dx||dy)&&!attackLocked()){
  if(dx&&dy){if(Math.abs(Math.cos(facing))>=Math.abs(Math.sin(facing)))dy=0;else dx=0;}
  facing=Math.atan2(dy,dx);
 }
 moveIntent=intent;
}
function updateActionUI(){
 for(const type of ['attack','interact'])$(type).setAttribute('data-active',String(actionStates[type].phase<1));
}
function resetActions(){
 for(const state of Object.values(actionStates)){state.phase=1;state.inputs.clear();state.cooldown=0;}
 action=null;facing=0;moveIntent='';gait=0;walking=false;collected=0;sparks=[];
 objects=room.loot;
 updateActionUI();
}
function releaseActions(){for(const state of Object.values(actionStates))state.inputs.clear();}
function releaseAction(type,source='key'){actionStates[type].inputs.delete(source);}
function effect(type){
 if(type==='attack'){
  worldAttack();

 }else{
  if(worldInteract())return;
  let target,distance=1.6;for(const o of objects){const d=Math.hypot(o.x-player.x,o.y-player.y);if((o.kind===1||o.kind===3)&&d<distance&&canFit(room.cells,(o.x+player.x)/2,(o.y+player.y)/2)){target=o;distance=d;}}
  if(target){if(!attackLocked())facing=Math.atan2(target.y-player.y,target.x-player.x);takeLoot(target);target.kind=2;collected++;}
 }
}
function performAction(type){
 if(DEV&&dev.paused)return;
 if(type==='interact'&&!health){worldInteract();return;}
 if(!health||travel>0)return;
 const state=actionStates[type];
 if(state.phase>=1&&state.cooldown<=0){
  state.phase=0;state.rate=actionRate(type);
  if(type==='attack'){state.direction=facing;state.cooldown=(DEV?dev.attackCooldown()/1000:.15)*weaponRules[weapon][W_COOLDOWN];}
  effect(type);updateActionUI();
 }
}
function holdAction(type,source='key'){
 if(DEV&&dev.paused)return;
 actionStates[type].inputs.add(source);performAction(type);
}
function tickActions(dt){
 let changed=false;
 for(const type of ['attack','interact']){
  const state=actionStates[type];
  state.cooldown=Math.max(0,state.cooldown-dt);
  if(state.phase<1){state.phase+=dt*state.rate;if(state.phase>=1){state.phase=1;changed=true;}}
  if(state.inputs.size&&actionMode(type)==='hold'&&state.phase>=1&&state.cooldown<=0&&dt>0){performAction(type);changed=true;}
 }
 const type=Object.keys(actionStates).find(k=>actionStates[k].phase<1);
 action=type?{type,phase:actionStates[type].phase}:null;
 if(changed)updateActionUI();
 for(const o of objects)if(o.kind!==2){
  const x=Math.round(o.x*12)-6,y=Math.round(o.y*12)-6;tile(ctx,o.kind===3?assets.weapon+weaponRules[o.value][W_SPRITE]:assets.loot,x,y);

 }
 if(DEV){sparks=sparks.filter(p=>p.time>0);
 for(const p of sparks){p.time-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;ctx.fillStyle='#e7d3a0';ctx.fillRect(Math.round(p.x),Math.round(p.y),2,2);}}
}
function actionFrame(){return action?1+(action.type==='interact'?3:0)+Math.min(2,Math.floor(action.phase*3)):0;}
function actorDirection(){return Math.abs(Math.sin(facing))>Math.abs(Math.cos(facing))?(facing>0?2:3):(Math.cos(facing)<0?1:0);}
function drawActor(x,y){
 const frame=actionFrame(),left=DEV&&Math.cos(facing)<0,jab=action?.type==='attack'?[0,2,1,0][frame]:0;
 let phase=DEV?frame+(left?7:0):0;
 if(!DEV||sprite===104){
  const step=Math.floor(gait)%4,column=action?[0,3,4,0,5,5,0][frame]:walking?(step===1?1:step===3?2:0):0;
  phase=14+actorDirection()*6+column;
 }
 if(power){ctx.fillStyle=powerRule(P_COLOR);if((powerRule(P_FLAGS)&2)&&walking){ctx.globalAlpha=.18;drawPlayerFrame(phase,x-Math.cos(facing)*4,y-Math.sin(facing)*4);ctx.globalAlpha=1;}else for(let i=0;i<3;i++){const a=worldTime*3+i*2.1;ctx.fillRect(x+5+Math.round(Math.cos(a)*7),y+5+Math.round(Math.sin(a)*7),1,powerRule(P_HEIGHT));}}
 drawPlayerFrame(phase,x+Math.round(Math.cos(facing)*jab),y+Math.round(Math.sin(facing)*jab));
 if(action?.type==='attack'){
  const reach=[0,10,8,6][frame],px=Math.round(player.x*12+Math.cos(facing)*reach),py=Math.round(player.y*12+Math.sin(facing)*reach);
  ctx.fillStyle='#efefdb';ctx.fillRect(px-1,py-1,3,3);
 }
}
function drawPlayerFrame(phase,x,y){if(DEV)ctx.drawImage(actor,0,phase*12,12,12,x,y,12,12);else tile(ctx,assets.actor+phase-14,x,y);}
