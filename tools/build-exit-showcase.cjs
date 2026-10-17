const fs=require('node:fs');
require('./build.cjs')({write:false,sourceTransform:s=>s+'\n'+fs.readFileSync('dev/exits-demo.js','utf8')}).then(({artifacts})=>{
 const page=artifacts.development.html.toString().replace('</style>','header,#dev-panel{display:none!important}main{padding:0!important;height:100vh!important}body{overflow:hidden}canvas{outline:none!important}</style>');
 fs.writeFileSync('dev/exits-game.html',page);
 console.log('Exit showcase built from the current game.');
}).catch(e=>{console.error(e);process.exitCode=1;});
