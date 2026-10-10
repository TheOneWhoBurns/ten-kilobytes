// Forward-map the diagonal trident into a horizontal mask, reconnecting adjacent
// source pixels so raster rotation cannot punch holes in the one-pixel shaft.
module.exports=bits=>{
 const out=Buffer.alloc(18),ink=p=>p>=0&&p<144&&(bits[p>>3]&(128>>(p&7))),point=p=>[Math.round((p%12-(p/12|0)+9)/Math.SQRT2),5+Math.round((p%12+(p/12|0)-11)/Math.SQRT2)],dot=(x,y)=>{if(x>=0&&x<12&&y>=0&&y<12){const n=y*12+x;out[n>>3]|=128>>(n&7);}};
 for(let p=0;p<144;p++)if(ink(p)){
  const [x,y]=point(p);dot(x,y);
  for(const d of [1,11,12,13]){const q=p+d;if(!ink(q)||Math.abs(q%12-p%12)>1)continue;
   const [u,v]=point(q),steps=Math.max(Math.abs(u-x),Math.abs(v-y));
   for(let i=1;i<=steps;i++)dot(Math.round(x+(u-x)*i/steps),Math.round(y+(v-y)*i/steps));
  }
 }
 const diagonal=Buffer.from(bits);
 // Join corner-touching shaft pixels into an unbroken staircase.
 for(let x=1;x<6;x++){const p=(11-x)*12+x+1;diagonal[p>>3]|=128>>(p&7);}
 return Buffer.concat([out,diagonal]);
};
