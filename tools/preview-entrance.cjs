// Render the shipped canvas at its initial frame without changing game state.
const fs=require('fs'),vm=require('vm'),{createCanvas}=require('@napi-rs/canvas');
const canvas=createCanvas(372,252),frames=[],html=require('./read-build.cjs')('dist/index.html');
canvas.parentElement={getBoundingClientRect:()=>({width:744,height:504})};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:{getElementById:id=>id==='game'?canvas:null,createElement:()=>createCanvas(1,1),addEventListener(){}},atob,requestAnimationFrame:f=>frames.push(f),addEventListener(){}},{timeout:5000});
frames.shift()(16);const preview=createCanvas(1116,756),ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,0,0,1116,756);
fs.writeFileSync('dev/room-zero.png',preview.toBuffer('image/png'));console.log('dev/room-zero.png');
