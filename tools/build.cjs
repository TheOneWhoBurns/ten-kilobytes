const fs=require('node:fs'),path=require('node:path');
const {PNG}=require('pngjs'),{zipSync,unzipSync}=require('fflate'),{transformSync}=require('esbuild');
const compactSource=require('./compact-source.cjs'),poolLiterals=require('./source-literals.cjs'),sourceEncoding=require('./source-encoding.cjs');
const quantizeColors=require('./quantize-colors.cjs'),releaseLayout=require('./release-layout.cjs'),contentData=require('./content-data.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sheet=PNG.sync.read(fs.readFileSync(path.join(root,'assets/source/urizen.png')));
const spec=JSON.parse(read('assets/selection.json'));
const characterSheet=PNG.sync.read(fs.readFileSync(path.join(root,'assets/generated/104-sheet.png')));
if(characterSheet.width!==72||characterSheet.height!==48)throw Error('104 sheet must be 6 × 4 tiles');
const characterBits=Buffer.alloc(24*18);
for(let t=0;t<24;t++)for(let p=0;p<144;p++){
 const n=((Math.floor(t/6)*12+Math.floor(p/12))*72+(t%6)*12+p%12)*4;
 if(characterSheet.data[n+3]>127)characterBits[t*18+(p>>3)]|=128>>(p&7);
}
if(spec.tile_size!==12||spec.margin!==1||spec.spacing!==1)throw Error('Expected Urizen 12px grid');
// One silhouette bit per pixel. Black is transparent; runtime supplies the ink color.
function pack(tiles){
 const bytes=Buffer.alloc(tiles.length*18);
 tiles.forEach((tile,i)=>{
  if(!Number.isInteger(tile.x)||!Number.isInteger(tile.y)||tile.x<0||tile.y<0||tile.x*13+13>sheet.width||tile.y*13+13>sheet.height)throw Error('Invalid tile coordinate');
  for(let p=0;p<144;p++){
   const x=1+tile.x*13+p%12,y=1+tile.y*13+Math.floor(p/12),offset=(y*sheet.width+x)*4;
   const bit=sheet.data[offset+3]>0&&Math.max(...sheet.data.subarray(offset,offset+3))>=32;
   if(bit)bytes[i*18+(p>>3)]|=128>>(p&7);
  }
 });
 return bytes;
}
// Six slots per biome, then textures. Unused second slots in water/archive share art.
const pantry=[[5,39],[8,39],[7,42],[28,21],[1,38],[34,25], [4,13],[4,13],[4,9],[1,5],[5,10],[6,9], [2,36],[2,36],[16,36],[4,39],[0,39],[32,14], [5,6],[8,6],[10,6],[0,3],[10,3],[1,4]].map(([x,y])=>({x,y}));
async function build({catalog=contentData.load(),write=true,development=true,sourceOnly=false}={}){
const content=contentData.compile(catalog,{specialize:true}),{enemyTiles,weaponTiles}=content;
const bossTiles=[28,30,38].flatMap(x=>[0,1,2,3].map(i=>({x:x+i%2,y:48+(i>>1)})));
if(write)fs.writeFileSync(path.join(root,'assets/catalog/runtime-selection.json'),JSON.stringify({pantry,enemyTiles,bossTiles,weapons:weaponTiles,pickup:[{x:33,y:4}],player:[{x:104,y:0},{x:104,y:46},{x:105,y:46},{x:106,y:46}]},null,2)+'\n');
const sources=quantizeColors(content.source+require('./landmark-data.cjs')()+content.transform(['src/room.js','src/actions.js','src/world.js','src/game.js'].map(read).join('\n')));
const reports={},artifacts={};
for(const dev of development?[true,false]:[false]){
 const enemyColumns=enemyTiles;
 const characters=dev?spec.tiles:[],tiles=[...characters,{x:33,y:4},...pantry,...weaponTiles,...enemyTiles,...bossTiles],bits=Buffer.concat([pack(tiles),characterBits]);
 const assets=JSON.stringify({bits:bits.toString('base64'),last:dev?103+characters.length-1:104,loot:characters.length,pantry:characters.length+1,weapon:characters.length+1+pantry.length,weaponCount:weaponTiles.length,enemies:tiles.length-bossTiles.length-enemyTiles.length,enemyCount:enemyTiles.length,bosses:tiles.length-bossTiles.length,actor:tiles.length});
 const template=quantizeColors(read(dev?'src/dev.html':'src/index.html'));
 const css=template.match(/<style>([\s\S]*?)<\/style>/)[1];
 let code=transformSync('const assets='+assets+';\n'+(dev?read('src/dev.js'):'')+'\n'+(dev?sources:sourceOnly?compactSource(sources):releaseLayout(sources)),{minify:true,format:'iife',target:'es2020',define:{DEV:String(dev)}}).code;
 // The property allowlist contains game-owned fields only; keep browser API properties out.
 if(!dev)code=(await require('terser').minify(code,{compress:{passes:3},mangle:{properties:{builtins:true,regex:/^(weaponCount|enemyCount|enemies|bosses|pantry|loot|actor|bits|hazards|features|spawn|condition|detail|solid|objects|gate|visited|offset|temper|damage|friendly|curve|pattern|phase|cooldown|direction|inputs|shape|rooms|nodes|doors|props|flash|cycle|angle|wait|form|rule|hue|stat|disc|hit|boss|rate|pierce|weapon|cells|kind|life|age|health|reach|animation)$/}}})).code;
 const shell=template.replace(css,()=>transformSync(css,{loader:'css',minify:true}).code.trim()),render=js=>shell.replace('__CODE__',()=>js);
 let html=Buffer.from(render(code)),encoding='utf-8';
 if(!dev&&sourceOnly){
  const pooled=Buffer.from(render(poolLiterals(code)));if(pooled.length<html.length)html=pooled;
  const renamed=(await require('terser').minify(code,{compress:false,mangle:{nth_identifier:sourceEncoding.nth_identifier},format:{ascii_only:false}})).code;
  for(const variant of [renamed,poolLiterals(renamed,sourceEncoding.reserved)]){const bytes=sourceEncoding.encode(render(variant));if(bytes&&bytes.length<html.length){html=bytes;encoding='windows-1252';}}
 }

 const unpackedBytes=html.length;
 if(write&&!dev)fs.writeFileSync(path.join(root,'dev/release-source.html'),html);
 let zip,packing='none',modelMemoryMB=0;
 if(!dev&&!sourceOnly){
  const {roller,smallestEnvelope}=require('./pack-release.cjs');
  const packed=await roller(html.toString('utf8'),require('./packing-options.json'));
  const selected=await smallestEnvelope(packed.html);
  html=selected.html;zip=selected.zip;packing='roadroller+deflate';encoding='windows-1252';modelMemoryMB=packed.memoryMB;
 }else zip=zipSync({'index.html':[html,{mtime:new Date(2026,9,4)}]},{level:9});
 artifacts[dev?'development':'release']={html,zip};
 const report={enemy_definitions:catalog.enemies.length,weapon_definitions:catalog.weapons.length,power_definitions:catalog.powers.length,definition_source_bytes:Buffer.byteLength(content.source),visual_profile:'rgb444',limit:10000,budget_metric:sourceOnly?'minified_source_with_assets':'standalone_html_and_submission_zip',compliant:Math.max(html.length,sourceOnly?0:zip.length)<=10000,packing,source_encoding:encoding,decoder_model_mb:modelMemoryMB,source_bytes:unpackedBytes,html_bytes:html.length,unpacked_html_bytes:unpackedBytes,zip_bytes:zip.length,sprite_count:dev?characters.length-1:1,enemy_sprite_count:enemyColumns.length,pantry_tiles:pantry.length,sprite_data_bytes:bits.length,atlas_tiles:bits.length/18,remaining_file_bytes:10000-Math.max(html.length,sourceOnly?0:zip.length)};
 reports[dev?'development':'release']=report;
 if(write&&!dev)fs.writeFileSync(path.join(root,'dev/release-preview.html'),html);
 const decoded=unzipSync(zip);if(!Buffer.from(decoded['index.html']).equals(html))throw Error('ZIP verification failed');
 if(write){if(dev)fs.writeFileSync(path.join(root,'dev/play.html'),html);
 else{
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});
  fs.writeFileSync(path.join(root,'dist/index.html'),html);
  fs.writeFileSync(path.join(root,'dist/game.zip'),zip);
 }}
}
if(write)fs.writeFileSync(path.join(root,'dist/size-report.json'),JSON.stringify(reports,null,2)+'\n');
return{reports,artifacts};
}
module.exports=build;
if(require.main===module)build({sourceOnly:process.argv.includes('--source')}).then(({reports})=>{
 console.log(JSON.stringify(reports,null,2));
 if(!reports.release.compliant&&!process.argv.includes('--measure'))throw Error('Candidate built, but the selected budget exceeds 10,000 bytes.');
}).catch(error=>{console.error(error.message);process.exitCode=1;});
