let rankedRun,rankName='Player '+crypto.randomUUID().slice(0,8);
try{rankName=localStorage.getItem('hipocrene-name')||rankName;localStorage.setItem('hipocrene-name',rankName);}catch{}
async function rankPost(path,data){for(let i=0;i<3;i++){try{const r=await fetch(__API__+path,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(6000)});if(r.ok)return await r.json();if(r.status<500)return null;}catch{}if(i<2)await new Promise(r=>setTimeout(r,1000*(i+1)));}return null;}
function rankStart(){rankedRun=rankPost('/api/runs',{version:__VERSION__});}
function rankFinish(score,floor){rankedRun.then(r=>{if(r?.token)rankPost('/api/scores',{token:r.token,name:rankName,score,floor:Math.max(1,floor)});});}
