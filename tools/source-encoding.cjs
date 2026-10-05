// Plain JavaScript identifiers can use the letter characters in Windows-1252.
// The larger one-byte alphabet avoids some two-byte generated identifiers.
const mapping=new TextDecoder('windows-1252').decode(Uint8Array.from({length:256},(_,i)=>i));
const alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'+[...mapping.slice(128)].filter(c=>/^\p{ID_Start}$/u.test(c)).join('');
const reserved=[...'øùúûüýþÿ'],letters=[...alphabet].filter(c=>!reserved.includes(c)).join('');
const nth_identifier={get(n){let s='';do{s+=letters[n%letters.length];n=Math.floor(n/letters.length)-1;}while(n>=0);return s;}};
function encode(html){
 if(!html.includes('charset="utf-8"'))return null;
 const source=html.replace('charset="utf-8"','charset="l1"'),bytes=[];
 for(const c of source){const n=mapping.indexOf(c);if(n<0)return null;bytes.push(n);}
 return Buffer.from(bytes);
}
module.exports={nth_identifier,encode,reserved};
