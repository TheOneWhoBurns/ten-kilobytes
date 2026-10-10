// Column-major masks group repeated vertical strokes before compression.
// Six pixels per character, with no quote or backslash escaping. Every tile
// stays exactly 24 characters wide, so the compressor can compare nearby art.
module.exports=bytes=>{
 if(bytes.length%18)throw Error('Expected complete 12x12 binary tiles');
 const columns=Buffer.alloc(bytes.length);
 for(let t=0;t<bytes.length/18;t++)for(let p=0;p<144;p++)if(bytes[t*18+(p>>3)]&128>>(p&7)){
  const q=p%12*12+(p/12|0);columns[t*18+(q>>3)]|=128>>(q&7);
 }
 bytes=columns;
 let text='';
 for(let i=0;i<bytes.length;i+=3){
  const n=bytes[i]<<16|bytes[i+1]<<8|bytes[i+2];
  for(const shift of [18,12,6,0]){let c=(n>>>shift&63)+63;if(c>=92)c++;text+=String.fromCharCode(c);}
 }
 return{text,format:'ascii6',loader:`const bits=assets.bits;
atlas.width=${bytes.length/18*12};atlas.height=12;art.fillStyle='#efefdb';
for(let i=0,n;i<bits.length;i++)for(let b=0;b<6;b++)if((n=bits.charCodeAt(i),n-63-(n>92))&32>>b){
 const tileIndex=Math.floor(i/24),pixel=(i%24)*6+b;
 art.fillRect(tileIndex*12+Math.floor(pixel/12),pixel%12,1,1);
}`};
};
