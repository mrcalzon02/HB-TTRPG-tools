#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / 'live-signals-laboratory.js'
CSS = ROOT / 'live-signals-laboratory.css'
ENTRY = ROOT / 'scientific-tools-entry.js'
VALIDATOR = ROOT / 'scripts' / 'validate-live-signals-laboratory.mjs'
WORKFLOW = ROOT / '.github' / 'workflows' / 'scientific-tools-extraction.yml'
DOC = ROOT / 'docs' / 'live-signals-laboratory-mirror-and-safety.md'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


live = LIVE.read_text(encoding='utf-8')
live = replace_once(live, "const VERSION = '0.4.0';", "const VERSION = '0.5.0';", 'version')
live = replace_once(live, "const VERIFIED_AT = '2026-08-11';", "const VERIFIED_AT = '2026-08-21';", 'verified date')
live = replace_once(live, "const CURRENT_MODE = 'passive-default-active-ranging-local-hardware-authorized';", "const CURRENT_MODE = 'signals-mirror-passive-active-band-harvesting-safety-gated';", 'mode')
live = replace_once(live, "  const MAX_ACTIVE_BURST_SECONDS = 30;\n", "  const MAX_ACTIVE_BURST_SECONDS = 30;\n  const MAX_AUDIT_EVENTS = 5000;\n  const MAX_CAPTURE_LEDGER = 12000;\n", 'new limits')

policy_insert = r'''

  const SIGNALS_MIRROR_EXPERIMENT_IDS = freeze([
    'rf-baseline','antenna-tuning','q-bandwidth','impedance-response','material-penetration','aperture-transport',
    'coherent-multipath','secondary-carrier','receiver-interfrequency','source-intermodulation','adaptive-sampling',
    'resolution-limit','heterodyne-inference','range-scenarios'
  ]);

  const LIVE_CONTROL_POLICY = freeze({
    mirrorSource:'SignalsLaboratory.experimentCatalog',
    mirrorSourceRequiredInBrowser:true,
    empiricalDataRemainsDistinctFromSimulation:true,
    failClosed:true,
    passiveReceiveOnly:true,
    activeMethodsAllowlisted:true,
    bridgeDeclaredBandsPreferred:true,
    customActiveBandsRequireHardwareLimitEnforcement:true,
    customActiveBandsRequireRegulatoryLimitEnforcement:true,
    platformManagedStandardsRangingAllowed:true,
    arbitraryFrequencySelection:false,
    arbitraryPowerControl:false,
    interferenceOperationsAllowed:false,
    auditRecordingRequired:true,
    captureLedgerRequired:true,
    note:'Live Signals mirrors the Signals Laboratory experiment register from the same runtime source of truth. Live-only controls select the active device, usable band, passive/active harvest mode and allowlisted detection method. Active operation remains platform/bridge managed and fails closed when hardware or regulatory enforcement is not established.'
  });
'''
live = replace_once(live, "\n\n  const HARDWARE_PROFILES = freeze({", policy_insert + "\n\n  const HARDWARE_PROFILES = freeze({", 'policy insertion')

