// Benchmark/test content only. These entries are never added to the live catalog.
function weapons(c){if(c.weapons.length===1)c.weapons.push(...JSON.parse(JSON.stringify(require('./fixtures/retired-weapons.json'))));return c;}
function boss(c){weapons(c);if(!c.bosses.length)c.bosses.push(JSON.parse(JSON.stringify(require('./fixtures/legacy-boss.json'))));return c;}
function enemy(c,newArt=false,index=0){
 const row={id:'benchmark-creature-'+index,attack:{mode:['ring','charge','fan'][index%3],count:5+index%4,speed:3.6+index*.1,windup:.5,cooldown:1.1,standoff:7},art:{base:6,variants:2},move:.28};
 if(newArt){row.art={base:c.enemySprites.length,variants:1};c.enemySprites.push([115,10]);}
 c.enemies.push(row);return c.enemies.length-1;
}
function weapon(c,index=0){
 weapons(c);const id='benchmark-weapon-'+index;
 c.weapons.push({id,name:'Orbit '+index,sprite:[28,8],traits:['ring','pierce'],attack:{count:6+index%4,speed:10,life:.55,reachLife:0,temperLife:0},damage:.8+index*.1,pitch:280+index*20});
 boss(c);const b=c.bosses[0];b.drop=[...(Array.isArray(b.drop)?b.drop:[b.drop]),id];return c.weapons.length-1;
}
module.exports={enemy,weapon,boss,weapons};
