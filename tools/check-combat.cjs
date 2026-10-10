const assert=require('assert/strict'),boot=require('./combat-harness.cjs'),fs=require('fs'),data=require('./content-data.cjs');
for(const [specialize,release] of [[false,false],[true,false],[true,true]]){
 const g=boot(specialize,release,require('./content-examples.cjs').weapons(data.load())),id=g.ids;
 // Contact-independent movement, committed charges, formations and path following.
 g.init();let e=g.enemy(id.swarm,5.5,10.5);g.tick(50);assert(Math.abs(e.x-6.125)<.03,'swarm walks slowly toward player');
 for(const [name,speed] of [['horse',12]]){g.init();e=g.enemy(id[name],5.5,10.5);g.tick(10);assert(Math.abs(e.x-5.5-speed*.1)<.03,'horse charges immediately at specified speed');g.position(15.5,15.5);const y=e.y;g.tick(10);assert.equal(e.y,y,'horse does not steer during straight charge');}
 g.init();const swarm=[g.enemy(id.swarm,5.5,10.5),g.enemy(id.swarm,5.5,10.5),g.enemy(id.swarm,5.5,10.5)];g.tick(100);assert(Math.max(...swarm.map(e=>e.x))-Math.min(...swarm.map(e=>e.x))>.2,'swarm separates after bunching');
 g.init();e=g.enemy(id.charge,6.5,10.5);g.tick(1);assert.equal(e.phase,1);const x=e.x;g.tick(20);assert.equal(e.x,x,'charge keeps windup');
 for(const name of ['horse','charge']){g.init();g.wall(7,10);e=g.enemy(id[name],6.7,10.5,{phase:2,angle:0,wait:1});g.tick(2);assert.equal(e.phase,3,name+' enters shared recovery after hitting a wall');const stopped=e.x;g.tick(20);assert.equal(e.x,stopped,name+' stays stopped during recovery');}
 g.init();g.clock(1);const a=g.enemy(id.conga,8.5,10.5,{trail:[{x:8.5,y:10.5}]}),b=g.enemy(id.conga,7.5,10.5,{follow:a,trail:[{x:7.5,y:10.5}]});g.tick(30);assert(Math.abs(a.x-10.9)<.04,'conga leader moves at 8, below player speed');assert(a.x-b.x>.75&&a.x-b.x<1.15,'follower retains line spacing');a.hp=0;const bx=b.x;g.tick(10);assert(b.x>bx,'dead leader does not stall conga');assert(b.trail.length<=64);
 g.init();for(let y=10;y<20;y++)g.wall(10,y);const leader=g.enemy(id.conga,9.5,11.5,{trail:[],form:0}),follower=g.enemy(id.conga,9.5,12.5,{follow:leader,trail:[]});g.position(15.5,11.5);g.tick(90);assert(follower.x>10.5,'follower follows the traversed bend around a wall');

 g.init();g.clock(0);g.position(28.5,10.5);
 const dancers=Array.from({length:3},()=>g.enemy(id.conga,4.5,10.5,{trail:[]}));for(let i=1;i<3;i++)dancers[i].follow=dancers[i-1];
 g.tick(10);assert(dancers[0].x>4.5);assert.equal(dancers[1].x,4.5);assert.equal(dancers[2].x,4.5);
 g.tick(10);assert(dancers[1].x>4.5);assert.equal(dancers[2].x,4.5,'each follower has its own start lag');
 g.tick(30);assert(dancers[2].x>4.5);assert(dancers[0].x-dancers[1].x>.8&&dancers[1].x-dancers[2].x>.8,'bunched conga spreads back into a line');
 g.clock(3.5);const stopped=dancers.map(e=>e.x);g.tick(10);assert.deepEqual(dancers.map(e=>e.x),stopped,'all followers have a full rest window');
 g.clock(4);g.tick(10);assert(dancers[0].x>stopped[0]);assert.equal(dancers[1].x,stopped[1],'follower lag repeats each cycle');
 for(const name of ['swarm','conga','charge','horse','mage','medusa','arrow-fan']){
  g.init();g.clock(0);g.health(10000);g.position(15.5,10.5);
  for(let y=5;y<=15;y++)g.wall(10,y);for(let x=10;x<=18;x++){g.wall(x,5);g.wall(x,15);}
  const mob=g.enemy(id[name],8.5,10.5,{trail:[]});let reached=false;
  for(let t=0;t<10000&&!reached;t++){g.tick(1);reached=mob.x>10.5&&g.visible(mob);}
  assert(reached,name+' navigates around a U-shaped obstruction instead of oscillating at its corner');
 }

 g.init();const caster=g.enemy(id.mage,5.5,5.5);g.cast(g.state.player,0,5);g.state.room.cells[325]=1|(require('./environment-data.cjs').constants.FIRE<<1);caster.hp=0;g.tick(1);assert.equal(g.state.fields.length,0,'hostile spell fire ends with last enemy');assert.equal(g.state.room.cells[325],1,'floor fire ends with last enemy');assert.equal(g.state.health,20,'cleared fire cannot hurt the player');

 for(const [dx,dy] of [[1,1],[-1,1],[-1,-1],[1,-1]]){
  g.init();g.weapon(1);g.plant(true);g.steer(dx,dy);g.hold();const first=g.state.shots[0],velocity=[first.dx,first.dy];
  assert(Math.abs(Math.atan2(first.dy,first.dx)-Math.atan2(dy,dx))<1e-8,'diagonal aim works without stationary aiming');g.steer(-dx,-dy,35);const shot=g.state.shots.at(-1);assert.deepEqual([shot.dx,shot.dy],velocity,'Space no longer changes aim during held attacks');
 }
 g.init();g.weapon(1);g.plant(false);g.aim(0);g.hold();g.steer(-1,1,35);assert.equal(g.state.shots.at(-1).dy,0,'without Space, held attacks retain strafe aim');

 for(const [name,count,speed,life] of [['arrow-fan',5,3.2,2.5],['arrow-sniper',1,6.4,1000]]){g.init();e=g.enemy(id[name],5.5,10.5,{phase:1,wait:0,angle:0});g.tick(1);assert.equal(g.state.shots.length,count,name);const s=g.state.shots[0];assert(Math.abs(Math.hypot(s.dx,s.dy)-speed)<1e-8);assert(s.life>life-.02);assert(!s.boss);}
 const cadence={};for(const name of ['arrow-fan','arrow-sniper']){g.init();e=g.enemy(id[name],5.5,10.5);g.tick(800);cadence[name]=e.cycle;}assert(cadence['arrow-sniper']<cadence['arrow-fan']);
 // Six spell shapes use the same warning/blank/fire timing and finite room cells.
 const signatures=new Set();for(const shape of [0,1,4,5]){g.init();g.cast({x:6.5,y:10.5},0,shape);const f=g.state.fields[0];assert(f.cells.size>0);signatures.add([...f.cells.keys()].sort().join(','));for(const [n]of f.cells)assert(n>=0&&n<31*21&&g.state.room.cells[n]===1);f.age=f.burn-.3;assert(g.frameSprites().every(n=>n===338),'bright warning');f.age=f.burn-.1;assert.equal(g.frameSprites().length,0,'blank beat before fire');f.age=f.burn+.1;assert(g.frameSprites().every(n=>n>=339&&n<=341),'generated animated fire');}assert.equal(signatures.size,4,'four distinct spell geometries');
 g.init();g.cast(g.state.player,0,5);g.combat(79);assert.equal(g.state.health,20,'warning does not hurt');g.combat(2);assert.equal(g.state.health,19,'burn damages');g.combat(100);assert(g.state.fields.length,'fire lingers past half a second');g.combat(60);assert.equal(g.state.fields.length,0,'expired spell storage released');
 g.init();g.enemy(id['arrow-fan'],2.5,2.5,{wait:999});e=g.enemy(id.kamikaze,14.75,10.5,{wait:1.5});g.tick(1);assert.equal(g.state.fields[0].cells.size,9);assert.equal(g.state.fields[0].burn,.8);g.tick(77);assert.equal(e.hp,1,'kamikaze survives the shared warning and blank beat');assert.equal(g.state.health,20);g.tick(3);assert.equal(e.hp,0,'kamikaze dies as its field ignites');assert.equal(g.state.health,19);
 g.init();e=g.enemy(id.medusa,5.5,10.5);g.tick(20);assert.equal(g.state.gaze,0,'gaze range ends at seven tiles');assert(e.x>5.5,'medusa closes in to keep the player in its gaze');g.init();e=g.enemy(id.medusa,9.5,10.5,{angle:Math.PI});g.tick(150);assert(Math.cos(e.angle)>.99,'medusa turns its cone after the player');g.init();e=g.enemy(id.medusa,9.5,10.5);g.tick(299);assert.equal(g.state.health,20);assert(g.state.gaze>2.9);assert(g.frameSprites().includes(335));g.tick(2);assert.equal(g.state.health,19);assert(g.state.gaze<.02);
 g.init();g.enemy(id.medusa,9.5,10.5);g.tick(150);g.wall(11,10);g.tick(1);assert.equal(g.state.gaze,0,'cover resets accumulated gaze');g.tick(800);assert.equal(g.state.health,20,'walls occlude gaze');
 g.init();g.enemy(id.medusa,9.5,10.5);g.tick(100);g.position(9.5,15.5);g.tick(1);assert.equal(g.state.gaze,0,'leaving locked cone resets gaze');
 g.init();g.enemy(id.medusa,9.5,10.5);g.tick(299);g.hurt();g.tick(2);assert.equal(g.state.health,19);assert.equal(g.state.gaze,3,'gaze waits at the threshold during invulnerability');g.tick(80);assert.equal(g.state.health,18,'gaze hits after invulnerability expires');assert(g.state.gaze<.05,'gaze resets after the actual hit');

 for(let direction=0;direction<8;direction++)for(const [name,kind] of Object.entries(id)){
  g.init();g.weapon(0);const angle=direction*Math.PI/4,c=Math.cos(angle),s=Math.sin(angle),oy=data.load().enemies[kind].hitbox[2],px=15.5,py=10.5-1/3;
  g.aim(angle);
  const front=g.enemy(kind,px+c*1.4,py+s*1.4-oy,{hp:20,wait:999}),behind=g.enemy(kind,px-c*1.2,py-s*1.2-oy,{hp:20,wait:999}),beside=g.enemy(kind,px-s*1.4,py+c*1.4-oy,{hp:20,wait:999}),far=g.enemy(kind,px+c*2.3,py+s*2.3-oy,{hp:20,wait:999});
  g.attack();g.combat(7);assert.equal(front.hp,20,'blade windup cannot damage');g.combat(5);assert.equal(front.hp,18,name+' blade connects in direction '+direction);assert.equal(behind.hp,20,'punch cannot hit behind');assert.equal(beside.hp,20,'punch cannot hit outside its width');assert.equal(far.hp,20,'punch cannot reach beyond the fist');g.combat(30);assert.equal(front.hp,18,'one punch damages a target only once');
 }
 g.init();g.weapon(0);g.aim(0);g.wall(16,10);const blocked=g.enemy(id.charge,17,10.2,{hp:20,wait:999});g.attack();g.combat(20);assert.equal(blocked.hp,20,'punch cannot hit through a wall');
 for(const name of Object.keys(id)){
  g.init();g.weapon(0);g.aim(0);const close=g.enemy(id[name],16.15,10.5,{hp:20,wait:999});g.attack();g.combat(16);assert(close.hp<20,'starting blade connects with '+name+' at the same ground height');
  g.init();g.weapon(1);g.aim(0);const victim=g.enemy(id[name],18,10.5,{hp:20,wait:999,angle:Math.PI});g.attack();g.tick(30);assert(victim.hp<20,'arrow can hit '+name+' at the same ground height');
 }
 g.init();g.weapon(6);g.aim(0);const swept=g.enemy(id['arrow-fan'],17.5,10.2,{hp:20,wait:999});g.attack();g.combat(10,.05);assert.equal(swept.hp,18,'fast thrust sweeps the distance traveled without skipping a target');
 g.init();g.press();assert.equal(g.cooldown(),.3,'starting cooldown increased to 300ms');
 g.init();g.weapon(1);g.aim(0);g.attack();assert.equal(g.state.shots.length,1);assert.equal(g.state.shots[0].life,1000);g.tick(400);assert.equal(g.state.shots.length,0,'unlimited-range arrow ends at wall');
 g.init();g.weapon(2,1);g.aim(0);e=g.enemy(id['arrow-fan'],17.5,10.5,{hp:20,wait:999});g.attack();assert.equal(g.state.shots[0].art,1);g.weapon(1);g.tick(80);assert.equal(e.hp,18,'returning projectile hits a given target once and retains original art/traits');
 for(const type of [3,4,7]){g.init();g.weapon(type);g.aim(0);const front=g.enemy(id['arrow-fan'],17.2,10.5,{hp:20,wait:999}),back=g.enemy(id['arrow-fan'],13.8,10.5,{hp:20,wait:999});g.attack();g.combat(60);assert(front.hp<20);assert.equal(back.hp,type===4?18:20,'only spin hits behind');assert.equal(g.state.blows.length,0);}
 g.init();g.weapon(5);g.aim(0);e=g.enemy(id['arrow-fan'],16.2,10.2,{hp:20,wait:999});g.attack();assert.equal(e.hp,18,'double hit starts immediately');g.combat(8);assert.equal(e.hp,16,'second punch follows quickly');
 g.init();g.weapon(6);g.aim(0);g.attack();g.combat(20);assert.equal(g.state.player.x,15.5,'thrust charges before moving');g.combat(10);assert(g.state.player.x>16.5);g.combat(20);assert.equal(g.state.dash,null);
 // Shared melee records retain exact expiry, one hit per target, and the heavy rectangle.
 g.init();g.weapon(6);g.aim(0);g.attack();g.combat(2,.21);assert.equal(g.state.dash,null,'thrust releases at an exact .42-second boundary');assert.equal(g.state.blows.length,0);
 g.init();g.weapon(7);g.aim(0);const heavyTargets=[[18.1,10.8],[18.6,10.5],[17,11.8]].map(([x,y])=>g.enemy(id['arrow-fan'],x,y,{hp:20,wait:999}));g.attack();g.combat(20);assert(heavyTargets.every(e=>e.hp===20),'heavy hit winds up first');g.combat(35);assert.deepEqual(heavyTargets.map(e=>e.hp),[18,20,20],'heavy hit keeps a smaller forward rectangle and hits once');
 g.init();g.weapon(8);g.aim(0);g.attack();assert.equal(g.state.fields.length,1);assert.equal(g.state.fields[0].damage,2);e=g.enemy(id['arrow-fan'],18.5,10.5,{hp:20,wait:999});g.combat(300);assert.equal(e.hp,18,'magic burns targets on its line once');
 // Armor is the only healing; health persists across floors.
 g.init();g.health(2);g.hurt();assert.equal(g.state.health,1);g.take({kind:4,value:0});assert.equal(g.state.health,2);assert.equal(g.state.maxHealth,3);g.hit(g.enemy(id.swarm,4.5,4.5),1);g.hit(g.enemy(0,8.5,8.5,{boss:false,kind:0,hp:140,pattern:0}),200);assert.equal(g.state.health,2,'combat does not heal');g.nextFloor();assert.equal(g.state.health,2);assert.equal(g.state.maxHealth,3);g.reset();assert.equal(g.state.maxHealth,2);assert.equal(g.state.health,2);
 console.log('PASS expanded combat '+(release?'release controller':specialize?'specialized recipes':'authoring recipes'));
}
// Compare the actual binary art inputs to the user-coordinate manifest.
const catalog=data.load(),manifest=require('../assets/roster-pools.json'),art=new Set(catalog.enemySprites.map(p=>p.join(','))),empty=new Set([...Object.values(manifest.omittedEmptyTiles),...Object.values(manifest.trimmedEnemyTiles)].flat().map(p=>p.join(',')));
for(const pool of Object.values(manifest.requestedEnemyPools))for(const p of pool)assert(art.has(p.join(','))||empty.has(p.join(',')),'requested enemy tile retained '+p);
assert.equal(catalog.weapons.length,1);assert.equal(catalog.weapons[0].id,'fist');assert.deepEqual(require('../assets/catalog/runtime-selection.json').weapons,[]);
const retired=require('./content-examples.cjs').weapons(data.load()),compiled=data.compile(retired),weapons=new Set(compiled.weaponTiles.map(p=>p.x+','+p.y));for(const pool of manifest.weaponPools)for(const p of pool.tiles)assert(weapons.has(p.join(','))||[...manifest.omittedEmptyWeaponTiles,...manifest.trimmedWeaponTiles].some(q=>q.join(',')===p.join(',')),'requested weapon art retained or recorded as trimmed '+p);assert.equal(compiled.armorTiles.length,1);
console.log('PASS complete requested enemy, weapon and armor sprite pools');

