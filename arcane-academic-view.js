(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=items=>`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
  const tags=items=>items.map(item=>`<span class="aas-tag">${esc(item)}</span>`).join('');

  function courseCard(course){
    const units=course.units.map(unit=>`<tr><td>${unit.unit}</td><td><strong>${esc(unit.title)}</strong><br>${esc(unit.focus)}</td><td>${esc(unit.method)}<br><small>${esc(unit.studyMethod)}</small></td></tr>`).join('');
    return `<article class="aas-course">
      <div class="aas-course-heading"><div><p class="eyebrow">${esc(course.code)} · ${esc(course.level.label)} · ${course.credits} credits</p><h4>${esc(course.title)}</h4></div><span class="aas-format">${esc(course.format)}</span></div>
      <p>${esc(course.catalogDescription)}</p>
      <div class="aas-detail-grid">
        <div><strong>Instructor</strong><br>${esc(course.instructor)}</div><div><strong>Facility</strong><br>${esc(course.facility)}</div><div><strong>Prerequisite</strong><br>${esc(course.prerequisite)}</div><div><strong>Principal Hazard</strong><br>${esc(course.principalHazard)}</div>
      </div>
      <h5>Learning Outcomes</h5>${list(course.learningOutcomes)}
      <h5>Curriculum Units</h5><div class="aas-table-wrap"><table><thead><tr><th>Unit</th><th>Subject and Focus</th><th>Instruction</th></tr></thead><tbody>${units}</tbody></table></div>
      <div class="aas-two-column"><div><h5>Laboratory or Practicum</h5><p>${esc(course.laboratory)}</p><h5>Coursework</h5>${list(course.coursework)}</div><div><h5>Assessment</h5><p><strong>Midterm:</strong> ${esc(course.midterm)}</p><p><strong>Final:</strong> ${esc(course.finalExam)}</p><h5>Required Materials</h5>${list(course.requiredMaterials)}</div></div>
      <div class="aas-pass"><strong>Passing Standard:</strong> ${esc(course.passStandard)}</div>
    </article>`;
  }

  function render(root,programs){
    root.querySelector('#aas-output').innerHTML=programs.map(program=>`<article class="aas-program">
      <p class="eyebrow">${esc(program.institution)} · ${esc(program.department)}</p><h3>${esc(program.title)}</h3>
      <div>${tags([program.programType.label,program.primaryDiscipline.label,program.secondaryDiscipline.label,program.orientation.label,program.entryLevel.label,program.safetyPolicy.label])}</div>
      <p class="aas-overview">${esc(program.overview)}</p>
      <div class="aas-summary-grid">
        <div><strong>Credential</strong><br>${esc(program.programType.credential)}</div><div><strong>Institutional Character</strong><br>${esc(program.tone.style)}</div><div><strong>Safety Policy</strong><br>${esc(program.safetyPolicy.note)}</div><div><strong>Course Load</strong><br>${program.courses.length} courses across ${program.terms.length} term${program.terms.length===1?'':'s'}</div>
      </div>
      <div class="aas-two-column"><div><h4>Admission Requirements</h4>${list(program.admissionRequirements)}</div><div><h4>Program Outcomes</h4>${list(program.programOutcomes)}</div></div>
      <h4>Program Sequence</h4><div class="aas-term-grid">${program.terms.map(term=>`<div class="aas-term"><strong>Term ${term.term}</strong>${list(term.courses.map(code=>{const c=program.courses.find(course=>course.code===code);return `${c.code} — ${c.title}`;}))}</div>`).join('')}</div>
      <h4>Course Catalogue and Syllabi</h4>${program.courses.map(courseCard).join('')}
      <div class="aas-capstone"><h4>Comprehensive Examination</h4><p>${esc(program.comprehensiveExamination)}</p><h4>Capstone Requirement</h4><p>${esc(program.capstone)}</p><h4>Core Library and Study Materials</h4>${list(program.coreLibrary)}<p><em>${esc(program.facultyNote)}</em></p></div>
    </article>`).join('');
  }

  window.HBArcaneAcademicView={render};
})();