functions_insert = r'''

  function mirroredExperimentCatalog() {
    const source = root?.SignalsLaboratory;
    const rows = typeof source?.experimentCatalog === 'function' ? source.experimentCatalog() : SIGNALS_MIRROR_EXPERIMENT_IDS.map(id=>({id,label:id.replace(/-/g,' '),category:'signals-mirror',question:'Load SignalsLaboratory in browser for the authoritative experiment definition.',independentVariables:[],controlledVariables:[],observables:[],derivedOutputs:[],assumptions:[]}));
    return freeze(rows.map(row=>freeze({
      id:String(row.id), label:String(row.label || row.id), category:String(row.category || 'signals'),
      question:String(row.question || ''), independentVariables:freeze([...(row.independentVariables||[])]),
      controlledVariables:freeze([...(row.controlledVariables||[])]), observables:freeze([...(row.observables||[])]),
      derivedOutputs:freeze([...(row.derivedOutputs||[])]), assumptions:freeze([...(row.assumptions||[])])
    })));
  }

  function logicalBand(id,label,channelId,modes,activeMethods=[],extra={}) {
    return freeze({
      id,label,channelId,modes:freeze([...modes]),passiveMethods:freeze(modes.includes('passive')?['observe']:[]),
      activeMethods:freeze(activeMethods.filter(method=>ACTIVE_SCAN_METHODS[method])),minHz:null,maxHz:null,
      platformManaged:true,hardwareLimitsEnforced:true,regulatoryLimitsEnforced:true,
      jurisdiction:'platform-managed',legalBasis:'standards/platform-managed operation; no arbitrary RF controls exposed',...extra
    });
  }

  function deviceBandCapabilities(profileId = 'android-native', report = bridgeCapabilityReport || {}) {
    const rawBands = report.bands || report.usableBands || report.radioBands || [];
    if (Array.isArray(rawBands) && rawBands.length) {
      return freeze(rawBands.map((raw,index)=>{
        const activeMethods = [...new Set((raw.activeMethods || raw.methods || []).map(String).filter(id=>ACTIVE_SCAN_METHODS[id]))];
        const passiveMethods = [...new Set((raw.passiveMethods || (raw.passive === false ? [] : ['observe'])).map(String))];
        const modes = [...new Set((raw.modes || [...(passiveMethods.length?['passive']:[]),...(activeMethods.length?['active']:[])]).map(value=>String(value).toLowerCase()).filter(value=>value==='passive'||value==='active'))];
        const minHz = Number.isFinite(Number(raw.minHz)) ? Number(raw.minHz) : null;
        const maxHz = Number.isFinite(Number(raw.maxHz)) ? Number(raw.maxHz) : null;
        const platformManaged = raw.platformManaged === true;
        return freeze({
          id:String(raw.id || raw.bandId || `band-${index+1}`),label:String(raw.label || raw.id || raw.bandId || `Band ${index+1}`),
          channelId:String(raw.channelId || raw.channel || 'unknown'),modes:freeze(modes),passiveMethods:freeze(passiveMethods),activeMethods:freeze(activeMethods),
          minHz,maxHz,platformManaged,
          hardwareLimitsEnforced:platformManaged || raw.hardwareLimitsEnforced === true || report.hardwareLimitsEnforced === true,
          regulatoryLimitsEnforced:platformManaged || raw.regulatoryLimitsEnforced === true || report.regulatoryLimitsEnforced === true,
          jurisdiction:String(raw.jurisdiction || report.jurisdiction || (platformManaged?'platform-managed':'unconfigured')),
          legalBasis:String(raw.legalBasis || report.legalBasis || (platformManaged?'standards/platform-managed operation':'explicit bridge policy required')),
          maxDutyCycle:Number.isFinite(Number(raw.maxDutyCycle))?clamp(Number(raw.maxDutyCycle),0,1):null,
          maxPowerDbm:Number.isFinite(Number(raw.maxPowerDbm))?Number(raw.maxPowerDbm):null,
          note:String(raw.note || '')
        });
      }));
    }
    const profile = HARDWARE_PROFILES[profileId] || HARDWARE_PROFILES['generic-receive-json'];
    const passive = new Set((report.passiveChannels || profile.expectedPassiveChannels || []).map(String));
    const active = new Set((report.activeMethods || profile.activeMethods || []).map(String).filter(id=>ACTIVE_SCAN_METHODS[id]));
    const bands = [];
    if (passive.has('wifi') || active.has('wifi-rtt-ranging')) bands.push(logicalBand('wifi-platform','Wi-Fi · platform-selected channel','wifi',[...(passive.has('wifi')?['passive']:[]),...(active.has('wifi-rtt-ranging')?['active']:[])],[...(active.has('wifi-rtt-ranging')?['wifi-rtt-ranging']:[])]));
    if (passive.has('cellular')) bands.push(logicalBand('cellular-network','Cellular · modem/network-selected band','cellular',['passive']));
    if (passive.has('ble') || active.has('ble-ranging')) bands.push(logicalBand('bluetooth-2.4-platform','Bluetooth / BLE · platform-managed 2.4 GHz','ble',[...(passive.has('ble')?['passive']:[]),...(active.has('ble-ranging')?['active']:[])],[...(active.has('ble-ranging')?['ble-ranging']:[])]));
    if (passive.has('gnss')) bands.push(logicalBand('gnss-receive','GNSS receive bands · receiver-managed','gnss',['passive']));
    if (active.has('uwb-ranging')) bands.push(logicalBand('uwb-platform','UWB · platform-managed ranging channel','ranging',['active'],['uwb-ranging']));
    if (passive.has('router') || active.has('authorized-network-rtt')) bands.push(logicalBand('router-network','Router / selected network telemetry','router',[...(passive.has('router')?['passive']:[]),...(active.has('authorized-network-rtt')?['active']:[])],[...(active.has('authorized-network-rtt')?['authorized-network-rtt']:[])]));
    return freeze(bands);
  }

  function bandHarvestPreflight(input = {}, capabilityReport = bridgeCapabilityReport || {}) {
    const mode = String(input.mode || 'passive').toLowerCase();
    const profileId = String(input.profileId || activeSession?.profileId || 'android-native');
    const bands = deviceBandCapabilities(profileId, capabilityReport);
    const band = bands.find(row=>row.id===String(input.bandId || bands[0]?.id || '')) || null;
    const method = String(input.method || (mode==='active' ? band?.activeMethods?.[0] || '' : 'observe'));
    const base = safetyPreflight({thermalState:input.thermalState,batteryPercent:input.batteryPercent,externalPower:input.externalPower});
    const blockers = [...base.blockers], warnings = [...base.warnings];
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
      const active = activeScanPreflight({...input,method},capabilityReport);
      blockers.push(...active.blockers.filter(reason=>!blockers.includes(reason)));
      warnings.push(...active.warnings.filter(reason=>!warnings.includes(reason)));
    }
    return freeze({
      pass:blockers.length===0,mode,method,band,bands,blockers:freeze(blockers),warnings:freeze(warnings),
      hardwareLimitsEnforced:Boolean(band?.hardwareLimitsEnforced),regulatoryLimitsEnforced:Boolean(band?.regulatoryLimitsEnforced),
      jurisdiction:band?.jurisdiction || 'unconfigured',legalBasis:band?.legalBasis || 'unconfigured',
      arbitraryFrequencySelection:false,arbitraryPowerControl:false,interferenceOperationsAllowed:false
    });
  }

  function buildBandHarvestPlan(input = {}, capabilityReport = bridgeCapabilityReport || {}) {
    const preflight = bandHarvestPreflight(input,capabilityReport);
    if (!preflight.pass) throw new Error(`Band harvest preflight blocked: ${preflight.blockers.join('; ')}`);
    return freeze({
      format:'hb-ttrpg-live-signals-band-harvest-plan',schemaVersion:VERSION,profileId:String(input.profileId || activeSession?.profileId || 'android-native'),
      bandId:preflight.band.id,bandLabel:preflight.band.label,channelId:preflight.band.channelId,mode:preflight.mode,method:preflight.method,
      minHz:preflight.band.minHz,maxHz:preflight.band.maxHz,platformManaged:preflight.band.platformManaged,
      hardwareLimitsEnforced:preflight.hardwareLimitsEnforced,regulatoryLimitsEnforced:preflight.regulatoryLimitsEnforced,
      jurisdiction:preflight.jurisdiction,legalBasis:preflight.legalBasis,maxDutyCycle:preflight.band.maxDutyCycle,maxPowerDbm:preflight.band.maxPowerDbm,
      arbitraryFrequencySelection:false,arbitraryPowerControl:false,interferenceOperationsAllowed:false,
      targetIds:freeze([...(input.targetIds||[]).map(String).filter(Boolean)]),samplesPerTarget:clamp(Math.floor(finite(input.samplesPerTarget,3)),1,MAX_ACTIVE_SAMPLES_PER_TARGET),sampleIntervalMs:Math.max(MIN_ACTIVE_SAMPLE_INTERVAL_MS,finite(input.sampleIntervalMs,1000))
    });
  }

  function recordAuditEvent(session, event = {}) {
    if (!session) return null;
    const row = freeze({timestampUtc:new Date().toISOString(),event:String(event.event || 'state'),status:String(event.status || 'recorded'),deviceId:String(event.deviceId || hardwareBridgeStatus().id),bandId:event.bandId==null?null:String(event.bandId),mode:event.mode==null?null:String(event.mode),method:event.method==null?null:String(event.method),jurisdiction:event.jurisdiction==null?null:String(event.jurisdiction),hardwareLimitsEnforced:event.hardwareLimitsEnforced==null?null:Boolean(event.hardwareLimitsEnforced),regulatoryLimitsEnforced:event.regulatoryLimitsEnforced==null?null:Boolean(event.regulatoryLimitsEnforced),reason:event.reason==null?'':String(event.reason)});
    session.auditLog.push(row);
    if (session.auditLog.length>MAX_AUDIT_EVENTS) session.auditLog.splice(0,session.auditLog.length-MAX_AUDIT_EVENTS);
    return row;
  }

  function observationMatchesBand(observation, band) {
    if (!observation || !band) return false;
    if (band.channelId && band.channelId!=='unknown' && channelIdForObservation(observation)===band.channelId) return true;
    const frequencyHz=observation.signal?.frequencyHz;
    return Number.isFinite(frequencyHz) && Number.isFinite(band.minHz) && Number.isFinite(band.maxHz) && frequencyHz>=band.minHz && frequencyHz<=band.maxHz;
  }

  async function startBandHarvest(session, input = {}, bridge = hardwareBridge) {
    if (!session || session.endedAt) throw new Error('Start a live session before starting band harvesting.');
    if (!bridgeCapabilityReport && bridge) await refreshHardwareBridgeCapabilities();
    let plan;
    try { plan=buildBandHarvestPlan({...input,profileId:session.profileId},bridgeCapabilityReport||{}); }
    catch(error){recordAuditEvent(session,{event:'band-harvest-start',status:'blocked',bandId:input.bandId,mode:input.mode,method:input.method,reason:error.message});throw error;}
    const startedAt=new Date().toISOString();
    let bridgeMode='local-routing-only',activeResult=null;
    if(plan.mode==='passive') {
      if (bridge?.startBandHarvest) { await bridge.startBandHarvest(plan); bridgeMode='bridge-startBandHarvest'; }
      else if (bridge?.configurePassiveHarvest) { await bridge.configurePassiveHarvest(plan); bridgeMode='bridge-configurePassiveHarvest'; }
      session.harvestControl=freeze({active:true,plan,startedAt,bridgeMode});
    } else {
      activeResult=await runActiveScan(session,{method:plan.method,targetIds:plan.targetIds,samplesPerTarget:plan.samplesPerTarget,sampleIntervalMs:plan.sampleIntervalMs,...input},bridge);
      bridgeMode='runActiveScan';
      session.harvestControl=freeze({active:false,plan,startedAt,endedAt:new Date().toISOString(),bridgeMode});
    }
    const record=freeze({startedAt,endedAt:plan.mode==='active'?new Date().toISOString():null,plan,bridgeMode,resultCount:activeResult?.observations?.length||0});
    session.harvestRuns.push(record);
    recordAuditEvent(session,{event:'band-harvest-start',status:'allowed',bandId:plan.bandId,mode:plan.mode,method:plan.method,jurisdiction:plan.jurisdiction,hardwareLimitsEnforced:plan.hardwareLimitsEnforced,regulatoryLimitsEnforced:plan.regulatoryLimitsEnforced,reason:bridgeMode});
    return freeze({record,activeResult});
  }

  async function stopBandHarvest(session, bridge = hardwareBridge) {
    if (!session?.harvestControl?.active) return freeze({stopped:false,reason:'no passive band harvest active'});
    const control=session.harvestControl;
    if (bridge?.stopBandHarvest) await bridge.stopBandHarvest(control.plan);
    else if (bridge?.configurePassiveHarvest) await bridge.configurePassiveHarvest(null);
    const endedAt=new Date().toISOString();
    session.harvestControl=freeze({...control,active:false,endedAt});
    const last=session.harvestRuns[session.harvestRuns.length-1];
    if(last && !last.endedAt) session.harvestRuns[session.harvestRuns.length-1]=freeze({...last,endedAt});
    recordAuditEvent(session,{event:'band-harvest-stop',status:'allowed',bandId:control.plan.bandId,mode:control.plan.mode,method:control.plan.method,jurisdiction:control.plan.jurisdiction,hardwareLimitsEnforced:control.plan.hardwareLimitsEnforced,regulatoryLimitsEnforced:control.plan.regulatoryLimitsEnforced});
    return freeze({stopped:true,endedAt,plan:control.plan});
  }
'''
live = replace_once(live, "  function activeScanMethods() { return freeze(Object.values(ACTIVE_SCAN_METHODS)); }\n", "  function activeScanMethods() { return freeze(Object.values(ACTIVE_SCAN_METHODS)); }\n" + functions_insert, 'functions insertion')

