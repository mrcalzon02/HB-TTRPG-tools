import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const fail=message=>{throw new Error(message);};
const source=await read('blacklight-exo-vessel-campaign-3d-viewer.js');
const css=await read('blacklight-exo-vessel-campaign-3d-viewer.css');
const vesselHtml=await read('blacklight-exo-vessel.html');
const gameplayLoader=await read('blacklight-exo-vessel-gameplay-ui.js');
const workflow=await read('.github/workflows/pages.yml');

const staticIds=[
  'exo-vessel-campaign-3d-launcher','exo-vessel-campaign-3d-window','exo-vessel-campaign-3d-close',
  'exo-vessel-campaign-3d-canvas','exo-vessel-campaign-3d-stage','exo-vessel-campaign-3d-inspector',
  'exo-vessel-campaign-3d-preset','exo-vessel-campaign-3d-filter','exo-vessel-campaign-3d-mode',
  'exo-vessel-campaign-3d-slice-axis','exo-vessel-campaign-3d-explode','exo-vessel-campaign-3d-slice',
  'exo-vessel-campaign-3d-routes','exo-vessel-campaign-3d-labels','exo-vessel-campaign-3d-envelope',
  'exo-vessel-campaign-3d-reset','exo-vessel-campaign-3d-summary','exo-vessel-campaign-3d-launcher-status',
  'exo-vessel-campaign-3d-inspector-eyebrow','exo-vessel-campaign-3d-inspector-name',
  'exo-vessel-campaign-3d-inspector-module','exo-vessel-campaign-3d-inspector-placement',
  'exo-vessel-campaign-3d-inspector-installation','exo-vessel-campaign-3d-inspector-damage',
  'exo-vessel-campaign-3d-inspector-operational','exo-vessel-campaign-3d-inspector-dimensions',
  'exo-vessel-campaign-3d-inspector-center','exo-vessel-campaign-3d-edit','exo-vessel-campaign-3d-zoom'
];
for(const id of staticIds)if(!vesselHtml.includes(`id="${id}"`))fail(`Static vessel page lacks 3D viewer element ${id}.`);
if(!vesselHtml.includes('href="blacklight-exo-vessel-campaign-3d-viewer.css"'))fail('Static vessel page does not declare the 3D viewer stylesheet.');
if(!vesselHtml.includes('src="blacklight-exo-vessel-campaign-3d-viewer.js"'))fail('Static vessel page does not declare the 3D viewer runtime.');
if(!vesselHtml.includes('<dialog id="exo-vessel-campaign-3d-window"'))fail('The 3D viewer window is not a static dialog in vessel HTML.');
if((vesselHtml.match(/data-exo-open-3d/g)||[]).length<2)fail('Static vessel page does not expose both primary and local 3D viewer launch controls.');
if(!vesselHtml.includes('href="blacklight-exo-stellar-sector.html"'))fail('Vessel page does not preserve direct navigation to the separate Stellar Sector generator.');

for(const signature of[
  'layout:\'STATIC\'','REQUIRED_STATIC_IDS','bindStaticLayout','sceneRows','routePolylines','sceneBounds','applySlice','explodedPoint','cameraCoordinates','cameraProject','boxCorners','boxFaces','sortFacesForPainter','pointInPolygon',
  'showModal','pointerdown','pointermove','wheel','keydown','ArrowLeft','ResizeObserver','SOLID','WIREFRAME','XRAY','vessel-3d-static-layout'
])if(!source.includes(signature))fail(`Static campaign 3D viewer lacks ${signature}.`);
for(const forbidden of['buildUi(',"createElement('dialog')",'insertAdjacentElement(','document.body.append(','windowBody.append(','stageHome.append('])if(source.includes(forbidden))fail(`Static 3D viewer runtime still mutates page layout through ${forbidden}.`);
for(const forbidden of['blacklight-exo-vessel-campaign-3d-viewer.css','blacklight-exo-vessel-campaign-3d-viewer.js','BlacklightExoVesselCampaign3DViewer'])if(gameplayLoader.includes(forbidden))fail(`Dynamic VESSEL-10 loader still owns static 3D asset ${forbidden}.`);
for(const signature of[
  'exo-vessel-campaign-3d-launcher','exo-vessel-campaign-3d-window-grid','exo-vessel-campaign-3d-toolbar','exo-vessel-campaign-3d-stage','exo-vessel-campaign-3d-inspector','exo-vessel-campaign-3d-legend','touch-action:none'
])if(!css.includes(signature))fail(`Static campaign 3D viewer stylesheet lacks ${signature}.`);
if(!workflow.includes('node scripts/validate-exo-vessel-campaign-3d-viewer.mjs'))fail('Pages workflow does not gate the static interactive vessel 3D viewer.');

