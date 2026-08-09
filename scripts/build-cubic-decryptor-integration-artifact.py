#!/usr/bin/env python3
from pathlib import Path
import subprocess


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor in {path}, found {count}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    'scientific-tools-entry.js',
    "  let steganalysisLabPromise = null;\n  let diagnosticPipelinePromise = null;\n",
    "  let steganalysisLabPromise = null;\n  let diagnosticPipelinePromise = null;\n  let cubicDecryptorPromise = null;\n",
    'cubic promise')

loader = r'''
  function loadCubicDecryptor() {
    if (window.BinaryCubeCubicDecryptor) return Promise.resolve(window.BinaryCubeCubicDecryptor);
    if (cubicDecryptorPromise) return cubicDecryptorPromise;
    cubicDecryptorPromise = (async () => {
      await loadCooperativeRunner();
      await Promise.all([
        loadDecryptionDashboard(),
        loadInformationAnalysisSuite(),
        loadMediaForensicsSuite()
      ]);
      await loadStyle('binary-cube-cubic-decryptor.css');
      await loadScript('binary-cube-key-generation-research.js', () => Boolean(window.BinaryCubeKeyGenerationResearch));
      await loadScript('binary-cube-cubic-decryptor-engine.js', () => Boolean(window.BinaryCubeCubicDecryptorEngine));
      await loadScript('binary-cube-cubic-decryptor.js', () => Boolean(window.BinaryCubeCubicDecryptor));
      return window.BinaryCubeCubicDecryptor;
    })();
    cubicDecryptorPromise.catch(() => { cubicDecryptorPromise = null; });
    return cubicDecryptorPromise;
  }

'''
replace_once('scientific-tools-entry.js', "  function loadIsmLab() {\n", loader + "  function loadIsmLab() {\n", 'cubic loader')

opener = r'''
  function openCubicDecryptor(button = null, options = null) {
    return withLoadingButton(button, 'Loading Cubic Decryptor…', async () => {
      const api = await loadCubicDecryptor();
      if (!api?.openPanel) throw new Error('The Cubic Decryptor Tool loaded without an open-panel interface.');
      return api.openPanel(options || {});
    });
  }

'''
replace_once('scientific-tools-entry.js', "  function openIsmSimulation(button = null) {\n", opener + "  function openIsmSimulation(button = null) {\n", 'cubic opener')
replace_once(
    'scientific-tools-entry.js',
    '          <button id="scientific-tools-open-decryption-dashboard" type="button" class="secondary-action">Open Decryption Dashboard</button>\n',
    '          <button id="scientific-tools-open-decryption-dashboard" type="button" class="secondary-action">Open Decryption Dashboard</button>\n          <button id="scientific-tools-open-cubic-decryptor" type="button" class="secondary-action">Open Cubic Decryptor Tool</button>\n',
    'cubic button')
replace_once(
    'scientific-tools-entry.js',
    '<span><strong>Cube attack input:</strong> package/secure export, raw bits, hex, Base64, files, and comparative ciphertexts</span>',
    '<span><strong>Cube attack input:</strong> package/secure export, raw bits, hex, Base64, files, and comparative ciphertexts</span><span><strong>Cubic decryptor:</strong> deterministic staged brute-force search moves from the smallest compatible direct-permutation cubes through iterative-chain, global transposition-walk, nested-permutation, and nested-interleaved key generators, with metadata-constrained package search, raw framing expansion, reproducible seed templates, worker execution, pause/resume checkpoints, full-candidate recovery, and specialist handoff</span>',
    'cubic runtime description')
replace_once(
    'scientific-tools-entry.js',
    "    view.querySelector('#scientific-tools-open-decryption-dashboard')?.addEventListener('click', event => void openDecryptionDashboard(event.currentTarget));\n",
    "    view.querySelector('#scientific-tools-open-decryption-dashboard')?.addEventListener('click', event => void openDecryptionDashboard(event.currentTarget));\n    view.querySelector('#scientific-tools-open-cubic-decryptor')?.addEventListener('click', event => void openCubicDecryptor(event.currentTarget));\n",
    'cubic binding')
