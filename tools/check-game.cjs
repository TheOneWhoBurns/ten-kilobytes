const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function boot(file,saved){
 const handlers={},fields={},raf=[],storage=new Map(saved?[['room-zero-dev-v1',saved]]:[]);let time=0,lastDraw,strokes=0,actorSprite=104;
 class Element{constructor(tagName='BUTTON',value=''){this.tagName=tagName;this.value=value;this.checked=false;this.style={};this.dataset={};}setAttribute(k,v){this[k]=v;}click(){this.onclick?.();}focus(){}setPointerCapture(){}}
 class Input extends Element{constructor(value){super('INPUT',value);}}
 let html=require('./read-build.cjs')(file);
 for(const match of html.matchAll(/<(input|button|select|span|div|canvas|p)[^>]*\bid="([^"]+)"[^>]*>/g)){
  fields[match[2]]=match[1]==='input'?new Input(match[0].match(/value="([^"]*)"/)?.[1]||''):new Element(match[1].toUpperCase());
 }
 const context={clearRect(){},save(){},restore(){},rotate(){},translate(){},scale(){},fillRect(){},drawImage(...args){if(args.length===9)lastDraw=args;},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){strokes++;},strokeRect(){strokes++;}};
 const canvas=fields.game;canvas.getContext=()=>context;canvas.parentElement={getBoundingClientRect:()=>({width:1200,height:650})};
 const document={getElementById:id=>fields[id],createElement:()=>{const node={};node.getContext=()=>({...context,drawImage(...args){if(node.width===12&&node.height===456&&args[0]!==node&&args[6]===0)actorSprite=args[1]/12+103;}});return node;},addEventListener:(name,fn)=>handlers[name]=fn};
 const sandbox={document,HTMLInputElement:Input,ResizeObserver:class{observe(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:require('node:crypto').webcrypto,requestAnimationFrame:fn=>raf.push(fn),addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
 if(fields.seed)assert(fields.info.textContent.startsWith('Room ready'),'room generated');
 const tick=(n=1,elapsed=1000/60)=>{for(let i=0;i<n;i++){time+=elapsed;raf.shift()(time);}};
 const key=(type,key,target=canvas,options={})=>handlers[type]({key,target,repeat:false,preventDefault(){},...options});
 tick();return {fields,tick,key,handlers,storage,get x(){return lastDraw[5]},get y(){return lastDraw[6]},get sprite(){return actorSprite},get pose(){return lastDraw[2]/12},get strokes(){return strokes}};
}
for(const file of ['dist/index.html','dev/play.html']){
 const g=boot(file),{fields,tick,key,handlers}=g,startX=g.x,startSprite=g.sprite;
 key('keydown','a');tick(12);key('keyup','a');assert(g.x<startX-8,'held key moves continuously');
 const stopped=g.x;tick(10);assert.equal(g.x,stopped,'keyup stops motion');
 key('keydown',']');tick();key('keyup',']');assert.equal(g.sprite,startSprite+(fields.seed?1:0),'dev sprite advances; release stays 104');
 key('keydown','d');handlers.blur();tick(10);assert.equal(g.x,stopped,'blur clears movement');
 if(fields.seed){key('keydown','a',fields.seed);tick(10);assert.equal(g.x,stopped,'typing does not move');}
 key('keydown','r');key('keyup','r');tick();assert.equal(g.x,startX,'new room resets spawn');
 console.log('PASS '+file+': runtime, held movement, release, sprite change, blur and regeneration');
}
const g=boot('dev/play.html'),f=g.fields;
const run=(k,n=6)=>{const x=g.x;g.key('keydown',k);g.tick(n);g.key('keyup',k);return g.x-x;};
const normal=run('d');f.respawn.click();g.tick();
f.speed.value='10';f.speed.oninput({target:f.speed});assert.equal(+f['speed-range'].value,10);
const fast=run('d');assert.equal(fast,normal*2,'live speed doubles distance');
f.pause.click();assert.equal(run('d'),0,'pause blocks movement');f.pause.click();
f.layout.value='arrows';f.layout.onchange({target:f.layout});assert.equal(run('d'),0,'preset removes old key');f.respawn.click();g.tick();assert(run('ArrowRight')>0,'arrow preset works');
f['bind-right'].click();g.key('keydown','ArrowUp');assert(f['binding-status'].textContent.includes('use'),'duplicate rejected');g.key('keydown','r');assert(f['binding-status'].textContent.includes('Reserved'),'shortcut rejected');g.key('keydown','t');assert.equal(f.layout.value,'custom');f.respawn.click();g.tick();assert(run('t')>0,'custom binding works');
g.key('keydown','ArrowRight',f.layout);g.tick();g.key('keyup','ArrowRight');
f.grid.checked=true;f.grid.onchange({target:f.grid});f.hitbox.checked=true;f.hitbox.onchange({target:f.hitbox});g.tick();assert(g.strokes>=2,'debug overlays draw');
f['dev-toggle'].click();assert.equal(f['dev-panel'].hidden,true,'bar collapses');
const saved=g.storage.get('room-zero-dev-v1'),restored=boot('dev/play.html',saved);assert.equal(+restored.fields.speed.value,10);assert.equal(restored.fields['bind-right'].textContent,'T');assert(restored.fields['dev-panel'].hidden,'collapse persisted');
f.collision.checked=false;f.collision.onchange({target:f.collision});g.key('keydown','ArrowUp');run('t',300);g.key('keyup','ArrowUp');assert(g.x>330,'collision disabled allows wall crossing');f.collision.checked=true;f.collision.onchange({target:f.collision});g.tick();assert.equal(g.x,180,'collision restore returns embedded player to spawn');
f.defaults.click();assert.equal(+f.speed.value,5);assert.equal(f.layout.value,'wasd');assert(!f.grid.checked&&!f.hitbox.checked&&!f['dev-panel'].hidden,'defaults restore settings');
assert(!fs.readFileSync('dist/index.html','utf8').includes('room-zero-dev-v1'),'dev preferences removed from release');
console.log('PASS dev controls: speed, pause, presets, custom/duplicate/reserved bindings, overlays, collapse, persistence, collision and defaults');

for(const file of ['dist/index.html','dev/play.html']){
 const g=boot(file),f=g.fields,poses=new Set(),idle=g.sprite;
 g.key('keydown','e');g.key('keyup','e');g.tick();assert(!f['run-status'].textContent.includes('· None ·'),'pickup changes the active power');
 g.key('keydown',' ');g.key('keyup',' ');assert.equal(f.attack['data-active'],'true','attack starts on input');
 for(let i=0;i<10;i++){g.tick();poses.add(g.pose);assert.equal(g.sprite,idle,'character identity preserved');}
 assert(poses.size>=3,'strike and recovery have separate poses');assert.equal(f.attack['data-active'],'false','fast recovery');
 if(f.pause){
  f['attack-rate'].value='2';f['attack-rate'].oninput({target:f['attack-rate']});f.attack.click();g.tick(20);assert.equal(f.attack['data-active'],'true','slower timing applied');g.tick(11);assert.equal(f.attack['data-active'],'false','slow cycle completes');
  f['attack-rate'].value='20';f['attack-rate'].oninput({target:f['attack-rate']});f.attack.click();g.tick(4);assert.equal(f.attack['data-active'],'false','fast timing applied');
  g.key('keydown',' ');let starts=0,active=false;for(let i=0;i<30;i++){g.tick();const next=f.attack['data-active']==='true';if(next&&!active)starts++;active=next;}assert(starts>=2,'held input repeats through cooldown gaps');g.key('keyup',' ');g.tick(10);assert.equal(f.attack['data-active'],'false','release ends repeat');
  f['attack-rate'].value='2';f['attack-rate'].oninput({target:f['attack-rate']});f.attack.click();g.tick(2);f.pause.click();const pose=g.pose;g.tick(30);assert.equal(g.pose,pose,'pause freezes action');f.pause.click();g.tick(40);
  f['bind-attack'].click();g.key('keydown','q');g.key('keyup','q');g.key('keydown','q');g.key('keyup','q');g.tick();assert.equal(f.game.dataset.action,'attack','remapped attack works');
  const restored=boot(file,g.storage.get('room-zero-dev-v1'));assert.equal(+restored.fields['attack-rate'].value,2,'action rate persists');
 }
 console.log('PASS '+file+': instant pickup/hit, character identity, quick recovery, pickup effects, tuning, repeat and pause');
}

for(const file of ['dist/index.html','dev/play.html']){
 for(const [keyName,direction] of [['d',0],['a',1],['s',2],['w',3]]){
  const g=boot(file),poses=new Set();g.key('keydown',keyName);
  for(let n=0;n<18;n++){g.tick();poses.add(g.pose);assert(g.pose>=14+direction*6&&g.pose<20+direction*6,'walk uses the correct facing row');}
  assert(poses.size>=2,'actual travel advances walking frames');
  g.key('keyup',keyName);g.tick();assert.equal(g.pose,14+direction*6,'stopping returns to facing idle');
  g.fields.attack.click();g.tick();assert.equal(g.pose,17+direction*6,'punch starts extended in the facing direction');
  g.tick(10);assert.equal(g.pose,14+direction*6,'punch recovers to idle');
  g.key('keydown',']');g.key('keyup',']');g.tick();assert(g.fields.seed?g.pose<14:g.pose>=14,'other characters never borrow 104 frames');
 }
 console.log('PASS '+file+': four facing rows, distance-driven walking, directional punch/recovery and 104-only frames');
}
const {PNG}=require('pngjs'),sheet=PNG.sync.read(fs.readFileSync('assets/generated/104-sheet.png'));
assert.equal(sheet.width,72);assert.equal(sheet.height,48);
for(let i=3;i<sheet.data.length;i+=4)assert([0,255].includes(sheet.data[i]),'binary sprite alpha');
console.log('PASS 104 sheet: 24 aligned 12×12 frames with binary transparency');
const alpha=(x,y)=>sheet.data[(y*sheet.width+x)*4+3];
for(let frame=0;frame<6;frame++)for(let y=0;y<12;y++)for(let x=0;x<12;x++)assert.equal(alpha(frame*12+x,12+y),alpha(frame*12+11-x,y),'left frames mirror complete right-facing character');
for(const frame of [3,4])for(let y=0;y<6;y++)for(let x=0;x<12;x++)assert.equal(alpha(frame*12+x,y),alpha(11-x,y),'punch/recovery retain action orientation after requested idle swap');
for(let y=0;y<5;y++)for(let x=0;x<12;x++)assert.equal(alpha(60+x,y+2),alpha(11-x,y),'pickup retains action orientation after requested idle swap');
console.log('PASS 104 orientation: mirrored left row and matching idle/walk/attack/pickup head');

for(const file of ['dist/index.html','dev/play.html']){
 const g=boot(file),f=g.fields;
 // Face left, then strafe down/right while holding a left-facing attack.
 g.key('keydown','a');g.tick(2);g.key('keyup','a');g.tick();
 assert.equal(g.pose,20,'left idle retained');
 g.key('keydown',' ');g.key('keydown','s');
 let attackFrames=0,gapFrames=0;const y=g.y;
 for(let i=0;i<24;i++){g.tick();assert(g.pose>=20&&g.pose<26,'held attack retains body aim during animation and cooldown');if(f.attack['data-active']==='true')attackFrames++;else gapFrames++;}
 assert(g.y>y+10,'movement stays responsive during attack');assert(attackFrames&&gapFrames,'attacks have recovery gaps');
 g.key('keyup',' ');g.tick(10);assert(g.pose>=20&&g.pose<26,'held movement after attack release does not snap facing');
 g.key('keyup','s');g.tick();assert.equal(g.pose,20,'idle preserves attack-facing direction');
 g.key('keydown','d');g.tick(2);g.key('keyup','d');g.tick();assert.equal(g.pose,14,'new movement intentionally changes facing');
 // Release ignores rapid taps during recovery; there is no deferred action queue.
 f.attack.click();g.tick(6);assert.equal(f.attack['data-active'],'false','animation finishes before cooldown');
 f.attack.click();assert.equal(f.attack['data-active'],'false','early click cannot bypass cooldown');
 g.tick(20);assert.equal(f.attack['data-active'],'false','early click was not queued');
 f.attack.click();assert.equal(f.attack['data-active'],'true','fresh click after cooldown attacks immediately');
 g.tick(10);
 // Pointer release must not cancel a simultaneous keyboard hold.
 g.key('keydown',' ');f.attack.onpointerdown({button:0,pointerId:7,preventDefault(){}});
 f.attack.onpointerup({pointerId:7});g.tick(15);let repeated=false;
 for(let i=0;i<12;i++){g.tick();repeated ||= f.attack['data-active']==='true';}assert(repeated,'pointer release preserves keyboard input');
 g.key('keyup',' ');g.tick(10);assert.equal(f.attack['data-active'],'false');
 f.attack.onpointerdown({button:0,pointerId:8,preventDefault(){}});g.key('keyup',' ');g.tick(15);repeated=false;
 for(let i=0;i<12;i++){g.tick();repeated ||= f.attack['data-active']==='true';}assert(repeated,'keyup preserves pointer input');
 f.attack.onpointercancel({pointerId:8});g.tick(10);assert.equal(f.attack['data-active'],'false','pointer cancel releases');
 // Focus within gameplay preserves held controls; leaving it safely clears them.
 g.key('keydown',' ');g.handlers.focusin({target:f.game});g.tick(10);g.handlers.focusin({target:f.attack});g.tick(10);
 repeated=false;for(let i=0;i<12;i++){g.tick();repeated ||= f.attack['data-active']==='true';}assert(repeated,'gameplay focus preserves held attack');
 g.handlers.blur();g.tick(30);assert.equal(f.attack['data-active'],'false','blur clears held attack');
 g.key('keydown',' ',f.game,{ctrlKey:true});g.tick();assert.equal(f.attack['data-active'],'false','modifier shortcut does not attack');
 if(f.pause){
  f['attack-cooldown'].value='500';f['attack-cooldown'].oninput({target:f['attack-cooldown']});
  const restored=boot(file,g.storage.get('room-zero-dev-v1'));assert.equal(+restored.fields['attack-cooldown'].value,500,'cooldown persists');
  g.key('keydown',' ');g.tick(6);assert.equal(f.attack['data-active'],'false');g.tick(20);assert.equal(f.attack['data-active'],'false','cooldown independent of animation');g.tick(5);assert.equal(f.attack['data-active'],'true','held attack resumes when ready');
  f.pause.click();g.key('keydown',' ');g.tick(30);f.pause.click();g.tick(40);assert.equal(f.attack['data-active'],'false','paused input does not latch a repeat');
  f['attack-mode'].value='press';f['attack-mode'].onchange({target:f['attack-mode']});g.key('keydown',' ');g.tick(90);assert.equal(f.attack['data-active'],'false','press mode never auto-repeats');g.key('keyup',' ');
 }
 console.log('PASS '+file+': locked attack strafe/idle, fresh direction input, cooldown gaps/no queue, independent pointer/keyboard and focus lifecycle');
}

// Pickup must not swivel the character or conceal a punch, and its hit still follows aim.
for(const file of ['dist/index.html','dev/play.html']){
 const g=boot(file),f=g.fields;g.key('keydown',' ');g.key('keydown','e');g.key('keyup','e');g.tick();
 assert.equal(g.pose,17,'pickup cannot steal the attack pose or direction');assert(!f['run-status'].textContent.includes('· None ·'),'pickup replaces the active power');
 g.key('keyup',' ');g.tick(10);assert.equal(g.pose,14,'idle keeps captured facing after simultaneous pickup');
}
console.log('PASS simultaneous actions: captured hit direction, punch priority and pickup');

for(const fps of [30,60,144]){
 const g=boot('dist/index.html');g.key('keydown',' ');let active=true,starts=1,lastStart=0;
 for(let i=1;i<=fps;i++){g.tick(1,1000/fps);const next=g.fields.attack['data-active']==='true';if(next&&!active){const time=i*1000/fps;assert(time-lastStart>=150-1e-6,'repeat respects cooldown across frame rates');lastStart=time;starts++;}active=next;}
 assert(starts>=6&&starts<=7,'repeat cadence stays close across frame rates');
}
{
 const g=boot('dist/index.html');g.key('keydown',' ');g.tick(4,30);assert.equal(g.fields.attack['data-active'],'false');
 g.tick(1,5000);assert.equal(g.fields.attack['data-active'],'true','long frame triggers at most the next ready strike');
 g.key('keyup',' ');g.tick(30);assert.equal(g.fields.attack['data-active'],'false','long frame creates no catch-up queue');
}
console.log('PASS cooldown timing: 30/60/144 fps cadence and no long-frame catch-up burst');
