const props=require('./prop-view.cjs'),{HAZARD_START,CLOSED}=require('./environment-data.cjs').constants;
module.exports=r=>props(r).filter(p=>p.t>=HAZARD_START-1&&p.t<CLOSED-1).map(p=>({x:p.x+.5,y:p.y+.5,offset:0,t:p.t}));
