(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  const tags = items => items.map(item => `<span class="mas-tag">${esc(item)}</span>`).join('');

  function courseCard(course) {
    const units = course.units.map(unit => `<tr><td>${unit.unit}</td><td><strong>${esc(unit.title)}</strong><br>${esc(unit.focus)}</td><td>${esc(unit.format)}<br><small>${esc(unit.studyMethod)}</small></td></tr>`).join('');
    return `<article class="mas-course">
      <div class="mas-course-heading"><div><p class="eyebrow">${esc(course.code)} · ${esc(course.level.label)} · ${course.credits} credits</p><h4>${esc(course.title)}</h4></div><span class="mas-format">${esc(course.format)}</span></div>
      <p>${esc(course.catalogDescription)}</p>
      <div class="mas-detail-grid">
        <div><strong>Instructor</strong><br>${esc(course.instructor)}</div><div><strong>Facility</strong><br>${esc(course.facility)}</div><div><strong>Prerequisite</strong><br>${esc(course.prerequisite)}</div><div><strong>Principal Hazard</strong><br>${esc(course.principalHazard)}</div>
      </div>
      <h5>Learning Outcomes</h5>${list(course.learningOutcomes)}
      <h5>Curriculum Units</h5><div class="mas-table-wrap"><table><thead><tr><th>Unit</th><th>Subject and Focus</th><th>Instruction</th></tr></thead><tbody>${units}</tbody></table></div>
      <div class="mas-two-column"><div><h5>Practicum</h5><p>${esc(course.practicum)}</p><h5>Assignments</h5>${list(course.assignments)}</div><div><h5>Assessment</h5><p><strong>Midterm:</strong> ${esc(course.midterm)}</p><p><strong>Final:</strong> ${esc(course.finalExam)}</p><h5>Required Materials</h5>${list(course.requiredMaterials)}</div></div>
      <div class="mas-warning"><strong>Prohibited Shortcut:</strong> ${esc(course.prohibitedShortcut)}</div>
      <div class="mas-pass"><strong>Passing Standard:</strong> ${esc(course.passStandard)}</div>
    </article>`;
  }

  function render(root, programs) {
    root.querySelector('#mas-output').innerHTML = programs.map(program => `<article class="mas-program">
      <p class="eyebrow">${esc(program.institution)} · ${esc(program.department)}</p><h3>${esc(program.title)}</h3>
      <div>${tags([program.alignment, program.programType.label, program.primaryDiscipline.label, program.secondaryDiscipline.label, program.orientation.label, program.entryLevel.label, program.safetyPolicy.label])}</div>
      <p class="mas-overview">${esc(program.overview)}</p>
      <div class="mas-summary-grid">
        <div><strong>Credential</strong><br>${esc(program.programType.credential)}</div><div><strong>Duration</strong><br>${esc(program.programType.duration)}</div><div><strong>Institutional Character</strong><br>${esc(program.tone.style)}</div><div><strong>Safety Policy</strong><br>${esc(program.safetyPolicy.note)}</div>
      </div>
      <div class="mas-doctrine-grid"><div><strong>Governing Doctrine</strong><br>${esc(program.doctrine)}</div><div><strong>Patron or Sponsor</strong><br>${esc(program.patron)}</div><div><strong>Initiation</strong><br>${esc(program.initiation)}</div><div><strong>Central Taboo</strong><br>${esc(program.centralTaboo)}</div><div><strong>Likely Dropout Fate</strong><br>${esc(program.dropoutFate)}</div><div><strong>Course Load</strong><br>${program.courses.length} courses across ${program.terms.length} term${program.terms.length === 1 ? '' : 's'}</div></div>
      <div class="mas-two-column"><div><h4>Admission Requirements</h4>${list(program.admissionRequirements)}</div><div><h4>Program Outcomes</h4>${list(program.programOutcomes)}</div></div>
      <h4>Program Sequence</h4><div class="mas-term-grid">${program.terms.map(term => `<div class="mas-term"><strong>Term ${term.term}</strong>${list(term.courses.map(code => { const course = program.courses.find(item => item.code === code); return `${course.code} — ${course.title}`; }))}</div>`).join('')}</div>
      <h4>Forbidden Course Catalogue and Syllabi</h4>${program.courses.map(courseCard).join('')}
      <div class="mas-capstone"><h4>Comprehensive Examination</h4><p>${esc(program.comprehensiveExamination)}</p><h4>Black Capstone Requirement</h4><p>${esc(program.capstone)}</p><h4>Forbidden Library and Study Materials</h4>${list(program.forbiddenLibrary)}<p><em>${esc(program.facultyNote)}</em></p></div>
    </article>`).join('');
  }

  window.HBMaleficAcademicView = { render };
})();