live = replace_once(live,
"      polling, preflight, observations:[], activeBursts:[], notes:[], refinementStage:'capability-inventory', receiverBaseline:null,\n",
"      polling, preflight, observations:[], activeBursts:[], harvestRuns:[], harvestControl:null, auditLog:[], captureLedger:[], notes:[], refinementStage:'capability-inventory', receiverBaseline:null,\n      documentation:freeze({mirrorSource:'SignalsLaboratory.experimentCatalog',safetyPolicy:'LIVE_CONTROL_POLICY',recording:'auditLog + captureLedger + serialized observations',failClosed:true}),\n",
'create session ledgers')

live = replace_once(live,
"    session.observations.push(observation);\n    if (session.observations.length > MAX_OBSERVATIONS) session.observations.splice(0, session.observations.length - MAX_OBSERVATIONS);\n",
"    session.observations.push(observation);\n    if (session.harvestControl?.active && observationMatchesBand(observation,session.harvestControl.plan)) {\n      session.captureLedger.push(freeze({timestampUtc:new Date(observation.timestampMs).toISOString(),observationIndex:session.observations.length-1,bandId:session.harvestControl.plan.bandId,mode:observation.acquisitionMode,method:session.harvestControl.plan.method,deviceId:observation.deviceId,provenance:observation.provenance}));\n      if(session.captureLedger.length>MAX_CAPTURE_LEDGER)session.captureLedger.splice(0,session.captureLedger.length-MAX_CAPTURE_LEDGER);\n    }\n    if (session.observations.length > MAX_OBSERVATIONS) session.observations.splice(0, session.observations.length - MAX_OBSERVATIONS);\n",
'capture ledger')

