#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '20260809-cubic-decryptor-hardening-1'
NEW_VERSION = '20260809-cubic-decryptor-hardening-2'


def replace_once(path, old, new, label):
    file = Path(path)
    text = file.read_text()
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    file.write_text(text.replace(old, new, 1))
    return True


ui = 'binary-cube-cubic-decryptor.js'
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
scientific_validator = 'scripts/validate-scientific-tools-extraction.mjs'

replace_once(
    ui,
    """  function addCandidate(candidate) {
    const id = candidateIdentity(candidate);
    const existing = candidates.findIndex(item => candidateIdentity(item) === id);
    if (existing >= 0) candidates.splice(existing, 1);
    candidates.push(candidate);
    candidates.sort((a, b) => (Number(b.exactFingerprintMatch) - Number(a.exactFingerprintMatch)) || b.score - a.score);
    const limit = Number(panel.querySelector('#bccd-result-limit').value) || 24;
    if (candidates.length > limit) candidates.length = limit;
    renderCandidates();
  }

  function renderCandidates() {
""",
    """  function sortCandidates() {
    candidates.sort((a, b) => {
      if (a.exactDigestMatch !== b.exactDigestMatch) return a.exactDigestMatch ? -1 : 1;
      if (a.exactFingerprintMatch !== b.exactFingerprintMatch) return a.exactFingerprintMatch ? -1 : 1;
      const aStageB = Number(a.corroboration?.candidateScore);
      const bStageB = Number(b.corroboration?.candidateScore);
      const aHasStageB = Number.isFinite(aStageB);
      const bHasStageB = Number.isFinite(bStageB);
      if (aHasStageB !== bHasStageB) return aHasStageB ? -1 : 1;
      if (aHasStageB && bStageB !== aStageB) return bStageB - aStageB;
      if (b.score !== a.score) return b.score - a.score;
      return candidateIdentity(a).localeCompare(candidateIdentity(b));
    });
  }

  function addCandidate(candidate) {
    const id = candidateIdentity(candidate);
    const existing = candidates.findIndex(item => candidateIdentity(item) === id);
    if (existing >= 0) candidates.splice(existing, 1);
    candidates.push(candidate);
    sortCandidates();
    const limit = Number(panel.querySelector('#bccd-result-limit').value) || 24;
    if (candidates.length > limit) candidates.length = limit;
    renderCandidates();
  }

  async function informationCorroborator() {
    const workspace = window.ScientificToolsWorkspace;
    if (!workspace?.loadInformationAnalysisSuite) fail('Information & Deobfuscation Suite loader is unavailable.');
    await workspace.loadInformationAnalysisSuite();
    const Information = window.BinaryCubeInformationAnalysisSuite;
    if (!Information?.utilities?.candidateScore || !Information?.analyzeInformation) fail('Information & Deobfuscation candidate scoring APIs are unavailable.');
    return Information;
  }

  async function corroborateCandidate(candidate, Information) {
    const bytes = candidateBytes(candidate);
    const quick = Information.utilities.candidateScore(bytes);
    const analysis = await Information.analyzeInformation(bytes, { windowSize: Math.min(256, Math.max(32, bytes.length || 32)), minimumStringLength: 5 });
    return Object.freeze({
      ...candidate,
      corroboration: Object.freeze({
        source: 'Information & Deobfuscation Analysis Suite',
        scope: candidate.fullRecovery ? 'full plaintext' : 'retained plaintext sample',
        candidateScore: quick.score,
        printableFraction: quick.printable,
        utf8Validity: quick.utf8,
        languageScore: quick.language,
        entropy: quick.entropy,
        signatures: Object.freeze((quick.signatures || []).map(item => item.label || String(item))),
        informationEvidenceScore: analysis.evidenceScore,
        informationEvidenceClass: analysis.evidenceClass,
        compressionRatio: analysis.compressionRatio,
        carvedStringCount: analysis.strings?.length || 0,
        boundary: 'Stage B is corroborating evidence from the existing Information & Deobfuscation Suite. Its scores rank structure and readability; they are not a probability that the candidate key is correct.'
      })
    });
  }

  async function corroborateRetainedCandidates(limitValue = 8) {
    if (!candidates.length) return [];
    const Information = await informationCorroborator();
    const limit = Math.max(1, Math.min(candidates.length, Math.floor(Number(limitValue) || 8)));
    const queue = candidates.filter(candidate => !candidate.exactDigestMatch && !candidate.corroboration).slice(0, limit);
    if (!queue.length) {
      setStatus('No retained candidates require Stage B specialist corroboration.', 'success');
      return [];
    }
    const updated = [];
    for (let index = 0; index < queue.length; index += 1) {
      const candidate = queue[index];
      setStatus(`Stage B specialist corroboration ${index + 1}/${queue.length} · ${candidate.profileLabel} · seed ${candidate.seed}…`);
      const row = await corroborateCandidate(candidate, Information);
      const candidateIndex = candidates.findIndex(item => candidateIdentity(item) === candidateIdentity(candidate));
      if (candidateIndex >= 0) candidates.splice(candidateIndex, 1, row);
      updated.push(row);
    }
    sortCandidates();
    renderCandidates();
    setStatus(`Stage B specialist corroboration complete for ${updated.length} retained candidate${updated.length === 1 ? '' : 's'}.`, 'success');
    return updated;
  }

  function renderCandidates() {
""",
    'Cubic Stage B corroboration orchestration'
)

