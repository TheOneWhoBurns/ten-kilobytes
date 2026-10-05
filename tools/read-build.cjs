const fs=require('node:fs'),{inflateSync}=require('node:zlib');
module.exports=file=>{
 const bytes=fs.readFileSync(file),start=Buffer.from('<script id=p type=x>'),offset=bytes.indexOf(start);
 if(offset>=0){const encoded=bytes.subarray(offset+start.length,bytes.indexOf(Buffer.from('</script>'),offset)),raw=[];for(let i=0;i<encoded.length;i++)raw.push(encoded[i]===27?encoded[++i]^32:encoded[i]);return inflateSync(Buffer.from(raw)).toString();}
 const html=bytes.toString(),packed=html.match(/data-game="([^"]+)"/);return packed?inflateSync(Buffer.from(packed[1],'base64')).toString():html;
};
