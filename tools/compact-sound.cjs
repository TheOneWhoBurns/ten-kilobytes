const acorn=require('acorn');
module.exports=source=>{
 const ast=acorn.parse(source,{ecmaVersion:2020}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='sound');
 if(!fn)return source;
 let table,selector;
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='MemberExpression'&&n.object.type==='ArrayExpression'){if(n.property.name==='kind')table=n.object;if(n.property.name==='wave')selector=n;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 walk(fn);
 if(!table||!selector||source.slice(selector.start,selector.end)!=='[0,1,3][wave]')throw Error('Review sound waveform representation');
 const edits=[[selector.start,selector.end,'wave']];
 for(const group of table.elements)for(const note of group.elements){const wave=note.elements[2];if(wave.type!=='Literal'||![0,1,2].includes(wave.value))throw Error('Review sound waveform');if(wave.value===2)edits.push([wave.start,wave.end,'3']);}
 for(const [a,b,text]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+text+source.slice(b);
 return source;
};