replace_once('scientific-tools-entry.js', "    loadSteganalysisLab,\n    loadDiagnosticPipeline,\n", "    loadSteganalysisLab,\n    loadDiagnosticPipeline,\n    loadCubicDecryptor,\n", 'cubic loader export')
replace_once('scientific-tools-entry.js', "    openDiagnosticPipeline,\n    openDecryptionDashboard,\n", "    openDiagnosticPipeline,\n    openDecryptionDashboard,\n    openCubicDecryptor,\n", 'cubic opener export')

replace_once(
    'binary-cube-cubic-decryptor.js',
    "    return { kind: 'raw', bits: activeSource.bits, framing: { ...manualFraming(), ...(activeSource.framing || {}) } };\n",
    "    return { kind: 'raw', bits: activeSource.bits, framing: { ...(activeSource.framing || {}), ...manualFraming() } };\n",
    'raw framing precedence')
replace_once(
    'binary-cube-cubic-decryptor.js',
    "  function saveKey(candidate) {\n    if (!candidate.key) return;\n    download(JSON.stringify(candidate.key, null, 2), `cubic-decryptor-key-${candidate.key.keyId || 'candidate'}.json`, 'application/json');\n  }\n",
    r'''  function regenerateKey(candidate) {
    const Research = window.BinaryCubeKeyGenerationResearch;
    if (!Research?.generateResearchKey) fail('Binary Cube key-generation research is unavailable.');
    const key = Research.generateResearchKey(candidate.profile, candidate.seed, candidate.gridSize, {
      gridSize: candidate.gridSize,
      inputFace: candidate.inputFace,
      outputFace: candidate.outputFace,
      inputQuarterTurns: candidate.inputQuarterTurns,
      outputQuarterTurns: candidate.outputQuarterTurns,
      maskDensity: candidate.payloadCapacity / (candidate.gridSize * candidate.gridSize)
    });
    if (candidate.keyId && key.keyId !== candidate.keyId) fail('Regenerated key fingerprint does not match the retained candidate.');
    return key;
  }

  function saveKey(candidate) {
    const key = regenerateKey(candidate);
    download(JSON.stringify(key, null, 2), `cubic-decryptor-key-${key.keyId || 'candidate'}.json`, 'application/json');
  }

  function recoverFullCandidate(candidate) {
    const key = regenerateKey(candidate);
    let plaintextBits;
    if (activeSource?.kind === 'package') plaintextBits = Engine.decryptBinary(activeSource.package, key);
    else {
      if (!activeSource?.bits) fail('The raw ciphertext source is no longer loaded.');
      const framing = { ...(activeSource.framing || {}), ...manualFraming() };
      const source = Cubic.sourceFromRaw(activeSource.bits, framing);
      const payload = Cubic.syntheticPackage(source, key, candidate.payloadCapacity, source.bits, framing.originalBitLength);
      plaintextBits = Engine.decryptBinary(payload, key);
    }
    const evidence = Cubic.scorePlaintext(plaintextBits);
    const updated = Object.freeze({ ...candidate, ...evidence, plaintextBits, fullRecovery: true });
    const index = candidates.findIndex(item => candidateIdentity(item) === candidateIdentity(candidate));
    if (index >= 0) candidates.splice(index, 1, updated);
    renderCandidates();
    setStatus(`Recovered full plaintext with ${updated.profileLabel} / seed ${updated.seed}.`, 'success');
    return updated;
  }
''',
    'key regeneration/full recovery')
replace_once(
    'binary-cube-cubic-decryptor.js',
    '<button type="button" data-bccd-media="${index}">Media forensics</button><button type="button" data-bccd-save="${index}">Save plaintext</button><button type="button" data-bccd-save-key="${index}" ${candidate.key ? \'\' : \'disabled\'}>Save recovered key</button>',
    '<button type="button" data-bccd-media="${index}">Media forensics</button><button type="button" data-bccd-full="${index}">Recover full plaintext</button><button type="button" data-bccd-save="${index}">Save plaintext</button><button type="button" data-bccd-save-key="${index}">Save recovered key</button>',
    'full recovery button')
