const acorn=require('acorn');
function inline(source,name){
 const ast=acorn.parse(source,{ecmaVersion:2020}),declaration=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name),calls=[];
 if(!declaration)throw Error('Missing single-use function '+name);
 function walk(node){
  if(!node||typeof node!=='object'||node===declaration)return;
  if(node.type==='IfStatement'&&node.test.name==='DEV'){walk(node.alternate);return;}
  if(node.type==='ExpressionStatement'&&node.expression.type==='CallExpression'&&node.expression.callee.name===name)calls.push(node);
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
 }
 walk(ast);
 if(calls.length!==1)throw Error('Review single-use function '+name+': '+calls.length+' calls');
 let body=source.slice(declaration.body.start+1,declaration.body.end-1);
 if(name==='drawTransition'){
  if(!body.includes('if(!reveal&&!travel)return;'))throw Error('Review transition return');
  body=body.replace('if(!reveal&&!travel)return;','if(reveal||travel){')+'}';
 }
 const checked=acorn.parse('{'+body+'}',{ecmaVersion:2020,allowReturnOutsideFunction:true});
 function returns(node){
  if(!node||typeof node!=='object'||['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type))return;
  if(node.type==='ReturnStatement')throw Error('Review early return in '+name);
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(returns);else if(value&&typeof value==='object')returns(value);
 }
 returns(checked);
 const args=calls[0].expression.arguments;
 if(args.length!==declaration.params.length||declaration.params.some(p=>p.type!=='Identifier'))throw Error('Review arguments for '+name);
 const bindings=declaration.params.map((p,i)=>'const '+p.name+'='+source.slice(args[i].start,args[i].end)+';').join('');
 const edits=[[declaration.start,declaration.end,''],[calls[0].start,calls[0].end,'{'+bindings+body+'}']];
 for(const [start,end,value]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+value+source.slice(end);
 return source;
}
module.exports=source=>['simulate','drawWorld','drawCombat','drawGate','drawLoot','drawTransition','collectUranium'].reduce(inline,source);
