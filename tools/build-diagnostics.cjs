// Test-only release with DOM state probes. These probes and controls are absent
// from the shipped canvas-only build; its pixels/audio/input get separate checks.
const fs=require('fs'),build=require('./build.cjs');
build({write:false,development:false,diagnostics:true}).then(r=>fs.writeFileSync('dev/release-diagnostics.html',r.artifacts.release.html)).catch(e=>{console.error(e);process.exitCode=1;});
