const actionStates={attack:{type:'attack',phase:1,inputs:new Set(),cooldown:0,direction:0},interact:{type:'interact',phase:1,inputs:new Set(),cooldown:0}};
let action=null,facing=0,moveIntent=0,objects=[],collected=0,gait=0,walking=false;
const actor=DEV?document.createElement('canvas'):null,actorArt=DEV?actor.getContext('2d'):null;
if(DEV){actor.width=12;actor.height=456;}
function makeActor(){
 // Only the development character selector needs a separate player sheet.
 if(!DEV)return;
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
}
// Each weapon swings at its own rate; interaction keeps the shared pace.
function actionRate(type){return DEV?dev.actionRate(type):type==='attack'?weaponRules[weapon][W_RATE]:12;}
function actionMode(type){return DEV?dev.actionMode(type):type==='attack'?'hold':'press';}
function attackLocked(){const a=actionStates.attack;return !!dash||blows.length>0||a.phase<1||a.inputs.size>0;}
function faceMovement(dx,dy){
 const intent=dx+3*dy;
 if((dx||dy)&&intent!==moveIntent&&!attackLocked())facing=Math.atan2(dy,dx);
 moveIntent=intent;
}
function updateActionUI(){
 if(DEV/*diagnostics*/)for(const type of ['attack','interact'])$(type).setAttribute('data-active',String(actionStates[type].phase<1));
}
function resetActions(){
 for(const state of Object.values(actionStates)){state.phase=1;state.inputs.clear();state.cooldown=0;}
 action=null;facing=0;moveIntent=0;gait=0;walking=false;collected=0;
 objects=room.loot;
 updateActionUI();
}
function releaseActions(){for(const state of Object.values(actionStates))state.inputs.clear();}
function releaseAction(type,source='key'){actionStates[type].inputs.delete(source);}
function effect(type){if(type==='attack')worldAttack();else worldInteract();}

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
 action=actionStates.attack.phase<1?actionStates.attack:actionStates.interact.phase<1?actionStates.interact:null;
 if(changed)updateActionUI();
}
function actionFrame(){return action?1+(action.type==='interact'?3:0)+Math.min(2,Math.floor(action.phase*3)):0;}
function actorDirection(){return Math.abs(Math.sin(facing))>Math.abs(Math.cos(facing))?(facing>0?2:3):(Math.cos(facing)<0?1:0);}
function drawActor(x,y){
 if(!health){tile(ctx,assets.actor+(DEV?24:18),x,y);return;}
 const blade=blows.find(b=>b.kind===0),frame=blade?(blade.age>=0&&blade.age<.16?1:0):actionFrame()||((dash||blows.some(b=>b.kind!==0&&b.kind!==5))?2:0),weaponType=weaponRules[weapon][W_TYPE],left=DEV&&Math.cos(facing)<0,jab=blade?0:weaponType===5&&action?.type==='attack'?3-frame:0;
 let phase=DEV?frame+(left?7:0):0;
 if(!DEV||sprite===104){
  const step=gait|0,column=frame?[0,3,4,0,5,5,0][frame]:walking?(step===1?1:step===3?2:0):0;
  phase=(DEV?14:0)+(weapon===0?[0,0,2,2,1,1,3,3][(Math.round(facing*4/Math.PI)+8)%8]:actorDirection())*6+column;
 }
 const direction=(Math.round(facing*4/Math.PI)+8)%8,pose=blade?starterMotion(blade):null,pull=pose&&pose[7]===1&&direction<4&&(!DEV||sprite===104);
 if(pose){phase=(DEV?14:0)+pose[6];x+=Math.round(pose[4]);y+=Math.round(pose[5]);}
 x+=Math.round(Math.cos(facing)*jab);y+=Math.round(Math.sin(facing)*jab);
 if(pull){ctx.save();ctx.beginPath();ctx.rect(x,y,12,12);ctx.rect(x+3,y+7+(direction>>1),1,2);ctx.clip('evenodd');}
 drawPlayerFrame(phase,x,y);
 if(pull)ctx.restore();

}
function drawPlayerFrame(phase,x,y){if(DEV)ctx.drawImage(actor,0,phase*12,12,12,x,y,12,12);else{
 // Release ships one side view; facing left draws the right-facing row mirrored.
 const row=phase/6|0;if(row===1&&phase%6===3){tile(ctx,assets.actor-1,x,y);}else if(row===1){transform(ctx,x+12,y,0,-1);tile(ctx,assets.actor+phase%6,0,0);ctx.restore();}else tile(ctx,assets.actor+(row&&row-1)*6+phase%6,x,y);
}}
