const acorn=require('acorn');
module.exports=(source,catalog,diagnostics=false)=>{
 const swarm=catalog.enemies.findIndex(e=>e.attack.mode==='swarm'),conga=catalog.enemies.findIndex(e=>e.attack.mode==='conga');
 if(!require('./specialize-weapons.cjs').eligible(catalog))return source;
 const simpleRoster=!catalog.enemies.some(e=>e.art?.themeStride||e.biomes)&&swarm>=0&&conga>=0;
 const body=(name,text)=>{const n=acorn.parse(source,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Missing '+name);if(text===undefined)return source.slice(n.body.start+1,n.body.end-1);source=source.slice(0,n.body.start)+'{'+text+'}'+source.slice(n.body.end);};
 body('takeLoot',`if(o.kind===4){health++;maxHealth++;}tone(550,.08,'triangle',.03);`);
 source=source.replace('weapon===0?[0,0,2,2,1,1,3,3][(Math.round(facing*4/Math.PI)+8)%8]:actorDirection()','[0,0,2,2,1,1,3,3][(Math.round(facing*4/Math.PI)+8)%8]');
 source=source.replace('fields=[],blows=[],dash=null,','fields=[],blows=[],').replaceAll('dash=null;','').replace(/\bdash\b/g,'false');
 if(simpleRoster){
 source=source.replace('shape:theme,','').replace('reward:song/2**31,','');
 source=source.replace('boss?-1:enemyRules.findIndex((r,k)=>(SEQUENCED_ENEMIES?r[E_MODE][0]:r[E_MODE])===(roll?6:3)&&pool.includes(k))','boss?-1:(roll?'+conga+':'+swarm+')');
 source=source.replace('solo=pool.filter(k=>![3,6].includes(SEQUENCED_ENEMIES?enemyRules[k][E_MODE][0]:enemyRules[k][E_MODE]))','solo='+JSON.stringify(catalog.enemies.flatMap((e,i)=>i===swarm||i===conga?[]:[i]))).replaceAll('(solo.length?solo:pool)','(solo)');
 }
 body('attackLocked','return blows.length>0||heldAttack>0;');
 source=source.replace('attackPhase>=1&&!false&&!blows.length','!blows.length');
 if(!diagnostics&&(catalog.weapons[0].rate??12)>=4&&catalog.weapons[0].cooldown*.15>=.3){
 body('performAction',`if(type==='interact'&&!health){worldInteract();return;}if(!health||travel>0)return;if(type==='attack'){if(cooldown>0)return;cooldown=.15*weaponRules[weapon][W_COOLDOWN];}else{if(interactPhase<1)return;interactPhase=0;}effect(type);`);
 body('tickActions',`cooldown=Math.max(0,cooldown-dt);interactPhase=Math.min(1,interactPhase+dt*12);if(heldAttack&&cooldown<=0&&dt>0)performAction('attack');action=interactPhase<1?2:0;`);
 body('actionFrame','return action?4+Math.min(2,Math.floor(interactPhase*3)):0;');
 source=source.replace('attackPhase=interactPhase=1','interactPhase=1');
 if(catalog.weapons[0].cooldown*.15>=.3){
  body('worldAttack',body('worldAttack').replace('blows.push({a:actionStates.attack.direction,age:-.08,hit:0})','blows={a:actionStates.attack.direction,age:-.08,hit:0}').replace('blows.push({a:facing,age:-.08,hit:0})','blows={a:facing,age:-.08,hit:0}'));
  body('tickCombat',body('tickCombat').replace('for(const b of blows){const previous=b.age;b.age+=dt;if(b.age<0)continue;','const b=blows;if(b){const previous=b.age;b.age+=dt;if(b.age>=0){').replace('blows=blows.filter(b=>b.age<.21);','}if(blows&&blows.age>=.21)blows=null;'));
  body('drawStarter',body('drawStarter').replace('const active=blows;\n for(const b of active.length?active:[{a:facing,age:-.08}]){','const b=blows||{a:facing,age:-.08};').replace('if(!!(p[3]&1)!==back)continue;','if(!!(p[3]&1)!==back)return;').replace(/\n }\s*$/,''));
  source=source.replaceAll('blows=[]','blows=null').replaceAll('blows.length>0','!!blows').replaceAll('!blows.length','!blows').replaceAll('blows[0]','blows');
  body('drawActor',"if(!health){tile(ctx,assets.actor+18,x,y);return;}const pose=blows?starterMotion(blows):null,direction=(Math.round(facing*4/Math.PI)+8)%8,step=gait|0,pull=pose&&pose[7]===1&&direction<4,phase=pose?pose[6]:[0,0,2,2,1,1,3,3][direction]*6+(interactPhase<1?(Math.floor(interactPhase*3)<2?5:0):walking?(step===1?1:step===3?2:0):0);if(pose){x+=Math.round(pose[4]);y+=Math.round(pose[5]);}if(pull){ctx.save();ctx.beginPath();ctx.rect(x,y,12,12);ctx.rect(x+3,y+7+(direction>>1),1,2);ctx.clip('evenodd');}drawPlayerFrame(phase,x,y);if(pull)ctx.restore();");
 }
 }
 return source;
};
