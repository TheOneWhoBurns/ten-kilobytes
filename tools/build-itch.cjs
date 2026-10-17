const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{zipSync,unzipSync}=require('fflate');
function binary(packed){
 const marker=Buffer.from('<plaintext id=p hidden>'),offset=packed.indexOf(marker),head=packed.subarray(0,offset).toString(),size=head.match(/a\.splice\(0,(\d+)\)/)?.[1];if(!size)throw Error('Missing compressed decoder boundary');
 return{size,game:require('./read-build.cjs').decodeBytes(packed.subarray(offset+marker.length),head)};
}
(async()=>{
 const build=require('./build.cjs'),packingOptions={...require('./packing-options.json'),rawBytes:true},{artifacts}=await build({write:false,development:false,packingOptions}),packed=artifacts.release.html,version=crypto.createHash('sha256').update(packed).digest('hex').slice(0,12);
 const {game,size}=binary(packed);
 const index=Buffer.from('<script>fetch("g").then(r=>r.arrayBuffer()).then(b=>{a=new Uint8Array(b,'+size+');new Response(new Response(b.slice(0,'+size+')).body.pipeThrough(new DecompressionStream("deflate"))).text().then(eval)})</script>'),files={'index.html':index,'g':game},zip=zipSync(files);
 if(!Buffer.from(unzipSync(zip)['g']).equals(game))throw Error('Packed game changed');
 fs.mkdirSync('dist/itch',{recursive:true});for(const [name,data]of Object.entries(files))fs.writeFileSync(path.join('dist/itch',name),data);for(const name of ['game.html','game.bin'])fs.rmSync(path.join('dist/itch',name),{force:true});fs.writeFileSync('dist/hipocrene-itch.zip',zip);const report={version,gameBytes:game.length,leaderboardBytes:0,indexBytes:index.length,totalBytes:game.length+index.length,zipBytes:zip.length};fs.writeFileSync('dist/itch-size-report.json',JSON.stringify(report,null,2)+'\n');console.log(report);if(report.totalBytes>=10000)throw Error('Complete release must be below 10,000 bytes');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
