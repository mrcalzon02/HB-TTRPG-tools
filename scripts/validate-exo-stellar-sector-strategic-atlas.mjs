import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const json=path=>JSON.parse(read(path));
const fail=message=>{throw new Error(message);};
const files=['blacklight-exo-stellar-sector-data.js','blacklight-exo-stellar-sector-worlds.js','blacklight-exo-stellar-sector-generator.js','blacklight-exo-stellar-sector-contracts.js','blacklight-exo-stellar-sector-strategic-atlas.js','blacklight-exo-stellar-sector-extinct-sites.js'];
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,structuredClone};context.globalThis=context;vm.createContext(context);for(const file of files)vm.runInContext(read(file),context,{filename:file});
const D=context.BlacklightExoStellarSectorData;
if(!D?.build||!D?.generate||!D?.validate||!D?.migrate||D.schemaVersion!=='1.2.0'||D.strategicAtlasVersion!==1||D.extinctSiteLinkVersion!==1)fail('Strategic-atlas sector API is incomplete.');
const fixed=D.build(),procedural=D.generate('VALIDATION:STRATEGIC:ATLAS',{clusterCount:32,speciesCount:24}),repeat=D.generate('VALIDATION:STRATEGIC:ATLAS',{clusterCount:32,speciesCount:24});
if(JSON.stringify(procedural)!==JSON.stringify(repeat))fail('Strategic-atlas procedural generation is not deterministic.');

function validateAtlas(sector,label){
  const validation=D.validate(sector);if(!validation.valid)fail(`${label} strategic atlas failed: ${validation.violations.join(' ')}`);
  if(sector.recordType!=='blacklightExoStellarSector'||sector.schemaVersion!=='1.2.0')fail(`${label} strategic atlas schema identity is invalid.`);
  if(sector.territorialRegions.length!==sector.polities.length)fail(`${label} does not have one territorial region per polity.`);
  if(sector.technologyProfiles.length!==sector.species.length)fail(`${label} does not have one technology profile per extant species.`);
  if(sector.organizationNetworks.length!==sector.organizations.length)fail(`${label} does not have one network per organization.`);
  const taskForceCount=sector.fleetCommands.reduce((sum,fleet)=>sum+(fleet.taskForces?.length||0),0);
  if(sector.militaryFormations.length!==taskForceCount)fail(`${label} does not have one named formation per task force.`);
  if(sector.strategicCorridors.length<Math.max(4,Math.floor(sector.polities.length/3)))fail(`${label} lacks sector-scale corridor depth.`);
  if(sector.extinctSites.length<sector.extinctSpecies.length)fail(`${label} lacks one or more canonical sites for every extinct civilization.`);
  const clusterIds=new Set(sector.clusters.map(item=>item.clusterId)),worldIds=new Set(sector.worlds.map(item=>item.worldId)),polityIds=new Set(sector.polities.map(item=>item.polityId)),fleetIds=new Set(sector.fleetCommands.map(item=>item.fleetId)),organizationIds=new Set(sector.organizations.map(item=>item.organizationId));
  for(const region of sector.territorialRegions){if(!polityIds.has(region.polityId)||![...region.coreClusterIds,...region.frontierClusterIds,...region.contestedClusterIds].every(id=>clusterIds.has(id))||!region.controlledWorldIds.every(id=>worldIds.has(id)))fail(`${label} region ${region.regionId} has invalid territory.`);}
  for(const corridor of sector.strategicCorridors)if(!polityIds.has(corridor.polityId)||!clusterIds.has(corridor.fromClusterId)||!clusterIds.has(corridor.toClusterId)||corridor.distanceLy<0||!corridor.infrastructure.length)fail(`${label} corridor ${corridor.corridorId} is invalid.`);
  for(const profile of sector.technologyProfiles)for(const field of['transitUnderstanding','energyUnderstanding','inertialControlUnderstanding','sensorUnderstanding','weaponUnderstanding','defensiveUnderstanding','industrialUnderstanding','biologicalInterface','interoperability'])if(!profile[field])fail(`${label} technology profile ${profile.technologyProfileId} lacks ${field}.`);
  for(const formation of sector.militaryFormations){if(!fleetIds.has(formation.fleetId)||!polityIds.has(formation.polityId))fail(`${label} formation ${formation.formationId} has invalid fleet or polity authority.`);for(const field of['primary','secondary','defense','sensors','logistics','boarding'])if(!formation.doctrinalLoadout?.[field])fail(`${label} formation ${formation.formationId} lacks ${field} loadout authority.`);if(!(formation.hullComposition?.escorts>=1)||!(formation.hullComposition?.logisticsHulls>=1))fail(`${label} formation ${formation.formationId} lacks a usable hull composition.`);}
  for(const network of sector.organizationNetworks)if(!organizationIds.has(network.organizationId)||!polityIds.has(network.polityId)||(network.headquartersWorldId&&!worldIds.has(network.headquartersWorldId))||!network.assets.length||!network.obligations.length)fail(`${label} organization network ${network.networkId} is invalid.`);
  const sitesBySpecies=new Map();for(const site of sector.extinctSites){sitesBySpecies.set(site.extinctSpeciesId,(sitesBySpecies.get(site.extinctSpeciesId)||0)+1);if(!worldIds.has(site.worldId)||!clusterIds.has(site.clusterId)||!site.relics.length||!site.primaryHazard)fail(`${label} extinct site ${site.siteId} is invalid.`);}for(const species of sector.extinctSpecies)if(!sitesBySpecies.get(species.speciesId))fail(`${label} extinct species ${species.speciesId} lacks a site.`);
  const summary=sector.summary||{};for(const [field,value]of[['territorialRegionCount',sector.territorialRegions.length],['strategicCorridorCount',sector.strategicCorridors.length],['militaryFormationCount',sector.militaryFormations.length],['organizationNetworkCount',sector.organizationNetworks.length],['technologyProfileCount',sector.technologyProfiles.length],['extinctSiteCount',sector.extinctSites.length]])if(summary[field]!==value)fail(`${label} summary ${field} is inconsistent.`);
}
validateAtlas(fixed,'Fixed');validateAtlas(procedural,'Procedural');

