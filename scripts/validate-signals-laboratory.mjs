#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Lab=require('../signals-laboratory.js');
const U=Lab.utilities;

assert.equal(Lab.constants.VERSION,'0.6.0');
assert.equal(Lab.constants.PANEL_ID,'signals-laboratory');
assert.equal(Array.isArray(Lab.constants.EXPERIMENT_CATALOG),true);
assert.equal(Lab.constants.EXPERIMENT_CATALOG.length,14);
for(const name of [
  'heterodyneProducts','adjacentCarrierProbe','inferSourceCandidates','buildEnvironmentMap','progressiveEnvironmentMaps','environmentPoint',
  'halfWaveDipolePowerPattern','monopolePowerPattern','wifiPreset','bandpassTuningResponse','mapWithDbOffset','combineIndependentMaps',
  'mapStatistics','compareMaps','mapConvergence','resolutionDiagnostics','interfrequencyExperiment','buildReceiverMixingMap','buildPropagatingProductMap',
  'buildExperimentSuite','materialPreset','materialProperties','normalizeSurface','linePlaneIntersection','pointWithinSurface','pointWithinAperture',
  'surfaceInteraction','adaptiveEnvironmentSamples','buildSurfaceScene','experimentCatalog','buildExperimentDataLayout','buildExperimentRunRecord',
  'serializeExperimentRunRecord','project3DPoint','buildFieldVolumeSamples','buildAntennaLobeSamples','buildEnvironmentSurfaceMesh','buildMixerProductScene'
]) assert.equal(typeof U[name],'function',`${name} should be exported`);

const catalog=U.experimentCatalog();
assert.equal(catalog.length,14);
assert.equal(new Set(catalog.map(row=>row.id)).size,catalog.length);
for(const row of catalog){
  assert.ok(row.id&&row.label&&row.category&&row.question);
  assert.ok(row.independentVariables.length>0);
  assert.ok(row.controlledVariables.length>0);
  assert.ok(row.observables.length>0);
  assert.ok(row.derivedOutputs.length>0);
  assert.ok(row.assumptions.length>0);
}
for(const id of ['rf-baseline','antenna-tuning','q-bandwidth','impedance-response','material-penetration','aperture-transport','coherent-multipath','secondary-carrier','receiver-interfrequency','source-intermodulation','adaptive-sampling','resolution-limit','heterodyne-inference','range-scenarios']) assert.ok(catalog.some(row=>row.id===id),`catalog should contain ${id}`);

const L=.120e-6,C=10e-12,resonance=U.resonantFrequency(L,C),antenna={resonantHz:resonance,resistanceOhm:50,inductanceH:L,capacitanceF:C,q:8,feedOhm:50};
assert.ok(Math.abs(resonance-145287920.783)<1);
assert.ok(U.antennaResponse(resonance,antenna).voltageTransfer>U.antennaResponse(resonance*2,antenna).voltageTransfer);
const centered=U.bandpassTuningResponse(2.437e9,2.437e9,12),detuned=U.bandpassTuningResponse(2.462e9,2.437e9,24);
assert.ok(centered.responseDb>-1e-9);assert.ok(detuned.responseDb<0);

const heterodyne=U.heterodyneProducts(145.8e6,135.1e6);
assert.equal(heterodyne.differenceHz,10.7e6);assert.equal(heterodyne.sumHz,280.9e6);
const carrierProbe=U.adjacentCarrierProbe({carrierHz:145e6,sourceHz:145.8e6,receiverCenterHz:800e3,receiverBandwidthHz:25e3,coupling:.05,nonlinearity:.03,carrierAmplitude:1,sourceAmplitude:.1});
assert.equal(carrierProbe.beatHz,800e3);assert.ok(carrierProbe.inBandProducts.some(product=>Math.abs(product.frequencyHz-800e3)<1e-6));

assert.equal(U.halfWaveDipolePowerPattern(0),0);
assert.ok(Math.abs(U.halfWaveDipolePowerPattern(Math.PI/2)-1)<1e-12);
const drywall=U.materialProperties('drywall',2.437e9),concrete=U.materialProperties('concrete',2.437e9),metal=U.materialProperties('metal',2.437e9);
assert.ok(concrete.penetrationLossDb>drywall.penetrationLossDb);
assert.ok(metal.reflectivity>concrete.reflectivity);
assert.ok(U.materialProperties('concrete',5.18e9).penetrationLossDb>concrete.penetrationLossDb);
assert.equal(U.materialPreset('open').penetrationLossDb,0);

