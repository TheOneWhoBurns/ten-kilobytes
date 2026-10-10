// Shared geometry and attack records for both sides; only the current room lives.
let fields=[],blows=[],dash=null,gaze=0,maxHealth=2,weaponArt=0,routes=new Map();
function drawLoot(){for(const o of objects)if(o.kind!==2){const w=weaponRules[o.value];tile(ctx,o.kind===5?assets.pantry+RADIATION-1:o.kind===1?assets.corpses+o.value:o.kind===4?assets.armors+o.value:assets.weapon+w[W_SPRITE],Math.round(o.x*12)-6,Math.round(o.y*12)-6);}}
function seek(e,target,dt,speed){
 let p=target;
 if(!clearShot(e,target)){
  const goal=(target.y|0)*W+(target.x|0),cell=(e.y|0)*W+(e.x|0);
  let costs=routes.get(goal);
  if(!costs){costs=flood(room.cells,goal);routes.set(goal,costs);}
  let next=cell;
  for(const n of neighbors(cell))if(costs[n]&&costs[n]<costs[next])next=n;
  p=tilePoint(next);if(!clearShot(e,p))p=tilePoint(cell);
 }
 movePlayer(room.cells,e,p.x-e.x,p.y-e.y,dt,Math.min(speed,geomDistance(p,e)/dt));
}
function extinguish(){
 if(room.enemies.some(e=>e.hp>0))return;
 for(let n=0;n<W*H;n++)if((room.cells[n]>>1)===FIRE)room.cells[n]=1;
 fields=fields.filter(f=>f.damage);
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
 fields.push(f);tone(friendly?430:170,.09,'triangle',.015);return f;
}
function hurtbox(e=player){
 if(e===player)return{x:e.x,y:e.y-.22,rx:.22,ry:.28};
 const rule=enemyRule(e);return{x:e.x,y:e.y+rule[E_BODY_Y],rx:rule[E_RADIUS_X],ry:rule[E_RADIUS_Y]};
}
function capsuleHit(ax,ay,bx,by,r,e){
 const h=hurtbox(e),rx=h.rx+r,ry=h.ry+r,x=(ax-h.x)/rx,y=(ay-h.y)/ry,dx=(bx-ax)/rx,dy=(by-ay)/ry,t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
 return (x+dx*t)**2+(y+dy*t)**2<=1;
}
function boxHit(x,y,a,start,end,width,e){
 const h=hurtbox(e),c=Math.cos(a),s=Math.sin(a),dx=h.x-x,dy=h.y-y,u=dx*c+dy*s,v=dy*c-dx*s,rx=Math.hypot(h.rx*c,h.ry*s),ry=Math.hypot(h.rx*s,h.ry*c);
 return ((u-Math.max(start,Math.min(end,u)))/rx)**2+((v-Math.max(-width,Math.min(width,v)))/ry)**2<=1;
}
function touchEnemy(e){
 const rule=enemyRule(e),a=hurtbox(),b=hurtbox(e),scale=.8*rule[E_CONTACT]/(BOSS_COUNT&&e.boss?1.1:.55);
 return scale>0&&((a.x-b.x)/(a.rx+b.rx*scale))**2+((a.y-b.y)/(a.ry+b.ry*scale))**2<1;
}
function starterKey(a,pose){return [[[4,-1,6,0,0,0,0],[3,-2,3,6,0,0,0],[4,0,4,0,0,0,12],[4,0,-3,4,0,0,12],[3,-1,6,0,0,0,6],[3,-2,0,2,0,0,6],[-3,-1,6,1,0,0,18],[-3,-2,-1,1,0,0,18]],[[-5,-3,0,1,-4,0,0],[-4,-9,1,1,-3,-3,0],[3,-9,2,5,0,-4,12],[7,-6,3,4,3,-3,12],[8,-2,4,4,4,0,6],[6,2,5,4,3,3,6],[-2,4,6,5,0,4,18],[-6,3,7,5,-3,3,18]],[[7,-3,0,0,4,0,3],[6,0,1,4,3,3,3],[2,3,2,4,0,4,15],[-2,2,3,4,-2,3,15],[-5,-3,4,4,-2,0,9],[-4,-3,5,5,-1,-1,9],[-3,-6,6,5,0,-3,21],[-2,-4,7,5,1,-1,21]]][pose][(Math.round(a*4/Math.PI)+8)%8];}
function starterMotion(b,age=b.age){
 const pose=age<-.06?0:age<0?1:age<.16?2:0,end=starterKey(b.a,pose),start=starterKey(b.a,pose===1?0:pose===2?1:2),t=pose===0?age<0?1:Math.min(1,(age-.16)/.05):pose===1?Math.min(1,(age+.06)/.04)**2:1-(1-Math.min(1,age/.035))**2;
 return end.map((v,i)=>i===0||i===1||i===4||i===5?start[i]+(v-start[i])*t-(b.step?.[i%2]||0)*(1-t):v).concat(pose);
}
function blowShape(b,age=b.age){
 if(b.kind===0){const p=starterMotion(b,age),c=Math.cos(b.a),s=Math.sin(b.a),side=(-p[0]*s+(p[1]+3)*c)/12;return{x:player.x-side*s,y:player.y-.25+side*c,a:b.a,start:.25,end:Math.max(.25,Math.min((b.reach??1.6)-.1,(p[0]*c+(p[1]+3)*s)/12+(p[2]&1?1.2:.9)+(b.reach??1.6)-1.6)),radius:.25,width:0};}
 const k=b.kind,r=b.reach??(k===6?1.18:1.6),a=b.a+(k===3?(Math.max(0,Math.min(.18,age))/.18-.5)*2:0);
 return {x:player.x+(k===5&&Math.sin(a)<-.9?1/6:0),y:player.y-(k===0||k===5?.25:1/3),a,start:k===4?0:.25,end:k===4?0:Math.max(0,r-(k===0?.25:k===5?1/12:k===3?.15:k===6?.18:0)),radius:k===4?r:k===0?.25:k===5?1/12:k===6?.18:.15,width:k===7?.85:0};
}
function hitBlow(b,from,previousAge=b.age){
 if(b.age<0||b.kind===6&&b.age<.24||b.kind===0&&previousAge>=.16||b.kind===5&&previousAge>.1||b.kind===8)return;
 const samples=b.kind===3?Math.max(1,Math.ceil(Math.abs(b.age-previousAge)/.018)):1;
 for(let i=1;i<=samples;i++){const shape=blowShape(b,previousAge+(b.age-previousAge)*i/samples),{x,y,a,start,end,radius,width}=shape,c=Math.cos(a),s=Math.sin(a);
  for(const e of room.enemies)if(e.hp>0&&!b.hit.includes(e)&&(width?boxHit(x,y,a,start,end,width,e):capsuleHit(from?from.x:x+c*start,from?from.y-1/3:y+s*start,x+c*end,y+s*end,radius,e))&&clearShot(player,e)){b.hit.push(e);hitEnemy(e,b.damage);}
 }
}
function fieldHits(f,e){
 const h=hurtbox(e);
 for(let y=Math.max(0,Math.floor(h.y-h.ry));y<=Math.min(H-1,Math.floor(h.y+h.ry));y++)for(let x=Math.max(0,Math.floor(h.x-h.rx));x<=Math.min(W-1,Math.floor(h.x+h.rx));x++)if(spellCell(f,y*W+x)>=0&&((h.x-Math.max(x,Math.min(x+1,h.x)))/h.rx)**2+((h.y-Math.max(y,Math.min(y+1,h.y)))/h.ry)**2<=1)return true;
 return false;
}
function melee(a,reach,damage,wide=false,origin=player,hit=[]){
 for(const e of room.enemies)if(e.hp>0&&!hit.includes(e)&&(wide?capsuleHit(origin.x,origin.y-1/3,origin.x,origin.y-1/3,reach,e):capsuleHit(origin.x+Math.cos(a)*.25,origin.y-1/3+Math.sin(a)*.25,origin.x+Math.cos(a)*(reach-1/3),origin.y-1/3+Math.sin(a)*(reach-1/3),1/3,e))&&clearShot(origin,e)){hit.push(e);hitEnemy(e,damage);}
 return hit;
}
function strike(kind,a,damage,reach,delay=0){const b={kind,a,damage,reach,age:-delay,hit:[]};blows.push(b);return b;}
function tickCombat(dt){
 if(!health)return;
 for(const b of blows){const previous=b.age;b.age+=dt;if(b.age<0)continue;
  const from={x:player.x,y:player.y};if(b.kind===6&&b.age>.24)movePlayer(room.cells,player,Math.cos(b.a),Math.sin(b.a),Math.max(0,Math.min(b.age,.42)-Math.max(previous,.24)),28);
  hitBlow(b,b.kind===6?from:null,Math.max(0,previous));
  if(b.kind===0&&previous<.16&&b.age>=.16){const p=starterKey(b.a,2);movePlayer(room.cells,player,p[4],p[5],.05,Math.hypot(p[4],p[5])/12/.05);b.step=[(player.x-from.x)*12,(player.y-from.y)*12];}
 }
 blows=blows.filter(b=>b.age<(b.kind===0?.21:b.kind===6?.42:b.kind===3?.18:.22));if(dash?.age>=.42)dash=null;
 for(const f of fields){f.age+=dt;if(f.age<f.burn||f.age>f.burn+1.2)continue;
  if(f.damage){for(const e of room.enemies)if(e.hp>0&&!f.hit.includes(e)&&fieldHits(f,e)){f.hit.push(e);hitEnemy(e,f.damage);}}
  else if(fieldHits(f,player))hurtPlayer();
 }
 fields=fields.filter(f=>f.age<f.burn+1.2);
}

