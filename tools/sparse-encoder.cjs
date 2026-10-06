// Build-only counterpart of the sparse decoder. Preserve Roadroller's hashing,
// mixing and arithmetic, storing each visited prediction/count pair in one Map
// entry instead of allocating an entire context address space.
module.exports=async(values,options)=>{
 const {SparseContextModel,LogisticMixModel,DefaultModel,compressWithModel}=await import('roadroller');
 const countBits=Math.ceil(Math.log2(options.modelMaxCount+1)),countScale=2**countBits,countMask=countScale-1;
 const predMask=2**options.precision-1,initial=2**(options.precision-1)*countScale,contextMask=2**options.contextBits-1,shift=29-options.precision;
 if(options.precision+countBits>31)throw Error('Packed encoder state exceeds 31 bits');
 if(options.contextBits<1||options.contextBits>31||2**options.contextBits*options.sparseSelectors.length>=2**32)throw Error('Sparse model keys exceed Uint32');
 const models=options.sparseSelectors.map(selector=>{
  const m=Object.create(SparseContextModel.prototype);
  Object.assign(m,{...options,resourcePool:undefined,selector,recentBytes:Array(32-Math.clz32(selector)).fill(0),sparseContext:0,bitContext:1,table:new Map()});
  m.predict=function(context=0){return (this.table.get((this.sparseContext+context+this.bitContext)&contextMask)??initial)>>>countBits;};
  m.update=function(bit,context=0){
   const key=(this.sparseContext+context+this.bitContext)&contextMask,v=this.table.get(key)??initial;
   let p=v>>>countBits,c=v&countMask;c+=c<options.modelMaxCount;
   const delta=((bit<<options.precision)-p)<<shift;
   p=(p+((delta/(c+1/options.modelRecipBaseCount)|0)>>shift))&predMask;
   this.table.set(key,p*countScale+c);this.bitContext=this.bitContext*2+bit;
  };
  return m;
 });
 const model=new LogisticMixModel(models,options);
 Object.setPrototypeOf(model,DefaultModel.prototype);
 Object.assign(model,{modelQuotes:options.modelQuotes,quote:0,quotesSeen:new Set()});
 const result=compressWithModel(values,model,options);
 return{...result,quotesSeen:model.quotesSeen,contexts:models.reduce((n,m)=>n+m.table.size,0)};
};
