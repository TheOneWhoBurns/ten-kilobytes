const acorn=require('acorn');
module.exports=source=>{
 const replace=(from,to)=>{if(!source.includes(from))throw Error('Review shared release state: '+from);source=source.replace(from,to);};
 replace('let heldAttack=false;','');
 source=source.replace(/\bheldAttack\b/g,'keys[73]');
 const declaration=acorn.parse(source,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='holdAction');
 if(!declaration)throw Error('Missing held input function');
 source=source.slice(0,declaration.body.start)+'{performAction(type);}'+source.slice(declaration.body.end);
 replace('const k=e.keyCode;keys[k]=1;','const k=e.keyCode;if(!e.repeat||k!==73)keys[k]=1;');
 replace('if(e.keyCode===73)releaseAction(0);','');
 if(source.includes('rng=Math.random;')){
  source=source.replaceAll('Math.random','rng');
  replace('let rng;','let rng=Math.random;');
  replace('rng=rng;','');
  replace('function makeLevel(value,depth){','function makeLevel(depth){');
  source=source.replaceAll('makeLevel(seed,level)','makeLevel(level)');
  replace('function generate(random,doors=[]){','function generate(doors){');
  replace('rng=random;','');
  replace('generate(rng,doors)','generate(doors)');
 }
 for(const [i,type]of ['square','triangle','sine','sawtooth'].entries())source=source.replaceAll("'"+type+"'",String(i));
 replace('o.type=type;',"o.type=['square','triangle','sine','sawtooth'][type];");
 function checkHealth(node,parent,key){
  if(!node||typeof node!=='object')return;
  if(node.type==='IfStatement'&&node.test.name==='DEV'){checkHealth(node.alternate,node,'alternate');return;}
  if(node.type==='ConditionalExpression'&&node.test.name==='DEV'){checkHealth(node.alternate,node,'alternate');return;}
  if(node.type==='Identifier'&&node.name==='maxHealth'&&!((parent.type==='VariableDeclarator'&&key==='id')||(parent.type==='AssignmentExpression'&&key==='left')||(parent.type==='UpdateExpression'&&key==='argument')))throw Error('Maximum health is observed by the release');
  for(const [k,value]of Object.entries(node))if(Array.isArray(value))value.forEach(v=>checkHealth(v,node,k));else if(value&&typeof value==='object')checkHealth(value,node,k);
 }
 checkHealth(acorn.parse(source,{ecmaVersion:2020}));
 replace('maxHealth=2,','');
 source=source.replaceAll('maxHealth=health=2','health=2');
 replace('health++;maxHealth++;','health++;');
 source=source.replaceAll('e.hp>0','e.hp').replaceAll('e.hp<=0','!e.hp').replaceAll('other.hp>0','other.hp').replaceAll('lead.hp<=0','!lead.hp');
 replace('for(const p of [...doors.map(d=>{const [x,y]=directions[d.dir];return{x:d.x-x*2,y:d.y-y*2};})])tunnel(cells,p.x|0,p.y|0,safe);','for(const d of doors){const [x,y]=directions[d.dir];tunnel(cells,(d.x-x*2)|0,(d.y-y*2)|0,safe);}');
 replace('i===0||i===1||i===4||i===5','!(i&2)');
 if(source.includes('const steps=1;')){
  replace('const steps=1;\n  for(let i=0;i<steps&&s.life>0;i++){','if(s.life<=0)continue;{');
  replace('s.dx*dt/steps','s.dx*dt');replace('s.dy*dt/steps','s.dy*dt');
  replace('s.life=0;break;','s.life=0;continue;');
 }
 return require('./share-release-geometry.cjs')(source);
};
module.exports.round=source=>{
 if(/\bM_round\b/.test(source))throw Error('Release rounding alias collides');
 return 'const M_round=Math.round;\n'+source.replaceAll('Math.round','M_round');
};