live = replace_once(live,
"      activeRangeSamples:activeRanges.sampleCount, activeBurstCount:activeRanges.burstCount\n",
"      activeRangeSamples:activeRanges.sampleCount, activeBurstCount:activeRanges.burstCount,\n      harvestRunCount:session?.harvestRuns?.length||0,auditEventCount:session?.auditLog?.length||0,captureLedgerCount:session?.captureLedger?.length||0\n",
'summary ledgers')

live = replace_once(live,
"      futureGatedResearch:FUTURE_GATED_RESEARCH\n",
"      futureGatedResearch:FUTURE_GATED_RESEARCH,\n      signalsLaboratoryMirror:mirroredExperimentCatalog(),deviceBands:deviceBandCapabilities(session.profileId),\n      liveControlPolicy:LIVE_CONTROL_POLICY,auditLog:session.auditLog,captureLedger:session.captureLedger,harvestRuns:session.harvestRuns,harvestControl:session.harvestControl\n",
'serialize live controls')

live = replace_once(live,
"      synchronizedTimeline:activeSession?synchronizedTimeline(activeSession):null\n",
"      synchronizedTimeline:activeSession?synchronizedTimeline(activeSession):null,\n      signalsLaboratoryMirror:mirroredExperimentCatalog(),deviceBands:deviceBandCapabilities(activeSession?.profileId||'android-native'),liveControlPolicy:LIVE_CONTROL_POLICY\n",
'runtime mirror state')

