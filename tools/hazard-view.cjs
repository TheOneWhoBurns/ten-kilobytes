const props=require('./prop-view.cjs');
module.exports=r=>props(r).filter(p=>p.t%6===3).map(p=>({x:p.x+.5,y:p.y+.5,offset:r.offset}));
