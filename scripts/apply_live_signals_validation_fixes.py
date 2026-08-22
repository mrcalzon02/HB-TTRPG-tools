#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / 'live-signals-laboratory.js'
CSS = ROOT / 'live-signals-laboratory.css'
VALIDATOR = ROOT / 'scripts' / 'validate-live-signals-laboratory.mjs'
DOC = ROOT / 'docs' / 'live-signals-laboratory-mirror-and-safety.md'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f'{label}: start anchor not found')
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f'{label}: end anchor not found')
    return text[:start_index] + replacement + text[end_index:]


live = LIVE.read_text(encoding='utf-8')
live = replace_once(live, "const VERSION = '0.5.0';", "const VERSION = '0.5.1';", 'validation version')
live = replace_once(
    live,
    "    customActiveBandsRequireRegulatoryLimitEnforcement:true,\n",
    "    customActiveBandsRequireRegulatoryLimitEnforcement:true,\n    customActiveBandsRequireExplicitJurisdiction:true,\n    customActiveBandsRequireExplicitFrequencyBounds:true,\n",
    'policy legal metadata',
)

# Stable audit records carry the mirrored experiment as well as device/band policy state.
record_audit = r'''  function recordAuditEvent(session, event = {}) {
    if (!session) return null;
    const row = freeze({
      timestampUtc:new Date().toISOString(),event:String(event.event || 'state'),status:String(event.status || 'recorded'),
      deviceId:String(event.deviceId || hardwareBridgeStatus().id),experimentId:event.experimentId==null?null:String(event.experimentId),
      bandId:event.bandId==null?null:String(event.bandId),mode:event.mode==null?null:String(event.mode),method:event.method==null?null:String(event.method),
      jurisdiction:event.jurisdiction==null?null:String(event.jurisdiction),hardwareLimitsEnforced:event.hardwareLimitsEnforced==null?null:Boolean(event.hardwareLimitsEnforced),
      regulatoryLimitsEnforced:event.regulatoryLimitsEnforced==null?null:Boolean(event.regulatoryLimitsEnforced),reason:event.reason==null?'':String(event.reason)
    });
    session.auditLog.push(row);
    if (session.auditLog.length>MAX_AUDIT_EVENTS) session.auditLog.splice(0,session.auditLog.length-MAX_AUDIT_EVENTS);
    return row;
  }

'''
live = replace_between(live, '  function recordAuditEvent(session, event = {}) {', '  function observationMatchesBand(observation, band) {', record_audit, 'audit event function')

observation_match = r'''  function observationMatchesBand(observation, band) {
    if (!observation || !band) return false;
    if (observation.acquisitionMode==='active' && band.activeMethods?.includes(observation.ranging?.technology)) return true;
    if (band.channelId && band.channelId!=='unknown' && channelIdForObservation(observation)===band.channelId) return true;
    const frequencyHz=observation.signal?.frequencyHz;
    return Number.isFinite(frequencyHz) && Number.isFinite(band.minHz) && Number.isFinite(band.maxHz) && frequencyHz>=band.minHz && frequencyHz<=band.maxHz;
  }

'''
live = replace_between(live, '  function observationMatchesBand(observation, band) {', '  async function startBandHarvest(session, input = {}, bridge = hardwareBridge) {', observation_match, 'band observation matching')

band_preflight = r'''  function bandHarvestPreflight(input = {}, capabilityReport = bridgeCapabilityReport || {}) {
    const mode = String(input.mode || 'passive').toLowerCase();
    const profileId = String(input.profileId || activeSession?.profileId || 'android-native');
    const experiments=mirroredExperimentCatalog();
    const experimentId=String(input.experimentId || experiments[0]?.id || '');
    const experiment=experiments.find(row=>row.id===experimentId)||null;
    const bands = deviceBandCapabilities(profileId, capabilityReport);
    const band = bands.find(row=>row.id===String(input.bandId || bands[0]?.id || '')) || null;
    const method = String(input.method || (mode==='active' ? band?.activeMethods?.[0] || '' : 'observe'));
    const base = safetyPreflight({thermalState:input.thermalState,batteryPercent:input.batteryPercent,externalPower:input.externalPower});
    const blockers = [...base.blockers], warnings = [...base.warnings];
    if (!experiment) blockers.push(`unknown mirrored Signals Laboratory experiment ${experimentId || 'none selected'}`);
    if (!['passive','active'].includes(mode)) blockers.push(`unsupported harvest mode ${mode}`);
    if (!band) blockers.push('selected device reports no usable band for harvesting');
    if (band && !band.modes.includes(mode)) blockers.push(`${band.label} does not report ${mode} harvesting capability`);
    if (mode === 'passive') {
      if (method !== 'observe') blockers.push('Passive harvesting is receive-only and may use only observe');
    } else {
      if (!ACTIVE_SCAN_METHODS[method]) blockers.push(`Active method is not allowlisted: ${method || 'none selected'}`);
      if (band && !band.activeMethods.includes(method)) blockers.push(`${band.label} does not report active method ${method}`);
      if (band && !band.platformManaged && !band.hardwareLimitsEnforced) blockers.push('custom active band lacks explicit hardware-limit enforcement');
      if (band && !band.platformManaged && !band.regulatoryLimitsEnforced) blockers.push('custom active band lacks explicit regulatory-limit enforcement');
      if (band && !band.platformManaged && (!band.jurisdiction || band.jurisdiction==='unconfigured')) blockers.push('custom active band lacks explicit jurisdiction/policy scope');
      if (band && !band.platformManaged && (!band.legalBasis || band.legalBasis==='explicit bridge policy required')) blockers.push('custom active band lacks explicit legal/regulatory basis');
      if (band && !band.platformManaged && (!Number.isFinite(band.minHz) || !Number.isFinite(band.maxHz) || band.minHz<=0 || band.maxHz<=band.minHz)) blockers.push('custom active band lacks explicit valid frequency bounds');
      const active = activeScanPreflight({...input,method},capabilityReport);
      blockers.push(...active.blockers.filter(reason=>!blockers.includes(reason)));
      warnings.push(...active.warnings.filter(reason=>!warnings.includes(reason)));
    }
    return freeze({
      pass:blockers.length===0,experimentId,experiment,mode,method,band,bands,blockers:freeze(blockers),warnings:freeze(warnings),
      hardwareLimitsEnforced:Boolean(band?.hardwareLimitsEnforced),regulatoryLimitsEnforced:Boolean(band?.regulatoryLimitsEnforced),
      jurisdiction:band?.jurisdiction || 'unconfigured',legalBasis:band?.legalBasis || 'unconfigured',
      arbitraryFrequencySelection:false,arbitraryPowerControl:false,interferenceOperationsAllowed:false
    });
  }

'''
live = replace_between(live, '  function bandHarvestPreflight(input = {}, capabilityReport = bridgeCapabilityReport || {}) {', '  function buildBandHarvestPlan(input = {}, capabilityReport = bridgeCapabilityReport || {}) {', band_preflight, 'band harvest preflight')

