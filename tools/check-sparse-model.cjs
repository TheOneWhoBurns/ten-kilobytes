const assert=require('node:assert/strict'),vm=require('node:vm');
const {roller}=require('./pack-release.cjs'),{contextCount}=require('./sparse-model.cjs');
(async()=>{
 const {DefaultModel,compressWithDefaultModel}=await import('roadroller');
 let seed=93;
 const values=Array.from({length:512},()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed&255;});
 for(const inBits of [7,8])for(const modelQuotes of [false,true]){
  const input=values.map(n=>n&((1<<inBits)-1)),options={inBits,modelQuotes,contextBits:14,precision:16,modelMaxCount:4,modelRecipBaseCount:32,recipLearningRate:1260,sparseSelectors:[0,1,3,23]},seen=new Set(),model=new DefaultModel(options);
  model.models.forEach((m,i)=>{
   const predict=m.predict;
   m.predict=function(context=0){seen.add(((this.sparseContext+context+this.bitContext)&16383)*model.models.length+i);return predict.call(this,context);};
  });
  for(const n of input){for(let bit=inBits-1;bit>=0;bit--){model.predict();model.update(n>>bit&1);}model.flushByte(n,inBits);}
  assert.equal(contextCount(input,options),seen.size,'allocation trace agrees with the encoder, including quotes and bit prefixes');
  model.release();
 }
 const value=String.fromCharCode(...values),source='<html><script>result='+JSON.stringify(value)+'</script></html>';
 for(const sparseSelectors of [[0,1,3,23],[0,1,3,(1<<23)|1]])for(const precision of [8,16,17])for(const dynamicModels of [0,1]){
  const options={...require('./packing-options.json'),maxMemoryMB:2,contextBits:16,precision,dynamicModels,sparseSelectors};
  const dense=await roller(source,{...options,sparseModel:false},0,true),sparse=await roller(source,{...options,sparseModel:true},0,true);
  assert.deepEqual(sparse.data,dense.data,'sparse lookup leaves the encoded stream unchanged');
  let before,after;
  vm.runInNewContext(dense.code,{a:Array.from(dense.data),eval:s=>before=s},{timeout:5000});
  vm.runInNewContext(sparse.code,{a:Array.from(sparse.data),eval:s=>after=s},{timeout:5000});
  assert.equal(after,before,'dense and sparse decoders recover the same program');
  assert(sparse.memoryMB<dense.memoryMB,'small inputs allocate only the contexts they visit');
 }
 for(const precision of [8,16,17])for(const inBits of [7,8])for(const modelQuotes of [false,true]){
  const input=values.map(n=>n&((1<<inBits)-1)),options={...require('./packing-options.json'),contextBits:16,precision,inBits,outBits:-253,modelQuotes};
  const dense=compressWithDefaultModel(input,options),sparse=await require('./sparse-encoder.cjs')(input,options);
  assert.equal(sparse.state,dense.state);assert.deepEqual(sparse.buf,dense.buf,'sparse encoder emits exactly the dense encoder stream');
  assert.equal(sparse.contexts,contextCount(input,options),'encoder and decoder agree on visited contexts');
 }
 assert.throws(()=>contextCount([1],{sparseSelectors:[0,1],contextBits:31,inBits:7}),/Uint32/);
 await assert.rejects(roller(source,require('./packing-options.json')),/byte stream/,'unsupported envelopes cannot silently ship the dense model');
 console.log('PASS sparse models: independent context traces, 7/8-bit input, quote modes, three precisions, identical streams and programs');
})().catch(e=>{console.error(e);process.exitCode=1;});
