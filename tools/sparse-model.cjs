// Keep the encoder's context identities, but store only visited contexts in the
// shipped decoder. Linear probing resolves collisions without changing a model.
const acorn=require('acorn'),syntax=require('./syntax-context.cjs');
function contextCount(values,{sparseSelectors,contextBits,inBits,modelQuotes,syntaxSelectors=[]}){
 const visited=new Set(),mask=2**contextBits-1;
 if(2**contextBits*sparseSelectors.length>=2**32)throw Error('Sparse model keys exceed Uint32');
 let quote=0;
 for(let e=0;e<values.length;e++){
  const hashes=sparseSelectors.map((selector,model)=>{
   let hash=0;
   for(let i=30;i>=0;i--)if(selector>>>i&1)hash=(hash+(model>=sparseSelectors.length-syntaxSelectors.length?syntax.normalize(values[e-i-1]||0):values[e-i-1]||0))*997|0;
   return hash;
  });
  let prefix=1;
  for(let bit=inBits-1;bit>=0;bit--){
   hashes.forEach((hash,i)=>visited.add(((hash+prefix+(quote?129:0))&mask)*hashes.length+i));
   prefix=prefix*2+(values[e]>>bit&1);
  }
  if(modelQuotes){if(quote===values[e])quote=0;else if(!quote&&[34,39,96].includes(values[e]))quote=values[e];}
 }
 return visited.size;
}
module.exports=(code,values,options)=>{
 // Size the table to visited contexts, with 15% spare slots instead of power-of-two rounding.
 const count=contextCount(values,options),capacity=Math.ceil(Math.max(1,count/.85)/1024)*1024;
 const call=acorn.parse(code,{ecmaVersion:2020}).body[0]?.expression?.arguments?.[0],fn=call?.callee;
 if(fn?.type!=='ArrowFunctionExpression'||fn.body.type!=='BlockStatement')throw Error('Unknown sparse decoder function');
 const edits=[];let bytes=4,predictions=0,counts=0,selector;
 for(const arg of call.arguments){
  const filled=arg.type==='CallExpression'&&arg.callee.property?.name==='fill',ctor=filled?arg.callee.object:arg;
  if(ctor.type!=='NewExpression'||!/^Uint(8|16|32)Array$/.test(ctor.callee.name))continue;
  if(ctor.arguments.length!==1)throw Error('Unknown sparse model allocation');
  bytes+=+ctor.callee.name.match(/\d+/)[0]/8;
  if(filled)predictions++;else counts++;
  edits.push([ctor.arguments[0].start,ctor.arguments[0].end,String(capacity)]);
 }
 function walk(n){
  if(!n||typeof n!=='object')return;
  if(n.type==='AssignmentExpression'&&n.right.type==='CallExpression'&&n.right.callee.property?.name==='map'){
   const input=n.right.callee.object,text=input.type==='CallExpression'&&input.callee.property?.name==='split'&&input.callee.object.type==='Literal';
   const rows=input.type==='ArrayExpression'&&input.elements.every(r=>r?.type==='ArrayExpression'&&r.elements.every(v=>v?.type==='Literal'&&Number.isInteger(v.value)));
   if(text||rows){if(selector)throw Error('Ambiguous sparse model selectors');selector=n.right;}
  }
  for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else walk(v);
 }walk(fn.body);
 if(predictions!==1||counts!==1||!selector||fn.params.some(p=>p.name==='K'))throw Error('Unknown sparse model layout');
 const arrow=selector.arguments[0],limit=call.arguments.findIndex(n=>n.type==='BinaryExpression'&&n.operator==='<<'&&n.left.value===1&&n.right.value===options.precision+1);
 if(arrow.type!=='ArrowFunctionExpression'||arrow.body.type==='BlockStatement'||arrow.params.length!==2||arrow.params.some(p=>p.type!=='Identifier')||limit<0)throw Error('Unknown sparse selector callback');
 const masks=[];
 function findMask(n){if(!n||typeof n!=='object')return;if(n.type==='BinaryExpression'&&n.operator==='&')masks.push(n.left);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(findMask);else findMask(v);}
 findMask(arrow.body);if(masks.length!==1)throw Error('Unknown sparse context mask');
 const power=options.contextBits-options.precision-1,h=fn.params[limit].name,contextMask=h+(power>0?'*'+2**power:power<0?'/'+2**-power:'')+'-1';
 const m=masks[0];let expression=code.slice(arrow.body.start,m.start)+contextMask+code.slice(m.end,arrow.body.end),[key,slot]=arrow.params.map(p=>p.name);
 if(options.syntaxSelectors?.length){
  const input=selector.callee.object,rows=options.sparseSelectors.map((mask,i)=>{const row=[];for(let k=30;k>=0;k--)if(mask>>>k&1)row.push((k+1)*(i>=options.sparseSelectors.length-options.syntaxSelectors.length?-1:1));return row;});
  edits.push([input.start,input.end,input.type==='ArrayExpression'?JSON.stringify(rows):'('+code.slice(input.arguments[0].start,input.arguments[0].end)+','+JSON.stringify(rows)+')']);
  let read,scope;
  function findRead(n,fn){
   if(!n||typeof n!=='object')return;
   if(n.type==='ArrowFunctionExpression')fn=n;
   if(n.type==='BinaryExpression'&&n.operator==='|'&&n.right.value===0&&n.left.type==='MemberExpression'&&n.left.object.name===call.callee.params[1].name&&n.left.property.type==='BinaryExpression'&&n.left.property.operator==='-'){if(read)throw Error('Ambiguous syntax context read');read=n;scope=fn;}
   for(const v of Object.values(n))if(Array.isArray(v))v.forEach(c=>findRead(c,fn));else findRead(v,fn);
  }
  findRead(arrow.body,arrow);
  if(!read||scope.params.length!==2||scope.params.some(p=>p.type!=='Identifier'))throw Error('Unknown syntax context read');
  const scratch=scope.params[1].name,member=read.left,offset=member.property.right.name;
  if(!offset||new RegExp('\\b'+scratch+'\\b').test(code.slice(scope.body.start,scope.body.end)))throw Error('Syntax context scratch is used');
  const replacement='('+scratch+'='+member.object.name+'['+member.property.left.name+'-Math.abs('+offset+')]|0,'+offset+'<0?('+syntax.expression(scratch)+'):'+scratch+')';
  expression=expression.replace(code.slice(read.start,read.end),replacement);
 }
 // Reuse callback parameters after the original context expression is evaluated.
 // Returning its hash-table slot avoids a second map and temporary array per bit.
 edits.push([arrow.body.start,arrow.body.end,`{${key}=(${expression})+1;${slot}=${key}%${capacity};while(K[${slot}]&&K[${slot}]-${key})${slot}=(${slot}+1)%${capacity};K[${slot}]=${key};return ${slot}}`]);
 edits.push([fn.body.start+1,fn.body.start+1,`let K=new Uint32Array(${capacity});`]);
 for(const [a,b,text]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+text+code.slice(b);
 return{code,memoryMB:capacity*bytes/1048576,contexts:count,capacity};
};
module.exports.contextCount=contextCount;