build_plan = r'''  function buildBandHarvestPlan(input = {}, capabilityReport = bridgeCapabilityReport || {}) {
    const preflight = bandHarvestPreflight(input,capabilityReport);
    if (!preflight.pass) throw new Error(`Band harvest preflight blocked: ${preflight.blockers.join('; ')}`);
    return freeze({
      format:'hb-ttrpg-live-signals-band-harvest-plan',schemaVersion:VERSION,profileId:String(input.profileId || activeSession?.profileId || 'android-native'),
      experimentId:preflight.experiment.id,experimentLabel:preflight.experiment.label,
      expectedObservables:freeze([...preflight.experiment.observables]),derivedOutputs:freeze([...preflight.experiment.derivedOutputs]),
      bandId:preflight.band.id,bandLabel:preflight.band.label,channelId:preflight.band.channelId,mode:preflight.mode,method:preflight.method,
      minHz:preflight.band.minHz,maxHz:preflight.band.maxHz,platformManaged:preflight.band.platformManaged,
      hardwareLimitsEnforced:preflight.hardwareLimitsEnforced,regulatoryLimitsEnforced:preflight.regulatoryLimitsEnforced,
      jurisdiction:preflight.jurisdiction,legalBasis:preflight.legalBasis,maxDutyCycle:preflight.band.maxDutyCycle,maxPowerDbm:preflight.band.maxPowerDbm,
      arbitraryFrequencySelection:false,arbitraryPowerControl:false,interferenceOperationsAllowed:false,
      targetIds:freeze([...(input.targetIds||[]).map(String).filter(Boolean)]),samplesPerTarget:clamp(Math.floor(finite(input.samplesPerTarget,3)),1,MAX_ACTIVE_SAMPLES_PER_TARGET),sampleIntervalMs:Math.max(MIN_ACTIVE_SAMPLE_INTERVAL_MS,finite(input.sampleIntervalMs,1000))
    });
  }

'''
live = replace_between(live, '  function buildBandHarvestPlan(input = {}, capabilityReport = bridgeCapabilityReport || {}) {', '  function recordAuditEvent(session, event = {}) {', build_plan, 'band harvest plan')

start_harvest = r'''  async function startBandHarvest(session, input = {}, bridge = hardwareBridge) {
    if (!session || session.endedAt) throw new Error('Start a live session before starting band harvesting.');
    if (!bridgeCapabilityReport && bridge) await refreshHardwareBridgeCapabilities();
    let plan;
    try { plan=buildBandHarvestPlan({...input,profileId:session.profileId},bridgeCapabilityReport||{}); }
    catch(error){recordAuditEvent(session,{event:'band-harvest-start',status:'blocked',experimentId:input.experimentId,bandId:input.bandId,mode:input.mode,method:input.method,reason:error.message});throw error;}
    const startedAt=new Date().toISOString();
    if(plan.mode==='passive') {
      try {
        let bridgeMode='local-routing-only';
        if (bridge?.startBandHarvest) { await bridge.startBandHarvest(plan); bridgeMode='bridge-startBandHarvest'; }
        else if (bridge?.configurePassiveHarvest) { await bridge.configurePassiveHarvest(plan); bridgeMode='bridge-configurePassiveHarvest'; }
        session.harvestControl=freeze({active:true,plan,startedAt,bridgeMode});
        const record=freeze({startedAt,endedAt:null,plan,bridgeMode,resultCount:0});
        session.harvestRuns.push(record);
        recordAuditEvent(session,{event:'band-harvest-start',status:'allowed',experimentId:plan.experimentId,bandId:plan.bandId,mode:plan.mode,method:plan.method,jurisdiction:plan.jurisdiction,hardwareLimitsEnforced:plan.hardwareLimitsEnforced,regulatoryLimitsEnforced:plan.regulatoryLimitsEnforced,reason:bridgeMode});
        return freeze({record,activeResult:null});
      } catch(error) {
        recordAuditEvent(session,{event:'band-harvest-start',status:'blocked',experimentId:plan.experimentId,bandId:plan.bandId,mode:plan.mode,method:plan.method,jurisdiction:plan.jurisdiction,hardwareLimitsEnforced:plan.hardwareLimitsEnforced,regulatoryLimitsEnforced:plan.regulatoryLimitsEnforced,reason:error.message});
        throw error;
      }
    }
    const bridgeMode='runActiveScan';
    session.harvestControl=freeze({active:true,plan,startedAt,bridgeMode});
    try {
      const activeResult=await runActiveScan(session,{method:plan.method,targetIds:plan.targetIds,samplesPerTarget:plan.samplesPerTarget,sampleIntervalMs:plan.sampleIntervalMs,...input},bridge);
      const endedAt=new Date().toISOString();
      session.harvestControl=freeze({active:false,plan,startedAt,endedAt,bridgeMode});
      const record=freeze({startedAt,endedAt,plan,bridgeMode,resultCount:activeResult.observations.length});
      session.harvestRuns.push(record);
      recordAuditEvent(session,{event:'band-harvest-start',status:'allowed',experimentId:plan.experimentId,bandId:plan.bandId,mode:plan.mode,method:plan.method,jurisdiction:plan.jurisdiction,hardwareLimitsEnforced:plan.hardwareLimitsEnforced,regulatoryLimitsEnforced:plan.regulatoryLimitsEnforced,reason:bridgeMode});
      return freeze({record,activeResult});
    } catch(error) {
      session.harvestControl=freeze({active:false,plan,startedAt,endedAt:new Date().toISOString(),bridgeMode});
      recordAuditEvent(session,{event:'band-harvest-start',status:'blocked',experimentId:plan.experimentId,bandId:plan.bandId,mode:plan.mode,method:plan.method,jurisdiction:plan.jurisdiction,hardwareLimitsEnforced:plan.hardwareLimitsEnforced,regulatoryLimitsEnforced:plan.regulatoryLimitsEnforced,reason:error.message});
      throw error;
    }
  }

'''
live = replace_between(live, '  async function startBandHarvest(session, input = {}, bridge = hardwareBridge) {', '  async function stopBandHarvest(session, bridge = hardwareBridge) {', start_harvest, 'start band harvest')

