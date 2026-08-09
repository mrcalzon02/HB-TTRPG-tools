#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Lab=require('../live-signals-laboratory.js');

assert.equal(Lab.constants.VERSION,'0.2.0');
assert.equal(Lab.constants.CURRENT_MODE,'passive-receive-only');
assert.equal(Lab.constants.SAFETY_POLICY.receiveOnly,true);
assert.equal(Lab.constants.SAFETY_POLICY.transmitterControlsExposed,false);
assert.equal(Lab.constants.SAFETY_POLICY.passiveTelemetryOnly,true);
assert.equal(Lab.constants.SAFETY_POLICY.activeRangingEnabled,false);
assert.equal(Lab.constants.SAFETY_POLICY.appRequestedWifiScanEnabled,false);
for(const operation of ['set-tx-power','wifi-start-scan','wifi-rtt-ranging','uwb-ranging','frequency-sweep-transmit','pulse-transmit']) {
  assert.ok(Lab.constants.SAFETY_POLICY.prohibitedOperations.includes(operation));
  assert.throws(()=>Lab.assertReceiveOnlyOperation(operation),/blocks active\/radio mutation/);
}
assert.equal(Lab.assertReceiveOnlyOperation('observe'),true);

const profiles=Lab.hardwareProfiles();
for(const id of ['android-native','ios-native','openwrt-readonly','browser-context','generic-receive-json']) assert.ok(profiles.some(profile=>profile.id===id),`missing ${id}`);
const android=Lab.capabilityMatrix('android-native');
assert.ok(android.rows.some(row=>row.capability.includes('Wi-Fi system/cached scan results')));
assert.ok(android.rows.some(row=>row.capability.includes('Cellular')));
assert.ok(android.rows.some(row=>row.capability.includes('Bluetooth')));
assert.ok(android.rows.some(row=>row.capability.includes('Wi-Fi RTT / UWB')&&row.status==='future-gated'));
const ios=Lab.capabilityMatrix('ios-native');
assert.ok(ios.rows.some(row=>row.capability==='General Wi-Fi scan'&&row.status==='unavailable-public-api'));
assert.ok(ios.rows.some(row=>row.capability==='Cellular signal strength'&&row.status==='unavailable-public-api'));
const router=Lab.capabilityMatrix('openwrt-readonly');
assert.ok(router.rows.some(row=>row.capability.includes('Per-chain')));
assert.ok(router.rows.some(row=>row.capability==='Radio configuration writes'&&row.status==='blocked'));

const polling=Lab.safePollingConfiguration({wifiResultPollMs:1000,bleObserveWindowMs:30000,bleObservePeriodMs:1000,sensorHz:500,sessionMinutes:999});
assert.equal(polling.wifiResultPollMs,5000);
assert.equal(polling.appRequestedWifiScan,false);
assert.equal(polling.bleObserveWindowMs,10000);
assert.equal(polling.bleObservePeriodMs,30000);
assert.equal(polling.sensorHz,50);
assert.equal(polling.sessionMinutes,60);
assert.equal(polling.privacyRedaction,true);
assert.equal(Lab.safetyPreflight({thermalState:'critical',batteryPercent:100}).pass,false);
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:10,externalPower:false}).pass,false);
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:10,externalPower:true}).pass,true);
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:100,appRequestedWifiScan:true}).pass,false);
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:100,activeRangingRequested:true}).pass,false);

const session=Lab.createSession({profileId:'openwrt-readonly',hardwareState:{thermalState:'nominal',batteryPercent:80},polling:{privacyRedaction:true}});
assert.equal(session.receiveOnly,true);
assert.equal(session.mode,'passive-receive-only');
let timestampMs=1000;
for(let i=0;i<20;i+=1) Lab.appendObservation(session,{timestampMs:timestampMs++,kind:'wifi',frequencyHz:2437e6,rssiDbm:-55+(i%3)*.4,noiseDbm:-96+(i%2)*.3,sourceId:'00:11:22:33:44:55',ssid:'private',localX:0,localY:0,headingDeg:0,chainRssiDbm:[-55,-56.5],provenance:'reported-by-platform'},{nowMs:timestampMs});
for(let i=0;i<6;i+=1) Lab.appendObservation(session,{timestampMs:timestampMs++,kind:'ble',frequencyHz:2440e6,rssiDbm:-70+i*.2,sourceId:`ble-${i}`,localX:i/10,localY:0,headingDeg:i*5},{nowMs:timestampMs});
const first=session.observations[0];
assert.match(first.sourceId,/^anon-/);
assert.equal(first.ssid,'[redacted-ssid]');
assert.equal(first.auxiliary.chainRssiDbm.length,2);

