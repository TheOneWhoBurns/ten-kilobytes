const acorn=require('acorn');
function bits(bytes,title){
 const out=Buffer.from(bytes),glyphs=bytes.subarray(title*18,(title+9)*18),positions=[0,8,16,26,36,46,58,70,82];
 out.fill(0,title*18,(title+9)*18);
 for(let t=0;t<9;t++)for(let p=0;p<144;p++)if(glyphs[t*18+(p>>3)]&128>>(p&7)){
  const x=positions[t]+p%12,q=(p/12|0)*12+x%12,slot=title+(x/12|0);
  out[slot*18+(q>>3)]|=128>>(q&7);
 }
 return out;
}
function source(s,catalog,flags=63){
 const replace=(a,b)=>{if(!s.includes(a))throw Error('Review compact scene: '+a);s=s.replace(a,b);};
 if(flags&1)replace('for(let i=0;i<9;i++)tile(ctx,assets.title+i,[92,108,124,144,164,184,208,232,256][i],30,24);','ctx.drawImage(atlas,assets.title*12,0,108,12,92,30,216,24);');
 if(flags&2&&require('./environment-data.cjs').constants.FLOOR_COUNT===1){
  replace('r.floorTile=pick(FLOOR_COUNT);','rng();');replace('floorTile:0,','');s=s.replaceAll('room.floorTile','0');
 }
 if(flags&4){
  const fn=acorn.parse(s,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='growHazards');
  if(!fn)throw Error('Missing hazard generator');
  const body=s.slice(fn.body.start,fn.body.end).replaceAll('r.cells','cells').replaceAll('r.hazard','hazard');
  s=s.slice(0,fn.start)+s.slice(fn.end);
  replace('r.hazard=[0,NEEDLE,ICE,FIRE][pick(4)];','const hazard=[0,NEEDLE,ICE,FIRE][pick(4)];');replace('if(r.hazard)growHazards(r,available);','if(hazard)'+body);
 }
 if(flags&8)replace('const gate=i===result.boss?108+(doors.some(d=>d.dir===3)?doors[0].x<15.5?4:-4:0):325;r.gate=tilePoint(gate+(boss?(exit===1?0:31+!exit):0));\n  if(i===result.boss)for(let x=-2;x<=2;x++){if(x*x<4)cells[gate-31+x]=0;cells[gate+x]=cells[gate+31+x]=safe[gate+x]=safe[gate+31+x]=1;if(exit>1)cells[gate+2*31+x]=safe[gate+2*31+x]=1;}', 'if(boss){const gate=108+(doors.some(d=>d.dir===3)?doors[0].x<15.5?4:-4:0);r.gate=tilePoint(gate+(exit===1?0:31+!exit));for(let x=-2;x<=2;x++){if(x*x<4)cells[gate-31+x]=0;cells[gate+x]=cells[gate+31+x]=safe[gate+x]=safe[gate+31+x]=1;if(exit>1)cells[gate+2*31+x]=safe[gate+2*31+x]=1;}}');
 if(flags&16){replace('boss:5,','');s=s.replaceAll('world.boss','5').replaceAll('result.boss','5');}
 if(flags&32&&catalog.bosses.length&&catalog.enemies.every(e=>!(e.hp??0))&&catalog.bosses.every(e=>e.hp>0)){
  replace('e={...spot(),boss,rule,pattern:','e={...spot(),rule,pattern:');s=s.replace(/\be\.boss\b/g,'e.rule[E_HP]');replace('e.hp=boss?(rule[E_HP]||5):1','e.hp=rule[E_HP]||1');
 }
 replace('const sources=objects.filter(o=>o.kind===5);','');
 replace('sources.some(p=>geomDistance(e,p)<3)','nearRadiation(e)');
 replace('sources.some(p=>geomDistance(player,p)<3)','nearRadiation(player)');
 s='function nearRadiation(p){return objects.some(o=>o.kind===5&&geomDistance(p,o)<3);}\n'+s;
 if(catalog.armorSprites.length===1&&catalog.weapons.length===1){
  replace('if(o.kind===3||o.kind===4)','if(o.kind===4)');replace('if(o.kind===4){health++;}','health++;');
  replace(',kind:1,value:0',',kind:1');replace(',kind:5,value:0',',kind:5');replace(',kind:4,value:room.reward',',kind:4');s=s.replace(/\bo\.value\b/g,'0');
 }
 replace('routes=new Map()','routes={}');s=s.replaceAll('routes.clear()','routes={}');replace('routes.get(goal)','routes[goal]');replace('routes.set(goal,costs)','routes[goal]=costs');
 replace('!!(p[3]&1)!==back','(p[3]&1)!==+back');
 replace('pose===1?0:pose===2?1:2','(pose+2)%3');
 const congas=[...catalog.enemies,...catalog.bosses].filter(e=>e.attack.mode==='conga');
 if(congas.every(e=>(e.attack.count??7)+(e.attack.countStep??2)<=9))replace('directions.filter(([x,y])=>Array.from({length:count},(_,j)=>325+x*8+y*5*31+(y?1:31)*(j-(count>>1))).every(n=>doors.every(d=>geomDistance(tilePoint(n),d)>=6)))','directions.filter(([x,y])=>x||doors.every(d=>d.dir!==3-(y>0)||d.x+(count>>1)<12||d.x+(count>>1)>18+count))');
 replace("sky=assets.sky+(setup.astralBody==='moon'?4:setup.astralBody==='sun'?0:rng()<.5?0:4);starterMoon=+(sky===assets.sky+4);", "sky=assets.sky+(starterMoon=setup.astralBody==='moon'?4:setup.astralBody==='sun'?0:rng()<.5?0:4);");
 replace('sky===assets.sky?setup.sunSize:setup.moonSize','starterMoon?setup.moonSize:setup.sunSize');
 replace('assets.starter+starterMoon*2','assets.starter+starterMoon/2');
 return require('./compact-encounters.cjs')(require('./compact-spells.cjs')(s));
}
module.exports={bits,source};