# Thermal duty reduction is enforced rather than merely announced.
create_session = r'''  function thermallyReducedPolling(polling) {
    return freeze({...polling,
      wifiResultPollMs:Math.max(polling.wifiResultPollMs,MIN_WIFI_RESULT_POLL_MS*2),
      bleObservePeriodMs:Math.max(polling.bleObservePeriodMs,MIN_BLE_OBSERVE_PERIOD_MS*2),
      cellPollMs:Math.max(polling.cellPollMs,MIN_CELL_POLL_MS*2),
      gnssPollMs:Math.max(polling.gnssPollMs,MIN_GNSS_POLL_MS*2),
      routerPollMs:Math.max(polling.routerPollMs,MIN_ROUTER_POLL_MS*2),
      sensorHz:Math.min(polling.sensorHz,Math.max(1,Math.floor(DEFAULT_SENSOR_HZ/2))),thermalDutyReduced:true
    });
  }

  function createSession(options = {}) {
    const profileId = HARDWARE_PROFILES[options.profileId] ? options.profileId : 'generic-receive-json';
    let polling = safePollingConfiguration(options.polling || {}, options.capability || {});
    const preflight = safetyPreflight(options.hardwareState || {});
    if (!preflight.pass) throw new Error(`Live session preflight blocked: ${preflight.blockers.join('; ')}`);
    if (preflight.reduceDutyCycle) polling=thermallyReducedPolling(polling);
    const session={
      format:'hb-ttrpg-live-signals-session', schemaVersion:VERSION, evidenceClass:'empirical-platform-telemetry', mode:CURRENT_MODE,
      sessionId:`lsl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      startedAt:new Date().toISOString(), endedAt:null, profileId, receiveOnly:true,
      polling, preflight, observations:[], nextObservationSequence:0, activeBursts:[], harvestRuns:[], harvestControl:null, auditLog:[], captureLedger:[], notes:[], refinementStage:'capability-inventory', receiverBaseline:null,
      documentation:freeze({mirrorSource:'SignalsLaboratory.experimentCatalog',safetyPolicy:'LIVE_CONTROL_POLICY',recording:'auditLog + captureLedger + serialized observations',failClosed:true}),
      privacy:freeze({redaction:polling.privacyRedaction,rawIdentifiersIncluded:polling.includeRawIdentifiers})
    };
    recordAuditEvent(session,{event:'session-created',status:'allowed',mode:'passive',reason:preflight.reduceDutyCycle?'thermal duty reduction enforced':'nominal acquisition policy'});
    return session;
  }

'''
live = replace_between(live, '  function createSession(options = {}) {', '  function appendObservation(session, raw, context = {}) {', create_session, 'session creation')

# Every stored observation receives a stable sequence identifier; capture records never rely on mutable array indices.
append_old = """    if (!preflight.pass) throw new Error(`Acquisition stopped by hardware guard: ${preflight.blockers.join('; ')}`);\n    session.observations.push(observation);\n    if (session.harvestControl?.active && observationMatchesBand(observation,session.harvestControl.plan)) {\n      session.captureLedger.push(freeze({timestampUtc:new Date(observation.timestampMs).toISOString(),observationIndex:session.observations.length-1,bandId:session.harvestControl.plan.bandId,mode:observation.acquisitionMode,method:session.harvestControl.plan.method,deviceId:observation.deviceId,provenance:observation.provenance}));\n      if(session.captureLedger.length>MAX_CAPTURE_LEDGER)session.captureLedger.splice(0,session.captureLedger.length-MAX_CAPTURE_LEDGER);\n    }\n    if (session.observations.length > MAX_OBSERVATIONS) session.observations.splice(0, session.observations.length - MAX_OBSERVATIONS);\n    return observation;\n"""
append_new = """    if (!preflight.pass) { recordAuditEvent(session,{event:'acquisition-guard',status:'blocked',mode:acquisitionMode,reason:preflight.blockers.join('; ')}); throw new Error(`Acquisition stopped by hardware guard: ${preflight.blockers.join('; ')}`); }\n    const storedObservation=freeze({...observation,observationSequence:session.nextObservationSequence++});\n    session.observations.push(storedObservation);\n    if (session.harvestControl?.active && observationMatchesBand(storedObservation,session.harvestControl.plan)) {\n      session.captureLedger.push(freeze({timestampUtc:new Date(storedObservation.timestampMs).toISOString(),observationSequence:storedObservation.observationSequence,experimentId:session.harvestControl.plan.experimentId,bandId:session.harvestControl.plan.bandId,mode:storedObservation.acquisitionMode,method:session.harvestControl.plan.method,deviceId:storedObservation.deviceId,provenance:storedObservation.provenance}));\n      if(session.captureLedger.length>MAX_CAPTURE_LEDGER)session.captureLedger.splice(0,session.captureLedger.length-MAX_CAPTURE_LEDGER);\n    }\n    if (session.observations.length > MAX_OBSERVATIONS) session.observations.splice(0, session.observations.length - MAX_OBSERVATIONS);\n    return storedObservation;\n"""
live = replace_once(live, append_old, append_new, 'stable observation/capture ledger')

