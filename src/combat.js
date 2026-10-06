// Shared geometry and attack records for both sides; only the current room lives.
let fields=[],blows=[],dash=null,gaze=0,maxHealth=2,weaponArt=0;
function drawLoot(){for(const o of objects)if(o.kind!==2)tile(ctx,o.kind===4?assets.armors+o.value:assets.weapon+(o.art??weaponRules[o.value][W_SPRITE]),Math.round(o.x*12)-6,Math.round(o.y*12)-6);}
function seek(e,target,dt,speed){
 if(clearShot(e,target)){movePlayer(room.cells,e,target.x-e.x,target.y-e.y,dt,speed);return;}
 const n=(e.y|0)*W+(e.x|0);let best=navDistances[n],next;
 for(const k of [n-1,n+1,n-W,n+W])if(Math.abs(k%W-n%W)<2&&navDistances[k]<best){best=navDistances[k];next=k;}
 if(next!==undefined)movePlayer(room.cells,e,next%W+.5-e.x,(next/W|0)+.5-e.y,dt,speed);
}
function cast(p,a,shape,friendly=false){
 const cells=new Map(),x=p.x,y=p.y,dx=Math.cos(a),dy=Math.sin(a);
 const add=(xx,yy,delay)=>{xx=Math.floor(xx);yy=Math.floor(yy);const n=yy*W+xx;if(xx>=0&&xx<W&&yy>=0&&yy<H&&room.cells[n]===1&&!cells.has(n))cells.set(n,delay);};
 if(shape<3){
  for(let i=1;i<W+H;i++){const xx=x+dx*i,yy=y+dy*i;add(xx,yy,i*.1);
   if(shape===1&&i<7){add(x+dx*5-dy*i,y+dy*5+dx*i,i*.1);add(x+dx*5+dy*i,y+dy*5-dx*i,i*.1);}
   if(shape===2&&i>3)for(const sign of [-1,1])add(xx-dy*(i-3)*sign,yy+dx*(i-3)*sign,i*.1);
  }
 }else if(shape===3){for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++){const d=Math.hypot(xx+.5-x,yy+.5-y);for(const r of [1,3,6,10,15,21,28,36])if(Math.abs(d-r)<.55)add(xx,yy,r*.1);}}
 else{const target=shape===4?player:p;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)add(target.x+xx,target.y+yy,shape===5?0:(Math.abs(xx)+Math.abs(yy))*.1);}
 if(fields.length<12)fields.push({cells,age:0,burn:Math.max(...cells.values(),0)+.8,friendly,hit:new Set()});
 tone(friendly?430:170,.09,'triangle',.015);
}
function melee(a,reach,damage,wide=false,origin=player,hit=new Set()){
 for(const e of room.enemies)if(e.hp>0&&!hit.has(e)&&Math.hypot(e.x-origin.x,e.y-origin.y)<reach+(e.boss?.5:0)&&(wide||Math.cos(Math.atan2(e.y-origin.y,e.x-origin.x)-a)>.2)&&clearShot(origin,e)){hit.add(e);hitEnemy(e,damage,origin);}
 return hit;
}
function strike(kind,a,damage,reach,delay=0){const b={kind,a,damage,reach,age:-delay,hit:new Set()};blows.push(b);return b;}
function tickCombat(dt){
 if(!health)return;
 if(dash){dash.age+=dt;if(dash.age>.24){movePlayer(room.cells,player,Math.cos(dash.a),Math.sin(dash.a),dt,28);melee(dash.a,1.8,dash.damage,false,player,dash.hit);}if(dash.age>.42)dash=null;}
 for(const b of blows){b.age+=dt;if(b.age<0)continue;const a=b.a+(b.kind===3?(b.age/.36-.5)*2:0);
  if(b.kind===5){melee(a,b.reach,b.damage);tone(130,.045);b.age=1;}
  else if(b.kind===7){for(const e of room.enemies){const x=e.x-player.x,y=e.y-player.y,d=x*Math.cos(a)+y*Math.sin(a),side=x*Math.sin(a)-y*Math.cos(a);if(e.hp>0&&!b.hit.has(e)&&d>0&&d<3.5&&Math.abs(side)<1.5&&clearShot(player,e)){b.hit.add(e);hitEnemy(e,b.damage,player);}}}
  else melee(a,b.reach,b.damage,b.kind===4,player,b.hit);
 }
 blows=blows.filter(b=>b.age<(b.kind===3?.36:.22));
 for(const f of fields){f.age+=dt;for(const [n,delay] of f.cells){const t=f.age-f.burn;if(t<0||t>.55)continue;const p=tilePoint(n);
  if(f.friendly){for(const e of room.enemies)if(e.hp>0&&!f.hit.has(e)&&Math.abs(e.x-p.x)<.75&&Math.abs(e.y-p.y)<.75){f.hit.add(e);hitEnemy(e,2,p);}}
  else if(Math.abs(player.x-p.x)<.6&&Math.abs(player.y-p.y)<.6)hurtPlayer();
 }}
 fields=fields.filter(f=>f.age<f.burn+.55);
}
function specialEnemy(e,dt){
 const rule=enemyRule(e),mode=rule[E_MODE];if(Array.isArray(mode)||mode<3)return false;
 const d=Math.hypot(e.x-player.x,e.y-player.y),a=Math.atan2(player.y-e.y,player.x-e.x),speed=rule[E_MOVE]*5;
 if(mode===3)seek(e,player,dt,speed);
 if(mode===4){const group=room.formation,dx=Math.cos(group.a),dy=Math.sin(group.a),target={x:group.x-dy*e.slot,y:group.y+dx*e.slot};e.angle=group.a;movePlayer(room.cells,e,target.x-e.x,target.y-e.y,dt,Math.min(3,Math.hypot(target.x-e.x,target.y-e.y)/dt));}
 if(mode===5){if(e.phase){if(e.wait<=0){e.hp=0;tone(55,.2,'sawtooth',.035);}}else if(d<2&&clearShot(e,player)){e.phase=1;e.wait=.8;cast(e,a,5);}else seek(e,player,dt,speed);}
 if(mode===6){
  let lead=e.follow;while(lead&&lead.hp<=0)lead=lead.follow;
  if(!lead)seek(e,player,dt,11);
  else{
   // Follow a point behind the leader along its actual traveled path, including bends.
   const path=lead.trail||[lead];let left=.85,target=path[0];
   for(let i=path.length-1;i>0;i--){const p=path[i],q=path[i-1],length=Math.hypot(p.x-q.x,p.y-q.y);if(length>=left){target={x:p.x+(q.x-p.x)*left/length,y:p.y+(q.y-p.y)*left/length};break;}left-=length;}
   if(clearShot(e,target))movePlayer(room.cells,e,target.x-e.x,target.y-e.y,dt,Math.min(11,Math.hypot(target.x-e.x,target.y-e.y)/dt));
   else{const reachable=path.find(p=>clearShot(e,p));if(reachable)movePlayer(room.cells,e,reachable.x-e.x,reachable.y-e.y,dt,Math.min(11,Math.hypot(reachable.x-e.x,reachable.y-e.y)/dt));}
  }
  const path=e.trail||(e.trail=[]),last=path[path.length-1];if(!last||Math.hypot(last.x-e.x,last.y-e.y)>.12){path.push({x:e.x,y:e.y});if(path.length>64)path.shift();}
 }
 if(mode===7){if(e.wait<=0){e.angle=a;e.wait=.7+d/rule[E_CHARGE];}const x=e.x,y=e.y;movePlayer(room.cells,e,Math.cos(e.angle),Math.sin(e.angle),dt,rule[E_CHARGE]);if(Math.hypot(e.x-x,e.y-y)<dt)e.wait=0;}
 if(mode===8){if(e.wait<=0&&clearShot(e,player)){cast(e,a,e.pattern);e.wait=3.5;}if(d>8)seek(e,player,dt,speed);}
 if(mode===9){if(e.wait<=0){e.angle=a;e.wait=7;}if(Math.cos(a-e.angle)>.866&&clearShot(e,player))room.looking=true;}
 if(mode!==4&&mode!==7&&mode!==9)e.angle=a;
 if(d<rule[E_CONTACT])hurtPlayer();return true;
}
function drawCombat(){
 for(const f of fields)for(const [n,delay]of f.cells){const t=f.age;if(t<delay||t>f.burn-.15&&t<f.burn||t>f.burn+.55)continue;const x=n%W*12,y=(n/W|0)*12;ctx.globalAlpha=t<f.burn-.5?.65:1;tile(ctx,t<f.burn?assets.warning+(t>=f.burn-.5?1:0):assets.flame+Math.floor(worldTime*12)%3,x,y);ctx.globalAlpha=1;}
 for(const b of blows)if(b.age>=0){ctx.save();ctx.translate(player.x*12,player.y*12-4);ctx.rotate(b.a);ctx.strokeStyle='#def';ctx.lineWidth=2;
  if(b.kind===4){ctx.rotate(b.age*24);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);tile(ctx,assets.effects+1,12,-6);}}
  else if(b.kind===7){ctx.globalAlpha=.4;ctx.fillStyle='#eef';ctx.fillRect(6,-18,36,36);}
  else{ctx.beginPath();const end=(b.age/.36-.5)*2;ctx.arc(0,0,22,end-.65,end);ctx.stroke();}ctx.restore();}
 if(dash){ctx.globalAlpha=.5;tile(ctx,assets.weapon+weaponArt,player.x*12-6+Math.cos(dash.a)*12,player.y*12-10+Math.sin(dash.a)*12);ctx.globalAlpha=1;}
 if(gaze)tile(ctx,assets.effects+2+Math.min(3,Math.floor(gaze/1.5)),Math.round(player.x*12)-6,Math.round(player.y*12)-24);
}
