#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Lab=require('../live-signals-laboratory.js');

assert.equal(Lab.constants.VERSION,'0.1.0');
assert.equal(Lab.constants.SAFETY_POLICY.receiveOnly,true);
assert.equal(Lab.constants.SAFETY_POLICY.transmitterControlsExposed,false);
assert.ok(Lab.constants.SAFETY_POLICY.prohibitedOperations.includes('set-tx-power'));
assert.throws(()=>Lab.assertReceiveOnlyOperation('set-tx-power'),/blocks transmitter/);
assert.equal(Lab.assertReceiveOnlyOperation('observe'),true);

const profiles=Lab.hardwareProfiles();
for(const id of ['android-native','ios-native','openwrt-readonly','browser-context','generic-receive-json']) assert.ok(profiles.some(profile=>profile.id===id),`missing ${id}`);
const android=Lab.capabilityMatrix('android-native');
assert.ok(android.rows.some(row=>row.capability.includes('Wi-Fi scan')));
assert.ok(android.rows.some(row=>row.capability.includes('Cellular')));
assert.ok(android.rows.some(row=>row.capability.includes('Bluetooth')));
assert.ok(android.rows.some(row=>row.capability.includes('Wi-Fi RTT')));
const ios=Lab.capabilityMatrix('ios-native');
assert.ok(ios.rows.some(row=>row.capability==='General Wi-Fi scan'&&row.status==='unavailable-public-api'));
assert.ok(ios.rows.some(row=>row.capability==='Cellular signal strength'&&row.status==='unavailable-public-api'));
const router=Lab.capabilityMatrix('openwrt-readonly');
assert.ok(router.rows.some(row=>row.capability.includes('Per-chain')));

const polling=Lab.safePollingConfiguration({wifiScanIntervalMs:1000,bleScanWindowMs:30000,bleScanPeriodMs:1000,sensorHz:500,sessionMinutes:999});
assert.equal(polling.wifiScanIntervalMs,30000);
assert.equal(polling.bleScanWindowMs,10000);
assert.equal(polling.bleScanPeriodMs,30000);
assert.equal(polling.sensorHz,50);
assert.equal(polling.sessionMinutes,60);
assert.equal(polling.privacyRedaction,true);
assert.equal(Lab.safetyPreflight({thermalState:'critical',batteryPercent:100}).pass,false);
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:10,externalPower:false}).pass,false);
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:10,externalPower:true}).pass,true);

const session=Lab.createSession({profileId:'android-native',hardwareState:{thermalState:'nominal',batteryPercent:80},polling:{privacyRedaction:true}});
assert.equal(session.receiveOnly,true);
const obs=Lab.appendObservation(session,{kind:'wifi',frequencyHz:2437e6,rssiDbm:-58,noiseDbm:-95,sourceId:'00:11:22:33:44:55',ssid:'private',localX:1,localY:2,headingDeg:90,chainRssiDbm:[-58,-61]});
assert.equal(obs.signal.snrDb,37);
assert.match(obs.sourceId,/^anon-/);
assert.equal(obs.ssid,'[redacted-ssid]');
assert.equal(obs.position.localX,1);
assert.equal(obs.auxiliary.chainRssiDbm.length,2);
for(let i=0;i<25;i+=1) Lab.appendObservation(session,{kind:'ble',rssiDbm:-70+i*.1,sourceId:`ble-${i}`,localX:i/10,localY:0,headingDeg:i*5});
const summary=Lab.summarizeSession(session);
assert.equal(summary.observationCount,26);
assert.ok(summary.spatialSamples>=20);
assert.ok(Number.isFinite(summary.medianSignal));
const plan=Lab.buildRefinementPlan(session);
assert.equal(plan.length,7);
assert.ok(plan.some(stage=>stage.id==='model-correlation'&&stage.status==='ready'));
const serialized=Lab.serializeSession(session);
assert.match(serialized,/hb-ttrpg-live-signals-session/);
assert.doesNotMatch(serialized,/00:11:22:33:44:55/);

const entry=await readFile(new URL('../scientific-tools-entry.js',import.meta.url),'utf8');
for(const pattern of [/live-signals-laboratory\.css/,/live-signals-laboratory\.js/,/function loadLiveSignalsLaboratory\(/,/function openLiveSignalsLaboratory\(/,/id="scientific-tools-open-live-signals-laboratory"/,/Open Simulation Laboratory/,/Open Live Signals Laboratory/]) assert.match(entry,pattern);
const source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');
for(const pattern of [/Receive-only is mandatory/,/General Wi-Fi scan/,/Cellular signal strength/,/Per-chain antenna RSSI/,/Wi-Fi RTT ranging/,/adaptive|refinement/i,/Mathematical|Missing radio telemetry is marked unavailable/]) assert.match(source,pattern);

console.log(JSON.stringify({
  format:'hb-ttrpg-live-signals-laboratory-validation-receipt',schemaVersion:'0.1.0',pass:true,
  separateLiveLaboratory:true,receiveOnlySafetyLock:true,androidWifiBleCellularScope:true,
  iosPublicApiBoundaries:true,routerAntennaChainTelemetryConditional:true,platformPollingLimitsClamped:true,
  thermalBatteryGuards:true,privacyRedactionDefault:true,refinementProcedure:true,signalsSuiteIntegration:true
},null,2));
