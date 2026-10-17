const acorn=require('acorn');
const eligible=catalog=>require('./specialize-weapons.cjs').eligible(catalog)&&(catalog.weapons[0].rate??12)>=4&&catalog.weapons[0].cooldown*.15>=.3;
function bits(bytes){
 const start=bytes.length-24*18;
 if(start<0)throw Error('Missing player atlas');
 const frame=i=>bytes.subarray(start+i*18,start+(i+1)*18),mirror=b=>{const out=Buffer.alloc(18);for(let p=0;p<144;p++)if(b[p>>3]&128>>(p&7)){const q=(p/12|0)*12+11-p%12;out[q>>3]|=128>>(q&7);}return out;};
 return Buffer.concat([bytes.subarray(0,start),frame(3),frame(4),...[8,9,10,11].map(frame),...[8,9,10].map(i=>mirror(frame(i))),frame(7),...[13,14,15,16,18,19,20,21,23].map(frame)]);
}
function source(s){
 const replace=(a,b)=>{if(!s.includes(a))throw Error('Review compact player: '+a);s=s.replace(a,b);};
 const fn=name=>acorn.parse(s,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
 const n=fn('starterKey');let array=n.body.body[0].argument;while(array.type==='MemberExpression')array=array.object;
 const poses=JSON.parse(s.slice(array.start,array.end)),frames={0:0,3:3,6:4,9:7,12:8,15:11,18:12,21:15};
 for(const row of poses.flat()){if(!Object.hasOwn(frames,row[6]))throw Error('Unsupported player pose');row[6]=frames[row[6]];}
 s=s.slice(0,array.start)+JSON.stringify(poses)+s.slice(array.end);
 replace('assets.actor+15','assets.actor+16');
 replace('[0,0,2,2,1,1,3,3][direction]*6','[0,8,4,12][direction>>1]');
 replace('(step===1?1:step===3?2:0)','[0,1,0,2][step]');
 const draw=fn('drawPlayerFrame');
 s=s.slice(0,draw.body.start)+'{tile(ctx,assets.actor+phase,x,y);}'+s.slice(draw.body.end);
 let removed=0;s=s.replace(/\[assets.mini(?:\+[1256])?,1,'[^']+'\],/g,()=>{removed++;return '';});
 if(removed!==5)throw Error('Review miniature palette');
 replace('[assets.mini+3,2,','[assets.mini,2,');
 replace('assets.mini+(diagonal?3:4)','assets.mini+(diagonal?0:1)');
 return s;
}
module.exports={eligible,bits,source};
