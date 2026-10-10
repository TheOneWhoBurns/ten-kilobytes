const acorn=require('acorn');
module.exports=(source,catalog)=>{
 if(!require('./specialize-weapons.cjs').eligible(catalog))return source;
 const replacements=[
 ['moveHero','function moveHero(dx,dy,dt,speed=10,collision=true){','function moveHero(dx,dy,dt){let speed=10;const collision=true;',3],
 ['cast','function cast(p,a,shape,friendly=false,warn=.8){','function cast(p,a,shape){const warn=.8;',3],
 ['tile','function tile(c,index,x,y,size=12,source=12){','function tile(c,index,x,y,size=12){const source=12;',5],
 ['writeTiles',"function writeTiles(text,y,font='bold 14px monospace'){","function writeTiles(text,y){const font='bold 14px monospace';",2],
 ['fillShape','function fillShape(cells,a,b,p=2,merge=1){','function fillShape(cells,a,b,p=2){const merge=1;',4],
 ['movePlayer','function movePlayer(cells,p,dx,dy,dt,speed=5){','function movePlayer(cells,p,dx,dy,dt,speed){',6,6],
 ['volley','function volley(p,a,count,speed,damage,life,friendly=false,flags=0,spread=.23,curve=0,gap=-1){','function volley(p,a,count,speed,damage,life,friendly,flags,spread,curve,gap){',11,11],
 ['fire','function fire(p,a,speed,damage,life,friendly=false,disc=false){','function fire(p,a,speed,damage,life){',7,5],
 ['tunnel','function tunnel(cells,x,y,safe=new Uint8Array(W*H)){','function tunnel(cells,x,y,safe){',4,4],
 ['entranceLayer','function entranceLayer(index,size,angle=0){','function entranceLayer(index,size,angle){',3,3],
 ['worldColor','function worldColor(light=65,offset=0){','function worldColor(light,offset=0){',2,1],
 ['reset','function reset(fresh=false){','function reset(fresh){',1]
 ];
 const limits=new Map(replacements.map(([name,,,max,min=0])=>[name,{min,max}]));
 const walk=n=>{
  if(!n||typeof n!=='object')return;
  if(n.type==='IfStatement'&&n.test.type==='Identifier'&&n.test.name==='DEV'){walk(n.alternate);return;}
  if(n.type==='ConditionalExpression'&&n.test.type==='Identifier'&&n.test.name==='DEV'){walk(n.alternate);return;}
  if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&limits.has(n.callee.name)){
   const {min,max}=limits.get(n.callee.name);
   if(n.arguments.some(a=>a.type==='SpreadElement')||n.arguments.length<min||n.arguments.length>max)throw Error('Review release arguments for '+n.callee.name);
  }
  for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);
 };
 walk(acorn.parse(source,{ecmaVersion:2020}));
 for(const [name,from,to]of replacements){if(!source.includes(from))throw Error('Review release signature for '+name);source=source.replace(from,to);}
 source=source.replace('const length=Math.hypot(dx,dy)||1,k=hazardAt(player)===ICE?Math.min(1,dt*(dx||dy?.8:.35)):1;','const length=Math.hypot(dx,dy)||1,k=hazardAt(player)===ICE?dt*(dx||dy?.8:.35):1;').replace('dt=Math.min(dt,.05);if(dt<=0)return;','if(dt<=0)return;').replace('speed*Math.min(dt,.05)','speed*dt');
 source=source.replaceAll("'attack'",'0').replaceAll("'interact'",'1');
 if(!source.includes('const W=31,H=21;'))throw Error('Review room dimensions');
 source=source.replace('const W=31,H=21;','');
 const edits=[];
 const dimensions=(n,parent,key)=>{
  if(!n||typeof n!=='object')return;
  if(n.type==='Identifier'&&['W','H'].includes(n.name)){
   if(parent?.type==='MemberExpression'&&key==='property'&&!parent.computed)return;
   if(parent?.type==='Property'&&key==='key'&&!parent.computed){if(parent.shorthand)throw Error('Review shorthand dimensions');return;}
   if(key==='id'||key==='params')throw Error('Shadowed room dimensions');
   edits.push([n.start,n.end,n.name==='W'?'31':'21']);
  }
  for(const [k,v]of Object.entries(n))if(Array.isArray(v))v.forEach(c=>dimensions(c,n,k));else if(v&&typeof v==='object')dimensions(v,n,k);
 };
 dimensions(acorn.parse(source,{ecmaVersion:2020}));
 for(const [start,end,value]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+value+source.slice(end);
 return require('./inline-single-use.cjs')(require('./share-release-state.cjs')(source));
};
