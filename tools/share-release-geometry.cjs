const acorn=require('acorn');
module.exports=source=>{
 const ast=acorn.parse(source,{ecmaVersion:2020}),shape=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='blowShape'),hit=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='hitBlow');
 if(!shape||!hit)throw Error('Missing blade collision functions');
 const [variables,result]=shape.body.body;
 if(shape.body.body.length!==2||variables.type!=='VariableDeclaration'||result.type!=='ReturnStatement'||result.argument.type!=='ObjectExpression')throw Error('Review blade shape representation');
 const properties=result.argument.properties;
 if(properties.map(p=>p.key.name).join(',')!=='x,y,a,start,end,radius,width'||properties.some(p=>p.computed||p.shorthand||p.type!=='Property')||properties.at(-1).value.value!==0)throw Error('Review blade shape fields');
 let bindings=source.slice(variables.start,variables.end-1);
 if(!bindings.includes('starterMotion(b,age)'))throw Error('Review blade motion arguments');
 bindings=bindings.replace('starterMotion(b,age)','starterMotion(b,previousAge+(b.age-previousAge))')+','+properties.slice(0,-1).map(p=>p.key.name+'='+source.slice(p.value.start,p.value.end)).join(',')+';';
 const original='const {x,y,a,start,end,radius}=blowShape(b,previousAge+(b.age-previousAge)),c=Math.cos(a),s=Math.sin(a);',body=source.slice(hit.body.start,hit.body.end);
 if(!body.includes(original))throw Error('Review blade collision call');
 return source.slice(0,hit.body.start)+body.replace(original,bindings)+source.slice(hit.body.end);
};
