const definitions=require('../assets/exits.json');
module.exports=tiles=>{
 if(!definitions.length)throw Error('At least one level exit is required');
 const colors=[];
 const index=(p,color)=>{
  if(p===false){let i=tiles.findIndex(t=>t.blank);if(i<0){i=tiles.length;tiles.push({blank:true});}return i;}
  if(typeof p==='string'){let i=tiles.findIndex(t=>t.generated===p);if(i<0){i=tiles.length;tiles.push({generated:p});}colors.push([i,color]);return i;}
  if(p===null){let i=tiles.findIndex(t=>t.solid);if(i<0){i=tiles.length;tiles.push({solid:true});}colors.push([i,color]);return i;}
  if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n)||n<0))throw Error('Invalid exit tile');
  let i=tiles.findIndex(t=>t.x===p[0]&&t.y===p[1]);
  if(i<0){i=tiles.length;tiles.push({x:p[0],y:p[1]});}
  colors.push([i,color]);return i;
 };
 const frames=definitions.map(d=>{const cycle=(d.frames||[d.center]).map(p=>index(p,d.color));if(cycle.some((n,i)=>n!==cycle[0]+i))throw Error('Exit animation frames must be contiguous');return [[cycle[0],d.x||0,d.y||0,d.spin||0,0,d.alpha??1,d.frames?cycle.length:0],...d.decoration.map(p=>{
  if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||Math.abs(p.x)>2||p.y< -1||p.y>2)throw Error('Exit decoration must fit the reserved clearing');
  return[index(p.tile,p.color),p.x,p.y,0,p.closed?index(p.closed,p.color):0];
 })];});
 if(colors.some(([,c])=>!/^#[0-9a-f]{6}$/i.test(c)))throw Error('Exit colors must be six-digit hex values');
 for(const parts of frames)for(const p of parts)while(p.length>3&&p[p.length-1]===[0,0,0,0,0,1,0][p.length-1])p.pop();
 return{frames,colors};
};
