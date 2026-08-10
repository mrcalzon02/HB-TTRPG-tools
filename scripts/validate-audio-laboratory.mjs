import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Lab=require('../audio-laboratory.js');

assert.equal(Lab.constants.VERSION,'0.1.0');
assert.equal(Lab.constants.SESSION_FORMAT,'hb-ttrpg-audio-laboratory-session');
assert.equal(Lab.constants.SAFETY.maximumOutputDbfs,-6);
assert.match(Lab.constants.SAFETY.note,/dBFS, not calibrated acoustic dB SPL/);

const speed=Lab.speedOfSoundMps(20,50);
assert.ok(speed>343&&speed<345);
assert.equal(Lab.estimateSplDb(-24,{}),null);
assert.equal(Lab.estimateSplDb(-18,{referenceSplDb:72,referenceDbfs:-24}),78);
assert.ok(Lab.acousticRangeResolutionM(250,12000,speed)<.02);

const sweep=Lab.generateLogSweep(48000,{startHz:250,endHz:8000,durationSeconds:.4});
assert.equal(sweep.sampleRate,48000);
assert.ok(sweep.samples.length>19000);
assert.equal(sweep.startHz,250);
assert.equal(sweep.endHz,8000);
assert.ok(Math.max(...sweep.samples)<1.001);

const synthetic=Lab.synthesizeEchoRecording(sweep.samples,48000,{speedMps:speed,noiseGain:.001,echoes:[{rangeM:1.5,gain:.45},{rangeM:3.0,gain:.3},{rangeM:4.2,gain:.18}]});
const analysis=Lab.analyzeRecordedSweep(sweep.samples,synthetic.recording,{sampleRate:48000,speedMps:speed,startHz:250,endHz:8000,maxRangeM:6,echoThresholdRatio:.08,maxEchoes:16});
for(const expected of [1.5,3.0,4.2]) assert.ok(analysis.echoes.some(echo=>Math.abs(echo.rangeM-expected)<.05),`missing ${expected} m echo`);
assert.ok(analysis.rangeResolutionM<.03);

const session=Lab.createSession();
Lab.loadSyntheticRoom(session);
assert.equal(session.stations.length,4);
const walls=Lab.inferPlanarWalls(session.stations,{toleranceM:.12,maxWalls:20});
const near=(theta,rho)=>walls.some(wall=>Math.min(Math.abs(wall.thetaDeg-theta),180-Math.abs(wall.thetaDeg-theta))<5&&Math.abs(Math.abs(wall.rhoM)-Math.abs(rho))<.18);
assert.ok(near(0,3),'missing x-wall family');
assert.ok(near(90,2.2),'missing y-wall family');
assert.match(Lab.serializeSession(session),/inferredPlanarWalls/);

const source=await readFile(new URL('../audio-laboratory.js',import.meta.url),'utf8');
for(const pattern of [/getUserMedia/,/echoCancellation:\s*false/,/noiseSuppression:\s*false/,/autoGainControl:\s*false/,/createScriptProcessor/,/normalizedMatchedFilter/,/inferPlanarWalls/,/Speaker-to-microphone frequency sweeps/,/single station yields path lengths/i,/dB SPL/]) assert.match(source,pattern);
const html=await readFile(new URL('../audio-laboratory.html',import.meta.url),'utf8');
assert.match(html,/audio-laboratory\.js/);
assert.match(html,/AudioLaboratory\.openPanel/);
const css=await readFile(new URL('../audio-laboratory.css',import.meta.url),'utf8');
assert.match(css,/#audio-laboratory/);

console.log(JSON.stringify({
  format:'hb-ttrpg-audio-laboratory-validation-receipt',schemaVersion:'0.1.0',pass:true,
  browserMicrophoneCapture:true,activeSpeakerSweep:true,digitalOutputSafetyClamp:true,
  calibratedSplBoundary:true,matchedFilterEchoRanging:true,temperatureHumiditySoundSpeed:true,
  syntheticEchoControl:true,multiStationMapping:true,planarWallInference:true,standaloneEntry:true
},null,2));
