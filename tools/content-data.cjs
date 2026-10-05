const fs=require('node:fs'),path=require('node:path');
const schema={
 E:['MODE','COUNT','COUNT_STEP','SPEED','WIND','ACTIVE','COOL','COOL_STEP','MOVE','SPREAD','ART','THEME','FRAMES','ANIM','HP','HP_DEPTH','HP_CAP','COMPOSITE','RECOVER','RANGE','STANDOFF','CONTACT','LIFE','CHARGE'],
 W:['FLAGS','COUNT','SPEED','LIFE','REACH_LIFE','TEMPER_LIFE','SPREAD','TEMPER_SPREAD','CURVE','PITCH','SPRITE','DAMAGE','REACH','COOLDOWN'],
 P:['FLAGS','DAMAGE','SPEED','REACH','SLOW','TAKEN','RETALIATE','RADIUS','SHOT_SPEED','SHOT_DAMAGE','SHOT_LIFE','BODY','COLOR','HEIGHT']
};
const load=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/content.json'),'utf8'));
function compile(catalog=load(),{specialize=false}={}){
 const fail=message=>{throw Error('Content: '+message);};
 const keys=(object,allowed,label)=>{if(!object||typeof object!=='object'||Array.isArray(object))fail(label+' must be an object');for(const key of Object.keys(object))if(!allowed.includes(key))fail('unknown '+label+' field '+key);};
 keys(catalog,['enemySprites','enemies','bosses','weapons','powers'],'catalog');
 for(const group of ['enemies','bosses','weapons','powers']){
  if(!Array.isArray(catalog[group])||!catalog[group].length)fail('empty '+group);
  const ids=catalog[group].map(x=>x.id);if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)fail('invalid/duplicate '+group+' id');
 }
 if(catalog.bosses.length!==3)fail('one boss definition per existing biome required');
 if(catalog.weapons[0].id!=='fist')fail('fist must remain weapon zero');
 const number=(n,lo,hi,label)=>{if(!Number.isFinite(n)||n<lo||n>hi)fail(label+' out of range');return n;};
 const integer=(n,lo,hi,label)=>{number(n,lo,hi,label);if(!Number.isInteger(n))fail(label+' must be integer');return n;};
 const coord=tile=>{if(!Array.isArray(tile)||tile.length!==2)fail('sprite coordinate');integer(tile[0],0,205,'sprite x');integer(tile[1],0,49,'sprite y');return{x:tile[0],y:tile[1]};};
 const enemyTiles=catalog.enemySprites.map(coord),weaponTiles=[],spriteIds=new Map();
 const sprite=tile=>{const p=coord(tile),key=p.x+','+p.y;if(!spriteIds.has(key)){spriteIds.set(key,weaponTiles.length);weaponTiles.push(p);}return spriteIds.get(key);};
 const flags=(traits,known)=>{let bits=0;if(traits&&!Array.isArray(traits))fail('traits must be an array');for(const t of traits||[]){if(!Object.hasOwn(known,t))fail('unknown trait '+t);bits|=known[t];}return bits;};
 const weaponRows=catalog.weapons.map((w,i)=>{
  keys(w,['id','name','sprite','traits','attack','pitch','damage','reach','cooldown'],'weapon');
  if(typeof w.name!=='string'||!w.name)fail('weapon name');const a=w.attack||{};
  keys(a,['count','speed','life','reachLife','temperLife','spread','temperSpread','curve'],'weapon attack');
  const row=[flags(w.traits,{pierce:1,return:2,ring:4}),a.count??1,a.speed??16,a.life??.6,a.reachLife??.1,a.temperLife??.08,a.spread??.3,a.temperSpread??.04,a.curve??0,w.pitch??95+i*45,i?sprite(w.sprite):0,w.damage??1,w.reach??1,w.cooldown??1];
  row.forEach((n,j)=>number(n,0,1000,'weapon '+w.id+' '+schema.W[j]));integer(row[1],0,32,'weapon count');if(row[11]<=0||row[12]<=0||row[13]<=0)fail('weapon multipliers');return row;
 });
 const sequenced=[...catalog.enemies,...catalog.bosses].some(e=>Array.isArray(e.attack?.mode)&&e.attack.mode.length>1);
 const enemyRows=[...catalog.enemies,...catalog.bosses].map((e,i)=>{
  const boss=i>=catalog.enemies.length,a=e.attack||{},art=e.art||{},modes=(Array.isArray(a.mode)?a.mode:[a.mode]).map(m=>({fan:0,charge:1,ring:2})[m]);if(!modes.length||modes.length>8||modes.some(m=>!Number.isInteger(m)))fail('unknown enemy attack '+a.mode);const mode=modes[0];
  keys(e,['id','attack','art','drop','hp','move','contact','biomes','weight'],'enemy');
  keys(a,['mode','count','countStep','speed','chargeSpeed','windup','active','cooldown','cooldownStep','spread','recovery','range','standoff','life'],'enemy attack');
  keys(art,['base','themeStride','variants','animation','composite'],'enemy art');
  const hp=e.hp||{},charge=mode===1;
  keys(hp,['base','depth','cap'],'enemy hp');
  const row=[sequenced?modes:mode,a.count??(boss?7:0),a.countStep??(boss?2:0),a.speed??(boss?4.5:3.2),a.windup??(charge?.38:.6),a.active??(charge?.32:.24),a.cooldown??.7,a.cooldownStep??.22,e.move??(boss?.22:.34),a.spread??.23,art.base??0,art.themeStride??0,art.variants??1,art.animation??0,hp.base??(boss?24:2),hp.depth??(boss?4:1),hp.cap??(boss?0:3),art.composite??0,a.recovery??.45,a.range??10,a.standoff??6,e.contact??(boss?1.1:.55),a.life??2.5,a.chargeSpeed??(charge?a.speed??11.5:11.5)];
  row.forEach((n,j)=>{if(j!==0)number(n,0,1000,'enemy '+e.id+' '+schema.E[j]);});
  integer(row[1],0,32,'volley count');integer(row[2],0,16,'volley count step');integer(row[1]+2*row[2],0,32,'maximum volley count');integer(row[10],0,enemyTiles.length-1,'enemy art');integer(row[11],0,enemyTiles.length,'theme stride');integer(row[12],1,enemyTiles.length,'animation frames');
  if(row[10]+2*row[11]+row[12]>enemyTiles.length)fail('enemy frames outside atlas');
  if(boss&&!([0,4,8].includes(row[17])))fail('boss composite must start on a complete sprite');if(row[4]<=0||row[5]<=0||row[6]<=0||row[18]<=0)fail('enemy phase timings must be positive');if(modes.some(m=>m!==1)&&row[1]<1)fail('projectile enemy needs shots');return row;
 });
 const powerRows=catalog.powers.map(p=>{
  keys(p,['id','name','traits','damage','speed','reach','slow','taken','retaliate','shot','body','effect','height'],'power');
  if(typeof p.name!=='string'||!p.name)fail('power name');const r=p.retaliate||{},s=p.shot||{};
  keys(r,['damage','radius'],'retaliation');keys(s,['speed','damage','life'],'power shot');
  const row=[flags(p.traits,{phase:1,trail:2}),p.damage??0,p.speed??0,p.reach??0,p.slow??0,p.taken??1,r.damage??0,r.radius??0,s.speed??0,s.damage??0,s.life??0,p.body,p.effect,p.height??1];
  row.forEach((n,j)=>{if(j===11||j===12){if(!/^#[0-9a-f]{6}$/i.test(n))fail('power color');}else number(n,0,1000,'power '+p.id+' '+schema.P[j]);});
  if(row[5]<=0)fail('damage taken multiplier');if(row[6]&&!row[7]||row[8]&&(!row[9]||!row[10]))fail('incomplete power hook');return row;
 });
 const bossDrops=catalog.bosses.map(b=>{
  const ids=Array.isArray(b.drop)?b.drop:[b.drop];if(!ids.length)fail('empty boss drop pool');
  return ids.map(id=>{const n=catalog.weapons.findIndex(w=>w.id===id);if(n<1)fail('boss drop must reference a weapon');return n;});
 });
 const pools=[0,1,2].map(theme=>catalog.enemies.flatMap((e,i)=>{
  const biomes=e.biomes??[0,1,2],weight=e.weight??1;
  if(!Array.isArray(biomes)||!biomes.length||biomes.some(n=>!Number.isInteger(n)||n<0||n>2))fail('invalid enemy biomes');integer(weight,1,16,'spawn weight');
  return biomes.includes(theme)?Array(weight).fill(i):[];
 }));
 if(pools.some(p=>!p.length))fail('every biome needs an enemy');
 const enemyPools=pools.every(p=>p.length===catalog.enemies.length&&p.every((v,i)=>v===i))?null:pools;
 const constants={},indices=[],tables={E:enemyRows,W:weaponRows,P:powerRows};
 for(const [prefix,fields]of Object.entries(schema)){
  const keep=[];
  fields.forEach((name,i)=>{
   const key=prefix+'_'+name,rows=tables[prefix];
   if(specialize&&prefix!=='P'&&rows.every(r=>r[i]===rows[0][i])){constants[key]=rows[0][i];indices.push(key+'=-1');}
   else{indices.push(key+'='+keep.length);keep.push(i);}
  });
  tables[prefix]=tables[prefix].map(row=>keep.map(i=>row[i]));
 }
 const source='const '+indices.join(',')+',SEQUENCED_ENEMIES='+sequenced+',ENEMY_COUNT='+catalog.enemies.length+',enemyPools='+JSON.stringify(enemyPools)+',bossDrops='+JSON.stringify(bossDrops)+',enemyRules='+JSON.stringify(tables.E)+',weaponRules='+JSON.stringify(tables.W)+',powerRules='+JSON.stringify(tables.P)+',weaponNames='+JSON.stringify(catalog.weapons.map(w=>w.name))+',powerNames='+JSON.stringify(catalog.powers.map(p=>p.name))+';\n';
 function transform(text){
  if(!specialize)return text;
  const ast=require('acorn').parse(text,{ecmaVersion:2020}),edits=[];
  function walk(n){if(!n||typeof n!=='object')return;
   if(n.type==='MemberExpression'&&n.computed&&n.property.type==='Identifier'&&Object.hasOwn(constants,n.property.name)){
    const object=n.object,safe=object.type==='Identifier'&&['rule','w'].includes(object.name)||object.type==='MemberExpression'&&object.object.name==='weaponRules'&&['Identifier','Literal'].includes(object.property.type);
    if(!safe)fail('constant field read must use a direct recipe reference: '+n.property.name);
    edits.push([n.start,n.end,JSON.stringify(constants[n.property.name])]);return;
   }
   for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
  }walk(ast);
  for(const [a,b,s]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+s+text.slice(b);
  return text;
 }
 return{source,transform,constants,enemyTiles,weaponTiles,enemyRows,weaponRows,powerRows,schema};
}
module.exports=()=>compile().source;
module.exports.compile=compile;module.exports.load=load;module.exports.schema=schema;