# Core active-scan API records both acceptance and rejection, including non-UI callers.
run_active = r'''  async function runActiveScan(session, input = {}, bridge = hardwareBridge) {
    let plan=null;
    try {
      if (!session || session.endedAt) throw new Error('Start a live session before running Active Scan.');
      if (!bridge || typeof bridge.runActiveScan !== 'function') throw new Error('No native/router hardware bridge with runActiveScan() is connected.');
      if (!bridgeCapabilityReport) await refreshHardwareBridgeCapabilities();
      plan = buildActiveScanPlan(input, bridgeCapabilityReport || {});
      const startedAt = new Date().toISOString();
      const results = await bridge.runActiveScan(plan);
      const rows = Array.isArray(results) ? results : Array.isArray(results?.observations) ? results.observations : [];
      const accepted = [];
      for (const raw of rows) {
        const targetId = String(raw.targetId || raw.sourceId || '');
        const target = plan.targets.find(item=>item.id===targetId);
        if (!target) continue;
        const observation = appendObservation(session,{...raw,kind:raw.kind||'ranging',acquisitionMode:'active',operation:plan.method,localHardwareAuthorized:true,responderParticipating:true,rangingTechnology:raw.rangingTechnology||plan.method},{acquisitionMode:'active'});
        accepted.push(observation);
      }
      const record = freeze({startedAt,endedAt:new Date().toISOString(),plan,resultCount:accepted.length});
      session.activeBursts.push(record);
      recordAuditEvent(session,{event:'active-scan',status:'allowed',mode:'active',method:plan.method,hardwareLimitsEnforced:true,regulatoryLimitsEnforced:true,reason:`${accepted.length} accepted ranging observations`});
      return freeze({record,observations:freeze(accepted)});
    } catch(error) {
      if (session?.auditLog) recordAuditEvent(session,{event:'active-scan',status:'blocked',mode:'active',method:plan?.method||input.method||null,reason:error.message});
      throw error;
    }
  }

'''
live = replace_between(live, '  async function runActiveScan(session, input = {}, bridge = hardwareBridge) {', '  function activeRangeSummary(session) {', run_active, 'active scan audit')

# Thermal reduction applies to active bursts too.
live = replace_once(
    live,
    "    const clampedSamples = Math.min(samplesPerTarget, maximumSamplesByTime);\n",
    "    let clampedSamples = Math.min(samplesPerTarget, maximumSamplesByTime);\n    if (preflight.thermalState && SAFETY_POLICY.reduceThermalStates.includes(preflight.thermalState)) { clampedSamples=1; sampleIntervalMs=Math.max(sampleIntervalMs,MIN_ACTIVE_SAMPLE_INTERVAL_MS*2); }\n",
    'active thermal reduction',
)
# sampleIntervalMs must be mutable for the thermal reduction above.
live = replace_once(live, "    const sampleIntervalMs = Math.max(MIN_ACTIVE_SAMPLE_INTERVAL_MS, finite(input.sampleIntervalMs, 1000));\n", "    let sampleIntervalMs = Math.max(MIN_ACTIVE_SAMPLE_INTERVAL_MS, finite(input.sampleIntervalMs, 1000));\n", 'active interval mutability')

# A canonical top board replaces repeated session/preflight/harvest summaries.
control_board = r'''  function renderControlBoard() {
    const target=panel?.querySelector('[data-lsl-control-board]');if(!target)return;
    const profileId=panel.querySelector('#lsl-profile')?.value||activeSession?.profileId||'android-native';
    const bridge=hardwareBridgeStatus(),preflight=safetyPreflight(readHardwareState());
    const harvest=bandHarvestPreflight({...selectedHarvestInput(),profileId},bridgeCapabilityReport||{});
    const summary=activeSession?summarizeSession(activeSession):null;
    const health=activeSession?channelHealthSnapshot(activeSession):null;
    const control=activeSession?.harvestControl;
    const sessionState=!activeSession?'idle':activeSession.endedAt?'stopped':'active';
    const harvestState=control?.active?'harvesting':activeSession?.harvestRuns?.length?'idle / recorded':'idle';
    const compliance=!harvest.band?'no band':harvest.pass?'ready':'blocked';
    target.innerHTML=`<div class="lsl-control-board-grid">
      <article><span>Session</span><strong>${esc(sessionState)}</strong><small>${activeSession?esc(activeSession.sessionId):'no session'}</small></article>
      <article><span>Device / profile</span><strong>${bridge.connected?esc(bridge.id):'bridge disconnected'}</strong><small>${esc(profileId)}</small></article>
      <article data-state="${preflight.pass?'pass':'blocked'}"><span>Hardware safety</span><strong>${preflight.pass?'PASS':'BLOCKED'}</strong><small>${esc(preflight.thermalState)} · ${preflight.batteryPercent.toFixed(0)}% battery${preflight.reduceDutyCycle?' · reduced duty':''}</small></article>
      <article data-state="${compliance}"><span>Experiment / band</span><strong>${esc(harvest.experiment?.label||'—')}</strong><small>${esc(harvest.band?.label||'no usable band')}</small></article>
      <article><span>Acquisition control</span><strong>${esc(harvest.mode)} · ${esc(harvest.method||'—')}</strong><small>${esc(harvestState)}</small></article>
      <article data-state="${compliance}"><span>Hardware / regulatory gate</span><strong>${compliance.toUpperCase()}</strong><small>${harvest.hardwareLimitsEnforced?'hardware enforced':'hardware not established'} · ${harvest.regulatoryLimitsEnforced?'regulatory enforced':'regulatory not established'}</small></article>
      <article><span>Current outputs</span><strong>${summary?.observationCount||0} observations</strong><small>${health?.healthyChannels||0} healthy channels · ${summary?.activeRangeSamples||0} ranges</small></article>
      <article><span>Recording</span><strong>${activeSession?.captureLedger?.length||0} captures</strong><small>${activeSession?.auditLog?.length||0} audit events · ${activeSession?.harvestRuns?.length||0} harvest runs</small></article>
    </div>`;
  }

'''
live = replace_once(live, '  function renderSignalsMirror() {', control_board + '  function renderSignalsMirror() {', 'control board insertion')

