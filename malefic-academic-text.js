(() => {
  const lines = items => items.map(item => `- ${item}`).join('\n');

  function course(course) {
    return `${course.code} — ${course.title}\nLevel: ${course.level.label}\nCredits: ${course.credits}\nFormat: ${course.format}\nInstructor: ${course.instructor}\nFacility: ${course.facility}\nPrerequisite: ${course.prerequisite}\nPrincipal Hazard: ${course.principalHazard}\n\n${course.catalogDescription}\n\nLEARNING OUTCOMES\n${lines(course.learningOutcomes)}\n\nCURRICULUM UNITS\n${course.units.map(unit => `${unit.unit}. ${unit.title} — ${unit.focus} [${unit.format}; ${unit.studyMethod}]`).join('\n')}\n\nPRACTICUM\n${course.practicum}\n\nASSIGNMENTS\n${lines(course.assignments)}\n\nMIDTERM\n${course.midterm}\n\nFINAL EXAMINATION\n${course.finalExam}\n\nREQUIRED MATERIALS\n${lines(course.requiredMaterials)}\n\nPROHIBITED SHORTCUT\n${course.prohibitedShortcut}\n\nPASSING STANDARD\n${course.passStandard}`;
  }

  function program(program) {
    return `${program.title}\nInstitution: ${program.institution}\nDepartment: ${program.department}\nAlignment: ${program.alignment}\nCredential: ${program.programType.credential}\nDuration: ${program.programType.duration}\nPrimary Discipline: ${program.primaryDiscipline.label}\nSecondary Discipline: ${program.secondaryDiscipline.label}\nOrientation: ${program.orientation.label}\nEntry Level: ${program.entryLevel.label}\nSafety Policy: ${program.safetyPolicy.label}\n\nPROGRAM OVERVIEW\n${program.overview}\n\nGOVERNING DOCTRINE\n${program.doctrine}\n\nPATRON OR SPONSOR\n${program.patron}\n\nINITIATION\n${program.initiation}\n\nCENTRAL TABOO\n${program.centralTaboo}\n\nLIKELY DROPOUT FATE\n${program.dropoutFate}\n\nADMISSION REQUIREMENTS\n${lines(program.admissionRequirements)}\n\nPROGRAM OUTCOMES\n${lines(program.programOutcomes)}\n\nPROGRAM SEQUENCE\n${program.terms.map(term => `Term ${term.term}: ${term.courses.join(', ')}`).join('\n')}\n\nFORBIDDEN COURSE CATALOGUE\n\n${program.courses.map(course).join('\n\n----------------------------------------\n\n')}\n\nCOMPREHENSIVE EXAMINATION\n${program.comprehensiveExamination}\n\nBLACK CAPSTONE REQUIREMENT\n${program.capstone}\n\nFORBIDDEN LIBRARY\n${lines(program.forbiddenLibrary)}\n\nFACULTY NOTE\n${program.facultyNote}`;
  }

  window.HBMaleficAcademicText = { program };
})();
