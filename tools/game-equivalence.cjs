// Pixel/audio oracle for release optimizations. Baseline capture is intentionally immutable.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function simulate(html,seed,frames=240,metrics,unusedAtlasPixels=0,sharedActorAtlas=false){
 const handlers={},fields={},raf=[],canvases=[],nodes=[];let time=0,nodeID=0,minimapSeen=false;const audio=[];
 class Element{constructor(tag){this.tagName=tag;this.value='';this.style={};this.dataset={};}setAttribute(k,v){this[k]=v;}focus(){}setPointerCapture(){}}
 for(const m of html.matchAll(/<(input|button|select|span|div|canvas|p)[^>]*\bid="([^"]+)"[^>]*>/g))fields[m[2]]=new Element(m[1].toUpperCase());
 const main=createCanvas(372,252),mainContext=main.getContext('2d'),fillRect=mainContext.fillRect;mainContext.fillRect=function(x,y,w,h){if(w===5&&h===5)minimapSeen=true;return fillRect.call(this,x,y,w,h);};canvases.push(main);fields.game.getContext=()=>mainContext;fields.game.parentElement={getBoundingClientRect:()=>({width:800,height:600})};
 const document={getElementById:id=>fields[id],createElement:()=>{const c=createCanvas(1,1);canvases.push(c);return c;},addEventListener:(name,fn)=>handlers[name]=fn};
 // Optional geometry/style trace isolates gameplay from a deliberate permutation
 // of exact masks within an enemy pool. Normal pixel comparisons stay unchanged.
 const drawTrace=metrics?.traceDrawing&&crypto.createHash('sha256');
 if(drawTrace)for(const method of ['drawImage','fillRect','fillText','stroke','beginPath','arc','save','restore','translate','rotate','scale']){
  const original=mainContext[method];
  mainContext[method]=function(...args){drawTrace.update(JSON.stringify([method,args.map(a=>canvases.includes(a)?['canvas',canvases.indexOf(a)]:a),this.fillStyle,this.strokeStyle,this.globalAlpha,this.lineWidth,this.font]));return original.apply(this,args);};
 }
 function param(id,key){let value=0;const result={};Object.defineProperty(result,'value',{get:()=>value,set:v=>{value=v;audio.push([id,key,'value',v]);}});for(const method of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime'])result[method]=(...args)=>audio.push([id,key,method,...args]);return result;}
 class AudioContext{get currentTime(){return time/1000;}get destination(){return {id:'out'};}resume(){}createOscillator(){return node('oscillator');}createGain(){return node('gain');}}
 function node(type){const id=nodeID++,n={id,frequency:param(id,'frequency'),gain:param(id,'gain'),connect:target=>audio.push([id,'connect',target.id??'parameter']),disconnect:()=>audio.push([id,'disconnect']),start:t=>audio.push([id,'start',t]),stop:t=>{audio.push([id,'stop',t]);n.end=t;}};let waveform='sine';Object.defineProperty(n,'type',{get:()=>waveform,set:v=>{waveform=v;audio.push([id,'type',v]);}});nodes.push(n);return n;}
 const sandbox={Math:Object.assign(Object.create(Math),{random:require('./test-random.cjs')(seed+':1')}),document,AudioContext,Int16Array:class extends Int16Array{constructor(...args){super(...args);if(metrics)metrics.navigationAllocations=(metrics.navigationAllocations||0)+1;}},ResizeObserver:class{observe(){}},atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:{getRandomValues(a){a[0]=seed;return a;}},requestAnimationFrame:fn=>raf.push(fn),addEventListener:(name,fn)=>handlers[name]=fn};
 require('./dom-events.cjs')(sandbox,handlers);
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox,{timeout:5000});
 const key=(type,k)=>handlers[type]({key:k,keyCode:({ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40}[k]||k.toUpperCase().charCodeAt(0)),target:fields.game,repeat:false,preventDefault(){}});
 key('keydown','r');key('keyup','r');fields.sound?.onclick?.();key('keydown','o');key('keyup','o');
 // Traverse the playable prologue before comparing the ordinary combat loop.
 time+=1000/60;raf.shift()(time);
 const currentRoute=html.includes('dEpxQxgKCAc0BgwLCDphK1AeCQ8Z');
 const route=(currentRoute||html.includes('@ -> '))?(()=>{let x=.5,y=1.5;const steps=[];for(const [xx,yy]of require('./fixtures/entrance-route.json')){if(xx!==x)steps.push([xx>x?'d':'a',Math.round(Math.abs(xx-x)*6)]);if(yy!==y)steps.push([yy>y?'s':'w',Math.round(Math.abs(yy-y)*6)]);x=xx;y=yy;}return steps;})():null;
 if(!fields['run-status']||fields['run-status'].textContent==='Room Zero')for(const [k,n] of route|| [['d',174],['s',108],['a',168],['w',96],['d',36],['s',12],['d',108],['w',12],['d',12],['s',84],['a',144],['w',60],['d',120],['s',48],['a',108],['w',36],['d',30],['s',12],['d',27],['w',3]]){key('keydown',k);for(let j=0;j<n;j++){time+=1000/60;raf.shift()(time);}key('keyup',k);}
 key('keydown','o');key('keyup','o');for(let j=0;j<30;j++){time+=1000/60;raf.shift()(time);}
 assert.notEqual(fields['run-status']?.textContent,'Room Zero','equivalence scenario reaches the dungeon');
 if(currentRoute)assert(minimapSeen,'canvas-only release reaches the dungeon and draws a visited room');
 const pictures=[],hud=[];let direction;
 for(let i=0;i<frames;i++){
  if(i%60===0){if(direction)key('keyup',direction);direction=['d','s','a','w'][i/60%4];key('keydown',direction);}
  if(i===12)key('keydown','i');if(i===190)key('keyup','i');
  time+=1000/60;for(const n of nodes)if(n.end!==undefined&&n.end<=time/1000&&!n.ended){n.ended=true;n.onended?.();}
  raf.shift()(time);
  if(i%12===0){pictures.push(hash(main.getContext('2d').getImageData(0,0,372,252).data));if(fields['run-status'])hud.push([fields['run-status'].textContent,fields['pickup-status'].textContent,fields.attack['data-active'],fields.interact['data-active']]);}
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
 if(drawTrace)metrics.drawHash=drawTrace.digest('hex');
 return {pictures,hud,audio:hash(JSON.stringify(audio)),atlas:surfaces.map((c,i)=>{const x=i===2?unusedAtlasPixels:0;return[c.width-x,c.height,hash(c.getContext('2d').getImageData(x,0,c.width-x,c.height).data)];})};
}
module.exports={simulate};
if(require.main===module){
 const twoHit=process.argv.includes('--two-hit'),current=process.argv.includes('--current-source'),spiral=process.argv.includes('--spiral'),entrance=process.argv.includes('--entrance');
 const rgb444=process.argv.includes('--rgb444'),sharedActorAtlas=process.argv.includes('--shared-actor'),original=entrance?require('./read-build.cjs')('tools/fixtures/game-feet-entrance.html'):spiral?require('./read-build.cjs')('tools/fixtures/game-spiral-before-optimization.html'):fs.readFileSync(current?'dev/release-source.html':twoHit?'tools/fixtures/game-two-hit-before-optimization.html':'tools/fixtures/game-before-optimization.html','utf8'),baseline=rgb444?require('./quantize-colors.cjs')(original):original,args=process.argv.slice(2).filter(s=>!['--rgb444','--shared-actor','--two-hit','--current-source','--spiral','--entrance'].includes(s)),files=args.length?args:['dist/index.html'];
 if(rgb444)for(const [color] of original.matchAll(/#[a-f\d]{6}\b/gi)){
  const rounded=require('./quantize-colors.cjs')(color);
  for(let i=0;i<3;i++)assert(Math.abs(parseInt(color.slice(1+i*2,3+i*2),16)-parseInt(rounded[i+1],16)*17)<=8,'color error exceeds 8/255');
 }
 for(const file of files){try{const candidate=require('./read-build.cjs')(file);for(const seed of [1,2,7,19,83,104,2026]){const actual=simulate(candidate,seed,240,undefined,0,sharedActorAtlas),expected=simulate(baseline,seed,240,undefined,twoHit||current||spiral||entrance?0:24,sharedActorAtlas);if(!candidate.includes('id="run-status"'))expected.hud=[];assert.deepEqual(actual,expected);}console.log('PASS '+(rgb444?'RGB444 pixels (bounded color change), exact HUD/audio':'pixel/audio equality')+': '+file);}catch(e){console.error('FAIL '+file+': '+e.message.slice(0,500));process.exitCode=1;}}
}
