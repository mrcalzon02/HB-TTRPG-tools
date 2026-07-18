import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const fail=message=>{throw new Error(message);};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,structuredClone};
context.globalThis=context;vm.createContext(context);
for(const file of['blacklight-exo-stellar-sector-data.js','blacklight-exo-stellar-sector-worlds.js','blacklight-exo-stellar-sector-generator.js','blacklight-exo-stellar-sector-contracts.js'])vm.runInContext(read(file),context,{filename:file});
const D=context.BlacklightExoStellarSectorData;
if(!D?.build||!D?.generate||!D?.validate)fail('Stellar-sector authority is unavailable.');

function hashText(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
const hashSector=sector=>hashText(JSON.stringify(sector));
const envelope=(sector,note)=>({recordType:'blacklightExoStellarSectorArchive',schemaVersion:'1.0.0',recordedAt:'2026-07-18T00:00:00.000Z',note,archiveHash:hashSector(sector),sector:structuredClone(sector)});

function roundTrip(record){return JSON.parse(JSON.stringify(record));}
function verifyEnvelope(record,label){
  if(record.recordType!=='blacklightExoStellarSectorArchive'||record.schemaVersion!=='1.0.0')fail(`${label} archive envelope schema is invalid.`);
  const validation=D.validate(record.sector);if(!validation.valid)fail(`${label} archive sector is invalid: ${validation.violations.join(' ')}`);
  const actual=hashSector(record.sector);if(actual!==record.archiveHash)fail(`${label} archive hash changed during round-trip.`);
}

const fixed=D.build();
const procedural=D.generate('ARCHIVE:VALIDATION:SECTOR',{clusterCount:32,speciesCount:24});
const fixedArchive=roundTrip(envelope(fixed,'fixed example checkpoint'));
const proceduralArchive=roundTrip(envelope(procedural,'procedural checkpoint'));
verifyEnvelope(fixedArchive,'Fixed');
verifyEnvelope(proceduralArchive,'Procedural');

const rebuiltFixed=D.build();
if(hashSector(rebuiltFixed)!==fixedArchive.archiveHash)fail('Fixed example does not reproduce its recorded archive hash.');
const rebuiltProcedural=D.generate(proceduralArchive.sector.seed,proceduralArchive.sector.generationParameters);
if(hashSector(rebuiltProcedural)!==proceduralArchive.archiveHash)fail('Procedural sector does not reproduce its recorded archive hash.');
if(JSON.stringify(rebuiltProcedural)!==JSON.stringify(proceduralArchive.sector))fail('Procedural archive replay differs despite matching generation parameters.');

const tampered=roundTrip(proceduralArchive);tampered.sector.worlds[0].name=`${tampered.sector.worlds[0].name} TAMPERED`;
if(hashSector(tampered.sector)===tampered.archiveHash)fail('Archive hash did not detect modified sector content.');
const parameterTamper=D.generate(proceduralArchive.sector.seed,{...proceduralArchive.sector.generationParameters,speciesCount:12});
if(hashSector(parameterTamper)===proceduralArchive.archiveHash)fail('Archive hash did not distinguish changed generation parameters.');

const archiveSource=read('blacklight-exo-sector-archive-store.js');
for(const signature of['indexedDB.open','createObjectStore','archiveHash','validateEnvelope','migrateLegacy','Import Sector Archive','waitForSector','Deterministic replay mismatch'])if(!archiveSource.includes(signature))fail(`Archive runtime lacks ${signature}.`);
const manifest=JSON.parse(read('blacklight-exo-stellar-sector-example.json'));
if(!manifest.modules?.includes('blacklight-exo-sector-archive-store.js')||!manifest.archiveStorage?.includes('IndexedDB'))fail('Fixed sector manifest does not pin durable archive storage.');

console.log(`EXO durable sector archive validation passed: fixed ${fixedArchive.archiveHash}; procedural ${proceduralArchive.archiveHash}.`);