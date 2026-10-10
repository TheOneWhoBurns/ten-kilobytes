// Release input is keyboard-only after removing the bottom action buttons.
// One held flag replaces the multi-pointer set. Release defaults are fixed; the dev build retains its generic configurable controller.
// Specialize before recipe columns, so added weapon cadence/art fields stay data-driven.
const acorn=require('acorn'),{createHash}=require('node:crypto');
// Fail closed if future gameplay edits change a controller function. Update this
// adapter and its extension/equivalence tests together; never silently drop logic.
const controllerHashes={
  "attackLocked": "4eabae3c931c948a9c46c3b37d0013e2ab203c24e9f3f2de08f9731f96703aa9",
  "updateActionUI": "e763f2b1954f160fde25545197400f48b01b756f671b0eb187597e203c29f908",
  "resetActions": "0e2d851afb38f754c59c0cd7f8177f54e7ca923296301b123ab405580ce13cd2",
  "releaseActions": "62e0a72d18bccc889cd70e3b800d554f3630b75ac87f6d62f25379cbd7413492",
  "releaseAction": "2a79319c70112afbb17659de0cbc008a7da301dc090a825066dc8810a0c00633",
  "performAction": "55f7b77be8e517e13ed274e3e995abcb6286f2510c35197dcab0b5bfb519420c",
  "holdAction": "1c4fa5859b9b0afe23e9011d2f23b51245cbf869b1078ac195f7929664231c08",
  "tickActions": "deca12a8cdeeac11f3cd28ef36265022adbb8686ace5b04e221249a7ffa9b101",
  "actionFrame": "eb5d2931d18bcdbf5a8f26129a9d1bb425d9d7b97554defdd54eb0009178ec13"
};

function specialize(source){
 const node=acorn.parse(source,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='performAction');
 const match=source.slice(node.start,node.end).match(/state\.cooldown=([^;]+);/);if(!match)throw Error('Missing cooldown expression');
 const cool=match[1].replace('(DEV?dev.attackCooldown()/1000:.15)','.15');
 const bodies={
 attackLocked:'return !!dash||blows.length>0||attackPhase<1||heldAttack>0;',
 updateActionUI:"if(DEV/*diagnostics*/)for(const type of ['attack','interact'])$(type).setAttribute('data-active',String((type==='attack'?attackPhase:interactPhase)<1));",
 resetActions:'attackPhase=interactPhase=1;cooldown=0;heldAttack=false;action=0;facing=0;moveIntent=0;gait=0;walking=false;objects=room.loot;updateActionUI();',
 releaseActions:'heldAttack=false;',
 releaseAction:"if(type==='attack')heldAttack=false;",
 holdAction:"if(type==='attack')heldAttack=true;performAction(type);",
 performAction:`if(type==='interact'&&!health){worldInteract();return;}if(!health||travel>0)return;if(type==='attack'){if(attackPhase<1||cooldown>0)return;attackPhase=0;cooldown=${cool};}else{if(interactPhase<1)return;interactPhase=0;}effect(type);updateActionUI();`,
 tickActions:"cooldown=Math.max(0,cooldown-dt);if(attackPhase<1)attackPhase=Math.min(1,attackPhase+dt*actionRate('attack'));if(interactPhase<1)interactPhase=Math.min(1,interactPhase+dt*12);if(heldAttack&&attackPhase>=1&&cooldown<=0&&dt>0)performAction('attack');action=attackPhase<1?1:interactPhase<1?2:0;updateActionUI();",
 actionFrame:'return action?1+(action===2?3:0)+Math.min(2,Math.floor((action===1?attackPhase:interactPhase)*3)):0;'
 };
 const ast=acorn.parse(source,{ecmaVersion:2020}),edits=[];
 for(const n of ast.body)if(n.type==='FunctionDeclaration'&&controllerHashes[n.id.name]&&createHash('sha256').update(source.slice(n.start,n.end)).digest('hex')!==controllerHashes[n.id.name])throw Error('Update release controller and equivalence tests for changed '+n.id.name);
 for(const n of ast.body){if(n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='actionStates'))edits.push([n.start,n.end,'let attackPhase=1,interactPhase=1,cooldown=0;let heldAttack=false;']);if(n.type==='FunctionDeclaration'&&bodies[n.id.name]){edits.push([n.body.start,n.body.end,'{'+bodies[n.id.name]+'}']);delete bodies[n.id.name];}}
 if(Object.keys(bodies).length)throw Error('Missing action function');
 for(const[a,b,s]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+s+source.slice(b);
 return source.replace('let action=null','let action=0').replaceAll("action?.type==='attack'",'action===1').replaceAll('actionStates.attack.direction','facing').replaceAll('actionStates.attack.phase','attackPhase');
}

function replaceOnce(source,from,to){
 if(!source.includes(from)||source.indexOf(from)!==source.lastIndexOf(from))throw Error('Release specialization drift: '+from);
 return source.replace(from,to);
}
module.exports=(source,{nativeRandom=true,catalog,diagnostics=false}={})=>{
 source=specialize(source);
 source=replaceOnce(source,'e={...spot(),boss,kind,pattern:','e={...spot(),boss,rule,pattern:');
 source=replaceOnce(source,'function enemyRule(e){return enemyRules[e.kind+(BOSS_COUNT&&e.boss?ENEMY_COUNT:0)];}','function enemyRule(e){return e.rule;}');
 // The catalog compiler currently supports at most one boss definition.
 source=replaceOnce(source,'const pool=bossDrops[e.kind];','const pool=bossDrops[0];');
 if(catalog&&!catalog.bosses.length){
  source=source.replaceAll(/\be\.boss\b/g,'false');
  for(const [from,to]of [
   ['e={...spot(),boss,rule,pattern:','e={...spot(),rule,pattern:'],
   ['kind+(boss?ENEMY_COUNT:0)','kind'],
   ['let kind=boss?0:','let kind='],
   ['if(boss){e.x=15.5;e.y=6.5+pick(3);}',''],
   ['e.hp=boss?(6+depth)*40/3:1','e.hp=1']
  ])source=replaceOnce(source,from,to);
 }
 if(catalog&&![...catalog.enemies,...catalog.bosses].some(e=>[].concat(e.attack.mode).includes('ring'))&&!catalog.weapons.some(w=>w.traits?.includes('ring'))){
  if(![...catalog.enemies,...catalog.bosses].some(e=>Array.isArray(e.attack.mode)&&e.attack.mode.length>1)){source=replaceOnce(source,'e.cycle++;','');source=replaceOnce(source,',cycle:0','');}
  source=replaceOnce(source,'ring=mode===2','ring=false');
  source=replaceOnce(source,'if(j!==gap)','');
  source=replaceOnce(source,'flags&4?j/count*Math.PI*2:(j-(count-1)/2)*spread','(j-(count-1)/2)*spread');
 }
 if(nativeRandom){
  source=replaceOnce(source,"rng=randomFor(value+':'+depth);",'rng=Math.random;');
  source=replaceOnce(source,"if(fresh){const n=new Uint32Array(1);crypto.getRandomValues(n);seed=n[0];if(DEV)$('seed').value=seed;}","if(DEV&&fresh){const n=new Uint32Array(1);crypto.getRandomValues(n);seed=n[0];$('seed').value=seed;}");
 }
 if(catalog)source=require('./specialize-state.cjs')(source,catalog,diagnostics);
 if(catalog&&!diagnostics)source=require('./specialize-calls.cjs')(source,catalog);
 return source;
};
