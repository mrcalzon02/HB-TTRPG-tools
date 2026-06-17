(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  const tag = value => `<span class="ml-tag">${esc(value)}</span>`;

  function bookRow(book) {
    return `<article class="ml-book ml-shelf-${esc(book.shelf.id)}">
      <div class="ml-book-title-line">
        <div>
          <p class="eyebrow">${esc(book.code)} · ${esc(book.format.label)} · ${book.pages} pages</p>
          <h4>${esc(book.title)}</h4>
        </div>
        <div class="ml-book-tags">${tag(book.shelf.label)}${tag(book.circulation)}</div>
      </div>
      <p class="ml-byline">By ${esc(book.author)} · ${esc(book.edition)}</p>
      <p>${esc(book.contents)}</p>
      <div class="ml-metadata-grid">
        <div><strong>Publisher</strong><br>${esc(book.publisher)}</div>
        <div><strong>Series</strong><br>${esc(book.series)}</div>
        <div><strong>Binding</strong><br>${esc(book.format.binding)}</div>
        <div><strong>Call Number</strong><br>${esc(book.callNumber)}</div>
        <div><strong>Course Association</strong><br>${esc(book.courseAssociation)}</div>
        <div><strong>Intended Audience</strong><br>${esc(book.intendedAudience)}</div>
      </div>
      <details><summary>Hilariously Specific Subject Classification</summary><ul><li><strong>Primary subject:</strong> ${esc(book.subject.topic)}</li><li><strong>Required exercise:</strong> ${esc(book.subject.exercise)}</li><li><strong>Known complication:</strong> ${esc(book.subject.hazard)}</li></ul></details>
    </article>`;
  }

  function disciplineSection(discipline) {
    const courseLine = discipline.courseSeeds.length
      ? `<p><strong>Associated courses:</strong> ${discipline.courseSeeds.map(esc).join(' · ')}</p>`
      : '<p><strong>Associated courses:</strong> Departmental and elective syllabus materials.</p>';
    return `<section class="ml-discipline">
      <div class="ml-discipline-heading">
        <div><p class="eyebrow">${esc(discipline.sourceLabel)}</p><h3>${esc(discipline.label)} Syllabus Shelf</h3></div>
        <span class="ml-count">${discipline.books.length} titles</span>
      </div>
      ${courseLine}
      <div class="ml-book-list">${discipline.books.map(bookRow).join('')}</div>
    </section>`;
  }

  function render(root, catalog) {
    const output = root.querySelector('#ml-output');
    if (!catalog.disciplines.length) {
      output.innerHTML = '<p class="ml-empty">No disciplines match the selected shelf and curriculum controls.</p>';
      return;
    }
    output.innerHTML = `<section class="ml-catalog-header">
      <p class="eyebrow">Generated syllabus depository</p>
      <h2>${esc(catalog.libraryName)}</h2>
      <p>${esc(catalog.notice)}</p>
      <div class="ml-summary-grid">
        <div><strong>${catalog.totals.disciplines}</strong><br>disciplines represented</div>
        <div><strong>${catalog.totals.books}</strong><br>magical titles catalogued</div>
        <div><strong>${catalog.controls.titlesPerDiscipline}</strong><br>titles per discipline</div>
        <div><strong>${esc(catalog.controls.scale === 'all' ? 'All sizes' : catalog.controls.scale)}</strong><br>publication scale</div>
      </div>
    </section>${catalog.disciplines.map(disciplineSection).join('')}`;
  }

  window.HBMagicalLibraryView = { render };
})();
