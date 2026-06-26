import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const context={globalThis:null,console};
context.globalThis=context;
vm.createContext(context);
for(const file of[
  'kaysender-island-v3-domain.js',
  'kaysender-island-v3-transformers.js',
  'kaysender-island-v3-migration-normalizer.js'
]){
  const source=await fs.readFile(path.join(root,file),'utf8');
  vm.runInContext(source,context,{filename:file});
}

const Domain=context.KaysenderIslandV3Domain;
const Transformers=context.KaysenderIslandV3Transformers;
assert.ok(Domain,'Island v3 domain runtime was not exposed.');
assert.ok(Transformers,'Island v3 transformer runtime was not exposed.');
assert.equal(typeof Transformers.normalizeMigratedCellAreas,'function','Migration area normalizer was not exposed.');

const legacy={
  schemaVersion:'2.0.0',
  profileType:'floating-island-foundation-profile',
  name:'P0 Area Test Island',
  classification:{sizeClass:'village island',shapeProfile:'irregular oval',currentUse:'settled outpost'},
  geometry:{lengthKm:5,widthKm:4,meanThicknessM:200,planAreaKm2:20,usableAreaKm2:12,flatAreaKm2:8,arableAreaKm2:3,grossVolumeKm3:4,estimatedMassMillionTons:500,usableSurfacePercent:60},
  composition:{ordinaryRockPercent:50,floatstonePercent:25,soilSedimentPercent:15,cavernVoidPercent:10},
  motion:{meanAltitudeM:3000,verticalOscillationM:100,minimumAltitudeM:2900,maximumAltitudeM:3100,horizontalDriftKpd:2,altitudePredictability:'predictable cycle',driftPredictability:'charted seasonal route'},
  access:{chartQuality:'usable with corrections',approachProfile:'two reliable approaches'},
  hydrology:{profile:'rain capture and small springs',annualRainfallMm:700},
  terrain:{arableSoilPercent:35},
  resources:{mineralPresence:'mixed industrial minerals',depositScale:'local',mineralAccessibility:'shallow seams'},
  ecology:{habitatAreaKm2:5,wildlifeDensity:'established ecosystem',dominantWildlife:'grazing herds',carryingCapacityIndex:40},
  population:{permanentPopulation:120},
  insertionCapacity:{maximumSupportedPopulation:400,recommendedSettlementSites:1},
  derivedScores:{structuralStability:14},
  warnings:[],
  outputs:{summary:'Synthetic legacy Island for migration validation.',gmNotes:[],wikiDraft:{id:'p0-area-test-island',title:'P0 Area Test Island',category:'Floating Islands'}},
  mapFoundation:{
    columns:2,rows:2,cellWidthKm:2.5,cellHeightKm:2,nominalCellAreaKm2:5,
    cells:[
      {id:'region-a',grid:{x:0,y:0},areaKm2:3,terrain:'pasture',slopeClass:'gentle',access:'edge-access',sites:[]},
      {id:'region-b',grid:{x:1,y:0},areaKm2:4,terrain:'wet basin',slopeClass:'moderate',access:'interior',sites:[]},
      {id:'region-c',grid:{x:0,y:1},areaKm2:5,terrain:'ridge',slopeClass:'steep',access:'interior',sites:[]},
      {id:'region-d',grid:{x:1,y:1},areaKm2:6,terrain:'forest',slopeClass:'gentle',access:'edge-access',sites:[]}
    ],
    siteSlots:[]
  }
};

const migrated=Transformers.migrateV2ToV3(legacy);
assert.equal(migrated.changed,true);
assert.equal(migrated.data.schemaVersion,'3.0.0');
assert.deepEqual(migrated.data.map.activeCellIds,migrated.data.map.cells.map(cell=>cell.id));
const total=migrated.data.map.cells.filter(cell=>migrated.data.map.activeCellIds.includes(cell.id)).reduce((sum,cell)=>sum+Number(cell.areaKm2),0);
assert.ok(Math.abs(total-migrated.data.geometry.planAreaKm2)<1e-6,`Normalized active-cell area ${total} does not equal plan area ${migrated.data.geometry.planAreaKm2}.`);
assert.equal(migrated.data.derived.mapAreaReconciles,true,'Derived map-area reconciliation did not pass.');
assert.equal(Domain.validate(migrated.data).some(item=>item.code==='map-area-mismatch'),false,'Domain validation still reports map-area-mismatch.');
assert.ok(migrated.log.some(item=>item.code==='island-v3-migrated-cell-area-normalization'),'Normalization migration log entry is missing.');

const firstAreas=migrated.data.map.cells.map(cell=>cell.areaKm2);
const normalizedAgain=Transformers.normalizeMigratedCellAreas(migrated.data);
assert.deepEqual(normalizedAgain.map.cells.map(cell=>cell.areaKm2),firstAreas,'Cell-area normalization is not idempotent.');

console.log('Island v3 migration normalization validation passed.');
console.log(`Normalized ${migrated.data.map.cells.length} active cells to ${total} km² without weakening canonical validation.`);
