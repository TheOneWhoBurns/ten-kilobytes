// Build-only encoding. Repeated column values become defaults; each row keeps
// its differences. The emitted map reconstructs ordinary, independent arrays.
module.exports=rows=>{
 const plain=JSON.stringify(rows);
 if(!rows.length||!rows[0].length)return plain;
 const defaults=rows[0].map((_,i)=>{
  const counts=new Map();
  for(const row of rows)counts.set(row[i],(counts.get(row[i])||0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1])[0][0];
 });
 const changes=rows.map(row=>'['+row.map((n,i)=>n===defaults[i]?'':JSON.stringify(n)).join(',').replace(/,+$/,'')+']');
 const compact='['+changes.join(',')+'].map(r=>'+JSON.stringify(defaults)+'.map((n,i)=>r[i]??n))';
 return compact.length<plain.length?compact:plain;
};
