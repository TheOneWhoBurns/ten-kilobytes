// Release-only source factoring. No code compression or runtime source decoding.
const acorn=require('acorn');
function factor(source,{math=true,geometry=true,paint=true}={}){
 const ast=acorn.parse(source,{ecmaVersion:2020}),edits=[],helpers=[];
 const text=n=>source.slice(n.start,n.end),same=(a,b)=>text(a)===text(b),member=(n,key)=>n?.type==='MemberExpression'&&!n.computed&&n.property.name===key;
 function walk(node){if(!node||typeof node!=='object')return;
  if(paint&&Array.isArray(node.body))for(let i=0;i<node.body.length-1;i++){
   const a=node.body[i],b=node.body[i+1],x=a.expression,y=b.expression;
   if(x?.type==='AssignmentExpression'&&x.operator==='='&&member(x.left,'fillStyle')&&y?.type==='CallExpression'&&member(y.callee,'fillRect')&&same(x.left.object,y.callee.object)&&y.arguments.length===4){
    edits.push([a.start,b.end,`paint(${text(x.left.object)},${text(x.right)},${y.arguments.map(text).join(',')});`]);
   }
  }
  if(geometry&&node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&node.callee.object.name==='Math'&&['hypot','atan2'].includes(node.callee.property.name)&&node.arguments.length===2){
   const [a,b]=node.arguments,angle=node.callee.property.name==='atan2',keys=angle?['y','x']:['x','y'];
   if(a.type==='BinaryExpression'&&b.type==='BinaryExpression'&&a.operator==='-'&&b.operator==='-'&&member(a.left,keys[0])&&member(a.right,keys[0])&&member(b.left,keys[1])&&member(b.right,keys[1])&&same(a.left.object,b.left.object)&&same(a.right.object,b.right.object)){
    edits.push([node.start,node.end,`${angle?'geomBearing':'geomDistance'}(${text(a.left.object)},${text(a.right.object)})`]);return;
   }
  }
  for(const v of Object.values(node)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 }walk(ast);
 // Parent paint rewrites may contain geometry; apply one transformation pass at a time.
 const selected=edits.filter(([a,b])=>!edits.some(([c,d])=>c<=a&&d>=b&&(c!==a||d!==b)));
 for(const [a,b,s] of selected.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+s+source.slice(b);
 if(geometry)helpers.push('function geomDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}','function geomBearing(a,b){return Math.atan2(a.y-b.y,a.x-b.x)}');
 if(paint)helpers.push('function paint(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(x,y,w,h)}');
 source=helpers.join('\n')+'\n'+source;
 if(math){const names=[...new Set([...source.matchAll(/Math\.(\w+)/g)].map(m=>m[1]))];source=source.replace(/Math\.(\w+)/g,(_,n)=>'math_'+n);source='const '+names.map(n=>'math_'+n+'=Math.'+n).join(',')+';\n'+source;}
 return source;
};

function canvas(source,fields=false){
 const methods=['fillRect','drawImage','save','restore','translate','rotate','scale','clearRect'],aliases='fdsrtozc',props=fields?['fillStyle','globalAlpha','globalCompositeOperation','imageSmoothingEnabled']:[],keys='FACM';
 for(let i=0;i<methods.length;i++)source=source.replaceAll('.'+methods[i]+'(','.'+aliases[i]+'(');
 for(let i=0;i<props.length;i++)source=source.replaceAll('.'+props[i],'.'+keys[i]);
 source=source.replace(/(\w+)\.getContext\('2d'\)/g,'graphics($1)');
 const assign=methods.map((name,i)=>`c.${aliases[i]}=c.${name};`).join('');
 const access=fields?`for(const [i,name] of ${JSON.stringify(props)}.entries())Object.defineProperty(c,'${keys}'[i],{configurable:true,get(){return c[name]},set(v){c[name]=v}});`:'';
 return `function graphics(canvas){const c=canvas.getContext('2d');${assign}${access}return c;}\n`+source;
};

function hoist(source){
 const ast=acorn.parse(source,{ecmaVersion:2020}),unsafeNames=new Set(),declarations=ast.body.filter(n=>n.type==='FunctionDeclaration');
 function scan(n,visit){if(!n||typeof n!=='object')return;visit(n);for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(c=>scan(c,visit));else if(v&&typeof v==='object')scan(v,visit);}}
 scan(ast,n=>{if(n.type==='NewExpression'&&n.callee.type==='Identifier')unsafeNames.add(n.callee.name);if(n.type==='AssignmentExpression'&&n.left.type==='Identifier')unsafeNames.add(n.left.name);if(n.type==='UpdateExpression'&&n.argument.type==='Identifier')unsafeNames.add(n.argument.name);if(n.type==='MemberExpression'&&n.object.type==='Identifier'&&n.property.name==='prototype')unsafeNames.add(n.object.name);});
 const functions=declarations.filter(n=>{
  if(n.async||n.generator||unsafeNames.has(n.id.name)||declarations.filter(x=>x.id.name===n.id.name).length>1)return false;
  let safe=true;scan(n.body,x=>{if(['ThisExpression','Super','MetaProperty'].includes(x.type)||x.type==='Identifier'&&x.name==='arguments')safe=false;});return safe;
 });
 if(!functions.length)return source;
 const bindings=functions.map(n=>n.id.name+'=('+n.params.map(p=>source.slice(p.start,p.end)).join(',')+')=>'+source.slice(n.body.start,n.body.end));
 for(const n of functions.reverse())source=source.slice(0,n.start)+source.slice(n.end);
 return 'const '+bindings.join(',')+';\n'+source;
}

module.exports=source=>canvas(factor(hoist(source)),true);
// Individual passes are exposed for measured, non-destructive build experiments.
module.exports.factor=factor;
module.exports.canvas=canvas;
module.exports.hoist=hoist;