const inventory=Lab.passiveFrequencyInventory(session);
assert.ok(inventory.bins.length>=2);
assert.ok(inventory.uniqueSources>=2);
assert.ok(inventory.bins.some(row=>row.kind==='wifi'&&row.frequencyHz===2437e6));
assert.ok(inventory.bins.some(row=>row.kind==='ble'));

const clean=Lab.receiverHealthDiagnostic(session);
assert.equal(clean.state,'clean-reference');
assert.ok(clean.current.sampleCount>=20);
assert.ok(clean.current.medianChainImbalanceDb<5);
const baseline=Lab.captureReceiverBaseline(session);
assert.equal(baseline.format,'hb-ttrpg-live-signals-receiver-baseline');
assert.equal(baseline.referenceKey,clean.current.referenceKey);

for(let i=0;i<20;i+=1) Lab.appendObservation(session,{timestampMs:timestampMs++,kind:'wifi',frequencyHz:2437e6,rssiDbm:-64+(i%3)*.5,noiseDbm:-89+(i%2)*.4,sourceId:'00:11:22:33:44:55',localX:0,localY:0,headingDeg:0,chainRssiDbm:[-64,-74],provenance:'reported-by-platform'},{nowMs:timestampMs});
const degraded=Lab.receiverHealthDiagnostic(session);
assert.equal(degraded.state,'degradation-suspect');
assert.ok(degraded.sensitivityLossDb>=8);
assert.ok(degraded.current.medianChainImbalanceDb>=8);
assert.equal(degraded.cleanlinessState,'degraded-suspect');
assert.ok(degraded.flags.some(flag=>flag.id==='baseline-sensitivity-loss'));
assert.ok(degraded.flags.some(flag=>flag.id==='chain-imbalance'));
assert.ok(degraded.flags.some(flag=>flag.id==='baseline-noise-rise'));
assert.match(degraded.boundary,/screening diagnostic/);

const summary=Lab.summarizeSession(session);
assert.equal(summary.observationCount,46);
assert.ok(summary.passiveFrequencyBins>=2);
assert.ok(summary.uniqueSources>=2);
const plan=Lab.buildRefinementPlan(session);
assert.equal(plan.length,9);
assert.ok(plan.some(stage=>stage.id==='passive-spectrum-census'&&stage.status==='ready'));
assert.ok(plan.some(stage=>stage.id==='receiver-health-baseline'&&stage.status==='complete'));
const future=Lab.futureGatedResearch();
assert.equal(future.length,4);
assert.ok(future.every(item=>item.status==='not-implemented'));
assert.ok(future.some(item=>item.id==='attenuated-receiver-sweep'));
assert.ok(future.some(item=>item.id==='hybrid-attenuation-correlation'));

const serialized=Lab.serializeSession(session);
assert.match(serialized,/hb-ttrpg-live-signals-session/);
assert.match(serialized,/passiveInventory/);
assert.match(serialized,/receiverHealth/);
assert.match(serialized,/futureGatedResearch/);
assert.doesNotMatch(serialized,/00:11:22:33:44:55/);

const entry=await readFile(new URL('../scientific-tools-entry.js',import.meta.url),'utf8');
for(const pattern of [/live-signals-laboratory\.css/,/live-signals-laboratory\.js/,/function loadLiveSignalsLaboratory\(/,/function openLiveSignalsLaboratory\(/,/id="scientific-tools-open-live-signals-laboratory"/,/Open Simulation Laboratory/,/Open Live Signals Laboratory/]) assert.match(entry,pattern);
const source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');
for(const pattern of [/No transmission path in this phase/,/system\/cached scan results/,/do not invoke <code>startScan\(\)<\/code>/,/Receiver \/ antenna-path cleanliness & degradation screening/,/passiveFrequencyInventory/,/receiverHealthDiagnostic/,/baseline-sensitivity-loss/,/chain-imbalance/,/Future gated attenuation \/ ranging research/,/not-implemented/]) assert.match(source,pattern);
assert.doesNotMatch(source,/function\s+(setTxPower|startWifiScan|pulseTransmit|frequencySweepTransmit)\s*\(/);

console.log(JSON.stringify({
  format:'hb-ttrpg-live-signals-laboratory-validation-receipt',schemaVersion:'0.2.0',pass:true,
  separateLiveLaboratory:true,strictPassiveReceiveOnly:true,noAppInitiatedWifiScan:true,noActiveRanging:true,
  androidWifiBleCellularPassiveScope:true,iosPublicApiBoundaries:true,routerAntennaChainTelemetryConditional:true,
  platformPollingLimitsClamped:true,thermalBatteryGuards:true,privacyRedactionDefault:true,
  passiveFrequencyInventory:true,receiverAntennaHealthScreening:true,baselineSensitivityDrift:true,
  chainImbalanceDetection:true,receiveChainCleanlinessProxy:true,refinementProcedure:true,
  futureActiveResearchGatedNotImplemented:true,signalsSuiteIntegration:true
},null,2));
