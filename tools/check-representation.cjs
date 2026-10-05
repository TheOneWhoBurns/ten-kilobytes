const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const api=vm.runInNewContext(require('./content-data.cjs')()+fs.readFileSync('src/room.js','utf8')+fs.readFileSync('src/world.js','utf8')+';({makeLevel,W,H})');
const capture=process.argv.includes('--capture'),file='tools/fixtures/world-stream.json',fixture=capture?{seed_count:1000,depths:[1,10]}:JSON.parse(fs.readFileSync(file));
function stable(v){if(ArrayBuffer.isView(v)||Array.isArray(v))return Array.from(v,stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
// Decode the compact representation into the exact original schema. This hash
// was captured from the previous generator, not generated from the current one.
const hash=crypto.createHash('sha256');
for(let seed=0;seed<fixture.seed_count;seed++)for(const depth of fixture.depths){
 const world=api.makeLevel(seed,depth);assert.equal(world.nodes.byteLength,7);
 world.nodes=Array.from(world.nodes,n=>[(n&15)-8,(n>>4)-8]);
 let bytes=0;
 for(const room of world.rooms){
  assert.equal(room.cells.byteLength,651);bytes+=room.cells.byteLength;
  const values=Array.from({length:api.W*api.H},(_,n)=>room.cells[n]);
  room.features=values.map(v=>v>>1);room.cells=values.map(v=>+(v===1));
 }
 assert.equal(bytes,4557);hash.update(JSON.stringify(stable(world)));
}
const digest=hash.digest('hex');if(capture){fs.writeFileSync(file,JSON.stringify({...fixture,sha256:digest},null,2)+'\n');console.log('Captured reviewed shared-stream world baseline');process.exit(0);}
assert.equal(digest,fixture.sha256,'all geometry, props, enemies, hazards, loot, palettes, doors and bosses match');
console.log('PASS representation: 2,000 shared-stream world snapshots, 4,557-byte shared grids and seven-byte coordinates');
