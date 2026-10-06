const fs=require('node:fs'),path=require('node:path');
const schema={
 E:['MODE','COUNT','COUNT_STEP','SPEED','WIND','ACTIVE','COOL','COOL_STEP','MOVE','SPREAD','ART','THEME','FRAMES','ANIM','RECOVER','RANGE','STANDOFF','CONTACT','LIFE','CHARGE'],
 W:['FLAGS','COUNT','SPEED','LIFE','REACH_LIFE','TEMPER_LIFE','SPREAD','TEMPER_SPREAD','CURVE','PITCH','SPRITE','DAMAGE','REACH','COOLDOWN','TYPE']
};
const load=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/content.json'),'utf8'));
function compile(catalog=load(),{specialize=false,usedFields}={}){
 const fail=message=>{throw Error('Content: '+message);};
 const keys=(object,allowed,label)=>{if(!object||typeof object!=='object'||Array.isArray(object))fail(label+' must be an object');for(const key of Object.keys(object))if(!allowed.includes(key))fail('unknown '+label+' field '+key);};
 keys(catalog,['enemySprites','enemies','bosses','weapons','armorSprites'],'catalog');
 for(const group of ['enemies','bosses','weapons']){
  if(!Array.isArray(catalog[group])||!catalog[group].length)fail('empty '+group);
  const ids=catalog[group].map(x=>x.id);if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)fail('invalid/duplicate '+group+' id');
 }
 if(catalog.bosses.length!==1)fail('one boss definition required');
 if(catalog.weapons[0].id!=='fist')fail('fist must remain weapon zero');
 const number=(n,lo,hi,label)=>{if(!Number.isFinite(n)||n<lo||n>hi)fail(label+' out of range');return n;};
 const integer=(n,lo,hi,label)=>{number(n,lo,hi,label);if(!Number.isInteger(n))fail(label+' must be integer');return n;};
 const coord=tile=>{if(!Array.isArray(tile)||tile.length!==2)fail('sprite coordinate');integer(tile[0],0,205,'sprite x');integer(tile[1],0,49,'sprite y');return{x:tile[0],y:tile[1]};};
 const enemyTiles=catalog.enemySprites.map(coord),weaponTiles=[],spriteIds=new Map();
 const sprite=tile=>{const p=coord(tile),key=p.x+','+p.y;if(!spriteIds.has(key)){spriteIds.set(key,weaponTiles.length);weaponTiles.push(p);}return spriteIds.get(key);};
 const flags=(traits,known)=>{let bits=0;if(traits&&!Array.isArray(traits))fail('traits must be an array');for(const t of traits||[]){if(!Object.hasOwn(known,t))fail('unknown trait '+t);bits|=known[t];}return bits;};
 const weaponForms=[];
 const weaponRows=catalog.weapons.map((w,i)=>{
  keys(w,['id','name','sprite','traits','attack','pitch','damage','reach','cooldown','type','sprites'],'weapon');
  if(typeof w.name!=='string'||!w.name)fail('weapon name');const a=w.attack||{};
  keys(a,['count','speed','life','reachLife','temperLife','spread','temperSpread','curve'],'weapon attack');
  const forms=i?(w.sprites||[w.sprite]).map(sprite):[0];weaponForms.push(forms);
  const row=[flags(w.traits,{pierce:1,return:2,ring:4}),a.count??1,a.speed??16,a.life??.6,a.reachLife??.1,a.temperLife??.08,a.spread??.3,a.temperSpread??.04,a.curve??0,w.pitch??95+i*45,forms[0],w.damage??1,w.reach??1,w.cooldown??1,w.type??0];
  row.forEach((n,j)=>number(n,0,1000,'weapon '+w.id+' '+schema.W[j]));integer(row[1],0,32,'weapon count');if(row[11]<=0||row[12]<=0||row[13]<=0)fail('weapon multipliers');return row;
 });
 // Projectile parameters of melee-only recipes are unobservable; normalize them before constant-column elimination.
 const projectile=weaponRows.find(row=>row[1]);if(projectile)for(const row of weaponRows)if(!row[1])for(const j of [0,2,3,4,5,6,7,8])row[j]=projectile[j];
 const curves=weaponRows.some(row=>row[8]),piercing=weaponRows.some(row=>row[0]&1);
 const sequenced=[...catalog.enemies,...catalog.bosses].some(e=>Array.isArray(e.attack?.mode)&&e.attack.mode.length>1);
 const enemyRows=[...catalog.enemies,...catalog.bosses].map((e,i)=>{
  const boss=i>=catalog.enemies.length,a=e.attack||{},art=e.art||{},modes=(Array.isArray(a.mode)?a.mode:[a.mode]).map(m=>({fan:0,charge:1,ring:2,swarm:3,shield:4,kamikaze:5,conga:6,horse:7,mage:8,medusa:9})[m]);if(!modes.length||modes.length>8||modes.some(m=>!Number.isInteger(m)))fail('unknown enemy attack '+a.mode);const mode=modes[0];
  keys(e,['id','attack','art','drop','move','contact','biomes','weight'],'enemy');
  keys(a,['mode','count','countStep','speed','chargeSpeed','windup','active','cooldown','cooldownStep','spread','recovery','range','standoff','life'],'enemy attack');
  keys(art,['base','themeStride','variants','animation'],'enemy art');
  const charge=mode===1;
  const row=[sequenced?modes:mode,a.count??(boss?7:0),a.countStep??(boss?2:0),a.speed??(boss?4.5:3.2),a.windup??(charge?.38:.6),a.active??(charge?.32:.24),a.cooldown??.7,a.cooldownStep??.22,e.move??(boss?.22:.34),a.spread??.23,art.base??0,art.themeStride??0,art.variants??1,art.animation??0,a.recovery??.45,a.range??10,a.standoff??6,e.contact??(boss?1.1:.55),a.life??2.5,a.chargeSpeed??(charge?a.speed??11.5:11.5)];
  row.forEach((n,j)=>{if(j!==0)number(n,0,1000,'enemy '+e.id+' '+schema.E[j]);});
  integer(row[1],0,32,'volley count');integer(row[2],0,16,'volley count step');if(mode<3)integer(row[1]+2*row[2],0,32,'maximum volley count');integer(row[10],0,enemyTiles.length-1,'enemy art');integer(row[11],0,enemyTiles.length,'theme stride');integer(row[12],1,enemyTiles.length,'animation frames');
  if(row[10]+2*row[11]+row[12]>enemyTiles.length)fail('enemy frames outside atlas');
  if(row[4]<=0||row[5]<=0||row[6]<=0||row[14]<=0)fail('enemy phase timings must be positive');if(modes.some(m=>m===0||m===2)&&row[1]<1)fail('projectile enemy needs shots');return row;
 });
 // Normalize fields that a behavior never reads. Future recipes retain every field
 // used by any mode in their sequence; constant-column specialization can then fold it.
 const uses={COUNT:[0,2,3,4,6],COUNT_STEP:[0,2,3,4,6],SPEED:[0,2],WIND:[0,1,2],ACTIVE:[0,1,2],COOL:[0,1,2],COOL_STEP:[0,1,2],MOVE:[0,1,2,3,5,8],SPREAD:[0,2],RECOVER:[0,1,2],RANGE:[0,1,2],STANDOFF:[0,2],LIFE:[0,2],CHARGE:[1,7]};
 for(const [name,modes] of Object.entries(uses)){
  const column=schema.E.indexOf(name),used=row=>(Array.isArray(row[0])?row[0]:[row[0]]).some(m=>modes.includes(m)),counts=new Map();
  for(const row of enemyRows)if(used(row))counts.set(row[column],(counts.get(row[column])||0)+1);
  const value=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??0;
  for(const row of enemyRows)if(!used(row))row[column]=value;
 }
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
 const constants={},omitted=new Set(),indices=[],tables={E:enemyRows,W:weaponRows};
 for(const [prefix,fields]of Object.entries(schema)){
  const keep=[];
  fields.forEach((name,i)=>{
   const key=prefix+'_'+name,rows=tables[prefix];
   if(specialize&&usedFields&&!usedFields.has(key)){omitted.add(key);indices.push(key+'=-1');}
   else if(specialize&&rows.every(r=>r[i]===rows[0][i])){constants[key]=rows[0][i];indices.push(key+'=-1');}
   else{indices.push(key+'='+keep.length);keep.push(i);}
  });
  tables[prefix]=tables[prefix].map(row=>keep.map(i=>row[i]));
 }
 const contiguousForms=weaponForms.every(row=>row.every((n,i)=>n===row[0]+i));
 const enemyTable=specialize?require('./recipe-rows.cjs')(tables.E):JSON.stringify(tables.E);
 const source='const '+indices.join(',')+',CONTIGUOUS_FORMS='+contiguousForms+',CURVED_SHOTS='+curves+',PIERCING_SHOTS='+piercing+',SEQUENCED_ENEMIES='+sequenced+',ARMOR_COUNT='+(catalog.armorSprites||[]).length+',ENEMY_COUNT='+catalog.enemies.length+',enemyPools='+JSON.stringify(enemyPools)+',bossDrops='+JSON.stringify(bossDrops)+',enemyRules='+enemyTable+',weaponRules='+JSON.stringify(tables.W)+',weaponForms='+JSON.stringify(contiguousForms?weaponForms.map(row=>[row[0],row.length]):weaponForms)+',enemyNames='+JSON.stringify(catalog.enemies.map(e=>e.id))+',weaponNames='+JSON.stringify(catalog.weapons.map(w=>w.name))+';\n';
 function transform(text){
  if(!specialize)return text;
  const ast=require('acorn').parse(text,{ecmaVersion:2020}),edits=[];
  function walk(n){if(!n||typeof n!=='object')return;
   if(n.type==='MemberExpression'&&n.computed&&n.property.type==='Identifier'&&omitted.has(n.property.name))fail('runtime reads an omitted field: '+n.property.name);
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
 return{source,transform,constants,enemyTiles,weaponTiles,armorTiles:(catalog.armorSprites||[]).map(coord),enemyRows,weaponRows,schema};
}
module.exports=()=>compile().source;
module.exports.compile=compile;module.exports.load=load;module.exports.schema=schema;
