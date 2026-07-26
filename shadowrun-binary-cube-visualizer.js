(function installShadowrunBinaryCubeVisualizer(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeVisualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createShadowrunBinaryCubeVisualizer(root) {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-visualizer';
  const MAX_STATIC_GRID_SIZE = 64;
  const MAX_MANUAL_TRACE_GRID_SIZE = 12;
  const DEFAULT_SEED = 'binary-cube-visualizer-static-demo';
  const DEFAULT_BITS = '01001100110100110100110011010011';
  const PLAYBACK_DURATION_MS = 18000;
  const PLAYBACK_SPEEDS = Object.freeze([0.25, 0.5, 1, 2]);
  const PLAYBACK_SCOPES = Object.freeze(['selected-bit', 'selected-row', 'selected-block', 'all-blocks', 'overview-only']);
  const OVERVIEW_BLOCK_DURATION_MS = 1800;
  const MASK_MODES = Object.freeze(['1', '0.75', '0.5', 'custom']);
  const Engine = root?.ShadowrunBinaryCubeEngine;
  const RendererApi = root?.BinaryCubeVisualizerRenderer;
  const FACES = Engine?.constants?.FACES || Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);

  let renderer = null;
  let activeKey = null;
  let activeKeyOrigin = null;
  let activePackage = null;
  let activeTraces = [];
  let selectedBlockIndex = 0;
  let recoveredBits = '';
  let roundTripValid = false;
  let sourceFileName = 'binary-cube-input.bin';
  let pickRole = 'input';
  let draftDirection = { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0 };
  let activeTrace = null;
  let traceTime = 0;
  let selectedPointId = 0;
  let playbackDirection = 0;
  let playbackSpeed = 1;
  let playbackMode = 'all';
  let playbackScope = 'selected-block';
  let playbackFrame = null;
  let playbackLastTimestamp = null;

  function fail(message) { throw new Error(message); }
  function title(value) { return String(value).replace(/^./, character => character.toUpperCase()); }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function normalizeQuarterTurns(value) { return ((Number(value) || 0) % 4 + 4) % 4; }
  function normalizeBits(value, label = 'Binary input') {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits) fail(`${label} must contain at least one binary digit.`);
    if (/[^01]/.test(bits)) fail(`${label} may contain only 0, 1, and whitespace.`);
    return bits;
  }
  function bytesToBits(bytes) {
    return Array.from(bytes, byte => Number(byte).toString(2).padStart(8, '0')).join('');
  }
  function bitsToBytes(bits) {
    const normalized = normalizeBits(bits, 'Recovered binary');
    if (normalized.length % 8 !== 0) fail('Recovered binary is not byte-aligned and cannot be downloaded as a normal file.');
    return new Uint8Array(Array.from({ length: normalized.length / 8 }, (_, index) => Number.parseInt(normalized.slice(index * 8, index * 8 + 8), 2)));
  }
  function safeFileName(value, fallback = 'binary-cube-output.bin') {
    const cleaned = String(value || '').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
    return cleaned || fallback;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }
  function cloneJson(value) {
    return value == null ? null : JSON.parse(JSON.stringify(value));
  }

  function requireDependencies() {
    if (!Engine) fail('The canonical Binary Cube engine must load before the visualizer.');
    if (!RendererApi?.createRenderer) fail('The Binary Cube WebGL renderer must load before the visualizer.');
    if (typeof RendererApi.resolveTraceTimeline !== 'function' || typeof RendererApi.tracePointPosition !== 'function') fail('The Binary Cube V6 trace-time renderer API is unavailable.');
    for (const operation of ['createKey', 'validateKey', 'encryptBinary', 'validatePackage', 'decryptBinary', 'traceEncryptBlock', 'validateTransformationTrace']) {
      if (typeof Engine[operation] !== 'function') fail(`The canonical Binary Cube engine operation ${operation} is unavailable.`);
    }
  }

  function setStatus(panel, message, type = '') {
    const node = panel?.querySelector('[data-cube-visualizer-status]');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('success', type === 'success');
    node.classList.toggle('error', type === 'error');
  }

  function parseJsonText(value, label) {
    const raw = String(value ?? '').trim();
    if (!raw) fail(`${label} is empty.`);
    try { return JSON.parse(raw); }
    catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
  }

  function parseKey(panel) {
    try { return Engine.validateKey(parseJsonText(panel.querySelector('[data-cube-visualizer-key]').value, 'Key JSON')); }
    catch (error) { fail(`Key JSON could not be loaded: ${error.message}`); }
  }

  function parsePackage(panel) {
    return parseJsonText(panel.querySelector('[data-cube-encoder-package]').value, 'Encrypted package JSON');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(value, filename) {
    downloadBlob(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }), filename);
  }

  async function copyText(value) {
    const text = String(value ?? '');
    if (!text.trim()) fail('There is nothing to copy.');
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    if (!document.execCommand('copy')) fail('The browser could not copy the text.');
    textarea.remove();
  }

  function legalOutputFaces(inputFace = draftDirection.inputFace) { return Engine.legalOutputFaces(inputFace); }
  function rendererDirectionState() { return { ...draftDirection, legalOutputFaces: legalOutputFaces(draftDirection.inputFace) }; }

  function updateDirectionSummary(panel) {
    const node = panel.querySelector('[data-cube-visualizer-direction-summary]');
    if (!node) return;
    const legal = legalOutputFaces().map(title).join(', ');
    const loaded = activeKey
      ? `Loaded key ${activeKey.keyId}: ${title(activeKey.inputFace)} ${activeKey.inputQuarterTurns * 90}° → ${title(activeKey.outputFace)} ${activeKey.outputQuarterTurns * 90}°.`
      : 'No canonical key is loaded.';
    node.textContent = `Draft direction: ${title(draftDirection.inputFace)} ${draftDirection.inputQuarterTurns * 90}° inward → ${title(draftDirection.outputFace)} ${draftDirection.outputQuarterTurns * 90}° outward. Legal outputs: ${legal}. ${loaded}`;
  }

  function setPickRole(panel, role) {
    if (role !== 'input' && role !== 'output') fail('Face-picking role must be input or output.');
    pickRole = role;
    panel.querySelectorAll('[data-cube-visualizer-pick-role]').forEach(button => {
      const active = button.dataset.cubeVisualizerPickRole === role;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    panel.querySelector('[data-cube-visualizer-pick-instruction]').textContent = `Cube clicks now select the ${role} face.`;
  }

  function rebuildOutputOptions(panel, preferredFace = draftDirection.outputFace) {
    const select = panel.querySelector('[data-cube-visualizer-output-face]');
    const legal = legalOutputFaces(draftDirection.inputFace);
    const selected = legal.includes(preferredFace) ? preferredFace : legal[0];
    select.replaceChildren(...legal.map(face => {
      const option = document.createElement('option');
      option.value = face;
      option.textContent = title(face);
      option.selected = face === selected;
      return option;
    }));
    draftDirection.outputFace = selected;
  }

  function syncCustomMaskVisibility(panel) {
    const custom = panel.querySelector('[data-cube-visualizer-mask-mode]').value === 'custom';
    panel.querySelector('[data-cube-visualizer-custom-mask-field]').hidden = !custom;
  }

  function syncControlsFromKey(panel, key, maskMode = 'custom') {
    panel.querySelector('[data-cube-visualizer-size]').value = String(key.gridSize);
    panel.querySelector('[data-cube-visualizer-seed]').value = key.seed;
    panel.querySelector('[data-cube-visualizer-input-face]').value = key.inputFace;
    draftDirection = { inputFace:key.inputFace, outputFace:key.outputFace, inputQuarterTurns:key.inputQuarterTurns, outputQuarterTurns:key.outputQuarterTurns };
    rebuildOutputOptions(panel, key.outputFace);
    panel.querySelector('[data-cube-visualizer-input-turns]').value = String(key.inputQuarterTurns);
    panel.querySelector('[data-cube-visualizer-output-turns]').value = String(key.outputQuarterTurns);
    panel.querySelector('[data-cube-visualizer-mask-mode]').value = MASK_MODES.includes(String(maskMode)) ? String(maskMode) : 'custom';
    panel.querySelector('[data-cube-visualizer-custom-mask]').value = key.mask.map(Boolean).map(value => value ? '1' : '0').join('');
    syncCustomMaskVisibility(panel);
  }

  function readDraftFromControls(panel) {
    draftDirection.inputFace = panel.querySelector('[data-cube-visualizer-input-face]').value;
    rebuildOutputOptions(panel, panel.querySelector('[data-cube-visualizer-output-face]').value);
    draftDirection.outputFace = panel.querySelector('[data-cube-visualizer-output-face]').value;
    draftDirection.inputQuarterTurns = normalizeQuarterTurns(panel.querySelector('[data-cube-visualizer-input-turns]').value);
    draftDirection.outputQuarterTurns = normalizeQuarterTurns(panel.querySelector('[data-cube-visualizer-output-turns]').value);
    return draftDirection;
  }

  function normalizeCustomMask(value, cellCount) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (bits.length !== cellCount) fail(`Custom mask must contain exactly ${cellCount} binary digits for this grid.`);
    if (/[^01]/.test(bits)) fail('Custom mask may contain only 0, 1, and whitespace.');
    if (!bits.includes('1')) fail('Custom mask must contain at least one payload cell.');
    return bits;
  }

  function createDraftKey(panel) {
    readDraftFromControls(panel);
    const gridSize = Number(panel.querySelector('[data-cube-visualizer-size]').value);
    const maskMode = panel.querySelector('[data-cube-visualizer-mask-mode]').value;
    if (!MASK_MODES.includes(maskMode)) fail('Unknown mask mode.');
    let key = Engine.createKey({
      gridSize,
      seed: panel.querySelector('[data-cube-visualizer-seed]').value.trim() || DEFAULT_SEED,
      ...draftDirection,
      maskDensity: maskMode === 'custom' ? 1 : Number(maskMode)
    });
    if (maskMode === 'custom') {
      const maskBits = normalizeCustomMask(panel.querySelector('[data-cube-visualizer-custom-mask]').value, gridSize * gridSize);
      key = Engine.validateKey({ ...key, keyId: undefined, mask: [...maskBits].map(bit => bit === '1') });
    }
    return { key, maskMode };
  }

  function tracePointFromSourceIndex(trace, sourceBitIndex) {
    const inputCellIndex = trace.sourceBitIndexByInputCell.findIndex(value => value === sourceBitIndex);
    return inputCellIndex >= 0 ? trace.inputProjectionPointIds[inputCellIndex] : -1;
  }

  function firstPayloadPoint(trace) {
    for (let pointId = 0; pointId < trace.sourceBitIndexByPoint.length; pointId += 1) if (trace.sourceBitIndexByPoint[pointId] >= 0) return pointId;
    return 0;
  }

  function describeTraceBlock(trace, packageObject) {
    if (!trace || !packageObject) fail('A canonical trace and package are required for block inspection.');
    const sourceBitsConsumed = trace.sourceBitRange.consumed;
    const partialPayloadFillerCells = Math.max(0, packageObject.payloadCapacity - sourceBitsConsumed);
    const maskFillerCells = trace.cellCount - packageObject.payloadCapacity;
    const ciphertextStart = trace.blockIndex * trace.cellCount;
    const ciphertextEndExclusive = ciphertextStart + trace.cellCount;
    return Object.freeze({
      blockIndex: trace.blockIndex,
      sourceStart: trace.sourceBitRange.start,
      sourceEndExclusive: trace.sourceBitRange.endExclusive,
      sourceBitsConsumed,
      ciphertextStart,
      ciphertextEndExclusive,
      payloadCapacity: packageObject.payloadCapacity,
      partialPayloadFillerCells,
      maskFillerCells,
      totalFillerCells: trace.cellCount - sourceBitsConsumed,
      finalPartialBlock: trace.blockIndex === packageObject.blockCount - 1 && partialPayloadFillerCells > 0,
      validated: trace.outputBlock === packageObject.ciphertext.slice(ciphertextStart, ciphertextEndExclusive)
    });
  }

  function locateSourceBit(traces, sourceBitIndexValue) {
    const sourceBitIndex = Number(sourceBitIndexValue);
    if (!Number.isInteger(sourceBitIndex) || sourceBitIndex < 0) fail('Source bit index must be a non-negative integer.');
    for (const trace of traces || []) {
      if (sourceBitIndex < trace.sourceBitRange.start || sourceBitIndex >= trace.sourceBitRange.endExclusive) continue;
      const pointId = trace.sourceBitIndexByPoint.indexOf(sourceBitIndex);
      if (pointId < 0) fail(`Source bit ${sourceBitIndex} is inside block ${trace.blockIndex} but has no point identity.`);
      const inputCellIndex = trace.inputCellIndexByPoint[pointId];
      const outputCellIndex = trace.outputCellIndexByPoint[pointId];
      return Object.freeze({
        sourceBitIndex,
        blockIndex: trace.blockIndex,
        pointId,
        inputCellIndex,
        outputCellIndex,
        ciphertextIndex: trace.blockIndex * trace.cellCount + outputCellIndex,
        bit: trace.bitByPoint[pointId]
      });
    }
    fail(`Source bit index ${sourceBitIndex} is outside the active package.`);
  }

  function locateCiphertextBit(traces, ciphertextIndexValue) {
    const ciphertextIndex = Number(ciphertextIndexValue);
    if (!Number.isInteger(ciphertextIndex) || ciphertextIndex < 0) fail('Ciphertext bit index must be a non-negative integer.');
    const collection = traces || [];
    if (!collection.length) fail('A trace collection is required for ciphertext inspection.');
    const cellCount = collection[0].cellCount;
    const blockIndex = Math.floor(ciphertextIndex / cellCount);
    if (blockIndex < 0 || blockIndex >= collection.length) fail(`Ciphertext bit index ${ciphertextIndex} is outside the active package.`);
    const trace = collection[blockIndex];
    const outputCellIndex = ciphertextIndex % cellCount;
    const pointId = trace.outputProjectionPointIds[outputCellIndex];
    return Object.freeze({
      ciphertextIndex,
      blockIndex,
      pointId,
      inputCellIndex: trace.inputCellIndexByPoint[pointId],
      outputCellIndex,
      sourceBitIndex: trace.sourceBitIndexByPoint[pointId],
      bit: trace.outputBlock[outputCellIndex],
      kind: trace.cellKindByPoint[pointId]
    });
  }

  function sequenceBlockIndex(currentIndexValue, directionValue, blockCountValue, wrap = false) {
    const currentIndex = Number(currentIndexValue);
    const direction = Math.sign(Number(directionValue));
    const blockCount = Number(blockCountValue);
    if (!Number.isInteger(currentIndex) || !Number.isInteger(blockCount) || blockCount < 1 || currentIndex < 0 || currentIndex >= blockCount || !direction) return null;
    const target = currentIndex + direction;
    if (target >= 0 && target < blockCount) return target;
    if (!wrap) return null;
    return direction > 0 ? 0 : blockCount - 1;
  }

  function effectivePlaybackMode(scopeValue, cohortValue) {
    const scope = PLAYBACK_SCOPES.includes(scopeValue) ? scopeValue : 'selected-block';
    if (scope === 'selected-bit') return 'selected';
    if (scope === 'selected-row') return 'row';
    if (scope === 'overview-only') return 'all';
    return RendererApi?.constants?.PLAYBACK_MODES?.includes(cohortValue) ? cohortValue : 'all';
  }

  function isPackagePlaybackScope(scopeValue = playbackScope) {
    return scopeValue === 'all-blocks' || scopeValue === 'overview-only';
  }

  function traceCellButton(bit, pointId, label, kind, extra = '') {
    return `<button type="button" class="cube-trace-cell ${escapeHtml(kind)} ${escapeHtml(extra)}" data-cube-trace-point="${pointId}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${bit}</span><small>P${pointId}</small></button>`;
  }

  function renderTraceCollections(panel) {
    const trace = activeTrace;
    if (!trace) return;
    const payloadCells = new Set(trace.payloadCellIndexes);
    const sourceButtons = [];
    for (let localIndex = 0; localIndex < trace.sourceBits.length; localIndex += 1) {
      const sourceIndex = trace.sourceBitRange.start + localIndex;
      const pointId = tracePointFromSourceIndex(trace, sourceIndex);
      sourceButtons.push(traceCellButton(trace.sourceBits[localIndex], pointId, `Source bit ${sourceIndex}, point ${pointId}`, 'payload'));
    }
    panel.querySelector('[data-cube-trace-source-strip]').innerHTML = sourceButtons.join('');

    const framedButtons = [];
    const inputButtons = [];
    for (let inputCellIndex = 0; inputCellIndex < trace.cellCount; inputCellIndex += 1) {
      const pointId = trace.inputProjectionPointIds[inputCellIndex];
      const kind = trace.cellKindByPoint[pointId];
      const bit = trace.framedBlock[inputCellIndex];
      const sourceIndex = trace.sourceBitIndexByInputCell[inputCellIndex];
      const partialFiller = sourceIndex < 0 && payloadCells.has(inputCellIndex) ? 'partial-filler' : '';
      framedButtons.push(traceCellButton(bit, pointId, `Framed input cell ${inputCellIndex}, ${kind}, source ${sourceIndex >= 0 ? sourceIndex : 'filler'}, point ${pointId}`, kind, partialFiller));
      inputButtons.push(traceCellButton(bit, pointId, `Input face cell ${inputCellIndex}, point ${pointId}`, kind, `${partialFiller} input-face`));
    }
    panel.querySelector('[data-cube-trace-framed-grid]').innerHTML = framedButtons.join('');
    panel.querySelector('[data-cube-trace-input-grid]').innerHTML = inputButtons.join('');

    panel.querySelector('[data-cube-trace-point-grid]').innerHTML = trace.pointField.map(point => {
      const kind = trace.cellKindByPoint[point.id];
      const inputCellIndex = trace.inputCellIndexByPoint[point.id];
      const partialFiller = trace.sourceBitIndexByPoint[point.id] < 0 && payloadCells.has(inputCellIndex) ? 'partial-filler' : '';
      return traceCellButton(trace.bitByPoint[point.id], point.id, `Point ${point.id} at (${point.x}, ${point.y}, ${point.z}), ${kind}`, kind, `${partialFiller} point-field`);
    }).join('');

    const outputButtons = [];
    const outputStrip = [];
    for (let outputIndex = 0; outputIndex < trace.cellCount; outputIndex += 1) {
      const pointId = trace.outputProjectionPointIds[outputIndex];
      const bit = trace.outputBlock[outputIndex];
      const kind = trace.cellKindByPoint[pointId];
      const packageOutputIndex = trace.blockIndex * trace.cellCount + outputIndex;
      const partialFiller = trace.sourceBitIndexByPoint[pointId] < 0 && payloadCells.has(trace.inputCellIndexByPoint[pointId]) ? 'partial-filler' : '';
      outputButtons.push(traceCellButton(bit, pointId, `Output face cell ${outputIndex}, package ciphertext index ${packageOutputIndex}, point ${pointId}`, kind, `${partialFiller} output-face`));
      outputStrip.push(traceCellButton(bit, pointId, `Encrypted package index ${packageOutputIndex}, point ${pointId}`, kind, `${partialFiller} encrypted-output`));
    }
    panel.querySelector('[data-cube-trace-output-grid]').innerHTML = outputButtons.join('');
    panel.querySelector('[data-cube-trace-output-strip]').innerHTML = outputStrip.join('');
  }

  function selectedTraceDetails() {
    if (!activeTrace) return null;
    const pointId = selectedPointId;
    const point = activeTrace.pointField[pointId];
    const inputCellIndex = activeTrace.inputCellIndexByPoint[pointId];
    const outputCellIndex = activeTrace.outputCellIndexByPoint[pointId];
    const sourceBitIndex = activeTrace.sourceBitIndexByPoint[pointId];
    return Object.freeze({
      pointId,
      x: point.x,
      y: point.y,
      z: point.z,
      kind: activeTrace.cellKindByPoint[pointId],
      bit: activeTrace.bitByPoint[pointId],
      sourceBitIndex,
      inputCellIndex,
      inputRow: Math.floor(inputCellIndex / activeTrace.gridSize),
      outputCellIndex,
      finalOutputIndex: activeTrace.blockIndex * activeTrace.cellCount + outputCellIndex,
      finalBit: activeTrace.outputBlock[outputCellIndex]
    });
  }

  function timelineState() {
    return activeTrace ? RendererApi.resolveTraceTimeline(traceTime, activeTrace.phases.length) : null;
  }

  function updateInspector(panel) {
    const details = selectedTraceDetails();
    if (!details) {
      panel.querySelector('[data-cube-trace-inspector]').textContent = 'Encrypt or import a package to inspect a selected block.';
      return;
    }
    const rendered = renderer?.getTraceState?.();
    const visibleMode = effectivePlaybackMode(playbackScope, playbackMode);
    const animatedPosition = rendered?.selectedPosition || RendererApi.tracePointPosition(activeTrace, details.pointId, traceTime, details.pointId, visibleMode);
    panel.querySelector('[data-cube-trace-point-id]').value = String(details.pointId);
    panel.querySelector('[data-cube-trace-point-id]').max = String(activeTrace.cellCount - 1);
    panel.querySelector('[data-cube-trace-inspector]').innerHTML = `
      <dl>
        <div><dt>Package block</dt><dd>${activeTrace.blockIndex + 1} / ${activeTraces.length}</dd></div>
        <div><dt>Point identity</dt><dd>P${details.pointId}</dd></div>
        <div><dt>Canonical coordinate</dt><dd>(${details.x}, ${details.y}, ${details.z})</dd></div>
        <div><dt>Animated position</dt><dd>(${animatedPosition.map(value => value.toFixed(3)).join(', ')})</dd></div>
        <div><dt>Cell type</dt><dd>${title(details.kind)}</dd></div>
        <div><dt>Source index</dt><dd>${details.sourceBitIndex >= 0 ? details.sourceBitIndex : 'Deterministic filler'}</dd></div>
        <div><dt>Input face index</dt><dd>${details.inputCellIndex}</dd></div>
        <div><dt>Input row cohort</dt><dd>${details.inputRow}</dd></div>
        <div><dt>Point bit</dt><dd>${details.bit}</dd></div>
        <div><dt>Output face index</dt><dd>${details.outputCellIndex}</dd></div>
        <div><dt>Package output index</dt><dd>${details.finalOutputIndex}</dd></div>
        <div><dt>Final bit</dt><dd>${details.finalBit}</dd></div>
      </dl>`;
    panel.querySelectorAll('[data-cube-trace-point]').forEach(button => {
      const pointId = Number(button.dataset.cubeTracePoint);
      button.classList.toggle('selected', pointId === details.pointId);
      const pointInputIndex = activeTrace.inputCellIndexByPoint[pointId];
      const sameRow = Math.floor(pointInputIndex / activeTrace.gridSize) === details.inputRow;
      button.classList.toggle('cohort', visibleMode === 'row' && sameRow);
      button.classList.toggle('motion-muted', visibleMode === 'selected' && pointId !== details.pointId);
    });
  }

  function updateCounters(panel) {
    const details = selectedTraceDetails();
    const state = timelineState();
    const values = {
      source: activeTrace?.sourceBitRange.consumed ?? 0,
      payload: activeTrace?.payloadCellIndexes.length ?? 0,
      filler: activeTrace ? activeTrace.cellCount - activeTrace.sourceBitRange.consumed : 0,
      block: activeTrace ? `${activeTrace.blockIndex + 1}/${activeTraces.length}` : '—',
      point: details?.pointId ?? '—',
      input: details?.inputCellIndex ?? '—',
      output: details?.outputCellIndex ?? '—',
      final: details?.finalOutputIndex ?? '—',
      time: state ? `${(state.traceTime * 100).toFixed(1)}%` : '—',
      progress: state ? `${(state.segmentProgress * 100).toFixed(1)}%` : '—'
    };
    for (const [name, value] of Object.entries(values)) {
      const node = panel.querySelector(`[data-cube-trace-counter="${name}"]`);
      if (node) node.textContent = String(value);
    }
  }

  function updatePhaseMarkers(panel, state) {
    panel.querySelectorAll('[data-cube-trace-marker]').forEach(button => {
      const markerIndex = Number(button.dataset.cubeTraceMarker);
      button.classList.toggle('active', markerIndex === state.phaseIndex);
      button.classList.toggle('complete', markerIndex < state.phaseIndex || state.traceTime === 1);
      button.setAttribute('aria-current', markerIndex === state.phaseIndex ? 'step' : 'false');
    });
  }

  function updatePlaybackControls(panel, state) {
    const packageScope = isPackagePlaybackScope();
    const atStart = state.traceTime <= 0 && (!packageScope || selectedBlockIndex === 0);
    const atEnd = state.traceTime >= 1 && (!packageScope || selectedBlockIndex === activeTraces.length - 1);
    panel.querySelector('[data-cube-trace-first]').disabled = atStart;
    panel.querySelector('[data-cube-trace-previous]').disabled = atStart;
    panel.querySelector('[data-cube-trace-reverse-play]').disabled = atStart && playbackDirection >= 0;
    panel.querySelector('[data-cube-trace-next]').disabled = atEnd;
    panel.querySelector('[data-cube-trace-last]').disabled = atEnd;
    panel.querySelector('[data-cube-trace-play]').disabled = atEnd && playbackDirection <= 0;
    panel.querySelector('[data-cube-trace-pause]').disabled = playbackDirection === 0;
    panel.querySelector('[data-cube-trace-play]').classList.toggle('active', playbackDirection > 0);
    panel.querySelector('[data-cube-trace-reverse-play]').classList.toggle('active', playbackDirection < 0);
    const timeline = panel.querySelector('[data-cube-trace-timeline]');
    timeline.value = String(Math.round(state.traceTime * 1000));
    panel.querySelector('[data-cube-trace-timeline-readout]').textContent = `${(state.traceTime * 100).toFixed(1)}% · segment ${(state.segmentProgress * 100).toFixed(1)}%`;
  }

  function updateTimelineDisplay(panel) {
    if (!activeTrace) return;
    const state = timelineState();
    const currentPhase = activeTrace.phases[state.phaseIndex];
    const nextPhase = activeTrace.phases[state.nextPhaseIndex];
    const transition = state.phaseIndex === state.nextPhaseIndex ? currentPhase.id : `${currentPhase.id} → ${nextPhase.id}`;
    panel.querySelector('[data-cube-trace-phase-name]').textContent = `Block ${activeTrace.blockIndex + 1}/${activeTraces.length} · phase ${state.phaseIndex + 1}/${activeTrace.phases.length} · ${transition.replaceAll('-', ' ')}`;
    panel.querySelectorAll('[data-cube-trace-stage]').forEach(stage => {
      const stageIndex = Number(stage.dataset.cubeTraceStage);
      stage.hidden = stageIndex > state.nextPhaseIndex;
      stage.classList.toggle('active', stageIndex === state.phaseIndex || (state.segmentProgress > 0 && stageIndex === state.nextPhaseIndex));
    });
    const rendererTime = playbackScope === 'overview-only' ? 5 / Math.max(1, activeTrace.phases.length - 1) : state.traceTime;
    renderer?.setTraceTimelineState(activeTrace, rendererTime, selectedPointId, effectivePlaybackMode(playbackScope, playbackMode));
    updateBlockTimeline(panel);
    updatePhaseMarkers(panel, state);
    updatePlaybackControls(panel, state);
    updateCounters(panel);
    updateInspector(panel);
  }

  function requestFrame(callback) {
    if (typeof root?.requestAnimationFrame === 'function') return root.requestAnimationFrame(callback);
    return root.setTimeout(() => callback(Date.now()), 16);
  }

  function cancelFrame(handle) {
    if (handle == null) return;
    if (typeof root?.cancelAnimationFrame === 'function') root.cancelAnimationFrame(handle);
    else root.clearTimeout(handle);
  }

  function pausePlayback(panel, announce = false) {
    cancelFrame(playbackFrame);
    playbackFrame = null;
    playbackLastTimestamp = null;
    const wasPlaying = playbackDirection !== 0;
    playbackDirection = 0;
    if (activeTrace && panel) updateTimelineDisplay(panel);
    if (announce && wasPlaying) setStatus(panel, `Playback paused at ${(traceTime * 100).toFixed(1)}%. The selected package block remains inspectable.`, 'success');
  }

  function setTraceTime(panel, value, options = {}) {
    if (!activeTrace) fail('Select a package block before changing trace time.');
    traceTime = clamp(Number(value) || 0, 0, 1);
    if (!options.keepPlaying) pausePlayback(panel, false);
    updateTimelineDisplay(panel);
  }

  function phaseBoundaryTime(phaseIndex) {
    return phaseIndex / Math.max(1, activeTrace.phases.length - 1);
  }

  function setPhase(panel, phaseIndexValue) {
    if (!activeTrace) fail('Select a package block before stepping phases.');
    const phaseIndex = clamp(Math.round(Number(phaseIndexValue) || 0), 0, activeTrace.phases.length - 1);
    setTraceTime(panel, phaseBoundaryTime(phaseIndex));
  }

  function stepPhase(panel, direction) {
    if (!activeTrace) fail('Select a package block before stepping phases.');
    const state = timelineState();
    const target = direction > 0
      ? Math.min(activeTrace.phases.length - 1, Math.floor(state.phasePosition + 1e-9) + 1)
      : Math.max(0, Math.ceil(state.phasePosition - 1e-9) - 1);
    setPhase(panel, target);
  }

  function playbackTick(panel, timestamp) {
    if (!activeTrace || playbackDirection === 0 || panel.hidden) {
      pausePlayback(panel, false);
      return;
    }
    if (playbackLastTimestamp == null) playbackLastTimestamp = timestamp;
    const elapsed = Math.min(100, Math.max(0, timestamp - playbackLastTimestamp));
    playbackLastTimestamp = timestamp;
    const duration = playbackScope === 'overview-only' ? OVERVIEW_BLOCK_DURATION_MS : PLAYBACK_DURATION_MS;
    const nextTime = traceTime + playbackDirection * elapsed * playbackSpeed / duration;
    const reachedBoundary = playbackDirection > 0 ? nextTime >= 1 : nextTime <= 0;
    traceTime = clamp(nextTime, 0, 1);
    updateTimelineDisplay(panel);
    if (reachedBoundary && isPackagePlaybackScope()) {
      const targetBlock = sequenceBlockIndex(selectedBlockIndex, playbackDirection, activeTraces.length, false);
      if (targetBlock !== null) {
        const direction = playbackDirection;
        loadSelectedBlock(panel, targetBlock, { quiet: true, keepPlaying: true, traceTime: direction > 0 ? 0 : 1 });
        playbackDirection = direction;
        playbackLastTimestamp = timestamp;
        setStatus(panel, `${direction > 0 ? 'Advanced to' : 'Returned to'} package block ${targetBlock + 1} of ${activeTraces.length}. Package ciphertext is unchanged.`, 'success');
        playbackFrame = requestFrame(nextTimestamp => playbackTick(panel, nextTimestamp));
        return;
      }
    }
    if (reachedBoundary) {
      const directionText = playbackDirection > 0 ? 'completed' : 'returned to the beginning';
      pausePlayback(panel, false);
      setStatus(panel, `${playbackScope.replaceAll('-', ' ')} playback ${directionText}. Package state and ciphertext were unchanged.`, 'success');
      return;
    }
    playbackFrame = requestFrame(nextTimestamp => playbackTick(panel, nextTimestamp));
  }

  function startPlayback(panel, direction) {
    if (!activeTrace) fail('Select a package block before playback.');
    if (direction !== 1 && direction !== -1) fail('Playback direction must be forward or reverse.');
    pausePlayback(panel, false);
    if (isPackagePlaybackScope()) {
      if (direction > 0 && traceTime >= 1) loadSelectedBlock(panel, sequenceBlockIndex(selectedBlockIndex, 1, activeTraces.length, true), { quiet: true, keepPlaying: true, traceTime: 0 });
      if (direction < 0 && traceTime <= 0) loadSelectedBlock(panel, sequenceBlockIndex(selectedBlockIndex, -1, activeTraces.length, true), { quiet: true, keepPlaying: true, traceTime: 1 });
    } else {
      if (direction > 0 && traceTime >= 1) traceTime = 0;
      if (direction < 0 && traceTime <= 0) traceTime = 1;
    }
    playbackDirection = direction;
    playbackLastTimestamp = null;
    updateTimelineDisplay(panel);
    playbackFrame = requestFrame(timestamp => playbackTick(panel, timestamp));
    setStatus(panel, `${direction > 0 ? 'Forward' : 'Reverse'} playback started for ${playbackScope.replaceAll('-', ' ')} at ${playbackSpeed}×.`, 'success');
  }

  function selectPoint(panel, pointIdValue) {
    if (!activeTrace) fail('Select a package block before selecting a point.');
    const pointId = Number(pointIdValue);
    if (!Number.isInteger(pointId) || pointId < 0 || pointId >= activeTrace.cellCount) fail(`Point ID must be an integer from 0 through ${activeTrace.cellCount - 1}.`);
    selectedPointId = pointId;
    updateTimelineDisplay(panel);
  }

  function clearTrace(panel, message = '') {
    activeTrace = null;
    pausePlayback(panel, false);
    traceTime = 0;
    selectedPointId = 0;
    renderer?.clearTraceState();
    panel.querySelector('[data-cube-trace-workspace]').hidden = true;
    panel.querySelector('[data-cube-trace-unavailable]').hidden = false;
    panel.querySelector('[data-cube-trace-unavailable]').textContent = message || 'Encrypt or import a package to select a block for animation.';
  }

  function clearPackage(panel, message = '') {
    activePackage = null;
    activeTraces = [];
    selectedBlockIndex = 0;
    recoveredBits = '';
    roundTripValid = false;
    panel.querySelector('[data-cube-encoder-package]').value = '';
    panel.querySelector('[data-cube-encoder-recovered]').value = '';
    panel.querySelector('[data-cube-encoder-block]').replaceChildren();
    panel.querySelector('[data-cube-encoder-block-timeline]').replaceChildren();
    panel.querySelector('[data-cube-encoder-range-inspector]').textContent = 'No package block is selected.';
    panel.querySelector('[data-cube-encoder-package-summary]').textContent = message || 'No encrypted package is active.';
    panel.querySelector('[data-cube-encoder-roundtrip]').textContent = 'Round trip not yet validated.';
    panel.querySelector('[data-cube-encoder-roundtrip]').dataset.state = 'idle';
    clearTrace(panel, message || 'Encrypt or import a package to select a block for animation.');
  }

  function renderPhaseMarkers(panel) {
    panel.querySelector('[data-cube-trace-markers]').innerHTML = activeTrace.phases.map((phase, index) => `<button type="button" class="cube-trace-marker" data-cube-trace-marker="${index}" title="Jump to phase ${index + 1}: ${escapeHtml(phase.id)}"><span>${index + 1}</span><small>${escapeHtml(phase.id.replaceAll('-', ' '))}</small></button>`).join('');
  }

  function buildTraceCollection(bitsValue, key, packageObject) {
    const bits = normalizeBits(bitsValue);
    const traces = [];
    const cellCount = key.gridSize * key.gridSize;
    for (let blockIndex = 0; blockIndex < packageObject.blockCount; blockIndex += 1) {
      const trace = Engine.traceEncryptBlock(bits, key, blockIndex);
      Engine.validateTransformationTrace(trace, key);
      const expectedBlock = packageObject.ciphertext.slice(blockIndex * cellCount, (blockIndex + 1) * cellCount);
      if (trace.outputBlock !== expectedBlock) fail(`Trace block ${blockIndex} does not match the canonical package ciphertext.`);
      traces.push(trace);
    }
    if (traces.map(trace => trace.outputBlock).join('') !== packageObject.ciphertext) fail('The complete trace collection does not reconstruct the canonical package ciphertext.');
    return Object.freeze(traces);
  }

  function populateBlockSelector(panel) {
    const select = panel.querySelector('[data-cube-encoder-block]');
    select.replaceChildren(...activeTraces.map(trace => {
      const option = document.createElement('option');
      option.value = String(trace.blockIndex);
      const descriptor = describeTraceBlock(trace, activePackage);
      option.textContent = `Block ${trace.blockIndex + 1} · source ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1} · ciphertext ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}${descriptor.finalPartialBlock ? ' · FINAL PARTIAL' : ''}`;
      option.selected = trace.blockIndex === selectedBlockIndex;
      return option;
    }));
    panel.querySelector('[data-cube-encoder-source-index]').max = String(Math.max(0, activePackage.originalBitLength - 1));
    panel.querySelector('[data-cube-encoder-ciphertext-index]').max = String(Math.max(0, activePackage.ciphertext.length - 1));
    renderBlockTimeline(panel);
  }

  function renderBlockTimeline(panel) {
    const target = panel.querySelector('[data-cube-encoder-block-timeline]');
    if (!target) return;
    target.innerHTML = activeTraces.map(trace => {
      const descriptor = describeTraceBlock(trace, activePackage);
      const classes = ['cube-block-marker', descriptor.finalPartialBlock ? 'partial' : '', descriptor.validated ? 'validated' : 'invalid'].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-cube-encoder-block-marker="${trace.blockIndex}" title="Source ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1}; ciphertext ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}; ${descriptor.totalFillerCells} filler cells"><strong>${trace.blockIndex + 1}</strong><span>S ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1}</span><span>C ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}</span><small>${descriptor.finalPartialBlock ? 'FINAL PARTIAL' : 'VALID'}</small></button>`;
    }).join('');
    updateBlockTimeline(panel);
  }

  function updateBlockTimeline(panel) {
    panel.querySelectorAll('[data-cube-encoder-block-marker]').forEach(button => {
      const blockIndex = Number(button.dataset.cubeEncoderBlockMarker);
      button.classList.toggle('active', blockIndex === selectedBlockIndex);
      button.setAttribute('aria-current', blockIndex === selectedBlockIndex ? 'step' : 'false');
    });
  }

  function renderBlockRangeInspector(panel) {
    const target = panel.querySelector('[data-cube-encoder-range-inspector]');
    if (!target || !activePackage || !activeTraces.length) return;
    const descriptor = describeTraceBlock(activeTraces[selectedBlockIndex], activePackage);
    target.innerHTML = `<strong>Block ${descriptor.blockIndex + 1} of ${activeTraces.length}${descriptor.finalPartialBlock ? ' · final partial block' : ''}</strong><span>Source bits ${descriptor.sourceStart}-${descriptor.sourceEndExclusive - 1} (${descriptor.sourceBitsConsumed} consumed)</span><span>Ciphertext bits ${descriptor.ciphertextStart}-${descriptor.ciphertextEndExclusive - 1}</span><span>${descriptor.partialPayloadFillerCells} partial payload filler · ${descriptor.maskFillerCells} mask filler · ${descriptor.totalFillerCells} total deterministic filler</span><span>${descriptor.validated ? 'Trace output validated against the exact package slice.' : 'Trace validation failed.'}</span>`;
    panel.querySelector('[data-cube-encoder-previous-block]').disabled = selectedBlockIndex <= 0;
    panel.querySelector('[data-cube-encoder-next-block]').disabled = selectedBlockIndex >= activeTraces.length - 1;
  }

  function selectAdjacentBlock(panel, direction) {
    const target = sequenceBlockIndex(selectedBlockIndex, direction, activeTraces.length, false);
    if (target === null) return;
    loadSelectedBlock(panel, target);
  }

  function jumpToSourceBit(panel, sourceBitIndexValue) {
    const location = locateSourceBit(activeTraces, sourceBitIndexValue);
    loadSelectedBlock(panel, location.blockIndex, { quiet: true, pointId: location.pointId, traceTime: 0 });
    setStatus(panel, `Source bit ${location.sourceBitIndex} is block ${location.blockIndex + 1}, point P${location.pointId}, input cell ${location.inputCellIndex}, and ciphertext index ${location.ciphertextIndex}.`, 'success');
    return location;
  }

  function jumpToCiphertextBit(panel, ciphertextIndexValue) {
    const location = locateCiphertextBit(activeTraces, ciphertextIndexValue);
    loadSelectedBlock(panel, location.blockIndex, { quiet: true, pointId: location.pointId, traceTime: 8 / 9 });
    setStatus(panel, `Ciphertext bit ${location.ciphertextIndex} is block ${location.blockIndex + 1}, output cell ${location.outputCellIndex}, point P${location.pointId}, and ${location.sourceBitIndex >= 0 ? `source bit ${location.sourceBitIndex}` : 'deterministic filler'}.`, 'success');
    return location;
  }

  function renderPackageSummary(panel) {
    if (!activePackage || !activeKey) return;
    const inactive = activeKey.mask.filter(value => !value).length;
    panel.querySelector('[data-cube-encoder-package-summary]').innerHTML = `
      <strong>Package ${escapeHtml(activePackage.checksum)} validated against key ${escapeHtml(activeKey.keyId)}</strong>
      <span>${activePackage.originalBitLength.toLocaleString()} source bits · ${activePackage.blockCount.toLocaleString()} block${activePackage.blockCount === 1 ? '' : 's'} · ${activePackage.ciphertext.length.toLocaleString()} ciphertext bits</span>
      <span>${activePackage.payloadCapacity.toLocaleString()} payload cells per block · ${inactive.toLocaleString()} deterministic filler cells · selected block ${selectedBlockIndex + 1}</span>
      <span>${escapeHtml(activePackage.checksumType)}</span>`;
    const roundTripNode = panel.querySelector('[data-cube-encoder-roundtrip]');
    roundTripNode.textContent = roundTripValid
      ? 'Round trip verified: decrypting and re-encrypting reproduces the exact source bits and package JSON.'
      : 'Round trip has not been verified.';
    roundTripNode.dataset.state = roundTripValid ? 'valid' : 'idle';
  }

  function loadSelectedBlock(panel, blockIndexValue, options = {}) {
    if (!activePackage || !activeTraces.length) fail('Encrypt or import a package before selecting a block.');
    const blockIndex = Number(blockIndexValue);
    if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= activeTraces.length) fail(`Block index must be from 0 through ${activeTraces.length - 1}.`);
    if (!options.keepPlaying) pausePlayback(panel, false);
    selectedBlockIndex = blockIndex;
    panel.querySelector('[data-cube-encoder-block]').value = String(blockIndex);
    renderPackageSummary(panel);
    updateBlockTimeline(panel);
    renderBlockRangeInspector(panel);
    if (activeKey.gridSize > MAX_MANUAL_TRACE_GRID_SIZE) {
      clearTrace(panel, `Package block ${blockIndex + 1} is valid, but V8 detailed animation supports grids through ${MAX_MANUAL_TRACE_GRID_SIZE} × ${MAX_MANUAL_TRACE_GRID_SIZE}. The complete ${activeKey.gridSize} × ${activeKey.gridSize} point field remains visible.`);
      return;
    }
    activeTrace = activeTraces[blockIndex];
    traceTime = options.traceTime == null ? 0 : clamp(Number(options.traceTime) || 0, 0, 1);
    const requestedPoint = Number(options.pointId);
    selectedPointId = Number.isInteger(requestedPoint) && requestedPoint >= 0 && requestedPoint < activeTrace.cellCount ? requestedPoint : firstPayloadPoint(activeTrace);
    renderTraceCollections(panel);
    renderPhaseMarkers(panel);
    panel.querySelector('[data-cube-trace-workspace]').hidden = false;
    panel.querySelector('[data-cube-trace-unavailable]').hidden = true;
    updateTimelineDisplay(panel);
    if (!options.quiet) setStatus(panel, `Package block ${blockIndex + 1} selected. Its trace output exactly matches ciphertext indexes ${blockIndex * activeTrace.cellCount} through ${(blockIndex + 1) * activeTrace.cellCount - 1}.`, 'success');
  }

  function applyPackage(panel, packageObjectValue, sourceBitsValue, options = {}) {
    if (!activeKey) fail('Generate or import a canonical key before loading a package.');
    const packageObject = Engine.validatePackage(packageObjectValue, activeKey);
    const sourceBits = normalizeBits(sourceBitsValue, 'Recovered package plaintext');
    if (sourceBits.length !== packageObject.originalBitLength) fail('Recovered plaintext length does not match the package framing metadata.');
    const traces = buildTraceCollection(sourceBits, activeKey, packageObject);
    const decrypted = Engine.decryptBinary(packageObject, activeKey);
    const reencrypted = Engine.encryptBinary(decrypted, activeKey);
    const exactPackage = JSON.stringify(reencrypted) === JSON.stringify(packageObject);
    activePackage = packageObject;
    activeTraces = traces;
    recoveredBits = decrypted;
    roundTripValid = decrypted === sourceBits && exactPackage;
    selectedBlockIndex = clamp(Number(options.selectedBlockIndex) || 0, 0, traces.length - 1);
    panel.querySelector('[data-cube-encoder-package]').value = JSON.stringify(packageObject, null, 2);
    panel.querySelector('[data-cube-encoder-recovered]').value = decrypted;
    populateBlockSelector(panel);
    renderPackageSummary(panel);
    loadSelectedBlock(panel, selectedBlockIndex, { quiet: true });
    return Object.freeze({ key: activeKey, packageObject, traces, recoveredBits: decrypted, roundTripValid });
  }

  function encryptCurrentInput(panel, options = {}) {
    if (!activeKey) fail('Generate or import a canonical key before encryption.');
    const bits = normalizeBits(panel.querySelector('[data-cube-trace-bits]').value);
    const packageObject = Engine.encryptBinary(bits, activeKey);
    const result = applyPackage(panel, packageObject, bits, { selectedBlockIndex: options.selectedBlockIndex ?? 0 });
    if (!result.roundTripValid) fail('Round-trip validation failed after canonical encryption.');
    if (!options.quiet) setStatus(panel, `${packageObject.originalBitLength} bits encrypted into ${packageObject.blockCount} canonical package block${packageObject.blockCount === 1 ? '' : 's'}; block ${selectedBlockIndex + 1} is ready for animation.`, 'success');
    return result;
  }

  function loadPackageFromText(panel, options = {}) {
    if (!activeKey) fail('Generate or import the matching key before loading a package.');
    const packageObject = Engine.validatePackage(parsePackage(panel), activeKey);
    const plaintext = Engine.decryptBinary(packageObject, activeKey);
    if (options.populateInput !== false) panel.querySelector('[data-cube-trace-bits]').value = plaintext;
    const result = applyPackage(panel, packageObject, plaintext, { selectedBlockIndex: options.selectedBlockIndex ?? 0 });
    if (!result.roundTripValid) fail('Imported package failed exact decrypt/re-encrypt validation.');
    if (!options.quiet) setStatus(panel, `Imported package ${packageObject.checksum} decrypted and verified against key ${activeKey.keyId}.`, 'success');
    return result;
  }

  function validateCurrentPair(panel) {
    if (!activeKey) fail('Generate or import the matching key first.');
    const packageObject = Engine.validatePackage(parsePackage(panel), activeKey);
    const plaintext = Engine.decryptBinary(packageObject, activeKey);
    const result = applyPackage(panel, packageObject, plaintext, { selectedBlockIndex });
    if (!result.roundTripValid) fail('The key and package are structurally valid but failed exact round-trip comparison.');
    setStatus(panel, `Key ${activeKey.keyId}, checksum ${packageObject.checksum}, ${packageObject.blockCount} traces, and recovered plaintext all validated.`, 'success');
    return result;
  }

  function applyDraftState(panel, message) {
    renderer?.setDirectionState(rendererDirectionState());
    updateDirectionSummary(panel);
    clearPackage(panel, 'Key draft changed. Generate a canonical key before encrypting again.');
    if (message) setStatus(panel, message);
  }

  function markDraftChanged(panel, reason) {
    readDraftFromControls(panel);
    applyDraftState(panel, `${reason} The loaded canonical key JSON remains unchanged. Generate a new canonical draft key to apply it.`);
  }

  function renderKey(panel, key, origin = 'generated', options = {}) {
    const validated = Engine.validateKey(key);
    if (validated.gridSize > MAX_STATIC_GRID_SIZE) fail(`The detailed point renderer accepts grids through ${MAX_STATIC_GRID_SIZE} × ${MAX_STATIC_GRID_SIZE}. Full-resolution encoding remains available in the laboratory; larger rendering tiers are scheduled for V9.`);
    pausePlayback(panel, false);
    const points = Engine.buildPoints(validated);
    renderer.setScene({ gridSize: validated.gridSize, points });
    activeKey = validated;
    activeKeyOrigin = origin;
    syncControlsFromKey(panel, validated, options.maskMode || 'custom');
    renderer.setDirectionState(rendererDirectionState());
    panel.querySelector('[data-cube-visualizer-key]').value = JSON.stringify(validated, null, 2);
    panel.querySelector('[data-cube-visualizer-summary]').textContent = `Key ${validated.keyId} · ${validated.gridSize} × ${validated.gridSize} · ${points.length.toLocaleString()} exact keyed points · ${validated.mask.filter(Boolean).length.toLocaleString()} payload cells`;
    updateDirectionSummary(panel);
    clearPackage(panel, 'Canonical key loaded. Encrypt manual or file-derived bits to generate a complete package.');
    if (options.autoEncrypt !== false && panel.querySelector('[data-cube-trace-bits]').value.trim()) {
      encryptCurrentInput(panel, { quiet: true });
    }
    const originText = origin === 'generated' ? 'Generated canonical key' : origin === 'handoff' ? 'Handoff key' : 'Imported canonical key';
    const packageText = activePackage ? ` Package ${activePackage.checksum} is ready with ${activePackage.blockCount} block${activePackage.blockCount === 1 ? '' : 's'}.` : '';
    setStatus(panel, `${originText} ${validated.keyId} rendered.${packageText} Camera movement changes only the view.`, 'success');
    return validated;
  }

  function generateKey(panel) {
    const { key, maskMode } = createDraftKey(panel);
    return renderKey(panel, key, 'generated', { maskMode });
  }

  function handleFaceClick(panel, face) {
    if (!FACES.includes(face)) return;
    if (pickRole === 'input') {
      panel.querySelector('[data-cube-visualizer-input-face]').value = face;
      draftDirection.inputFace = face;
      rebuildOutputOptions(panel, draftDirection.outputFace);
      draftDirection.outputFace = panel.querySelector('[data-cube-visualizer-output-face]').value;
      setPickRole(panel, 'output');
      applyDraftState(panel, `${title(face)} selected as the draft input face. Choose one of its four legal perpendicular output faces.`);
      return;
    }
    if (!legalOutputFaces().includes(face)) {
      setStatus(panel, `${title(face)} cannot be the output face for ${title(draftDirection.inputFace)} input. Select a perpendicular face.`, 'error');
      return;
    }
    panel.querySelector('[data-cube-visualizer-output-face]').value = face;
    draftDirection.outputFace = face;
    applyDraftState(panel, `${title(face)} selected as the draft output face. The loaded canonical key remains unchanged until you generate a new key.`);
  }

  function installRenderer(panel) {
    if (renderer) return;
    const fallback = panel.querySelector('[data-cube-visualizer-fallback]');
    try {
      renderer = RendererApi.createRenderer({
        canvas: panel.querySelector('[data-cube-visualizer-canvas]'),
        labelLayer: panel.querySelector('[data-cube-visualizer-label-layer]'),
        onFaceClick: face => handleFaceClick(panel, face)
      });
      fallback.hidden = true;
    } catch (error) {
      fallback.hidden = false;
      fallback.textContent = `${error.message} The canonical key and package remain available as text, but this browser cannot display the V7 scene.`;
      setStatus(panel, error.message, 'error');
      throw error;
    }
  }

  async function importPlainFile(panel, file) {
    if (!file) fail('Choose an unencrypted file first.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.length) fail('The selected unencrypted file is empty.');
    sourceFileName = file.name || 'binary-cube-input.bin';
    panel.querySelector('[data-cube-trace-bits]').value = bytesToBits(bytes);
    panel.querySelector('[data-cube-encoder-file-note]').textContent = `${sourceFileName} · ${bytes.length.toLocaleString()} bytes · ${(bytes.length * 8).toLocaleString()} bits`;
    clearPackage(panel, 'File input changed. Encrypt the loaded bytes to create a canonical package.');
    setStatus(panel, `${sourceFileName} converted to ${bytes.length * 8} binary digits.`, 'success');
  }

  async function importJsonFile(file, label) {
    if (!file) fail(`Choose a ${label.toLowerCase()} first.`);
    return parseJsonText(await file.text(), label);
  }

  function handoffToLaboratory() {
    if (!root?.dispatchEvent || typeof root.CustomEvent !== 'function') fail('This runtime cannot dispatch a laboratory handoff.');
    root.dispatchEvent(new root.CustomEvent('shadowrun-binary-cube-open-laboratory', { detail: currentArtifacts() }));
  }

  function bind(panel) {
    if (panel.dataset.cubeVisualizerBound === 'true') return;
    panel.dataset.cubeVisualizerBound = 'true';
    panel.querySelector('[data-cube-visualizer-close]').addEventListener('click', () => { pausePlayback(panel, false); panel.hidden = true; });
    panel.querySelector('[data-cube-visualizer-generate]').addEventListener('click', () => { try { generateKey(panel); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-visualizer-load]').addEventListener('click', () => { try { renderKey(panel, parseKey(panel), 'imported', { autoEncrypt: false, maskMode: 'custom' }); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-visualizer-mask-mode]').addEventListener('change', () => {
      syncCustomMaskVisibility(panel);
      applyDraftState(panel, 'Mask draft changed. The loaded canonical key remains unchanged until a new key is generated.');
    });
    panel.querySelector('[data-cube-visualizer-custom-mask]').addEventListener('input', () => {
      if (panel.querySelector('[data-cube-visualizer-mask-mode]').value === 'custom') applyDraftState(panel, 'Custom mask draft changed. Generate a new canonical key before encryption.');
    });
    panel.querySelectorAll('[data-cube-visualizer-pick-role]').forEach(button => button.addEventListener('click', () => setPickRole(panel, button.dataset.cubeVisualizerPickRole)));
    panel.querySelector('[data-cube-visualizer-input-face]').addEventListener('change', () => markDraftChanged(panel, 'Input face draft changed.'));
    panel.querySelector('[data-cube-visualizer-output-face]').addEventListener('change', () => markDraftChanged(panel, 'Output face draft changed.'));
    panel.querySelector('[data-cube-visualizer-input-turns]').addEventListener('change', () => markDraftChanged(panel, 'Input orientation draft changed.'));
    panel.querySelector('[data-cube-visualizer-output-turns]').addEventListener('change', () => markDraftChanged(panel, 'Output orientation draft changed.'));
    panel.querySelector('[data-cube-visualizer-reset-camera]').addEventListener('click', () => renderer?.resetCamera());
    panel.querySelectorAll('[data-cube-visualizer-camera]').forEach(button => button.addEventListener('click', () => renderer?.setCameraPreset(button.dataset.cubeVisualizerCamera)));

    panel.querySelector('[data-cube-encoder-file]').addEventListener('change', async event => {
      try { await importPlainFile(panel, event.target.files?.[0]); }
      catch (error) { setStatus(panel, error.message, 'error'); }
      event.target.value = '';
    });
    panel.querySelector('[data-cube-encoder-import-key]').addEventListener('change', async event => {
      try {
        const key = Engine.validateKey(await importJsonFile(event.target.files?.[0], 'Key file'));
        renderKey(panel, key, 'imported', { autoEncrypt: false, maskMode: 'custom' });
      } catch (error) { setStatus(panel, error.message, 'error'); }
      event.target.value = '';
    });
    panel.querySelector('[data-cube-encoder-import-package]').addEventListener('change', async event => {
      try {
        const packageObject = await importJsonFile(event.target.files?.[0], 'Package file');
        panel.querySelector('[data-cube-encoder-package]').value = JSON.stringify(packageObject, null, 2);
        loadPackageFromText(panel);
      } catch (error) { setStatus(panel, error.message, 'error'); }
      event.target.value = '';
    });
    panel.querySelector('[data-cube-trace-build]').addEventListener('click', () => { try { encryptCurrentInput(panel); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-decrypt]').addEventListener('click', () => { try { loadPackageFromText(panel); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-validate]').addEventListener('click', () => { try { validateCurrentPair(panel); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-block]').addEventListener('change', event => { try { loadSelectedBlock(panel, event.target.value); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-previous-block]').addEventListener('click', () => { try { selectAdjacentBlock(panel, -1); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-next-block]').addEventListener('click', () => { try { selectAdjacentBlock(panel, 1); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-block-timeline]').addEventListener('click', event => { const button = event.target.closest('[data-cube-encoder-block-marker]'); if (button) { try { loadSelectedBlock(panel, button.dataset.cubeEncoderBlockMarker); } catch (error) { setStatus(panel, error.message, 'error'); } } });
    panel.querySelector('[data-cube-encoder-source-jump]').addEventListener('click', () => { try { jumpToSourceBit(panel, panel.querySelector('[data-cube-encoder-source-index]').value); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-ciphertext-jump]').addEventListener('click', () => { try { jumpToCiphertextBit(panel, panel.querySelector('[data-cube-encoder-ciphertext-index]').value); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-bits]').addEventListener('input', () => clearPackage(panel, 'Manual input changed. Encrypt again to rebuild the canonical package and traces.'));
    panel.querySelector('[data-cube-encoder-copy-package]').addEventListener('click', async () => { try { await copyText(panel.querySelector('[data-cube-encoder-package]').value); setStatus(panel, 'Package JSON copied.', 'success'); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-copy-key]').addEventListener('click', async () => { try { await copyText(panel.querySelector('[data-cube-visualizer-key]').value); setStatus(panel, 'Key JSON copied.', 'success'); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-download-package]').addEventListener('click', () => { try { if (!activePackage) validateCurrentPair(panel); downloadJson(activePackage, `shadowrun-binary-cube-package-${activePackage.keyId}.json`); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-download-key]').addEventListener('click', () => { try { const key = parseKey(panel); downloadJson(key, `shadowrun-binary-cube-key-${key.keyId}.json`); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-download-recovered]').addEventListener('click', () => { try { const bytes = bitsToBytes(panel.querySelector('[data-cube-encoder-recovered]').value); downloadBlob(new Blob([bytes], { type: 'application/octet-stream' }), `decrypted-${sourceFileName}`); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encoder-handoff-lab]').addEventListener('click', () => { try { handoffToLaboratory(); } catch (error) { setStatus(panel, error.message, 'error'); } });

    panel.querySelector('[data-cube-trace-first]').addEventListener('click', () => setPhase(panel, 0));
    panel.querySelector('[data-cube-trace-previous]').addEventListener('click', () => stepPhase(panel, -1));
    panel.querySelector('[data-cube-trace-next]').addEventListener('click', () => stepPhase(panel, 1));
    panel.querySelector('[data-cube-trace-last]').addEventListener('click', () => setPhase(panel, activeTrace ? activeTrace.phases.length - 1 : 0));
    panel.querySelector('[data-cube-trace-restart]').addEventListener('click', () => { if (activeTrace) { pausePlayback(panel, false); selectedPointId = firstPayloadPoint(activeTrace); setTraceTime(panel, 0); } });
    panel.querySelector('[data-cube-trace-play]').addEventListener('click', () => { try { startPlayback(panel, 1); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-reverse-play]').addEventListener('click', () => { try { startPlayback(panel, -1); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-pause]').addEventListener('click', () => pausePlayback(panel, true));
    panel.querySelector('[data-cube-trace-speed]').addEventListener('change', event => {
      const speed = Number(event.target.value);
      if (!PLAYBACK_SPEEDS.includes(speed)) return;
      playbackSpeed = speed;
      if (activeTrace) updateTimelineDisplay(panel);
    });
    panel.querySelector('[data-cube-trace-mode]').addEventListener('change', event => {
      const mode = event.target.value;
      if (!RendererApi.constants.PLAYBACK_MODES.includes(mode)) return;
      playbackMode = mode;
      if (activeTrace) updateTimelineDisplay(panel);
    });
    panel.querySelector('[data-cube-trace-scope]').addEventListener('change', event => {
      const scope = event.target.value;
      if (!PLAYBACK_SCOPES.includes(scope)) return;
      pausePlayback(panel, false);
      playbackScope = scope;
      if (activeTrace) updateTimelineDisplay(panel);
      setStatus(panel, `Playback scope changed to ${scope.replaceAll('-', ' ')}.`, 'success');
    });
    panel.querySelector('[data-cube-trace-timeline]').addEventListener('input', event => {
      try { setTraceTime(panel, Number(event.target.value) / 1000); } catch (error) { setStatus(panel, error.message, 'error'); }
    });
    panel.querySelector('[data-cube-trace-markers]').addEventListener('click', event => {
      const button = event.target.closest('[data-cube-trace-marker]');
      if (button) setPhase(panel, button.dataset.cubeTraceMarker);
    });
    panel.querySelector('[data-cube-trace-select-point]').addEventListener('click', () => { try { selectPoint(panel, panel.querySelector('[data-cube-trace-point-id]').value); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-trace-workspace]').addEventListener('click', event => {
      const button = event.target.closest('[data-cube-trace-point]');
      if (!button) return;
      try { selectPoint(panel, button.dataset.cubeTracePoint); } catch (error) { setStatus(panel, error.message, 'error'); }
    });
    root?.document?.addEventListener('visibilitychange', () => {
      if (root.document.hidden && playbackDirection !== 0) pausePlayback(panel, false);
    });
  }

  function faceOptions(selected) { return FACES.map(face => `<option value="${face}"${face === selected ? ' selected' : ''}>${title(face)}</option>`).join(''); }
  function turnOptions(selected) { return [0,1,2,3].map(turns => `<option value="${turns}"${turns === selected ? ' selected' : ''}>${turns * 90}°</option>`).join(''); }
  function counterCard(name, label) { return `<div><span>${escapeHtml(label)}</span><strong data-cube-trace-counter="${name}">0</strong></div>`; }
  function traceStage(phase, titleText, body) { return `<section class="cube-trace-stage" hidden data-cube-trace-stage="${phase}"><h4>${escapeHtml(titleText)}</h4>${body}</section>`; }

  function buildPanel() {
    requireDependencies();
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const host = document.getElementById('shadowrun') || document.querySelector('main') || document.body;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'cube-visualizer-panel';
    panel.innerHTML = `
      <div class="cube-visualizer-header"><div><p class="eyebrow">V8 multi-block sequencing · exact source and ciphertext inspection</p><h2>Binary Cube Encoder Visualizer</h2><p>Encrypt complete packages, navigate every verified block, jump directly to source or ciphertext bits, and play selected or package-wide trace scopes without changing canonical output.</p></div><button type="button" class="layout-button" data-cube-visualizer-close>Close Visualizer</button></div>
      <p class="cube-visualizer-warning"><strong>Experimental obfuscation research:</strong> package checksums detect corruption but are not cryptographic authentication. V8 sequencing reads validated trace collections and never substitutes for canonical encryption or decryption.</p>
      <div class="cube-visualizer-layout">
        <aside class="cube-visualizer-controls">
          <div class="cube-visualizer-field"><label for="cube-visualizer-seed">Key seed</label><input id="cube-visualizer-seed" type="text" value="${DEFAULT_SEED}" spellcheck="false" data-cube-visualizer-seed></div>
          <div class="cube-visualizer-field"><label for="cube-visualizer-size">Grid size</label><select id="cube-visualizer-size" data-cube-visualizer-size><option value="4">4 × 4</option><option value="12">12 × 12</option><option value="20">20 × 20</option><option value="28">28 × 28</option><option value="36">36 × 36</option><option value="44">44 × 44</option><option value="52">52 × 52</option><option value="60">60 × 60</option><option value="64">64 × 64</option></select></div>
          <div class="cube-visualizer-field"><label for="cube-visualizer-mask-mode">Data-entry mask</label><select id="cube-visualizer-mask-mode" data-cube-visualizer-mask-mode><option value="1">Full face · 100% payload</option><option value="0.75">Sparse · 75% payload</option><option value="0.5">Sparse · 50% payload</option><option value="custom">Custom exact mask</option></select></div>
          <div class="cube-visualizer-field cube-custom-mask-field" hidden data-cube-visualizer-custom-mask-field><label for="cube-visualizer-custom-mask">Custom mask bits</label><textarea id="cube-visualizer-custom-mask" spellcheck="false" data-cube-visualizer-custom-mask></textarea><small>Use one digit per face cell: 1 accepts payload; 0 receives deterministic filler.</small></div>
          <fieldset class="cube-visualizer-direction-controls"><legend>Encoding direction draft</legend>
            <div class="cube-visualizer-face-row"><div class="cube-visualizer-field"><label for="cube-visualizer-input-face">Input face</label><select id="cube-visualizer-input-face" data-cube-visualizer-input-face>${faceOptions('top')}</select></div><div class="cube-visualizer-field"><label for="cube-visualizer-input-turns">Input orientation</label><select id="cube-visualizer-input-turns" data-cube-visualizer-input-turns>${turnOptions(0)}</select></div></div>
            <div class="cube-visualizer-face-row"><div class="cube-visualizer-field"><label for="cube-visualizer-output-face">Output face</label><select id="cube-visualizer-output-face" data-cube-visualizer-output-face></select></div><div class="cube-visualizer-field"><label for="cube-visualizer-output-turns">Output orientation</label><select id="cube-visualizer-output-turns" data-cube-visualizer-output-turns>${turnOptions(0)}</select></div></div>
            <div class="cube-visualizer-pick-controls" role="group" aria-label="Cube face click mode"><button type="button" class="layout-button active" aria-pressed="true" data-cube-visualizer-pick-role="input">Pick Input Face</button><button type="button" class="layout-button" aria-pressed="false" data-cube-visualizer-pick-role="output">Pick Output Face</button></div>
            <small data-cube-visualizer-pick-instruction>Cube clicks now select the input face.</small><p class="cube-visualizer-direction-summary" data-cube-visualizer-direction-summary></p>
          </fieldset>
          <div class="cube-visualizer-actions"><button type="button" class="link-button" data-cube-visualizer-generate>Generate Canonical Draft Key</button><button type="button" class="layout-button" data-cube-visualizer-load>Load Key JSON</button><label class="layout-button cube-visualizer-file-button">Import Key File<input type="file" accept="application/json,.json" data-cube-encoder-import-key></label></div>
          <div class="cube-visualizer-field"><label for="cube-visualizer-key">Canonical key JSON</label><textarea id="cube-visualizer-key" spellcheck="false" data-cube-visualizer-key></textarea></div>
          <div class="cube-visualizer-actions"><button type="button" class="layout-button" data-cube-encoder-copy-key>Copy Key</button><button type="button" class="layout-button" data-cube-encoder-download-key>Download Key</button><button type="button" class="layout-button" data-cube-encoder-handoff-lab>Open Package in Laboratory</button></div>
          <div><strong>Camera presets</strong><div class="cube-visualizer-camera-controls"><button type="button" class="layout-button" data-cube-visualizer-reset-camera>Perspective</button>${FACES.map(face => `<button type="button" class="layout-button" data-cube-visualizer-camera="${face}">${title(face)}</button>`).join('')}</div></div>
          <div class="cube-visualizer-status" role="status" aria-live="polite" data-cube-visualizer-status>Preparing the canonical demonstration key and package.</div>
        </aside>
        <div class="cube-visualizer-main-column">
          <div class="cube-visualizer-scene-shell"><canvas class="cube-visualizer-canvas" aria-label="Manipulatable three-dimensional Binary Cube selected-block animation" data-cube-visualizer-canvas></canvas><div class="cube-visualizer-label-layer" aria-hidden="true" data-cube-visualizer-label-layer></div><div class="cube-visualizer-fallback" hidden data-cube-visualizer-fallback></div><div class="cube-visualizer-scene-overlay"><div class="cube-visualizer-summary" data-cube-visualizer-summary>No key loaded.</div><div class="cube-visualizer-help">Click a face to select · Drag to orbit · Shift-drag or right-drag to pan · Wheel to zoom</div></div></div>
          <section class="cube-encoder-panel">
            <div class="cube-encoder-header"><div><p class="eyebrow">Canonical package input and output</p><h3>Complete Encoder</h3></div><div class="cube-visualizer-field cube-trace-bits-field"><label for="cube-trace-bits">Manual binary or imported file bits</label><textarea id="cube-trace-bits" spellcheck="false" data-cube-trace-bits>${DEFAULT_BITS}</textarea></div><div class="cube-encoder-file-column"><label class="layout-button cube-visualizer-file-button">Choose Unencrypted File<input type="file" data-cube-encoder-file></label><small data-cube-encoder-file-note>No file loaded; using manual bits.</small><button type="button" class="link-button" data-cube-trace-build>Encrypt Complete Package</button></div></div>
            <div class="cube-encoder-actions"><button type="button" class="link-button" data-cube-encoder-decrypt>Decrypt and Verify Package</button><button type="button" class="layout-button" data-cube-encoder-validate>Validate Key, Package, and Traces</button><label class="layout-button cube-visualizer-file-button">Import Package File<input type="file" accept="application/json,.json" data-cube-encoder-import-package></label><button type="button" class="layout-button" data-cube-encoder-copy-package>Copy Package</button><button type="button" class="layout-button" data-cube-encoder-download-package>Download Package</button><button type="button" class="layout-button" data-cube-encoder-download-recovered>Download Recovered File</button></div>
            <div class="cube-encoder-output-grid">
              <div class="cube-visualizer-field"><label for="cube-encoder-package">Encrypted package JSON</label><textarea id="cube-encoder-package" spellcheck="false" data-cube-encoder-package></textarea></div>
              <div class="cube-visualizer-field"><label for="cube-encoder-recovered">Recovered unencrypted bits</label><textarea id="cube-encoder-recovered" spellcheck="false" readonly data-cube-encoder-recovered></textarea></div>
            </div>
            <div class="cube-encoder-package-summary" data-cube-encoder-package-summary>No encrypted package is active.</div>
            <p class="cube-encoder-roundtrip" data-state="idle" data-cube-encoder-roundtrip>Round trip not yet validated.</p>
          </section>
          <section class="cube-trace-panel">
            <div class="cube-trace-header"><div><p class="eyebrow">Verified package sequencing and selected-block trace</p><h3>Multi-Block Animated Bit Flow</h3></div><div class="cube-block-navigation"><button type="button" class="layout-button" data-cube-encoder-previous-block>Previous Block</button><div class="cube-visualizer-field cube-encoder-block-field"><label for="cube-encoder-block">Package block</label><select id="cube-encoder-block" data-cube-encoder-block></select></div><button type="button" class="layout-button" data-cube-encoder-next-block>Next Block</button></div></div>
            <div class="cube-block-timeline" aria-label="Validated package block timeline" data-cube-encoder-block-timeline></div>
            <div class="cube-block-range-inspector" data-cube-encoder-range-inspector>No package block is selected.</div>
            <div class="cube-bit-jump-controls"><label>Source bit index<input type="number" min="0" step="1" value="0" data-cube-encoder-source-index></label><button type="button" class="layout-button" data-cube-encoder-source-jump>Jump to Source Bit</button><label>Ciphertext bit index<input type="number" min="0" step="1" value="0" data-cube-encoder-ciphertext-index></label><button type="button" class="layout-button" data-cube-encoder-ciphertext-jump>Jump to Ciphertext Bit</button></div>
            <p class="cube-trace-unavailable" data-cube-trace-unavailable>Encrypt or import a package to select a block for animation.</p>
            <div hidden data-cube-trace-workspace>
              <div class="cube-trace-phase-bar"><strong data-cube-trace-phase-name>Block 1 · phase 1</strong><div class="cube-trace-controls"><button type="button" class="layout-button" data-cube-trace-first>First</button><button type="button" class="layout-button" data-cube-trace-previous>Previous Phase</button><button type="button" class="layout-button" data-cube-trace-reverse-play>Reverse</button><button type="button" class="layout-button" data-cube-trace-pause>Pause</button><button type="button" class="link-button" data-cube-trace-play>Play</button><button type="button" class="layout-button" data-cube-trace-next>Next Phase</button><button type="button" class="layout-button" data-cube-trace-last>Last</button><button type="button" class="layout-button" data-cube-trace-restart>Restart</button></div></div>
              <div class="cube-trace-playback-options"><label>Speed<select data-cube-trace-speed>${PLAYBACK_SPEEDS.map(speed => `<option value="${speed}"${speed === 1 ? ' selected' : ''}>${speed}×</option>`).join('')}</select></label><label>Package scope<select data-cube-trace-scope><option value="selected-bit">Selected bit</option><option value="selected-row">Selected row</option><option value="selected-block" selected>Selected block</option><option value="all-blocks">All blocks</option><option value="overview-only">Overview only</option></select></label><label>Motion cohort<select data-cube-trace-mode><option value="all">All bits</option><option value="selected">Selected bit only</option><option value="row">Selected input row</option></select></label></div>
              <div class="cube-trace-timeline"><input type="range" min="0" max="1000" step="1" value="0" aria-label="Binary Cube selected-block trace timeline" data-cube-trace-timeline><output data-cube-trace-timeline-readout>0.0% · segment 0.0%</output></div>
              <div class="cube-trace-markers" aria-label="Trace phase markers" data-cube-trace-markers></div>
              <div class="cube-trace-counters">${counterCard('source','Source bits in block')}${counterCard('payload','Payload capacity')}${counterCard('filler','Filler cells')}${counterCard('block','Selected block')}${counterCard('point','Selected point')}${counterCard('input','Input face index')}${counterCard('output','Output face index')}${counterCard('final','Package output index')}${counterCard('time','Trace time')}${counterCard('progress','Segment progress')}</div>
              <div class="cube-trace-inspection-layout"><div class="cube-trace-stages">
                ${traceStage(0,'Source strip','<div class="cube-trace-strip" data-cube-trace-source-strip></div>')}
                ${traceStage(1,'Framed block','<div class="cube-trace-grid" data-cube-trace-framed-grid></div>')}
                ${traceStage(2,'Mask and filler distinction','<p>Payload and deterministic filler bits separate according to the exact key mask embedded in the key JSON.</p>')}
                ${traceStage(3,'Input face cells','<div class="cube-trace-grid" data-cube-trace-input-grid></div>')}
                ${traceStage(4,'Point assignment','<div class="cube-trace-grid" data-cube-trace-point-grid></div>')}
                ${traceStage(5,'Point-field loaded','<p>Bits occupy their exact keyed 3D point identities. Pause or scrub to inspect any stable position.</p>')}
                ${traceStage(6,'Output projection selected','<p>The same point identities are read through the output projection without changing the package.</p>')}
                ${traceStage(7,'Output face cells','<div class="cube-trace-grid" data-cube-trace-output-grid></div>')}
                ${traceStage(8,'Encrypted block emitted','<div class="cube-trace-strip" data-cube-trace-output-strip></div>')}
                ${traceStage(9,'Block complete','<p>This trace block is byte-for-byte identical to its corresponding ciphertext slice in the complete package.</p>')}
              </div><aside class="cube-trace-inspector-panel"><div class="cube-trace-point-selector"><label for="cube-trace-point-id">Inspect point ID</label><input id="cube-trace-point-id" type="number" min="0" step="1" value="0" data-cube-trace-point-id><button type="button" class="layout-button" data-cube-trace-select-point>Inspect</button></div><div class="cube-trace-inspector" data-cube-trace-inspector>Encrypt or import a package to inspect a point.</div></aside></div>
            </div>
          </section>
        </div>
      </div>`;
    host.appendChild(panel);
    rebuildOutputOptions(panel, 'front');
    bind(panel);
    installRenderer(panel);
    setPickRole(panel, 'input');
    generateKey(panel);
    return panel;
  }

  function openPanel() {
    const panel = buildPanel();
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderer?.render();
    return panel;
  }

  function currentArtifacts() {
    const panel = document.getElementById(PANEL_ID);
    const bits = panel?.querySelector('[data-cube-trace-bits]')?.value?.replace(/\s+/g, '') || '';
    return Object.freeze({
      source: 'visualizer',
      sourceFileName,
      bits,
      key: cloneJson(activeKey),
      packageObject: cloneJson(activePackage),
      recoveredBits
    });
  }

  function loadArtifacts(artifacts = {}) {
    const panel = openPanel();
    if (artifacts.sourceFileName) sourceFileName = safeFileName(artifacts.sourceFileName, sourceFileName);
    if (artifacts.bits) panel.querySelector('[data-cube-trace-bits]').value = normalizeBits(artifacts.bits);
    if (artifacts.key) renderKey(panel, artifacts.key, 'handoff', { autoEncrypt: false, maskMode: 'custom' });
    if (artifacts.packageObject) {
      panel.querySelector('[data-cube-encoder-package]').value = JSON.stringify(artifacts.packageObject, null, 2);
      loadPackageFromText(panel, { quiet: true, populateInput: !artifacts.bits });
    } else if (artifacts.bits && activeKey) {
      encryptCurrentInput(panel, { quiet: true });
    }
    setStatus(panel, `Binary Cube artifacts loaded from ${artifacts.source || 'external source'}.`, 'success');
    return currentState();
  }

  function currentState() {
    const direction = renderer?.getDirectionState?.() || rendererDirectionState();
    const details = selectedTraceDetails();
    const state = timelineState();
    const rendered = renderer?.getTraceState?.();
    return Object.freeze({
      panelOpen: Boolean(document.getElementById(PANEL_ID) && !document.getElementById(PANEL_ID).hidden),
      keyId: activeKey?.keyId || null,
      keyOrigin: activeKeyOrigin,
      gridSize: activeKey?.gridSize || null,
      activeInputFace: activeKey?.inputFace || null,
      activeOutputFace: activeKey?.outputFace || null,
      activeInputQuarterTurns: activeKey?.inputQuarterTurns ?? null,
      activeOutputQuarterTurns: activeKey?.outputQuarterTurns ?? null,
      activeMask: activeKey ? Object.freeze([...activeKey.mask]) : null,
      payloadCapacity: activeKey?.mask.filter(Boolean).length ?? null,
      draftInputFace: direction.inputFace,
      draftOutputFace: direction.outputFace,
      draftInputQuarterTurns: direction.inputQuarterTurns,
      draftOutputQuarterTurns: direction.outputQuarterTurns,
      legalOutputFaces: Object.freeze([...direction.legalOutputFaces]),
      pickRole,
      rendererVersion: RendererApi?.constants?.RENDERER_VERSION || null,
      packageReady: Boolean(activePackage),
      packageChecksum: activePackage?.checksum || null,
      packageBlockCount: activePackage?.blockCount || 0,
      packageCiphertext: activePackage?.ciphertext || null,
      packageOriginalBitLength: activePackage?.originalBitLength ?? null,
      traceCollectionCount: activeTraces.length,
      selectedBlockIndex: activePackage ? selectedBlockIndex : null,
      blockDescriptors: activePackage ? Object.freeze(activeTraces.map(trace => describeTraceBlock(trace, activePackage))) : Object.freeze([]),
      recoveredBits,
      roundTripValid,
      sourceFileName,
      traceReady: Boolean(activeTrace),
      traceTime: state?.traceTime ?? null,
      tracePhaseIndex: state?.phaseIndex ?? null,
      traceNextPhaseIndex: state?.nextPhaseIndex ?? null,
      tracePhaseProgress: state?.segmentProgress ?? null,
      tracePhaseId: activeTrace && state ? activeTrace.phases[state.phaseIndex].id : null,
      traceNextPhaseId: activeTrace && state ? activeTrace.phases[state.nextPhaseIndex].id : null,
      tracePhaseCount: activeTrace?.phases.length || 0,
      traceBlockIndex: activeTrace?.blockIndex ?? null,
      traceOutputBlock: activeTrace?.outputBlock || null,
      tracePlaying: playbackDirection !== 0,
      tracePlaybackDirection: playbackDirection,
      tracePlaybackSpeed: playbackSpeed,
      tracePlaybackMode: playbackMode,
      tracePlaybackScope: playbackScope,
      packageSequenceActive: playbackDirection !== 0 && isPackagePlaybackScope(),
      selectedBlockSourceStart: activeTrace?.sourceBitRange.start ?? null,
      selectedBlockSourceEndExclusive: activeTrace?.sourceBitRange.endExclusive ?? null,
      selectedBlockSourceBitsConsumed: activeTrace?.sourceBitRange.consumed ?? null,
      selectedBlockCiphertextStart: activeTrace ? activeTrace.blockIndex * activeTrace.cellCount : null,
      selectedBlockCiphertextEndExclusive: activeTrace ? (activeTrace.blockIndex + 1) * activeTrace.cellCount : null,
      selectedBlockFinalPartial: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).finalPartialBlock : false,
      selectedBlockPartialPayloadFillerCells: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).partialPayloadFillerCells : null,
      selectedBlockMaskFillerCells: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).maskFillerCells : null,
      selectedBlockTotalFillerCells: activeTrace && activePackage ? describeTraceBlock(activeTrace, activePackage).totalFillerCells : null,
      selectedPointId: details?.pointId ?? null,
      selectedSourceBitIndex: details?.sourceBitIndex ?? null,
      selectedInputCellIndex: details?.inputCellIndex ?? null,
      selectedOutputCellIndex: details?.outputCellIndex ?? null,
      selectedFinalOutputIndex: details?.finalOutputIndex ?? null,
      selectedFinalBit: details?.finalBit ?? null,
      selectedAnimatedPosition: rendered?.selectedPosition ? Object.freeze([...rendered.selectedPosition]) : null
    });
  }

  return Object.freeze({
    openPanel,
    loadArtifacts,
    currentArtifacts,
    currentState,
    utilities: Object.freeze({ normalizeBits, bytesToBits, bitsToBytes, normalizeCustomMask, describeTraceBlock, locateSourceBit, locateCiphertextBit, sequenceBlockIndex, effectivePlaybackMode }),
    constants: Object.freeze({ PANEL_ID, MAX_STATIC_GRID_SIZE, MAX_MANUAL_TRACE_GRID_SIZE, PLAYBACK_DURATION_MS, OVERVIEW_BLOCK_DURATION_MS, PLAYBACK_SPEEDS, PLAYBACK_SCOPES, MASK_MODES })
  });
});