const sourceAuthorityFields=['clusters','worlds','species','extinctSpecies','polities','fleetCommands','organizations','relations','bestiary'];
const legacy=structuredClone(fixed);legacy.schemaVersion='1.1.0';for(const field of['territorialRegions','strategicCorridors','technologyProfiles','militaryFormations','organizationNetworks','extinctSites'])delete legacy[field];for(const field of['territorialRegionCount','strategicCorridorCount','militaryFormationCount','organizationNetworkCount','technologyProfileCount','extinctSiteCount'])delete legacy.summary[field];delete legacy.archivePolicy.strategicAtlasSchema;delete legacy.archivePolicy.migrationRule;
const sourceBefore=Object.fromEntries(sourceAuthorityFields.map(field=>[field,JSON.stringify(legacy[field])]));const migrated=D.migrate(legacy);validateAtlas(migrated,'Migrated 1.1');for(const field of sourceAuthorityFields)if(JSON.stringify(migrated[field])!==sourceBefore[field])fail(`Strategic migration destructively changed source authority ${field}.`);
if(JSON.stringify(D.migrate(migrated))!==JSON.stringify(migrated))fail('Strategic migration is not idempotent.');

const schema=json('data/schemas/exo-stellar-sector-strategic-atlas.schema.json'),registry=json('data/exo-stellar-sector/strategic-atlas-registry.json');
if(schema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-stellar-sector-strategic-atlas.schema.json'||schema.properties?.schemaVersion?.const!=='1.2.0')fail('Strategic-atlas schema identity is invalid.');
for(const field of['territorialRegions','strategicCorridors','technologyProfiles','militaryFormations','organizationNetworks','extinctSites'])if(!schema.required?.includes(field))fail(`Strategic-atlas schema does not require ${field}.`);
if(registry.recordType!=='blacklightExoStellarSectorStrategicAtlasRegistry'||registry.sectorSchemaVersion!=='1.2.0'||registry.determinismPolicy?.migrationFromSectorSchema!=='1.1.0')fail('Strategic-atlas registry identity or migration policy is invalid.');

const html=read('blacklight-exo-stellar-sector.html'),ui=read('blacklight-exo-stellar-sector-strategic-ui.js'),worldLayer=read('blacklight-exo-stellar-sector-worlds.js'),archive=read('blacklight-exo-sector-archive-store.js'),manifest=json('blacklight-exo-stellar-sector-example.json'),workflow=read('.github/workflows/pages.yml');
const orderedScripts=['blacklight-exo-stellar-sector-generator.js','blacklight-exo-stellar-sector-contracts.js','blacklight-exo-stellar-sector-strategic-atlas.js','blacklight-exo-stellar-sector-extinct-sites.js','blacklight-exo-stellar-sector.js','blacklight-exo-stellar-sector-strategic-ui.js','blacklight-exo-sector-archive-store.js'];for(let index=1;index<orderedScripts.length;index++)if(html.indexOf(orderedScripts[index-1])<0||html.indexOf(orderedScripts[index-1])>=html.indexOf(orderedScripts[index]))fail(`Static sector script order is invalid between ${orderedScripts[index-1]} and ${orderedScripts[index]}.`);
const staticIds=['exo-sector-import','exo-sector-import-file','exo-sector-summary-atlas','exo-sector-summary-corridors','exo-sector-regions-section','exo-sector-regions-grid','exo-sector-technologies-section','exo-sector-technologies-grid','exo-sector-corridors-section','exo-sector-corridors-grid','exo-sector-formations-section','exo-sector-formations-grid','exo-sector-networks-section','exo-sector-networks-grid','exo-sector-extinct-sites-section','exo-sector-extinct-sites-grid'];for(const id of staticIds)if(!html.includes(`id="${id}"`))fail(`Static sector page lacks ${id}.`);
for(const signature of["layout:'STATIC'",'REQUIRED_STATIC_IDS','stellar-sector-strategic-static-layout','territorialRegions','militaryFormations','organizationNetworks','extinctSites'])if(!ui.includes(signature))fail(`Static strategic UI lacks ${signature}.`);
for(const forbidden of['insertAdjacentElement(','document.querySelector(\'main\')?.append','createSection('])if(worldLayer.includes(forbidden)||ui.includes(forbidden))fail(`Sector data or strategic UI still mutates page structure through ${forbidden}.`);
for(const signature of["layout:'STATIC'",'migratedFromSchema','sourceArchiveHash','D?.migrate','stellar-sector-archive-static-layout'])if(!archive.includes(signature))fail(`Strategic archive runtime lacks ${signature}.`);
for(const forbidden of["createElement('input')",'actions.append(importButton'])if(archive.includes(forbidden))fail(`Archive runtime still dynamically creates static controls through ${forbidden}.`);
if(manifest.schemaVersion!=='1.2.0'||!manifest.modules.includes('blacklight-exo-stellar-sector-strategic-atlas.js')||!manifest.modules.includes('blacklight-exo-stellar-sector-extinct-sites.js')||!manifest.modules.includes('blacklight-exo-stellar-sector-strategic-ui.js'))fail('Fixed sector manifest does not pin the complete strategic-atlas stack.');
if(!workflow.includes('node scripts/validate-exo-stellar-sector-strategic-atlas.mjs'))fail('Pages workflow does not gate strategic-atlas validation.');

console.log(`EXO stellar-sector strategic atlas validation passed: fixed ${fixed.clusters.length} clusters / ${fixed.species.length} extant species / ${fixed.militaryFormations.length} formations / ${fixed.extinctSites.length} extinct sites; procedural deterministic and 1.1 migration non-destructive.`);