const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];}};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,structuredClone,document};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'blacklight-exo-vessel-campaign-3d-viewer.js'});
const api=context.BlacklightExoVesselCampaign3DViewer;
if(api?.version!==2||api.layout!=='STATIC')fail('Static campaign 3D viewer API identity did not initialize.');
for(const method of['sceneRows','routePolylines','sceneBounds','applySlice','explodedPoint','cameraCoordinates','cameraProject','boxCorners','boxFaces','sortFacesForPainter','pointInPolygon'])if(typeof api[method]!=='function')fail(`Static campaign 3D viewer API lacks ${method}.`);
if(JSON.stringify([...api.requiredStaticIds])!==JSON.stringify(staticIds))fail('Runtime static-layout contract differs from the validated HTML control set.');

const vessel={
  moduleGraph:{modules:[
    {moduleId:'module-reactor',label:'Primary Reactor',envelope:'INTERNAL'},
    {moduleId:'module-radiator',label:'Radiator Wing',envelope:'EVA'},
    {moduleId:'module-sensor',label:'Sensor Spine',envelope:'EVA'}
  ]},
  voxelLayout:{
    grid:{size:{x:20,y:12,z:8}},
    modulePlacements:[
      {placementId:'placement-reactor',moduleId:'module-reactor',bounds:{min:{x:2,y:4,z:1},max:{x:4,y:5,z:2},size:{x:3,y:2,z:2}}},
      {placementId:'placement-radiator',moduleId:'module-radiator',bounds:{min:{x:9,y:1,z:5},max:{x:13,y:1,z:5},size:{x:5,y:1,z:1}}},
      {placementId:'placement-sensor',moduleId:'module-sensor',bounds:{min:{x:7,y:8,z:4},max:{x:8,y:8,z:6},size:{x:2,y:1,z:3}}}
    ],
    utilityRoutes:{
      power:[{routeId:'voxel-route-power',sourceEdgeId:'edge-power',points:[{x:3,y:4.5,z:1.5},{x:8,y:4.5,z:1.5},{x:8,y:8,z:5}]}],
      cooling:[{routeId:'voxel-route-cooling',sourceEdgeId:'edge-cooling',points:[{x:3,y:4.5,z:1.5},{x:11,y:4.5,z:1.5},{x:11,y:1,z:5}]}]
    }
  },
  campaignEffectiveState:{
    moduleStates:[
      {moduleId:'module-reactor',installationState:'DAMAGED',damagePercent:72,operational:false,graphParticipation:'DEGRADED'},
      {moduleId:'module-radiator',installationState:'DESTROYED',damagePercent:100,operational:false,graphParticipation:'NONE'},
      {moduleId:'module-sensor',installationState:'INSTALLED',damagePercent:0,operational:true,graphParticipation:'FULL'}
    ],
    routeStates:[
      {routeId:'edge-power',functional:false,state:'SEVERED'},
      {routeId:'voxel-route-cooling',functional:true,state:'ACTIVE'}
    ]
  }
};

