// Build-only ordering: keep each behavior's exact sprite pool contiguous, placing
// similar masks together. Shared rows receive extra weight for the tile-stride
// compression context. Animated/theme-strided and overlapping pools stay fixed.
module.exports=(catalog,tiles,bytes)=>{
 const out=tiles.slice(),pools=catalog.enemies.map(e=>({start:e.art?.base||0,count:e.art?.variants||1,fixed:!!(e.art?.animation||e.art?.themeStride)})),seen=new Set();
 const pop=Uint8Array.from({length:256},(_,n)=>n.toString(2).replaceAll('0','').length);
 for(const p of pools){
  const key=p.start+':'+p.count;if(seen.has(key))continue;seen.add(key);
  if(pools.some(q=>q.start<p.start+p.count&&p.start<q.start+q.count&&(q.fixed||q.start!==p.start||q.count!==p.count)))continue;
  const remaining=Array.from({length:p.count},(_,i)=>p.start+i),order=[remaining.shift()];
  while(remaining.length){
   const previous=order[order.length-1];let best=0,score=Infinity;
   remaining.forEach((n,i)=>{let distance=0;for(let k=0;k<18;k+=3){
    const a=bytes[previous*18+k]^bytes[n*18+k],b=bytes[previous*18+k+1]^bytes[n*18+k+1],c=bytes[previous*18+k+2]^bytes[n*18+k+2];
    distance+=pop[a]+pop[b]+pop[c]+8*((a|(b>>4)?1:0)+((b&15)|c?1:0));
   }if(distance<score){score=distance;best=i;}});
   order.push(remaining.splice(best,1)[0]);
  }
  order.forEach((n,i)=>out[p.start+i]=tiles[n]);
 }
 return out;
};
