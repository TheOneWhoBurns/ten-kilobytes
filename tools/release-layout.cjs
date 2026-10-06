// Function declarations are hoisted by JavaScript. Place them in a measured
// compression order after initialization; keep executable statements in order.
// This lets frequently used state bindings receive short names before helpers.
const acorn=require('acorn'),order=require('./release-layout.json');
module.exports=(source,sequence=order)=>{
 const ast=acorn.parse(source,{ecmaVersion:2020}),functions=ast.body.filter(n=>n.type==='FunctionDeclaration');
 if(new Set(functions.map(n=>n.id.name)).size!==functions.length)throw Error('Duplicate top-level function name');
 const rank=name=>sequence.includes(name)?sequence.indexOf(name):sequence.length;
 const declarations=[...functions].sort((a,b)=>rank(a.id.name)-rank(b.id.name)).map(n=>source.slice(n.start,n.end));
 for(const n of functions.reverse())source=source.slice(0,n.start)+source.slice(n.end);
 return source+'\n'+declarations.join('\n');
};
