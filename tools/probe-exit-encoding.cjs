const fs=require('fs'),acorn=require('acorn'),vm=require('vm'),build=require('./build.cjs');
const source=fs.readFileSync('dev/play.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],init=acorn.parse(source,{ecmaVersion:2020}).body[0].expression.callee.body.body[0].declarations[0].init,assets=vm.runInNewContext('('+source.slice(init.start,init.end)+')');
const exits=assets.exits.map(parts=>parts.map(p=>{p=Array.from(p);p[0]-=assets.pantry;if(p[4])p[4]-=assets.pantry;return p;}));
const dir='dev/snapshots/optimization-audio-exits-20261010';
function transform(s,mode){const start=s.indexOf('  const parts=assets.exits['),end=s.indexOf('\n }\n for(const d of room.doors)',start);if(start<0||end<0)throw Error('Exit code changed');
 let rows=exits.map(parts=>parts.map(([n,x,y,spin=0,closed=0,alpha=1,frames=0])=>n+(x+2)*256+(y+1)*2048+spin*8192+(alpha<1?1:0)*16384+(frames?1:0)*32768+closed*65536));
 let decl,read,length;
 if(mode==='numbers'){decl='const parts='+JSON.stringify(rows)+'[world.song%5];';read='const v=parts[j];';length='parts.length';}
 else{let width=mode==='ascii'?4:3,base=mode==='ascii'?64:128;const texts=rows.map(row=>row.map(v=>Array.from({length:width},(_,i)=>String.fromCharCode(32+(v/base**i|0)%base)).join('')).join(''));decl='const parts='+JSON.stringify(texts)+'[world.song%5];';length='parts.length/'+width;read='const v='+Array.from({length:width},(_,i)=>'(parts.charCodeAt(j*'+width+'+'+i+')-32)*'+base**i).join('+')+';';}
 const code=decl+'for(let j='+length+';j--;){'+read+'const index=v&255,x=(v>>8&7)-2,y=(v>>11&3)-1,closed=v>>16; if(closed||open&&(room.age||0)>=(j?j===1?0:.3:.6)){transform(ctx,(room.gate.x+x)*12,(room.gate.y+y)*12,(v&8192?1:0)*worldTime);ctx.globalAlpha=v&16384?.45:1;tile(ctx,open&&(!closed||room.age>=.6)?index+(v&32768?(worldTime*6|0)%3:0):closed,-6,-6);ctx.restore();}}';
 return s.slice(0,start)+code+s.slice(end);
}
(async()=>{for(const mode of ['numbers','ascii','bytes']){const r=await build({write:false,development:false,quick:true,sourceTransform:s=>transform(s,mode)});fs.writeFileSync(dir+'/exits-'+mode+'.html',r.artifacts.release.html);console.log(mode,r.reports.release.html_bytes);}})();
