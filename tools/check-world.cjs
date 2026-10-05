const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/room.js','utf8')+'\nlet room,player;const DEV=false;\n'+fs.readFileSync('src/actions.js','utf8')+'\n({init(seed){room=generate(randomFor(seed));player={...room.spawn};resetActions();return {room,objects,player};},W,H,canFit})';
const ui={setAttribute(){}};
const api=vm.runInNewContext(source,{document:{createElement:()=>({getContext:()=>({})})},$:()=>ui});
for(let seed=0;seed<250;seed++){
 const {room,objects,player}=api.init(seed),{W,H}=api;
 assert(api.canFit(room.solid,player.x,player.y),'spawn stays clear');
 for(const o of objects)assert(room.cells[Math.floor(o.y)*W+Math.floor(o.x)],'objects lie on floor');
 const start=Math.floor(player.y)*W+Math.floor(player.x),queue=[start],seen=new Set(queue);
 for(let i=0;i<queue.length;i++)for(const d of [-1,1,-W,W]){const n=queue[i]+d;if(room.solid[n]&&!seen.has(n)){seen.add(n);queue.push(n);}}
 assert.equal(seen.size,room.solid.reduce((a,v)=>a+v,0),'barrels preserve all walking routes');
}
console.log('PASS 250 populated rooms: floor placement, safe spawn, connected walking routes');
