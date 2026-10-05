const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.png':'image/png','.js':'text/javascript','.json':'application/json','.css':'text/css'};
http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name),relative=path.relative(root,file);
 if(relative.startsWith('..')||relative.split(path.sep).some(p=>p.startsWith('.')||p==='node_modules')){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(8010,'127.0.0.1',()=>console.log('Play: http://127.0.0.1:8010/dev/play.html'));
