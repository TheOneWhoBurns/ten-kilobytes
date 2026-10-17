const fs=require('fs'),acorn=require('acorn'),build=require('./build.cjs');
const dir='dev/snapshots/optimization-audio-exits-20261010';
const change=(s,name,fn)=>{const n=acorn.parse(s,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error(name);return s.slice(0,n.start)+fn(s.slice(n.start,n.end))+s.slice(n.end);};
const cases={
 baseline:s=>s,
 shared_alive:s=>'function enemiesAlive(){return room.enemies.some(e=>e.hp);}\n'+s.replaceAll('room.enemies.every(e=>!e.hp)','!enemiesAlive()').replaceAll('room.enemies.some(e=>e.hp)','enemiesAlive()'),
 shared_angle:s=>'function facingIndex(){return(Math.round(facing*4/Math.PI)+8)%8;}\n'+s.replaceAll('(Math.round(facing*4/Math.PI)+8)%8','facingIndex()'),
 direct_sound_waves:s=>change(s,'sound',s=>s.replaceAll(',2,',',3,').replace("[0,1,3][wave]",'wave')),
 flat_sound:s=>change(s,'sound',s=>{const ast=acorn.parse(s,{ecmaVersion:2020});let array;const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='MemberExpression'&&n.property.name==='kind'&&n.object.type==='ArrayExpression')array=n.object;for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);};walk(ast);const data=JSON.parse(s.slice(array.start,array.end));return s.slice(0,array.start)+JSON.stringify(data.map(rows=>rows.flatMap(row=>Array.from({length:6},(_,i)=>row[i]||0))))+s.slice(array.end);}).replace('for(const [hz,duration,wave,volume,delay=0,end=0] of [','for(const [hz,duration,wave,volume,delay=0,end=0] of ['),
 integer_sound:s=>change(s,'sound',s=>s.replace(/\.(\d+)/g,(v)=>String(Math.round(+v*1000))).replace("tone(hz,duration,[0,1,3][wave],volume,delay,end)","tone(hz,duration/1000,[0,1,3][wave],volume/1000,delay/1000,end)").replace(')<70',')<.07')),
 no_optional_audio:s=>s.replace('o.frequency.setValueAtTime?.','o.frequency.setValueAtTime').replace('o.frequency.exponentialRampToValueAtTime?.','o.frequency.exponentialRampToValueAtTime'),
 grouped_sound_loop:s=>change(s,'sound',s=>s.replace('for(const [hz,duration,wave,volume,delay=0,end=0] of','for(const note of').replace('tone(hz,duration,[0,1,3][wave],volume,delay,end)','tone(note[0],note[1],[0,1,3][note[2]],note[3],note[4],note[5])')),
 shared_distance:s=>'function farDoor(n,doors){return doors.every(d=>geomDistance(tilePoint(n),d)>=6);}\n'+s.replaceAll('doors.every(d=>geomDistance(tilePoint(n),d)>=6)','farDoor(n,doors)'),
 no_declared_cleared:s=>s.replace('!room.cleared&&room.enemies.length','room.enemies.length&&room.reward!==-2').replace('room.cleared=true;','room.reward=-2;'),
 inline_health:s=>s.replaceAll('e.hp=Math.max(0,e.hp-damage);','e.hp=e.hp>damage?e.hp-damage:0;'),
 constants_arrays:s=>s.replaceAll('Array.from({length:6},()=>[])','[[],[],[],[],[],[]]'),
 common_tilepoint:s=>s.replaceAll('geomDistance(tilePoint(p),tilePoint(n))','Math.hypot(p%31-n%31,(p/31|0)-(n/31|0))'),
};
delete cases.flat_sound;delete cases.no_declared_cleared;
(async()=>{let rows=[];for(const name of process.argv.slice(2).length?process.argv.slice(2):Object.keys(cases)){try{const r=await build({write:false,development:false,quick:true,sourceTransform:cases[name]});const row={name,bytes:r.reports.release.html_bytes,source:r.reports.release.source_bytes};rows.push(row);fs.writeFileSync(dir+'/'+name+'.html',r.artifacts.release.html);console.log(row);}catch(e){rows.push({name,error:e.message});console.log(name,e.message);}fs.writeFileSync(dir+'/probes.json',JSON.stringify(rows,null,2));}})();
module.exports=cases;
