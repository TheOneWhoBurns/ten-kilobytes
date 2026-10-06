// Six pixels per character, with no quote or backslash escaping. Every tile
// stays exactly 24 characters wide, so the compressor can compare nearby art.
module.exports=bytes=>{
 if(bytes.length%18)throw Error('Expected complete 12x12 binary tiles');
 let text='';
 for(let i=0;i<bytes.length;i+=3){
  const n=bytes[i]<<16|bytes[i+1]<<8|bytes[i+2];
  for(const shift of [18,12,6,0]){let c=(n>>>shift&63)+55;if(c>=92)c++;if(c>=96)c++;text+=String.fromCharCode(c);}
 }
 return{text,format:'ascii6',loader:`const bits=assets.bits;
atlas.width=${bytes.length/18*12};atlas.height=12;art.fillStyle='#efefdb';
for(let i=0,n;i<bits.length;i++)for(let b=0;b<6;b++)if((n=bits.charCodeAt(i),n-55-(n>92)-(n>96))&32>>b){
 const tileIndex=Math.floor(i/24),pixel=(i%24)*6+b;
 art.fillRect(tileIndex*12+pixel%12,Math.floor(pixel/12),1,1);
}`};
};
