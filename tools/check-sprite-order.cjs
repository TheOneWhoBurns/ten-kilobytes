const assert=require('node:assert/strict'),order=require('./order-sprites.cjs'),catalog=require('../assets/content.json'),usage=require('../assets/catalog/runtime-selection.json');
const coords=tiles=>tiles.map(p=>Array.isArray(p)?p.join(','):p.x+','+p.y).sort();
assert.deepEqual(coords(usage.enemyTiles),coords(catalog.enemySprites),'every requested enemy mask is retained');
for(const e of catalog.enemies){const {base=0,variants=1,themeStride=0}=e.art||{};for(let theme=0;theme<3;theme++){const start=base+theme*themeStride;assert.deepEqual(coords(usage.enemyTiles.slice(start,start+variants)),coords(catalog.enemySprites.slice(start,start+variants)),'sprite pool stays attached to its enemy behavior');}}
const tiles=[{x:0},{x:1},{x:2},{x:3}],bits=Buffer.alloc(72);bits.fill(255,18,36);bits[36]=1;bits[54]=128;
const sample={enemies:[{art:{base:0,variants:3}}]},result=order(sample,tiles,bits);
assert.deepEqual(result.map(t=>t.x),[0,2,1,3]);assert.deepEqual(tiles.map(t=>t.x),[0,1,2,3],'source order remains unchanged');
for(const extra of [{animation:2},{themeStride:1}])assert.deepEqual(order({enemies:[{art:{base:0,variants:3,...extra}}]},tiles,bits),tiles,'animated and theme-strided pools retain frame order');
assert.deepEqual(order({enemies:[...sample.enemies,{art:{base:2,variants:2}}]},tiles,bits),tiles,'overlapping pools remain untouched');
console.log('PASS lossless sprite ordering: exact art, behavior pools, animation/biome/overlap protection');

// Every six-bit symbol, repeated across a complete tile, exercises both gaps
// in the literal-safe alphabet and row/tile boundaries in the shipped loader.
const encode=require('./sprite-data.cjs'),pixels=Buffer.alloc(64*18);
for(let t=0;t<64;t++)for(let p=0;p<144;p++)if(t&(32>>(p%6)))pixels[t*18+(p>>3)]|=128>>(p&7);
const encoded=encode(pixels),restored=Buffer.alloc(pixels.length),atlas={};
assert.equal(encoded.text.length,64*24);assert(!/["'\\`]/.test(encoded.text),'bitmap text needs no JS string escapes');
require('node:vm').runInNewContext(encoded.loader,{assets:{bits:encoded.text},atlas,art:{fillRect(x,y,w,h){assert.equal(w,1);assert.equal(h,1);const t=x/12|0,p=y*12+x%12;restored[t*18+(p>>3)]|=128>>(p&7);}}});
assert.equal(atlas.width,64*12);assert.equal(atlas.height,12);assert.deepEqual(restored,pixels,'all bitmap symbols decode exactly');
assert.throws(()=>encode(Buffer.alloc(1)),/complete/);
console.log('PASS escape-free sprite encoding: every six-bit symbol and exact row/tile boundaries');