# Mirrored experiment is a selectable part of the live harvest plan.
live = replace_once(
    live,
    "    const mode=panel?.querySelector('#lsl-harvest-mode')?.value||'passive';\n",
    "    const experimentId=panel?.querySelector('#lsl-harvest-experiment')?.value||mirroredExperimentCatalog()[0]?.id||'';\n    const mode=panel?.querySelector('#lsl-harvest-mode')?.value||'passive';\n",
    'harvest experiment read',
)
live = replace_once(live, "    return {mode,bandId:panel?.querySelector('#lsl-harvest-band')?.value||'',method,targetIds:", "    return {experimentId,mode,bandId:panel?.querySelector('#lsl-harvest-band')?.value||'',method,targetIds:", 'harvest experiment input')

render_harvest = r'''  function renderBandHarvestControls() {
    const target=panel?.querySelector('[data-lsl-harvest-state]'); if(!target)return;
    const profileId=panel.querySelector('#lsl-profile')?.value||activeSession?.profileId||'android-native';
    const experiments=mirroredExperimentCatalog(),experimentSelect=panel.querySelector('#lsl-harvest-experiment');
    const priorExperiment=experimentSelect?.value;
    if(experimentSelect){experimentSelect.innerHTML=experiments.map(row=>`<option value="${esc(row.id)}">${esc(row.label)}</option>`).join('');if(priorExperiment&&experiments.some(row=>row.id===priorExperiment))experimentSelect.value=priorExperiment;}
    const bands=deviceBandCapabilities(profileId,bridgeCapabilityReport||{}),bandSelect=panel.querySelector('#lsl-harvest-band'),modeSelect=panel.querySelector('#lsl-harvest-mode'),methodSelect=panel.querySelector('#lsl-harvest-method');
    const priorBand=bandSelect?.value;
    if(bandSelect){bandSelect.innerHTML=bands.map(row=>`<option value="${esc(row.id)}">${esc(row.label)}</option>`).join('')||'<option value="">No usable bands reported</option>';if(priorBand&&bands.some(row=>row.id===priorBand))bandSelect.value=priorBand;}
    const mode=modeSelect?.value||'passive',band=bands.find(row=>row.id===bandSelect?.value)||bands[0]||null;
    if(band && !band.modes.includes(mode) && modeSelect){modeSelect.value=band.modes[0]||'passive';}
    const effectiveMode=modeSelect?.value||'passive';
    const methods=effectiveMode==='passive'?['observe']:(band?.activeMethods||[]);
    if(methodSelect)methodSelect.innerHTML=methods.map(id=>`<option value="${esc(id)}">${esc(id==='observe'?'Receive / observe':ACTIVE_SCAN_METHODS[id]?.label||id)}</option>`).join('')||'<option value="">No active method for this band</option>';
    const preflight=bandHarvestPreflight({...selectedHarvestInput(),profileId},bridgeCapabilityReport||{}),control=activeSession?.harvestControl;
    target.innerHTML=`<div class="lsl-safety ${preflight.pass?'pass':'blocked'}"><strong>${preflight.pass?'BAND CONTROL READY':'BAND CONTROL BLOCKED'}</strong><span>${preflight.pass?`${esc(preflight.experiment?.label||'experiment')} · ${esc(preflight.band?.label||'band')} · ${esc(preflight.mode)} / ${esc(preflight.method)}`:esc(preflight.blockers.join('; '))}</span></div>${control?.active?`<p class="lsl-harvest-live">Harvesting ${esc(control.plan.bandLabel)} for ${esc(control.plan.experimentLabel)} via ${esc(control.bridgeMode)}.</p>`:''}<p class="lsl-hint">${esc(preflight.legalBasis)}. Arbitrary frequency, power, modulation, interference and radio-reconfiguration controls are not exposed.</p>`;
    renderControlBoard();
  }

'''
live = replace_between(live, '  function renderBandHarvestControls() {', '  function renderAuditLedger() {', render_harvest, 'harvest control renderer')

render_audit = r'''  function renderAuditLedger() {
    const target=panel?.querySelector('[data-lsl-audit]');if(!target)return;
    const rows=(activeSession?.auditLog||[]).slice(-40).reverse();
    target.innerHTML=`<div class="lsl-table"><table><thead><tr><th>Time</th><th>Event</th><th>Status</th><th>Experiment / band</th><th>Mode / method</th><th>Policy / result</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.timestampUtc)}</td><td>${esc(row.event)}</td><td>${esc(row.status)}</td><td>${esc([row.experimentId,row.bandId].filter(Boolean).join(' / ')||'—')}</td><td>${esc([row.mode,row.method].filter(Boolean).join(' / ')||'—')}</td><td>${esc(row.reason||row.jurisdiction||'—')}</td></tr>`).join('')||'<tr><td colspan="6">No control events recorded yet.</td></tr>'}</tbody></table></div>`;
  }

'''
live = replace_between(live, '  function renderAuditLedger() {', '  function renderActiveScan() {', render_audit, 'audit renderer')

