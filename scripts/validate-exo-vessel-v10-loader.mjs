import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const exists=path=>fs.existsSync(new URL(path,root));
const fail=message=>{throw new Error(message);};

const loaderPath='blacklight-exo-vessel-gameplay-ui.js';
const loader=read(loaderPath);
const vesselHtml=read('blacklight-exo-vessel.html');
const workflow=read('.github/workflows/pages.yml');

const dynamicStyles=[
  'blacklight-exo-vessel-campaign.css',
  'blacklight-exo-vessel-diegetic-controls.css',
  'blacklight-exo-vessel-campaign-damage-editor.css',
  'blacklight-exo-vessel-campaign-voxel-viewer.css'
];
const dynamicScripts=[
  'blacklight-exo-vessel-campaign-store.js',
  'blacklight-exo-vessel-diegetic-controls.js',
  'blacklight-exo-vessel-diegetic-sync.js',
  'blacklight-exo-vessel-campaign-damage-editor.js',
  'blacklight-exo-vessel-campaign-voxel-viewer.js',
  'blacklight-exo-vessel-campaign-voxel-route-overlay.js'
];
const staticAssets=['blacklight-exo-vessel-campaign-3d-viewer.css','blacklight-exo-vessel-campaign-3d-viewer.js'];

for(const path of[...dynamicStyles,...dynamicScripts]){
  if(!exists(path))fail(`Canonical VESSEL-10 loader references missing asset ${path}.`);
  if(!loader.includes(`'${path}'`))fail(`Canonical vessel dynamic loader does not include ${path}.`);
}
for(const path of staticAssets){
  if(!exists(path))fail(`Canonical vessel page references missing static asset ${path}.`);
  if(loader.includes(path))fail(`Static vessel 3D asset ${path} remains in the dynamic loader.`);
  const attribute=path.endsWith('.css')?`href="${path}"`:`src="${path}"`;
  if(!vesselHtml.includes(attribute))fail(`Canonical vessel page does not declare static asset ${path}.`);
}
for(let index=1;index<dynamicScripts.length;index++){
  if(loader.indexOf(`'${dynamicScripts[index-1]}'`)>loader.indexOf(`'${dynamicScripts[index]}'`))fail(`VESSEL-10 dynamic script dependency order is invalid between ${dynamicScripts[index-1]} and ${dynamicScripts[index]}.`);
}
if(!loader.includes('let chain=Promise.resolve()')||!loader.includes("blacklight:exo-vessel-v10-ready"))fail('VESSEL-10 dynamic loader does not serialize startup and publish readiness.');
if(!loader.includes("fail?.('vessel-10-interface'"))fail('VESSEL-10 dynamic loader does not report startup failure to runtime supervision.');
if(vesselHtml.indexOf('blacklight-exo-vessel-gameplay-ui.js')<vesselHtml.indexOf('blacklight-exo-vessel-gameplay-runtime.js'))fail('Canonical vessel page loads gameplay UI before gameplay authority.');
if(vesselHtml.indexOf('blacklight-exo-vessel-campaign-3d-viewer.js')<vesselHtml.indexOf('blacklight-exo-vessel-gameplay-ui.js'))fail('Static vessel 3D runtime loads before canonical gameplay and vessel UI binding.');

const requiredSignatures={
  'blacklight-exo-vessel-campaign-store.js':['BlacklightExoVesselCampaignStore','indexedDB','blacklight:exo-vessel-activate'],
  'blacklight-exo-vessel-diegetic-controls.js':['BlacklightExoVesselDiegeticControls','exo-diegetic-selector','exo-diegetic-slider'],
  'blacklight-exo-vessel-diegetic-sync.js':['blacklight:exo-vessel-activate','BlacklightExoVesselDiegeticControls'],
  'blacklight-exo-vessel-campaign-damage-editor.js':['BlacklightExoVesselCampaignDamageEditor','campaignEffectiveState','VESSEL-05_IMMUTABLE','VESSEL-08_UNCHANGED','applyOverlay','resetOverlay'],
  'blacklight-exo-vessel-campaign-voxel-viewer.js':['BlacklightExoVesselCampaignVoxelViewer','placementRows','routeRows','Edit This Module','campaignEffectiveState'],
  'blacklight-exo-vessel-campaign-voxel-route-overlay.js':['BlacklightExoVesselCampaignVoxelRouteOverlay','campaignEffectiveState?.routeStates','data-route-id'],
  'blacklight-exo-vessel-campaign-3d-viewer.js':['BlacklightExoVesselCampaign3DViewer','layout:\'STATIC\'','REQUIRED_STATIC_IDS','bindStaticLayout','boxFaces','cameraProject','routePolylines','showModal']
};
for(const[path,signatures]of Object.entries(requiredSignatures)){
  const text=read(path);
  for(const signature of signatures)if(!text.includes(signature))fail(`${path} lacks ${signature}.`);
}
for(const id of['exo-vessel-campaign-3d-window','exo-vessel-campaign-3d-canvas','exo-vessel-campaign-3d-inspector','exo-vessel-campaign-3d-open'])if(!vesselHtml.includes(`id="${id}"`))fail(`Canonical vessel page lacks static 3D layout element ${id}.`);

const overlaySchema=JSON.parse(read('data/schemas/exo-vessel-campaign-state-overlay.schema.json'));
if(overlaySchema.properties?.recordType?.const!=='blacklightExoVesselCampaignStateOverlay'||overlaySchema.properties?.phase?.const!=='VESSEL-10')fail('Campaign state overlay schema identity is invalid.');
if(overlaySchema.properties?.baseAuthority?.properties?.immutable?.const!==true)fail('Campaign state overlay schema does not preserve immutable source authority.');

for(const validator of[
  'node scripts/validate-exo-vessel-campaign-store.mjs',
  'node scripts/validate-exo-vessel-diegetic-controls.mjs',
  'node scripts/validate-exo-vessel-campaign-damage-editor.mjs',
  'node scripts/validate-exo-vessel-campaign-voxel-viewer.mjs',
  'node scripts/validate-exo-vessel-campaign-3d-viewer.mjs',
  'node scripts/validate-exo-vessel-v10-loader.mjs'
])if(!workflow.includes(validator))fail(`Pages workflow does not gate ${validator}.`);

console.log('Canonical VESSEL-10 integration validation passed with a static 3D viewer layout and separately serialized legacy dynamic layers.');
