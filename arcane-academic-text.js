(() => {
  const lines=items=>items.map(item=>`- ${item}`).join('\n');
  function course(course){
    return `${course.code} — ${course.title}\nLevel: ${course.level.label}\nCredits: ${course.credits}\nFormat: ${course.format}\nInstructor: ${course.instructor}\nFacility: ${course.facility}\nPrerequisite: ${course.prerequisite}\nPrincipal Hazard: ${course.principalHazard}\n\n${course.catalogDescription}\n\nLEARNING OUTCOMES\n${lines(course.learningOutcomes)}\n\nCURRICULUM UNITS\n${course.units.map(unit=>`${unit.unit}. ${unit.title} — ${unit.focus} [${unit.method}; ${unit.studyMethod}]`).join('\n')}\n\nLABORATORY OR PRACTICUM\n${course.laboratory}\n\nCOURSEWORK\n${lines(course.coursework)}\n\nMIDTERM\n${course.midterm}\n\nFINAL EXAMINATION\n${course.finalExam}\n\nREQUIRED MATERIALS\n${lines(course.requiredMaterials)}\n\nPASSING STANDARD\n${course.passStandard}`;
  }
  function program(p){
    return `${p.title}\nInstitution: ${p.institution}\nDepartment: ${p.department}\nCredential: ${p.programType.credential}\nPrimary Discipline: ${p.primaryDiscipline.label}\nSecondary Discipline: ${p.secondaryDiscipline.label}\nOrientation: ${p.orientation.label}\nEntry Level: ${p.entryLevel.label}\nSafety Policy: ${p.safetyPolicy.label}\n\nPROGRAM OVERVIEW\n${p.overview}\n\nADMISSION REQUIREMENTS\n${lines(p.admissionRequirements)}\n\nPROGRAM OUTCOMES\n${lines(p.programOutcomes)}\n\nPROGRAM SEQUENCE\n${p.terms.map(term=>`Term ${term.term}: ${term.courses.join(', ')}`).join('\n')}\n\nCOURSE CATALOGUE\n\n${p.courses.map(course).join('\n\n----------------------------------------\n\n')}\n\nCOMPREHENSIVE EXAMINATION\n${p.comprehensiveExamination}\n\nCAPSTONE REQUIREMENT\n${p.capstone}\n\nCORE LIBRARY\n${lines(p.coreLibrary)}\n\nFACULTY NOTE\n${p.facultyNote}`;
  }
  window.HBArcaneAcademicText={program};
})();
