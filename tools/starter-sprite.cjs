module.exports=bits=>{
 const points=[];for(let p=0;p<144;p++)if(bits[p>>3]&(128>>(p&7)))points.push([p%12,p/12|0]);
 const lo=Math.min(...points.map(([x,y])=>x-y)),hi=Math.max(...points.map(([x,y])=>x-y)),out=Buffer.alloc(18),point=([x,y])=>[Math.round((x-y-lo)*11/(hi-lo)),5+Math.round((x+y-11)/Math.SQRT2)],dot=(x,y)=>{if(x>=0&&x<12&&y>=0&&y<12){const p=y*12+x;out[p>>3]|=128>>(p&7);}};
 for(const p of points){const [x,y]=point(p);dot(x,y);for(const q of points)if(Math.max(Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1]))===1){const [u,v]=point(q),n=Math.max(Math.abs(u-x),Math.abs(v-y));for(let i=1;i<=n;i++)dot(Math.round(x+(u-x)*i/n),Math.round(y+(v-y)*i/n));}}
 return Buffer.concat([bits,out]);
};
