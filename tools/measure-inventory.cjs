// Read-only release attribution. Omission builds are measurement probes, not playable releases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),acorn=require('acorn');
process.chdir(path.resolve(__dirname,'..'));
const spriteFile=require.resolve('./sprite-data.cjs'),encode=require(spriteFile),build=require('./build.cjs');
let masked=[];
const usage=JSON.parse(fs.readFileSync('assets/catalog/runtime-selection.json')),groups=[];let offset=0;
for(const [name,count] of [['environment',usage.pantry.length],['weapons',usage.weapons.length],['enemies',usage.enemyTiles.length],['boss',usage.bossTiles.length],['ring',usage.ring.length],['legend',usage.font.length],['player',25]]){groups.push({name,start:offset,count,raw_bytes:count*18});offset+=count;}
require.cache[spriteFile].exports=bits=>{assert.equal(bits.length,offset*18);const copy=Buffer.from(bits);for(const name of masked){const g=groups.find(g=>g.name===name);assert(g);copy.fill(0,g.start*18,(g.start+g.count)*18);}return encode(copy);};
function blank(source,names){const nodes=acorn.parse(source,{ecmaVersion:2020}).body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name));assert.equal(nodes.length,names.length,'all measured functions found');for(const n of nodes.reverse())source=source.slice(0,n.body.start)+'{}'+source.slice(n.body.end);return source;}
function cut(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'measurement markers found: '+start);return source.slice(0,a)+source.slice(b);}
const ai=s=>cut(s,' // One distance field lets all creatures',' for(const h of room.props)if(h.t%6===3){const pulse=(worldTime+room.offset)%4;');
const projectiles=s=>cut(s,' for(const s of shots){\n  s.age+=dt;',' shots=shots.filter(s=>s.life>0);musicTick(dt);');
const terrain=s=>cut(s,"  art.globalCompositeOperation='source-atop';","  if(DEV)$('info')");
const enemyArt=s=>cut(s,' for(const e of room.enemies)if(e.hp>0){\n  const rule=enemyRule(e),size=',' for(const s of shots){const x=');
function entrance(s){s=blank(s,['makeEntrance','writeTiles']);const edits=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='IfStatement'&&n.test.type==='UnaryExpression'&&n.test.operator==='!'&&n.test.argument.name==='level'){edits.push([n.start,n.end]);return;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else walk(v);}walk(acorn.parse(s,{ecmaVersion:2020}));for(const[a,b]of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,a)+';'+s.slice(b);return s;}
function inputs(source){const nodes=acorn.parse(source,{ecmaVersion:2020}).body.filter(n=>{const c=n.type==='ExpressionStatement'&&n.expression;return c?.type==='CallExpression'&&(c.callee.name==='addEventListener'||c.callee.object?.name==='document'&&c.callee.property?.name==='addEventListener')&&['keydown','keyup','blur','visibilitychange','focusin'].includes(c.arguments[0]?.value);});assert.equal(nodes.length,5);for(const n of nodes.reverse())source=source.slice(0,n.start)+source.slice(n.end);return source;}
const cases=[
 ['generation','Dungeon generation: room shapes, graph, doors, placement and hazard patches',s=>blank(s,['makeLevel','generate','growHazards'])],
 ['input','Keyboard/focus/visibility handling and dependent player action dispatch',inputs],
 ['ai','Enemy/boss decisions, attack timing and shared pathfinding',ai],
 ['projectiles','Weapon attacks, shared projectiles, damage and boss drops',s=>blank(projectiles(s),['worldAttack','volley','fire','hitEnemy','hurtPlayer','bossWeapon','takeLoot'])],
 ['terrain','Static room painting: walls, stairs, textures, props, palettes and ring',terrain],
 ['audio','All music and sound synthesis',s=>blank(s,['tone','musicTick','startAudio'])],
 ['landmarks','Exit landmarks and visible room-door drawing',s=>blank(s,['drawGate'])],
 ['player_render','Player pose selection, rendering and punch effect',s=>blank(s,['drawActor','drawPlayerFrame','actorDirection','actionFrame'])],
 ['enemy_render','Enemy/boss rendering, squash/bob animation and boss health bar',enemyArt],
 ['movement','Shared movement integration and tile collision',s=>blank(s,['movePlayer','canFit'])],
 ['entrance','Room Zero route, labels and stair/ring painting, including its exclusive art',entrance,['ring','legend']],
 ['minimap','Visited-room minimap',s=>cut(s,' world.nodes.forEach(',' if(DEV/*diagnostics*/){\n let near=')],
 ['sprites','All sprite bitmap content; keeps decoder and atlas dimensions',s=>s,groups.map(g=>g.name)]
];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const before=hash('dist/index.html'),beforeZip=hash('dist/game.zip'),r=(await build({write:false,development:false})).reports.release;
 assert.equal(r.html_bytes,fs.statSync('dist/index.html').size,'baseline release size agrees');
 const rows=[];
 for(const [id,label,sourceTransform,masks=[]]of cases){masked=masks;const report=(await build({write:false,development:false,sourceTransform})).reports.release;const row={id,label,html_bytes_saved:r.html_bytes-report.html_bytes,expanded_bytes_saved:r.source_bytes-report.source_bytes,probe_html_bytes:report.html_bytes};rows.push(row);console.log(JSON.stringify(row));}
 const art=[];for(const g of groups){masked=[g.name];const report=(await build({write:false,development:false})).reports.release;art.push({...g,html_bytes_saved:r.html_bytes-report.html_bytes});}masked=[];
 const file=fs.readFileSync('dist/index.html'),marker=Buffer.from('<plaintext id=p hidden>'),start=file.indexOf(marker)+marker.length,head=file.subarray(0,start).toString('ascii'),escape=+head.match(/n===(\d+)\?e=32/)[1],data=[];
 for(let i=start;i<file.length;i++){let n=file[i];if(n===escape)n=file[++i]^32;data.push(n);}
 const decoder=+head.match(/a\.splice\(0,(\d+)\)/)[1],transport=file.length-start-data.length;
 const wire=[{label:'Compressed game program and embedded art',bytes:data.length-decoder},{label:'Compressed decompressor',bytes:decoder},{label:'HTML bootstrap and transport decoder',bytes:start},{label:'Transport escape bytes',bytes:transport}].sort((a,b)=>b.bytes-a.bytes);assert.equal(wire.reduce((n,x)=>n+x.bytes,0),r.html_bytes);
 const api=require('./game-equivalence.cjs'),surfaces=api.simulate(require('./read-build.cjs')('dist/index.html'),1,1).atlas;
 assert.equal(surfaces.length,3);const canvasBytes=surfaces.filter((_,i)=>i!==1).reduce((n,[w,h])=>n+w*h*4,0),atlasBytes=surfaces[1][0]*surfaces[1][1]*4;
 const runtime=[{label:'Temporary decompression model',bytes:r.decoder_model_mb*1048576,basis:'Packer-reported allocation; temporary during startup, not measured browser RSS.'},{label:'Main and background canvases',bytes:canvasBytes,basis:'Two observed 372×252 canvases × 4 bytes/pixel; RGBA-equivalent storage, not measured GPU/browser allocation.'},{label:'Runtime sprite atlas',bytes:atlasBytes,basis:'Observed atlas dimensions × 4 bytes/pixel; RGBA-equivalent storage.'},{label:'Seven room tile grids',bytes:7*31*21,basis:'Exact Uint8Array payload bytes; excludes objects and buffer headers.'},{label:'Active navigation distance field',bytes:31*21*2,basis:'Exact Int16Array payload bytes; excludes headers and temporary BFS queue.'},{label:'Floor graph coordinates',bytes:7,basis:'Exact Uint8Array payload bytes; excludes room/door objects.'}];
 const output={measured_at_utc:new Date().toISOString(),release_sha256:before,baseline:r,method:'Independent leave-one-component-out recompilation with unchanged packing settings. Sprite probes zero bitmap pixels while preserving dimensions and offsets. Code probes remove named bodies/blocks and allow dead-code elimination. Probes are not playable and are never written to dist. Deltas overlap, depend on shared dependencies/compression context, do not sum to file size, and are not guaranteed shippable removal savings.',feature_costs_descending:rows.sort((a,b)=>b.html_bytes_saved-a.html_bytes_saved),sprite_content_descending:art.sort((a,b)=>b.html_bytes_saved-a.html_bytes_saved),exact_file_breakdown:wire,runtime_known_payloads_descending:runtime.sort((a,b)=>b.bytes-a.bytes),runtime_unknown:'JS engine/JIT and browser overhead, model scratch storage, decoded strings, Web Audio internals, GPU buffers, enemies/props/doors/projectile object overhead and transient queues are not measured. No total browser RAM claim.'};
 assert.equal(hash('dist/index.html'),before,'release unchanged');assert.equal(hash('dist/game.zip'),beforeZip,'ZIP unchanged');fs.writeFileSync('dev/size-inventory.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({file:r.html_bytes,wire,features:output.feature_costs_descending.map(x=>[x.id,x.html_bytes_saved]),art,runtime},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
