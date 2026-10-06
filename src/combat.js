// Shared geometry and attack records for both sides; only the current room lives.
let fields=[],blows=[],dash=null,gaze=0,maxHealth=2,weaponArt=0;
function drawLoot(){for(const o of objects)if(o.kind!==2)tile(ctx,o.kind===1?assets.corpses+o.value:o.kind===4?assets.armors+o.value:assets.weapon+weaponRules[o.value][W_SPRITE],Math.round(o.x*12)-6,Math.round(o.y*12)-6);}
function seek(e,target,dt,speed){
 const a=Math.atan2(target.y-e.y,target.x-e.x),turn=e.form&1?Math.PI/2:-Math.PI/2;
 for(const offset of [0,turn,-turn,Math.PI]){const x=Math.cos(a+offset),y=Math.sin(a+offset);if(canFit(room.cells,e.x+x*.4,e.y+y*.4)){movePlayer(room.cells,e,x,y,dt,speed);break;}}
}
// A field stores a shape, not hundreds of tile records. The same predicate draws and hits.
function spellCell(f,n){
 if(!(room.cells[n]&1))return -1;
 // Shapes: 0 line, 1 line with a cross bar, 4 distant 3×3 patch, 5 self-centred 3×3 patch.
 const x=n%W+.5-f.x,y=(n/W|0)+.5-f.y,u=x*Math.cos(f.a)+y*Math.sin(f.a),v=y*Math.cos(f.a)-x*Math.sin(f.a),s=f.shape;
 return (s<2?u>.5&&Math.abs(v)<.55||s&&Math.abs(u-5)<.55&&Math.abs(v)<6:Math.abs(x)<1.5&&Math.abs(y)<1.5)?(s>4?0:s>3?Math.abs(x)+Math.abs(y):Math.max(u,Math.abs(v)))*.1:-1;
}
function cast(p,a,shape,friendly=false,warn=.8){
 if(fields.length>=12)return;
 const origin=shape===4?friendly?{x:p.x+Math.cos(a)*4,y:p.y+Math.sin(a)*4}:player:p,f={x:(origin.x|0)+.5,y:(origin.y|0)+.5,a,shape,age:0,burn:0,damage:friendly?2:0,hit:[]};
 for(let n=0;n<W*H;n++)f.burn=Math.max(f.burn,spellCell(f,n)+warn);
 fields.push(f);tone(friendly?430:170,.09,'triangle',.015);
}
function melee(a,reach,damage,wide=false,origin=player,hit=[]){
 for(const e of room.enemies){const x=e.x-origin.x,y=e.y-origin.y,u=x*Math.cos(a)+y*Math.sin(a),v=y*Math.cos(a)-x*Math.sin(a);
  if(e.hp>0&&!hit.includes(e)&&(wide===7?u>0&&u<2.8&&Math.abs(v)<1.2:Math.hypot(x,y)<reach+(e.boss?.5:0)&&(wide||Math.cos(Math.atan2(y,x)-a)>.2))&&clearShot(origin,e)){hit.push(e);hitEnemy(e,damage);}
 }
 return hit;
}
function strike(kind,a,damage,reach,delay=0){const b={kind,a,damage,reach,age:-delay,hit:[]};blows.push(b);return b;}
function tickCombat(dt){
 if(!health)return;
 for(const b of blows){b.age+=dt;if(b.age<0)continue;const a=b.a+(b.kind===3?(b.age/.36-.5)*2:0);
  if(b.kind<8&&(b.kind!==6||b.age>.24)){if(b.kind===6)movePlayer(room.cells,player,Math.cos(a),Math.sin(a),dt,28);melee(a,b.reach,b.damage,b.kind===7?7:b.kind===4,player,b.hit);}
 }
 blows=blows.filter(b=>b.age<(b.kind===6?.42:b.kind===3?.36:.22));if(dash?.age>=.42)dash=null;
 for(const f of fields){f.age+=dt;if(f.age<f.burn||f.age>f.burn+1.2)continue;
  if(f.damage){for(const e of room.enemies)if(e.hp>0&&!f.hit.includes(e)&&spellCell(f,(e.y|0)*W+(e.x|0))>=0){f.hit.push(e);hitEnemy(e,f.damage);}}
  else if(spellCell(f,(player.y|0)*W+(player.x|0))>=0)hurtPlayer();
 }
 fields=fields.filter(f=>f.age<f.burn+1.2);
}

function drawCombat(){
 for(const f of fields)for(let n=0;n<W*H;n++){const delay=spellCell(f,n),t=f.age;if(delay<0||t<delay||t>f.burn-.15&&t<f.burn||t>f.burn+1.2)continue;const x=n%W*12,y=(n/W|0)*12;ctx.globalAlpha=t<f.burn-.5?.65:1;tile(ctx,t<f.burn?assets.warning+(t>=f.burn-.5?1:0):assets.flame+Math.floor(worldTime*12)%3,x,y);ctx.globalAlpha=1;}
 // Every blow draws the held weapon: swung, spun (four copies), thrust, or doubled in size.
 // Blows draw the held weapon: swung, spun (four copies), held level along a thrust or cast,
 // raised overhead while a heavy hit winds up. The one-two's second jab is a plain fist.
 for(const b of blows){const k=b.kind,n=k===4?4:1;ctx.save();ctx.translate(player.x*12,player.y*12-4);
  if(b.age<0){if(k===7)tile(ctx,assets.weapon+weaponArt,-6,-20);}
  else if(k===5){ctx.rotate(b.a);ctx.fillStyle='#efefdb';ctx.fillRect(9,2,3,3);}
  else{ctx.rotate(b.a+(k===3?(b.age/.36-.5)*2:k===4?b.age*24:k>5?Math.PI/4:0));if(k===7)ctx.scale(1.5,1.5);
   for(let i=0;i<n;i++){ctx.rotate(Math.PI*2/n);tile(ctx,assets.weapon+weaponArt,n>1?12:k>5?0:6,k>5?-12:-6);}}ctx.restore();}
 if(gaze)tile(ctx,assets.effects+1+Math.min(3,Math.floor(gaze/1.5)),Math.round(player.x*12)-6,Math.round(player.y*12)-24);
}