# Session detail now contains only refinement information; operational values are canonical in the top board.
render_session = r'''  function renderSession() {
    if(!panel)return;
    const target=panel.querySelector('[data-lsl-session]');
    if(!activeSession){target.innerHTML='<p>No session is active. Refinement stages become available after empirical collection begins.</p>';panel.querySelector('[data-lsl-observations]').innerHTML='<tr><td colspan="6">No observations yet.</td></tr>';drawTimeSeries();drawSpatial();renderPassiveInventory();renderReceiverHealth();renderChannelCoverage();renderActiveScan();renderAuditLedger();renderControlBoard();return;}
    const plan=buildRefinementPlan(activeSession),timeline=synchronizedTimeline(activeSession);
    target.innerHTML=`<div class="lsl-refinement">${plan.map(stage=>`<article data-status="${stage.status}"><span>${esc(stage.label)}</span><strong>${esc(stage.status)}</strong><p>${esc(stage.goal)}</p><small>Exit: ${esc(stage.exit)}</small></article>`).join('')}</div><p class="lsl-hint">Synchronization uses ${timeline.bucketWidthMs} ms timestamp buckets with no interpolation or gap filling.</p>`;
    const rows=activeSession.observations.slice(-40).reverse();
    panel.querySelector('[data-lsl-observations]').innerHTML=rows.map(row=>`<tr><td>${new Date(row.timestampMs).toLocaleTimeString()}</td><td>${esc(row.kind)}</td><td>${row.signal.frequencyHz?`${(row.signal.frequencyHz/1e6).toFixed(3)} MHz`:'—'}</td><td>${signalValue(row)===null?'—':signalValue(row).toFixed(1)}</td><td>${esc(row.sourceId||'—')}</td><td>${esc(row.provenance)}</td></tr>`).join('')||'<tr><td colspan="6">No observations yet.</td></tr>';
    drawTimeSeries();drawSpatial();renderPassiveInventory();renderReceiverHealth();renderChannelCoverage();renderActiveScan();renderAuditLedger();renderControlBoard();
  }

'''
live = replace_between(live, '  function renderSession() {', '  function readPolling() {', render_session, 'condensed session renderer')

# Preflight no longer repeats polling values already visible in the control inputs.
render_preflight = r'''  function renderPreflight() {
    const preflight=safetyPreflight(readHardwareState()),target=panel.querySelector('[data-lsl-preflight]');
    target.innerHTML=`<div class="lsl-safety ${preflight.pass?'pass':'blocked'}"><strong>${preflight.pass?'PASSIVE PREFLIGHT PASS':'SESSION BLOCKED'}</strong><span>${preflight.blockers.length?esc(preflight.blockers.join('; ')):'Receive-only passive acquisition is permitted under the current hardware state. Active operation remains separately capability, responder, hardware-limit and regulatory-policy gated.'}</span>${preflight.warnings.length?`<small>${esc(preflight.warnings.join('; '))}</small>`:''}</div>`;
    renderControlBoard();
    return preflight;
  }

'''
live = replace_between(live, '  function renderPreflight() {', '  function buildPanel() {', render_preflight, 'condensed preflight renderer')

# Add the canonical board and mirrored experiment selector without changing existing control IDs.
live = replace_once(
    live,
    '<aside class="lsl-controls"><section class="lsl-card lsl-lock">',
    '<aside class="lsl-controls"><section class="lsl-card lsl-control-board-card"><div class="lsl-section-head"><h3>Live control → state → output board</h3><span>canonical operational summary</span></div><div data-lsl-control-board></div></section><section class="lsl-card lsl-lock">',
    'top operational board',
)
live = replace_once(
    live,
    '<section class="lsl-card lsl-harvest-card"><h3>Live band harvesting controls</h3><p>Band choices are generated from the active bridge/device. Passive mode remains receive-only. Active mode exposes only the standards-supported ranging methods reported for that band; frequency, power, modulation and interference controls are intentionally absent.</p><label>Harvest mode',
    '<section class="lsl-card lsl-harvest-card"><h3>Live band harvesting controls</h3><p>Choose the mirrored Signals Laboratory experiment, then a device-reported usable band and its permitted empirical acquisition method. Passive mode remains receive-only; active mode remains allowlisted and policy-gated.</p><label>Mirrored experiment<select id="lsl-harvest-experiment"></select></label><label>Harvest mode',
    'mirrored experiment control',
)
live = replace_once(live, '<div class="lsl-status" data-lsl-status>Ready.</div>', '<div class="lsl-status" data-lsl-status role="status" aria-live="polite">Ready.</div>', 'single live status region')
live = replace_once(live, '<h3>Passive session & refinement procedure</h3><span>empirical telemetry remains separate from simulation</span>', '<h3>Refinement procedure</h3><span>stage readiness only · operational summary is above</span>', 'refinement heading')
live = replace_once(live, '<section class="lsl-card"><div class="lsl-section-head"><h3>Documentation / safety / legality audit ledger</h3>', '<section class="lsl-card lsl-audit-card"><div class="lsl-section-head"><h3>Documentation / safety / legality audit ledger</h3>', 'audit card class')

collapse_helpers = r'''
  function prepareDiagnosticSections() {
    const collapse=new Set(['Signals Laboratory mirror','Documentation / safety / legality audit ledger','Capability matrix','Refinement procedure','Passive frequency / source census','Receiver / antenna-path cleanliness & degradation screening','Recent normalized observations','Future attenuation / sweep research']);
    for(const section of [...panel.querySelectorAll('.lsl-workspace > section.lsl-card')]) {
      const heading=section.querySelector('h3')?.textContent?.trim();
      if(!collapse.has(heading))continue;
      const details=root.document.createElement('details');details.className=`${section.className} lsl-diagnostic`;
      const head=section.querySelector(':scope > .lsl-section-head'),directHeading=head?.querySelector('h3')||section.querySelector(':scope > h3'),subtitle=head?.querySelector('span')?.textContent?.trim()||'';
      const summary=root.document.createElement('summary');summary.innerHTML=`<strong>${esc(heading)}</strong>${subtitle?`<span>${esc(subtitle)}</span>`:''}`;details.appendChild(summary);
      if(head)head.remove();else directHeading?.remove();
      while(section.firstChild)details.appendChild(section.firstChild);
      section.replaceWith(details);
      details.addEventListener('toggle',()=>{if(details.open){drawTimeSeries();drawSpatial();drawActiveRangeMap();}});
    }
  }

'''
live = replace_once(live, '  function buildPanel() {', collapse_helpers + '  function buildPanel() {', 'diagnostic collapse helper')
live = replace_once(live, '    root.document.body.appendChild(panel);\n', '    root.document.body.appendChild(panel);\n    prepareDiagnosticSections();\n', 'diagnostic preparation')

