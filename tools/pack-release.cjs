const {inflateSync,inflateRawSync}=require('node:zlib');
const {unzipSync}=require('fflate');
const zopfli=require('@gfx/zopfli');
// l1 is a browser encoding label for Windows-1252 (also for TextDecoder).
const prefix=(escape,xor)=>'<meta charset=l1><body onload=\'let m=new TextDecoder("l1").decode(new Uint8Array(256).map((_,i)=>i)),a=[],e=0;for(let c of p.textContent){let n=m.indexOf(c);n==='+escape+'?e=32:(a.push(n^e'+(xor?'^'+xor:'')+'),e=0)}new Response(new Response(new Uint8Array(a)).body.pipeThrough(new DecompressionStream("deflate"))).text().then(h=>{document.write(h);document.close()})\'><plaintext id=p hidden>';
function binaryEnvelope(compressed){
 // Select an XOR alphabet and a rare escape byte. This is an exact byte
 // permutation: it reduces HTML escaping without altering the Deflate stream.
 const counts=new Uint32Array(256);
 for(const n of compressed)counts[n]++;
 let best;
 for(let xor=0;xor<256;xor++)for(let escape=1;escape<100;escape++){
  // Plaintext consumes the rest of the document verbatim: tag/comment/entity
  // escaping is unnecessary. Only NUL, CR and the escape marker need coding.
  // XOR-32 payloads for NUL/CR must not themselves equal the escape marker.
  if([13,32,45].includes(escape))continue;
  const head=prefix(escape,xor),cost=counts[xor]+counts[13^xor]+counts[escape^xor]+head.length;
  if(!best||cost<best.cost)best={xor,escape,head,cost};
 }
 const {xor,escape,head}=best,escaped=[];
 for(const value of compressed){const n=value^xor;if([0,13,escape].includes(n))escaped.push(escape,n^32);else escaped.push(n);}
 const restored=[];for(let i=0;i<escaped.length;i++)restored.push((escaped[i]===escape?escaped[++i]^32:escaped[i])^xor);
 if(!Buffer.from(restored).equals(compressed))throw Error('Binary alphabet round trip failed');
 return Buffer.concat([Buffer.from(head),Buffer.from(escaped)]);
}
async function envelope(html,iterations=1000){
 const input=Buffer.from(html),compressed=Buffer.from(await zopfli.zlibAsync(input,{numiterations:iterations}));
 if(!inflateSync(compressed).equals(input))throw Error('Deflate round trip failed');
 return binaryEnvelope(compressed);
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let c=-1;for(const n of bytes)c=crcTable[(c^n)&255]^(c>>>8);return(c^-1)>>>0;}
async function zipHtml(html,iterations=1000){
 const input=Buffer.from(html),data=Buffer.from(await zopfli.deflateAsync(input,{numiterations:iterations})),name=Buffer.from('index.html'),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22),crc=crc32(input),date=(2026-1980)<<9|10<<5|4;
 if(!inflateRawSync(data).equals(input))throw Error('ZIP stream round trip failed');
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt16LE(date,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(input.length,22);local.writeUInt16LE(name.length,26);
 central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt16LE(date,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(input.length,24);central.writeUInt16LE(name.length,28);
 const offset=local.length+name.length+data.length;end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(offset,16);
 const zip=Buffer.concat([local,name,data,central,name,end]);if(!Buffer.from(unzipSync(zip)['index.html']).equals(input))throw Error('ZIP archive round trip failed');return zip;
}
function jsInput(html){return 'document.write('+JSON.stringify(html.replace(/<script>[\s\S]*?<\/script>/,''))+');'+html.match(/<script>([\s\S]*?)<\/script>/)[1];}
async function roller(html,options,optimize=0){
 const {Packer}=await import('roadroller'),data=jsInput(html),packer=new Packer([{data,type:'js',action:'eval'}],options);
 const result=optimize?await packer.optimize(optimize):null,packed=packer.makeDecoder(),code=packed.firstLine+packed.secondLine;
 // Preprocessing normalizes string escapes. Compare parsed programs, not source spelling.
 let restored;require('node:vm').runInNewContext(code,{eval:s=>restored=s},{timeout:10000});
 const canonical=s=>JSON.stringify(require('acorn').parse(s,{ecmaVersion:2020}),(k,v)=>['start','end','raw'].includes(k)?undefined:v);
 if(canonical(data)!==canonical(restored))throw Error('Roadroller changed the program');
 return{html:'<!doctype html><meta charset=utf-8><script>'+code.replace(/<\/script/gi,'<\\/script')+'</script>',options:packer.options,memoryMB:packer.memoryUsageMB,search:result};
}
async function smallestEnvelope(source){
 // More inner compression can make the final ZIP larger. Select by delivered
 // bytes, including HTML escaping, bootstrap and the outer archive.
 let best;
 for(const iterations of [10,100,300,1000]){
  const html=await envelope(source,iterations),zip=await zipHtml(html);
  if(!best||Math.max(html.length,zip.length)<Math.max(best.html.length,best.zip.length))best={html,zip,iterations};
 }
 return best;
}
module.exports={envelope,zipHtml,roller,jsInput,smallestEnvelope,binaryEnvelope};
