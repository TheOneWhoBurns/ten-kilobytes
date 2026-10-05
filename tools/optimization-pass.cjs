// Bounded, non-destructive candidate search. Source/release remain unchanged.
const fs=require('node:fs'),path=require('node:path'),build=require('./build.cjs'),compact=require('./compact-source.cjs');
process.chdir(path.resolve(__dirname,'..'));
const dir='dev/snapshots/optimization-20261005';fs.mkdirSync(dir,{recursive:true});
const run=fs.existsSync(dir+'/run.json')?JSON.parse(fs.readFileSync(dir+'/run.json')):{deadline:Date.now()/1000+7200},results=[];
const factor=options=>s=>compact.factor(s,options);
const cases=[
 ['baseline',s=>s],
 ['math',factor({math:true,geometry:false,paint:false})],
 ['geometry',factor({math:false,geometry:true,paint:false})],
 ['paint',factor({math:false,geometry:false,paint:true})],
 ['factor',compact.factor],
 ['canvas',s=>compact.canvas(s)],
 ['canvas_fields',s=>compact.canvas(s,true)],
 ['hoist',compact.hoist],
 ['all',compact],
 ['shared_offsets',s=>'const neighbors=[-1,1,-31,31];\n'+s.replaceAll('[-1,1,-W,W]','neighbors')],
 ['stable_actions',s=>s.replace("attack:{phase:1","attack:{type:'attack',phase:1").replace("interact:{phase:1","interact:{type:'interact',phase:1").replace("action=type?{type,phase:actionStates[type].phase}:null;","action=type?actionStates[type]:null;")],
 ['cached_navigation',s=>s.replace('navDistances=new Int16Array(W*H).fill(999);','if(!navDistances)navDistances=new Int16Array(W*H);navDistances.fill(999);')],
];
(async()=>{
 for(const [name,sourceTransform]of cases){
  if(Date.now()/1000>=run.deadline-120)break;
  const packMode=process.argv.includes('--native')?'native':'roadroller';const {reports,artifacts}=await build({write:false,development:false,quick:true,sourceTransform,packMode});const r=reports.release;
  const nameKey=(process.argv.includes('--native')?'native_':'')+name;const row={name:nameKey,html:r.html_bytes,zip:r.zip_bytes,source:r.source_bytes,model_mb:r.decoder_model_mb};results.push(row);console.log(JSON.stringify(row));fs.writeFileSync(dir+'/'+nameKey+'.html',artifacts.release.html);fs.writeFileSync(dir+(process.argv.includes('--native')?'/native-trials.json':'/source-trials.json'),JSON.stringify(results,null,2)+'\n');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
