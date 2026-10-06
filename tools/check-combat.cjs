const assert=require('assert/strict'),boot=require('./combat-harness.cjs'),fs=require('fs'),data=require('./content-data.cjs');
for(const [specialize,release] of [[false,false],[true,false],[true,true]]){
 const g=boot(specialize,release),id=g.ids;
 // Contact-independent movement, committed charges, formations and path following.
 g.init();let e=g.enemy(id.swarm,5.5,10.5);g.tick(50);assert(Math.abs(e.x-6.125)<.03,'swarm walks slowly toward player');
 for(const [name,speed] of [['horse',12],['slow-horse',3]]){g.init();e=g.enemy(id[name],5.5,10.5);g.tick(10);assert(Math.abs(e.x-5.5-speed*.1)<.03,'horse charges immediately at specified speed');g.position(15.5,15.5);const y=e.y;g.tick(10);assert.equal(e.y,y,'horse does not steer during straight charge');}
 g.init();e=g.enemy(id.charge,6.5,10.5);g.tick(1);assert.equal(e.phase,1);const x=e.x;g.tick(20);assert.equal(e.x,x,'charge keeps windup');
 g.init();const a=g.enemy(id.conga,8.5,10.5,{trail:[{x:8.5,y:10.5}]}),b=g.enemy(id.conga,7.5,10.5,{follow:a,trail:[{x:7.5,y:10.5}]});g.tick(30);assert(Math.abs(a.x-11.8)<.04,'conga leader moves at 11');assert(a.x-b.x>.75&&a.x-b.x<1.15,'follower retains line spacing');a.hp=0;const bx=b.x;g.tick(10);assert(b.x>bx,'dead leader does not stall conga');assert(b.trail.length<=64);
 g.init();for(let y=10;y<20;y++)g.wall(10,y);const leader=g.enemy(id.conga,9.5,11.5,{trail:[],form:0}),follower=g.enemy(id.conga,9.5,12.5,{follow:leader,trail:[]});g.position(15.5,11.5);g.tick(90);assert(follower.x>10.5,'follower follows the traversed bend around a wall');

 // Four projectile grammars, with boss appearance unchanged.
 for(const [name,count,speed,life] of [['arrow-single',1,3.2,2.5],['arrow-fan',5,3.2,2.5],['arrow-sniper',1,6.4,1000],['arrow-rapid',5,3.2,2.5]]){g.init();e=g.enemy(id[name],5.5,10.5,{phase:1,wait:0,angle:0});g.tick(1);assert.equal(g.state.shots.length,count,name);const s=g.state.shots[0];assert(Math.abs(Math.hypot(s.dx,s.dy)-speed)<1e-8);assert(s.life>life-.02);assert(!s.boss);}
 const cadence={};for(const name of ['arrow-fan','arrow-rapid','arrow-sniper']){g.init();e=g.enemy(id[name],5.5,10.5);g.tick(800);cadence[name]=e.cycle;}assert(cadence['arrow-rapid']>cadence['arrow-fan']*1.5);assert(cadence['arrow-sniper']<cadence['arrow-fan']);
 // Six spell shapes use the same warning/blank/fire timing and finite room cells.
 const signatures=new Set();for(const shape of [0,1,4,5]){g.init();g.cast({x:6.5,y:10.5},0,shape);const f=g.state.fields[0];assert(f.cells.size>0);signatures.add([...f.cells.keys()].sort().join(','));for(const [n]of f.cells)assert(n>=0&&n<31*21&&g.state.room.cells[n]===1);f.age=f.burn-.3;assert(g.frameSprites().every(n=>n===338),'bright warning');f.age=f.burn-.1;assert.equal(g.frameSprites().length,0,'blank beat before fire');f.age=f.burn+.1;assert(g.frameSprites().every(n=>n>=339&&n<=341),'generated animated fire');}assert.equal(signatures.size,4,'four distinct spell geometries');
 g.init();g.cast(g.state.player,0,5);g.combat(79);assert.equal(g.state.health,20,'warning does not hurt');g.combat(2);assert.equal(g.state.health,19,'burn damages');g.combat(100);assert.equal(g.state.fields.length,0,'expired spell storage released');
 g.init();e=g.enemy(id.kamikaze,14.75,10.5);g.tick(1);assert.equal(g.state.fields[0].cells.size,9);g.tick(81);assert.equal(e.hp,0,'kamikaze dies with explosion');assert.equal(g.state.health,19);
 // Six seconds of sight, with real wall and cone occlusion.
 g.init();e=g.enemy(id.medusa,5.5,10.5);g.tick(599);assert.equal(g.state.health,20);assert(g.state.gaze>5.9);assert(g.frameSprites().includes(335));g.tick(2);assert.equal(g.state.health,19);assert(g.state.gaze<.02);
 g.init();g.enemy(id.medusa,5.5,10.5);g.tick(300);g.wall(10,10);g.tick(1);assert.equal(g.state.gaze,0,'cover resets accumulated gaze');g.tick(800);assert.equal(g.state.health,20,'walls occlude gaze');
 g.init();g.enemy(id.medusa,5.5,10.5);g.tick(100);g.position(5.5,16.5);g.tick(1);assert.equal(g.state.gaze,0,'leaving locked cone resets gaze');
 // Weapon actions, immediate cadence, art, damage envelopes, and per-shot hit memory.
 g.init();g.press();assert.equal(g.cooldown(),.3,'starting cooldown increased to 300ms');
 g.init();g.weapon(1);g.aim(0);g.attack();assert.equal(g.state.shots.length,1);assert.equal(g.state.shots[0].life,1000);g.tick(400);assert.equal(g.state.shots.length,0,'unlimited-range arrow ends at wall');
 g.init();g.weapon(2,1);g.aim(0);e=g.enemy(id['arrow-single'],17.5,10.5,{hp:20,wait:999});g.attack();assert.equal(g.state.shots[0].art,1);g.weapon(1);g.tick(80);assert.equal(e.hp,18,'returning projectile hits a given target once and retains original art/traits');
 for(const type of [3,4,7]){g.init();g.weapon(type);g.aim(0);const front=g.enemy(id['arrow-single'],17.2,10.5,{hp:20,wait:999}),back=g.enemy(id['arrow-single'],13.8,10.5,{hp:20,wait:999});g.attack();g.combat(40);assert(front.hp<20);assert.equal(back.hp,type===4?18:20,'only spin hits behind');assert.equal(g.state.blows.length,0);}
 g.init();g.weapon(5);g.aim(0);e=g.enemy(id['arrow-single'],17,10.5,{hp:20,wait:999});g.attack();assert.equal(e.hp,18,'double hit starts immediately');g.combat(8);assert.equal(e.hp,16,'second punch follows quickly');
 g.init();g.weapon(6);g.aim(0);g.attack();g.combat(20);assert.equal(g.state.player.x,15.5,'thrust charges before moving');g.combat(10);assert(g.state.player.x>16.5);g.combat(20);assert.equal(g.state.dash,null);
 // Shared melee records retain exact expiry, one hit per target, and the heavy rectangle.
 g.init();g.weapon(6);g.aim(0);g.attack();g.combat(2,.21);assert.equal(g.state.dash,null,'thrust releases at an exact .42-second boundary');assert.equal(g.state.blows.length,0);
 g.init();g.weapon(7);g.aim(0);const heavyTargets=[[18.9,11.9],[19.1,10.5],[17,12.1]].map(([x,y])=>g.enemy(id['arrow-single'],x,y,{hp:20,wait:999}));g.attack();g.combat(20);assert.deepEqual(heavyTargets.map(e=>e.hp),[18,20,20],'heavy hit retains its forward rectangular bounds and hits once');
 g.init();g.weapon(8);g.aim(0);g.attack();assert.equal(g.state.fields.length,1);assert.equal(g.state.fields[0].damage,2);e=g.enemy(id['arrow-single'],18.5,10.5,{hp:20,wait:999});g.combat(300);assert.equal(e.hp,18,'magic burns targets on its line once');
 // Armor is the only healing; score and health persist across floors.
 g.init();g.health(2);g.hurt();assert.equal(g.state.health,1);g.take({kind:4,value:0});assert.equal(g.state.health,2);assert.equal(g.state.maxHealth,3);g.hit(g.enemy(id.swarm,4.5,4.5),1);g.hit(g.enemy(0,8.5,8.5,{boss:true,kind:0,hp:140,pattern:0}),200);assert.equal(g.state.health,2,'boss victory does not heal');const score=g.state.score;g.nextFloor();assert.equal(g.state.health,2);assert.equal(g.state.maxHealth,3);assert.equal(g.state.score,score);g.reset();assert.equal(g.state.maxHealth,2);assert.equal(g.state.health,2);
 console.log('PASS expanded combat '+(release?'release controller':specialize?'specialized recipes':'authoring recipes'));
}
// Compare the actual binary art inputs to the user-coordinate manifest.
const catalog=data.load(),manifest=require('../assets/roster-pools.json'),art=new Set(catalog.enemySprites.map(p=>p.join(','))),empty=new Set([...Object.values(manifest.omittedEmptyTiles),...Object.values(manifest.trimmedEnemyTiles)].flat().map(p=>p.join(',')));
for(const pool of Object.values(manifest.requestedEnemyPools))for(const p of pool)assert(art.has(p.join(','))||empty.has(p.join(',')),'requested enemy tile retained '+p);
const compiled=data.compile(),weapons=new Set(compiled.weaponTiles.map(p=>p.x+','+p.y));for(const pool of manifest.weaponPools)for(const p of pool.tiles)assert(weapons.has(p.join(','))||[...manifest.omittedEmptyWeaponTiles,...manifest.trimmedWeaponTiles].some(q=>q.join(',')===p.join(',')),'requested weapon art retained or recorded as trimmed '+p);assert.equal(compiled.armorTiles.length,4);
console.log('PASS complete requested enemy, weapon and armor sprite pools');

// Every boss-drop artwork candidate remains selectable after range encoding.
for(const release of [false,true]){
 const g=boot(true,release),drops=catalog.bosses[0].drop;
 for(let k=0;k<drops.length;k++){
  const value=catalog.weapons.findIndex(w=>w.id===drops[k]),w=catalog.weapons[value],forms=w.sprites||[w.sprite];
  for(let j=0;j<forms.length;j++){
   g.init();g.state.world.reward=(k+.5)/drops.length;
   const boss=g.enemy(0,5.5,5.5,{boss:true,kind:0,hp:140,pattern:0,prize:(j+.5)/forms.length});g.hit(boss,200);
   const loot=g.state.room.loot[0],expected=compiled.weaponTiles.findIndex(p=>p.x===forms[j][0]&&p.y===forms[j][1]);
   assert.equal(loot.value,value);assert.equal(compiled.weaponRows[value][10],expected,'each boss drop shows its weapon icon');
  }
 }
}
console.log('PASS compact weapon-art ranges: every boss weapon shows its single icon');
