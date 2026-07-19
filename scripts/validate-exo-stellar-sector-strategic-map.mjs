import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const fail=message=>{throw new Error(message);};
const source=read('blacklight-exo-stellar-sector-strategic-map.js'),css=read('blacklight-exo-stellar-sector-strategic-map.css'),html=read('blacklight-exo-stellar-sector.html'),workflow=read('.github/workflows/pages.yml');
const staticIds=['exo-sector-map','exo-sector-map-territories','exo-sector-map-corridors','exo-sector-map-formations','exo-sector-map-legend'];
for(const id of staticIds)if(!html.includes(`id="${id}"`))fail(`Static strategic sector map lacks ${id}.`);
if(!html.includes('href="blacklight-exo-stellar-sector-strategic-map.css"')||!html.includes('src="blacklight-exo-stellar-sector-strategic-map.js"'))fail('Static sector page does not declare strategic map assets.');
if(html.indexOf('blacklight-exo-stellar-sector-strategic-map.js')<html.indexOf('blacklight-exo-stellar-sector.js')||html.indexOf('blacklight-exo-stellar-sector-strategic-map.js')>html.indexOf('blacklight-exo-sector-archive-store.js'))fail('Strategic map does not load after the base map and before archive binding.');
for(const signature of["layout:'STATIC'",'REQUIRED_STATIC_IDS','positions','convexHull','paddedHull','territoryLayer','corridorLayer','formationLayer','data-strategic-layer','stellar-sector-strategic-map-static-layout','queueMicrotask'])if(!source.includes(signature))fail(`Strategic map runtime lacks ${signature}.`);
for(const forbidden of['insertAdjacentElement(',"document.querySelector('main')",'document.body.append('])if(source.includes(forbidden))fail(`Strategic map runtime mutates page structure through ${forbidden}.`);
for(const signature of['exo-sector-map-layer-controls','exo-sector-map-legend','exo-sector-territory','exo-sector-capital-marker','exo-sector-contested-marker','exo-sector-strategic-corridor','exo-sector-formation-marker'])if(!css.includes(signature))fail(`Strategic map stylesheet lacks ${signature}.`);
if(!workflow.includes('node scripts/validate-exo-stellar-sector-strategic-map.mjs'))fail('Pages workflow does not gate strategic map validation.');

const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];},createElementNS(){return{setAttribute(){}};}};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,structuredClone,document};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'blacklight-exo-stellar-sector-strategic-map.js'});
const api=context.BlacklightExoStellarSectorStrategicMap;if(api?.version!==1||api.layout!=='STATIC')fail('Strategic map API identity is invalid.');for(const method of['positions','convexHull','paddedHull','colorIndex','render'])if(typeof api[method]!=='function')fail(`Strategic map API lacks ${method}.`);if(JSON.stringify([...api.requiredStaticIds])!==JSON.stringify(staticIds))fail('Strategic map static ID contract differs from HTML validation.');
const sector={clusters:[{clusterId:'a',coordinatesLy:{x:-10,y:-20}},{clusterId:'b',coordinatesLy:{x:10,y:20}},{clusterId:'c',coordinatesLy:{x:0,y:0}},{clusterId:'d',coordinatesLy:{x:-8,y:16}}]};
const first=api.positions(sector),second=api.positions(sector);if(JSON.stringify([...first])!==JSON.stringify([...second]))fail('Strategic map projection is not deterministic.');if(first.get('a').x!==55||first.get('a').y!==625||first.get('b').x!==945||first.get('b').y!==55)fail('Strategic map projection does not preserve documented SVG margins and axis orientation.');
const hull=api.convexHull([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10},{x:5,y:5}]);if(hull.length!==4||hull.some(point=>point.x===5&&point.y===5))fail('Strategic map convex hull does not remove interior points.');
const single=api.paddedHull([{x:5,y:5}],12),pair=api.paddedHull([{x:0,y:0},{x:10,y:0}],4),area=api.paddedHull([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],4);if(single.length!==12||pair.length!==4||area.length!==4)fail('Strategic territory envelopes do not support single-cluster, two-cluster, and multi-cluster regions.');if(new Set(single.map(point=>`${point.x.toFixed(3)}:${point.y.toFixed(3)}`)).size!==12)fail('Single-cluster territory envelope is degenerate.');
for(const key of['polity-a','polity-b','polity-a']){const value=api.colorIndex(key);if(!Number.isInteger(value)||value<0||value>11)fail('Strategic polity color index is invalid.');}if(api.colorIndex('polity-a')!==api.colorIndex('polity-a'))fail('Strategic polity color index is not deterministic.');
console.log('EXO stellar-sector strategic map validation passed: static controls, deterministic projection, convex and padded territory geometry, corridor and formation overlay contracts, styling, script order, and Pages gating.');