replace_once(
    'binary-cube-cubic-decryptor.js',
    "      const analyze = event.target.closest('[data-bccd-analyze]'); const media = event.target.closest('[data-bccd-media]'); const save = event.target.closest('[data-bccd-save]'); const saveKeyButton = event.target.closest('[data-bccd-save-key]');\n",
    "      const analyze = event.target.closest('[data-bccd-analyze]'); const media = event.target.closest('[data-bccd-media]'); const full = event.target.closest('[data-bccd-full]'); const save = event.target.closest('[data-bccd-save]'); const saveKeyButton = event.target.closest('[data-bccd-save-key]');\n",
    'full recovery event capture')
replace_once(
    'binary-cube-cubic-decryptor.js',
    "        if (media) void openMedia(candidates[Number(media.dataset.bccdMedia)]);\n        if (save) saveCandidate(candidates[Number(save.dataset.bccdSave)]);\n",
    "        if (media) void openMedia(candidates[Number(media.dataset.bccdMedia)]);\n        if (full) recoverFullCandidate(candidates[Number(full.dataset.bccdFull)]);\n        if (save) saveCandidate(candidates[Number(save.dataset.bccdSave)]);\n",
    'full recovery event action')

replace_once('.github/workflows/scientific-tools-extraction.yml', '      - "binary-cube-diagnostic-pipeline.css"\n', '      - "binary-cube-diagnostic-pipeline.css"\n      - "binary-cube-cubic-decryptor-engine.js"\n      - "binary-cube-cubic-decryptor-worker.js"\n      - "binary-cube-cubic-decryptor.js"\n      - "binary-cube-cubic-decryptor.css"\n', 'workflow paths')
replace_once('.github/workflows/scientific-tools-extraction.yml', '      - "scripts/validate-scientific-diagnostic-pipeline.mjs"\n', '      - "scripts/validate-scientific-diagnostic-pipeline.mjs"\n      - "scripts/validate-binary-cube-cubic-decryptor.mjs"\n', 'workflow validator path')
replace_once('.github/workflows/scientific-tools-extraction.yml', '          node --check binary-cube-diagnostic-pipeline-panel.js\n', '          node --check binary-cube-diagnostic-pipeline-panel.js\n          node --check binary-cube-cubic-decryptor-engine.js\n          node --check binary-cube-cubic-decryptor-worker.js\n          node --check binary-cube-cubic-decryptor.js\n', 'workflow checks')
replace_once('.github/workflows/scientific-tools-extraction.yml', '          node --check scripts/validate-scientific-diagnostic-pipeline.mjs\n', '          node --check scripts/validate-scientific-diagnostic-pipeline.mjs\n          node --check scripts/validate-binary-cube-cubic-decryptor.mjs\n', 'workflow validator check')
replace_once('.github/workflows/scientific-tools-extraction.yml', '          test -s binary-cube-diagnostic-pipeline.css\n', '          test -s binary-cube-diagnostic-pipeline.css\n          test -s binary-cube-cubic-decryptor.css\n', 'workflow css')
replace_once('.github/workflows/scientific-tools-extraction.yml', '      - name: Validate Scientific Tools main-menu contract\n        run: node scripts/validate-scientific-tools-extraction.mjs\n', '      - name: Validate Cubic Decryptor Tool\n        run: node scripts/validate-binary-cube-cubic-decryptor.mjs\n\n      - name: Validate Scientific Tools main-menu contract\n        run: node scripts/validate-scientific-tools-extraction.mjs\n', 'workflow step')

replace_once('scripts/validate-scientific-tools-extraction.mjs', "const diagnosticPanel = read('binary-cube-diagnostic-pipeline-panel.js');\n", "const diagnosticPanel = read('binary-cube-diagnostic-pipeline-panel.js');\nconst cubicDecryptorEngine = read('binary-cube-cubic-decryptor-engine.js');\nconst cubicDecryptorWorker = read('binary-cube-cubic-decryptor-worker.js');\nconst cubicDecryptorUi = read('binary-cube-cubic-decryptor.js');\n", 'validator reads')
for label in ('shadowrun', 'blacklight'):
    p = Path('scripts/validate-scientific-tools-extraction.mjs')
    text = p.read_text()
    needle = "  'binary-cube-diagnostic-pipeline.js',\n  'interstellar-media-collisions-lab.js',\n"
    if needle not in text:
        raise SystemExit(f'{label} cubic exclude anchor missing')
    p.write_text(text.replace(needle, "  'binary-cube-diagnostic-pipeline.js',\n  'binary-cube-cubic-decryptor-engine.js',\n  'binary-cube-cubic-decryptor.js',\n  'interstellar-media-collisions-lab.js',\n", 1))

