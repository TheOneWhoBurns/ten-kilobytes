// Pixel/audio oracle for release optimizations. Baseline capture is intentionally immutable.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function simulate(html,seed,frames=240,metrics,unusedAtlasPixels=0,sharedActorAtlas=false){
 const handlers={},fields={},raf=[],canvases=[],nodes=[];let time=0,nodeID=0;const audio=[];
 class Element{constructor(tag){this.tagName=tag;this.value='';this.style={};this.dataset={};}setAttribute(k,v){this[k]=v;}focus(){}setPointerCapture(){}}
 for(const m of html.matchAll(/<(input|button|select|span|div|canvas|p)[^>]*\bid="([^"]+)"[^>]*>/g))fields[m[2]]=new Element(m[1].toUpperCase());
 const main=createCanvas(372,252);canvases.push(main);fields.game.getContext=()=>main.getContext('2d');fields.game.parentElement={getBoundingClientRect:()=>({width:800,height:600})};
 const document={getElementById:id=>fields[id],createElement:()=>{const c=createCanvas(1,1);canvases.push(c);return c;},addEventListener:(name,fn)=>handlers[name]=fn};
 function param(id,key){let value=0;const result={};Object.defineProperty(result,'value',{get:()=>value,set:v=>{value=v;audio.push([id,key,'value',v]);}});for(const method of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime'])result[method]=(...args)=>audio.push([id,key,method,...args]);return result;}
 class AudioContext{get currentTime(){return time/1000;}get destination(){return {id:'out'};}resume(){}createOscillator(){return node('oscillator');}createGain(){return node('gain');}}
 function node(type){const id=nodeID++,n={id,frequency:param(id,'frequency'),gain:param(id,'gain'),connect:target=>audio.push([id,'connect',target.id??'parameter']),disconnect:()=>audio.push([id,'disconnect']),start:t=>audio.push([id,'start',t]),stop:t=>{audio.push([id,'stop',t]);n.end=t;}};let waveform='sine';Object.defineProperty(n,'type',{get:()=>waveform,set:v=>{waveform=v;audio.push([id,'type',v]);}});nodes.push(n);return n;}
 const sandbox={document,AudioContext,Int16Array:class extends Int16Array{constructor(...args){super(...args);if(metrics)metrics.navigationAllocations=(metrics.navigationAllocations||0)+1;}},ResizeObserver:class{observe(){}},atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:{getRandomValues(a){a[0]=seed;return a;}},requestAnimationFrame:fn=>raf.push(fn),addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox,{timeout:5000});
 const key=(type,k)=>handlers[type]({key:k,target:fields.game,repeat:false,preventDefault(){}});
 key('keydown','r');key('keyup','r');fields.sound.onclick();key('keydown','o');key('keyup','o');
 // Traverse the playable prologue before comparing the ordinary combat loop.
 time+=1000/60;raf.shift()(time);
 if(fields['run-status'].textContent==='Room Zero')for(const [k,n] of [['d',174],['s',108],['a',168],['w',96],['d',36],['s',12],['d',108],['w',12],['d',12],['s',84],['a',144],['w',60],['d',120],['s',48],['a',108],['w',36],['d',30],['s',12],['d',27],['w',3]]){key('keydown',k);for(let j=0;j<n;j++){time+=1000/60;raf.shift()(time);}key('keyup',k);}
 key('keydown','o');key('keyup','o');for(let j=0;j<30;j++){time+=1000/60;raf.shift()(time);}
 assert.notEqual(fields['run-status'].textContent,'Room Zero','equivalence scenario reaches the dungeon');
 const pictures=[],hud=[];let direction;
 for(let i=0;i<frames;i++){
  if(i%60===0){if(direction)key('keyup',direction);direction=['d','s','a','w'][i/60%4];key('keydown',direction);}
  if(i===12)key('keydown','i');if(i===190)key('keyup','i');
  time+=1000/60;for(const n of nodes)if(n.end!==undefined&&n.end<=time/1000&&!n.ended){n.ended=true;n.onended?.();}
  raf.shift()(time);
  if(i%12===0){pictures.push(hash(main.getContext('2d').getImageData(0,0,372,252).data));hud.push([fields['run-status'].textContent,fields['pickup-status'].textContent,fields.attack['data-active'],fields.interact['data-active']]);}
 }
 // The old release included two unused leading tiles. Compare every retained
 // atlas pixel after removing only those slots, as well as all rendered surfaces.
 let surfaces=canvases;
 if(sharedActorAtlas&&canvases.length===4){
  // Compare the exact same retained pixels after folding the old vertical
  // player sheet into its atlas slots. Only unused fallback frames disappear.
  const oldAtlas=canvases[2],merged=createCanvas(oldAtlas.width-unusedAtlasPixels,12),c=merged.getContext('2d');
  c.drawImage(oldAtlas,unusedAtlasPixels,0,merged.width,12,0,0,merged.width,12);
  for(let i=0;i<24;i++){const x=merged.width-288+i*12;c.clearRect(x,0,12,12);c.drawImage(canvases[1],0,168+i*12,12,12,x,0,12,12);}
  surfaces=[canvases[0],merged,canvases[3]];unusedAtlasPixels=0;
 }
 return {pictures,hud,audio:hash(JSON.stringify(audio)),atlas:surfaces.map((c,i)=>{const x=i===2?unusedAtlasPixels:0;return[c.width-x,c.height,hash(c.getContext('2d').getImageData(x,0,c.width-x,c.height).data)];})};
}
module.exports={simulate};
if(require.main===module){
 const twoHit=process.argv.includes('--two-hit'),current=process.argv.includes('--current-source');
 const rgb444=process.argv.includes('--rgb444'),sharedActorAtlas=process.argv.includes('--shared-actor'),original=fs.readFileSync(current?'dev/release-source.html':twoHit?'tools/fixtures/game-two-hit-before-optimization.html':'tools/fixtures/game-before-optimization.html','utf8'),baseline=rgb444?require('./quantize-colors.cjs')(original):original,args=process.argv.slice(2).filter(s=>!['--rgb444','--shared-actor','--two-hit','--current-source'].includes(s)),files=args.length?args:['dist/index.html'];
 if(rgb444)for(const [color] of original.matchAll(/#[a-f\d]{6}\b/gi)){
  const rounded=require('./quantize-colors.cjs')(color);
  for(let i=0;i<3;i++)assert(Math.abs(parseInt(color.slice(1+i*2,3+i*2),16)-parseInt(rounded[i+1],16)*17)<=8,'color error exceeds 8/255');
 }
 for(const file of files){try{const candidate=require('./read-build.cjs')(file);for(const seed of [1,2,7,19,83,104,2026])assert.deepEqual(simulate(candidate,seed,240,undefined,0,sharedActorAtlas),simulate(baseline,seed,240,undefined,twoHit||current?0:24,sharedActorAtlas));console.log('PASS '+(rgb444?'RGB444 pixels (bounded color change), exact HUD/audio':'pixel/audio equality')+': '+file);}catch(e){console.error('FAIL '+file+': '+e.message.slice(0,500));process.exitCode=1;}}
}
