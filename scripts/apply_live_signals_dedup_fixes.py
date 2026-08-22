#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LIVE=ROOT/'live-signals-laboratory.js'
VALIDATOR=ROOT/'scripts'/'validate-live-signals-laboratory.mjs'
DOC=ROOT/'docs'/'live-signals-laboratory-mirror-and-safety.md'


def replace_between(text,start,end,replacement,label):
    a=text.find(start)
    if a<0: raise SystemExit(f'{label}: start anchor not found')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'{label}: end anchor not found')
    return text[:a]+replacement+text[b:]


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old,new,1)

live=LIVE.read_text(encoding='utf-8')

preflight=r'''  function renderPreflight() {
    const preflight=safetyPreflight(readHardwareState()),target=panel.querySelector('[data-lsl-preflight]');
    if(preflight.blockers.length) target.innerHTML=`<div class="lsl-safety blocked"><strong>SESSION BLOCKED</strong><span>${esc(preflight.blockers.join('; '))}</span>${preflight.warnings.length?`<small>${esc(preflight.warnings.join('; '))}</small>`:''}</div>`;
    else if(preflight.warnings.length) target.innerHTML=`<p class="lsl-hint"><strong>Safety adjustment:</strong> ${esc(preflight.warnings.join('; '))}</p>`;
    else target.innerHTML='';
    renderControlBoard();
    return preflight;
  }

'''
live=replace_between(live,'  function renderPreflight() {','  function prepareDiagnosticSections() {',preflight,'exception-only preflight feedback')

harvest=r'''  function renderBandHarvestControls() {
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
    const blocked=!preflight.pass?`<div class="lsl-safety blocked"><strong>CONTROL BLOCKED</strong><span>${esc(preflight.blockers.join('; '))}</span></div>`:'';
    const active=control?.active?`<p class="lsl-harvest-live">Harvesting ${esc(control.plan.bandLabel)} for ${esc(control.plan.experimentLabel)} via ${esc(control.bridgeMode)}.</p>`:'';
    target.innerHTML=`${blocked}${active}<p class="lsl-hint">Frequency, transmitter power, modulation and interference controls remain bridge/platform managed or unavailable.</p>`;
    renderControlBoard();
  }

'''
live=replace_between(live,'  function renderBandHarvestControls() {','  function renderAuditLedger() {',harvest,'exception-only harvest feedback')

channels=r'''  function renderChannelCoverage() {
    const target=panel?.querySelector('[data-lsl-channels]'); if(!target)return;
    const session=activeSession||{profileId:panel.querySelector('#lsl-profile')?.value||'android-native',observations:[],polling:readPolling()};
    const coverage=channelCoverage(session),health=channelHealthSnapshot(session);
    const fmtMs=value=>Number.isFinite(value)?value>=1000?`${(value/1000).toFixed(2)} s`:`${value.toFixed(0)} ms`:'—';
    target.innerHTML=`<div class="lsl-channel-grid">${coverage.map(row=>`<article data-status="${esc(row.status)}"><span>${esc(row.label)}</span><strong>${esc(row.status)}</strong><small>${row.samples} samples${row.expected?' · expected':''}</small></article>`).join('')}</div><div class="lsl-section-head"><h3>Channel cadence / freshness</h3><span>arrival streams only · no inferred radio refresh</span></div><div class="lsl-table"><table><thead><tr><th>Channel</th><th>Status</th><th>Samples / streams</th><th>Observed rate</th><th>Median / p95 interval</th><th>Latest receipt age</th><th>Source/modem age</th></tr></thead><tbody>${health.rows.map(row=>`<tr><td>${esc(row.label)}</td><td>${esc(row.status)}</td><td>${row.sampleCount} / ${row.streamCount}</td><td>${row.observedHz===null?'—':row.observedHz.toFixed(2)+' Hz'}</td><td>${fmtMs(row.medianInterArrivalMs)} / ${fmtMs(row.p95InterArrivalMs)}</td><td>${fmtMs(row.latestReceiptAgeMs)}</td><td>${fmtMs(row.medianSourceAgeMs)}</td></tr>`).join('')}</tbody></table></div><p class="lsl-hint">${esc(health.boundary)}</p>`;
  }

'''
live=replace_between(live,'  function renderChannelCoverage() {','  function renderSignalsMirror() {',channels,'channel output deduplication')

active=r'''  function renderActiveScan() {
    const target=panel?.querySelector('[data-lsl-active]'); if(!target)return;
    const report=bridgeCapabilityReport ? normalizeActiveCapabilityReport(bridgeCapabilityReport) : null;
    const methods=report?.activeMethods||[],responders=report?.rangingTargets||[],ranges=activeRangeSummary(activeSession);
    target.innerHTML=`<div class="lsl-active-status"><strong>Available ranging methods</strong><span>${methods.length?methods.map(id=>ACTIVE_SCAN_METHODS[id]?.label||id).join(', '):'none reported by the active device'}</span></div><div class="lsl-metrics"><div><span>Active bursts</span><strong>${ranges.burstCount}</strong></div><div><span>Range samples</span><strong>${ranges.sampleCount}</strong></div><div><span>Positioned ranges</span><strong>${ranges.positionedRangeSamples}</strong></div><div><span>Responders/endpoints</span><strong>${responders.length}</strong></div></div>${Object.keys(ranges.byTechnology).length?`<div class="lsl-table"><table><thead><tr><th>Technology</th><th>Samples</th><th>Median distance</th><th>Range</th></tr></thead><tbody>${Object.entries(ranges.byTechnology).map(([id,row])=>`<tr><td>${esc(id)}</td><td>${row.samples}</td><td>${row.medianDistanceM.toFixed(2)} m</td><td>${row.minimumDistanceM.toFixed(2)}–${row.maximumDistanceM.toFixed(2)} m</td></tr>`).join('')}</tbody></table></div>`:''}`;
    drawActiveRangeMap();
  }

'''
live=replace_between(live,'  function renderActiveScan() {','  function drawActiveRangeMap() {',active,'active output deduplication')

LIVE.write_text(live,encoding='utf-8')

validator=VALIDATOR.read_text(encoding='utf-8')
checks=r'''
assert.doesNotMatch(source,/No native\/router bridge connected/);
assert.doesNotMatch(source,/Active Scan awaiting native\/router bridge/);
assert.doesNotMatch(source,/BAND CONTROL READY/);
assert.match(source,/canonical operational summary/);
'''
validator=replace_once(validator,"assert.doesNotMatch(source,/id=\"lsl-active-authorized\"/);",checks+"assert.doesNotMatch(source,/id=\"lsl-active-authorized\"/);",'duplicate status source assertions')
VALIDATOR.write_text(validator,encoding='utf-8')

doc=DOC.read_text(encoding='utf-8')
doc += '''\n\n### Canonical status rule\n\nFull validation removes residual duplicate readiness/bridge-status summaries from subordinate cards. The top control/state/output board is the canonical steady-state status display. A subordinate control may display only information that requires local action—such as a blocker, thermal adjustment, or an operation that is currently running. Channel and ranging cards report channel/range outputs, not another copy of the device connection state.\n'''
DOC.write_text(doc,encoding='utf-8')

print('Applied duplicate-status consolidation fixes.')