// Render the real development build into a contact sheet without changing browser settings.
const fs=require('node:fs'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
const html=require('./read-build.cjs')('dev/play.html'),fields={},raf=[],handlers={};
class Element{constructor(tag){this.tagName=tag;this.value='';this.style={};this.dataset={};}setAttribute(k,v){this[k]=v;}focus(){}setPointerCapture(){}}
for(const m of html.matchAll(/<(input|button|select|span|div|canvas|p)[^>]*\bid="([^"]+)"[^>]*>/g))fields[m[2]]=new Element(m[1].toUpperCase());
const canvas=createCanvas(372,252),document={getElementById:id=>fields[id],createElement:()=>createCanvas(1,1),addEventListener(){}};
fields.game.getContext=()=>canvas.getContext('2d');fields.game.parentElement={getBoundingClientRect:()=>({width:900,height:650})};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document,HTMLInputElement:Element,ResizeObserver:class{observe(){}},localStorage:{getItem:()=>null,setItem(){}},atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:require('node:crypto').webcrypto,requestAnimationFrame:f=>raf.push(f),addEventListener:(name,fn)=>handlers[name]=fn});
if(process.argv.includes('--entrance')||process.argv.includes('--ring')){
 let clock=16;raf.shift()(clock);
 if(process.argv.includes('--ring'))for(const [key,frames] of [['d',174],['s',108],['a',168],['w',96],['d',36],['s',12],['d',108],['w',12],['d',12],['s',84],['a',144],['w',60],['d',120],['s',48],['a',108],['w',36],['d',30],['s',12],['d',27],['w',3]]){handlers.keydown({key,target:fields.game,preventDefault(){}});for(let i=0;i<frames*2;i++){clock+=1000/60;raf.shift()(clock);}handlers.keyup({key});}
 const preview=createCanvas(1116,756),ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,0,0,1116,756);fs.mkdirSync('dev/screenshots',{recursive:true});const path='dev/screenshots/'+(process.argv.includes('--ring')?'ring-center':'spiral-entrance')+'.png';fs.writeFileSync(path,preview.toBuffer('image/png'));console.log(path);process.exit(0);
}
const bossMode=process.argv.includes('--boss'),worldAPI=bossMode?vm.runInNewContext(require('./content-data.cjs')()+fs.readFileSync('src/room.js','utf8')+fs.readFileSync('src/world.js','utf8')+';({makeLevel})'):null;
const sheet=createCanvas(4*384,3*278),c=sheet.getContext('2d');c.fillStyle='#080c14';c.fillRect(0,0,sheet.width,sheet.height);let time=0;
for(let i=0;i<12;i++){
 fields.seed.value=String(i);fields.generate.onclick();fields['room-select'].value=String(bossMode?worldAPI.makeLevel(i,1).boss:0);fields['room-select'].onchange({target:fields['room-select']});time+=16;raf.shift()(time);
 const x=i%4*384,y=(i/4|0)*278;c.drawImage(canvas,x,y+20);c.fillStyle='#dce4d4';c.font='12px monospace';c.fillText('Seed '+i,x+6,y+14);
}
fs.mkdirSync('dev/screenshots',{recursive:true});const path='dev/screenshots/'+(bossMode?'boss':'organic')+'-rooms.png';fs.writeFileSync(path,sheet.toBuffer('image/png'));console.log(path);
