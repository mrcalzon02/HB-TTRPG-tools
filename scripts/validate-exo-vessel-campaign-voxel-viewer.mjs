import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const fail=message=>{throw new Error(message);};
const source=await read('blacklight-exo-vessel-campaign-voxel-viewer.js');
const css=await read('blacklight-exo-vessel-campaign-voxel-viewer.css');
const routeOverlay=await read('blacklight-exo-vessel-campaign-voxel-route-overlay.js');
const gameplayUi=await read('blacklight-exo-vessel-gameplay-ui.js');

for(const signature of ['placementRows','routeRows','project','normalized','campaignEffectiveState','modulePlacements','utilityEdges','exo-vessel-editor-module','Edit This Module','ALL','INTACT','DAMAGED','CRITICAL','DESTROYED','INTERNAL','EVA'])if(!source.includes(signature))fail(`Campaign voxel viewer lacks ${signature}.`);
for(const signature of ['exo-vessel-campaign-voxel-layout','exo-campaign-voxel-route','exo-campaign-voxel-module.intact','exo-campaign-voxel-module.damaged','exo-campaign-voxel-module.critical','exo-campaign-voxel-module.destroyed','exo-vessel-campaign-voxel-inspector'])if(!css.includes(signature))fail(`Campaign voxel viewer stylesheet lacks ${signature}.`);
for(const signature of ['campaignEffectiveState','combatResolutionModel','conditionHistory','data-route-id','campaignRouteState','severed'])if(!routeOverlay.includes(signature))fail(`Campaign voxel route overlay lacks ${signature}.`);
for(const signature of ['blacklight-exo-vessel-campaign-voxel-viewer.css','blacklight-exo-vessel-campaign-voxel-viewer.js','blacklight-exo-vessel-campaign-voxel-route-overlay.js'])if(!gameplayUi.includes(signature))fail(`Vessel gameplay UI does not load voxel viewer asset ${signature}.`);

const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return[];},createElement(){return{};},createElementNS(){return{};}};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,structuredClone,document};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'blacklight-exo-vessel-campaign-voxel-viewer.js'});
const api=context.BlacklightExoVesselCampaignVoxelViewer;if(!api?.placementRows||!api?.routeRows||!api?.project||!api?.normalized||api.version!==1)fail('Campaign voxel viewer API did not initialize.');
const vessel={
  moduleGraph:{modules:[
    {moduleId:'module-reactor',label:'Primary Reactor',category:'power',installationEnvironment:'INTERNAL'},
    {moduleId:'module-radiator',label:'Radiator Wing',category:'thermal',installationEnvironment:'EVA'},
    {moduleId:'module-sensor',label:'Sensor Spine',category:'sensor',installationEnvironment:'EVA'}
  ],utilityEdges:[
    {routeId:'route-power-sensor',fromModuleId:'module-reactor',toModuleId:'module-sensor',medium:'power'},
    {routeId:'route-coolant-radiator',fromModuleId:'module-reactor',toModuleId:'module-radiator',medium:'coolant'}
  ]},
  voxelLayout:{modulePlacements:[
    {placementId:'placement-reactor',moduleId:'module-reactor',position:{x:2,y:4,z:1},width:3,height:2,depth:2},
    {placementId:'placement-radiator',moduleId:'module-radiator',position:{x:8,y:5,z:4},width:4,height:1,depth:1},
    {placementId:'placement-sensor',moduleId:'module-sensor',voxels:[{x:5,y:2,z:5},{x:6,y:2,z:5}]}
  ]},
  conditionHistory:{moduleStates:[
    {moduleId:'module-reactor',installationState:'INSTALLED',damagePercent:0,operational:true,graphParticipation:'FULL'},
    {moduleId:'module-radiator',installationState:'DAMAGED',damagePercent:35,operational:true,graphParticipation:'DEGRADED'},
    {moduleId:'module-sensor',installationState:'INSTALLED',damagePercent:0,operational:true,graphParticipation:'FULL'}
  ],routeStates:[{routeId:'route-power-sensor',functional:true,state:'ACTIVE'},{routeId:'route-coolant-radiator',functional:true,state:'ACTIVE'}]},
  campaignEffectiveState:{moduleStates:[
    {moduleId:'module-reactor',installationState:'DAMAGED',damagePercent:72,operational:false,graphParticipation:'DEGRADED'},
    {moduleId:'module-radiator',installationState:'DESTROYED',damagePercent:100,operational:false,graphParticipation:'NONE'},
    {moduleId:'module-sensor',installationState:'INSTALLED',damagePercent:0,operational:true,graphParticipation:'FULL'}
  ],routeStates:[{routeId:'route-power-sensor',functional:false,state:'SEVERED'},{routeId:'route-coolant-radiator',functional:false,state:'REMOVED'}]}
};
const placements=api.placementRows(vessel);if(placements.length!==3)fail('Campaign voxel viewer did not preserve every VESSEL-04 placement.');
const reactor=placements.find(item=>item.moduleId==='module-reactor'),radiator=placements.find(item=>item.moduleId==='module-radiator'),sensor=placements.find(item=>item.moduleId==='module-sensor');
if(reactor.damagePercent!==72||reactor.operational!==false||reactor.graphParticipation!=='DEGRADED')fail('Campaign effective module state did not override base condition state.');
if(radiator.installationState!=='DESTROYED'||radiator.exposure!=='EVA')fail('Destroyed EVA placement was not classified from campaign authority.');
if(sensor.x!==5.5||sensor.z!==5)fail('Voxel-array centroid was not converted into a placement coordinate.');
const routes=api.routeRows(vessel);if(routes.length!==2||!routes.some(item=>item.routeId==='route-power-sensor'&&item.from==='module-reactor'&&item.to==='module-sensor'))fail('VESSEL-03 utility relationships did not map into the viewer.');
for(const view of ['isometric','top','side','front']){const first=api.normalized(placements,view),second=api.normalized(placements,view);if(JSON.stringify(first)!==JSON.stringify(second))fail(`${view} projection is not deterministic.`);if(first.some(item=>!Number.isFinite(item.screenX)||!Number.isFinite(item.screenY)))fail(`${view} projection produced invalid screen coordinates.`);}
const iso=api.project({x:2,y:4,z:1},'isometric'),top=api.project({x:2,y:4,z:1},'top'),side=api.project({x:2,y:4,z:1},'side'),front=api.project({x:2,y:4,z:1},'front');if(JSON.stringify(top)!==JSON.stringify({x:2,y:4,depth:1})||side.y!==-1||front.x!==4||!Number.isFinite(iso.x))fail('Projection authority does not preserve documented view axes.');

const workflow=await read('.github/workflows/pages.yml');if(!workflow.includes('node scripts/validate-exo-vessel-campaign-voxel-viewer.mjs'))fail('Pages workflow does not gate the VESSEL-10 campaign voxel viewer.');
console.log('EXO vessel VESSEL-10 integrated campaign voxel viewer validation passed.');
console.log('Validated placement identity, campaign-state module overlays, deterministic projections, internal and EVA authority, utility-route mapping, route-state overlay signatures, state filtering, and campaign damage-editor handoff.');