render_insert = r'''

  function renderSignalsMirror() {
    const target=panel?.querySelector('[data-lsl-mirror]'); if(!target)return;
    const rows=mirroredExperimentCatalog();
    target.innerHTML=`<div class="lsl-profile-note"><strong>Shared Signals Laboratory source</strong><span>${esc(root?.SignalsLaboratory?.constants?.VERSION||'fallback registry')} · ${rows.length} experiment families</span></div><p class="lsl-hint">The Live Signals Laboratory uses the same experiment register as Signals Laboratory. Simulation/model output remains separate from empirical capture; the live-only difference is device/band harvesting and its safety, legality and recording controls.</p><div class="lsl-mirror-grid">${rows.map(row=>`<article><strong>${esc(row.label)}</strong><span>${esc(row.category)}</span><p>${esc(row.question)}</p></article>`).join('')}</div>`;
  }

  function selectedHarvestInput() {
    const mode=panel?.querySelector('#lsl-harvest-mode')?.value||'passive';
    const method=panel?.querySelector('#lsl-harvest-method')?.value||(mode==='passive'?'observe':'');
    return {mode,bandId:panel?.querySelector('#lsl-harvest-band')?.value||'',method,targetIds:String(panel?.querySelector('#lsl-active-targets')?.value||'').split(',').map(value=>value.trim()).filter(Boolean),samplesPerTarget:finite(panel?.querySelector('#lsl-active-samples')?.value,3),sampleIntervalMs:finite(panel?.querySelector('#lsl-active-interval')?.value,1000),...readHardwareState()};
  }

  function renderBandHarvestControls() {
    const target=panel?.querySelector('[data-lsl-harvest-state]'); if(!target)return;
    const profileId=panel.querySelector('#lsl-profile')?.value||activeSession?.profileId||'android-native';
    const bands=deviceBandCapabilities(profileId,bridgeCapabilityReport||{}),bandSelect=panel.querySelector('#lsl-harvest-band'),modeSelect=panel.querySelector('#lsl-harvest-mode'),methodSelect=panel.querySelector('#lsl-harvest-method');
    const priorBand=bandSelect?.value;
    if(bandSelect){bandSelect.innerHTML=bands.map(row=>`<option value="${esc(row.id)}">${esc(row.label)}</option>`).join('')||'<option value="">No usable bands reported</option>';if(priorBand&&bands.some(row=>row.id===priorBand))bandSelect.value=priorBand;}
    const mode=modeSelect?.value||'passive',band=bands.find(row=>row.id===bandSelect?.value)||bands[0]||null;
    if(band && !band.modes.includes(mode) && modeSelect){modeSelect.value=band.modes[0]||'passive';}
    const effectiveMode=modeSelect?.value||'passive';
    const methods=effectiveMode==='passive'?['observe']:(band?.activeMethods||[]);
    if(methodSelect)methodSelect.innerHTML=methods.map(id=>`<option value="${esc(id)}">${esc(id==='observe'?'Receive / observe':ACTIVE_SCAN_METHODS[id]?.label||id)}</option>`).join('')||'<option value="">No active method for this band</option>';
    const preflight=bandHarvestPreflight({...selectedHarvestInput(),profileId},bridgeCapabilityReport||{});
    const control=activeSession?.harvestControl;
    target.innerHTML=`<div class="lsl-safety ${preflight.pass?'pass':'blocked'}"><strong>${preflight.pass?'BAND CONTROL READY':'BAND CONTROL BLOCKED'}</strong><span>${preflight.pass?`${esc(preflight.band?.label||'band')} · ${esc(preflight.mode)} · ${esc(preflight.method)}`:esc(preflight.blockers.join('; '))}</span></div><div class="lsl-metrics"><div><span>Device</span><strong>${esc(hardwareBridgeStatus().id)}</strong></div><div><span>Jurisdiction/policy</span><strong>${esc(preflight.jurisdiction)}</strong></div><div><span>Hardware limits</span><strong>${preflight.hardwareLimitsEnforced?'enforced':'not established'}</strong></div><div><span>Regulatory limits</span><strong>${preflight.regulatoryLimitsEnforced?'enforced':'not established'}</strong></div><div><span>Frequency control</span><strong>bridge/platform only</strong></div><div><span>Power control</span><strong>not exposed</strong></div></div>${control?.active?`<p class="lsl-harvest-live">Harvesting ${esc(control.plan.bandLabel)} in ${esc(control.plan.mode)} mode via ${esc(control.bridgeMode)}.</p>`:''}<p class="lsl-hint">${esc(preflight.legalBasis)}. Interference, arbitrary frequency selection, power mutation and radio reconfiguration remain unavailable.</p>`;
  }

  function renderAuditLedger() {
    const target=panel?.querySelector('[data-lsl-audit]');if(!target)return;
    const rows=(activeSession?.auditLog||[]).slice(-40).reverse();
    target.innerHTML=`<div class="lsl-metrics"><div><span>Audit events</span><strong>${activeSession?.auditLog?.length||0}</strong></div><div><span>Harvest runs</span><strong>${activeSession?.harvestRuns?.length||0}</strong></div><div><span>Harvest-tagged captures</span><strong>${activeSession?.captureLedger?.length||0}</strong></div></div><div class="lsl-table"><table><thead><tr><th>Time</th><th>Event</th><th>Status</th><th>Band</th><th>Mode / method</th><th>Policy</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.timestampUtc)}</td><td>${esc(row.event)}</td><td>${esc(row.status)}</td><td>${esc(row.bandId||'—')}</td><td>${esc([row.mode,row.method].filter(Boolean).join(' / ')||'—')}</td><td>${esc(row.reason||row.jurisdiction||'—')}</td></tr>`).join('')||'<tr><td colspan="6">No control events recorded yet.</td></tr>'}</tbody></table></div>`;
  }
'''
live = replace_once(live, "\n  function renderActiveScan() {", render_insert + "\n\n  function renderActiveScan() {", 'render functions')

control_card = r'''<section class="lsl-card lsl-harvest-card"><h3>Live band harvesting controls</h3><p>Band choices are generated from the active bridge/device. Passive mode remains receive-only. Active mode exposes only the standards-supported ranging methods reported for that band; frequency, power, modulation and interference controls are intentionally absent.</p><label>Harvest mode<select id="lsl-harvest-mode"><option value="passive">Passive · receive/observe</option><option value="active">Active · allowlisted ranging</option></select></label><label>Usable device band<select id="lsl-harvest-band"></select></label><label>Detection / harvest method<select id="lsl-harvest-method"></select></label><button class="lsl-primary" data-lsl-harvest-start>Start selected band harvest</button><button class="lsl-secondary" data-lsl-harvest-stop>Stop passive band harvest</button><div data-lsl-harvest-state></div></section>'''
live = replace_once(live, '<section class="lsl-card"><h3>Bridge observation ingest</h3>', control_card + '<section class="lsl-card"><h3>Bridge observation ingest</h3>', 'control card')