cubic_checks = r'''
checks.push(includes('Cubic decryptor owns deterministic staged search and delegates cryptographic authority', cubicDecryptorEngine, [
  'BinaryCubeCubicDecryptorEngine',
  'Research.generateResearchKey(',
  'Engine.decryptBinary(',
  'function buildSearchPlan(',
  "'direct-permutation'",
  "'iterative-chain'",
  "'random-transposition-walk'",
  "'nested-permutation'",
  "'nested-interleaved'",
  'function makeCheckpoint('
]));
checks.push(excludes('Cubic decryptor does not duplicate cube transforms or generator implementations', cubicDecryptorEngine, [
  'function transformBlockWithKey(',
  'function iterativePermutation(',
  'function randomWalkPermutation(',
  'function nestedPermutation('
]));
checks.push(includes('Cubic decryptor worker delegates deterministic attempts to the shared search engine', cubicDecryptorWorker, [
  "'binary-cube-cubic-decryptor-engine.js'",
  'Cubic.attemptCandidate(',
  'Cubic.makeCheckpoint(',
  "message.operation !== 'search'"
]));
checks.push(includes('Cubic decryptor UI exposes staged recovery, resume, full recovery, and specialist handoff', cubicDecryptorUi, [
  'Cubic Decryptor Tool',
  'Build staged plan',
  'Run / resume decryptor',
  'Export checkpoint',
  'Recover full plaintext',
  'openInformationAnalysisSuite',
  'openMediaForensicsSuite',
  'regenerateKey('
]));

'''
replace_once('scripts/validate-scientific-tools-extraction.mjs', "checks.push(includes('Advanced steganalysis engine owns quantitative and parity math', steganalysisEngine, [\n", cubic_checks + "checks.push(includes('Advanced steganalysis engine owns quantitative and parity math', steganalysisEngine, [\n", 'validator cubic checks')
replace_once(
    'scripts/validate-scientific-tools-extraction.mjs',
    "  'Run Diagnostic Evaluation Pipeline',\n  'absence of positive evidence is not evidence of absence'\n",
    "  'Run Diagnostic Evaluation Pipeline',\n  'function loadCubicDecryptor()',\n  \"loadStyle('binary-cube-cubic-decryptor.css')\",\n  \"loadScript('binary-cube-cubic-decryptor-engine.js'\",\n  \"loadScript('binary-cube-cubic-decryptor.js'\",\n  'function openCubicDecryptor(',\n  'id=\"scientific-tools-open-cubic-decryptor\"',\n  'Open Cubic Decryptor Tool',\n  'absence of positive evidence is not evidence of absence'\n",
    'validator workspace cubic ownership')
replace_once('scripts/validate-scientific-tools-extraction.mjs', '  \'id="scientific-tools-open-decryption-dashboard"\',\n', '  \'id="scientific-tools-open-decryption-dashboard"\',\n  \'id="scientific-tools-open-cubic-decryptor"\',\n', 'validator established cubic button')
replace_once('scripts/validate-scientific-tools-extraction.mjs', "  'binary-cube-diagnostic-pipeline.css',\n", "  'binary-cube-diagnostic-pipeline.css',\n  'binary-cube-cubic-decryptor.css',\n  'scripts/validate-binary-cube-cubic-decryptor.mjs',\n", 'validator nonempty')

paths = [
    'scientific-tools-entry.js',
    'binary-cube-cubic-decryptor.js',
    '.github/workflows/scientific-tools-extraction.yml',
    'scripts/validate-scientific-tools-extraction.mjs'
]
manifest = ['base=' + subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()]
for p in paths:
    manifest.append(f"{p}=" + subprocess.check_output(['git', 'rev-parse', f'HEAD:{p}'], text=True).strip())
Path('cubic-integration-manifest.txt').write_text('\n'.join(manifest) + '\n')
