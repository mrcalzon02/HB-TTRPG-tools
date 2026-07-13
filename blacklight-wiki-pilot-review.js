(() => {
  'use strict';

  const page = document.body.dataset;
  const SOURCE_URL = page.sourceUrl || 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json';
  const ADVERSARY_URL = page.adversaryUrl || 'data/blacklight-continuum/wiki/internal-adversaries.json';
  const REPORT_URL = page.reportUrl || 'data/blacklight-continuum/wiki/reports/class-reports/vampire/crowned-blood.json';
  const ACTIVE_URL = 'data/blacklight-continuum/wiki/reports/active-vampire-revisions.json';
  const CLASS_ID = page.classId || 'vampire';
  const RECORD_ID = page.recordId || 'crowned-blood';

  const ui = {
    status: document.getElementById('pilot-status'),
    metrics: document.getElementById('pilot-metrics'),
    source: document.getElementById('pilot-source'),
    report: document.getElementById('pilot-report'),
    map: document.getElementById('pilot-preservation-map'),
    review: document.getElementById('pilot-review-state')
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function list(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  async function fetchOptionalJson(url) {
    try {
      return await fetchJson(url);
    } catch (error) {
      console.warn(`Optional record unavailable: ${url}`, error);
      return null;
    }
  }

  function stringsIn(value, output = []) {
    if (typeof value === 'string') output.push(value);
    else if (Array.isArray(value)) value.forEach(item => stringsIn(item, output));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => stringsIn(item, output));
    return output;
  }

  function wordCount(value) {
    return stringsIn(value).join(' ').trim().split(/\s+/).filter(Boolean).length;
  }

  function leafFieldCount(value) {
    if (value === null || typeof value !== 'object') return 1;
    if (Array.isArray(value)) return value.reduce((sum, item) => sum + leafFieldCount(item), 0);
    return Object.values(value).reduce((sum, item) => sum + leafFieldCount(item), 0);
  }

  function same(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function metric(label, value, state = '') {
    return `<div class="migration-metric ${escapeHtml(state)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function paragraphs(items) {
    return list(items).map(item => `<p>${escapeHtml(item)}</p>`).join('');
  }

  function reportSection(title, items) {
    return `<section class="pilot-report-section"><h3>${escapeHtml(title)}</h3>${paragraphs(items)}</section>`;
  }

  function renderTestimony(items) {
    const testimony = list(items);
    if (!testimony.length) return '';
    return `<section class="pilot-report-section">
      <h3>Encounter testimony</h3>
      <div class="pilot-testimony-grid">${testimony.map(item => `
        <blockquote class="pilot-testimony">
          <p>“${escapeHtml(item.quote)}”</p>
          <footer><strong>${escapeHtml(item.attribution)}</strong><br>${escapeHtml(item.custody || '')}</footer>
          <div class="pilot-testimony-meta">
            <span class="migration-badge">${escapeHtml(item.sourceType)}</span>
            <span class="migration-badge">${escapeHtml(item.confidence)} confidence</span>
          </div>
          ${item.context ? `<p class="pilot-testimony-context">${escapeHtml(item.context)}</p>` : ''}
        </blockquote>`).join('')}</div>
    </section>`;
  }

  function renderSource(source, adversary) {
    ui.source.innerHTML = `
      <article class="pilot-source-card">
        <p class="bli-eyebrow">Authoritative lineage source</p>
        <h2>${escapeHtml(source.name)}</h2>
        <p><strong>Record ID:</strong> <span class="migration-code">${escapeHtml(source.id)}</span></p>
        <h3>Inherited tradition</h3>
        <p>${escapeHtml(source.legacy)}</p>
        <h3>Continuum expression</h3>
        <p>${escapeHtml(source.continuum)}</p>
        <h3>Favored power families</h3>
        <div>${list(source.favoredFamilies).map(item => `<span class="migration-badge">${escapeHtml(item)}</span>`).join(' ')}</div>
        <div class="wiki-subgroup-feature"><span class="wiki-badge">Gift</span><strong>${escapeHtml(source.gift?.name)}</strong><p>${escapeHtml(source.gift?.effect)}</p></div>
        <div class="wiki-subgroup-feature"><span class="wiki-badge">Bane</span><strong>${escapeHtml(source.bane?.name)}</strong><p>${escapeHtml(source.bane?.effect)}</p></div>
      </article>
      <article class="pilot-source-card pilot-enemy-card">
        <p class="bli-eyebrow">Authoritative attached adversary</p>
        <h2>${escapeHtml(adversary.name)}</h2>
        <p><strong>Classification:</strong> ${escapeHtml(adversary.classification)}</p>
        <h3>Description</h3><p>${escapeHtml(adversary.description)}</p>
        <h3>Operating method</h3><p>${escapeHtml(adversary.method)}</p>
        <h3>Why the conflict is personal</h3><p>${escapeHtml(adversary.conflict)}</p>
      </article>`;
  }

  function renderReport(report, activeRecord) {
    const adversary = report.internalAdversaryAssessment;
    const status = activeRecord?.status || report.review?.migrationState || 'drafting';
    ui.report.innerHTML = `
      <header class="pilot-report-header">
        <p class="bli-eyebrow">${escapeHtml(status)} intelligence overlay · not live</p>
        <h2>${escapeHtml(report.reportTitle)}</h2>
        <div class="pilot-report-meta">
          <span class="migration-badge">${escapeHtml(report.classification)}</span>
          <span class="migration-badge">${escapeHtml(report.confidence)} confidence</span>
          <span class="migration-badge">${escapeHtml(report.archiveStatus)}</span>
        </div>
      </header>
      ${reportSection('Executive assessment', report.executiveAssessment)}
      ${reportSection('Historical record', report.historicalRecord)}
      ${reportSection('Continuum expression', report.continuumExpression)}
      ${reportSection('Capability profile', report.capabilityProfile)}
      ${reportSection('Liability and pressure profile', report.liabilityPressureProfile)}
      ${renderTestimony(report.encounterTestimony)}
      <section class="pilot-report-section pilot-adversary-report">
        <h3>Internal adversary assessment: ${escapeHtml(adversary?.name)}</h3>
        <p><strong>Classification:</strong> ${escapeHtml(adversary?.classification)}</p>
        <h4>Description</h4>${paragraphs(adversary?.description)}
        <h4>Operating method</h4>${paragraphs(adversary?.operatingMethod)}
        <h4>Why the conflict is personal</h4>${paragraphs(adversary?.personalConflict)}
        <h4>Blacklight assessment</h4>${paragraphs(adversary?.assessment)}
        <h4>Unresolved links</h4><ul>${list(adversary?.unresolvedLinks).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </section>
      ${reportSection('Blacklight assessment', report.blacklightAssessment)}
      <section class="pilot-report-section">
        <h3>Operational guidance</h3>
        ${Object.entries(report.operationalGuidance || {}).map(([key, values]) => `<h4>${escapeHtml(key.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase()))}</h4><ul>${list(values).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`).join('')}
      </section>
      ${reportSection('Unresolved intelligence', report.unresolvedIntelligence)}
      <section class="pilot-report-section">
        <h3>Protected mechanics</h3>
        <pre>${escapeHtml(JSON.stringify(report.protectedMechanics, null, 2))}</pre>
      </section>`;
  }

  function renderMap(report) {
    ui.map.innerHTML = `
      <div class="migration-table-wrap">
        <table class="migration-table">
          <thead><tr><th>Source path</th><th>Destination</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>${list(report.sourcePreservationMap).map(item => `
            <tr>
              <td class="migration-code">${escapeHtml(item.sourcePath)}</td>
              <td>${escapeHtml(item.destinationSection)}</td>
              <td><span class="migration-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
              <td>${escapeHtml(item.notes || '')}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderReview(report, mechanicsMatch, adversaryMatch, activeRecord) {
    const review = {
      ...(report.review || {}),
      ...(activeRecord ? {
        migrationState: activeRecord.status,
        semanticComparisonComplete: activeRecord.semanticComparisonComplete,
        renderedReviewComplete: activeRecord.renderedReviewComplete
      } : {})
    };
    ui.review.innerHTML = `
      <div class="migration-grid">
        <article class="migration-card"><h3>Migration state</h3><p><span class="migration-badge ${escapeHtml(review.migrationState)}">${escapeHtml(review.migrationState)}</span></p></article>
        <article class="migration-card"><h3>Claim mapping</h3><p>${escapeHtml(review.mappedClaimCount)} of ${escapeHtml(review.sourceClaimCount)} source leaf claims mapped.</p></article>
        <article class="migration-card"><h3>Mechanics comparison</h3><p>${mechanicsMatch ? 'The protected mechanics match the source exactly.' : 'The protected mechanics differ from the source and block approval.'}</p></article>
        <article class="migration-card"><h3>Adversary comparison</h3><p>${adversaryMatch ? 'The original enemy name, classification, description, method, and personal conflict are retained.' : 'One or more original adversary fields differ and block approval.'}</p></article>
        <article class="migration-card"><h3>Encounter testimony</h3><p>${list(report.encounterTestimony).length} attributed quotation${list(report.encounterTestimony).length === 1 ? '' : 's'} filed with source and confidence notes.</p></article>
        <article class="migration-card"><h3>Semantic comparison</h3><p>${review.semanticComparisonComplete ? 'Complete.' : 'Pending manual claim-by-claim review.'}</p></article>
        <article class="migration-card"><h3>Rendered review</h3><p>${review.renderedReviewComplete ? 'Complete.' : 'Pending.'}</p></article>
      </div>
      <div class="migration-card"><h3>Review notes</h3><ul>${list(review.reviewNotes).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`;
  }

  async function initialize() {
    try {
      ui.status.textContent = 'Loading source records and intelligence overlay…';
      const [sourceData, adversaryData, report, active] = await Promise.all([
        fetchJson(SOURCE_URL),
        fetchJson(ADVERSARY_URL),
        fetchJson(REPORT_URL),
        fetchOptionalJson(ACTIVE_URL)
      ]);
      const source = list(sourceData.lineages).find(item => item.id === RECORD_ID);
      const adversary = adversaryData?.classes?.[CLASS_ID]?.[RECORD_ID];
      const activeRecord = list(active?.reports).find(item => item.recordId === RECORD_ID) || null;
      if (!source || !adversary) throw new Error(`The ${RECORD_ID} source record or attached adversary is missing.`);

      const mechanicsMatch = same(report.protectedMechanics, {
        favoredFamilies: source.favoredFamilies,
        gift: source.gift,
        bane: source.bane
      });
      const reportAdversary = report.internalAdversaryAssessment;
      const adversaryMatch = Boolean(reportAdversary)
        && reportAdversary.name === adversary.name
        && reportAdversary.classification === adversary.classification
        && reportAdversary.description?.[0] === adversary.description
        && reportAdversary.operatingMethod?.[0] === adversary.method
        && reportAdversary.personalConflict?.[0] === adversary.conflict;

      renderSource(source, adversary);
      renderReport(report, activeRecord);
      renderMap(report);
      renderReview(report, mechanicsMatch, adversaryMatch, activeRecord);
      ui.metrics.innerHTML = [
        metric('Source words', wordCount(source)),
        metric('Source leaf fields', leafFieldCount(source)),
        metric('Enemy words', wordCount(adversary)),
        metric('Enemy leaf fields', leafFieldCount(adversary)),
        metric('Report words', wordCount(report)),
        metric('Encounter quotes', list(report.encounterTestimony).length),
        metric('Preservation rows', list(report.sourcePreservationMap).length),
        metric('Mechanics match', mechanicsMatch ? 'Yes' : 'No', mechanicsMatch ? 'implemented' : ''),
        metric('Enemy match', adversaryMatch ? 'Yes' : 'No', adversaryMatch ? 'implemented' : '')
      ].join('');
      ui.status.textContent = mechanicsMatch && adversaryMatch
        ? 'Report loaded. Verbatim mechanics and all five established adversary fields match the authoritative sources; remaining review gates are shown below.'
        : 'Report loaded with a blocking source mismatch. The draft must not advance until corrected.';
    } catch (error) {
      console.error(error);
      ui.status.innerHTML = `<span class="migration-error">Report review could not load: ${escapeHtml(error.message)}</span>`;
    }
  }

  initialize();
})();
