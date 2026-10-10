const acorn=require('acorn');
module.exports=source=>{
 const fn=acorn.parse(source,{ecmaVersion:2020}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='starterKey');
 if(!fn||!fn.body.body.length)return source;
 let array=fn.body.body[0].argument;while(array.type==='MemberExpression')array=array.object;
 if(array.type!=='ArrayExpression')throw Error('Expected literal starter poses');
 const rows=JSON.parse(source.slice(array.start,array.end)).flat();
 if(rows.length!==24||rows.some(row=>row.length!==7||row.some(n=>!Number.isInteger(n)||n< -16||n>78)))throw Error('Invalid starter poses');
 const data=JSON.stringify(Array.from({length:7},(_,i)=>rows.map(row=>String.fromCharCode(row[i]+48)).join('')).join(''));
 return source.slice(0,fn.start)+`function starterKey(a,pose){const i=pose*8+(Math.round(a*4/Math.PI)+8)%8;return [0,1,2,3,4,5,6].map(k=>${data}.charCodeAt(k*24+i)-48);}`+source.slice(fn.end);
};
