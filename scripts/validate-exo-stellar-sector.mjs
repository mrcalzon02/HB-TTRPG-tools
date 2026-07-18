import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('blacklight-exo-stellar-sector-example.json',root),'utf8'));
const dataSource=fs.readFileSync(new URL('blacklight-exo-stellar-sector-data.js',root),'utf8');
const html=fs.readFileSync(new URL('blacklight-exo-stellar-sector.html',root),'utf8');
const runtime=fs.readFileSync(new URL('blacklight-exo-stellar-sector.js',root),'utf8');
const bootstrap=fs.readFileSync(new URL('blacklight-exo-system-bootstrap.js',root),'utf8');
const incremental=fs.readFileSync(new URL('blacklight-exo-system-incremental.js',root),'utf8');
const fail=message=>{throw new Error(message);};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,structuredClone};
context.globalThis=context;vm.createContext(context);vm.runInContext(dataSource,context,{filename:'blacklight-exo-stellar-sector-data.js'});
const sector=context.BlacklightExoStellarSectorData?.build?.();
if(manifest.recordType!=='blacklightExoStellarSectorSeedManifest'||manifest.dataModule!=='blacklight-exo-stellar-sector-data.js')fail('Unexpected sector manifest.');
if(sector?.recordType!=='blacklightExoStellarSector'||sector.schemaVersion!=='1.0.0')fail('Unexpected stellar-sector schema.');
if(sector.clusters.length<30)fail('A stellar sector must contain at least thirty clusters.');
if(sector.species.length<24)fail('The example must contain dozens of extant species.');
if(sector.extinctSpecies.length<6)fail('The example must retain multiple extinct species.');
if(sector.polities.length!==sector.species.length)fail('Every extant example species must have a polity authority.');
if(sector.fleetCommands.length!==sector.polities.length)fail('Every polity must have a fleet command and doctrine.');
if(sector.organizations.length<sector.polities.length*3)fail('Military, civilian, and commercial organizations are incomplete.');
if(sector.bestiary.length<15)fail('Sector bestiary is too small.');
const clusterIds=new Set(sector.clusters.map(item=>item.clusterId)),polityIds=new Set(sector.polities.map(item=>item.polityId)),speciesIds=new Set(sector.species.map(item=>item.speciesId));
if(clusterIds.size!==sector.clusters.length||polityIds.size!==sector.polities.length||speciesIds.size!==sector.species.length)fail('Duplicate canonical identifiers found.');
for(const species of sector.species){
  if(!clusterIds.has(species.homeClusterId))fail(`${species.name} has no valid home cluster.`);
  if(!polityIds.has(species.polityId))fail(`${species.name} has no valid polity.`);
  if(!species.technology?.principalBand||!species.technology?.inertialControl||!species.technology?.transit)fail(`${species.name} lacks a complete technology understanding.`);
}
for(const polity of sector.polities){
  if(!polity.controlledClusterIds.length||!polity.controlledClusterIds.every(id=>clusterIds.has(id)))fail(`${polity.name} has invalid territory.`);
  if(!(polity.controlledPlanetCount>0)||!polity.government||!polity.empireScale)fail(`${polity.name} lacks territorial or governmental authority.`);
}
for(const fleet of sector.fleetCommands){
  if(!polityIds.has(fleet.polityId)||!fleet.doctrine||!fleet.loadoutFamilies?.length)fail(`${fleet.name} lacks polity, doctrine, or loadout authority.`);
}
const stances=new Set(sector.species.map(item=>item.sectorStance));
for(const required of['friendly','neutral','wary','hostile','war'])if(!stances.has(required))fail(`Missing ${required} species posture.`);
for(const required of['peaceful','conniving','scientifically-distracted','blatantly-declining','warlike','stately-senatorial'])if(!sector.species.some(item=>item.dispositionArchetype===required))fail(`Missing ${required} civilization archetype.`);
if(!html.includes('blacklight-exo-stellar-sector-data.js')||!runtime.includes('BlacklightExoStellarSectorData'))fail('Sector page does not load the fixed deterministic authority.');
if(!runtime.includes('requestIdleCallback')||!runtime.includes('IntersectionObserver'))fail('Sector runtime is not incrementally scheduled.');
if(bootstrap.includes('await Promise.resolve(globalThis.BlacklightExoMoonCatalogReady)'))fail('Solar bootstrap still blocks on the remote moon catalogue.');
if(!bootstrap.includes('loadCluster')||!bootstrap.includes('loadRoutes'))fail('Solar bootstrap lacks separate cluster and route phases.');
if(!incremental.includes('deferredMoonCatalog')||!incremental.includes("detailMode='summary'"))fail('Fixed Sol records do not support deferred satellite rendering.');
console.log('EXO stellar-sector archive and incremental solar loading validation passed.');