# Any safety-relevant input refreshes the canonical status board immediately.
live = replace_once(
    live,
    "    for(const id of ['#lsl-thermal','#lsl-battery','#lsl-external-power','#lsl-redact','#lsl-session-minutes','#lsl-wifi-ms','#lsl-ble-window-ms','#lsl-ble-period-ms','#lsl-cell-ms','#lsl-gnss-ms','#lsl-router-ms','#lsl-sensor-hz']) panel.querySelector(id)?.addEventListener('change',renderPreflight);\n",
    "    for(const id of ['#lsl-thermal','#lsl-battery','#lsl-external-power','#lsl-redact','#lsl-session-minutes','#lsl-wifi-ms','#lsl-ble-window-ms','#lsl-ble-period-ms','#lsl-cell-ms','#lsl-gnss-ms','#lsl-router-ms','#lsl-sensor-hz']) panel.querySelector(id)?.addEventListener('change',()=>{renderPreflight();renderBandHarvestControls();renderControlBoard();});\n",
    'safety status refresh',
)
live = replace_once(live, "    for(const id of ['#lsl-harvest-mode','#lsl-harvest-band','#lsl-harvest-method'])panel.querySelector(id)?.addEventListener('change',renderBandHarvestControls);\n", "    for(const id of ['#lsl-harvest-experiment','#lsl-harvest-mode','#lsl-harvest-band','#lsl-harvest-method'])panel.querySelector(id)?.addEventListener('change',renderBandHarvestControls);\n", 'harvest experiment listener')

# Preflight and stop actions are auditable without turning every field edit into log spam.
live = replace_once(live, "    panel.querySelector('[data-lsl-preflight-button]')?.addEventListener('click',renderPreflight);\n", "    panel.querySelector('[data-lsl-preflight-button]')?.addEventListener('click',()=>{const result=renderPreflight();if(activeSession)recordAuditEvent(activeSession,{event:'manual-preflight',status:result.pass?'allowed':'blocked',mode:'passive',reason:[...result.blockers,...result.warnings].join('; ')||'preflight pass'});renderAuditLedger();renderControlBoard();});\n", 'preflight audit')
live = replace_once(live, "if(activeSession&&!activeSession.endedAt)activeSession.endedAt=new Date().toISOString();if(hardwareBridge?.stopPassive)await hardwareBridge.stopPassive();renderSession();", "if(activeSession&&!activeSession.endedAt){activeSession.endedAt=new Date().toISOString();recordAuditEvent(activeSession,{event:'session-stop',status:'allowed',mode:'passive',reason:'operator stop'});}if(hardwareBridge?.stopPassive)await hardwareBridge.stopPassive();renderSession();", 'session stop audit')

# Initial/open rendering always includes the canonical board.
live = replace_once(live, 'renderCapabilityMatrix();renderPreflight();renderFutureResearch();renderSignalsMirror();renderSession();renderBandHarvestControls();renderAuditLedger();', 'renderCapabilityMatrix();renderPreflight();renderFutureResearch();renderSignalsMirror();renderSession();renderBandHarvestControls();renderAuditLedger();renderControlBoard();', 'initial control board render')
live = replace_once(live, 'renderPreflight();renderFutureResearch();renderSignalsMirror();renderSession();renderBandHarvestControls();renderAuditLedger();return target;', 'renderPreflight();renderFutureResearch();renderSignalsMirror();renderSession();renderBandHarvestControls();renderAuditLedger();renderControlBoard();return target;', 'open control board render')

