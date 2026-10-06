// Six pixels per character: two characters form one 12px row. The build bakes
// the alphabet and dimensions into the loader; every source pixel is retained.
module.exports=bytes=>{
 if(bytes.length%18)throw Error('Expected complete 12x12 binary tiles');
 let text='';
 for(let i=0;i<bytes.length;i+=3){
  const n=bytes[i]<<16|bytes[i+1]<<8|bytes[i+2];
  text+=String.fromCharCode((n>>>18&63)+42,(n>>>12&63)+42,(n>>>6&63)+42,(n&63)+42);
 }
 return{text,format:'ascii6',loader:`const bits=assets.bits;
atlas.width=${bytes.length/18*12};atlas.height=12;art.fillStyle='#efefdb';
for(let i=0;i<bits.length;i++)for(let b=0;b<6;b++)if((bits.charCodeAt(i)-42)&32>>b){
 const tileIndex=Math.floor(i/24),pixel=(i%24)*6+b;
 art.fillRect(tileIndex*12+pixel%12,Math.floor(pixel/12),1,1);
}`};
};
