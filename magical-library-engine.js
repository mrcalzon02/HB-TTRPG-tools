(() => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const randint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const titleCase = value => String(value).replace(/\b\w/g, letter => letter.toUpperCase());
  const unique = list => [...new Set(list)];
  const FORMAT_SEQUENCE = ['pamphlet','lectureNotes','fieldGuide','handbook','textbook','monograph','atlas','ritualManual','devotionalTome','concordance'];

  function collectDisciplines(arcane, malefic) {
    const rows = [];
    for (const [id, domain] of Object.entries(arcane.DOMAINS)) {
      rows.push({
        id:`arcane:${id}`, source:'arcane', sourceLabel:'Arcane Academic Studies', domainId:id,
        label:domain.label, nouns:domain.nouns, topics:domain.topics,
        exercises:domain.labs || [], hazards:domain.hazards || [],
        courseSeeds:arcane.TITLE_SEEDS?.[id] || []
      });
    }
    for (const [id, domain] of Object.entries(malefic.DOMAINS)) {
      rows.push({
        id:`malefic:${id}`, source:'malefic', sourceLabel:'Malefic Academic Studies', domainId:id,
        label:domain.label, nouns:domain.nouns, topics:domain.topics,
        exercises:domain.practicals || [], hazards:domain.hazards || [],
        courseSeeds:malefic.TITLE_SEEDS?.[id] || []
      });
    }
    return rows;
  }

  function shelvesFor(source) {
    return source === 'malefic' ? ['malefic','malefic','dubious','neutral'] : ['luminous','neutral','neutral','dubious'];
  }

  function formatIds(V, count, scale) {
    const allowed = Object.entries(V.FORMATS).filter(([,format]) => scale === 'all' || format.scale === scale).map(([id]) => id);
    if (scale !== 'all') return Array.from({ length: count }, (_, index) => allowed[index % allowed.length]);
    return Array.from({ length: count }, (_, index) => FORMAT_SEQUENCE[index] || pick(FORMAT_SEQUENCE));
  }

  function pageCount(format) {
    if (format.scale === 'monumental') {
      const rounded = randint(Math.ceil(format.minPages / 10), Math.floor(format.maxPages / 10)) * 10;
      return Math.max(600, rounded);
    }
    return randint(format.minPages, format.maxPages);
  }

  function selectShelf(V, source, requestedShelf) {
    if (requestedShelf && requestedShelf !== 'all') return requestedShelf;
    return pick(shelvesFor(source));
  }

  function specificSubject(domain) {
    const topic = pick(domain.topics);
    const hazard = pick(domain.hazards);
    const exercise = pick(domain.exercises);
    return { topic, hazard, exercise };
  }

  function titleFor(V, domain, formatId, subject, index) {
    const noun = pick(domain.nouns);
    const opener = pick(V.TITLE_OPENERS);
    const connector = pick(V.TITLE_CONNECTORS);
    const humor = pick(V.HUMOR_CLAUSES);
    const seed = domain.courseSeeds.length ? pick(domain.courseSeeds) : `${domain.label} Seminar`;
    const forms = [
      `${opener} ${noun}: ${connector} ${humor}`,
      `${titleCase(subject.topic)} for ${pick(V.AUDIENCES)}: ${connector} ${subject.hazard}`,
      `The ${randint(7, 913)} Official Distinctions Between ${titleCase(subject.topic)} and ${titleCase(subject.hazard)}`,
      `Companion Readings for ${seed}: ${connector} ${humor}`,
      `${pick(['Pocket','Collegiate','Devotional','Illustrated','Corrected','Exhaustive','Needlessly Cautious','Faculty-Disputed'])} ${noun} and ${titleCase(subject.topic)}: ${connector} ${humor}`,
      `On ${titleCase(subject.topic)}, ${titleCase(subject.hazard)}, and the Persistent Rumour Concerning ${humor}`,
      `${pick(['Proceedings','Minutes','Confessions','Annotations','Objections','Devotions','Corrections','Field Notes'])} of the ${randint(2, 19)}th Symposium on ${titleCase(subject.topic)}`,
      `Why ${titleCase(subject.hazard)} Is Not a Substitute for ${titleCase(subject.topic)}: A Manual for ${pick(V.AUDIENCES)}`,
      `The Surprisingly Liturgical Problem of ${titleCase(subject.topic)}: ${connector} ${humor}`,
      `${formatId === 'devotionalTome' ? 'Six Hundred Pages of Devotions Upon' : opener} ${titleCase(subject.topic)} and Its Most Petty Consequences`
    ];
    return forms[index % forms.length];
  }

  function contentNote(V, domain, subject) {
    return `A hilariously specific study of ${subject.topic}, centered on ${subject.exercise}, the prevention or deliberate documentation of ${subject.hazard}, and ${pick(V.CONTENT_FEATURES)}.`;
  }

  function catalogCode(domain, formatId, index) {
    const prefix = domain.label.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
    const formatPrefix = formatId.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    return `${domain.source === 'malefic' ? 'ML-D' : 'ML-L'}-${prefix}-${formatPrefix}-${String(index + 1).padStart(2, '0')}`;
  }

  function callPrefix(value, fallback) {
    const cleaned = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    return cleaned || fallback;
  }

  function buildBook(V, libraryName, domain, controls, formatId, index, usedTitles) {
    const format = V.FORMATS[formatId];
    let subject;
    let title;
    let attempts = 0;
    do {
      subject = specificSubject(domain);
      title = titleFor(V, domain, formatId, subject, index + attempts);
      attempts += 1;
    } while (usedTitles.has(title) && attempts < 30);
    if (usedTitles.has(title)) title = `${title} — Departmental Variant ${index + 1}`;
    usedTitles.add(title);
    const shelfId = selectShelf(V, domain.source, controls.shelfId);
    const publisher = pick(V.PUBLISHERS[shelfId]);
    const pages = pageCount(format);
    return {
      code:catalogCode(domain, formatId, index),
      title,
      courseAssociation:domain.courseSeeds.length ? pick(domain.courseSeeds) : `${domain.label} departmental syllabus`,
      discipline:domain.label,
      source:domain.source,
      sourceLabel:domain.sourceLabel,
      shelf:{ id:shelfId, label:V.SHELVES[shelfId].label },
      format:{ id:formatId, label:format.label, binding:format.binding, scale:format.scale },
      pages,
      author:pick(V.AUTHORS),
      publisher,
      series:pick(V.SERIES),
      edition:pick(V.EDITIONS),
      intendedAudience:pick(V.AUDIENCES),
      subject:{ topic:subject.topic, exercise:subject.exercise, hazard:subject.hazard },
      contents:contentNote(V, domain, subject),
      callNumber:`${callPrefix(libraryName, 'LIB')}.${callPrefix(domain.label, 'MAG')}.${pages}`,
      circulation: shelfId === 'malefic' ? pick(['Restricted stacks','Chains requested','Faculty permission required','May leave only with a supervising exorcist']) : shelfId === 'dubious' ? pick(['Graduate reserve','Desk copy only','Circulates with waiver','Available after dusk']) : pick(['General stacks','Course reserve','Reference room','Student lending shelf'])
    };
  }

  function selectedDisciplines(all, controls) {
    return all.filter(domain => {
      if (controls.sourceId !== 'all' && domain.source !== controls.sourceId) return false;
      if (controls.disciplineId !== 'all' && domain.id !== controls.disciplineId) return false;
      return true;
    });
  }

  function buildCatalog(arcane, malefic, V, controls = {}) {
    const normalized = {
      sourceId:controls.sourceId || 'all',
      disciplineId:controls.disciplineId || 'all',
      shelfId:controls.shelfId || 'all',
      scale:controls.scale || 'all',
      titlesPerDiscipline:Math.max(10, Math.min(30, Number(controls.titlesPerDiscipline) || 10))
    };
    const libraryName = pick(V.LIBRARIES);
    const disciplines = selectedDisciplines(collectDisciplines(arcane, malefic), normalized).map(domain => {
      const usedTitles = new Set();
      const formats = formatIds(V, normalized.titlesPerDiscipline, normalized.scale);
      const books = formats.map((formatId, index) => buildBook(V, libraryName, domain, normalized, formatId, index, usedTitles));
      return {
        id:domain.id,
        label:domain.label,
        source:domain.source,
        sourceLabel:domain.sourceLabel,
        courseSeeds:unique(domain.courseSeeds),
        books
      };
    });
    const totalBooks = disciplines.reduce((sum, discipline) => sum + discipline.books.length, 0);
    return {
      id:`magical-library-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      libraryName,
      generatedAt:new Date().toISOString(),
      controls:normalized,
      disciplines,
      totals:{ disciplines:disciplines.length, books:totalBooks },
      notice:'All titles, publishers, courses, authors, magical practices, hazards, and cataloguing systems are fictional worldbuilding material.'
    };
  }

  window.HBMagicalLibraryEngine = { collectDisciplines, buildCatalog };
})();
