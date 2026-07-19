import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const fail=message=>{throw new Error(message);};
const source=await read('blacklight-exo-vessel-campaign-3d-viewer.js');
const css=await read('blacklight-exo-vessel-campaign-3d-viewer.css');
const loader=await read('blacklight-exo-vessel-gameplay-ui.js');
const workflow=await read('.github/workflows/pages.yml');

for(const signature of[
  'sceneRows','routePolylines','sceneBounds','applySlice','explodedPoint','cameraCoordinates','cameraProject','boxCorners','boxFaces','sortFacesForPainter','pointInPolygon',
  'showModal','pointerdown','pointermove','wheel','keydown','ArrowLeft','ResizeObserver','SOLID','WIREFRAME','XRAY','Utility routes','Exploded separation','Visible slice','Edit Campaign State'
])if(!source.includes(signature))fail(`Interactive campaign 3D viewer lacks ${signature}.`);
for(const signature of[
  'exo-vessel-campaign-3d-stage','exo-vessel-campaign-3d-window','exo-vessel-campaign-3d-window-body','exo-vessel-campaign-3d-controls','exo-vessel-campaign-3d-inspector','touch-action:none'
])if(!css.includes(signature))fail(`Interactive campaign 3D viewer stylesheet lacks ${signature}.`);
for(const signature of['blacklight-exo-vessel-campaign-3d-viewer.css','blacklight-exo-vessel-campaign-3d-viewer.js','BlacklightExoVesselCampaign3DViewer'])if(!loader.includes(signature))fail(`Canonical vessel loader does not include ${signature}.`);
if(loader.indexOf('blacklight-exo-vessel-campaign-3d-viewer.js')<loader.indexOf('blacklight-exo-vessel-campaign-voxel-viewer.js'))fail('Interactive 3D viewer loads before its placement authority.');
if(!workflow.includes('node scripts/validate-exo-vessel-campaign-3d-viewer.mjs'))fail('Pages workflow does not gate the interactive vessel 3D viewer.');

const placementRows=vessel=>{
  const modules=new Map(vessel.moduleGraph.modules.map(item=>[item.moduleId,item]));
  const states=new Map(vessel.campaignEffectiveState.moduleStates.map(item=>[item.moduleId,item]));
  return vessel.voxelLayout.modulePlacements.map((placement,index)=>{
    const module=modules.get(placement.moduleId)||{},state=states.get(placement.moduleId)||{};
    return{
      placementId:placement.placementId||`placement-${index+1}`,
      moduleId:placement.moduleId,
      label:module.label||placement.moduleId,
      exposure:module.envelope||'INTERNAL',
      installationState:state.installationState||'INSTALLED',
      damagePercent:Number(state.damagePercent||0),
      operational:state.operational!==false,
      graphParticipation:state.graphParticipation||'FULL',
      x:0,y:0,z:0,width:1,height:1,depth:1,
      source:placement
    };
  });
};
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return[];},createElement(){return{};}};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,structuredClone,document,BlacklightExoVesselCampaignVoxelViewer:{placementRows}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'blacklight-exo-vessel-campaign-3d-viewer.js'});
const api=context.BlacklightExoVesselCampaign3DViewer;
if(api?.version!==1)fail('Interactive campaign 3D viewer API did not initialize.');
for(const method of['sceneRows','routePolylines','sceneBounds','applySlice','explodedPoint','cameraCoordinates','cameraProject','boxCorners','boxFaces','sortFacesForPainter','pointInPolygon'])if(typeof api[method]!=='function')fail(`Interactive campaign 3D viewer API lacks ${method}.`);

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
if(rows.length!==3)fail('Interactive 3D viewer did not preserve every module placement.');
const reactor=rows.find(item=>item.moduleId==='module-reactor'),radiator=rows.find(item=>item.moduleId==='module-radiator');
if(reactor.x!==3||reactor.y!==4.5||reactor.z!==1.5||reactor.width!==3||reactor.height!==2||reactor.depth!==2)fail('VESSEL-04 bounds did not convert into the exact volumetric reactor box.');
if(reactor.state!=='critical'||radiator.state!=='destroyed'||radiator.exposure!=='EVA')fail('Campaign-effective damage or exposure did not classify three-dimensional boxes.');
const routes=api.routePolylines(vessel);
if(routes.length!==2)fail('Interactive 3D viewer did not preserve routed utility polylines.');
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

console.log('EXO vessel interactive campaign 3D viewer validation passed.');
console.log('Validated exact VESSEL-04 box volumes, campaign damage colors, routed three-dimensional utilities, scene envelope, clipping, exploded separation, deterministic perspective, far-to-near painter order, six-face construction, picking, pointer and keyboard camera controls, canonical loader order, window controls, and Pages gating.');
