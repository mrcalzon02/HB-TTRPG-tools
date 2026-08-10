#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Lab=require('../live-signals-laboratory.js');

assert.equal(Lab.constants.VERSION,'0.3.0');
assert.equal(Lab.constants.CURRENT_MODE,'passive-default-active-ranging-gated');
assert.equal(Lab.constants.SAFETY_POLICY.passiveModeReceiveOnly,true);
assert.equal(Lab.constants.SAFETY_POLICY.transmitterControlsExposed,false);
assert.equal(Lab.constants.SAFETY_POLICY.activeRangingEnabled,true);
assert.equal(Lab.constants.SAFETY_POLICY.appRequestedWifiScanEnabled,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.authorizedTargetsOnly,true);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.arbitraryFrequencySelection,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.transmitterPowerMutation,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.channelMutation,false);
for(const operation of ['set-tx-power','wifi-start-scan','frequency-sweep-transmit','pulse-transmit','subnet-sweep']) {
  assert.ok(Lab.constants.SAFETY_POLICY.prohibitedOperations.includes(operation));
  assert.throws(()=>Lab.assertActiveScanOperation(operation),/blocks unsafe radio mutation/);
}
for(const operation of ['wifi-rtt-ranging','uwb-ranging','ble-ranging','authorized-network-rtt']) assert.equal(Lab.assertActiveScanOperation(operation),true);
assert.throws(()=>Lab.assertReceiveOnlyOperation('wifi-rtt-ranging'),/Passive Scan/);
assert.equal(Lab.assertReceiveOnlyOperation('observe'),true);

const profiles=Lab.hardwareProfiles();
for(const id of ['android-native','ios-native','openwrt-readonly','browser-context','generic-receive-json']) assert.ok(profiles.some(profile=>profile.id===id),`missing ${id}`);
assert.deepEqual(Lab.expectedPassiveChannels('android-native'),['wifi','cellular','ble','gnss','motion','magnetometer']);
const android=Lab.capabilityMatrix('android-native');
assert.ok(android.rows.some(row=>row.capability.includes('Wi-Fi system/cached scan results')));
assert.ok(android.rows.some(row=>row.capability.includes('Cellular')));
assert.ok(android.rows.some(row=>row.capability.includes('Bluetooth')));
assert.ok(android.rows.some(row=>row.capability==='Wi-Fi RTT active ranging'&&row.status==='active-scan-conditional'));
assert.ok(android.rows.some(row=>row.capability==='UWB / Bluetooth ranging'&&row.status==='active-scan-conditional'));
const ios=Lab.capabilityMatrix('ios-native');
assert.ok(ios.rows.some(row=>row.capability==='General Wi-Fi scan'&&row.status==='unavailable-public-api'));
assert.ok(ios.rows.some(row=>row.capability==='Cellular signal strength'&&row.status==='unavailable-public-api'));
const router=Lab.capabilityMatrix('openwrt-readonly');
assert.ok(router.rows.some(row=>row.capability.includes('Per-chain')));
assert.ok(router.rows.some(row=>row.capability.includes('Authorized endpoint / RTT')));

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
assert.equal(Lab.safetyPreflight({thermalState:'nominal',batteryPercent:100,activeRangingRequested:true}).pass,false);

const session=Lab.createSession({profileId:'android-native',hardwareState:{thermalState:'nominal',batteryPercent:80},polling:{privacyRedaction:true}});
assert.equal(session.receiveOnly,true);
let timestampMs=1000;
for(let i=0;i<20;i+=1) Lab.appendObservation(session,{timestampMs:timestampMs++,kind:'wifi',frequencyHz:2437e6,rssiDbm:-55+(i%3)*.4,noiseDbm:-96+(i%2)*.3,sourceId:'00:11:22:33:44:55',ssid:'private',localX:0,localY:0,headingDeg:0,chainRssiDbm:[-55,-56.5],provenance:'reported-by-platform'},{nowMs:timestampMs});
let coverage=Lab.channelCoverage(session);
assert.equal(coverage.find(row=>row.id==='wifi')?.status,'observing');
assert.equal(coverage.find(row=>row.id==='cellular')?.status,'expected-no-samples');
assert.equal(coverage.find(row=>row.id==='ble')?.status,'expected-no-samples');

const bridge={
  id:'mock-android-native',
  getCapabilities(){return {
    bridgeId:'mock-android-native',
    passiveChannels:['wifi','cellular','ble','gnss','motion','magnetometer'],
    activeMethods:['wifi-rtt-ranging','ble-ranging'],
    authorizedTargets:[
      {id:'lab-ap',label:'Lab AP',authorized:true,methods:['wifi-rtt-ranging']},
      {id:'lab-ble-peer',label:'Lab BLE Peer',authorized:true,methods:['ble-ranging']}
    ]
  };},
  async runActiveScan(plan){
    assert.equal(plan.authorizedTargetsOnly,true);
    assert.equal(plan.arbitraryFrequencySelection,false);
    return plan.targets.map((target,index)=>({
      kind:plan.method==='wifi-rtt-ranging'?'wifi-rtt':'ble-range',targetId:target.id,distanceM:3.5+index,
      distanceStdDevM:.25,localX:1,localY:2,rangingTechnology:plan.method,provenance:'reported-by-platform'
    }));
  }
};
Lab.registerHardwareBridge(bridge);
await Lab.refreshHardwareBridgeCapabilities();
coverage=Lab.channelCoverage(session);
assert.equal(coverage.find(row=>row.id==='cellular')?.status,'bridge-available-no-samples');
assert.equal(coverage.find(row=>row.id==='ble')?.status,'bridge-available-no-samples');