workspace_card = r'''<section class="lsl-card lsl-mirror-card"><div class="lsl-section-head"><h3>Signals Laboratory mirror</h3><span>shared experiment register · empirical/live counterpart</span></div><div data-lsl-mirror></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Documentation / safety / legality audit ledger</h3><span>allowed + blocked control actions are recorded</span></div><div data-lsl-audit></div></section>'''
live = replace_once(live, '<section class="lsl-card lsl-channel-card">', workspace_card + '<section class="lsl-card lsl-channel-card">', 'workspace mirror cards')

live = replace_once(live,
"    panel.querySelector('#lsl-profile')?.addEventListener('change',renderCapabilityMatrix);\n",
"    panel.querySelector('#lsl-profile')?.addEventListener('change',()=>{renderCapabilityMatrix();renderBandHarvestControls();});\n    for(const id of ['#lsl-harvest-mode','#lsl-harvest-band','#lsl-harvest-method'])panel.querySelector(id)?.addEventListener('change',renderBandHarvestControls);\n",
'profile/mode listeners')

harvest_handlers = r'''
    panel.querySelector('[data-lsl-harvest-start]')?.addEventListener('click',async()=>{try{if(!activeSession)throw new Error('Start Passive Scan first so harvesting has an auditable live session.');if(!hardwareBridge){const embedded=root.LiveSignalsHardwareBridge||root.AndroidLiveSignalsBridge||null;if(embedded)registerHardwareBridge(embedded);}if(!hardwareBridge)throw new Error('Band harvesting requires a connected native/router hardware bridge.');await refreshHardwareBridgeCapabilities();const result=await startBandHarvest(activeSession,selectedHarvestInput(),hardwareBridge);renderSession();renderBandHarvestControls();renderAuditLedger();setStatus(`Band harvest accepted: ${result.record.plan.bandLabel} · ${result.record.plan.mode}.`,'success');}catch(error){renderBandHarvestControls();renderAuditLedger();setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-harvest-stop]')?.addEventListener('click',async()=>{try{if(!activeSession)throw new Error('No live session is active.');const result=await stopBandHarvest(activeSession,hardwareBridge);renderSession();renderBandHarvestControls();renderAuditLedger();setStatus(result.stopped?'Passive band harvest stopped and recorded.':result.reason,'success');}catch(error){renderAuditLedger();setStatus(error.message,'error');}});
'''
live = replace_once(live, "    panel.querySelector('[data-lsl-stop]')?.addEventListener('click',async()=>{", harvest_handlers + "    panel.querySelector('[data-lsl-stop]')?.addEventListener('click',async()=>{", 'harvest handlers')

live = replace_once(live,
"    renderCapabilityMatrix();renderPreflight();renderFutureResearch();renderSession();if(hardwareBridge)refreshHardwareBridgeCapabilities().then(()=>renderSession()).catch(()=>{});return panel;\n",
"    renderCapabilityMatrix();renderPreflight();renderFutureResearch();renderSignalsMirror();renderSession();renderBandHarvestControls();renderAuditLedger();if(hardwareBridge)refreshHardwareBridgeCapabilities().then(()=>{renderSession();renderBandHarvestControls();}).catch(()=>{});return panel;\n",
'initial rendering')

live = replace_once(live,
"  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('lsl-open');if(options.profileId&&HARDWARE_PROFILES[options.profileId]){target.querySelector('#lsl-profile').value=options.profileId;renderCapabilityMatrix();}renderPreflight();renderFutureResearch();renderSession();return target; }\n",
"  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('lsl-open');if(options.profileId&&HARDWARE_PROFILES[options.profileId]){target.querySelector('#lsl-profile').value=options.profileId;renderCapabilityMatrix();}renderPreflight();renderFutureResearch();renderSignalsMirror();renderSession();renderBandHarvestControls();renderAuditLedger();return target; }\n",
'open render')

live = replace_once(live,
"    activeScanMethods, activeScanPreflight, buildActiveScanPlan, runActiveScan, registerHardwareBridge, unregisterHardwareBridge, hardwareBridgeStatus, refreshHardwareBridgeCapabilities,\n",
"    activeScanMethods, activeScanPreflight, buildActiveScanPlan, runActiveScan, registerHardwareBridge, unregisterHardwareBridge, hardwareBridgeStatus, refreshHardwareBridgeCapabilities,\n    mirroredExperimentCatalog, deviceBandCapabilities, bandHarvestPreflight, buildBandHarvestPlan, startBandHarvest, stopBandHarvest, recordAuditEvent,\n",
'API exports')

live = replace_once(live,
"MAX_ACTIVE_BURST_SECONDS,ACTIVE_SCAN_POLICY,SAFETY_POLICY,RECEIVER_HEALTH_THRESHOLDS})\n",
"MAX_ACTIVE_BURST_SECONDS,MAX_AUDIT_EVENTS,MAX_CAPTURE_LEDGER,ACTIVE_SCAN_POLICY,SAFETY_POLICY,LIVE_CONTROL_POLICY,SIGNALS_MIRROR_EXPERIMENT_IDS,RECEIVER_HEALTH_THRESHOLDS})\n",
'constant exports')

