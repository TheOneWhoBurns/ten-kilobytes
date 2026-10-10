// itch.io serves HTML as UTF-8. Keep the packed Cyrillic bytes in a binary asset,
// decode explicitly, then replace the hosting document with the original game.
const fs=require('node:fs'),{zipSync,unzipSync}=require('fflate');
const game=fs.readFileSync('dist/index.html');
const loader=Buffer.from('<script>fetch("game.bin").then(r=>r.arrayBuffer()).then((b,d=document)=>{d.open();d.write(new TextDecoder("cyrillic").decode(b));d.close()})</script>');
const bytes=game.length+loader.length;
if(bytes>10000)throw Error('Itch bundle exceeds 10,000 unpacked bytes: '+bytes);
const zip=zipSync({'index.html':loader,'game.bin':game});
if(!Buffer.from(unzipSync(zip)['game.bin']).equals(game))throw Error('Packed game changed');
fs.writeFileSync('dist/hipocrene-itch.zip',zip);
console.log(`itch.io: ${game.length} game + ${loader.length} loader = ${bytes} bytes (${zip.length} ZIP)`);
