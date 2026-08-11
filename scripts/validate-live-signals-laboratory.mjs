#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Lab=require('../live-signals-laboratory.js');

assert.equal(Lab.constants.VERSION,'0.4.0');
assert.equal(Lab.constants.CURRENT_MODE,'passive-default-active-ranging-local-hardware-authorized');
assert.equal(Lab.constants.SAFETY_POLICY.passiveModeReceiveOnly,true);
assert.equal(Lab.constants.SAFETY_POLICY.transmitterControlsExposed,false);
assert.equal(Lab.constants.SAFETY_POLICY.activeRangingEnabled,true);
assert.equal(Lab.constants.SAFETY_POLICY.appRequestedWifiScanEnabled,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.localRuntimeHardwareAssumedAuthorized,true);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.manualTargetAuthorizationRequired,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.standardsResponderDiscoveryAllowed,true);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.bridgeReportedTargetsOnly,true);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.remoteDeviceControlAssumed,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.nonDestructiveRangingOnly,true);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.arbitraryFrequencySelection,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.transmitterPowerMutation,false);
assert.equal(Lab.constants.ACTIVE_SCAN_POLICY.channelMutation,false);
assert.equal(Lab.constants.DEFAULT_TIMELINE_BUCKET_MS,250);
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
assert.ok(router.rows.some(row=>row.capability.includes('Standards ranging / selected RTT endpoint')));

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

const cellularRaw={
  timestampMs:Date.now(),kind:'cellular',sourceId:'cell-raw',radioTechnology:'LTE',channel:1234,channelType:'EARFCN',
  bands:[2,66],bandwidthHz:20_000_000,modemAgeMs:120,registered:true,rsrpDbm:-92,rsrqDb:-11,sinrDb:14,
  provenance:'android-telephony-callback'
};
const normalizedCellular=Lab.normalizeObservation(cellularRaw,{privacyRedaction:true,nowMs:cellularRaw.timestampMs+5});
assert.equal(normalizedCellular.signal.frequencyHz,null,'cellular channel metadata must not become a fabricated center frequency');
assert.equal(normalizedCellular.signal.channel,1234);
assert.equal(normalizedCellular.signal.bandwidthHz,20_000_000);
assert.equal(normalizedCellular.cellular.radioTechnology,'lte');
assert.equal(normalizedCellular.cellular.channelType,'earfcn');
assert.deepEqual(normalizedCellular.cellular.bands,[2,66]);
assert.equal(normalizedCellular.cellular.registered,true);
assert.equal(normalizedCellular.quality.sourceAgeMs,120);

