const assert=require('node:assert/strict'),c=require('../assets/catalog/catalog.json'),usage=require('../assets/catalog/runtime-selection.json');
assert.equal(c.entries.length,206*50);assert.equal(new Set(c.entries.map(e=>e.id)).size,c.entries.length);
for(const e of c.entries){assert.equal(e.id,e.y*206+e.x);assert(e.category&&e.family&&e.confidence);if(e.kind==='sprite'){assert(e.colors.length);for(const id of e.variants)assert.equal(c.entries[id].silhouette,e.silhouette);}}
const {PNG}=require('pngjs'),fs=require('node:fs');
const rings=['large','medium'].map((name,i)=>{
 const p=PNG.sync.read(fs.readFileSync('assets/generated/ring-'+name+'.png')),size=i?72:96;
 assert.equal(p.width,size);assert.equal(p.height,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const a=p.data[(y*size+x)*4+3];assert(a===0||a===255,'ring is a one-bit sprite');
  assert.equal(a,p.data[(y*size+size-1-x)*4+3],'horizontal symmetry');
  assert.equal(a,p.data[((size-1-y)*size+x)*4+3],'vertical symmetry');
 }
 assert.equal(p.data[(size/2*size+size/2)*4+3],0,'ring center stays transparent');return p;
});
for(const [role,tiles] of Object.entries(usage))for(const {x,y,blank,ring,door,part} of tiles)if(!blank){
 if(ring!==undefined){assert.equal(role,'ring');assert(rings[ring]);assert(Number.isInteger(part)&&part>=0&&part<4);}
 else if(door!==undefined){assert.equal(role,'doors');assert(door===0||door===1);assert(Number.isInteger(part)&&part>=0&&part<4);assert.equal(require('../assets/generated/door-arches.json')[door].length,24);}
 else assert.equal(c.entries[y*206+x].kind,'sprite',role+' must use actual art, not an empty tile');
}
assert.equal(usage.ring.length,12,'two compact 24px ring quarters plus the original four tiles');
for(const g of c.composites)for(let y=g.y;y<g.y+g.h;y++)for(let x=g.x;x<g.x+g.w;x++)assert.equal(c.entries[y*206+x].kind,'sprite','composite has every quadrant');
for(const g of c.animationGroups)for(const [x,y] of g.frames)assert.equal(c.entries[y*206+x].kind,'sprite','animation frames exist');
console.log('PASS catalogue: every slot, explicit confidence, exact variant links, selected art, complete composites and animation groups');
