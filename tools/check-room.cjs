const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const api=vm.runInNewContext(fs.readFileSync('src/room.js','utf8')+';({generate,canFit,movePlayer,W,H})');
const {generate,canFit,movePlayer,W,H}=api,layouts=new Set();
for(let seed=0;seed<2000;seed++){
  const {cells,features,spawn}=generate(seed),key=Array.from(cells).join('');layouts.add(key);
  assert.equal(key,Array.from(generate(seed).cells).join(''),'seed reproducibility');
  assert(canFit(cells,spawn.x,spawn.y),'safe spawn');
  assert(canFit(cells,spawn.x+3,spawn.y),'reachable lantern placement');
  assert.equal(Array.from(features).join(''),Array.from(generate(seed).features).join(''),'feature determinism');
  for(let n=0;n<cells.length;n++)if(features[n])assert.equal(cells[n],0,'feature collision agrees with appearance');
  const queue=[Math.floor(spawn.y)*W+Math.floor(spawn.x)],seen=new Set(queue);
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%W,y=Math.floor(n/W);
    for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const next=yy*W+xx;
      if(xx>=0&&xx<W&&yy>=0&&yy<H&&cells[next]&&!seen.has(next)){seen.add(next);queue.push(next);}
    }
  }
  assert.equal(seen.size,cells.reduce((a,b)=>a+b,0),'all floor reachable');
  assert(seen.size>100,'usable room area');
  for(let x=0;x<W;x++)assert(!cells[x]&&!cells[(H-1)*W+x],'sealed horizontal border');
  for(let y=0;y<H;y++)assert(!cells[y*W]&&!cells[y*W+W-1],'sealed vertical border');
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
    const p={...spawn};for(let frame=0;frame<180;frame++){
      movePlayer(cells,p,dx,dy,1/60);assert(canFit(cells,p.x,p.y),'no wall penetration');
    }
  }
}
assert(layouts.size>1900,'generated variety');
const room=generate('physics'),a={...room.spawn},b={...room.spawn};
movePlayer(room.cells,a,1,0,.02);movePlayer(room.cells,b,1,1,.02);
assert(Math.abs(Math.hypot(a.x-room.spawn.x,a.y-room.spawn.y)-Math.hypot(b.x-room.spawn.x,b.y-room.spawn.y))<1e-9,'normalized diagonal speed');
const p={...room.spawn};movePlayer(room.cells,p,1,0,10);assert(p.x-room.spawn.x<=.251,'long-frame clamp');
console.log('PASS: 2,000 seeds; determinism, connectivity, borders, movement collision, diagonal speed and long frames.');
