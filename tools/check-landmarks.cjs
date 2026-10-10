const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const js=fs.readFileSync('dev/play.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],node=require('acorn').parse(js,{ecmaVersion:2020}).body[0].expression.callee.body.body[0].declarations[0].init,assets=vm.runInNewContext('('+js.slice(node.start,node.end)+')'),bits=Buffer.from(assets.bits,'base64');
function tile(ctx,id,x,y,size=12){ctx.fillStyle='#c9c5ed';for(let p=0;p<144;p++)if(bits[id*18+(p>>3)]&(128>>(p&7)))ctx.fillRect(x+p%12*size/12,y+(p/12|0)*size/12,size/12,size/12);}
const source=fs.readFileSync('src/world.js','utf8'),body=source.slice(source.indexOf('function drawGate(){'),source.indexOf('let audio,'));
const drawing=fs.readFileSync('src/game.js','utf8'),transform=drawing.slice(drawing.indexOf('function transform('),drawing.indexOf('function tile('));
const compact=require('./compact-source.cjs')(transform+body)+'ctx=graphics(canvas);drawGate();';
function render(enemies,doors){
 const canvas=createCanvas(372,252),ctx=canvas.getContext('2d');
 vm.runInNewContext(compact,{ctx,canvas,assets,tile,room:{doors,enemies},worldColor:(l=65,o=0)=>`hsl(${215+o} 45% ${l}%)`});
 return Buffer.from(ctx.getImageData(0,0,372,252).data);
}
const doors=[{x:30.5,y:10.5,dir:0},{x:.5,y:10.5,dir:1}];
for(const enemies of [[],[{hp:10}]])assert(!render(enemies,[]).some(n=>n),'removed landmarks leave no visible pixels');
const clear=render([],doors),locked=render([{hp:10}],doors);
assert(clear.some(n=>n)&&locked.some(n=>n),'room doors remain visible');
assert(!clear.equals(locked),'room doors still reflect combat locking');
console.log('PASS landmark removal: empty exit art, visible room doors and combat locks');

const transition=source.slice(source.indexOf('function drawTransition(){'),source.indexOf('function drawGate(){'));
for(const [x,y] of [[.5,10.5],[30.5,10.5],[15.5,.5],[15.5,20.5],[15.5,10.5]]){
 const canvas=createCanvas(372,252),ctx=canvas.getContext('2d'),counts=[];
 for(const reveal of [.45,.3375,.225,.001,0]){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,372,252);vm.runInNewContext(transition+'drawTransition();',{ctx,W:31,H:21,reveal,revealAt:{x,y},travel:0});const pixels=ctx.getImageData(0,0,372,252).data;let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>250)count++;counts.push(count);if(reveal===.3375){const at=((y*12|0)*372+(x*12|0))*4;assert(pixels[at]>250,'the destination door is revealed first');}}
 assert.equal(counts[0],0);assert.equal(counts.at(-1),372*252);for(let i=1;i<counts.length;i++)assert(counts[i]>=counts[i-1],'circle expands monotonically across every door orientation');
}
console.log('PASS circular transition pixels: edge and center origins, progressive reveal and full coverage');