const source={x:0,y:0,z:1.8,frequencyHz:2.437e9,txPowerDbm:20,antennaType:'dipole',azimuthDeg:0,elevationDeg:90};
const surfaceDoor=U.normalizeSurface({axis:'x',coordinateM:3,material:'drywall',spanStartM:-5,spanEndM:5,zMinM:0,zMaxM:3,apertures:[{startM:-1,endM:1,zMinM:0,zMaxM:2.2}]},{widthM:12,heightM:10});
const throughDoor=U.surfaceInteraction(source,{x:6,y:0,z:1.2},surfaceDoor,source.frequencyHz,{widthM:12,heightM:10});
assert.equal(throughDoor.crosses,true);assert.ok(throughDoor.aperture);assert.equal(throughDoor.penetrationLossDb,0);
const throughWall=U.surfaceInteraction(source,{x:6,y:3,z:1.2},surfaceDoor,source.frequencyHz,{widthM:12,heightM:10});
assert.equal(throughWall.blocked,true);assert.ok(throughWall.penetrationLossDb>0);
const glassSurface=U.normalizeSurface({axis:'y',coordinateM:-2,material:'glass',spanStartM:-6,spanEndM:6,zMinM:0,zMaxM:3,apertures:[]},{widthM:12,heightM:10});
const surfaces=[surfaceDoor,glassSurface];
const env={widthM:12,heightM:10,resolutionX:24,resolutionY:24,sampleHeightM:1.2,receiverGainDb:0,coherence:.85,source,surfaces,reflectors:surfaces};
const base=U.buildEnvironmentMap(env);
assert.equal(base.values.length,576);assert.ok(base.fadeDepthDb>0);assert.ok(base.materialNames.includes('drywall')&&base.materialNames.includes('glass'));

const metalSurface=U.normalizeSurface({...surfaceDoor,material:'metal',apertures:[]},{widthM:12,heightM:10});
const drywallPoint=U.environmentPoint({source,receiver:{x:6,y:3,z:1.2,gainDb:0},surfaces:[surfaceDoor],coherence:0,environment:env});
const metalPoint=U.environmentPoint({source,receiver:{x:6,y:3,z:1.2,gainDb:0},surfaces:[metalSurface],coherence:0,environment:{...env,surfaces:[metalSurface]}});
assert.ok(metalPoint.directDbm<drywallPoint.directDbm);

const tuned=U.mapWithDbOffset(base,-6,'tuned');
assert.ok(Math.abs((tuned.meanDbm-base.meanDbm)+6)<1e-9);
const source2={...source,x:3,y:-2,frequencyHz:2.462e9,txPowerDbm:17};
const secondary=U.buildEnvironmentMap({...env,source:source2});
const combined=U.combineIndependentMaps([base,secondary]);
assert.equal(combined.values.length,576);
const stats=U.mapStatistics(base,{thresholdDbm:-90});assert.ok(stats.detectableAreaFraction>=0&&stats.detectableAreaFraction<=1);
const cmp=U.compareMaps(base,tuned,{thresholdDbm:-90});assert.ok(Math.abs(cmp.meanLevelDeltaDb+6)<1e-9);
const progressive=U.progressiveEnvironmentMaps({...env,resolutions:[16,32,48]});assert.deepEqual(progressive.map(m=>m.resolutionX),[16,32,48]);assert.ok(U.mapConvergence(progressive[0],progressive[2])>=0);
const diag=U.resolutionDiagnostics(base,[2.437e9,2.462e9],{snrDb:15,coherence:.85,q:8});assert.equal(diag.undersampled,true);assert.ok(diag.shortestWavelengthM<.13);