LIVE.write_text(live,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
if 'lsl-control-board-grid' not in css:
    css += r'''

/* 2026-08-21 full-width Live Signals control/state/output consolidation */
.lsl-body{grid-template-columns:minmax(0,1fr)!important}.lsl-controls{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.lsl-controls>.lsl-card{min-width:0}.lsl-control-board-card{grid-column:1/-1;border-color:rgba(114,213,255,.48);background:linear-gradient(180deg,rgba(114,213,255,.055),rgba(255,255,255,.018))}.lsl-control-board-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:8px}.lsl-control-board-grid article{display:grid;gap:3px;border:1px solid var(--line,#34414d);border-radius:10px;padding:9px;background:rgba(255,255,255,.02)}.lsl-control-board-grid article[data-state="pass"],.lsl-control-board-grid article[data-state="ready"]{border-color:rgba(156,255,156,.48)}.lsl-control-board-grid article[data-state="blocked"]{border-color:rgba(255,130,130,.58)}.lsl-control-board-grid span,.lsl-control-board-grid small{color:var(--muted,#9eabb5)}.lsl-control-board-grid span{font-size:.72rem}.lsl-control-board-grid small{font-size:.72rem;line-height:1.35}.lsl-workspace{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lsl-workspace>.lsl-channel-card,.lsl-workspace>.lsl-mirror-card,.lsl-workspace>.lsl-audit-card,.lsl-workspace>.lsl-boundary{grid-column:1/-1}.lsl-diagnostic{padding:0!important;overflow:hidden}.lsl-diagnostic>summary{display:flex;justify-content:space-between;gap:12px;align-items:baseline;cursor:pointer;padding:14px 15px;font-weight:800}.lsl-diagnostic>summary span{color:var(--muted,#9eabb5);font-size:.76rem;font-weight:500}.lsl-diagnostic[open]>summary{border-bottom:1px solid var(--line,#34414d)}.lsl-diagnostic>summary~*{margin-left:15px;margin-right:15px}.lsl-diagnostic>summary+*{margin-top:14px}.lsl-diagnostic>*:last-child{margin-bottom:15px}.lsl-workspace .lsl-canvas{height:260px}.lsl-active-card .lsl-canvas{height:300px}
@media(max-width:1250px){.lsl-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:920px){.lsl-controls,.lsl-workspace{grid-template-columns:1fr}.lsl-workspace>*{grid-column:1!important}.lsl-diagnostic>summary{align-items:flex-start;flex-direction:column}}
'''
CSS.write_text(css,encoding='utf-8')

validator=VALIDATOR.read_text(encoding='utf-8')
validator=replace_once(validator,"assert.equal(Lab.constants.VERSION,'0.5.0');","assert.equal(Lab.constants.VERSION,'0.5.1');",'validator 0.5.1')
validator=replace_once(validator,"schemaVersion:'0.5.0'","schemaVersion:'0.5.1'",'receipt 0.5.1')
validation_tests=r'''

const reducedSession=Lab.createSession({profileId:'android-native',hardwareState:{thermalState:'serious',batteryPercent:80},polling:{sensorHz:50,wifiResultPollMs:5000,cellPollMs:2000,gnssPollMs:1000,routerPollMs:2000,bleObservePeriodMs:30000}});
assert.equal(reducedSession.polling.thermalDutyReduced,true);
assert.ok(reducedSession.polling.sensorHz<=10);
assert.ok(reducedSession.polling.wifiResultPollMs>=10000);
const explicitCustomReport={activeMethods:['wifi-rtt-ranging'],rangingTargets:[{id:'peer',methods:['wifi-rtt-ranging'],participating:true,responderCapable:true}],bands:[{id:'licensed-test',label:'Explicit test band',modes:['active'],activeMethods:['wifi-rtt-ranging'],platformManaged:false,hardwareLimitsEnforced:true,regulatoryLimitsEnforced:true,minHz:2.40e9,maxHz:2.48e9,jurisdiction:'configured-test-policy',legalBasis:'bridge-enforced authorized test profile'}]};
const explicitCustom=Lab.bandHarvestPreflight({profileId:'generic-receive-json',experimentId:'rf-baseline',bandId:'licensed-test',mode:'active',method:'wifi-rtt-ranging',thermalState:'nominal',batteryPercent:80},explicitCustomReport);
assert.equal(explicitCustom.pass,true);
const missingJurisdiction=Lab.bandHarvestPreflight({profileId:'generic-receive-json',experimentId:'rf-baseline',bandId:'custom-band',mode:'active',method:'wifi-rtt-ranging',thermalState:'nominal',batteryPercent:80},{activeMethods:['wifi-rtt-ranging'],rangingTargets:[{id:'peer',methods:['wifi-rtt-ranging'],participating:true,responderCapable:true}],bands:[{id:'custom-band',label:'Custom',modes:['active'],activeMethods:['wifi-rtt-ranging'],platformManaged:false,hardwareLimitsEnforced:true,regulatoryLimitsEnforced:true,minHz:2.4e9,maxHz:2.5e9}]});
assert.equal(missingJurisdiction.pass,false);
assert.ok(missingJurisdiction.blockers.some(reason=>reason.includes('jurisdiction')));
const planWithExperiment=Lab.buildBandHarvestPlan({profileId:'generic-receive-json',experimentId:'rf-baseline',bandId:'licensed-test',mode:'active',method:'wifi-rtt-ranging'},explicitCustomReport);
assert.equal(planWithExperiment.experimentId,'rf-baseline');
assert.ok(Array.isArray(planWithExperiment.expectedObservables));
'''
validator=replace_once(validator,"\nconst source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');",validation_tests+"\nconst source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');",'validation hardening tests')
validator=replace_once(validator,"/regulatoryLimitsEnforced/,/hardwareLimitsEnforced/\n", "/regulatoryLimitsEnforced/,/hardwareLimitsEnforced/,/Live control → state → output board/,/lsl-harvest-experiment/,/prepareDiagnosticSections/,/observationSequence/,/thermalDutyReduced/,/custom active band lacks explicit jurisdiction/\n", 'UI/safety source checks')
VALIDATOR.write_text(validator,encoding='utf-8')

doc=DOC.read_text(encoding='utf-8')
doc += '''\n\n## Full-validation acceptance additions\n\nThe operational UI is deliberately condensed. A single full-width **control → state → output** board is the canonical first-screen status surface. The actual hardware, acquisition, mirrored-experiment, band-harvest and ingest controls are laid out immediately beneath it across the full dialog width. Primary live outputs use the page width in a two-column workspace. Long registries, refinement plans, raw observations, detailed health screening, future research notes and the audit table are retained but collapsed as secondary diagnostics instead of repeating first-screen state down a six-to-seven-viewport page. The ordinary status message is the sole polite live announcement region.\n\nThermal `serious`/`severe` states now enforce lower passive collection duty instead of only displaying a warning, and active bursts are reduced to one sample with an increased minimum interval. Critical/emergency/shutdown states and low-battery-without-external-power remain hard stops.\n\nCustom active bands now fail closed unless the bridge supplies explicit hardware-limit enforcement, regulatory-limit enforcement, jurisdiction/policy scope, legal/regulatory basis, and valid frequency bounds. Platform-managed standards ranging remains permitted through the existing allowlist because frequency/power/channel selection remains controlled by the certified platform/driver rather than exposed by this UI. This application records those declarations but does not itself certify a transmission as lawful in every jurisdiction.\n\nCapture-ledger references use a monotonically increasing `observationSequence`; they do not rely on array positions that shift when the rolling observation buffer trims old samples. Active ranging performed through a selected band harvest is tagged in the same capture ledger, and core active-scan calls record allowed or blocked audit events even when invoked outside the UI.\n'''
DOC.write_text(doc,encoding='utf-8')

print('Applied Live Signals full-validation fixes: UI consolidation, stable recording, thermal enforcement, and stricter regulatory gates.')