function drawStarter(back=false){
 if(!health)return;
 const active=blows.filter(b=>b.kind===0);
 for(const b of active.length?active:weapon===0?[{kind:0,a:facing,age:-.08,reach:1.6,hit:[]}]:[]){
  const p=starterMotion(b),a=p[2]*Math.PI/4,index=assets.starter+starterMoon*2;
  if(!!(p[3]&1)!==back)continue;
  transform(ctx,Math.round(player.x*12+p[0]),Math.round(player.y*12+p[1]),a,p[3]&2?-1:1,p[3]&4?-1:1);
  if(b.age>=0&&b.age<.07){ctx.fillStyle=starterMoon?'rgb(198,159,39)':'rgb(164,165,165)';ctx.globalAlpha=.6*(1-b.age/.07);ctx.fillRect(-3,-2,5,1);ctx.fillRect(-1,2,4,1);ctx.globalAlpha=1;}
  if(b.age>=0&&b.hit.length&&b.age<.1){ctx.fillStyle='#fff';ctx.fillRect(11,-2,1,1);ctx.fillRect(12,1,1,1);}
  if(p[2]&1){ctx.rotate(Math.PI/4);tile(ctx,index,-1,-10);}else tile(ctx,index+1,0,-5);
  ctx.restore();
 }
}
function drawCombat(){
 drawStarter();
 for(const f of fields)for(let n=0;n<W*H;n++){const delay=spellCell(f,n),t=f.age;if(delay<0||t<delay||t>f.burn-.15&&t<f.burn||t>f.burn+1.2)continue;const x=n%W*12,y=(n/W|0)*12;ctx.globalAlpha=t<f.burn-.5?.65:1;tile(ctx,t<f.burn?assets.warning+(t>=f.burn-.5?1:0):assets.flame+Math.floor(worldTime*12)%3,x,y);ctx.globalAlpha=1;}
 // Anchor the bottom-left grip to the hand; rotate the diagonal blade around it.
 // Whirlwind copies share that grip radius, while heavy weapons scale from the grip.
 for(const b of blows.length?blows:action?.type==='attack'&&weapon>0&&weapon<3?[{kind:weapon,a:facing,age:0}]:[]){const k=b.kind,n=k===4?4:1,shape=blowShape(b);if(k===0||b.age<0&&k!==7)continue;ctx.save();ctx.translate(Math.round(shape.x*12),Math.round(shape.y*12));
  ctx.rotate(b.a+(b.age<0&&k!==0?-1:k===3?(b.age/.18-.5)*2:k===4?b.age*24:0));
  if(k===5){
   const phase=Math.min(2,b.age/.035|0),tip=shape.end*12,start=shape.start*12,back=Math.max(0,(b.age-.07)/.05)*(tip-start);
   if(b.age<=.1){ctx.fillStyle='#bdeddf';ctx.globalAlpha=1-phase*.3;
    ctx.beginPath();ctx.moveTo(start,0);ctx.lineTo(tip-1,-1);ctx.lineTo(tip+1,0);ctx.lineTo(tip-1,1);ctx.fill();ctx.globalAlpha=1;
   }
   if(b.age<.12){ctx.fillStyle='#efefdb';ctx.fillRect(start,0,Math.max(0,tip-back-start),1);tile(ctx,assets.mini+6,tip-back-1.5,-1.5,3,3);}
   if(b.hit.length&&b.age<.035){ctx.fillStyle='#fff';ctx.fillRect(tip,0,1,1);}
  }
  else if(k===4){ctx.strokeStyle='#bdeddf';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,shape.radius*12,-.8,1.7);ctx.arc(0,0,shape.radius*12,2.3,4.8);ctx.stroke();for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.translate(shape.radius*12-6,0);ctx.rotate(Math.PI/4);tile(ctx,assets.weapon+weaponArt,-2,-10);ctx.restore();}}
  else{if(b.age>=0&&k===3){ctx.strokeStyle='#bdeddf';ctx.globalAlpha=.3;ctx.lineWidth=shape.radius*24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(shape.start*12,0);ctx.lineTo(shape.end*12,0);ctx.stroke();ctx.globalAlpha=1;}
  if(b.age>=0&&k===7){ctx.strokeStyle='#bdeddf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(shape.end*12-3,-shape.width*12);ctx.lineTo(shape.end*12,0);ctx.lineTo(shape.end*12-3,shape.width*12);ctx.stroke();}
  for(let i=0;i<n;i++){ctx.rotate(Math.PI*2/n);ctx.save();ctx.translate(4,0);if(k===6&&!(Math.round(b.a*4/Math.PI)&1))tile(ctx,assets.thrust,0,-5);
   else{ctx.rotate(Math.PI/4);if(k===7)ctx.scale(1.5,1.5);tile(ctx,k===6?assets.thrust+1:assets.weapon+weaponArt,-2,-10);}ctx.restore();}}
  ctx.restore();}
 if(radiation){ctx.globalAlpha=.75+radiation/12;statusTile(assets.effects+5,player.x*12+(gaze?7:0),player.y*12-20);ctx.globalAlpha=1;}
 if(gaze)statusTile(assets.effects+1+Math.min(3,Math.floor(gaze/.75)),player.x*12-(radiation?7:0),player.y*12-20);
}
