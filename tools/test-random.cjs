// Frozen pre-optimization generator. Feeding its stream to native Math.random
// lets the release and seeded dev engine receive identical procedural choices.
module.exports=value=>{
 let s=0;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);
 return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
};
