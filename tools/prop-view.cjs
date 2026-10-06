// Test/documentation view; runtime stores decoration in the room grid's upper bits.
module.exports=r=>r.props||Array.from(r.cells,(v,n)=>v>>1?{x:n%31,y:n/31|0,t:(v>>1)-1}:null).filter(Boolean);
