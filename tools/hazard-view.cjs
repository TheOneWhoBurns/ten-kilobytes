// Test-only view of hazard centers from the authoritative visible tile records.
module.exports=r=>r.props.filter(p=>p.t%6===3).map(p=>({x:p.x+.5,y:p.y+.5,offset:r.offset}));
