const normalize=v=>(v|32)>96&&(v|32)<123?65:v>47&&v<58?48:v;
module.exports={normalize,expression:name=>normalize.toString().split('=>')[1].replace(/\bv\b/g,name)};
