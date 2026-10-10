// Build-time ingestion of generated artwork into mirrored, one-bit pixel sprites.
const fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'../assets/generated');
for(const [name,size] of [['large',96],['medium',72]]){
 const src=PNG.sync.read(fs.readFileSync(path.join(root,`ring-${name}-original.png`)));
 let left=src.width,top=src.height,right=0,bottom=0;
 for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if(src.data[(y*src.width+x)*4+3]>127){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const span=Math.max(right-left+1,bottom-top+1),cx=(left+right+1)/2,cy=(top+bottom+1)/2;
 const mask=new PNG({width:size,height:size}),half=size/2;
 // Average all four corresponding quadrants; threshold removes antialiasing and speckle.
 for(let y=0;y<half;y++)for(let x=0;x<half;x++){
  let sum=0,count=0;
  for(const tx of [x,size-1-x])for(const ty of [y,size-1-y]){
   const x0=Math.floor(cx-span/2+tx*span/size),x1=Math.floor(cx-span/2+(tx+1)*span/size),y0=Math.floor(cy-span/2+ty*span/size),y1=Math.floor(cy-span/2+(ty+1)*span/size);
   for(let sy=y0;sy<y1;sy++)for(let sx=x0;sx<x1;sx++){const i=(sy*src.width+sx)*4;sum+=src.data[i+3]/255;count++;}
  }
  if(sum/count>.2)for(const tx of [x,size-1-x])for(const ty of [y,size-1-y])mask.data.fill(255,(ty*size+tx)*4,(ty*size+tx)*4+4);
 }
 fs.writeFileSync(path.join(root,`ring-${name}.png`),PNG.sync.write(mask));
}
