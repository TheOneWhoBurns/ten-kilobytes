const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),acorn=require('acorn'),path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
const build=require('./build.cjs'),encode=require('./sprite-data.cjs'),catalog=require('../assets/content.json'),env=require('../assets/environment.json'),baseline=JSON.parse(fs.readFileSync('dist/size-report.json')).release;
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),before=hash('dist/index.html'),zipBefore=hash('dist/game.zip');
const dir='dev/snapshots/size-audit-20261009';fs.mkdirSync(dir,{recursive:true});
function editFunction(s,name,change){const n=acorn.parse(s,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return s.slice(0,n.body.start)+'{'+change(s.slice(n.body.start+1,n.body.end-1))+'}'+s.slice(n.body.end);}
const blank=(...names)=>s=>names.reduce((s,n)=>editFunction(s,n,()=>''),s);
function cut(a,b,replacement=''){return s=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return s.slice(0,i)+replacement+s.slice(j);};}
function removeIf(name,test){return s=>editFunction(s,name,b=>{const ast=acorn.parse(b,{ecmaVersion:2020,allowReturnOutsideFunction:true}),edits=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='IfStatement'&&b.slice(n.test.start,n.test.end)===test){edits.push(n);return;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}walk(ast);assert(edits.length,name+': '+test);for(const n of edits.reverse())b=b.slice(0,n.start)+';'+b.slice(n.end);return b;});}
const cases=[],code=(id,label,transform)=>cases.push({id,label,category:'code',transform}),art=(id,label,start,count)=>cases.push({id,label,category:'art',start,count});
code('rooms','Room outlines and shared growth brushes',blank('generate','fillShape','patch'));
code('graph','Six-room graph and farthest-room selection',s=>editFunction(s,'makeLevel',cut(' while(nodes.length<6)',' for(let i=0;i<nodes.length;i++)')));
code('doors_generation','Door layout and connected path generation',s=>editFunction(s,'makeLevel',cut('  links[i].forEach','  // Decorate')));
code('prop_placement','Decoration placement and safe spawn candidate scanning',s=>editFunction(s,'makeLevel',cut('  for(let y=1;y<H-1;y++)','  const available=')));
code('enemy_spawning','Enemy type/count selection, spawn records and initial conga formation',s=>editFunction(s,'makeLevel',cut('  const pool=','  if(!boss){for(const n of safe)','const boss=i===result.boss;\n')));
code('hazard_generation','Hazard-patch growth around reserved paths',blank('growHazards'));
code('navigation','Shared flood distances, neighbor traversal and enemy path following',blank('flood','neighbors','seek'));
code('line_of_sight','Wall-obstructed line-of-sight checks',blank('clearShot'));
for(const [test,id]of [['mode===3||mode===6','swarm_conga'],['mode===5||mode===8','mage_kamikaze'],['mode===9','medusa']])code('ai_'+id,id+' shared behavior branch',removeIf('tickWorld',test));
code('exposure','Shared gaze and radiation buildup, damage and reset',blank('exposure'));
code('ai_archer_charge','Shared archer/charger/horse phase machine',s=>editFunction(s,'tickWorld',b=>{const a=b.indexOf('  }else{\n   const mode=SEQUENCED_ENEMIES'),z=b.indexOf('\n  if(touchEnemy(e))',a);assert(a>=0&&z>a);return b.slice(0,a)+'  }'+b.slice(z);}));
code('projectile_spawn','Arrow fan emission and projectile creation',blank('volley','fire'));
code('projectile_motion','Arrow substeps, collisions and expiry',s=>editFunction(s,'tickWorld',cut(' for(const s of shots){\n',' shots=shots.filter')));
code('sword_render','Held sword, strike trails, hand layering and contact sparks',blank('drawStarter'));
code('sword_poses','Eight-direction ready/pullback/thrust pose data',blank('starterKey'));
code('sword_motion','Pose interpolation and movement correction',blank('starterMotion'));
code('sword_hit','Sword hit shape and enemy hit detection',blank('blowShape','hitBlow'));
code('hit_geometry','Shared entity hurtboxes and capsule/contact collision',blank('hurtbox','capsuleHit','touchEnemy'));
code('magic_fields','Spell cell shapes, casting and field collision',blank('cast','spellCell','fieldHits'));
code('combat_update','Sword timeline and spell lifetime/damage updates',blank('tickCombat'));
code('player_render','Player sprite selection, mirroring and arm clipping',blank('drawActor','drawPlayerFrame'));
code('door_render','Door rendering and rotation',blank('drawGate'));
code('room_transition','Expanding circle and travel fade',blank('drawTransition'));
code('ring_render','Ring/astral quadrant assembly and transforms',blank('entranceLayer'));
code('room_zero_base','Room Zero geometry and state creation',blank('makeEntrance'));
code('control_text','Room Zero control-label renderer',blank('writeTiles'));
code('music','Procedural music note/scale/chord scheduling',blank('musicTick'));
code('synthesis','All audio: initialization, synthesis and dependent music/static',blank('tone','startAudio'));
code('static','Radiation/Medusa noise generation and loudness ramp',blank('radiationAudio'));
code('hazard_damage','Radiation, traps, spikes and fire damage handling',blank('tickHazards'));
code('ice_movement','Player movement, ice inertia and web speed factor',blank('moveHero','movementFactor'));
code('movement_collision','Shared movement substeps and tile collision',blank('movePlayer','canFit'));
code('interact','Uranium pickup/drop and descent interaction',blank('worldInteract'));
code('pickups','Pickup/corpse drawing and armor pickup application',blank('drawLoot','takeLoot'));
code('damage_death','Player damage, invulnerability and death reset',blank('hurtPlayer'));
code('enemy_death','Enemy death, score increment and corpse creation',blank('hitEnemy'));
code('death_overlay','Death score and revive prompt rendering',removeIf('frame','!health'));
code('bleeding','Blood emission and blood decal rendering',s=>editFunction(removeIf('tickWorld','health===1')(s),'drawWorld',cut(' for(const [x,y,index,angle]',' const pulse=')));
let at=0;for(const [name,tiles]of [['floors',env.floors],['walls',env.walls],['props',env.props],['hazard_tiles',env.hazards]]){art(name,name,at,tiles.length);at+=tiles.length;}
const enemyStart=at,seen=new Set();for(const e of catalog.enemies){const key=e.art.base+':'+e.art.variants;if(seen.has(key))continue;seen.add(key);art('art_'+e.id,e.id.startsWith('arrow')?'Fan and sniper archers (shared sprites)':e.id+' sprites',enemyStart+e.art.base,e.art.variants);}at+=catalog.enemySprites.length;
for(const [id,label,n]of [['armor','Armor',4],['status','Status/effect icons',6],['corpses','Enemy corpses',5],['title','HIPOCRENE title',9],['sun','Sun',4],['moon','Moon',4],['zero_floor','Room Zero floor tile',1],['zero_emblem','Room Zero center emblem',1],['blood','Blood decals',10],['doors','Closed/open doors',8],['large_ring','Large magic ring',4],['medium_ring','Medium magic ring',4],['original_ring','Original center ring',4],['magic_art','Spell warning/fire frames',5],['traps','Retracted spike/closed trap',2],['swords','Sun/moon swords',4],['arrows','Arrow sprites and zeroed retired mini slots',7],['player','Player animation and death frames',20]]){art(id,label,at,n);at+=n;}
assert.equal(at,baseline.atlas_tiles);
const extraStart=cases.length;
code('palette','Atlas recoloring and complementary palettes',s=>editFunction(s,'enterRoom',cut("  art.globalCompositeOperation='source-atop';",'  floor.imageSmoothingEnabled=false;')));
code('room_paint','Wall/floor texture painting and Room Zero floor rotation',s=>editFunction(s,'enterRoom',cut('  floor.imageSmoothingEnabled=false;','  // A sun')));
code('hazard_render','Hazard tiles, spike timing and fire animation rendering',s=>editFunction(s,'drawWorld',cut(' const pulse=',' for(const e of room.enemies)')));
code('enemy_render','Enemy sprite placement, shadows, bobbing, gaze cones and exposure icons',s=>editFunction(s,'drawWorld',cut(' for(const e of room.enemies)',' for(const s of shots)')));
code('arrow_render','Arrow rotation, native sprite selection and shadow',s=>editFunction(s,'drawWorld',cut(' for(const s of shots)',' drawGate();')));
code('actions','Attack/interaction dispatch, held input and cooldown update',blank('performAction','holdAction','releaseAction','releaseActions','tickActions','faceMovement'));
code('room_travel','Room travel plus generation made unreachable by its removal',s=>editFunction(s,'tickWorld',cut(' if(travel<=0&&health',' if(!health)return;')));
code('enemy_recipes','Enemy behavior, timing, hitbox and sprite-pool table',s=>{const ast=acorn.parse(s,{ecmaVersion:2020}),n=ast.body.flatMap(n=>n.declarations||[]).find(n=>n.id.name==='enemyRules');assert(n);return s.slice(0,n.init.start)+'[]'+s.slice(n.init.end);});
code('keyboard','Keyboard keydown/keyup handlers',s=>{const ast=acorn.parse(s,{ecmaVersion:2020}),edits=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='AssignmentExpression'&&['onkeydown','onkeyup'].includes(n.left.name)){edits.push(n);return;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}walk(ast);assert(edits.length>=2);for(const n of edits.reverse())s=s.slice(0,n.start)+'void 0'+s.slice(n.end);return s;});
const extra=process.argv.includes('--extra'),shard=+(process.argv[2]||0),total=extra?1:3;
(async()=>{if(!shard){const b=await build({write:false,development:false});assert.equal(b.reports.release.html_bytes,baseline.html_bytes);assert.equal(hash('dist/index.html'),before);}
const rows=[];for(const [i,c]of cases.entries()){if(i%total!==shard||(extra?i<extraStart:i>=extraStart))continue;const r=(await build({write:false,development:false,sourceTransform:c.transform||((s)=>s),spriteEncoder:bits=>{if(c.category==='code')return encode(bits);const copy=Buffer.from(bits);copy.fill(0,c.start*18,(c.start+c.count)*18);return encode(copy);}})).reports.release;
const row={id:c.id,label:c.label,category:c.category,tiles:c.count,html_bytes:baseline.html_bytes-r.html_bytes,minified_bytes:baseline.source_bytes-r.source_bytes,probe_html_bytes:r.html_bytes};rows.push(row);fs.writeFileSync(dir+'/'+(extra?'extra-':'part-')+shard+'.json',JSON.stringify({baseline,sha256:before,rows},null,2));console.log(JSON.stringify(row));}
assert.equal(hash('dist/index.html'),before);assert.equal(hash('dist/game.zip'),zipBefore);console.log('UNCHANGED release and ZIP');})().catch(e=>{console.error(e);process.exitCode=1;});