const rows=api.sceneRows(vessel);
if(rows.length!==3)fail('Static 3D viewer did not preserve every module placement.');
const reactor=rows.find(item=>item.moduleId==='module-reactor'),radiator=rows.find(item=>item.moduleId==='module-radiator');
if(reactor.x!==3||reactor.y!==4.5||reactor.z!==1.5||reactor.width!==3||reactor.height!==2||reactor.depth!==2)fail('VESSEL-04 bounds did not convert into the exact volumetric reactor box.');
if(reactor.state!=='critical'||radiator.state!=='destroyed'||radiator.exposure!=='EVA')fail('Campaign-effective damage or exposure did not classify static three-dimensional boxes.');
const routes=api.routePolylines(vessel);
if(routes.length!==2)fail('Static 3D viewer did not preserve routed utility polylines.');
if(routes.find(item=>item.routeId==='voxel-route-power')?.functional!==false)fail('Source-edge campaign route state did not sever its three-dimensional route.');
if(routes.find(item=>item.routeId==='voxel-route-cooling')?.functional!==true)fail('Direct route-id campaign state did not preserve its three-dimensional route.');

const bounds=api.sceneBounds(rows,vessel);
if(JSON.stringify(bounds)!==JSON.stringify({min:{x:0,y:0,z:0},max:{x:19,y:11,z:7}}))fail('Voxel grid did not remain the three-dimensional scene envelope.');
const center=api.centerOfBounds(bounds);
if(JSON.stringify(center)!==JSON.stringify({x:9.5,y:5.5,z:3.5}))fail('Three-dimensional scene center is incorrect.');
const sliced=api.applySlice(rows,bounds,'z',50);
if(!sliced.some(item=>item.moduleId==='module-reactor')||sliced.some(item=>item.moduleId==='module-radiator'))fail('Three-dimensional slice clipping did not preserve lower boxes and remove upper boxes.');
const exploded=api.explodedPoint({x:19,y:5.5,z:3.5},center,100);
if(exploded.x!==28.5||exploded.y!==5.5||exploded.z!==3.5)fail('Exploded separation did not move volume centers radially from the vessel center.');

const scene={bounds,center,span:{x:19,y:11,z:7}};
const state={yaw:-.72,pitch:-.54,distance:3.2,explode:0};
const first=api.cameraProject({x:3,y:4.5,z:1.5},scene,1200,700,state),second=api.cameraProject({x:3,y:4.5,z:1.5},scene,1200,700,state);
if(JSON.stringify(first)!==JSON.stringify(second)||![first.x,first.y,first.depth,first.scale].every(Number.isFinite))fail('Perspective projection is not deterministic and finite.');
const corners=api.boxCorners(reactor,center,0);
if(corners.length!==8||corners[0].x!==1.5||corners[6].z!==2.5)fail('Volumetric box construction does not retain eight exact corners.');
const faces=api.boxFaces(reactor,scene,1200,700,state);
if(faces.length!==6||faces.some(face=>face.points.length!==4||!Number.isFinite(face.depth)))fail('Volumetric box did not produce six finite quadrilateral faces.');
const painter=api.sortFacesForPainter([{depth:-4},{depth:3},{depth:1}]);
if(JSON.stringify(painter.map(item=>item.depth))!==JSON.stringify([3,1,-4]))fail('Painter ordering does not draw far geometry before near geometry.');
if(!api.pointInPolygon(5,5,[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}])||api.pointInPolygon(15,5,[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]))fail('Canvas module-face hit testing is invalid.');

console.log('EXO vessel static campaign 3D viewer validation passed.');
console.log('Validated fixed HTML ownership, absence of runtime layout injection, exact VESSEL-04 box volumes, campaign damage colors, routed three-dimensional utilities, clipping, exploded separation, deterministic perspective, painter order, picking, keyboard and pointer controls, separate Stellar Sector navigation, and Pages gating.');