const adaptive=U.adaptiveEnvironmentSamples({...env,startResolution:4,maxResolution:16,gradientThresholdDb:.5,snrStopDbm:-140,wavelengthDriven:false,maxCells:1024,frequenciesHz:[2.437e9]});
assert.equal(adaptive.method,'adaptive-sampling-over-authoritative-environmentPoint-kernel');assert.ok(adaptive.leafCellCount>=16);assert.ok(adaptive.refinedCellCount>0);
const adaptiveWavelength=U.adaptiveEnvironmentSamples({...env,startResolution:4,maxResolution:8,gradientThresholdDb:999,snrStopDbm:-140,wavelengthDriven:true,maxCells:256,frequenciesHz:[2.437e9]});
assert.equal(adaptiveWavelength.unresolvedWavelength,true);assert.ok(adaptiveWavelength.resolutionLimitReached);

const rxExperiment=U.interfrequencyExperiment({f1Hz:2.437e9,f2Hz:2.462e9,f1PowerDbm:20,f2PowerDbm:17,coupling:.1,nonlinearity:.1,maximumOrder:3,productFloorDbm:-120,productMode:'difference',mechanism:'receiver-front-end'});
assert.equal(rxExperiment.selected.frequencyHz,25e6);assert.equal(rxExperiment.selected.propagating,false);
const rxMap=U.buildReceiverMixingMap(base,secondary,rxExperiment);assert.equal(rxMap.detectorResponse,true);assert.equal(rxMap.propagating,false);
const sourceExperiment=U.interfrequencyExperiment({f1Hz:2.437e9,f2Hz:2.462e9,f1PowerDbm:20,f2PowerDbm:17,coupling:.1,nonlinearity:.1,maximumOrder:3,productFloorDbm:-120,productMode:'difference',mechanism:'source-nonlinearity'});
assert.equal(sourceExperiment.selected.propagating,true);
const productMap=U.buildPropagatingProductMap(env,source,sourceExperiment);assert.equal(productMap.frequencyHz,25e6);

const experiments={applyTuning:true,txTuneHz:2.437e9,rxTuneHz:2.437e9,txQ:8,rxQ:8,polarizationAlignment:1,secondaryHz:2.462e9,secondaryPowerDbm:17,secondaryX:3,secondaryY:-2,secondaryZ:1.8,secondaryAntennaType:'dipole',mixMechanism:'receiver-front-end',mixCoupling:.1,mixNonlinearity:.1,maximumOrder:3,productFloorDbm:-120,productMode:'difference',mapMode:'product',narrowQ:24,broadQ:3,detectThresholdDbm:-90,adaptiveStartResolution:4,adaptiveMaxResolution:16,adaptiveGradientThresholdDb:1,adaptiveSnrStopDbm:-140,adaptiveWavelengthDriven:false,adaptiveMaxCells:1024};
const config={sourceHz:145.8e6,txPowerDbm:30,txGainDb:2.15,rxGainDb:0,distanceM:1000,extraLossDb:0,receiverCenterHz:10.7e6,receiverBandwidthHz:25e3,noiseFigureDb:6,localOscillatorHz:135.1e6,carrierHz:145e6,coupling:.05,nonlinearity:.03,carrierAmplitude:1,sourceAmplitude:.1,observedHz:800e3,sweepMinHz:1e6,sweepMaxHz:500e6,sweepPoints:128,antenna,environment:env,experiments};
const analysis=Lab.analyzeConfiguration(config);
assert.equal(analysis.experiments.interfrequency.selected.frequencyHz,25e6);assert.ok(analysis.experiments.adaptive.leafCellCount>=16);

const layout=U.buildExperimentDataLayout(config,analysis);
assert.equal(layout.length,catalog.length);
for(const row of layout){assert.ok(row.current);assert.ok(Array.isArray(row.current.inputs));assert.ok(Array.isArray(row.current.outputs));assert.ok(row.current.inputs.length>0);assert.ok(row.current.outputs.length>0);}
const baselineRecord=layout.find(row=>row.id==='rf-baseline');
assert.ok(baselineRecord.current.outputs.some(field=>field.name==='meanDbm'&&field.provenance==='model-derived'));
const heterodyneRecord=layout.find(row=>row.id==='heterodyne-inference');
assert.ok(heterodyneRecord.current.outputs.some(field=>field.name==='candidateCount'&&field.provenance==='inferred'));
const receiverRecord=layout.find(row=>row.id==='receiver-interfrequency');
assert.ok(receiverRecord.current.outputs.some(field=>field.name==='propagating'&&field.value===false));

