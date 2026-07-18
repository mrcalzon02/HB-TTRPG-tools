import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const exists=path=>fs.existsSync(new URL(path,root));
const fail=message=>{throw new Error(message);};

const solarHtml=read('blacklight-exo-solar-system.html');
const sectorHtml=read('blacklight-exo-stellar-sector.html');
const bootstrap=read('blacklight-exo-system-bootstrap.js');
const jpl=read('blacklight-exo-jpl-moon-catalog-loader.js');
const sectorRuntime=read('blacklight-exo-stellar-sector.js');
const supervisor=read('blacklight-exo-runtime-supervisor.js');

for(const id of['exo-generate-system','exo-force-populated-hz','exo-generate-cluster','exo-random-cluster','exo-cluster-status','exo-seed-input','exo-orbit-svg','exo-orbital-table-body'])if(!solarHtml.includes(`id="${id}"`))fail(`Solar page is missing browser control ${id}.`);
for(const id of['exo-sector-load-example','exo-sector-generate','exo-sector-random','exo-sector-export','exo-sector-save','exo-sector-map','exo-sector-worlds-body','exo-sector-relations-grid'])if(!sectorHtml.includes(`id="${id}"`))fail(`Sector page is missing browser control ${id}.`);

const solarOrder=['blacklight-exo-source-authority.js','blacklight-exo-fixed-system-data.js','blacklight-exo-jpl-moon-catalog-loader.js','blacklight-exo-system-bootstrap.js'];
for(let index=1;index<solarOrder.length;index++)if(solarHtml.indexOf(solarOrder[index-1])>=solarHtml.indexOf(solarOrder[index]))fail('Solar page script order is invalid.');
const sectorOrder=['blacklight-exo-stellar-sector-data.js','blacklight-exo-stellar-sector-worlds.js','blacklight-exo-stellar-sector-generator.js','blacklight-exo-stellar-sector-contracts.js','blacklight-exo-stellar-sector.js'];
for(let index=1;index<sectorOrder.length;index++)if(sectorHtml.indexOf(sectorOrder[index-1])>=sectorHtml.indexOf(sectorOrder[index]))fail('Sector page script order is invalid.');

const dynamicScripts=[...new Set([...bootstrap.matchAll(/['"](blacklight-exo-[^'"]+\.js)['"]/g)].map(match=>match[1]))];
for(const script of dynamicScripts)if(!exists(script))fail(`Incremental bootstrap references missing script ${script}.`);
if(bootstrap.indexOf("load('blacklight-exo-runtime-supervisor.js')")>bootstrap.indexOf('await loadCore()'))fail('Runtime supervisor loads after Solar core startup.');
if(!bootstrap.includes('loadEcologyAndImagery')||!bootstrap.includes('loadCluster')||!bootstrap.includes('loadRoutes'))fail('Solar optional layers are not independently activated.');
if(!jpl.includes('requestIdleCallback')||!jpl.includes('AbortController')||!jpl.includes('timeoutMs=8000'))fail('Satellite catalogue is not deferred and time-bounded.');
if(!supervisor.includes('unhandledrejection')||!supervisor.includes('blacklightExoRuntimeDiagnostics'))fail('Runtime supervisor does not capture browser failures.');
if(!sectorRuntime.includes('requestIdleCallback')||!sectorRuntime.includes('IntersectionObserver')||!sectorRuntime.includes('loadSnapshot'))fail('Sector runtime lacks incremental rendering or archive replay.');

const dataContext={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,structuredClone};dataContext.globalThis=dataContext;vm.createContext(dataContext);
for(const file of['blacklight-exo-stellar-sector-data.js','blacklight-exo-stellar-sector-worlds.js','blacklight-exo-stellar-sector-generator.js','blacklight-exo-stellar-sector-contracts.js'])vm.runInContext(read(file),dataContext,{filename:file});
const authority=dataContext.BlacklightExoStellarSectorData;
const fixed=authority.build(),generated=authority.generate('BROWSER:SMOKE:SECTOR',{clusterCount:24,speciesCount:12}),repeat=authority.generate('BROWSER:SMOKE:SECTOR',{clusterCount:24,speciesCount:12});
if(!authority.validate(fixed).valid||!authority.validate(generated).valid)fail('Fixed or procedural sector fails browser-facing contracts.');
if(JSON.stringify(generated)!==JSON.stringify(repeat))fail('Procedural sector replay differs for the same browser seed.');
if(generated.clusters.length!==24||generated.species.length!==12)fail('Procedural browser controls do not map to requested sector scale.');

const failures=[];
const fixedSystems={error:null,installMoonCatalog(){throw new Error('Offline smoke unexpectedly installed a catalogue.');},markCatalogFailure(error){this.error=String(error);},getCatalogSummary(){return{status:'error',error:this.error,moons:0};}};
const fallbackContext={console:{error(){},warn(){},log(){}},Promise,Error,Object,Array,String,Number,RegExp,Math,setTimeout,clearTimeout,AbortController,localStorage:{getItem(){return null;},setItem(){}},fetch:async()=>{throw new Error('simulated offline source');},requestIdleCallback:callback=>{queueMicrotask(callback);return 1;},queueMicrotask,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},document:{dispatchEvent(){}},BlacklightExoFixedSystems:fixedSystems,BlacklightExoRuntimeSupervisor:{start(){},ready(){},fail(phase,error){failures.push({phase,error:String(error)});}}};fallbackContext.globalThis=fallbackContext;vm.createContext(fallbackContext);vm.runInContext(jpl,fallbackContext,{filename:'blacklight-exo-jpl-moon-catalog-loader.js'});
const summary=await fallbackContext.BlacklightExoMoonCatalogReady;
if(summary.status!=='error'||!fixedSystems.error)fail('Offline satellite catalogue did not degrade to the fixed-system fallback.');
if(!failures.some(item=>item.phase==='satellite-catalogue'))fail('Offline catalogue failure was not reported to the browser supervisor.');

console.log('EXO browser contract smoke validation passed.');
