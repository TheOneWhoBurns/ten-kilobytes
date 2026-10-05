function drawGate(){
 const g=room.gate,x=Math.round(g.x*12),y=Math.round(g.y*12),kind=world.exit,open=room.enemies.every(e=>e.hp<=0);
 for(const d of room.doors){ctx.save();ctx.translate(d.x*12,d.y*12);ctx.rotate([Math.PI/2,-Math.PI/2,Math.PI,0][d.dir]);ctx.fillStyle=worldColor(55,30);ctx.fillRect(-15,-8,30,22);ctx.fillStyle='#080a08';ctx.fillRect(-10,-8,20,18);ctx.fillStyle=worldColor(38);if(!open) for(let j=-8;j<=8;j+=8)ctx.fillRect(j,-8,2,18);ctx.restore();}
 if(chamber!==6||!open)return;
 ctx.fillStyle=worldColor(70,180);
 const rect=(a,b,w,h)=>ctx.fillRect(x+a*2,y+b*2,w*2,h*2);
 if([0,6,7,9].includes(kind)){rect(-10,-13,20,24);if(kind===0){rect(-14,-17,6,28);rect(8,-17,6,28);rect(-5,-20,10,7);}if(kind===6){rect(-13,-9,26,13);ctx.fillStyle='#101310';rect(-8,-6,5,4);rect(3,-6,5,4);}}
 else if(kind===5){rect(-8,-17,16,28);rect(-14,-21,28,9);rect(-18,-16,36,6);}
 else{for(let j=-12;j<=12;j+=2){const w=Math.round(Math.sqrt(144-j*j));rect(-w,j*.8,w*2,2);}}
 ctx.fillStyle='#111925';rect(-6,-7,12,16);
 if(kind===4){ctx.fillStyle='#efedcf';for(let j=-6;j<7;j+=4){rect(j,-8,2,4);rect(j,6,2,4);}}
 if([0,3,6,7].includes(kind)){ctx.fillStyle=worldColor(85);for(let j=0;j<4;j++)rect(-5+j,1+j*2,10-j*2,1);}
 if(kind===2){ctx.fillStyle='#aee5e7';rect(-5,-6,10,14);ctx.fillStyle='#efffff';rect(-3,-4,2,8);}
 if([1,8,9].includes(kind)){ctx.fillStyle=worldColor(85);for(let j=0;j<8;j++){const a=worldTime*2+j*.8,r=2+j*.6;rect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r),2,2);}}
}