const session=Lab.createSession({profileId:'android-native',hardwareState:{thermalState:'nominal',batteryPercent:80},polling:{privacyRedaction:true,wifiResultPollMs:10000,cellPollMs:3000}});
assert.equal(session.receiveOnly,true);
const baseTimestampMs=Date.now()-30000;
for(let i=0;i<20;i+=1) {
  const timestampMs=baseTimestampMs+i*1000;
  Lab.appendObservation(session,{timestampMs,kind:'wifi',frequencyHz:2437e6,rssiDbm:-55+(i%3)*.4,noiseDbm:-96+(i%2)*.3,sourceId:'00:11:22:33:44:55',ssid:'private',localX:0,localY:0,headingDeg:0,chainRssiDbm:[-55,-56.5],provenance:'reported-by-platform'},{nowMs:timestampMs+5});
}
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
    rangingTargets:[
      {id:'nearby-rtt-ap',label:'Nearby RTT AP',participating:true,responderCapable:true,methods:['wifi-rtt-ranging']},
      {id:'nearby-ble-peer',label:'Nearby BLE Peer',participating:true,responderCapable:true,methods:['ble-ranging']}
    ]
  };},
  async runActiveScan(plan){
    assert.equal(plan.localRuntimeHardwareAuthorized,true);
    assert.equal(plan.manualTargetAuthorizationRequired,false);
    assert.equal(plan.standardsResponderDiscoveryAllowed,true);
    assert.equal(plan.remoteDeviceControlAssumed,false);
    assert.equal(plan.arbitraryFrequencySelection,false);
    return plan.targets.map((target,index)=>({
      timestampMs:baseTimestampMs+18000,
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

const activePreflight=Lab.activeScanPreflight({method:'wifi-rtt-ranging',thermalState:'nominal',batteryPercent:80},bridge.getCapabilities());
assert.equal(activePreflight.pass,true);
assert.equal(activePreflight.localRuntimeHardwareAuthorized,true);
assert.equal(activePreflight.manualTargetAuthorizationRequired,false);
const autoPlan=Lab.buildActiveScanPlan({method:'wifi-rtt-ranging',samplesPerTarget:999,sampleIntervalMs:1},bridge.getCapabilities());
assert.equal(autoPlan.targets.length,1);
assert.equal(autoPlan.targets[0].id,'nearby-rtt-ap');
assert.equal(autoPlan.samplesPerTarget,Lab.constants.MAX_ACTIVE_SAMPLES_PER_TARGET);
assert.equal(autoPlan.sampleIntervalMs,Lab.constants.MIN_ACTIVE_SAMPLE_INTERVAL_MS);
assert.equal(autoPlan.transmitterPowerMutation,false);
assert.equal(autoPlan.remoteDeviceControlAssumed,false);
const activeResult=await Lab.runActiveScan(session,{method:'wifi-rtt-ranging',samplesPerTarget:2,sampleIntervalMs:1000},bridge);
assert.equal(activeResult.observations.length,1);
assert.equal(activeResult.observations[0].acquisitionMode,'active');
assert.equal(activeResult.observations[0].ranging.technology,'wifi-rtt-ranging');
assert.equal(activeResult.observations[0].ranging.localHardwareAuthorized,true);
assert.equal(activeResult.observations[0].ranging.responderParticipating,true);
assert.equal(activeResult.observations[0].ranging.remoteDeviceControlAssumed,false);
assert.ok(Number.isFinite(activeResult.observations[0].ranging.distanceM));
const rangeSummary=Lab.activeRangeSummary(session);
assert.equal(rangeSummary.sampleCount,1);
assert.equal(rangeSummary.burstCount,1);
assert.ok(rangeSummary.byTechnology['wifi-rtt-ranging']);

for(let i=0;i<4;i+=1) {
  const timestampMs=baseTimestampMs+15000+i*3000;
  Lab.appendObservation(session,{timestampMs,kind:'cellular',radioTechnology:'lte',channel:1234,channelType:'earfcn',bands:[2,66],bandwidthHz:20_000_000,modemAgeMs:100+i*10,registered:true,rsrpDbm:-92+i*.2,sourceId:'cell-1',provenance:'android-telephony-callback'},{nowMs:timestampMs+5});
}
for(let i=0;i<4;i+=1) {
  const timestampMs=baseTimestampMs+16000+i*3000;
  Lab.appendObservation(session,{timestampMs,kind:'ble',rssiDbm:-68+i*.2,sourceId:'ble-1',provenance:'android-ble-passive-observation'},{nowMs:timestampMs+5});
}
coverage=Lab.channelCoverage(session);
assert.equal(coverage.find(row=>row.id==='cellular')?.status,'observing');
assert.equal(coverage.find(row=>row.id==='ble')?.status,'observing');
const normalizedSessionCell=session.observations.find(row=>row.kind==='cellular');
assert.equal(normalizedSessionCell.signal.frequencyHz,null);
assert.equal(normalizedSessionCell.cellular.channelType,'earfcn');
assert.deepEqual(normalizedSessionCell.cellular.bands,[2,66]);

const channelHealth=Lab.channelHealthSnapshot(session,{nowMs:baseTimestampMs+30000});
const wifiHealth=channelHealth.rows.find(row=>row.id==='wifi');
const cellHealth=channelHealth.rows.find(row=>row.id==='cellular');
const bleHealth=channelHealth.rows.find(row=>row.id==='ble');
assert.equal(wifiHealth.status,'healthy');
assert.equal(cellHealth.status,'healthy');
assert.equal(cellHealth.medianInterArrivalMs,3000);
assert.equal(cellHealth.medianSourceAgeMs,115);
assert.equal(bleHealth.status,'platform-paced');
assert.match(channelHealth.boundary,/platform\/modem controlled/);

const timeline=Lab.synchronizedTimeline(session,{bucketWidthMs:250,maxFrames:2000});
assert.equal(timeline.interpolation,'none');
assert.equal(timeline.gapFilling,'none');
assert.ok(timeline.frameCount>0);
assert.ok(timeline.crossChannelFrames>=1,'same-timestamp Wi-Fi/cellular observations should form a cross-channel frame');
const indexedCount=timeline.frames.reduce((sum,frame)=>sum+frame.observationIndices.length,0);
assert.equal(indexedCount,session.observations.length,'timeline must reference each actual observation exactly once');
assert.ok(timeline.frames.every(frame=>frame.observationIndices.every(index=>Number.isInteger(index)&&index>=0&&index<session.observations.length)));

const inventory=Lab.passiveFrequencyInventory(session);
assert.ok(inventory.bins.some(row=>row.kind==='wifi'));
assert.ok(inventory.bins.some(row=>row.kind==='cellular'&&row.frequencyHz===null));
assert.ok(inventory.bins.some(row=>row.kind==='ble'&&row.frequencyHz===null));
const baseline=Lab.captureReceiverBaseline(session,{referenceKey:Lab.chooseReferenceSeries(session).key});
assert.equal(baseline.format,'hb-ttrpg-live-signals-receiver-baseline');
const summary=Lab.summarizeSession(session);
assert.equal(summary.synchronizedFrames,timeline.frameCount);
assert.equal(summary.crossChannelFrames,timeline.crossChannelFrames);
const serialized=Lab.serializeSession(session);
assert.match(serialized,/channelCoverage/);
assert.match(serialized,/channelHealth/);
assert.match(serialized,/synchronizedTimeline/);
assert.match(serialized,/"interpolation": "none"/);
assert.doesNotMatch(serialized,/00:11:22:33:44:55/);
const future=Lab.futureGatedResearch();
assert.ok(future.every(item=>item.status==='not-implemented'));
assert.ok(future.some(item=>item.id==='attenuated-receiver-sweep'));
assert.ok(future.some(item=>item.id==='controlled-frequency-sweep'));
assert.ok(future.some(item=>item.id==='hybrid-attenuation-correlation'));

const source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');
for(const pattern of [
  /Start Passive Scan/,/Run Active Scan/,/Receiver channel coverage/,/Channel cadence \/ freshness/,/Cellular receiver/,/Bluetooth \/ BLE receiver/,
  /Active ranging \/ ping-back mapping/,/local instrument authorized/,/leave blank for bridge-discovered responders/,
  /browser alone cannot access Android TelephonyManager/,/wifi-rtt-ranging/,/ble-ranging/,/uwb-ranging/,/activeScanPreflight/,/channelCoverage/,
  /channelHealthSnapshot/,/synchronizedTimeline/,/sourceAgeMs/,/radioTechnology/,/channelType/,/Cellular cadence reference/,
  /if\(hardwareBridge\?\.startPassive\)await hardwareBridge\.startPassive\(\)/,
  /if\(hardwareBridge\?\.stopPassive\)await hardwareBridge\.stopPassive\(\)/,
  /no interpolation or gap filling/i
]) assert.match(source,pattern);
assert.doesNotMatch(source,/id="lsl-active-authorized"/);
assert.doesNotMatch(source,/authorized targets only/);
assert.doesNotMatch(source,/function\s+(setTxPower|pulseTransmit|frequencySweepTransmit|subnetSweep)\s*\(/);

console.log(JSON.stringify({
  format:'hb-ttrpg-live-signals-laboratory-validation-receipt',schemaVersion:'0.4.0',pass:true,
  passiveScanStillReceiveOnly:true,separateActiveScanButton:true,gatedActiveRanging:true,
  localRuntimeHardwareAssumedAuthorized:true,manualTargetAuthorizationRemoved:true,standardsResponderDiscovery:true,
  remoteDeviceControlNotAssumed:true,noArbitraryFrequencySweep:true,noPowerOrChannelMutation:true,
  androidExpectedWifiCellularBle:true,missingChannelFaultVisibility:true,bridgeAvailableNoSamplesVisibility:true,
  cellularAndBleObservationCoverage:true,cellularRatChannelBandMetadata:true,cellularCenterFrequencyNotFabricated:true,
  cellularModemAgePreserved:true,channelCadenceHealth:true,platformCadenceBoundary:true,
  synchronizedTimeline:true,noTimelineInterpolation:true,noTimelineGapFilling:true,
  directBridgePassiveLifecycle:true,wifiRttResponderPlan:true,bleRangingPlan:true,
  activeRangeMappingContract:true,receiverHealthPreserved:true
},null,2));
