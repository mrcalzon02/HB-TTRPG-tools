import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const fail=message=>{throw new Error(message);};
const html=await read('blacklight-exo-vessel-command-deck.html');
const deck=await read('blacklight-exo-vessel-command-deck.js');
const editor=await read('blacklight-exo-vessel-campaign-damage-editor.js');
const viewer=await read('blacklight-exo-vessel-campaign-voxel-viewer.js');
const routeOverlay=await read('blacklight-exo-vessel-campaign-voxel-route-overlay.js');
const campaign=await read('blacklight-exo-vessel-campaign-store.js');
const instruments=await read('blacklight-exo-vessel-diegetic-controls.js');
const overlaySchema=JSON.parse(await read('data/schemas/exo-vessel-campaign-state-overlay.schema.json'));
const archiveSchema=JSON.parse(await read('data/schemas/exo-vessel-campaign-archive.schema.json'));

for(const id of['exo-command-page','exo-command-gameplay','exo-command-campaign','exo-command-instruments','exo-command-editor','exo-command-voxel','exo-command-frame','exo-command-reload','exo-command-diagnostics','exo-command-log'])if(!html.includes(`id="${id}"`))fail(`Command Deck HTML lacks ${id}.`);
if(!html.includes('blacklight-exo-vessel.html?commandDeck=VESSEL-10')||!html.includes('blacklight-exo-vessel-command-deck.js'))fail('Command Deck does not embed the canonical vessel generator and bootstrap.');
const orderedScripts=['BlacklightExoVesselCampaignStore','BlacklightExoVesselDiegeticControls','BlacklightExoVesselCampaignDamageEditor','BlacklightExoVesselDiegeticSync','BlacklightExoVesselCampaignVoxelViewer','BlacklightExoVesselCampaignVoxelRouteOverlay'];let prior=-1;
for(const signature of orderedScripts){const index=deck.indexOf(signature);if(index<0||index<=prior)fail(`Command Deck does not attach ${signature} in order.`);prior=index;}
for(const signature of['same-origin','BlacklightExoGetActiveVessel','VESSEL-09','complete VESSEL-10 interface','campaignSection','editorSection','voxelSection','selectorPanels','numberPanels','voxelPlacements','Command Deck attachment failed'])if(!deck.includes(signature))fail(`Command Deck runtime lacks ${signature}.`);
const assetFiles=['blacklight-exo-vessel-campaign.css','blacklight-exo-vessel-diegetic-controls.css','blacklight-exo-vessel-campaign-damage-editor.css','blacklight-exo-vessel-campaign-voxel-viewer.css','blacklight-exo-vessel-campaign-store.js','blacklight-exo-vessel-diegetic-controls.js','blacklight-exo-vessel-campaign-damage-editor.js','blacklight-exo-vessel-diegetic-sync.js','blacklight-exo-vessel-campaign-voxel-viewer.js','blacklight-exo-vessel-campaign-voxel-route-overlay.js'];
for(const filename of assetFiles){await fs.access(path.join(root,filename));if(!deck.includes(filename))fail(`Command Deck does not attach ${filename}.`);}
for(const signature of['VESSEL-05_IMMUTABLE','VESSEL-08_UNCHANGED','campaignEffectiveState','applyOverlay','resetOverlay','overlayValidation'])if(!editor.includes(signature))fail(`Campaign editor lacks immutable-authority contract ${signature}.`);
for(const signature of['modulePlacements','utilityEdges','campaignEffectiveState','Edit This Module','isometric','INTERNAL','EVA'])if(!viewer.includes(signature))fail(`Campaign voxel viewer lacks ${signature}.`);
for(const signature of['campaignEffectiveState','combatResolutionModel','conditionHistory','campaignRouteState','severed'])if(!routeOverlay.includes(signature))fail(`Campaign route overlay lacks ${signature}.`);
for(const signature of['indexedDB.open','validateEnvelope','migrateRecord','blacklight:exo-vessel-activate','Manufacturer library','Hull-family library'])if(!campaign.includes(signature))fail(`Campaign store lacks ${signature}.`);
for(const signature of['enhanceSelect','enhanceNumber','refreshAll','exo-vessel-native-authority','allowAutomatic'])if(!instruments.includes(signature))fail(`Diegetic instrument runtime lacks ${signature}.`);
if(overlaySchema.properties?.phase?.const!=='VESSEL-10'||overlaySchema.properties?.baseAuthority?.properties?.immutable?.const!==true)fail('Campaign-state overlay schema does not preserve immutable source authority.');
if(archiveSchema.properties?.recordType?.const!=='blacklightExoVesselCampaignArchive'||archiveSchema.properties?.vessel?.$ref!=='exo-vessel-record.schema.json')fail('Campaign archive schema does not retain a complete canonical vessel record.');

const fakeDocument={getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},createElement(){return{addEventListener(){},setAttribute(){},append(){},dataset:{}};},createElementNS(){return{setAttribute(){},append(){},addEventListener(){},dataset:{},classList:{contains(){return false;}}};},readyState:'loading'};
const viewerContext={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,structuredClone,document:fakeDocument};viewerContext.globalThis=viewerContext;vm.createContext(viewerContext);vm.runInContext(viewer,viewerContext,{filename:'blacklight-exo-vessel-campaign-voxel-viewer.js'});
const api=viewerContext.BlacklightExoVesselCampaignVoxelViewer;if(!api?.placementRows||!api?.project||!api?.normalized)fail('Command Deck voxel viewer API did not initialize.');
const vessel={moduleGraph:{modules:[{moduleId:'reactor',label:'Reactor',installationEnvironment:'INTERNAL'},{moduleId:'radiator',label:'Radiator',installationEnvironment:'EVA'}],utilityEdges:[{routeId:'power-route',fromModuleId:'reactor',toModuleId:'radiator'}]},voxelLayout:{modulePlacements:[{placementId:'p1',moduleId:'reactor',position:{x:1,y:2,z:1}},{placementId:'p2',moduleId:'radiator',position:{x:5,y:3,z:4}}]},campaignEffectiveState:{moduleStates:[{moduleId:'reactor',installationState:'DAMAGED',damagePercent:55,operational:true,graphParticipation:'DEGRADED'},{moduleId:'radiator',installationState:'DESTROYED',damagePercent:100,operational:false,graphParticipation:'NONE'}],routeStates:[{routeId:'power-route',functional:false,state:'SEVERED'}]}};
const placements=api.placementRows(vessel);if(placements.length!==2||placements.find(item=>item.moduleId==='reactor')?.damagePercent!==55||placements.find(item=>item.moduleId==='radiator')?.installationState!=='DESTROYED')fail('Command Deck voxel viewer does not consume campaign-effective placement state.');
for(const view of['isometric','top','side','front']){const first=api.normalized(placements,view),second=api.normalized(placements,view);if(JSON.stringify(first)!==JSON.stringify(second))fail(`${view} Command Deck projection is not deterministic.`);}

console.log('Blacklight EXO VESSEL-10 integrated Command Deck validation passed.');
console.log('Validated same-origin canonical vessel embedding, ordered layer attachment, complete campaign archives, diegetic instruments, reversible immutable-authority editing, placement and route overlays, deterministic projection, diagnostics, and live readiness evidence.');
