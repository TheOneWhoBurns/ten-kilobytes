// Atlas positions are known at build time. Resolve reads before minification so
// zero offsets and unused registry fields disappear from the release.
const acorn=require('acorn');
module.exports=(source,values)=>{
 const ast=acorn.parse(source,{ecmaVersion:2020}),edits=[];let declarations=0;
 function walk(n,parent,key){
  if(!n||typeof n!=='object')return;
  if(n.type==='Identifier'&&n.name==='assets'){
   if(parent?.type==='VariableDeclarator'&&key==='id'){if(++declarations>1)throw Error('Shadowed asset registry');}
   else if(parent?.type!=='MemberExpression'||key!=='object')throw Error('Asset registry must only be read directly');
  }
  if(n.type==='MemberExpression'&&n.object.name==='assets'){
   const name=n.computed?n.property.value:n.property.name;
   if(typeof name!=='string'||!Object.hasOwn(values,name))throw Error('Unknown or dynamic asset reference');
   if(parent?.type==='AssignmentExpression'&&key==='left'||parent?.type==='UpdateExpression'||parent?.type==='UnaryExpression'&&parent.operator==='delete')throw Error('Asset constants cannot be mutated');
   edits.push([n.start,n.end,'('+JSON.stringify(values[name])+')']);
  }
  for(const[k,v]of Object.entries(n)){if(Array.isArray(v))v.forEach(c=>walk(c,n,k));else if(v&&typeof v==='object')walk(v,n,k);}
 }
 walk(ast);
 for(const[a,b,s]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+s+source.slice(b);
 return source;
};
