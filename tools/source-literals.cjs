// Share repeated literal values; this produces ordinary JavaScript, not packed code.
const acorn=require('acorn');
module.exports=function pool(code,preferred=[]){
 const ast=acorn.parse(code,{ecmaVersion:2020}),names=new Set(),counts=new Map();
 function walk(n,parent,key){if(!n||typeof n!=='object')return;
 if(n.type==='Identifier')names.add(n.name);
 if(n.type==='Literal'&&(typeof n.value==='string'||typeof n.value==='number'&&Number.isFinite(n.value))&&!(['Property','MethodDefinition','PropertyDefinition'].includes(parent?.type)&&key==='key'&&!parent.computed)&&!(parent?.type==='ExpressionStatement'&&parent.directive)){
 const list=counts.get(n.value)||[];list.push(n);counts.set(n.value,list);
 }
 for(const [k,v] of Object.entries(n)){if(Array.isArray(v))v.forEach(c=>walk(c,n,k));else if(v&&typeof v==='object')walk(v,n,k);}
 }walk(ast);
 const available=preferred.filter(n=>!names.has(n));for(const a of '$_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')for(const b of '$_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'){if(!names.has(a+b))available.push(a+b);}
 const entries=[...counts].map(([value,nodes])=>({value,nodes,gain:nodes.reduce((n,x)=>n+x.end-x.start-1,0)-JSON.stringify(value).length-3})).filter(e=>e.gain>0).sort((a,b)=>b.gain-a.gain),edits=[],bindings=[];
 for(const e of entries){const name=available[0],gain=e.nodes.reduce((n,x)=>n+x.end-x.start-name.length,0)-JSON.stringify(e.value).length-name.length-2;if(gain<=0)continue;available.shift();bindings.push(name+'='+JSON.stringify(e.value));for(const n of e.nodes)edits.push([n.start,n.end,name]);}

 for(const [a,b,name] of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+name+code.slice(b);
 return bindings.length?'(()=>{const '+bindings.join(',')+';'+code+'})();':code;
};
