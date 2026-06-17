(() => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const randint = (min,max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const sample = (list,count) => {
    const pool = [...list];
    const chosen = [];
    while (pool.length && chosen.length < count) chosen.push(pool.splice(Math.floor(Math.random() * pool.length),1)[0]);
    return chosen;
  };
  const sentence = value => value.endsWith('.') ? value : `${value}.`;
  const titleCase = value => String(value).replace(/\b\w/g,letter => letter.toUpperCase());

  function voiceFor(book,C) {
    return pick(C.VOICES[book.shelf.id] || C.VOICES.neutral);
  }

  function formattingFor(book,blueprint,C) {
    return {
      layout:blueprint.layout,
      narrativeVoice:voiceFor(book,C),
      headingSystem:blueprint.unitLabel === 'Section' ? 'short titled sections without chapter numbering' : `${blueprint.unitLabel.toLowerCase()} numbering with nested decimal subsections`,
      recurringFeatures:sample(C.FORMATTING_FEATURES,book.format.detailDepth + 2),
      frontMatter:[...blueprint.frontMatter],
      backMatter:[...blueprint.backMatter],
      citationStyle:book.format.scale === 'brief' ? 'brief source note or instructor attribution' : book.format.detailDepth >= 4 ? 'full scholastic citations with variant readings and cross-references' : 'numbered notes with a selected bibliography',
      illustrationPlan:book.composition.illustrations,
      accessibility:book.format.scale === 'brief' ? 'plain language, short paragraphs, and visible warnings' : 'summary boxes, defined terminology, and navigable cross-references'
    };
  }

  function introductionFor(book,C,voice) {
    const moves = sample(C.INTRO_MOVES,3);
    const purpose = pick(C.PURPOSES);
    const warning = pick(C.WARNING_LINES);
    return {
      title:book.format.scale === 'brief' ? 'Before You Begin' : 'Introduction',
      summary:`The introduction ${moves.join(', ')}, and establishes how the reader should approach ${book.subject.topic}.`,
      paragraphs:[
        `${book.title} was prepared to ${purpose}. It addresses ${book.subject.topic} as taught through ${book.courseAssociation}, but it does not assume that naming the subject is equivalent to mastering it.`,
        `The text adopts the voice of a ${voice}. Its practical center is ${book.subject.exercise}, while its principal caution concerns ${book.subject.hazard}. Readers are expected to compare each instruction against local faculty policy, current conditions, and their own level of training.`,
        `${warning} The author’s confidence in the material should be read alongside the publication’s confidence rating of ${book.ratings.confidence.score}/100, usefulness rating of ${book.ratings.usefulness.score}/100, and safety rating of ${book.ratings.safety.score}/100.`
      ]
    };
  }

  function unitTitle(book,C,role,index) {
    const subject = index % 3 === 0 ? book.subject.topic : index % 3 === 1 ? book.subject.exercise : book.subject.hazard;
    const forms = [
      `${role}: ${titleCase(subject)}`,
      `${pick(C.CHAPTER_OPENERS)} ${titleCase(subject)}`,
      `${titleCase(subject)} and the Problem of ${titleCase(book.subject.hazard)}`,
      `${role} for ${titleCase(book.intendedAudience)}`
    ];
    return forms[index % forms.length];
  }

  function unitSummary(book,role) {
    const summaries = {
      'Foundational Principle':`Defines the central claim behind ${book.subject.topic} and distinguishes it from adjacent magical practices.`,
      'Terminology and Definitions':`Establishes the terms required to discuss ${book.subject.topic} without confusing labels, causes, and observed effects.`,
      'Historical Context':`Traces how scholars, instructors, and practitioners came to understand ${book.subject.topic}, including the mistakes preserved in older editions.`,
      'Recognizing the Phenomenon':`Provides observable signs, classification tests, and false positives associated with ${book.subject.topic}.`,
      'Required Preparation':`Lists the knowledge, materials, permissions, and environmental conditions needed before attempting ${book.subject.exercise}.`,
      'Practical Method':`Breaks ${book.subject.exercise} into ordered stages with verification points and stop-work conditions.`,
      'Worked Example':`Follows a representative case from preparation through result, including the moment ${book.subject.hazard} becomes relevant.`,
      'Common Failure':`Explains frequent errors, misleading successes, and the institutional habits that allow ${book.subject.hazard} to recur.`,
      'Known Hazard':`Examines ${book.subject.hazard}, its warning signs, escalation pattern, and appropriate response.`,
      'Corrective Procedure':`Presents containment, reversal, repair, or reporting procedures when the normal method fails.`,
      'Ethical or Doctrinal Dispute':`Compares competing interpretations of whether and when this knowledge should be used.`,
      'Field Application':`Shows how the topic changes outside controlled classrooms, laboratories, or ritual halls.`,
      'Examination Guidance':`Identifies the distinctions, procedures, and common traps most likely to appear in formal assessment.`,
      'Summary and Review':`Condenses the text into review statements, questions, and a final caution.`
    };
    return summaries[role] || `Develops ${role.toLowerCase()} through the study of ${book.subject.topic}.`;
  }

  function objectivesFor(book,role) {
    return [
      `Explain ${book.subject.topic} using the terminology introduced in this ${role.toLowerCase()}.`,
      `Relate ${book.subject.exercise} to the publication’s stated practical method.`,
      `Identify conditions that may produce or resemble ${book.subject.hazard}.`
    ];
  }

  function sectionsFor(book,C,role) {
    const patterns = sample(C.SUBSECTION_PATTERNS,book.format.detailDepth >= 4 ? 6 : 4);
    return patterns.map((pattern,index) => ({
      number:index + 1,
      title:pattern,
      summary:index === 0 ? `Introduces ${role.toLowerCase()} as it applies to ${book.subject.topic}.` : index === 1 ? `Connects the section to ${book.subject.exercise}.` : index === 2 ? `Examines evidence, disagreement, or failure involving ${book.subject.hazard}.` : `Provides ${pattern.toLowerCase()} suitable for ${book.intendedAudience}.`
    }));
  }

  function pamphletSectionContent(book,role,C) {
    const warning = pick(C.WARNING_LINES);
    const commonParagraph = `${unitSummary(book,role)} In this pamphlet, the point is not exhaustive mastery but reliable recognition: the reader should know what ${book.subject.topic} is, why ${book.subject.exercise} is used, and when ${book.subject.hazard} means the exercise must stop.`;
    if (role === 'Foundational Principle') return { paragraphs:[commonParagraph,`The working rule is simple: begin with observation, name only what the evidence supports, and separate the desired effect from the method used to produce it. A result that resembles ${book.subject.topic} may still arise from contamination, imitation, or an unrelated magical pressure.`], bullets:[] };
    if (role === 'Terminology and Definitions') return { paragraphs:[commonParagraph], bullets:[`Subject: ${book.subject.topic}.`,`Practice: ${book.subject.exercise}.`,`Principal complication: ${book.subject.hazard}.`,`Verification: a second observation made under changed conditions.`,`Closure: the step that ends, neutralizes, records, or safely contains the exercise.`] };
    if (role === 'Practical Method') return { paragraphs:[commonParagraph], bullets:[`Confirm the purpose of the exercise and the reader’s authority to perform it.`,`Prepare the smallest workable demonstration of ${book.subject.exercise}.`,`Record the expected signs before beginning.`,`Perform one stage at a time and verify the result before continuing.`,`Stop, contain, and report any sign of ${book.subject.hazard}.`,`Complete closure and compare the result with the original expectation.`] };
    if (role === 'Known Hazard' || role === 'Common Failure') return { paragraphs:[commonParagraph,warning], bullets:[`Unexpected changes in timing, colour, sound, temperature, memory, or participant behavior.`,`A result that continues after the exercise should have ended.`,`Instructions, diagrams, or witnesses beginning to contradict the recorded procedure.`,`Pressure to continue merely because the first stage appeared successful.`] };
    if (role === 'Corrective Procedure') return { paragraphs:[commonParagraph,`Do not improvise a larger intervention to repair a poorly understood smaller one. Reduce active inputs, preserve evidence, establish distance, and bring the matter to a qualified instructor or responsible authority.`], bullets:[`Stop adding power or components.`,`Mark the last verified safe state.`,`Separate observers from the affected area.`,`Use the course-approved closure or containment procedure.`,`Record the event before memory, evidence, or institutional enthusiasm changes it.`] };
    if (role === 'Summary and Review' || role === 'Examination Guidance') return { paragraphs:[commonParagraph], bullets:[`Define ${book.subject.topic} in one sentence.`,`List the stages of ${book.subject.exercise} in order.`,`Name three warning signs of ${book.subject.hazard}.`,`Explain why a successful result may still be unsafe.`,`Identify the point at which the reader should stop and seek supervision.`] };
    return { paragraphs:[commonParagraph], bullets:[`Observe before naming.`,`Prepare before acting.`,`Verify before continuing.`,`Close before celebrating.`] };
  }

  function buildPamphlet(book,blueprint,C,introduction) {
    const count = randint(blueprint.minUnits,blueprint.maxUnits);
    const required = ['Foundational Principle','Terminology and Definitions','Practical Method','Known Hazard','Summary and Review'];
    const roles = required.slice(0,count);
    while (roles.length < count) roles.splice(roles.length - 1,0,pick(['Recognizing the Phenomenon','Common Failure','Corrective Procedure','Examination Guidance']));
    const units = roles.map((role,index) => {
      const content = pamphletSectionContent(book,role,C);
      return { number:index + 1, role, title:unitTitle(book,C,role,index), summary:unitSummary(book,role), estimatedPages:Math.max(1,Math.round(book.pages / count)), objectives:objectivesFor(book,role), subsections:[], fullText:{ paragraphs:content.paragraphs, bullets:content.bullets } };
    });
    return { introduction, units };
  }

  function lessonText(book,role,C,index) {
    const warning = pick(C.WARNING_LINES);
    return {
      paragraphs:[
        `${unitSummary(book,role)} The lesson begins from the course assumption that ${book.subject.topic} can be studied systematically, but only when the student distinguishes observation, interpretation, procedure, and result.`,
        `In practical terms, ${book.subject.exercise} should be treated as a sequence of decisions rather than a single dramatic act. Each stage must have a purpose, an expected sign, and a condition under which the student refuses to continue.`,
        index % 2 === 0 ? `The principal example concerns ${book.subject.hazard}. The guide compares a genuine warning sign with two misleading alternatives and asks the reader to justify the difference.` : `The compiler includes a short classroom case in which the correct procedure succeeds for the wrong reason, forcing the reader to separate usefulness from confidence.`
      ],
      bullets:[warning,`Write a two-sentence definition of ${book.subject.topic}.`,`Identify one safe and one unsafe use of ${book.subject.exercise}.`,`Describe how ${book.subject.hazard} would be documented before any corrective action.`]
    };
  }

  function buildStudyGuide(book,blueprint,C,introduction) {
    const count = randint(blueprint.minUnits,blueprint.maxUnits);
    const roles = sample(C.SECTION_ROLES.filter(role => role !== 'Summary and Review'),count - 1).concat('Summary and Review');
    const units = roles.map((role,index) => ({
      number:index + 1,
      role,
      title:unitTitle(book,C,role,index),
      summary:unitSummary(book,role),
      estimatedPages:Math.max(1,Math.round(book.pages / count)),
      objectives:objectivesFor(book,role),
      subsections:sectionsFor(book,C,role),
      fullText:lessonText(book,role,C,index),
      exercise:{ type:pick(C.EXERCISE_TYPES), prompt:`Using the lesson’s method, analyze a supervised example of ${book.subject.exercise} and explain how you would distinguish an expected result from ${book.subject.hazard}.` }
    }));
    return { introduction, units };
  }

  function buildArchitecture(book,blueprint,C,introduction) {
    const count = randint(blueprint.minUnits,blueprint.maxUnits);
    const roles = [];
    for (let index = 0; index < count; index += 1) roles.push(C.SECTION_ROLES[index % C.SECTION_ROLES.length]);
    const units = roles.map((role,index) => ({
      number:index + 1,
      role,
      title:unitTitle(book,C,role,index),
      summary:unitSummary(book,role),
      estimatedPages:Math.max(2,Math.round(book.pages / (count + blueprint.frontMatter.length / 2))),
      objectives:objectivesFor(book,role),
      subsections:sectionsFor(book,C,role),
      sampleOpening:index < 2 ? `${unitSummary(book,role)} This ${blueprint.unitLabel.toLowerCase()} opens by placing ${book.subject.topic} within the practical and scholarly limits established by ${book.author.name}. It then turns toward ${book.subject.exercise}, using ${book.subject.hazard} as the test case through which competing explanations are compared.` : null,
      fullText:null
    }));
    return { introduction, units };
  }

  function appendicesFor(book,blueprint,C) {
    const count = book.format.detailDepth + 1;
    return sample(C.APPENDIX_TYPES,count).map((title,index) => ({
      letter:String.fromCharCode(65 + index),
      title,
      summary:title.includes('Glossary') ? `Defines the specialist vocabulary used throughout the work, including disputed uses of ${book.subject.topic}.` : title.includes('Procedure') ? `Condenses ${book.subject.exercise} into a reference sequence with verification and stop-work points.` : title.includes('Errors') ? `Catalogues known mistakes associated with ${book.subject.hazard} and identifies corrections by edition.` : `Provides supporting reference material appropriate to ${book.intendedAudience}.`
    }));
  }

  function buildContent(book,C) {
    const blueprint = C.BLUEPRINTS[book.format.id];
    const formatting = formattingFor(book,blueprint,C);
    const epigraph = pick(C.FRONT_EPIGRAPHS[book.shelf.id] || C.FRONT_EPIGRAPHS.neutral);
    const introduction = introductionFor(book,C,formatting.narrativeVoice);
    const built = book.format.id === 'pamphlet' ? buildPamphlet(book,blueprint,C,introduction) : book.format.id === 'lectureNotes' ? buildStudyGuide(book,blueprint,C,introduction) : buildArchitecture(book,blueprint,C,introduction);
    const estimatedWords = Math.round(book.pages * blueprint.wordsPerPage);
    const tableOfContents = built.units.map(unit => ({ number:unit.number, title:unit.title, summary:unit.summary, estimatedPages:unit.estimatedPages }));
    return {
      schemaVersion:'1.0.0',
      maturity:blueprint.maturity,
      isFullDraft:blueprint.fullDraft,
      estimatedWords,
      actualDraftScope:blueprint.fullDraft ? 'Complete generated body draft with editable prose, exercises, and review material.' : 'Complete front matter and chapter architecture with summaries, objectives, subsections, page allocation, and sample openings for early chapters.',
      formatting,
      frontMatter:{ epigraph, purpose:pick(C.PURPOSES), introduction:built.introduction },
      tableOfContents,
      units:built.units,
      appendices:appendicesFor(book,blueprint,C),
      productionNotes:{ targetLength:`Approximately ${estimatedWords.toLocaleString()} words across ${book.pages} pages.`, expansionOrder:blueprint.fullDraft ? 'Edit and typeset the complete draft.' : `Expand ${blueprint.unitLabel.toLowerCase()}s in order, preserving objectives, summaries, page budgets, and cross-references.`, sourceProfile:`Generated from ${book.summary} Author confidence ${book.ratings.confidence.score}/100; readability ${book.ratings.readability.score}/100; scholarly value ${book.ratings.scholarlyValue.score}/100.` }
    };
  }

  function install() {
    const Engine = window.HBMagicalLibraryEngine;
    const C = window.HBMagicalLibraryContentVocabulary;
    if (!Engine || !C || Engine.__contentsInstalled) return;
    const original = Engine.buildCatalog;
    Engine.buildCatalog = function(arcane,malefic,V,controls) {
      const catalog = original(arcane,malefic,V,controls);
      for (const discipline of catalog.disciplines) for (const book of discipline.books) book.generatedContent = buildContent(book,C);
      catalog.contentGeneration = { schemaVersion:'1.0.0', completeDraftFormats:['pamphlet','lectureNotes'], structuredDraftFormats:['fieldGuide','handbook'], architectureFormats:['textbook','monograph','atlas','ritualManual','devotionalTome','concordance'] };
      return catalog;
    };
    Engine.__contentsInstalled = true;
  }

  install();
  window.HBMagicalLibraryContentEngine = { buildContent, install };
})();
