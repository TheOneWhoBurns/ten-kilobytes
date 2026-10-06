// The canvas features used by the owned page's VM tests. A browser exposes #game
// as a named window property; cloning a canvas copies dimensions, not its pixels.
module.exports=sandbox=>{
 const {document}=sandbox,canvas=document.getElementById('game');
 canvas.width??=372;canvas.height??=252;
 canvas.cloneNode=function(){const copy=document.createElement('canvas');copy.width=this.width;copy.height=this.height;return copy;};
 sandbox.game=canvas;
 return sandbox;
};
