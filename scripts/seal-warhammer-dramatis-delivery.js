'use strict';
const fs=require('fs'),crypto=require('crypto'),cp=require('child_process');
const expected=Object.freeze({
  'warhammer-40k-workspace-v8.js':'6537696517d85ea8c290e1a81a50017494103321',
  'app-lite-view-mounts.js':'d11449ba1739960fd48542f41dc4caf58ed65d5f',
  'warhammer-40k-map.html':'1579f3fda7db9226359410ed183df2aeee80f6d2'
});
const blob=s=>crypto.createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
function read(path){const src=fs.readFileSync(path,'utf8'),actual=blob(src);if(actual!==expected[path])throw new Error(`${path} moved before Dramatis delivery seal: ${actual}`);return src}
function once(src,oldText,newText,label){const first=src.indexOf(oldText);if(first<0||src.indexOf(oldText,first+1)>=0)throw new Error(`${label} did not resolve exactly once.`);return src.slice(0,first)+newText+src.slice(first+oldText.length)}
let workspace=read('warhammer-40k-workspace-v8.js');
workspace=once(workspace,"warhammer-40k-archive-ui-v6.js?v=12","warhammer-40k-archive-ui-v6.js?v=13",'workspace archive seal');
fs.writeFileSync('warhammer-40k-workspace-v8.js',workspace);
cp.execFileSync(process.execPath,['--check','warhammer-40k-workspace-v8.js'],{stdio:'inherit'});
let app=read('app-lite-view-mounts.js');
app=once(app,'  let warhammerChronologyPromise = null;','  let warhammerChronologyPromise = null;\n  let warhammerDramatisPromise = null;','main Dramatis promise');
app=once(app,"      warhammerChronologyPromise ||= loadScript('assets/warhammer-40k/imperial-chronology-v1.js?v=1');","      warhammerChronologyPromise ||= loadScript('assets/warhammer-40k/imperial-chronology-v1.js?v=1');\n      warhammerDramatisPromise ||= warhammerChronologyPromise.then(() => loadScript('assets/warhammer-40k/imperial-dramatis-personae-v1.js?v=2'));",'main Dramatis preload');
app=once(app,'warhammerPlanetCompositorPromise, warhammerChronologyPromise, warhammerLogisticsPromise','warhammerPlanetCompositorPromise, warhammerChronologyPromise, warhammerDramatisPromise, warhammerLogisticsPromise','main Dramatis await');
app=once(app,"warhammer-40k-workspace-v8.js?v=31","warhammer-40k-workspace-v8.js?v=32",'main workspace seal');
fs.writeFileSync('app-lite-view-mounts.js',app);
cp.execFileSync(process.execPath,['--check','app-lite-view-mounts.js'],{stdio:'inherit'});
let map=read('warhammer-40k-map.html');
map=once(map,'  <script src="assets/warhammer-40k/imperial-chronology-v1.js?v=1"></script>','  <script src="assets/warhammer-40k/imperial-chronology-v1.js?v=1"></script>\n  <script src="assets/warhammer-40k/imperial-dramatis-personae-v1.js?v=2"></script>','standalone Dramatis preload');
map=once(map,'  <script src="warhammer-40k-workspace-v8.js?v=31"></script>','  <script src="warhammer-40k-workspace-v8.js?v=32"></script>','standalone workspace seal');
fs.writeFileSync('warhammer-40k-map.html',map);
console.log(JSON.stringify({workspace:blob(workspace),app:blob(app),map:blob(map)},null,2));