replace_once(
    ui,
    """    target.innerHTML = candidates.map((candidate, index) => `<article class=\"bccd-candidate ${candidate.exactFingerprintMatch ? 'bccd-exact' : ''}\"><header><div><span>#${index + 1}</span><strong>${esc(candidate.profileLabel)} · ${candidate.gridSize}³</strong></div><b>${candidate.exactDigestMatch ? 'SHA-256 KEY MATCH' : candidate.exactFingerprintMatch ? 'LEGACY KEY FINGERPRINT MATCH' : `score ${num(candidate.score, 1)}`}</b></header><div class=\"bccd-chips\"><span>seed <code>${esc(candidate.seed)}</code></span><span>${esc(candidate.inputFace)}→${esc(candidate.outputFace)}</span><span>turns ${candidate.inputQuarterTurns}/${candidate.outputQuarterTurns}</span><span>capacity ${candidate.payloadCapacity}</span><span>printable ${pct(candidate.printableFraction)}</span><span>entropy ${num(candidate.entropy, 3)}</span>${candidate.signature ? `<span>${esc(candidate.signature)}</span>` : ''}</div><pre>${esc(candidate.preview || '(binary / no printable preview)')}</pre><details><summary>Hex preview and evidence boundary</summary><code>${esc(candidate.hexPreview || '')}</code><p>${esc(candidate.caveat || '')}</p></details><div class=\"bccd-actions\"><button type=\"button\" data-bccd-analyze=\"${index}\">Analyze candidate</button><button type=\"button\" data-bccd-media=\"${index}\">Media forensics</button><button type=\"button\" data-bccd-full=\"${index}\">Recover full plaintext</button><button type=\"button\" data-bccd-save=\"${index}\">Save plaintext</button><button type=\"button\" data-bccd-save-key=\"${index}\">Save recovered key</button></div></article>`).join('');
""",
    """    target.innerHTML = candidates.map((candidate, index) => { const stageB = candidate.corroboration; const stageBSignatures = stageB?.signatures?.length ? `<span>Stage B signatures ${esc(stageB.signatures.join(', '))}</span>` : ''; return `<article class=\"bccd-candidate ${candidate.exactFingerprintMatch ? 'bccd-exact' : ''}\"><header><div><span>#${index + 1}</span><strong>${esc(candidate.profileLabel)} · ${candidate.gridSize}³</strong></div><b>${candidate.exactDigestMatch ? 'SHA-256 KEY MATCH' : candidate.exactFingerprintMatch ? 'LEGACY KEY FINGERPRINT MATCH' : stageB ? `Stage B ${num(stageB.candidateScore, 1)}` : `Stage A ${num(candidate.score, 1)}`}</b></header><div class=\"bccd-chips\"><span>seed <code>${esc(candidate.seed)}</code></span><span>${esc(candidate.inputFace)}→${esc(candidate.outputFace)}</span><span>turns ${candidate.inputQuarterTurns}/${candidate.outputQuarterTurns}</span><span>capacity ${candidate.payloadCapacity}</span><span>Stage A ${num(candidate.score, 1)}</span><span>printable ${pct(candidate.printableFraction)}</span><span>entropy ${num(candidate.entropy, 3)}</span>${candidate.signature ? `<span>${esc(candidate.signature)}</span>` : ''}${stageB ? `<span>Stage B UTF-8 ${pct(stageB.utf8Validity)}</span><span>language ${num(stageB.languageScore, 1)}</span><span>compression ${num(stageB.compressionRatio, 3)}</span><span>${esc(stageB.informationEvidenceClass)}</span>${stageBSignatures}` : ''}</div><pre>${esc(candidate.preview || '(binary / no printable preview)')}</pre><details><summary>Hex preview and evidence boundary</summary><code>${esc(candidate.hexPreview || '')}</code><p>${esc(candidate.caveat || '')}</p>${stageB ? `<p><strong>Stage B · ${esc(stageB.scope)}:</strong> ${esc(stageB.boundary)}</p>` : ''}</details><div class=\"bccd-actions\"><button type=\"button\" data-bccd-analyze=\"${index}\">Analyze candidate</button><button type=\"button\" data-bccd-media=\"${index}\">Media forensics</button><button type=\"button\" data-bccd-full=\"${index}\">Recover full plaintext</button><button type=\"button\" data-bccd-save=\"${index}\">Save plaintext</button><button type=\"button\" data-bccd-save-key=\"${index}\">Save recovered key</button></div></article>`; }).join('');
""",
    'Cubic Stage B candidate rendering'
)

