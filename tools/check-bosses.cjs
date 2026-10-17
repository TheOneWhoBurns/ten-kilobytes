const assert=require('node:assert/strict'),boot=require('./combat-harness.cjs'),data=require('./content-data.cjs');
for(const [specialize,release,optimized] of [[false,false,false],[true,false,false],[true,true,false],[true,true,true]]){
 const catalog=data.load(),g=boot(specialize,release,catalog,optimized),ids=g.bossIds,seen=new Set();
 g.init();g.steer(1,0);g.hold();g.steer(0,-1,35);assert.equal(g.state.facing,0,'held attack keeps strafe facing');g.release();g.steer(0,-1,60);assert.equal(g.state.facing,-Math.PI/2,'continuing movement turns after attack release');
 g.init();g.reveal(.45);g.hold();assert.equal(g.cooldown(),0,'arrival reveal does not consume attack cooldown');assert.equal(g.state.blows.length,0,'arrival reveal does not start a frozen strike');g.tick(50);assert(g.cooldown()>0,'held attack begins when arrival reveal finishes');
 g.init();const lastMob=g.enemy(g.ids['arrow-fan'],8.5,10.5,{wait:999});g.fire(lastMob,0,6,1,1000);g.tick(1);assert.equal(g.state.shots.length,1,'living enemies retain projectiles');g.hit(lastMob,1);g.tick(1);assert.equal(g.state.shots.length,0,'last kill clears enemy arrows');

 for(let seed=0;seed<1000;seed++){
  const w=g.level(seed,1),arena=w.rooms[w.boss],kind=g.kind(arena.enemies[0]),definition=catalog.bosses[kind];seen.add(kind);
  assert(w.rooms.every((r,i)=>i===w.boss||r.enemies.every(e=>!e.boss)));
  assert(arena.enemies.every(e=>e.boss&&g.kind(e)===kind));
  assert.equal(arena.enemies.length,definition.id==='radioactive-conga'?3:1);
  if(definition.id==='radioactive-conga'){
   assert.equal(new Set(arena.enemies.map(e=>e.form)).size,1);
   for(let i=1;i<3;i++)assert.equal(arena.enemies[i].follow,arena.enemies[i-1]);
  }
  const total=arena.enemies.reduce((n,e)=>n+e.hp,0);assert(Math.abs(total-(definition.hp*arena.enemies.length))<1e-8);
 }
 g.init();g.position(3.5,3.5);g.state.world.boss=0;g.state.room.age=1;g.enemy(ids.slime,15.5,10.5,{boss:true});
 for(const count of [4,8,16,0]){for(const e of [...g.state.room.enemies].filter(e=>e.hp>0))g.hit(e,2);const living=g.state.room.enemies.filter(e=>e.hp>0);assert.equal(living.length,count,'slime splits 4, then 2 per piece, then 2, then dies');if(count){g.position(g.state.room.gate.x,g.state.room.gate.y);assert.equal(g.interact(),false,'living slime pieces keep the exit locked');g.position(3.5,3.5);}assert.equal(new Set(g.state.room.enemies.map(e=>e.slot)).size,g.state.room.enemies.length);assert(g.state.room.enemies.length<32,'split family fits strike hit mask');for(const e of living){assert.equal(e.hp,1);g.hit(e,2);assert.equal(e.hp,1,'new pieces reject the spawning hit');assert(e.x>1&&e.x<30&&e.y>1&&e.y<20);}g.tick(26);}
 assert.equal(g.state.room.enemies.length,29,'whole split tree has 29 bodies');
 g.init();g.enemy(ids.slime,16.5,10.5,{boss:true});g.aim(0);g.attack();g.combat(22);assert.equal(g.state.room.enemies.filter(e=>e.hp>0).length,4,'one sword swing cannot consume multiple slime generations');
 g.init();g.health(2);const armor={x:17,y:10.5,kind:4,value:0};g.state.room.loot.push(armor);g.tick(1);assert.equal(g.state.health,2,'armor requires walking close');g.position(17,10.5);g.tick(1);assert.equal(g.state.health,3,'walking over armor adds one HP');g.tick(10);assert.equal(g.state.health,3,'armor is collected once');
 assert.equal(seen.size,6);for(const depth of [1,10,100])for(let seed=0;seed<30;seed++){const w=g.level(seed,depth);for(const e of w.rooms[w.boss].enemies)assert.equal(e.hp,catalog.bosses[g.kind(e)].hp,'boss HP stays fixed across floors');}
 g.init();g.health(1000);let horse=g.enemy(ids['horse-boss'],10.5,10.5,{boss:true,hp:100});g.tick(10);assert(Math.abs(horse.x-11.7)<.03,'old horse keeps speed 12');g.tick(1);assert.equal(horse.phase,2);const hy=horse.y;g.position(15.5,15.5);g.tick(20);assert.equal(horse.y,hy,'old horse commits to a straight charge');
 function spells(kind,boss){g.init();g.health(1000);const caster=g.enemy(kind,9.5,10.5,{boss,hp:1000,wait:0,pattern:0});const shapes=[];for(let n=0;n<1000;n++){g.tick(1);for(const f of g.state.fields)if(f.age<.015)shapes.push(f.shape);}return shapes;}
 const normal=spells(g.ids.mage,false),fast=spells(ids.archmage,true),hybrid=spells(ids.spellblade,true);
 assert.equal(fast.length,normal.length*4,'archmage doubles its previous rate to four times the normal mage');assert.deepEqual([...new Set(fast)].sort(),[0,1,4]);assert.equal(hybrid.length,normal.length,'spellblade keeps ordinary mage cadence');assert.deepEqual([...new Set(hybrid)].sort(),[0,1,4]);
 g.init();g.health(1000);const blade=g.enemy(ids.spellblade,14,10.5,{boss:true,hp:100,wait:0});g.tick(10);assert.equal(g.state.health,1000,'thrust has a windup');g.tick(8);assert.equal(g.state.health,999,'forward thrust reaches the player');assert(blade.x<14.6,'weapon connects before body contact');
 g.init();g.health(1000);g.position(16,10.5);for(let y=1;y<20;y++)g.wall(17,y);const radioactive=g.enemy(ids['radioactive-conga'],18.5,10.5,{boss:true,hp:100});g.tick(299);assert.equal(g.state.health,1000);assert(g.state.radiation>2.9);g.tick(2);assert.equal(g.state.health,999,'mobile radioactive boss uses the three-second exposure');assert.equal(radioactive.hp,100,'own radiation does not kill its source');g.position(5.5,10.5);g.tick(1);assert.equal(g.state.radiation,0);
 g.init();const cat=g.enemy(ids.kitty,15.5,10.5,{boss:true,hp:1});g.tick(1000);assert.equal(cat.x,15.5);assert.equal(cat.y,10.5);assert.equal(cat.angle,0);assert.equal(g.state.health,20,'kitty has no contact damage');assert.equal(g.state.fields.length,0);assert.equal(g.state.shots.length,0);g.hit(cat,1);assert.equal(cat.hp,0);
 g.init();g.health(1000);g.aim(0);const target=g.enemy(ids.kitty,16.7,10.5,{boss:true,hp:10,wait:999});g.attack();g.tick(25);assert.equal(target.hp,8,'one blade animation damages a multi-HP boss exactly once');g.attack();g.tick(25);assert.equal(target.hp,6,'a new blade attack can hit the boss again');
 console.log('PASS six boss encounters, complete art pools, old horse, dual-rate magic, thrust, radiation, passive kitty and multi-hit HP '+[specialize,release,optimized]);
}
