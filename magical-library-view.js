(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  const tag = value => `<span class="ml-tag">${esc(value)}</span>`;

  function ratingGrid(ratings) {
    return `<div class="ml-rating-grid">${Object.entries(ratings).map(([name,rating]) => `<div class="ml-rating"><span>${esc(name.replace(/([A-Z])/g,' $1'))}</span><strong>${rating.score}</strong><small>${esc(rating.label)}</small><div class="ml-rating-track"><i style="width:${rating.score}%"></i></div></div>`).join('')}</div>`;
  }

  function compositionDetails(book) {
    const binding = book.composition.binding ? `<li><strong>Binding:</strong> ${esc(book.composition.binding)}</li>` : '';
    return `<ul><li><strong>Substrate:</strong> ${esc(book.composition.substrate)}</li><li><strong>Ink:</strong> ${esc(book.composition.ink)}</li>${binding}<li><strong>Cover or wrapper:</strong> ${esc(book.composition.cover)}</li><li><strong>Leaf arrangement:</strong> ${esc(book.composition.leafArrangement)}</li><li><strong>Dimensions:</strong> ${esc(book.composition.dimensions)}</li><li><strong>Illustrations:</strong> ${esc(book.composition.illustrations)}</li><li><strong>Weight:</strong> approximately ${esc(book.composition.weightKg)} kg</li></ul>`;
  }

  function sensoryDetails(book) {
    const rows = [`<li><strong>Handling:</strong> ${esc(book.sensory.handling)}</li>`];
    if (book.sensory.scent) rows.push(`<li><strong>Scent:</strong> ${esc(book.sensory.scent)}</li>`);
    if (book.sensory.aura) rows.push(`<li><strong>Aura:</strong> ${esc(book.sensory.aura)}</li>`);
    return `<ul>${rows.join('')}</ul>`;
  }

  function optionalDetails(book) {
    const rows = [];
    if (book.optional.marginalia) rows.push(`<li><strong>Marginalia:</strong> ${esc(book.optional.marginalia)}</li>`);
    if (book.optional.provenanceNote) rows.push(`<li><strong>Additional provenance:</strong> ${esc(book.optional.provenanceNote)}</li>`);
    if (book.optional.magicalQuirk) rows.push(`<li><strong>Magical quirk:</strong> ${esc(book.optional.magicalQuirk)}</li>`);
    return rows.length ? `<details><summary>Copy-Specific Features</summary><ul>${rows.join('')}</ul></details>` : '';
  }

  function fullText(unit) {
    if (!unit.fullText) return '';
    const paragraphs = unit.fullText.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('');
    const bullets = unit.fullText.bullets?.length ? `<ul>${unit.fullText.bullets.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '';
    const exercise = unit.exercise ? `<div class="ml-exercise"><strong>${esc(unit.exercise.type)}</strong><p>${esc(unit.exercise.prompt)}</p></div>` : '';
    return `<div class="ml-generated-prose">${paragraphs}${bullets}${exercise}</div>`;
  }

  function unitDetails(unit,content) {
    const objectives = `<ul>${unit.objectives.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
    const subsections = unit.subsections?.length ? `<ol class="ml-subsection-list">${unit.subsections.map(section => `<li><strong>${esc(section.title)}</strong> — ${esc(section.summary)}</li>`).join('')}</ol>` : '';
    const sample = unit.sampleOpening ? `<blockquote>${esc(unit.sampleOpening)}</blockquote>` : '';
    return `<details class="ml-content-unit" ${content.isFullDraft ? 'open' : ''}><summary>${unit.number}. ${esc(unit.title)} <small>${esc(unit.role)} · approximately ${unit.estimatedPages} pages</small></summary><p>${esc(unit.summary)}</p><h6>Learning objectives</h6>${objectives}${subsections}${sample}${fullText(unit)}</details>`;
  }

  function generatedContents(book) {
    const content = book.generatedContent;
    if (!content) return '';
    const intro = content.frontMatter.introduction;
    const introduction = intro.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('');
    const contentsRows = content.tableOfContents.map(unit => `<tr><td>${unit.number}</td><td>${esc(unit.title)}</td><td>${unit.estimatedPages}</td><td>${esc(unit.summary)}</td></tr>`).join('');
    const appendices = content.appendices.map(item => `<li><strong>Appendix ${esc(item.letter)}: ${esc(item.title)}</strong> — ${esc(item.summary)}</li>`).join('');
    return `<details class="ml-generated-content"><summary><strong>Generated Contents</strong> · ${esc(content.maturity)} · approximately ${content.estimatedWords.toLocaleString()} words</summary>
      <div class="ml-content-status">${tag(content.maturity)}${tag(content.isFullDraft ? 'Complete editable draft' : 'Expansion-ready architecture')}<p>${esc(content.actualDraftScope)}</p></div>
      <section class="ml-front-matter"><p class="ml-epigraph">“${esc(content.frontMatter.epigraph)}”</p><p><strong>Purpose:</strong> ${esc(content.frontMatter.purpose)}</p><h5>${esc(intro.title)}</h5><p>${esc(intro.summary)}</p>${introduction}</section>
      <h5>Formatting and Production Plan</h5><div class="ml-metadata-grid"><div><strong>Layout</strong><br>${esc(content.formatting.layout)}</div><div><strong>Voice</strong><br>${esc(content.formatting.narrativeVoice)}</div><div><strong>Heading system</strong><br>${esc(content.formatting.headingSystem)}</div><div><strong>Citations</strong><br>${esc(content.formatting.citationStyle)}</div><div><strong>Illustrations</strong><br>${esc(content.formatting.illustrationPlan)}</div><div><strong>Accessibility</strong><br>${esc(content.formatting.accessibility)}</div></div><p><strong>Recurring features:</strong> ${content.formatting.recurringFeatures.map(esc).join(' · ')}</p>
      <h5>Table of Contents</h5><div class="ml-table-wrap"><table class="ml-content-table"><thead><tr><th>#</th><th>Title</th><th>Pages</th><th>Summary</th></tr></thead><tbody>${contentsRows}</tbody></table></div>
      <h5>${content.isFullDraft ? 'Complete Draft Body' : 'Chapter and Division Architecture'}</h5><div class="ml-content-units">${content.units.map(unit => unitDetails(unit,content)).join('')}</div>
      <h5>Appendices and Back Matter</h5><ul>${appendices}</ul>
      <div class="ml-production-notes"><strong>Production notes</strong><p>${esc(content.productionNotes.targetLength)}</p><p>${esc(content.productionNotes.expansionOrder)}</p><p>${esc(content.productionNotes.sourceProfile)}</p></div>
    </details>`;
  }

  function bookRow(book) {
    return `<article class="ml-book ml-shelf-${esc(book.shelf.id)}"><div class="ml-book-title-line"><div><p class="eyebrow">${esc(book.code)} · ${esc(book.format.label)} · ${book.pages} pages</p><h4>${esc(book.title)}</h4></div><div class="ml-book-tags">${tag(book.shelf.label)}${tag(book.rarity.label)}${tag(book.price.display)}${tag(book.generatedContent?.maturity || 'Profile only')}${tag(book.circulation)}</div></div><p class="ml-byline">By ${esc(book.author.name)} · ${esc(book.edition)}</p><p class="ml-book-summary"><strong>Summary:</strong> ${esc(book.summary)}</p><p class="ml-book-description"><strong>Physical description:</strong> ${esc(book.description)}</p>
      <div class="ml-metadata-grid"><div><strong>Publisher</strong><br>${esc(book.publisher)}</div><div><strong>Series</strong><br>${esc(book.series)}</div><div><strong>Price</strong><br>${esc(book.price.display)}<br><small>${esc(book.price.acquisition)}</small></div><div><strong>Condition</strong><br>${esc(book.condition)}</div><div><strong>Rarity</strong><br>${esc(book.rarity.label)}</div><div><strong>Call Number</strong><br>${esc(book.callNumber)}</div><div><strong>Course Association</strong><br>${esc(book.courseAssociation)}</div><div><strong>Intended Audience</strong><br>${esc(book.intendedAudience)}</div><div><strong>Circulation</strong><br>${esc(book.circulation)}</div></div>
      <h5 class="ml-subheading">Ratings</h5>${ratingGrid(book.ratings)}
      <div class="ml-profile-details"><details open><summary>Author and Origin</summary><p><strong>${esc(book.author.name)}</strong> specializes in ${esc(book.author.specialty)} and is regarded as ${esc(book.author.reputation)}.</p><ul><li><strong>Author origin:</strong> ${esc(book.author.origin)}</li><li><strong>Production:</strong> ${esc(book.origin.production)}</li><li><strong>Institutional origin:</strong> ${esc(book.origin.institutionalOrigin)}</li><li><strong>Age:</strong> ${esc(book.origin.age)}</li>${book.origin.provenance ? `<li><strong>Provenance:</strong> ${esc(book.origin.provenance)}</li>` : ''}</ul></details><details><summary>Composition and Construction</summary>${compositionDetails(book)}</details><details><summary>Sensory and Magical Characteristics</summary>${sensoryDetails(book)}</details><details><summary>Hilariously Specific Subject Classification</summary><ul><li><strong>Primary subject:</strong> ${esc(book.subject.topic)}</li><li><strong>Required exercise:</strong> ${esc(book.subject.exercise)}</li><li><strong>Known complication:</strong> ${esc(book.subject.hazard)}</li></ul></details>${optionalDetails(book)}</div>${generatedContents(book)}</article>`;
  }

  function disciplineSection(discipline) {
    const courseLine = discipline.courseSeeds.length ? `<p><strong>Associated courses:</strong> ${discipline.courseSeeds.map(esc).join(' · ')}</p>` : '<p><strong>Associated courses:</strong> Departmental and elective syllabus materials.</p>';
    return `<section class="ml-discipline"><div class="ml-discipline-heading"><div><p class="eyebrow">${esc(discipline.sourceLabel)}</p><h3>${esc(discipline.label)} Syllabus Shelf</h3></div><span class="ml-count">${discipline.books.length} publications</span></div>${courseLine}<div class="ml-book-list">${discipline.books.map(bookRow).join('')}</div></section>`;
  }

  function render(root,catalog) {
    const output = root.querySelector('#ml-output');
    if (!catalog.disciplines.length) { output.innerHTML = '<p class="ml-empty">No disciplines match the selected shelf and curriculum controls.</p>'; return; }
    output.innerHTML = `<section class="ml-catalog-header"><p class="eyebrow">Generated syllabus depository</p><h2>${esc(catalog.libraryName)}</h2><p>${esc(catalog.notice)}</p><div class="ml-summary-grid"><div><strong>${catalog.totals.disciplines}</strong><br>disciplines represented</div><div><strong>${catalog.totals.books}</strong><br>publication contents generated</div><div><strong>${catalog.controls.titlesPerDiscipline}</strong><br>publications per discipline</div><div><strong>${esc(catalog.controls.scale === 'all' ? 'All sizes' : catalog.controls.scale)}</strong><br>publication scale</div></div></section>${catalog.disciplines.map(disciplineSection).join('')}`;
  }

  window.HBMagicalLibraryView = { render };
})();
