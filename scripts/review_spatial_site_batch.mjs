#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const batchId = process.env.BATCH_ID || '2026-08-22-purpose-aware-variety-01';
const baseDir = path.join('artifacts', 'spatial-site-batch', batchId);
const manifest = JSON.parse(fs.readFileSync(path.join(baseDir, 'manifest.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(baseDir, 'summary.json'), 'utf8'));

const safeDiv = (a, b) => b ? a / b : 0;
const round = (n, digits = 3) => Number(Number(n || 0).toFixed(digits));
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const median = values => {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const mad = values => {
  const med = median(values);
  return median(values.map(v => Math.abs(v - med)));
};
const pctDelta = (a, b) => b ? ((a - b) / Math.abs(b)) * 100 : (a ? 100 : 0);

const successionEcology = new Set(['fungal', 'overgrown', 'invasive', 'plague', 'undead', 'aberrant', 'insectile', 'wetland', 'subterranean']);
const disruptiveOccupancy = new Set(['long-abandoned', 'recently-abandoned', 'reclaimed', 'repurposed', 'occupied', 'partially-collapsed', 'partially-flooded', 'burned', 'frozen', 'haunted', 'quarantined', 'evacuated', 'overcrowded']);
const disruptiveControllers = new Set(['bandits', 'outlaws', 'pirates', 'criminal-syndicate', 'cult', 'necromancers', 'occupation-force', 'rebels', 'refugees', 'salvagers', 'goblin-clan', 'kobold-warren', 'orc-warband', 'escaped-prisoners', 'plague-survivors', 'abandoned']);
const highSecrets = new Set(['high', 'very-high', 'labyrinthine']);

function historyPressure(input) {
  let p = 0;
  if (disruptiveControllers.has(input.currentController)) p++;
  if (disruptiveOccupancy.has(input.occupancyState)) p++;
  if (successionEcology.has(input.ecology)) p++;
  if (['damaged', 'heavily-damaged', 'ruin', 'partial-collapse', 'unstable', 'weathered', 'salvaged', 'patched'].includes(input.condition)) p++;
  if (['poor', 'failing', 'abandoned', 'jury-rigged'].includes(input.maintenance)) p++;
  return p;
}

function normalizedMetrics(artifact) {
  const m = artifact.metrics || {};
  const rooms = Math.max(1, Number(m.rooms) || 0);
  return {
    interactionsPerRoom: safeDiv(m.interactions, rooms),
    adaptedRoleRatio: safeDiv(m.historicallyAdaptedRoleTemplates, rooms),
    currentUseRatio: safeDiv(m.currentUseRoleTemplates, rooms),
    overlayRatio: safeDiv(m.currentUseOverlayRoleTemplates, rooms),
    hazardsPerRoom: safeDiv(m.hazards, rooms),
    occupantsPerRoom: safeDiv(m.occupants, rooms),
    socialPerRoom: safeDiv(m.socialEncounters, rooms),
    trapsPerRoom: safeDiv(m.traps, rooms),
    securityPerRoom: safeDiv(m.securityEntries, rooms),
    treasurePerRoom: safeDiv(m.treasureEntries, rooms),
    evidencePerRoom: safeDiv(m.evidenceEntries, rooms),
    objectivesPerRoom: safeDiv(m.objectives, rooms),
    narrativePerRoom: safeDiv(m.narrativeDiscoveries, rooms),
    secretAccessPerRoom: safeDiv(m.secretAccessEntries, rooms),
    corridorsPerRoom: safeDiv(m.corridors, rooms),
    doorsPerRoom: safeDiv(m.doors, rooms),
    connectorsPerRoom: safeDiv(m.connectors, rooms),
    connectorsPerDeck: safeDiv(m.connectors, Math.max(1, Number(m.decks) || 1)),
    profileLayers: Number(m.profileLayers) || 0,
  };
}

function pushFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence });
}

function baseFindings(artifact, n) {
  const findings = [];
  const input = artifact.input || {};
  const m = artifact.metrics || {};
  const pressure = historyPressure(input);

  if (!artifact.acceptance?.deterministic) pushFinding(findings, 'critical', 'non-deterministic', 'Identical seed/input did not reproduce the same artifact.');
  if (!artifact.acceptance?.topologyValid) pushFinding(findings, 'critical', 'invalid-topology', 'Shared spatial engine validation failed.', { errors: artifact.validation?.errors || [] });
  if (pressure >= 2 && m.interactions === 0) pushFinding(findings, 'high', 'history-without-interactions', 'Multiple historical/environmental pressures resolved without any cross-layer interaction.', { pressure });
  else if (pressure >= 3 && m.interactions < 2) pushFinding(findings, 'medium', 'thin-history-interactions', 'High historical pressure produced fewer than two explicit interactions.', { pressure, interactions: m.interactions });

  if (pressure >= 3 && n.adaptedRoleRatio < 0.08) pushFinding(findings, 'medium', 'thin-adaptation-coverage', 'High historical pressure affected very little of the inherited room program.', { pressure, adaptedRoleRatio: round(n.adaptedRoleRatio) });
  if ((Number(input.hazardIntensity) || 0) >= 8 && n.hazardsPerRoom < 0.75) pushFinding(findings, 'medium', 'hazard-under-delivery', 'High requested hazard intensity produced sparse hazards.', { hazardIntensity: input.hazardIntensity, hazardsPerRoom: round(n.hazardsPerRoom) });
  if (n.hazardsPerRoom > 5) pushFinding(findings, 'high', 'hazard-saturation', 'Hazards exceed five entries per room and may overwhelm room purpose.', { hazardsPerRoom: round(n.hazardsPerRoom) });
  else if (n.hazardsPerRoom > 3.5) pushFinding(findings, 'medium', 'high-hazard-density', 'Hazard population is unusually dense relative to room count.', { hazardsPerRoom: round(n.hazardsPerRoom) });

  if ((Number(input.creatureDensity) || 0) >= 8 && n.occupantsPerRoom < 0.25) pushFinding(findings, 'medium', 'creature-under-delivery', 'High creature density produced few populated occupants.', { creatureDensity: input.creatureDensity, occupantsPerRoom: round(n.occupantsPerRoom) });
  if ((Number(input.creatureDensity) || 0) <= 3 && n.occupantsPerRoom > 1.5) pushFinding(findings, 'medium', 'creature-over-delivery', 'Low creature density produced dense occupants.', { creatureDensity: input.creatureDensity, occupantsPerRoom: round(n.occupantsPerRoom) });

  if (highSecrets.has(input.secretDensity) && n.secretAccessPerRoom < 0.1) pushFinding(findings, 'medium', 'secret-density-under-delivery', 'High requested secret density produced little secret access.', { secretDensity: input.secretDensity, secretAccessPerRoom: round(n.secretAccessPerRoom) });
  if (m.narrativeDiscoveries === 0 && (m.evidenceEntries > 0 || m.objectives > 0)) pushFinding(findings, 'low', 'narrative-discovery-thin', 'The site contains evidence/objectives but no narrative discoveries.', { evidenceEntries: m.evidenceEntries, objectives: m.objectives });
  if (n.connectorsPerRoom > 5) pushFinding(findings, 'high', 'connector-saturation', 'Inter-deck connector count exceeds five per room; inspect whether connector semantics are being over-instantiated.', { connectorsPerRoom: round(n.connectorsPerRoom), connectorsPerDeck: round(n.connectorsPerDeck) });
  else if (n.connectorsPerRoom > 3) pushFinding(findings, 'medium', 'high-connector-density', 'Inter-deck connector count is high relative to room count.', { connectorsPerRoom: round(n.connectorsPerRoom), connectorsPerDeck: round(n.connectorsPerDeck) });

  return { findings, pressure };
}

function collectStrings(artifact, key) {
  const out = [];
  const rooms = artifact.result?.content?.rooms || [];
  for (const room of rooms) {
    const values = Array.isArray(room?.[key]) ? room[key] : [];
    for (const value of values) if (typeof value === 'string' && value.trim()) out.push(value.trim());
  }
  return out;
}

function repetitionStats(entries) {
  const counts = new Map();
  for (const value of entries) counts.set(value, (counts.get(value) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    totalEntries: entries.length,
    uniqueEntries: counts.size,
    uniquenessRatio: round(safeDiv(counts.size, entries.length)),
    topExactStrings: ranked.slice(0, 10).map(([text, count]) => ({ text, count, share: round(safeDiv(count, entries.length)) })),
  };
}

const cases = manifest.cases.map(entry => {
  const artifact = JSON.parse(fs.readFileSync(path.join(baseDir, entry.file), 'utf8'));
  const normalized = normalizedMetrics(artifact);
  const { findings, pressure } = baseFindings(artifact, normalized);
  return { entry, artifact, normalized, findings, pressure };
});

const curated = cases.filter(c => c.entry.caseKind === 'curated');
const random = cases.filter(c => c.entry.caseKind === 'seeded-random');
const metricKeys = Object.keys(cases[0].normalized);
const baselines = {};
for (const key of metricKeys) {
  const values = curated.map(c => c.normalized[key]);
  baselines[key] = { mean: mean(values), median: median(values), mad: mad(values) };
}

for (const c of random) {
  for (const key of ['interactionsPerRoom', 'adaptedRoleRatio', 'hazardsPerRoom', 'occupantsPerRoom', 'narrativePerRoom', 'secretAccessPerRoom', 'corridorsPerRoom', 'connectorsPerRoom']) {
    const b = baselines[key];
    const value = c.normalized[key];
    const spread = Math.max(b.mad * 3, Math.abs(b.median) * 0.75, 0.15);
    if (Math.abs(value - b.median) > spread) {
      pushFinding(c.findings, 'low', `curated-outlier-${key}`, `Seeded-random result is a strong outlier from the curated median for ${key}.`, { value: round(value), curatedMedian: round(b.median), curatedMad: round(b.mad) });
    }
  }
}

const severityWeight = { critical: 40, high: 15, medium: 7, low: 3 };
for (const c of cases) {
  const penalty = c.findings.reduce((sum, f) => sum + severityWeight[f.severity], 0);
  c.reviewScore = Math.max(0, 100 - penalty);
  c.reviewBand = c.reviewScore >= 90 ? 'healthy' : c.reviewScore >= 75 ? 'review' : c.reviewScore >= 60 ? 'attention' : 'investigate';
}

function groupStats(group) {
  const score = group.map(c => c.reviewScore);
  const metrics = {};
  for (const key of metricKeys) metrics[key] = round(mean(group.map(c => c.normalized[key])));
  return {
    count: group.length,
    reviewScoreMean: round(mean(score), 1),
    reviewScoreMedian: round(median(score), 1),
    findingCounts: group.reduce((acc, c) => {
      for (const f of c.findings) acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 }),
    metrics,
  };
}

const curatedStats = groupStats(curated);
const randomStats = groupStats(random);
const comparison = {};
for (const key of metricKeys) comparison[key] = {
  curatedMean: curatedStats.metrics[key],
  randomMean: randomStats.metrics[key],
  deltaPercent: round(pctDelta(randomStats.metrics[key], curatedStats.metrics[key]), 1),
};

const repeated = {
  hazards: repetitionStats(cases.flatMap(c => collectStrings(c.artifact, 'hazards'))),
  occupants: repetitionStats(cases.flatMap(c => collectStrings(c.artifact, 'occupants'))),
  narrativeDiscoveries: repetitionStats(cases.flatMap(c => collectStrings(c.artifact, 'narrativeDiscoveries'))),
};

const findingsByCode = new Map();
for (const c of cases) for (const f of c.findings) {
  const key = f.code;
  const current = findingsByCode.get(key) || { code: key, severity: f.severity, cases: [] };
  current.cases.push(c.entry.caseId);
  findingsByCode.set(key, current);
}
const patternFindings = [...findingsByCode.values()].sort((a, b) => b.cases.length - a.cases.length || a.code.localeCompare(b.code));

const recommendations = [];
const byCode = code => patternFindings.find(x => x.code === code)?.cases.length || 0;
if (byCode('history-without-interactions') || byCode('thin-history-interactions')) recommendations.push({ priority: 'high', area: 'historical interaction matrix', reason: `${byCode('history-without-interactions') + byCode('thin-history-interactions')} cases show strong historical pressure with little or no explicit adaptation.`, action: 'Add interaction rules for the specific controller/archetype/ecology combinations listed by the flagged cases; do not add generic random rooms.' });
if (byCode('connector-saturation') || byCode('high-connector-density')) recommendations.push({ priority: 'high', area: 'vertical connector semantics', reason: `${byCode('connector-saturation') + byCode('high-connector-density')} cases have high connector density.`, action: 'Audit whether connector entries represent intentional traversable shafts/stairs or repeated connector points; normalize only if they represent duplicate traversal semantics.' });
if (byCode('hazard-saturation') || byCode('high-hazard-density')) recommendations.push({ priority: 'medium', area: 'hazard population scaling', reason: `${byCode('hazard-saturation') + byCode('high-hazard-density')} cases are hazard-dense relative to room count.`, action: 'Cap repeated hazard entries per room by semantic suitability while retaining high-intensity environmental pressure through room-level severity/details.' });
if (byCode('creature-under-delivery') || byCode('creature-over-delivery')) recommendations.push({ priority: 'medium', area: 'creature density scaling', reason: `${byCode('creature-under-delivery') + byCode('creature-over-delivery')} cases diverge from requested creature density.`, action: 'Tie occupant count more directly to creatureDensity after role/ecology suitability filtering.' });
if (byCode('secret-density-under-delivery')) recommendations.push({ priority: 'medium', area: 'secret traversal scaling', reason: `${byCode('secret-density-under-delivery')} high-secret cases produce little secret access.`, action: 'Map secretDensity to topology-safe alternate access and hidden room connections rather than only content tags.' });
if (randomStats.reviewScoreMean + 6 < curatedStats.reviewScoreMean) recommendations.push({ priority: 'high', area: 'random profile reconciliation', reason: `Seeded-random mean review score (${randomStats.reviewScoreMean}) trails curated (${curatedStats.reviewScoreMean}) by more than six points.`, action: 'Strengthen cross-axis reconciliation for unconstrained profiles before adding more catalog values.' });
if (repeated.hazards.uniquenessRatio < 0.2 || repeated.occupants.uniquenessRatio < 0.2) recommendations.push({ priority: 'low', area: 'content phrase diversity', reason: 'Exact-string uniqueness is low in one or more populated content categories.', action: 'Add semantic phrasing variants only after structural interaction quality is addressed; do not use cosmetic text variety to hide repeated mechanics.' });
if (!recommendations.length) recommendations.push({ priority: 'low', area: 'no immediate systemic defect', reason: 'No review heuristic produced a repeated systemic concern.', action: 'Expand the archive with more unconstrained seeds and adversarial layer combinations before changing generator logic.' });

const caseResults = cases.map(c => ({
  caseNumber: c.entry.caseNumber,
  caseId: c.entry.caseId,
  caseKind: c.entry.caseKind,
  archetype: c.entry.archetype,
  culture: c.entry.culture,
  controller: c.entry.controller,
  occupancyState: c.entry.occupancyState,
  biome: c.entry.biome,
  ecology: c.entry.ecology,
  rulesTarget: c.entry.rulesTarget,
  reviewScore: c.reviewScore,
  reviewBand: c.reviewBand,
  historyPressure: c.pressure,
  normalized: Object.fromEntries(Object.entries(c.normalized).map(([k, v]) => [k, round(v)])),
  findings: c.findings,
}));

const review = {
  schemaVersion: '1.0.0',
  recordType: 'spatial-site-generation-quality-review',
  batchId,
  sourceBatchCommit: summary.sourceCommit,
  archiveAcceptance: summary.acceptance,
  methodology: {
    purpose: 'Identify mechanically valid but semantically weak, over-saturated, under-interacted, or statistically unusual generated sites.',
    note: 'Review findings are tuning signals, not topology failures. Explicitly unusual worldbuilding combinations remain legal.',
    curatedBaselineCases: curated.length,
    seededRandomCases: random.length,
    severityPenalty: severityWeight,
  },
  cohortStats: { curated: curatedStats, seededRandom: randomStats },
  curatedVsRandom: comparison,
  repetition: repeated,
  patternFindings,
  recommendations,
  cases: caseResults,
};

fs.writeFileSync(path.join(baseDir, 'quality-review.json'), JSON.stringify(review, null, 2) + '\n');

const sortedCases = [...caseResults].sort((a, b) => a.reviewScore - b.reviewScore || a.caseNumber - b.caseNumber);
const md = [];
md.push('# Spatial Site Batch Quality Review', '');
md.push(`Batch: **${batchId}**  `);
md.push(`Archive acceptance: **${summary.acceptance.passedCases}/${summary.acceptance.totalCases} PASS**  `);
md.push(`Curated review mean: **${curatedStats.reviewScoreMean}/100**  `);
md.push(`Seeded-random review mean: **${randomStats.reviewScoreMean}/100**`, '');
md.push('This is a second-stage quality review of already-valid generator artifacts. It does not replace spatial validation. It looks for outputs that are technically valid but potentially over-connected, under-interacted, over-saturated, thinly populated, or unusually far from the curated control distribution.', '');
md.push('## Cohort comparison', '');
md.push('| Metric | Curated mean | Seeded-random mean | Delta |', '|---|---:|---:|---:|');
for (const key of ['interactionsPerRoom','adaptedRoleRatio','hazardsPerRoom','occupantsPerRoom','narrativePerRoom','secretAccessPerRoom','corridorsPerRoom','connectorsPerRoom']) {
  const c = comparison[key];
  md.push(`| ${key} | ${c.curatedMean} | ${c.randomMean} | ${c.deltaPercent}% |`);
}
md.push('', '## Repeated review patterns', '');
if (!patternFindings.length) md.push('No heuristic findings.');
else for (const p of patternFindings) md.push(`- **${p.code}** (${p.severity}): ${p.cases.length} case(s) — ${p.cases.join(', ')}`);
md.push('', '## Recommended next changes', '');
for (const r of recommendations) md.push(`- **${r.priority.toUpperCase()} — ${r.area}:** ${r.reason} ${r.action}`);
md.push('', '## Case review', '');
md.push('| # | Case | Kind | Score | Band | History pressure | Interactions/room | Adapted ratio | Hazards/room | Occupants/room | Connectors/room | Findings |', '|---:|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|');
for (const c of sortedCases) md.push(`| ${String(c.caseNumber).padStart(2,'0')} | ${c.caseId} | ${c.caseKind} | ${c.reviewScore} | ${c.reviewBand} | ${c.historyPressure} | ${c.normalized.interactionsPerRoom} | ${c.normalized.adaptedRoleRatio} | ${c.normalized.hazardsPerRoom} | ${c.normalized.occupantsPerRoom} | ${c.normalized.connectorsPerRoom} | ${c.findings.length} |`);
md.push('', '## Exact-string diversity', '');
for (const [key, stats] of Object.entries(repeated)) md.push(`- **${key}:** ${stats.uniqueEntries}/${stats.totalEntries} exact strings unique (${stats.uniquenessRatio}).`);
md.push('', 'The machine-readable detail, evidence, outlier thresholds, and per-case findings are preserved in `quality-review.json`.', '');
fs.writeFileSync(path.join(baseDir, 'QUALITY_REVIEW.md'), md.join('\n'));

console.log(JSON.stringify({ batchId, curated: curatedStats, seededRandom: randomStats, patternFindings, recommendations }, null, 2));
