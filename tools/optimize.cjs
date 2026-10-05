// Bounded packer comparison. Writes candidates; never changes source or release.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {envelope,zipHtml,roller}=require('./pack-release.cjs'),read=require('./read-build.cjs');
process.chdir(path.resolve(__dirname,'..'));
const source=read(process.argv[2]||'dev/release-source.html'),options=require('./packing-options.json'),dir='dev/snapshots/packing';
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const results=[];
 const native=await envelope(source,100),nativeZip=await zipHtml(native,100);
 results.push({packing:'deflate',html_bytes:native.length,zip_bytes:nativeZip.length});
 console.log(JSON.stringify(results[0]));
 for(const memory of [1,2,4,10]){
  const packed=await roller(source,{...options,maxMemoryMB:memory}),html=await envelope(packed.html,100),zip=await zipHtml(html,100);
  const row={memory_limit_mb:memory,model_memory_mb:packed.memoryMB,html_bytes:html.length,zip_bytes:zip.length};results.push(row);
  fs.writeFileSync(`${dir}/${memory}mb.html`,html);fs.writeFileSync(`${dir}/${memory}mb.zip`,zip);console.log(JSON.stringify(row));
 }
 fs.writeFileSync(dir+'/results.json',JSON.stringify({source_sha256:crypto.createHash('sha256').update(source).digest('hex'),zopfli_iterations:100,results},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
