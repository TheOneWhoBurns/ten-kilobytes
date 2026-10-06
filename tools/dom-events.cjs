// Model the owned page's native on* properties as well as its listener API.
// Existing fixtures use addEventListener; current builds may assign a handler.
module.exports=(sandbox,handlers)=>{
 require('./canvas-dom.cjs')(sandbox);
 sandbox.window=sandbox;
 for(const [target,names] of [[sandbox,['keydown','keyup','blur','pointerdown']],[sandbox.document,['visibilitychange']]])for(const name of names)Object.defineProperty(target,'on'+name,{
  configurable:true,get:()=>handlers[name]||null,set:handler=>{handlers[name]=handler;}
 });
};
