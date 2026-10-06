const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const api=vm.runInNewContext(require('./content-data.cjs')()+fs.readFileSync('src/room.js','utf8')+fs.readFileSync('src/world.js','utf8')+';({makeLevel,W,H})');
const capture=process.argv.includes('--capture'),file='tools/fixtures/world-placement.json',fixture=capture?{seed_count:1000,depths:[1,10]}:JSON.parse(fs.readFileSync(file));
function stable(v){if(ArrayBuffer.isView(v)||Array.isArray(v))return Array.from(v,stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
// Normalize the compact representation for a reviewed post-optimization fixture.
// world-roster.json and world-compact.json preserve earlier generators; the shared placement pass intentionally changes layouts.
const hash=crypto.createHash('sha256');
for(let seed=0;seed<fixture.seed_count;seed++)for(const depth of fixture.depths){
 const world=api.makeLevel(seed,depth);
 let bytes=0;
 for(const room of world.rooms){
  // Expand cell tags into observable geometry and decoration for the fixture.
  room.hazards=require('./hazard-view.cjs')(room);delete room.offset;
  assert(Number.isInteger(room.spawn)&&room.spawn>=0&&room.spawn<651);
  room.spawn={x:room.spawn%31+.5,y:Math.floor(room.spawn/31)+.5};
  assert.equal(room.cells.byteLength,651);bytes+=room.cells.byteLength;
  const values=Array.from({length:api.W*api.H},(_,n)=>room.cells[n]);
  room.props=require('./prop-view.cjs')(room);room.cells=values.map(v=>v&1);
 }
 assert.equal(bytes,4557);hash.update(JSON.stringify(stable(world)));
}
const digest=hash.digest('hex');if(capture){fs.writeFileSync(file,JSON.stringify({...fixture,sha256:digest},null,2)+'\n');console.log('Captured reviewed shared-stream world baseline');process.exit(0);}
assert.equal(digest,fixture.sha256,'all geometry, props, enemies, hazards, loot, palettes, doors and bosses match');
console.log('PASS representation: 2,000 shared-stream world snapshots, 4,557-byte shared grids and seven-byte coordinates');
