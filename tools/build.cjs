const fs=require('node:fs'),path=require('node:path');
const {PNG}=require('pngjs'),{zipSync,unzipSync}=require('fflate'),{transformSync}=require('esbuild');
const {deflateSync,inflateSync}=require('node:zlib');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sheet=PNG.sync.read(fs.readFileSync(path.join(root,'assets/source/urizen.png')));
const spec=JSON.parse(read('assets/selection.json'));
const characterSheet=PNG.sync.read(fs.readFileSync(path.join(root,'assets/generated/104-sheet.png')));
if(characterSheet.width!==72||characterSheet.height!==48)throw Error('104 sheet must be 6 × 4 tiles');
const characterBits=Buffer.alloc(24*18);
for(let t=0;t<24;t++)for(let p=0;p<144;p++){
 const n=((Math.floor(t/6)*12+Math.floor(p/12))*72+(t%6)*12+p%12)*4;
 if(characterSheet.data[n+3]>127)characterBits[t*18+(p>>3)]|=1<<(p&7);
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
   if(bit)bytes[i*18+(p>>3)]|=1<<(p&7);
  }
 });
 return bytes;
}
const pantry=[...Array.from({length:16},(_,x)=>({x,y:6})),...Array.from({length:16},(_,x)=>({x,y:3})),...Array.from({length:16},(_,x)=>({x,y:9})),...Array.from({length:8},(_,x)=>({x,y:20})),...Array.from({length:7},(_,x)=>({x,y:8})),...Array.from({length:5},(_,x)=>({x,y:10}))];
const sources=['src/room.js','src/actions.js','src/world.js','src/game.js'].map(read).join('\n');
const reports={};
(async()=>{
for(const dev of [true,false]){
 const enemyColumns=dev?Array.from({length:87},(_,i)=>114+i):[114,120,128,136,144,152,160,168,176,184,192,200];
 const characters=dev?spec.tiles:spec.tiles.slice(0,2),tiles=[...characters,{x:33,y:4},...pantry,{x:27,y:8},{x:27,y:10},{x:27,y:12},...enemyColumns.map(x=>({x,y:0}))],bits=Buffer.concat([pack(tiles),characterBits]);
 const assets=JSON.stringify({bits:bits.toString('base64'),last:103+characters.length-1,loot:characters.length,pantry:characters.length+1,weapon:characters.length+1+pantry.length,enemies:tiles.length-enemyColumns.length,enemyCount:enemyColumns.length,actor:tiles.length});
 const template=read(dev?'src/dev.html':'src/index.html');
 const css=template.match(/<style>([\s\S]*?)<\/style>/)[1];
 let code=transformSync('const assets='+assets+';\n'+(dev?read('src/dev.js'):'')+'\n'+sources,{minify:true,format:'iife',target:'es2020',define:{DEV:String(dev)}}).code;
 if(!dev)code=(await require('terser').minify(code,{compress:{passes:3},mangle:true})).code;
 let html=Buffer.from(template.replace(css,()=>transformSync(css,{loader:'css',minify:true}).code.trim()).replace('__CODE__',()=>code));
 const unpackedBytes=html.length;
 if(!dev){
  const compressed=Buffer.from(await require('@gfx/zopfli').zlibAsync(html,{numiterations:100}));
  if(!inflateSync(compressed).equals(html))throw Error('Packing verification failed');
  // Binary payload in a Windows-1252 script text node avoids base64's 33% expansion.
  // Escape every byte that HTML normalizes or that can begin a closing script tag.
  const escaped=[];for(const n of compressed){if([0,13,27,60].includes(n))escaped.push(27,n^32);else escaped.push(n);}
  const restored=[];for(let i=0;i<escaped.length;i++)restored.push(escaped[i]===27?escaped[++i]^32:escaped[i]);
  if(!Buffer.from(restored).equals(compressed))throw Error('Binary packing verification failed');
  const packed=Buffer.concat([Buffer.from('<!doctype html><meta charset=windows-1252><script id=p type=x>'),Buffer.from(escaped),Buffer.from('</script><script>let m=new TextDecoder("windows-1252").decode(new Uint8Array(256).map((_,i)=>i)),a=[],e=0;for(let c of p.textContent){let n=m.indexOf(c);if(e){a.push(n^32);e=0}else if(n===27)e=1;else a.push(n)}new Response(new Blob([new Uint8Array(a)]).stream().pipeThrough(new DecompressionStream("deflate"))).text().then(h=>{document.open().write(h);document.close()})</script>')]);
  if(packed.length<html.length)html=packed;
 }
 const zip=zipSync({'index.html':[html,{mtime:new Date(2026,9,4)}]},{level:9});
 const report={limit:10000,html_bytes:html.length,unpacked_html_bytes:unpackedBytes,zip_bytes:zip.length,sprite_count:characters.length-1,enemy_sprite_count:enemyColumns.length,pantry_tiles:pantry.length,sprite_data_bytes:bits.length,remaining_html_bytes:10000-html.length};
 reports[dev?'development':'release']=report;
 if(!dev)fs.writeFileSync(path.join(root,'dev/release-preview.html'),html);
 if(!dev&&Math.max(html.length,zip.length)>10000){console.log(JSON.stringify(report,null,2));throw Error('Over 10,000 bytes; release output was not replaced');}
 const decoded=unzipSync(zip);if(!Buffer.from(decoded['index.html']).equals(html))throw Error('ZIP verification failed');
 if(dev)fs.writeFileSync(path.join(root,'dev/play.html'),html);
 else{
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});
  fs.writeFileSync(path.join(root,'dist/index.html'),html);
  fs.writeFileSync(path.join(root,'dist/game.zip'),zip);
 }
}
fs.writeFileSync(path.join(root,'dist/size-report.json'),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
