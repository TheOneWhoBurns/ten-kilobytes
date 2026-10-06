const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('src/world.js','utf8'),body=source.slice(source.indexOf('function drawGate(){'),source.indexOf('let audio,')),old=fs.readFileSync('tools/fixtures/landmarks-before-data.js','utf8');
const compact=require('./compact-source.cjs')(require('./landmark-data.cjs')()+body)+'ctx=graphics(canvas);drawGate();';
function render(code,kind,hue,time){
 const canvas=createCanvas(372,252),ctx=canvas.getContext('2d');
 vm.runInNewContext(code,{ctx,canvas,world:{exit:kind,boss:6},worldTime:time,chamber:6,room:{gate:{x:15.5,y:7.5},doors:[{x:30.5,y:10.5,dir:0},{x:.5,y:10.5,dir:1}],enemies:[]},worldColor:(l=65,o=0)=>`hsl(${hue+o} 45% ${l}%)`});
 return Buffer.from(ctx.getImageData(0,0,372,252).data);
}
for(let kind=0;kind<10;kind++)for(const hue of [175,265])for(const time of [0,.25,1.234,9.8])assert(render(old+'drawGate();',kind,hue,time).equals(render(compact,kind,hue,time)),'landmark '+kind+' hue '+hue+' time '+time);
console.log('PASS 80 landmark frames: shared shape data, palette, geometry and animation match the old renderer');
