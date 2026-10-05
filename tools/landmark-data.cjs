const {programs,parts}=require('../assets/landmarks.json');
for(const program of programs)for(const c of program)if(!'ab'.includes(c)&&!parts[c])throw Error('Unknown landmark part: '+c);
for(const part of parts)for(const row of part){
 if(row.length!==5||row.some(n=>!Number.isInteger(n)||n< -25||n>60)||row[0]<0||row[0]>6||row[3]<=0||row[4]<=0)throw Error('Invalid landmark rectangle');
}
// Store each shared rectangle as five printable characters; decode data only.
const encoded=parts.map(part=>String.fromCharCode(...part.flat().map(n=>n+60)));
module.exports=()=>`const landmarkPrograms=${JSON.stringify(programs)},landmarkParts=${JSON.stringify(encoded)}.map(s=>Array.from(s,c=>c.charCodeAt(0)-60));\n`;
