const assert=require('node:assert/strict'),c=require('../assets/catalog/catalog.json'),usage=require('../assets/catalog/runtime-selection.json');
assert.equal(c.entries.length,206*50);assert.equal(new Set(c.entries.map(e=>e.id)).size,c.entries.length);
for(const e of c.entries){assert.equal(e.id,e.y*206+e.x);assert(e.category&&e.family&&e.confidence);if(e.kind==='sprite'){assert(e.colors.length);for(const id of e.variants)assert.equal(c.entries[id].silhouette,e.silhouette);}}
for(const [role,tiles] of Object.entries(usage))for(const {x,y,blank} of tiles)if(!blank)assert.equal(c.entries[y*206+x].kind,'sprite',role+' must use actual art, not an empty tile');
for(const g of c.composites)for(let y=g.y;y<g.y+g.h;y++)for(let x=g.x;x<g.x+g.w;x++)assert.equal(c.entries[y*206+x].kind,'sprite','composite has every quadrant');
for(const g of c.animationGroups)for(const [x,y] of g.frames)assert.equal(c.entries[y*206+x].kind,'sprite','animation frames exist');
console.log('PASS catalogue: every slot, explicit confidence, exact variant links, selected art, complete composites and animation groups');