LIVE.write_text(live,encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
if 'lsl-mirror-grid' not in css:
    css += r'''

/* Signals Laboratory mirror + live band-harvesting controls */
.lsl-mirror-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:12px}
.lsl-mirror-grid article{border:1px solid rgba(130,180,210,.18);border-radius:12px;padding:10px;background:rgba(255,255,255,.025)}
.lsl-mirror-grid article strong,.lsl-mirror-grid article span{display:block}.lsl-mirror-grid article span{color:#8fb7cc;font-size:.78rem;margin-top:3px}.lsl-mirror-grid article p{margin:.5rem 0 0;color:#9eabb5;font-size:.84rem;line-height:1.4}
.lsl-harvest-card{border-color:rgba(114,213,255,.32)}.lsl-harvest-live{padding:9px 11px;border-left:3px solid #72d5ff;background:rgba(114,213,255,.08)}
'''
CSS.write_text(css,encoding='utf-8')

entry = ENTRY.read_text(encoding='utf-8')
entry = replace_once(entry,
"    liveSignalsLaboratoryPromise = (async () => {\n      await loadCooperativeRunner();\n      await loadStyle('live-signals-laboratory.css');\n",
"    liveSignalsLaboratoryPromise = (async () => {\n      await Promise.all([loadCooperativeRunner(), loadSignalsLaboratory()]);\n      await loadStyle('live-signals-laboratory.css');\n",
'load shared Signals Laboratory first')
ENTRY.write_text(entry,encoding='utf-8')

validator = VALIDATOR.read_text(encoding='utf-8')
validator = replace_once(validator,"assert.equal(Lab.constants.VERSION,'0.4.0');","assert.equal(Lab.constants.VERSION,'0.5.0');",'validator version')
validator = replace_once(validator,"assert.equal(Lab.constants.CURRENT_MODE,'passive-default-active-ranging-local-hardware-authorized');","assert.equal(Lab.constants.CURRENT_MODE,'signals-mirror-passive-active-band-harvesting-safety-gated');",'validator mode')
validator = replace_once(validator,"schemaVersion:'0.4.0'","schemaVersion:'0.5.0'",'receipt version')
extra_tests = r'''

assert.equal(Lab.constants.LIVE_CONTROL_POLICY.failClosed,true);
assert.equal(Lab.constants.LIVE_CONTROL_POLICY.passiveReceiveOnly,true);
assert.equal(Lab.constants.LIVE_CONTROL_POLICY.arbitraryFrequencySelection,false);
assert.equal(Lab.constants.LIVE_CONTROL_POLICY.arbitraryPowerControl,false);
assert.equal(Lab.constants.LIVE_CONTROL_POLICY.interferenceOperationsAllowed,false);
assert.equal(Lab.mirroredExperimentCatalog().length,Lab.constants.SIGNALS_MIRROR_EXPERIMENT_IDS.length);
const fallbackBands=Lab.deviceBandCapabilities('android-native',{passiveChannels:['wifi','cellular','ble','gnss'],activeMethods:['wifi-rtt-ranging','ble-ranging','uwb-ranging'],rangingTargets:[{id:'rtt',methods:['wifi-rtt-ranging'],participating:true,responderCapable:true}]});
assert.ok(fallbackBands.some(row=>row.id==='wifi-platform'&&row.modes.includes('passive')&&row.modes.includes('active')));
assert.ok(fallbackBands.some(row=>row.id==='cellular-network'&&row.modes.includes('passive')&&!row.modes.includes('active')));
const passiveHarvest=Lab.bandHarvestPreflight({profileId:'android-native',bandId:'wifi-platform',mode:'passive',method:'observe',thermalState:'nominal',batteryPercent:80},{passiveChannels:['wifi'],activeMethods:[]});
assert.equal(passiveHarvest.pass,true);
const customBlocked=Lab.bandHarvestPreflight({profileId:'generic-receive-json',bandId:'custom-band',mode:'active',method:'wifi-rtt-ranging',thermalState:'nominal',batteryPercent:80},{activeMethods:['wifi-rtt-ranging'],rangingTargets:[{id:'peer',methods:['wifi-rtt-ranging'],participating:true,responderCapable:true}],bands:[{id:'custom-band',label:'Custom',modes:['active'],activeMethods:['wifi-rtt-ranging'],platformManaged:false}]});
assert.equal(customBlocked.pass,false);
assert.ok(customBlocked.blockers.some(reason=>reason.includes('hardware-limit enforcement')));
assert.ok(customBlocked.blockers.some(reason=>reason.includes('regulatory-limit enforcement')));
'''
validator = replace_once(validator,"\nconst source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');",extra_tests+"\nconst source=await readFile(new URL('../live-signals-laboratory.js',import.meta.url),'utf8');",'validator new tests')
validator = replace_once(validator,
"  /no interpolation or gap filling/i\n",
"  /no interpolation or gap filling/i,/Signals Laboratory mirror/,/Live band harvesting controls/,/Documentation \/ safety \/ legality audit ledger/,/bandHarvestPreflight/,/buildBandHarvestPlan/,/startBandHarvest/,/regulatoryLimitsEnforced/,/hardwareLimitsEnforced/\n",
'validator source patterns')
validator = replace_once(validator,
"  activeRangeMappingContract:true,receiverHealthPreserved:true\n",
"  activeRangeMappingContract:true,receiverHealthPreserved:true,signalsLaboratoryMirror:true,deviceBandControls:true,\n  failClosedHardwareAndRegulatoryGates:true,auditAndCaptureLedger:true,noArbitraryFrequencyOrPowerControls:true\n",
'validator receipt fields')
VALIDATOR.write_text(validator,encoding='utf-8')

workflow = WORKFLOW.read_text(encoding='utf-8')
if 'docs/live-signals-laboratory-mirror-and-safety.md' not in workflow:
    workflow = replace_once(workflow,
"      - \"live-signals-laboratory.css\"\n",
"      - \"live-signals-laboratory.css\"\n      - \"docs/live-signals-laboratory-mirror-and-safety.md\"\n",
'workflow doc path')
WORKFLOW.write_text(workflow,encoding='utf-8')

DOC.parent.mkdir(parents=True,exist_ok=True)
DOC.write_text('''# Live Signals Laboratory mirror, safety, legality, and recording contract\n\n## Authoritative mirror contract\n\nThe **Signals Laboratory** remains the authoritative simulation/model surface and experiment registry. The **Live Signals Laboratory** is its empirical counterpart. Browser loading now ensures `SignalsLaboratory` is present before `LiveSignalsLaboratory`, and the live interface consumes `SignalsLaboratory.experimentCatalog()` rather than maintaining an independent experiment taxonomy. If the simulation catalog gains or renames experiment families, the live mirror is expected to follow the same source of truth.\n\nThe evidence classes remain intentionally different: Signals Laboratory produces model/simulation output; Live Signals Laboratory records empirical platform or bridge telemetry. Mirroring does not allow measured and modeled evidence to be silently conflated.\n\n## Live-only device and band controls\n\nLive Signals adds controls for the active hardware bridge/device, its reported usable radio bands, acquisition mode, and detection/harvest method. Passive mode is always receive/observe only. Active mode exposes only existing allowlisted standards/platform-supported ranging methods such as Wi-Fi RTT, UWB ranging, Bluetooth ranging/channel sounding when supported, and selected authorized network RTT context.\n\nThe preferred bridge capability contract is a `bands`/`usableBands`/`radioBands` array. Each custom active band should identify its modes and active methods and must establish both `hardwareLimitsEnforced` and `regulatoryLimitsEnforced`. Optional descriptive fields include `minHz`, `maxHz`, `maxDutyCycle`, `maxPowerDbm`, `jurisdiction`, and `legalBasis`. These fields describe bridge-enforced limits; the Live Signals UI does **not** expose arbitrary frequency, transmitter-power, modulation, antenna-chain, or channel mutation controls. Where mobile/router platform APIs manage the active ranging radio automatically, the band is marked platform-managed.\n\n## Fail-closed safety and legality gate\n\nA band-harvest action is permitted only when all relevant gates pass: the selected device reports the band/mode/method, the ordinary thermal and battery preflight passes, the active method is allowlisted, a participating responder/endpoint is available where active ranging requires one, and a non-platform-managed active band explicitly establishes hardware-limit and regulatory-limit enforcement. Missing enforcement metadata blocks the custom active operation rather than downgrading it to a warning.\n\nExisting prohibited operations remain prohibited: arbitrary transmitter power/channel/bandwidth/modulation mutation, packet injection, deauthentication, continuous transmission, beacon spam, frequency-sweep transmission, pulse transmission, subnet or broadcast-ping sweeps, and other interference-oriented or radio-reconfiguration operations. The live controls therefore cannot be used as a generic transmitter, jammer, or regulatory-bypass surface.\n\n## Hardware protection\n\nThermal stop states and battery guards continue to stop acquisition. Serious/severe thermal states request reduced duty. For custom active bands, the bridge must affirm that hardware limits are enforced before Live Signals will accept the plan. Device-specific power, duty-cycle, temperature, current, cooldown, and band-edge enforcement belongs in the hardware bridge/driver, where the true device limits are known; Live Signals records the declared limits and enforcement status but does not invent universal safe RF values.\n\n## Documentation, recording, and auditability\n\nEvery live session now carries:\n\n- `harvestRuns`: accepted passive/active band-harvest plans and bridge execution mode.\n- `auditLog`: allowed and blocked live-control events with device, band, mode, method, jurisdiction/policy state, and enforcement state.\n- `captureLedger`: observations associated with an active passive-band harvest, referenced by observation index and provenance without duplicating raw identifiers.\n- `documentation`: the mirror/safety/recording contract embedded in the session record.\n\n`serializeSession()` includes these records together with the shared Signals Laboratory experiment mirror, current device-band capabilities, safety policy, channel health, synchronized timeline, active ranging results, and the underlying observations. Privacy redaction remains enabled by default.\n\n## Bridge implementation rule\n\nA hardware bridge may implement `startBandHarvest(plan)` / `stopBandHarvest(plan)` for direct passive band collection control or `configurePassiveHarvest(plan|null)` for receiver routing/filtering. If neither exists, the Live Signals session can still retain a local band-routing selection but explicitly records that the bridge did not provide direct passive band control. Active mode continues through the existing `runActiveScan(plan)` bridge contract.\n\nNo bridge may reinterpret the absence of a Live Signals UI control as authorization to perform a prohibited radio mutation. Safety and regulatory enforcement must exist below the UI as well as in it.\n''',encoding='utf-8')

print('Applied Live Signals Laboratory mirror + safety/legal/audit migration.')