replace_once(
    ui,
    """          setStatus(result.exactMatch ? `Stopped on package key fingerprint match after ${result.attemptsThisRun.toLocaleString()} attempts.` : result.exhausted ? `Search exhausted after ${result.attemptsThisRun.toLocaleString()} attempts in this run.` : 'Search stopped.', result.exactMatch ? 'success' : 'warning'); resolve(result);
""",
    """          setStatus(result.exactMatch ? `Stopped on package key identity match after ${result.attemptsThisRun.toLocaleString()} attempts.` : result.exhausted ? `Search exhausted after ${result.attemptsThisRun.toLocaleString()} attempts in this run.` : 'Search stopped.', result.exactMatch ? 'success' : 'warning');
          if ((!result.exactMatch || !result.exactMatch.exactDigestMatch) && candidates.length) void corroborateRetainedCandidates().catch(error => setStatus(`Stage B corroboration unavailable · ${error.message}`, 'warning'));
          resolve(result);
""",
    'Cubic automatic Stage B handoff'
)

replace_once(
    ui,
    """<section class=\"bccd-card\"><h3>Recovered / promising candidates</h3><div data-bccd-results><p class=\"bccd-muted\">No candidate plaintexts retained yet.</p></div></section>""",
    """<section class=\"bccd-card\"><h3>Recovered / promising candidates</h3><div class=\"bccd-actions\"><button type=\"button\" data-bccd-corroborate>Corroborate retained candidates</button></div><p class=\"bccd-muted\">Stage A is the inexpensive inner-loop Cubic score. Stage B runs only on retained candidates and delegates structure/language/signature analysis to the existing Information & Deobfuscation Suite.</p><div data-bccd-results><p class=\"bccd-muted\">No candidate plaintexts retained yet.</p></div></section>""",
    'Cubic Stage B UI control'
)

replace_once(
    ui,
    """    target.querySelector('[data-bccd-reset]').addEventListener('click', resetCursor);
    target.querySelector('[data-bccd-export-checkpoint]').addEventListener('click', () => { try { exportCheckpoint(); } catch (error) { setStatus(error.message, 'error'); } });
""",
    """    target.querySelector('[data-bccd-reset]').addEventListener('click', resetCursor);
    target.querySelector('[data-bccd-corroborate]').addEventListener('click', () => void corroborateRetainedCandidates().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-export-checkpoint]').addEventListener('click', () => { try { exportCheckpoint(); } catch (error) { setStatus(error.message, 'error'); } });
""",
    'Cubic Stage B button binding'
)

replace_once(
    validator,
    """const Cubic = require(path.join(root, 'binary-cube-cubic-decryptor-engine.js'));
const ui = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor.js'), 'utf8');
""",
    """const Cubic = require(path.join(root, 'binary-cube-cubic-decryptor-engine.js'));
const Information = require(path.join(root, 'binary-cube-information-analysis-suite.js'));
const ui = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor.js'), 'utf8');
""",
    'Cubic validator Information authority'
)

replace_once(
    validator,
    """assert.equal(Cubic.renderSeed('seed-{n8}-{hex8}', 42), 'seed-00000042-0000002a');
assert.throws(() => Cubic.normalizeTemplates(['no-counter']), /counter placeholder/);
""",
    """assert.equal(Cubic.renderSeed('seed-{n8}-{hex8}', 42), 'seed-00000042-0000002a');
assert.throws(() => Cubic.normalizeTemplates(['no-counter']), /counter placeholder/);
const informationProbe = Information.utilities.candidateScore(Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]));
assert.ok(informationProbe.signatures.some(item => item.label === 'PNG'), 'Stage B authority must recognize a canonical PNG signature.');
assert.ok(Number.isFinite(informationProbe.score));
""",
    'Cubic validator Stage B authority probe'
)

replace_once(
    validator,
    """  'SHA-256 KEY MATCH',
  'LEGACY KEY FINGERPRINT MATCH'
""",
    """  'SHA-256 KEY MATCH',
  'LEGACY KEY FINGERPRINT MATCH',
  'Corroborate retained candidates',
  'Stage B specialist corroboration',
  'Information.utilities.candidateScore',
  'Information.analyzeInformation'
""",
    'Cubic validator Stage B UI contract'
)

replace_once(
    validator,
    "schema: '0.2.0'",
    "schema: '0.3.0'",
    'Cubic validation receipt Stage B version'
)

replace_once('scientific-tools-entry.js', f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools Stage B cache seal')
replace_once('app-lite-view-mounts.js', f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Top-level Stage B cache seal')
replace_once(scientific_validator, f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Scientific Tools validator Stage B top cache')
replace_once(scientific_validator, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools validator Stage B cache')
replace_once(scientific_validator, "schemaVersion: '0.18.0'", "schemaVersion: '0.19.0'", 'Scientific Tools Stage B ownership receipt')

print('Cubic retained-candidate Stage B corroboration applied or already present.')
