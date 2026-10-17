const acorn=require('acorn'),{createHash}=require('node:crypto');
module.exports=s=>{
 const replace=(a,b)=>{if(!s.includes(a))throw Error('Review compact spells: '+a);s=s.replace(a,b);};
 replace('a,shape,age:0,burn:0','a,shape,age:0,burn:0,cells:[]');
 replace('for(let n=0;n<31*21;n++)f.burn=Math.max(f.burn,spellCell(f,n)+warn);','for(let n=0;n<31*21;n++){const delay=spellCell(f,n);if(delay>=0)f.cells.push([n%31,n/31|0,delay]);f.burn=Math.max(f.burn,delay+warn);}');
 const fn=acorn.parse(s,{ecmaVersion:2020}).body.find(n=>n.id?.name==='fieldHits');
 if(!fn||createHash('sha256').update(s.slice(fn.body.start,fn.body.end)).digest('hex')!=='4ee529818624158959e3b8f4fa787a086ad8f78ff8b94e959a1e529a99b2d750')throw Error('Review spell collision geometry');
 s=s.slice(0,fn.body.start)+'{const h=hurtbox(e);return f.cells.some(([x,y])=>((h.x-Math.max(x,Math.min(x+1,h.x)))/h.rx)**2+((h.y-Math.max(y,Math.min(y+1,h.y)))/h.ry)**2<=1);}'+s.slice(fn.body.end);
 replace('for(const f of fields)for(let n=0;n<31*21;n++){const delay=spellCell(f,n),t=f.age;if(delay<0||t<delay','for(const f of fields)for(const [xx,yy,delay] of f.cells){const t=f.age;if(t<delay');
 replace('const x=n%31*12,y=(n/31|0)*12;ctx.globalAlpha=t<f.burn-.5','const x=xx*12,y=yy*12;ctx.globalAlpha=t<f.burn-.5');
 return s;
};
