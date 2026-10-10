const vm=require('node:vm'),env=require('./environment-data.cjs').constants;
module.exports=(source,assets)=>{
 const start=source.indexOf("  art.globalCompositeOperation='source-atop';"),end=source.indexOf("art.globalCompositeOperation='source-over';",start)+"art.globalCompositeOperation='source-over';".length;
 if(start<0||end<start)throw Error('Missing atlas palette');
 const colors=Array(assets.actor+19).fill('#eed'),art={fillRect(x,y,w,h){for(let i=x/12;i<(x+w)/12;i++)colors[i]=this.fillStyle;}};
 vm.runInNewContext(source.slice(start,end),{art,assets,...env,BOSS_COUNT:0,worldColor:(light=65,offset=0)=>'@'+light+','+offset});
 const palette=[...new Set(colors)],text=colors.map(c=>String.fromCharCode(65+palette.indexOf(c))).join(''),expressions=palette.map(c=>c[0]==='@'?'worldColor('+c.slice(1)+')':JSON.stringify(c));
 return source.slice(0,start)+`art.globalCompositeOperation='source-atop';{const colors=[${expressions.join(',')}],map=${JSON.stringify(text)};for(let i=0;i<map.length;i++){art.fillStyle=colors[map.charCodeAt(i)-65];art.fillRect(i*12,0,12,12);}}`+source.slice(end);
};