assert.equal(Lab.activeScanPreflight({method:'wifi-rtt-ranging',targetsAuthorized:false,thermalState:'nominal',batteryPercent:80},bridge.getCapabilities()).pass,false);
const activePreflight=Lab.activeScanPreflight({method:'wifi-rtt-ranging',targetsAuthorized:true,thermalState:'nominal',batteryPercent:80},bridge.getCapabilities());
assert.equal(activePreflight.pass,true);
const plan=Lab.buildActiveScanPlan({method:'wifi-rtt-ranging',targetsAuthorized:true,targetIds:['lab-ap'],samplesPerTarget:999,sampleIntervalMs:1},bridge.getCapabilities());
assert.equal(plan.targets.length,1);
assert.equal(plan.samplesPerTarget,Lab.constants.MAX_ACTIVE_SAMPLES_PER_TARGET);
assert.equal(plan.sampleIntervalMs,Lab.constants.MIN_ACTIVE_SAMPLE_INTERVAL_MS);
assert.equal(plan.transmitterPowerMutation,false);
const activeResult=await Lab.runActiveScan(session,{method:'wifi-rtt-ranging',targetsAuthorized:true,targetIds:['lab-ap'],samplesPerTarget:2,sampleIntervalMs:1000},bridge);
assert.equal(activeResult.observations.length,1);
assert.equal(activeResult.observations[0].acquisitionMode,'active');
assert.equal(activeResult.observations[0].ranging.technology,'wifi-rtt-ranging');
assert.equal(activeResult.observations[0].ranging.authorized,true);
assert.ok(Number.isFinite(activeResult.observations[0].ranging.distanceM));
const rangeSummary=Lab.activeRangeSummary(session);
assert.equal(rangeSummary.sampleCount,1);
assert.equal(rangeSummary.burstCount,1);
assert.ok(rangeSummary.byTechnology['wifi-rtt-ranging']);

for(let i=0;i<4;i+=1) Lab.appendObservation(session,{timestampMs:timestampMs++,kind:'cellular',frequencyHz:1900e6,rsrpDbm:-92+i*.2,sourceId:'cell-1',provenance:'reported-by-platform'},{nowMs:timestampMs});
for(let i=0;i<4;i+=1) Lab.appendObservation(session,{timestampMs:timestampMs++,kind:'ble',frequencyHz:2440e6,rssiDbm:-68+i*.2,sourceId:`ble-${i}`,provenance:'reported-by-platform'},{nowMs:timestampMs});
coverage=Lab.channelCoverage(session);
assert.equal(coverage.find(row=>row.id==='cellular')?.status,'observing');
assert.equal(coverage.find(row=>row.id==='ble')?.status,'observing');

const inventory=Lab.passiveFrequencyInventory(session);
assert.ok(inventory.bins.some(row=>row.kind==='wifi'));
assert.ok(inventory.bins.some(row=>row.kind==='cellular'));
assert.ok(inventory.bins.some(row=>row.kind==='ble'));
const baseline=Lab.captureReceiverBaseline(session,{referenceKey:Lab.chooseReferenceSeries(session).key});
assert.equal(baseline.format,'hb-ttrpg-live-signals-receiver-baseline');
const serialized=Lab.serializeSession(session);
assert.match(serialized,/channelCoverage/);
assert.match(serialized,/activeRanges/);
assert.doesNotMatch(serialized,/00:11:22:33:44:55/);
const future=Lab.futureGatedResearch();
assert.ok(future.every(item=>item.status==='not-implemented'));
assert.ok(future.some(item=>item.id==='attenuated-receiver-sweep'));
assert.ok(future.some(item=>item.id==='controlled-frequency-sweep'));
assert.ok(future.some(item=>item.id==='hybrid-attenuation-correlation'));
assert.equal(future.some(item=>item.id==='documented-active-ranging'),false);

const source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');
for(const pattern of [/Start Passive Scan/,/Run Active Scan/,/Receiver channel coverage/,/Cellular receiver/,/Bluetooth \/ BLE receiver/,/Active ranging \/ ping-back mapping/,/authorized targets only/,/browser alone cannot access Android TelephonyManager/,/wifi-rtt-ranging/,/ble-ranging/,/uwb-ranging/,/activeScanPreflight/,/channelCoverage/]) assert.match(source,pattern);
assert.doesNotMatch(source,/function\s+(setTxPower|pulseTransmit|frequencySweepTransmit|subnetSweep)\s*\(/);

console.log(JSON.stringify({
  format:'hb-ttrpg-live-signals-laboratory-validation-receipt',schemaVersion:'0.3.0',pass:true,
  passiveScanStillReceiveOnly:true,separateActiveScanButton:true,gatedActiveRanging:true,authorizedTargetsOnly:true,
  noArbitraryFrequencySweep:true,noPowerOrChannelMutation:true,androidExpectedWifiCellularBle:true,
  missingChannelFaultVisibility:true,bridgeAvailableNoSamplesVisibility:true,cellularAndBleObservationCoverage:true,
  wifiRttPlan:true,bleRangingPlan:true,activeRangeMappingContract:true,receiverHealthPreserved:true
},null,2));
