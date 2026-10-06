const fs=require('node:fs'),vm=require('node:vm'),{inflateSync}=require('node:zlib'),acorn=require('acorn');
const cache=new Map();
function unpack(bytes,depth=0){
 if(depth>4)throw Error('Too many packaging layers');
 const plaintext=Buffer.from('<plaintext id=p hidden>'),plainOffset=bytes.indexOf(plaintext);
 if(plainOffset>=0){
  const decoder=bytes.subarray(0,plainOffset).toString('ascii').match(/onload='([^']*)'/)?.[1];
  if(!decoder)throw Error('Missing plaintext bootstrap');
  const payload=decodeBytes(bytes.subarray(plainOffset+plaintext.length),decoder),size=decoder.match(/a\.splice\(0,(\d+)\)/)?.[1];
  if(size)return unpackProgram(inflateSync(payload.subarray(0,+size)).toString(),depth+1,{a:Array.from(payload.subarray(+size))});
  const data=inflateSync(payload);
  return decoder.includes('eval(h)')?unpackProgram(data.toString(),depth+1):unpack(data,depth+1);
 }
 const start=Buffer.from('<script id=p type=x>'),offset=bytes.indexOf(start);
 if(offset>=0){
  const end=bytes.indexOf(Buffer.from('</script>'),offset),encoded=bytes.subarray(offset+start.length,end),decoder=bytes.subarray(end).toString('ascii');
  return unpack(inflateSync(decodeBytes(encoded,decoder)),depth+1);
 }
 const html=/charset=["']?(?:l1|windows-1252)\b/i.test(bytes.subarray(0,256).toString('ascii'))?new TextDecoder('windows-1252').decode(bytes):bytes.toString(),legacy=html.match(/data-game="([^"]+)"/);if(legacy)return unpack(inflateSync(Buffer.from(legacy[1],'base64')),depth+1);
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 if(script&&/^(?:eval|document\.write)\(Function\(/.test(script))return unpackProgram(script,depth+1);
 return html;
}
function unpackProgram(script,depth,scope={}){
 let program=script;
 if(/^eval\(|^document\.write\(Function\(/.test(script)){
  let written;vm.runInNewContext(script,{...scope,TextDecoder,eval:s=>program=s,document:{write:s=>written=s,close(){}}},{timeout:10000});
  if(written!==undefined)return unpack(Buffer.from(written),depth+1);
 }
 const first=acorn.parse(program,{ecmaVersion:2020}).body[0],call=first?.expression;
 if(call?.callee?.object?.name!=='document'||call.callee.property.name!=='write'||typeof call.arguments[0]?.value!=='string')throw Error('Unknown game bootstrap');
 const shell=call.arguments[0].value,code=program.slice(first.end);
 if(!code)return shell;
 return shell.replace('</html>',()=>'<script>'+code+'</script></html>');
}
function decodeBytes(encoded,decoder){
 const escape=+(decoder.match(/n===(\d+)\?e=32/)?.[1]??27),xor=+(decoder.match(/a\.push\(n\^e\^(\d+)\)/)?.[1]??0),raw=[];
 for(let i=0;i<encoded.length;i++)raw.push((encoded[i]===escape?encoded[++i]^32:encoded[i])^xor);
 return Buffer.from(raw);
}
module.exports=file=>{const bytes=fs.readFileSync(file),old=cache.get(file);if(old?.bytes.equals(bytes))return old.html;const html=unpack(bytes);cache.set(file,{bytes,html});return html;};
module.exports.unpack=unpack;