const timestampUtc='2026-08-09T22:46:00.000Z';
const runRecord=U.buildExperimentRunRecord(config,analysis,{timestampUtc});
assert.equal(runRecord.format,'hb-ttrpg-signals-laboratory-run-record');
assert.equal(runRecord.schemaVersion,'0.6.0');
assert.equal(runRecord.engineVersion,'0.6.0');
assert.equal(runRecord.timestampUtc,timestampUtc);
assert.equal(runRecord.evidenceClass,'simulation-model-output');
assert.equal(runRecord.experiments.length,14);
assert.equal(runRecord.environment.surfaces.length,2);
assert.equal(runRecord.selectedExperimentMap,'product');
assert.ok(!('values' in runRecord.selectedMapSummary));
assert.match(runRecord.physicalBoundary,/Simulation outputs and inferences are not measurements/);
const serialized=U.serializeExperimentRunRecord(config,analysis,{timestampUtc});
const parsed=JSON.parse(serialized);
assert.equal(parsed.experiments.length,14);assert.equal(parsed.timestampUtc,timestampUtc);

const projected=U.project3DPoint({x:1,y:2,z:3},{originX:100,originY:100,scale:20,yawDeg:30,pitchDeg:25});assert.ok(Number.isFinite(projected.x)&&Number.isFinite(projected.depth));
const field=U.buildFieldVolumeSamples({sourceHz:145.8e6,response:{voltageTransfer:.8}},.5);assert.equal(field.length,32);
const lobes=U.buildAntennaLobeSamples(source,.85);assert.equal(lobes.length,13);
const mesh=U.buildEnvironmentSurfaceMesh(base);assert.equal(mesh.vertices.length,576);
const surfaceScene=U.buildSurfaceScene(surfaces,12,10);assert.equal(surfaceScene.length,2);
const mixer=U.buildMixerProductScene({heterodyne,probe:carrierProbe,experiments:{interfrequency:rxExperiment}});assert.ok(mixer.some(row=>row.frequencyHz===25e6));

const entry=await readFile(new URL('../scientific-tools-entry.js',import.meta.url),'utf8');
assert.match(entry,/data-scientific-tools-tab="signals-laboratory"/);assert.match(entry,/id="scientific-tools-open-signals-laboratory"/);assert.match(entry,/function loadSignalsLaboratory\(/);assert.match(entry,/loadStyle\('signals-laboratory\.css'\)/);assert.match(entry,/loadScript\('signals-laboratory\.js'/);
const sourceText=await readFile(new URL('../signals-laboratory.js',import.meta.url),'utf8');
for(const pattern of [/Simulation map \/ experiment register/,/Current run data ledger/,/Copy current run JSON/,/hb-ttrpg-signals-laboratory-run-record/,/simulation-model-output/,/configured → modeled → inferred/,/Material-aware surfaces/,/Adaptive spatial sampling/,/Receiver\/front-end nonlinear detector/,/Source-side nonlinear generation/,/Increasing pixel count alone/,/id="sl-adaptive-canvas"/,/id="sl-field-3d-canvas"/,/id="sl-antenna-3d-canvas"/,/id="sl-environment-3d-canvas"/,/id="sl-mixer-3d-canvas"/,/prefers-reduced-motion/,/Mathematical processing alone cannot reconstruct arbitrary RF energy/]) assert.match(sourceText,pattern);

console.log(JSON.stringify({format:'hb-ttrpg-signals-laboratory-validation-receipt',schemaVersion:'0.6.0',pass:true,experimentCatalogFamilies:catalog.length,stableExperimentIds:true,configuredModeledInferredProvenance:true,machineReadableRunRecord:true,compactRunRecordWithoutMapArrays:true,copyRunJsonControl:true,materialAwareFiniteSurfaces:true,openAperturePropagation:true,adaptiveSpatialSampling:true,samePropagationKernelForAdaptiveSampling:true,tunableAntennaMapResponse:true,narrowVsBroadQComparison:true,secondCarrierEnvironment:true,sourceGeneratedIntermodulationMapping:true,receiverFrontEndMixingResponseMapping:true,physicalResolutionDiagnostics:true,threeDimensionalMaterialEnvironment:true,physicalCouplingBoundaryPresent:true},null,2));
