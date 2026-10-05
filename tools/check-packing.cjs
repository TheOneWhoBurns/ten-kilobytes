const assert=require('node:assert/strict'),vm=require('node:vm'),{deflateSync}=require('node:zlib');
const {binaryEnvelope}=require('./pack-release.cjs'),{unpack}=require('./read-build.cjs');
// Exercise the shipped asynchronous bootstrap itself, not just the test reader.
(async()=>{
 let state=17;
 for(let n=0;n<32;n++){
  const text=Array.from({length:n*137},()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return String.fromCharCode(32+((state>>>0)%95));}).join('');
  const original='<!doctype html><title>Codec '+n+'</title><p>'+text+'</p>',html=binaryEnvelope(deflateSync(original)),decoded=new TextDecoder('l1').decode(html),marker='<plaintext id=p hidden>',start=decoded.indexOf(marker)+marker.length,payload=decoded.slice(start),script=decoded.slice(0,start).match(/onload='([^']*)'/)[1];
  assert(!payload.includes('\0')&&!payload.includes('\r'),'HTML-unsafe payload');
  assert.equal(unpack(html),original,'offline reader round trip');
  let written,closed=0;
  await vm.runInNewContext(script,{TextDecoder,Uint8Array,Response,DecompressionStream,p:{textContent:payload},document:{write:s=>{written=s;},close:()=>closed++}},{timeout:5000});
  assert.equal(written,original,'browser bootstrap byte recovery');assert.equal(closed,1,'closes rewritten document');
 }
 console.log('PASS 32 binary envelopes: HTML controls, decoder execution and exact recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
