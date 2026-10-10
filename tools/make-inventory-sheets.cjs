const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn'),{createCanvas}=require('@napi-rs/canvas');
const content=require('../assets/content.json'),selection=require('../assets/catalog/runtime-selection.json');
const js=fs.readFileSync('dev/play.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],node=acorn.parse(js,{ecmaVersion:2020}).body[0].expression.callee.body.body[0].declarations[0].init,assets=vm.runInNewContext('('+js.slice(node.start,node.end)+')'),bits=Buffer.from(assets.bits,'base64');
const W=1240,bg='#111723',panel='#1a2331',muted='#9eafc4',white='#e9f1fa',mint='#bde9d8';
function canvas(h){const c=createCanvas(W,h),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle=bg;g.fillRect(0,0,W,h);return[c,g];}
function text(g,s,x,y,size=15,color=white){g.fillStyle=color;g.font=`${size}px monospace`;g.fillText(s,x,y);}
function tile(g,id,x,y,scale=4,color=mint){g.fillStyle=color;for(let p=0;p<144;p++)if(bits[id*18+(p>>3)]&(128>>(p&7)))g.fillRect(x+p%12*scale,y+(p/12|0)*scale,scale,scale);}
function box(g,x,y,w,h){g.fillStyle=panel;g.fillRect(x,y,w,h);}
function coord(p){return `${p.x},${p.y}`;}
const desc={swarm:'20–27 slow pursuers; contact damage','arrow-single':'One short-range arrow','arrow-fan':'Five-arrow fan','arrow-sniper':'Fast, unlimited-range arrow; slow fire','arrow-rapid':'Five-arrow fan; rapid fire',kamikaze:'Approaches, then detonates a 3×3 fire patch',conga:'5–8 followers; moves 3 s, rests 1 s',charge:'Windup, then committed melee lunge',horse:'Straight charge at 12 tiles/s',mage:'Telegraphed line, cross, or distant fire patch',medusa:'Three seconds of unobstructed gaze deals damage'};
let y=145;const layouts=[];for(let r=0;r<Math.ceil(content.enemies.length/2);r++){const es=content.enemies.slice(r*2,r*2+2),h=108+Math.max(...es.map(e=>Math.ceil(e.art.variants/9)))*78;es.forEach((e,j)=>layouts.push({e,x:24+j*608,y,h}));y+=h+16;}
const [enemy,g]=canvas(y+42);text(g,'HIPOCRENE / CURRENT ENEMIES',24,43,28);text(g,`${content.enemies.length} types · ${new Set(content.enemies.map(e=>e.attack.mode)).size} behavior families · ${new Set(content.enemySprites.map(p=>p.join(','))).size} distinct tiles · ${content.bosses.length} bosses`,24,78,19,mint);text(g,'All active appearance variants. Coordinates are column,row. Shared artwork is repeated per type.',24,111,14,muted);
for(const {e,x,y,h} of layouts){box(g,x,y,592,h);text(g,e.id.toUpperCase(),x+16,y+29,21);text(g,desc[e.id],x+16,y+55,14,muted);text(g,`${e.art.variants} sprite${e.art.variants===1?'':'s'} · 1 HP`,x+16,y+79,13,mint);
 content.enemySprites.slice(e.art.base,e.art.base+e.art.variants).forEach(([tx,ty],i)=>{const p={x:tx,y:ty},id=selection.enemyTiles.findIndex(q=>q.x===tx&&q.y===ty),xx=x+16+i%9*63,yy=y+96+(i/9|0)*78;tile(g,assets.enemies+id,xx+3,yy,4);text(g,coord(p),xx,yy+65,12,muted);});}
text(g,'Appearance choices are variants, not separate behavior types. Shield wall is not in the current roster.',24,y+18,14,muted);fs.writeFileSync('docs/sheets/enemies.png',enemy.toBuffer('image/png'));
const {constants:E,groups}=require('./environment-data.cjs'),extra=[E.FLOOR_COUNT,E.WALL_COUNT,E.PROP_COUNT,4,3].reduce((n,count)=>n+184+(Math.ceil(count/5)-1)*120,0)-552;
const [env,h]=canvas(1550+extra);text(h,'HIPOCRENE / CURRENT ENVIRONMENT',24,43,28);text(h,'Active room tiles, entrance art, effects and doors — not the full pantry.',24,77,16,muted);
const categories=[['FLOOR TEXTURES','Chosen independently per room.',0,E.FLOOR_COUNT],['WALL MATERIALS','Cover non-walkable space; independent of the floor.',E.FLOOR_COUNT,E.WALL_COUNT],['DECORATIONS','Chosen independently per room.',E.PROP_START,E.PROP_COUNT],['PATCH HAZARDS','Webs, ice, permanent fire and cycling spike patches.',E.HAZARD_START-1,4],['SINGLE HAZARDS','Permanent spikes, one-use traps and radiation sources.',E.SPIKE-1,3]];
let categoryTop=105;
for(let category=0;category<categories.length;category++){
 const [name,detail,start,count]=categories[category],top=categoryTop,height=170+(Math.ceil(count/5)-1)*120;categoryTop+=height+14;box(h,24,top,1192,height);text(h,name,40,top+28,21);text(h,detail,340,top+28,13,muted);
 for(let j=0;j<count;j++){const id=start+j,xx=44+j%5*218,yy=top+(j/5|0)*120,p=selection.pantry[id],role=id>=E.HAZARD_START-1?groups.hazards[id-E.HAZARD_START+1].effect:category===0?'Floor texture':category===1?'Wall material':'Floor prop';tile(h,id===E.FIRE-1?assets.flame:assets.pantry+id,xx+22,yy+48,4,category===2?'#c2b5dd':'#91acbf');text(h,role,xx,yy+118,13);text(h,p.blank?'Generated flame':coord(p),xx,yy+140,13,muted);}
}
h.translate(0,extra);
text(h,'ROOM ZERO',24,691,21);text(h,'Entrance floor, two astral bodies, and three concentric ring designs.',220,691,14,muted);
const slots=[['Floor 13,0',assets.sky+8,1],['Sun 78–79,16–17',assets.sky,2],['Moon 80–81,16–17',assets.sky+4,2],['Original ring 65–68,4',assets.ring+8,2],['Medium ring (generated)',assets.ring+4,2],['Large ring (generated)',assets.ring,2]];
for(let i=0;i<slots.length;i++){const [label,id,n]=slots[i],x=24+i*200,top=715;box(h,x,top,192,174);const c=createCanvas(100,100),a=c.getContext('2d');a.imageSmoothingEnabled=false;
 if(i<4){const cols=n===1?1:2,scale=n===1?6:3;for(let p=0;p<cols*cols;p++)tile(a,id+p,(100-cols*12*scale)/2+p%cols*12*scale,(100-cols*12*scale)/2+(p/cols|0)*12*scale,scale,i===1?'#cc5500':i===2?'#6787c8':white);}
 else{a.translate(50,50);for(const sx of [-1,1])for(const sy of [-1,1]){a.save();a.scale(sx,sy);for(let p=0;p<n*n;p++)tile(a,id+p,(p%n-n)*12,((p/n|0)-n)*12,1,white);a.restore();}}
 h.drawImage(c,x+46,top+12);text(h,label,x+8,top+151,11,muted);}
const worldSource=fs.readFileSync('src/world.js','utf8'),gateSource=worldSource.slice(worldSource.indexOf('function drawGate(){'),worldSource.indexOf('let audio,'));
text(h,'DOORS / REMAINS / SPELL HAZARDS',24,978,21);text(h,'Screen-edge doors use generated 24×24 stone arches; corpses and spell warnings/fire are sprite tiles.',24,1005,14,muted);
for(let open=0;open<2;open++){const c=createCanvas(48,40),ctx=c.getContext('2d');vm.runInNewContext(gateSource+'drawGate();',{ctx,assets,tile:(g,id,x,y,size=12)=>tile(g,id,x,y,size/12),room:{doors:[{x:2,y:1.5,dir:3}],enemies:open?[]:[{hp:1}]},worldColor:(l=65,o=0)=>`hsl(${215+o} 45% ${l}%)`});const x=24+open*180;box(h,x,1030,168,142);h.drawImage(c,x+36,1042,96,80);text(h,open?'Open door':'Locked door',x+16,1150,14);}
[0,6,18,26,33].forEach((row,i)=>{const x=404+i*156;box(h,x,1030,144,142);tile(h,assets.corpses+i,x+36,1050,5,'#b4a1aa');text(h,`Corpse 201,${row}`,x+7,1150,12,muted);});
for(let i=0;i<5;i++){const x=24+i*240;box(h,x,1198,232,166);tile(h,i<2?assets.warning+i:assets.flame+i-2,x+74,1215,6,i<2?'#c394ff':'#ff9365');text(h,i<2?`Warning ${i+1}`:`Fire frame ${i-1}`,x+30,1324,16);text(h,'Generated',x+30,1350,12,muted);}
text(h,'Notes',24,1410,20);text(h,'Dungeon props and textures are recolored per area; neutral tints here keep the silhouettes readable.',24,1440,15,muted);text(h,E.PANTRY_COUNT+' room tiles in reusable categories. No fixed Ossuary / Cistern / Archive prop sets remain.',24,1467,15,muted);text(h,'Player art, weapons, armor, text glyphs and enemy projectiles are excluded from this environment sheet.',24,1494,14,muted);
fs.writeFileSync('docs/sheets/environment.png',env.toBuffer('image/png'));console.log('Wrote two sheets:',enemy.width+'×'+enemy.height,env.width+'×'+env.height);

const [hazardSheet,hg]=canvas(430);text(hg,'HIPOCRENE / HAZARDS',24,35,25);
const hazardIcons=[...groups.hazards.map((v,i)=>[v.effect,v.tile?v.tile.join(','):'generated',v.effect==='fire'?assets.flame:assets.pantry+E.HAZARD_START-1+i]),['spikes down','generated',assets.traps],['trap closed','generated',assets.traps+1],['radiation status','63,17',assets.effects+5]];
for(let i=0;i<hazardIcons.length;i++){const [name,label,id]=hazardIcons[i],x=24+i%5*240,y=60+(i/5|0)*180;box(hg,x,y,232,164);tile(hg,id,x+80,y+12,6,name==='fire'?'#ff9365':name==='ice'?'#9bd7ed':name.includes('radiation')?'#bde87c':'#c2b5dd');text(hg,name,x+16,y+114,16);text(hg,label,x+16,y+140,13,muted);}
fs.writeFileSync('docs/sheets/hazards.png',hazardSheet.toBuffer('image/png'));