// Every boss-drop artwork candidate remains selectable after range encoding.
for(const release of [false,true]){
 const fixture=require('./content-examples.cjs').boss(data.load()),g=boot(true,release,fixture),drops=fixture.bosses[0].drop;
 for(let k=0;k<drops.length;k++){
  const value=fixture.weapons.findIndex(w=>w.id===drops[k]),w=fixture.weapons[value],forms=w.sprites||[w.sprite];
  for(let j=0;j<forms.length;j++){
   g.init();g.state.world.reward=(k+.5)/drops.length;
   const boss=g.enemy(0,5.5,5.5,{boss:true,kind:0,hp:140,pattern:0,prize:(j+.5)/forms.length});g.hit(boss,200);
   const loot=g.state.room.loot.find(o=>o.kind===3),expected=compiled.weaponTiles.findIndex(p=>p.x===forms[j][0]&&p.y===forms[j][1]);
   assert.equal(loot.value,value);assert.equal(compiled.weaponRows[value][10],expected,'each boss drop shows its weapon icon');
  }
 }
}
console.log('PASS compact weapon-art ranges: every boss weapon shows its single icon');

// Live roster has no boss. Its arena remains reachable, and an empty arena cannot unlock descent.
assert.equal(catalog.bosses.length,0);
assert.deepEqual(require('../assets/catalog/runtime-selection.json').bossTiles,[]);
for(const [specialize,release] of [[false,false],[true,false],[true,true]]){
 const g=boot(specialize,release);
 for(let seed=0;seed<100;seed++){
  const w=g.level(seed,1);
  assert(w.rooms.every(r=>r.enemies.every(e=>!e.boss)),'retired boss never spawns');
  assert.equal(w.rooms[w.boss].enemies.length,0,'reserved boss arena is empty');
 }
 g.init();g.arena();assert.equal(g.interact(),false,'reserved exit stays inactive until replacement boss exists');
 g.tick(100);assert.equal(g.state.level,1);assert.equal(g.state.shots.length,0,'empty arena emits no projectiles');
 g.reset();g.position(15.5,10.5);assert.equal(g.interact(),true,'Room Zero entrance still works');
}
console.log('PASS boss removal: empty reserved arena, locked exit, no boss shots, working prologue');
