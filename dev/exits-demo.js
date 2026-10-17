if(DEV){
 const previewIndex=Math.max(0,Math.min(4,+(new URLSearchParams(location.search).get('exit'))||0));
 let previewAge=0,previewAuto=true,previewFinished=false,previewStatus='';
 function previewSend(text){if(text!==previewStatus){previewStatus=text;parent.postMessage({hipocreneExit:previewIndex,status:text},location.origin);}}
 function previewStart(auto=true){
  previewAuto=auto;previewFinished=false;previewAge=0;previewStatus='';reset();
  level=1;
  for(let n=0;n<1000;n++){world=makeLevel('exit-showcase:'+previewIndex+':'+n,1);if(world.song%assets.exits.length===previewIndex)break;}
  chamber=world.boss;room=world.rooms[chamber];room.enemies=[];room.loot=[];room.age=0;
  for(let i=0;i<room.cells.length;i++)room.cells[i]&=1;
  enterRoom();player.x=room.gate.x;player.y=room.gate.y+3;facing=-Math.PI/2;
  reveal=0;health=maxHealth=2;if(dev.paused)$('pause').click();
  previewSend(auto?'Exit revealing…':'WASD / arrows · walk into the exit');
 }
 const previewSimulate=simulate;
 simulate=function(){
  if(previewFinished)return;
  previewSimulate();previewAge+=1/60;
  if(level>1){previewFinished=true;clearKeys();previewSend('Floor 2 reached ✓');return;}
  if(previewAuto&&previewAge>2&&!travel&&!reveal){moveHero(0,-1,1/60,3);previewSend('Walking into the trigger…');}
  else if(previewAuto&&previewAge>.7)previewSend('Exit active');
 };
 addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.exitDemo!==undefined){previewStart(e.data.exitDemo!=='play');canvas.focus();}});
 previewStart();
}
