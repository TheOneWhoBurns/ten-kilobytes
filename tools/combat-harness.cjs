const fs=require('fs'),vm=require('vm'),data=require('./content-data.cjs');
module.exports=function boot(specialize=false,release=false){
 const catalog=data.load(),compiled=data.compile(catalog,{specialize}),ctx={fillText(){},fillRect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},arc(){},stroke(){}};
 const nodes=new Map(),document={createElement:()=>({getContext:()=>ctx}),getElementById:id=>{if(!nodes.has(id))nodes.set(id,{getContext:()=>ctx,setAttribute(){},style:{}});return nodes.get(id);}};
 let runtime=['room','actions','world','combat'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
 if(release)runtime=require('./specialize-release.cjs')(runtime,{nativeRandom:false});
 const api=vm.runInNewContext('const DEV=false,assets={actor:400,pantry:0,weapon:24,weaponCount:44,enemies:68,enemyCount:246,bosses:314,armors:318,armorCount:13,effects:331,warning:337,flame:339,letters:""};'+compiled.source+require('./landmark-data.cjs')()+compiled.transform(runtime)+`;({
 init(){seed=1;reset();level=1;world=makeLevel(seed,level);chamber=0;enterRoom();room.cells.fill(0);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)room.cells[y*W+x]=1;room.props=[];room.doors=[];room.enemies=[];room.reward=-1;player={x:15.5,y:10.5};health=maxHealth=20;hurt=0;return this;},
 enemy(kind,x,y,extra={}){const rule=enemyRules[kind],e={kind,rule,boss:false,x,y,hp:1,angle:0,phase:0,wait:0,pattern:0,cycle:0,form:rule[E_ART],...extra};room.enemies.push(e);return e;},
 aim(a){facing=a;${release?'':'actionStates.attack.direction=a;'}},
 weapon(n,art){takeLoot({kind:3,value:n,art});},
 attack:worldAttack,press(){performAction('attack');},
 tick(n,dt=.01){for(let i=0;i<n;i++){tickActions(dt);tickWorld(dt);}},combat(n,dt=.01){for(let i=0;i<n;i++)tickCombat(dt);},
 hit:hitEnemy,fire,cast,take:takeLoot,hurt:hurtPlayer,draw:drawCombat,reset,enter:enterRoom,
 position(x,y){player.x=x;player.y=y;},wall(x,y){room.cells[y*W+x]=0;},
 health(n){health=maxHealth=n;hurt=0;},cooldown(){return ${release?'cooldown':'actionStates.attack.cooldown'};},
 get state(){return {room,world,player,health,maxHealth,shots,fields:fields.map(f=>new Proxy(f,{get(t,k){return k==='cells'?new Map(Array.from({length:W*H},(_,n)=>[n,spellCell(t,n)]).filter(p=>p[1]>=0)):t[k]}})),blows,dash,gaze,weapon,weaponArt,level,chamber};},
 frameSprites(){const out=[],old=tile;tile=(...args)=>out.push(args[1]);drawCombat();tile=old;return out;},
 nextFloor(){level++;world=makeLevel(seed,level);chamber=0;enterRoom();},
 })`,require('./canvas-dom.cjs')({atob,document,crypto:require('crypto').webcrypto}));
 api.ids=Object.fromEntries(catalog.enemies.map((e,i)=>[e.id,i]));return api;
};
