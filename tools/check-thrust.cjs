const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{PNG}=require('pngjs'),{createCanvas}=require('@napi-rs/canvas');
const sheet=PNG.sync.read(fs.readFileSync('assets/source/urizen.png')),bits=Buffer.alloc(18),[sx,sy]=require('./fixtures/retired-weapons.json').find(w=>w.id==='thrust').sprite;
for(let p=0;p<144;p++){const i=((sy*13+1+(p/12|0))*sheet.width+sx*13+1+p%12)*4;if(sheet.data[i+3]&&Math.max(...sheet.data.subarray(i,i+3))>=32)bits[p>>3]|=128>>(p&7);}
const generated=require('./thrust-sprite.cjs')(bits),masks=[generated.subarray(18),generated.subarray(0,18)],sprites=masks.map(bits=>{const c=createCanvas(12,12),g=c.getContext('2d');g.fillStyle='#bdeddf';for(let p=0;p<144;p++)if(bits[p>>3]&(128>>(p&7)))g.fillRect(p%12,p/12|0,1,1);return c;});
for(let x=0;x<8;x++){const p=5*12+x;assert(masks[1][p>>3]&(128>>(p&7)),'horizontal shaft stays connected');}
const combat=fs.readFileSync('src/combat.js','utf8'),shape= combat.slice(combat.indexOf('function starterMotion('),combat.indexOf('function hitBlow('));
const code=shape+combat.slice(combat.indexOf('function drawStarter('),combat.indexOf('function drawCombat('))+'function drawCombat(){'+fs.readFileSync('src/combat.js','utf8').split('function drawCombat(){')[1]+';drawCombat();',proof=createCanvas(640,320),g=proof.getContext('2d');g.fillStyle='#141923';g.fillRect(0,0,640,320);g.imageSmoothingEnabled=false;
for(let i=0;i<8;i++){
 const a=i*Math.PI/4,c=createCanvas(40,32),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 let calls=0;
 vm.runInNewContext(code,{health:2,weapon:6,facing:0,ctx,player:{x:20/12,y:20/12},blows:[{kind:6,a,age:.3}],fields:[],gaze:0,radiation:0,assets:{weapon:0,thrust:1},weaponArt:0,tile(ctx,id,x,y){
  calls++;assert.equal(id,i%2?2:1,'native diagonal vs horizontal mask');
  const m=ctx.getTransform(),v=id===1?[10,0]:[6,-6],dx=m.a*v[0]+m.c*v[1],dy=m.b*v[0]+m.d*v[1];
  assert(Math.abs(Math.sin(Math.atan2(dy,dx)-a))<1e-6&&dx*Math.cos(a)+dy*Math.sin(a)>0,'tip points along committed dash');
  ctx.drawImage(sprites[id===1?1:0],x,y);
 }});
 assert.equal(calls,1);
 const pixels=ctx.getImageData(0,0,40,32).data,ink=Array.from(pixels).filter((v,j)=>j%4===3&&v).length;
 const count=Array.from(masks[i%2?0:1]).reduce((n,b)=>n+b.toString(2).replaceAll('0','').length,0);
 assert.equal(ink,count,'every weapon pixel survives rotation');
 const x=i%4*160,y=(i/4|0)*160;g.drawImage(c,x,y,160,128);g.fillStyle='#fff';g.fillText(['Right','Down-right','Down','Down-left','Left','Up-left','Up','Up-right'][i],x+12,y+148);
}
fs.mkdirSync('dev/screenshots',{recursive:true});fs.writeFileSync('dev/screenshots/thrust-eight-directions.png',proof.toBuffer('image/png'));
console.log('PASS Thrust: all eight tips align with dash, every sprite pixel survives, one weapon per attack');
