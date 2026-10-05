const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),build=require('./build.cjs'),data=require('./content-data.cjs'),examples=require('./content-examples.cjs');
process.chdir(path.resolve(__dirname,'..'));
(async()=>{
 const baseline=data.load(),cases=[['baseline',()=>{}],['enemy_existing_art',c=>examples.enemy(c)],['enemy_attack_sequence',c=>{const i=examples.enemy(c);c.enemies[i].attack.mode=['charge','ring','fan'];}],['enemy_biome_weight',c=>{const i=examples.enemy(c);c.enemies[i].biomes=[0];c.enemies[i].weight=3;}],['enemy_new_12px_sprite',c=>examples.enemy(c,true)],['weapon_existing_art',c=>examples.weapon(c)],['ten_enemy_recipes',c=>{for(let i=0;i<10;i++)examples.enemy(c,false,i);}],['ten_enemies_six_weapons',c=>{for(let i=0;i<10;i++)examples.enemy(c,false,i);for(let i=0;i<6;i++){examples.weapon(c,i);}}]],rows=[];
 const before=crypto.createHash('sha256').update(fs.readFileSync('dist/index.html')).digest('hex');
 for(const [name,edit]of cases){
  const catalog=structuredClone(baseline);edit(catalog);const {reports}=await build({catalog,write:false,development:false}),r=reports.release,base=rows[0];
  const row={name,html_bytes:r.html_bytes,zip_bytes:r.zip_bytes,delta_html:base?r.html_bytes-base.html_bytes:0,delta_zip:base?r.zip_bytes-base.zip_bytes:0,sprite_data_bytes:r.sprite_data_bytes,enemies:r.enemy_definitions,weapons:r.weapon_definitions,powers:r.power_definitions};rows.push(row);console.log(JSON.stringify(row));
 }
 if(before!==crypto.createHash('sha256').update(fs.readFileSync('dist/index.html')).digest('hex'))throw Error('Benchmark modified release');
 fs.writeFileSync('dev/content-costs.json',JSON.stringify({note:'Measured complete files; compression deltas depend on the existing catalog. New primitives need code as well as data. Benchmark recipes reuse art except the explicitly named sprite case.',rows},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
