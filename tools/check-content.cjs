const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),data=require('./content-data.cjs'),examples=require('./content-examples.cjs');
const runtime=['room','actions','world'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
function boot(catalog,specialize){
 const c=data.compile(catalog,{specialize}),context={fillRect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){}},fields=new Map();
 const document={createElement:()=>({getContext:()=>context}),getElementById:id=>{if(!fields.has(id))fields.set(id,{getContext:()=>context,setAttribute(){},style:{}});return fields.get(id);}};
 return vm.runInNewContext('const DEV=false,assets={actor:160,pantry:1,enemies:28,enemyCount:20,weapon:25,weaponCount:3,bosses:38};'+c.source+require('./landmark-data.cjs')()+c.transform(runtime)+`;({
 init(n){seed=n;reset();},level:makeLevel,
 get state(){return {room,world,player,health,shots,power,weapon};},
 isolate(e){room.enemies=e?[e]:[];shots=[];player={x:15.5,y:10.5};health=8;hurt=0;travel=0;},
 step:tickWorld,take:takeLoot,fire,attack:worldAttack,
 aim(a){facing=actionStates.attack.direction=a;},walk(v){walking=v;},speed:movementFactor,draw:drawWorld,
 startAttack(){performAction('attack');return actionStates.attack.cooldown;},
 drop:bossWeapon,rule:enemyRule,
 definitions(){return JSON.stringify([enemyRules,weaponRules,powerRules]);}
 })`,{document,Set,Uint8Array,Int16Array});
}
const catalog=data.load(),npc=examples.enemy(catalog,true),gun=examples.weapon(catalog),power=examples.power(catalog);
catalog.enemies[npc].biomes=[0];catalog.enemies[npc].weight=3;
catalog.weapons.push({id:'test-spear',name:'Test spear',sprite:[28,8],attack:{count:0},reach:2,cooldown:1.5});
const reports=[];
for(const specialize of [false,true]){
 const api=boot(catalog,specialize),definitions=api.definitions();let found,appearances=0;
 for(let seed=0;seed<120;seed++){
  const world=api.level(seed,1);
  for(const room of world.rooms)for(const e of room.enemies)if(!e.boss&&e.kind===npc){assert.equal(world.shape,0,'spawn biome mask');assert.equal(e.form,10,'new art offset');found=e;appearances++;}
 }
 assert(appearances>0,'new recipe is reachable');
 api.init(1);const e={...found,x:18.5,y:10.5,phase:1,wait:0,angle:0,cycle:0,pattern:0};api.isolate(e);
 const rule=api.rule(e);api.step(.01);assert.equal(api.rule(e),rule,'shared rule row, not per-enemy copy');
 assert.equal(api.state.shots.length,4,'new NPC ID emits a five-shot ring with one opening');
 assert(api.state.shots.some(s=>s.dx<0)&&api.state.shots.some(s=>s.dx>0),'ring reaches both sides');
 api.draw();
 api.init(1);api.isolate();api.aim(0);api.take({kind:3,value:gun});api.attack();
 assert.equal(api.state.shots.length,6,'new weapon ID emits a full ring');assert(api.state.shots.every(s=>s.pierce),'trait is independent of weapon ID');
 api.take({kind:3,value:0});assert(api.state.shots.every(s=>s.pierce),'in-flight behavior survives weapon replacement');
 const drops=new Set();for(let seed=0;seed<120;seed++){api.init(seed);drops.add(api.drop({kind:0}));}assert(drops.has(1)&&drops.has(gun),'old and new rewards remain reachable');
 api.init(1);api.isolate();api.aim(0);api.take({kind:3,value:catalog.weapons.length-1});
 const spearTarget={...found,x:18.5,y:10.5,hp:9,wait:999};api.isolate(spearTarget);api.attack();assert(spearTarget.hp<9,'data-defined melee reach');
 assert.equal(api.startAttack(),.15*1.5,'data-defined weapon cadence');
 api.init(1);const victim={...found,x:17,y:10.5,hp:9,wait:999,phase:0};api.isolate(victim);api.take({kind:1,value:{stat:power,value:2}});
 assert.equal(api.speed(),1.2,'data-defined movement modifier');api.walk(true);api.fire(api.state.player,0,0,1,1);api.step(.01);assert.equal(api.state.health,8,'new transformation phases while moving');
 api.walk(false);api.step(.01);assert.equal(api.state.health,6.5,'new incoming-damage multiplier');assert(victim.hp<9,'new retaliation hook');
 api.take({kind:1,value:{stat:0,value:1}});assert.equal(api.speed(),1,'new pickup removes old speed modifier');
 api.init(1);api.isolate();api.take({kind:3,value:2});api.aim(0);
 for(let j=0;j<95;j++)api.fire(api.state.player,0,1,1,1);const old=[...api.state.shots];api.attack();
 assert.equal(api.state.shots.length,96);assert(old.every(s=>s.curve===undefined),'full volley cannot modify earlier bullets');assert(api.state.shots[95].curve,'accepted new shot gets curvature');
 assert.equal(api.definitions(),definitions,'simulation never mutates definitions');
 reports.push(JSON.stringify(api.state.shots));
}
assert.equal(reports[0],reports[1],'column specialization preserves simulation');
const sequenceCatalog=data.load(),sequenceId=examples.enemy(sequenceCatalog);
Object.assign(sequenceCatalog.enemies[sequenceId].attack,{mode:['charge','ring','fan'],speed:3,chargeSpeed:11.5,count:5,countStep:0});
const sequences=[];
for(const specialize of [false,true]){
 const api=boot(sequenceCatalog,specialize);api.init(1);
 const e={boss:false,kind:sequenceId,form:6,x:16.5,y:10.5,hp:9,phase:1,wait:0,angle:0,cycle:0,pattern:0,flash:0};
 api.isolate(e);api.step(.01);assert.equal(e.cycle,1);assert.equal(api.state.shots.length,0,'first sequence move charges');
 const x=e.x;api.step(.01);assert(e.x>x,'charge stays selected throughout active phase');
 e.phase=3;e.wait=0;api.step(.01);assert.equal(e.phase,0);
 e.phase=1;e.wait=0;api.isolate(e);api.step(.01);assert.equal(e.cycle,2);assert.equal(api.state.shots.length,4,'second move is a ring with one gap');
 assert(api.state.shots.every(s=>Math.abs(Math.hypot(s.dx,s.dy)-3)<1e-10),'projectile speed is independent of charge speed');
 const ringX=e.x;api.step(.01);assert.equal(e.x,ringX,'projectile move does not become a charge after cycle increments');
 e.phase=3;e.wait=0;api.step(.01);e.phase=1;e.wait=0;api.isolate(e);api.step(.01);
 assert.equal(e.cycle,3);assert.equal(api.state.shots.length,5,'third move is a complete aimed fan');
 sequences.push(JSON.stringify(api.state.shots));
 e.phase=3;e.wait=0;api.step(.01);e.phase=1;e.wait=0;api.isolate(e);api.step(.01);assert.equal(e.cycle,4);assert.equal(api.state.shots.length,0,'sequence wraps back to charge');
}
assert.equal(sequences[0],sequences[1],'sequence specialization preserves attacks');
for(const mutate of [c=>c.weapons[1].traits=['typo'],c=>c.enemies[0].attack.windupp=.1,c=>c.bosses[0].drop=['missing'],c=>c.enemies[0].art.base=999,c=>c.powers[0].body='bad',c=>c.enemies[0].weight=0,c=>c.enemies[0].attack.mode=[],c=>c.enemies[1].attack.countStep=.5]){const c=data.load();mutate(c);assert.throws(()=>data.compile(c),/Content:/);}
console.log('PASS recipe extension: new IDs, art, biome/weight pools, charge/ring/fan sequences, ring/piercing/melee, cadence, transformations, reward reachability, shot cap, shared immutable rows and specialization');
