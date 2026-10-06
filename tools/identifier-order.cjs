// Stable names keep the bitmap's character frequencies out of JS name selection.
// The complete packed artifact, not identifier length alone, selects this order.
const first='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$_',rest=[...first].reverse().join('')+'0123456789';
module.exports={
 get(n){let name=first[n%54];n=Math.floor(n/54);while(n){n--;name+=rest[n%64];n=Math.floor(n/64);}return name;},
 reset(){},sort(){},consider(){}
};
