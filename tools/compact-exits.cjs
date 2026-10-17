module.exports=(s,assets)=>{
 if(!s.includes('r={cells,doors,age:0}'))return s;
 const exits=assets.exits,defaults=[0,0,0,0,0,1,0],attributes=[[1,0,1,0],[0,0,.45,0],[0,0,1,3],[0,0,1,3],[0,0,1,0]];
 if(exits.length!==5||exits.some((parts,k)=>parts.length<2||parts[0][1]||parts[0][2]||attributes[k].some((v,i)=>(parts[0][i+3]??defaults[i+3])!==v)))return s;
 const centers=exits.map(p=>p[0][0]),bases=exits.map(p=>p[1][0]-1),closed=exits[1][1][4];
 if(exits[1].length!==2||!closed||centers[0]!==bases[0]||centers[1]!==bases[1]||centers[2]!==centers[3])return s;
 for(const [kind,parts]of exits.entries())for(const [j,p]of parts.entries()){
  if(p[1]<-2||p[1]>1||p[2]<-1||p[2]>2||!Number.isInteger(p[1])||!Number.isInteger(p[2]))return s;
  if(j&&(p[0]!==bases[kind]+j||[3,4,5,6].some(i=>!(kind===1&&j===1&&i===4)&&(p[i]??defaults[i])!==defaults[i])))return s;
 }
 const positions=exits.map(parts=>parts.map(p=>String.fromCharCode(64+p[1]+2+(p[2]+1)*4)).join(''));
 const start=s.indexOf('  const parts=assets.exits['),end=s.indexOf('\n }\n for(const d of room.doors)',start);
 if(start<0||end<0)throw Error('Review exit rendering block');
 const base=JSON.stringify(bases),index='(j?'+base+'[kind]+j:kind>1&&kind<4?'+centers[2]+'+(worldTime*6|0)%3:kind===4?'+centers[4]+':'+base+'[kind])';
 const code='  const kind=world.song%5,age=room.age;const parts='+JSON.stringify(positions)+'[kind];for(let j=parts.length;j--;){const v=parts.charCodeAt(j),x=v%4-2,y=(v>>2)-17;const door=kind===1&&j;if(door||open&&age>=(j?j-1?.3:0:.6)){transform(ctx,(room.gate.x+x)*12,(room.gate.y+y)*12,!kind&&!j?worldTime:0);ctx.globalAlpha=kind===1&&!j?.45:1;tile(ctx,door&&(!open||age<.6)?'+closed+':'+index+',-6,-6);ctx.restore();}}';
 return s.slice(0,start)+code+s.slice(end);
};
