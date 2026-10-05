// RGB444 changes each fixed color channel by at most 8/255. Generated HSL
// palettes, alpha, silhouettes, animation and collision data are untouched.
module.exports=source=>source.replace(/#[a-f\d]{6}\b/gi,color=>'#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)/17).toString(16)).join(''));
