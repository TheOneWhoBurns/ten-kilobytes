const assert=require('node:assert/strict'),fs=require('node:fs'),boot=require('./check-game.cjs'),{unzipSync}=require('fflate');
(async()=>{
 const archive=unzipSync(fs.readFileSync('dist/hipocrene-itch.zip'));assert.deepEqual(Object.keys(archive).sort(),['g','index.html']);assert(Buffer.from(archive['g']).equals(fs.readFileSync('dist/itch/g')));
 const read=require('./read-build.cjs'),vm=require('node:vm');
 assert(Buffer.from(archive['index.html']).equals(fs.readFileSync('dist/itch/index.html')));
 const loaded=await new Promise((resolve,reject)=>{
  const scope={Response,DecompressionStream,Uint8Array,fetch:url=>{assert.equal(url,'g');return Promise.resolve(new Response(archive['g']));}};
  scope.eval=code=>{try{vm.runInNewContext(code,{a:scope.a,TextDecoder,document:{close(){}},eval:program=>resolve(read.unpackProgram(program,0))},{timeout:10000});}catch(error){reject(error);}};
  vm.runInNewContext(Buffer.from(archive['index.html']).toString().match(/<script>([\s\S]*)<\/script>/)[1],scope).catch(reject);
 });
 assert.equal(loaded,read('dist/itch/g'),'native stream loader restores the complete game');
 const g=boot('dist/itch/g',undefined,false,false,4);assert.equal(g.requests.length,0);g.goDungeon();assert.equal(g.requests.length,0);
 for(let i=0;i<3600&&g.pose!==38;i++)g.tick();assert.equal(g.pose,38);assert(g.lettering.some(x=>/^SCORE/.test(x)),'death screen retains the score');g.tick(70);g.key('keydown','q');g.key('keyup','q');g.tick();
 assert.equal(g.requests.length,0,'playing, dying and restarting never submit scores');assert.equal(g.storage.size,0,'game does not store a leaderboard identity');assert(!g.lettering.some(x=>/^SCORE/.test(x)),'restart restores the game');
 console.log('PASS packed itch game: two-file archive, native binary loader, death score, restart and no leaderboard requests or identity');
})().catch(e=>{console.error(e);process.exitCode=1;});
