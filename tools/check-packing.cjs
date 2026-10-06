const assert=require('node:assert/strict'),vm=require('node:vm'),{deflateSync}=require('node:zlib');
const {binaryEnvelope,envelope,roller}=require('./pack-release.cjs'),{unpack}=require('./read-build.cjs');
// Exercise the shipped asynchronous bootstrap itself, not just the test reader.
(async()=>{
 // Terser handles reserved words; the generator must supply unique lexical names.
 const names=Array.from({length:20000},(_,i)=>require('./identifier-order.cjs').get(i));
 assert.equal(new Set(names).size,names.length,'identifier candidates never collide across digit-width boundaries');
 assert(names.every(n=>/^[A-Za-z$_][A-Za-z$_0-9]*$/.test(n)),'identifier candidates use valid character positions');
 let state=17;
 for(let n=0;n<32;n++)for(const executable of [false,true]){
  const text=Array.from({length:n*137},()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return String.fromCharCode(32+((state>>>0)%95));}).join('');
  const original='<!doctype html><title>Codec '+n+'</title><p>'+text+'</p>',input=executable?'document.write('+JSON.stringify(original)+')':original,html=binaryEnvelope(deflateSync(input),executable),decoded=new TextDecoder('cyrillic').decode(html),marker='<plaintext id=p hidden>',start=decoded.indexOf(marker)+marker.length,payload=decoded.slice(start),script=decoded.slice(0,start).match(/onload='([^']*)'/)[1];
  assert(!payload.includes('\0')&&!payload.includes('\r'),'HTML-unsafe payload');
  assert.equal(unpack(html),original,'offline reader round trip');
  let written,closed=0;
  await vm.runInNewContext(script,{TextDecoder,Uint8Array,Response,DecompressionStream,p:{textContent:payload},document:{write:s=>{written=s;},close:()=>closed++}},{timeout:5000});
  assert.equal(written,original,'browser bootstrap byte recovery');assert.equal(closed,1,'closes rewritten document');
 }
 const minimal='<!doctype html><canvas id=game></canvas>',minimalProgram='document.write('+JSON.stringify(minimal)+');result=42;',minimalEnvelope=binaryEnvelope(deflateSync(minimalProgram),true);
 assert.equal(unpack(minimalEnvelope),minimal+'<script>result=42;</script>','minimal HTML retains its decoded executable without a closing html tag');
 const bytes=Buffer.from(Array.from({length:256},(_,i)=>i)),all=new TextDecoder('cyrillic').decode(binaryEnvelope(bytes)),mark='<plaintext id=p hidden>',begin=all.indexOf(mark)+mark.length,bootstrap=all.slice(0,begin).match(/onload='([^']*)'/)[1];
 const recovered=vm.runInNewContext(bootstrap.slice(0,bootstrap.indexOf('new Response'))+'a',{p:{textContent:all.slice(begin)}});
 assert.deepEqual(Buffer.from(recovered),bytes,'every byte survives HTML encoding and escape recovery');
 for(let n=0;n<4;n++){
  const original='<!doctype html><p>Stream '+n+' λ · 𓅃</p>',program='document.write('+JSON.stringify(original)+')',payload=Buffer.from(program);
  const html=await envelope('eval(new TextDecoder().decode(new Uint8Array(a)))',10,true,payload),decoded=new TextDecoder('cyrillic').decode(html),start=decoded.indexOf(mark)+mark.length,script=decoded.slice(0,start).match(/onload='([^']*)'/)[1];
  assert.equal(unpack(html),original,'separate code/data reader round trip');
  let written,closed=0;await vm.runInNewContext(script,{TextDecoder,Uint8Array,Response,DecompressionStream,p:{textContent:decoded.slice(start)},document:{write:s=>written=s,close:()=>closed++}},{timeout:5000});
  assert.equal(written,original,'native bootstrap preserves its raw data tail');assert.equal(closed,1);
 }
 // Exercise the actual byte-rANS decoder through the asynchronous HTML loader.
 // These inputs cover text escapes, nested strings and highly repetitive data.
 for(const value of ['', 'λ · 𓅃\n"\\`', Array.from({length:128},(_,i)=>String.fromCharCode(i)).join(''), 'charge,fan,ring;'.repeat(200)]){
  const source='<!doctype html><html><p>Codec</p><script>result='+JSON.stringify(value)+';</script></html>',packed=await roller(source,require('./packing-options.json'),0,true),html=await envelope(packed.code,10,true,packed.data),decoded=new TextDecoder('cyrillic').decode(html),start=decoded.indexOf(mark)+mark.length,script=decoded.slice(0,start).match(/onload='([^']*)'/)[1];
  let written,closed=0;const context={TextDecoder,Uint8Array,Response,DecompressionStream,p:{textContent:decoded.slice(start)},document:{write:s=>written=s,close:()=>closed++}};
  await vm.runInNewContext(script,context,{timeout:5000});
  assert.equal(context.result,value,'byte-rANS program result');assert.equal(written,'<!doctype html><html><p>Codec</p></html>');assert.equal(closed,1);
  assert(unpack(html).includes('<script>'),'offline reader recognizes byte-rANS game');
 }
 await assert.rejects(roller('<html><script>result=String.raw`λ`;</script></html>',require('./packing-options.json'),0,true),/changed the program/,'raw template contents are semantic, not disposable string spelling');
 console.log('PASS 64 binary envelopes, eight split code/data bootstraps including byte-rANS, all 256 byte values and exact recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
