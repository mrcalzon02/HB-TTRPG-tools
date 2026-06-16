(() => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const sample = (list, count) => [...list].sort(() => Math.random() - 0.5).slice(0, count);
  const keys = object => Object.keys(object);
  const choose = (object, id) => id === 'random' ? pick(keys(object)) : id;
  const titleCase = value => value.replace(/\b\w/g, letter => letter.toUpperCase());

  function courseTitle(D, V, domainId, secondaryId, orientationId, levelId, index, forcedTitle) {
    if (index === 0 && forcedTitle) return forcedTitle;
    const domain = D.DOMAINS[domainId];
    const secondary = D.DOMAINS[secondaryId];
    const orientation = V.ORIENTATIONS[orientationId];
    const level = V.LEVELS[levelId];
    const curated = [...(D.TITLE_SEEDS?.[domainId] || []), ...(D.TITLE_SEEDS?.[secondaryId] || [])];
    const relevantCurated = [...new Set(curated)];
    if (index === 0 && relevantCurated.length && Math.random() < 0.45) return pick(relevantCurated);
    const forms = [
      () => `${pick(orientation.adjectives)} ${pick(domain.nouns)}`,
      () => `${level.label} ${pick(domain.nouns)}`,
      () => `${pick(orientation.adjectives)} ${secondary.label} ${pick(domain.nouns)}`,
      () => `${level.label} ${pick(orientation.adjectives)} ${pick(domain.nouns)}`,
      () => `${pick(['High','Twisted','Unknowable','Crimson','Sinful','Supreme','Dying','Foul'])} ${pick(domain.nouns)}`
    ];
    return titleCase(pick(forms)().replace(/\s+/g, ' '));
  }

  function courseCode(domainId, levelRank, index) {
    const prefix = domainId.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
    return `${prefix}-${(levelRank + 1) * 100 + index + 1}`;
  }

  function unitSequence(V, domain, secondary, orientation, level, count = 6) {
    const topics = [...domain.topics, ...secondary.topics];
    return Array.from({ length: count }, (_, i) => ({
      unit: i + 1,
      title: titleCase(pick(topics)),
      format: pick(orientation.formats),
      studyMethod: pick(V.STUDY_METHODS),
      focus: `Students ${pick(level.verbs)} ${pick(topics)} through ${pick(orientation.formats)} work, controlled blasphemy, and documented failure analysis.`
    }));
  }

  function makeCourse(D, V, settings, index, previous) {
    const primary = D.DOMAINS[settings.domainId];
    const secondary = D.DOMAINS[settings.secondaryId];
    const levelKeys = keys(V.LEVELS);
    const levelIndex = Math.min(levelKeys.length - 1, Math.max(0, V.LEVELS[settings.levelId].rank + Math.floor(index / 2)));
    const levelId = levelKeys[levelIndex];
    const level = V.LEVELS[levelId];
    const orientation = V.ORIENTATIONS[settings.orientationId];
    const title = courseTitle(D, V, settings.domainId, settings.secondaryId, settings.orientationId, levelId, index, settings.forcedTitle);
    const practical = pick([...primary.practicals, ...secondary.practicals]);
    const hazard = pick([...primary.hazards, ...secondary.hazards]);
    const units = unitSequence(V, primary, secondary, orientation, level, index < 2 ? 5 : 6);
    return {
      code: courseCode(settings.domainId, level.rank, index),
      title,
      level: { id: levelId, label: level.label },
      credits: index % 3 === 0 ? 4 : 3,
      format: pick(orientation.formats),
      instructor: pick(V.FACULTY),
      facility: pick(V.FACILITIES),
      prerequisite: previous ? `${previous.code} — ${previous.title}` : 'Admission, sponsorship, or faculty willingness to overlook the absence of either',
      catalogDescription: `A ${level.depth} course examining ${pick(primary.topics)}, ${pick(secondary.topics)}, and their use within ${pick(orientation.formats)} environments. Instruction combines condemned theory, controlled ritual practice, and analysis of failures that previous catalogues describe only as “administrative.”`,
      learningOutcomes: sample([
        `${pick(level.verbs)} ${pick(primary.topics)} using accepted profane notation`,
        `${pick(level.verbs)} the relationship between ${pick(primary.topics)} and ${pick(secondary.topics)}`,
        `${pick(level.verbs)} a contained malefic procedure without losing the assigned witness`,
        `${pick(level.verbs)} rival cult methods in written and oral disputation`,
        `${pick(level.verbs)} failures involving ${hazard}`
      ], 4),
      units,
      practicum: `Students ${practical} in ${pick(V.FACILITIES)}. The exercise is then repeated after faculty introduce one controlled betrayal, false omen, or containment defect.`,
      assignments: [pick(V.ASSIGNMENTS), pick(V.ASSIGNMENTS)],
      midterm: pick(V.ASSESSMENTS),
      finalExam: pick(V.ASSESSMENTS),
      requiredMaterials: sample(V.MATERIALS, 4),
      principalHazard: hazard,
      prohibitedShortcut: pick(V.TABOOS),
      passStandard: `Pass the final examination, complete every ritual practical, identify ${hazard} before it becomes self-reporting, and retain enough independent identity to sign the registrar’s ledger.`
    };
  }

  function normalizedSettings(D, V, controls) {
    const toneId = choose(V.INSTITUTION_TONES, controls.toneId);
    const typeId = choose(V.PROGRAM_TYPES, controls.typeId);
    const domainId = choose(D.DOMAINS, controls.domainId);
    let secondaryId = choose(D.DOMAINS, controls.secondaryId);
    if (secondaryId === domainId) secondaryId = pick(keys(D.DOMAINS).filter(id => id !== domainId));
    return {
      toneId, typeId, domainId, secondaryId,
      orientationId: choose(V.ORIENTATIONS, controls.orientationId),
      levelId: choose(V.LEVELS, controls.levelId),
      policyId: choose(V.POLICIES, controls.policyId),
      courseCount: controls.courseCount || V.PROGRAM_TYPES[typeId].courseCount,
      forcedTitle: controls.forcedTitle || '',
      institutionOverride: controls.institutionOverride || '',
      programTitleOverride: controls.programTitleOverride || ''
    };
  }

  function buildProgram(D, V, controls) {
    const settings = normalizedSettings(D, V, controls);
    const tone = V.INSTITUTION_TONES[settings.toneId];
    const programType = V.PROGRAM_TYPES[settings.typeId];
    const primary = D.DOMAINS[settings.domainId];
    const secondary = D.DOMAINS[settings.secondaryId];
    const courses = [];
    for (let i = 0; i < settings.courseCount; i += 1) courses.push(makeCourse(D, V, settings, i, courses[i - 1]));
    const perTerm = settings.typeId === 'blackDoctorate' || settings.typeId === 'masters' ? 3 : 2;
    const terms = [];
    for (let i = 0; i < courses.length; i += perTerm) terms.push({ term: terms.length + 1, courses: courses.slice(i, i + perTerm).map(course => course.code) });
    const institution = settings.institutionOverride || pick(tone.names);
    const generatedTitle = `${programType.credential} in ${pick(V.ORIENTATIONS[settings.orientationId].adjectives)} ${pick(primary.nouns)}`;
    return {
      id: `malefic-program-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      alignment: 'Deliberately Evil',
      institution,
      tone: { id: settings.toneId, label: tone.label, style: tone.style },
      programType: { id: settings.typeId, label: programType.label, credential: programType.credential, duration: programType.duration },
      title: settings.programTitleOverride || generatedTitle,
      department: `Faculty of ${primary.label} and ${secondary.label}`,
      primaryDiscipline: { id: settings.domainId, label: primary.label },
      secondaryDiscipline: { id: settings.secondaryId, label: secondary.label },
      orientation: { id: settings.orientationId, label: V.ORIENTATIONS[settings.orientationId].label },
      entryLevel: { id: settings.levelId, label: V.LEVELS[settings.levelId].label },
      safetyPolicy: { id: settings.policyId, label: V.POLICIES[settings.policyId].label, note: V.POLICIES[settings.policyId].note },
      doctrine: pick(V.DOCTRINES),
      patron: pick(V.PATRONS),
      initiation: pick(V.INITIATIONS),
      centralTaboo: pick(V.TABOOS),
      dropoutFate: pick(V.DROPOUT_FATES),
      overview: `${institution} offers this ${programType.label.toLowerCase()} as a ${tone.style} course of evil-aligned study. The curriculum joins ${primary.label.toLowerCase()} with ${secondary.label.toLowerCase()}, emphasizing ${V.ORIENTATIONS[settings.orientationId].label.toLowerCase()} instruction, ritual literacy, doctrinal corruption, and academically defensible malice.`,
      admissionRequirements: [
        `${V.LEVELS[settings.levelId].label} proficiency in occult notation or equivalent incriminating experience`,
        'A sponsor, patron, captured recommendation letter, or successful entrance ordeal',
        `Signed acknowledgement of the ${V.POLICIES[settings.policyId].label} policy`,
        `Ability to identify at least three warning signs of ${pick(primary.hazards)}`
      ],
      programOutcomes: [
        `Complete a coherent sequence of ${courses.length} malefic courses`,
        'Maintain reproducible forbidden records without allowing the records to reproduce independently',
        `Defend conclusions concerning ${pick(primary.topics)} and ${pick(secondary.topics)}`,
        `Recognize, contain, exploit, or convincingly blame ${pick([...primary.hazards, ...secondary.hazards])}`
      ],
      terms,
      courses,
      comprehensiveExamination: `A ${pick(V.ASSESSMENTS)} covering the complete curriculum, followed by an oral defense before ${pick(V.FACULTY)}, one hostile external examiner, and whichever patron answers first.`,
      capstone: `Candidates must ${pick(V.CAPSTONES)} combining ${primary.label.toLowerCase()} and ${secondary.label.toLowerCase()}.`,
      forbiddenLibrary: sample(V.MATERIALS, 7),
      facultyNote: 'The faculty certifies that the curriculum is fictional, narratively evil, academically exhaustive, and unsuitable for any student who expects tuition, morality, or causality to remain stable.'
    };
  }

  function buildSignature(D, V, signatureId) {
    const signature = D.SIGNATURES[signatureId];
    if (!signature) throw new Error(`Unknown malefic academic signature '${signatureId}'.`);
    const programTitleOverride = signatureId === 'heretics101'
      ? 'Seven-Day Training Course: Introduction to Heretics Cult Rituals 101'
      : signatureId === 'astralCorruption'
        ? 'Demonology of the Advanced Astral Plane University: Advanced Demonic Soul Corruption'
        : signature.label;
    return buildProgram(D, V, {
      toneId: signatureId === 'heretics101' ? 'hiddenCult' : signatureId === 'astralCorruption' ? 'astralUniversity' : 'insaneFaculty',
      typeId: signature.programTypeId,
      domainId: signature.domainId,
      secondaryId: signature.secondaryId,
      orientationId: signature.orientationId,
      levelId: signature.levelId,
      policyId: signature.policyId,
      courseCount: signature.courseCount,
      forcedTitle: signature.label,
      institutionOverride: signature.institution,
      programTitleOverride
    });
  }

  window.HBMaleficAcademicEngine = { buildProgram, buildSignature };
})();
