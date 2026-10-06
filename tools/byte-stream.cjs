// Roadroller's model with byte-sized rANS digits. Base 253 leaves space for
// NUL, CR and the HTML escape marker, so the large payload needs no escaping.
// The dependency is pinned: reject an unfamiliar generated decoder layout.
const acorn=require('acorn');
module.exports=async(packer,input,original)=>{
 const{Packer,compressWithDefaultModel}=await import('roadroller'),options=packer.options;
 if(options.precision>19)throw Error('Byte stream precision must fit its 28-bit rANS state');
 const prepared=Packer.prepareJs([input],options),values=[...prepared.code].map(c=>c.charCodeAt(0));
 const bytes=(options.precision<=8?1:options.precision<=16?2:4)+(options.modelMaxCount<128?1:options.modelMaxCount<32768?2:4);
 const contexts=options.sparseSelectors.length;
 let contextBits=options.contextBits||Math.floor(Math.log2(options.maxMemoryMB*1048576/contexts/bytes));
 const size=contexts*2**contextBits,unit=10**(Math.floor(Math.log10(size))-1);
 if(!options.contextBits&&Math.ceil(size/unit)*unit*bytes>options.maxMemoryMB*1048576)contextBits--;
 const encoded=compressWithDefaultModel(values,{...options,inBits:values.every(c=>c<128)?7:8,outBits:-253,modelQuotes:!!(options.dynamicModels&1),contextBits});
 const digits=[];let state=encoded.state;
 while(state>0){digits.unshift(state%253);state=Math.floor(state/253);}
 digits.push(...encoded.buf);
 const data=Buffer.from(digits.map(n=>{n++;if(n>=13)n++;if(n>=27)n++;return n;}));

 const outer=acorn.parse(original,{ecmaVersion:2020}).body[0]?.expression;
 const call=outer?.arguments?.[0],ctor=call?.callee,parameters=[];
 if(outer?.callee?.name!=='eval'||ctor?.callee?.name!=='Function')throw Error('Unknown Roadroller decoder');
 for(const a of ctor.arguments){
  if(a.type==='Literal'&&typeof a.value==='string')parameters.push(a.value);
  else if(a.type==='SpreadElement'&&typeof a.argument.value==='string')parameters.push(...a.argument.value);
  else throw Error('Unknown Roadroller parameters');
 }
 let body=parameters.pop();
 const template='(function('+parameters.join(',')+'){'+body+'})';
 const fn=acorn.parse(template,{ecmaVersion:2020}).body[0].expression,head=fn.params[0];
 if(head.type!=='ArrayPattern'||head.elements[0]?.type!=='AssignmentPattern'||fn.params.slice(1).some(p=>p.type!=='Identifier'))throw Error('Unknown Roadroller stream binding');
 const names=[head.elements[0].left.name,...fn.params.slice(1).map(p=>p.name)];
 const args=call.arguments.slice(1).map(a=>original.slice(a.start,a.end));
 const next=body.replace(/;o<[^;]+;o=o\*64\|M\.charCodeAt\(d\+\+\)&63\)/,';o<1<<20;o=o*253+(n=M[d++],n-(n>13)-(n>27)-1))');
 if(next===body)throw Error('Unknown Roadroller normalization loop');
 return{data,code:`eval(((${names.join(',')})=>{${next}})(a,${args.join(',')}))`};
};
