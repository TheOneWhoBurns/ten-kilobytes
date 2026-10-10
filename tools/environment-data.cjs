const groups=require('../assets/environment.json');
const tiles=[...groups.floors,...groups.walls,...groups.props,...groups.hazards.map(h=>h.tile)].map(tile=>tile?{x:tile[0],y:tile[1]}:{blank:true});
const constants={FLOOR_COUNT:groups.floors.length,WALL_COUNT:groups.walls.length,PROP_START:groups.floors.length+groups.walls.length,PROP_COUNT:groups.props.length,PANTRY_COUNT:tiles.length};
for(const effect of ['needle','web','ice','fire','spike','trap','radiation']){const i=groups.hazards.findIndex(h=>h.effect===effect);if(i<0)throw Error('Missing environmental hazard '+effect);constants[effect.toUpperCase()]=constants.PROP_START+constants.PROP_COUNT+i+1;}
constants.HAZARD_START=constants.PROP_START+constants.PROP_COUNT+1;constants.CLOSED=tiles.length+1;
module.exports={groups,tiles,constants,source:'const '+Object.entries(constants).map(([k,v])=>k+'='+v).join(',')+';\n'};
