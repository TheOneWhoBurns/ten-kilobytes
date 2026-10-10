const assert=require('node:assert/strict'),read=require('./read-build.cjs'),boot=require('./check-game.cjs');
for(const file of ['dist/index.html','dev/play.html']){
 const html=read(file);assert(!html.includes('<footer'),'bottom strip removed');assert(!html.includes('id="sound"'),'no sound toggle');
 if(file==='dist/index.html')for(const id of ['run-status','pickup-status','attack','interact'])assert(!html.includes('id="'+id+'"'),'release has no '+id+' control');
 const g=boot(file,undefined,true,false);assert(g.starterFrames.length>0,'ready sword is visibly drawn in the real build');assert.equal(g.font,'bold 14px monospace','Canvas font API survives property mangling');assert.equal(g.audioContexts,0,'audio waits for browser activation');assert.equal(g.y+10,126,'sprite feet anchor is the spawn collision center');
 g.key('keydown','d');g.tick(10);g.key('keyup','d');assert(g.x>0,'actual release keyboard moves');assert.equal(g.audioContexts,1,'first key starts audio');assert(g.audioNotes>0,'music and movement sounds are scheduled');
 const x=g.x;g.tick(10);assert.equal(g.x,x,'release stops on keyup');
 g.key('keydown','i');g.tick();assert.equal(g.pose,14,'I begins the blade windup');g.key('keyup','i');g.tick(10);assert.equal(g.pose,17,'blade extends after its windup');g.tick(8);assert.equal(g.pose,14,'attack recovers');
 g.key('keydown','o');g.tick();assert.equal(g.pose,19,'O uses pickup pose');g.key('keyup','o');g.tick(12);
 g.key('keydown','r');g.key('keyup','r');g.tick();assert.equal(g.x,36,'restart restores entrance');assert.equal(g.audioContexts,1,'restart preserves one audio context');
 if(file==='dist/index.html'){
  const s=g.x;g.key('keydown',' ');g.key('keydown','a');g.tick(10);assert(g.x<s,'Space does not stop movement');assert.equal(g.pose,20,'movement still faces left');g.key('keyup','a');g.key('keyup',' ');
  g.key('keydown','d');g.tick(120);g.key('keyup','d');g.tick(40);assert(!g.lettering.includes('"I" -> ATTACK'),'standing on the ring centre descends without interact');
  g.key('keydown','r');g.key('keyup','r');g.tick();
 }
 g.walkEntrance();assert(!g.lettering.includes('"I" -> ATTACK'),'actual release enters first dungeon room');assert(g.randomCalls>0||g.fields.seed,'dungeon is generated');
 const pointer=boot(file,undefined,true,false);pointer.handlers.pointerdown();pointer.tick(2);assert.equal(pointer.audioContexts,1,'click also starts audio');assert(pointer.audioNotes>0,'click starts music');
 console.log('PASS '+file+': no footer/toggle, automatic audio, WASD/I/O, restart, entrance traversal and dungeon entry');
}

// The standalone page owns native window handlers and has no form controls.
{
 const g=boot('dist/index.html',undefined,true,false),keys=[37,38,39,40,65,68,73,79,82,83,87];
 assert.equal(g.handlers.focusin,undefined,'standalone release has no form-focus handler');
 for(let keyCode=0;keyCode<256;keyCode++){let prevented=false;g.key('keydown','?',undefined,{keyCode,preventDefault(){prevented=true;}});assert.equal(prevented,keyCode>32&&keyCode<91,'arrows, letters and digits suppress browser defaults: '+keyCode);assert(!keys.includes(keyCode)||prevented,'game key suppressed: '+keyCode);g.key('keyup','?',undefined,{keyCode});}
 for(const event of ['blur','visibilitychange']){g.key('keydown','d');g.tick(3);g.handlers[event]();const x=g.x;g.tick(3);assert.equal(g.x,x,event+' clears held movement');}
 let prevented=false;g.key('keydown','w',undefined,{ctrlKey:true,preventDefault(){prevented=true;}});assert.equal(prevented,false,'browser modifier shortcuts remain available');g.key('keyup','w');
 console.log('PASS native handlers: all 256 key codes, modifier shortcuts, blur and visibility clearing');
}

for(const file of ['dist/index.html','dev/play.html']){
 const positions=[];
 for(const fps of [30,60,144]){const g=boot(file,undefined,true,false);g.key('keydown','d');g.tick(fps/2,1000/fps);g.key('keyup','d');positions.push(g.x);assert(!g.lettering.some(s=>s.includes('SPACE')),'Space instructions removed');}
 assert.equal(new Set(positions).size,1,'fixed simulation travels equally at 30, 60 and 144 Hz');
 const g=boot(file,undefined,true,false),before=g.x;g.key('keydown','d');g.tick(1,5000);g.key('keyup','d');assert(g.x-before<=12,'a stalled render catches up at most six simulation steps');
}
console.log('PASS fixed simulation: equal travel at 30/60/144 Hz, bounded stalls, no Space controls');

for(const direction of [['d'],['d','s'],['s'],['s','a'],['a'],['a','w'],['w'],['w','d']]){const g=boot('dist/index.html',undefined,true,false);for(const k of direction)g.key('keydown',k);g.tick(2);for(const k of direction)g.key('keyup',k);g.key('keydown','i');g.key('keyup','i');for(let i=0;i<24;i++){g.tick();assert.equal(g.starterFrames.length,1,'one visible sword during ready, pullback, thrust and recovery: '+direction.join('+')+' frame '+i);}}
console.log('PASS actual release sword layers: visible exactly once in all eight directions and every attack phase');
