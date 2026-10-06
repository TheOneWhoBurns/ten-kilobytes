const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function boot(file,saved,peaceful=true,dungeon=true,runSeed=1){
 const handlers={},fields={},raf=[],storage=new Map(saved?[['room-zero-dev-v1',saved]]:[]);let entropy=0,time=0,lastDraw,strokes=0,hitFrames=0,actorSprite=104,mapCount=0,lettering=[],ink=[];
 class Element{constructor(tagName='BUTTON',value=''){this.tagName=tagName;this.value=value;this.checked=false;this.style={};this.dataset={};}appendChild(){}setAttribute(k,v){this[k]=v;}click(){this.onclick?.();}focus(){}setPointerCapture(){}}
 class Input extends Element{constructor(value){super('INPUT',value);}}
 let html=require('./read-build.cjs')(file);
 for(const match of html.matchAll(/<(input|button|select|span|div|canvas|p)[^>]*\bid="([^"]+)"[^>]*>/g)){
  fields[match[2]]=match[1]==='input'?new Input(match[0].match(/value="([^"]*)"/)?.[1]||''):new Element(match[1].toUpperCase());
 }
 const context={fillText(text){lettering.push(text);},clearRect(){},save(){},restore(){this.flip=null;},rotate(){},translate(x,y){this.at=[x,y];},scale(x){if(x<0)this.flip=this.at;},fillRect(x,y,w,h){if(w===5&&h===5)mapCount++;if(['#d56','#df5665'].includes(this.fillStyle))hitFrames++;},drawImage(...args){if(args.length===9){if(args[0].width===12)lastDraw=args;else if(args[1]/12>=args[0].width/12-19){lastDraw=this.flip?[...args.slice(0,5),this.flip[0]-12,this.flip[1],12,12]:args;lastDraw.flip=!!this.flip;}const letters='@',i=args[1]/12-(args[0].width/12-30-letters.length);if(i>=0&&i<letters.length&&args[2]===0)ink.push(letters[i]);}},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){strokes++;},strokeRect(){strokes++;}};
 const canvas=fields.game;canvas.getContext=()=>context;canvas.parentElement={getBoundingClientRect:()=>({width:1200,height:650})};
 const document={getElementById:id=>fields[id],createElement:()=>{const node={};node.getContext=()=>({...context,drawImage(...args){if(node.width===12&&node.height===456&&args[0]!==node&&args[6]===0)actorSprite=args[1]/12+103;}});return node;},addEventListener:(name,fn)=>handlers[name]=fn};
 let audioContexts=0,audioNotes=0;
 class AudioContext{constructor(){audioContexts++;this.state='running';}get currentTime(){return time/1000;}get destination(){return{};}resume(){this.state='running';}createOscillator(){return{frequency:{},connect(){},disconnect(){},start(){audioNotes++;},stop(){}};}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}
 let randomCalls=0;const random=require('./test-random.cjs')(runSeed+':1');
 const sandbox={AudioContext,Math:Object.assign(Object.create(Math),{random(){randomCalls++;return random();}}),document,HTMLInputElement:Input,ResizeObserver:class{observe(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:{getRandomValues(a){a[0]=runSeed+entropy++;return a;}},requestAnimationFrame:fn=>raf.push(fn),addEventListener:(name,fn)=>handlers[name]=fn};
 require('./dom-events.cjs')(sandbox,handlers);
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
 if(fields.seed)assert(/Room Zero|Memorial|Sluice|Reading/.test(fields.info.textContent),'room generated');
 // Controls are exercised independently of combat; survival has its own suite.

 const tick=(n=1,elapsed=1000/60)=>{for(let i=0;i<n;i++){time+=elapsed;mapCount=0;lettering=[];ink=[];raf.shift()(time);}};
 const key=(type,key,target=canvas,options={})=>handlers[type]({key,keyCode:({ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40}[key]||key.toUpperCase().charCodeAt(0)),target,repeat:false,preventDefault(){},...options});
 tick();
 const walkEntrance=(enter=true)=>{
  const bindings=saved?JSON.parse(saved).bindings:null;
  for(const [x,y] of require('./fixtures/entrance-route.json'))for(const [axis,target,negative,positive] of [[5,x*12-6,'left','right'],[6,y*12-10,'up','down']]){
   if(Math.abs(lastDraw[axis]-target)<1)continue;const dir=lastDraw[axis]>target?negative:positive,button=bindings?.[dir]||{left:'a',right:'d',up:'w',down:'s'}[dir];
   key('keydown',button);let steps=0;while(Math.abs(lastDraw[axis]-target)>=1&&steps++<1000)tick(1,1000/120);key('keyup',button);assert(steps<1000,'narrow entrance traversal reaches each bend');
  }
  if(enter){key('keydown',bindings?.interact||'o');key('keyup',bindings?.interact||'o');tick(30);}else tick();
 };
 const goDungeon=()=>{
  if(fields['room-select']){fields['room-select'].value='0';fields['room-select'].onchange({target:fields['room-select']});tick();}else walkEntrance();
  if(peaceful)fields['clear-room']?.click();tick();
 };
 if(dungeon)goDungeon();
 return {fields,tick,key,handlers,storage,goDungeon,walkEntrance,get font(){return context.font},get bitmapText(){return ink.join('')},get entropy(){return entropy},get randomCalls(){return randomCalls},get audioContexts(){return audioContexts},get audioNotes(){return audioNotes},get lettering(){return lettering},get mapCount(){return mapCount},get x(){return lastDraw[5]},get y(){return lastDraw[6]},get sprite(){return actorSprite},get pose(){const image=lastDraw[0];if(image.width===12)return lastDraw[2]/12;const i=lastDraw[1]/12-(image.width/12-19);return i===18?38:lastDraw.flip?20+i:i<6?14+i:20+i},get flashes(){return hitFrames},get strokes(){return strokes}};
}
module.exports=boot;
if(require.main===module){
for(const file of ['dev/release-diagnostics.html','dev/play.html']){
 const g=boot(file),{fields,tick,key,handlers}=g,startX=g.x,startSprite=g.sprite;
 key('keydown','a');tick(12);key('keyup','a');assert(g.x<startX-8,'held key moves continuously');
 const stopped=g.x;tick(10);assert.equal(g.x,stopped,'keyup stops motion');
 key('keydown',']');tick();key('keyup',']');assert.equal(g.sprite,startSprite+(fields.seed?1:0),'dev sprite advances; release stays 104');
 key('keydown','d');handlers.blur();tick(10);assert.equal(g.x,stopped,'blur clears movement');
 if(fields.seed){key('keydown','a',fields.seed);tick(10);assert.equal(g.x,stopped,'typing does not move');}
 key('keydown','r');key('keyup','r');tick();assert.equal(g.x,36,'new run resets to entrance spawn');
 console.log('PASS '+file+': runtime, held movement, release, sprite change, blur and regeneration');
}
const g=boot('dev/play.html'),f=g.fields;
const run=(k,n=6)=>{const x=g.x;g.key('keydown',k);g.tick(n);g.key('keyup',k);return g.x-x;};
const normal=run('d');f.respawn.click();g.tick();
f.speed.value='20';f.speed.oninput({target:f.speed});assert.equal(+f['speed-range'].value,20);
const fast=run('d');assert.equal(fast,normal*2,'live speed doubles distance');
f.pause.click();assert.equal(run('d'),0,'pause blocks movement');f.pause.click();
f.layout.value='arrows';f.layout.onchange({target:f.layout});assert.equal(run('d'),0,'preset removes old key');f.respawn.click();g.tick();assert(run('ArrowRight')>0,'arrow preset works');
f['bind-right'].click();g.key('keydown','ArrowUp');assert(f['binding-status'].textContent.includes('use'),'duplicate rejected');g.key('keydown','r');assert(f['binding-status'].textContent.includes('Reserved'),'shortcut rejected');g.key('keydown','t');assert.equal(f.layout.value,'custom');f.respawn.click();g.tick();assert(run('t')>0,'custom binding works');
g.key('keydown','ArrowRight',f.layout);g.tick();g.key('keyup','ArrowRight');
f.grid.checked=true;f.grid.onchange({target:f.grid});f.hitbox.checked=true;f.hitbox.onchange({target:f.hitbox});g.tick();assert(g.strokes>=2,'debug overlays draw');
f['dev-toggle'].click();assert.equal(f['dev-panel'].hidden,true,'bar collapses');
const saved=g.storage.get('room-zero-dev-v1'),restored=boot('dev/play.html',saved);assert.equal(+restored.fields.speed.value,20);assert.equal(restored.fields['bind-right'].textContent,'T');assert(restored.fields['dev-panel'].hidden,'collapse persisted');
f.collision.checked=false;f.collision.onchange({target:f.collision});g.key('keydown','ArrowUp');run('t',300);g.key('keyup','ArrowUp');assert(g.x>330,'collision disabled allows wall crossing');f.collision.checked=true;f.collision.onchange({target:f.collision});g.tick();assert.equal(g.x,180,'collision restore returns embedded player to spawn');
f.defaults.click();assert.equal(+f.speed.value,10);assert.equal(f.layout.value,'wasd');assert(!f.grid.checked&&!f.hitbox.checked&&!f['dev-panel'].hidden,'defaults restore settings');
assert(!fs.readFileSync('dev/release-diagnostics.html','utf8').includes('room-zero-dev-v1'),'dev preferences removed from release');
const migrated=boot('dev/play.html',JSON.stringify({speed:10,layout:'wasd',bindings:{up:'w',left:'a',down:'s',right:'d',attack:' ',interact:'e'}}),true,false);assert.equal(migrated.fields['bind-attack'].textContent,'I');assert.equal(migrated.fields['bind-interact'].textContent,'O');assert.equal(+migrated.fields.speed.value,10);
console.log('PASS dev controls: speed, pause, presets, custom/duplicate/reserved bindings, overlays, collapse, persistence, collision and defaults');

for(const file of ['dev/release-diagnostics.html','dev/play.html']){
 const g=boot(file),f=g.fields,poses=new Set(),idle=g.sprite;
 g.key('keydown','o');g.key('keyup','o');g.tick();assert(!f['run-status'].textContent.includes('None'),'no power slot in HUD');
 g.key('keydown','i');g.key('keyup','i');assert.equal(f.attack['data-active'],'true','attack starts on input');
 for(let i=0;i<10;i++){g.tick();poses.add(g.pose);assert.equal(g.sprite,idle,'character identity preserved');}
 assert(poses.size>=3,'strike and recovery have separate poses');assert.equal(f.attack['data-active'],'false','fast recovery');
 if(f.pause){
  g.tick(10);f['attack-rate'].value='2';f['attack-rate'].oninput({target:f['attack-rate']});f.attack.click();g.tick(20);assert.equal(f.attack['data-active'],'true','slower timing applied');g.tick(11);assert.equal(f.attack['data-active'],'false','slow cycle completes');
  f['attack-rate'].value='20';f['attack-rate'].oninput({target:f['attack-rate']});f.attack.click();g.tick(4);assert.equal(f.attack['data-active'],'false','fast timing applied');
  g.key('keydown','i');let starts=0,active=false;for(let i=0;i<60;i++){g.tick();const next=f.attack['data-active']==='true';if(next&&!active)starts++;active=next;}assert(starts>=2,'held input repeats through cooldown gaps');g.key('keyup','i');g.tick(10);assert.equal(f.attack['data-active'],'false','release ends repeat');
  f['attack-rate'].value='2';f['attack-rate'].oninput({target:f['attack-rate']});f.attack.click();g.tick(2);f.pause.click();const pose=g.pose;g.tick(30);assert.equal(g.pose,pose,'pause freezes action');f.pause.click();g.tick(40);
  f['bind-attack'].click();g.key('keydown','q');g.key('keyup','q');g.key('keydown','q');g.key('keyup','q');g.tick();assert.equal(f.game.dataset.action,'attack','remapped attack works');
  const restored=boot(file,g.storage.get('room-zero-dev-v1'));assert.equal(+restored.fields['attack-rate'].value,2,'action rate persists');
 }
 console.log('PASS '+file+': instant pickup/hit, character identity, quick recovery, pickup animation, tuning, repeat and pause');
}

for(const file of ['dev/release-diagnostics.html','dev/play.html']){
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

for(const file of ['dev/release-diagnostics.html','dev/play.html']){
 // Long input-lifecycle checks run in the safe entrance so enemy damage cannot cancel input.
 const g=boot(file,undefined,true,false),f=g.fields;g.walkEntrance(false);
 // Face left, then strafe down/right while holding a left-facing attack.
 g.key('keydown','a');g.tick(2);g.key('keyup','a');g.tick();
 assert.equal(g.pose,20,'left idle retained');
 g.key('keydown','i');g.key('keydown','s');
 let attackFrames=0,gapFrames=0;const y=g.y;
 for(let i=0;i<24;i++){g.tick();assert(g.pose>=20&&g.pose<26,'held attack retains body aim during animation and cooldown');if(f.attack['data-active']==='true')attackFrames++;else gapFrames++;}
 assert(g.y>y+10,'movement stays responsive during attack');assert(attackFrames&&gapFrames,'attacks have recovery gaps');
 g.key('keyup','i');g.tick(10);assert(g.pose>=20&&g.pose<26,'held movement after attack release does not snap facing');
 g.key('keyup','s');g.tick();assert.equal(g.pose,20,'idle preserves attack-facing direction');
 g.key('keydown','d');g.tick(2);g.key('keyup','d');g.tick();assert.equal(g.pose,14,'new movement intentionally changes facing');
 // Release ignores rapid taps during recovery; there is no deferred action queue.
 f.attack.click();g.tick(6);assert.equal(f.attack['data-active'],'false','animation finishes before cooldown');
 f.attack.click();assert.equal(f.attack['data-active'],'false','early click cannot bypass cooldown');
 g.tick(20);assert.equal(f.attack['data-active'],'false','early click was not queued');
 f.attack.click();assert.equal(f.attack['data-active'],'true','fresh click after cooldown attacks immediately');
 g.tick(10);
 if(f.pause){
 // Pointer buttons exist only in development; keyboard-only release has one hold flag.
 // Pointer release must not cancel a simultaneous keyboard hold.
 g.key('keydown','i');f.attack.onpointerdown({button:0,pointerId:7,preventDefault(){}});
 f.attack.onpointerup({pointerId:7});g.tick(15);let repeated=false;
 for(let i=0;i<24;i++){g.tick();repeated ||= f.attack['data-active']==='true';}assert(repeated,'pointer release preserves keyboard input');
 g.key('keyup','i');g.tick(10);assert.equal(f.attack['data-active'],'false');
 f.attack.onpointerdown({button:0,pointerId:8,preventDefault(){}});g.key('keyup','i');g.tick(15);repeated=false;
 for(let i=0;i<12;i++){g.tick();repeated ||= f.attack['data-active']==='true';}assert(repeated,'keyup preserves pointer input');
 f.attack.onpointercancel({pointerId:8});g.tick(10);assert.equal(f.attack['data-active'],'false','pointer cancel releases');
 }
 // Focus within gameplay preserves held controls; leaving it safely clears them.
 g.key('keydown','i');g.handlers.focusin({target:f.game});g.tick(10);g.handlers.focusin({target:f.attack});g.tick(10);
 repeated=false;for(let i=0;i<12;i++){g.tick();repeated ||= f.attack['data-active']==='true';}assert(repeated,'gameplay focus preserves held attack');
 g.handlers.blur();g.tick(30);assert.equal(f.attack['data-active'],'false','blur clears held attack');
 g.key('keydown','i',f.game,{ctrlKey:true});g.tick();assert.equal(f.attack['data-active'],'false','modifier shortcut does not attack');
 if(f.pause){
  f['attack-cooldown'].value='500';f['attack-cooldown'].oninput({target:f['attack-cooldown']});
  const restored=boot(file,g.storage.get('room-zero-dev-v1'));assert.equal(+restored.fields['attack-cooldown'].value,500,'cooldown persists');
  g.key('keydown','i');g.tick(6);assert.equal(f.attack['data-active'],'false');g.tick(20);assert.equal(f.attack['data-active'],'false','cooldown independent of animation');g.tick(35);assert.equal(f.attack['data-active'],'true','held attack resumes when ready');
  f.pause.click();g.key('keydown','i');g.tick(30);f.pause.click();g.tick(40);assert.equal(f.attack['data-active'],'false','paused input does not latch a repeat');
  f['attack-mode'].value='press';f['attack-mode'].onchange({target:f['attack-mode']});g.key('keydown','i');g.tick(90);assert.equal(f.attack['data-active'],'false','press mode never auto-repeats');g.key('keyup','i');
 }
 console.log('PASS '+file+': locked attack strafe/idle, fresh direction input, cooldown gaps/no queue, focus lifecycle'+(f.pause?' and independent pointer/keyboard':''));
}

// Pickup must not swivel the character or conceal a punch, and its hit still follows aim.
for(const file of ['dev/release-diagnostics.html','dev/play.html']){
 const g=boot(file),f=g.fields;g.key('keydown','i');g.key('keydown','o');g.key('keyup','o');g.tick();
 assert.equal(g.pose,17,'pickup cannot steal the attack pose or direction');assert(!f['run-status'].textContent.includes('None'),'no power slot');
 g.key('keyup','i');g.tick(10);assert.equal(g.pose,14,'idle keeps captured facing after simultaneous pickup');
}
console.log('PASS simultaneous actions: captured hit direction, punch priority and pickup');

for(const fps of [30,60,144]){
 const g=boot('dev/release-diagnostics.html');g.key('keydown','i');let active=true,starts=1,lastStart=0;
 for(let i=1;i<=fps;i++){g.tick(1,1000/fps);const next=g.fields.attack['data-active']==='true';if(next&&!active){const time=i*1000/fps;assert(time-lastStart>=300-1e-6,'repeat respects cooldown across frame rates');lastStart=time;starts++;}active=next;}
 assert(starts>=3&&starts<=4,'repeat cadence stays close across frame rates');
}
{
 const g=boot('dev/release-diagnostics.html');g.key('keydown','i');g.tick(9,30);assert.equal(g.fields.attack['data-active'],'false');
 g.tick(1,5000);assert.equal(g.fields.attack['data-active'],'true','long frame triggers at most the next ready strike');
 g.key('keyup','i');g.tick(30);assert.equal(g.fields.attack['data-active'],'false','long frame creates no catch-up queue');
}
console.log('PASS cooldown timing: 30/60/144 fps cadence and no long-frame catch-up burst');
assert.equal(boot('dev/release-diagnostics.html').fields['run-status'].textContent,boot('dev/play.html').fields['run-status'].textContent,'release and development begin with identical game state');
assert.equal(boot('dev/release-diagnostics.html').fields['pickup-status'].textContent,boot('dev/play.html',undefined,false).fields['pickup-status'].textContent,'release and development generate the same starting encounter');

for(const file of ['dev/release-diagnostics.html','dev/play.html']){
 const g=boot(file,undefined,false,true,4);let hit=false;for(let i=0;i<3600&&!g.fields['run-status'].textContent.startsWith('Fallen');i++){g.tick();if(g.fields['run-status'].textContent.startsWith('HP 1'))hit=true;}
 assert(hit,'first damage leaves 1 HP');assert(g.fields['run-status'].textContent.startsWith('Fallen'),'second hit kills player');assert(g.flashes>0,'damage draws red feedback');assert.equal(g.pose,38,'death uses dedicated atlas sprite');const x=g.x,y=g.y;g.key('keydown','d');g.key('keydown','i');g.tick(30);assert.equal(g.x,x);assert.equal(g.y,y);assert.equal(g.pose,38,'dead player does not walk or attack');g.key('keyup','d');g.key('keyup','i');g.fields.interact.click();g.tick();assert.equal(g.fields['run-status'].textContent,'Room Zero','interact restarts in safe entrance');assert.equal(g.entropy,g.fields.seed?2:0,'dev restart rolls a fresh seed; release uses native random draws');if(!g.fields.seed){const before=g.randomCalls;g.goDungeon();assert(g.randomCalls>before,'new run consumes fresh random draws');}
 console.log('PASS '+file+': 2 HP, damage flash, dedicated corpse, death lock and restart');
}

}
