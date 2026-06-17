(() => {
  const ratingLines = ratings => Object.entries(ratings).map(([name,rating]) => `- ${name.replace(/([A-Z])/g,' $1')}: ${rating.score}/100 (${rating.label})`).join('\n');

  function composition(book) {
    const lines = [`Substrate: ${book.composition.substrate}`,`Ink: ${book.composition.ink}`,`Cover or wrapper: ${book.composition.cover}`,`Leaf arrangement: ${book.composition.leafArrangement}`,`Dimensions: ${book.composition.dimensions}`,`Illustrations: ${book.composition.illustrations}`,`Weight: approximately ${book.composition.weightKg} kg`];
    if (book.composition.binding) lines.splice(2,0,`Binding: ${book.composition.binding}`);
    return lines.join('\n');
  }

  function optional(book) {
    const lines = [];
    if (book.sensory.scent) lines.push(`Scent: ${book.sensory.scent}`);
    if (book.sensory.aura) lines.push(`Aura: ${book.sensory.aura}`);
    if (book.optional.marginalia) lines.push(`Marginalia: ${book.optional.marginalia}`);
    if (book.optional.provenanceNote) lines.push(`Additional provenance: ${book.optional.provenanceNote}`);
    if (book.optional.magicalQuirk) lines.push(`Magical quirk: ${book.optional.magicalQuirk}`);
    return lines.length ? lines.join('\n') : 'No unusual copy-specific features recorded.';
  }

  function unitText(unit) {
    const lines = [`${unit.number}. ${unit.title}`,`Role: ${unit.role}`,`Estimated length: ${unit.estimatedPages} pages`,unit.summary,'Learning objectives:',...unit.objectives.map(item => `- ${item}`)];
    if (unit.subsections?.length) lines.push('Subsections:',...unit.subsections.map(section => `- ${section.number}. ${section.title}: ${section.summary}`));
    if (unit.sampleOpening) lines.push('Sample opening:',unit.sampleOpening);
    if (unit.fullText) {
      lines.push('Generated draft prose:',...unit.fullText.paragraphs);
      if (unit.fullText.bullets?.length) lines.push('Generated lists and reference points:',...unit.fullText.bullets.map(item => `- ${item}`));
    }
    if (unit.exercise) lines.push(`Exercise (${unit.exercise.type}): ${unit.exercise.prompt}`);
    return lines.join('\n');
  }

  function generatedContent(book) {
    const content = book.generatedContent;
    if (!content) return 'No generated content package is attached.';
    const intro = content.frontMatter.introduction;
    const table = content.tableOfContents.map(unit => `${unit.number}. ${unit.title} — ${unit.estimatedPages} pages — ${unit.summary}`).join('\n');
    const appendices = content.appendices.map(item => `Appendix ${item.letter}: ${item.title} — ${item.summary}`).join('\n');
    return `CONTENT GENERATION STATUS\nMaturity: ${content.maturity}\nFull generated body draft: ${content.isFullDraft ? 'Yes' : 'No'}\nEstimated finished length: ${content.estimatedWords.toLocaleString()} words\nDraft scope: ${content.actualDraftScope}\n\nFORMATTING PLAN\nLayout: ${content.formatting.layout}\nNarrative voice: ${content.formatting.narrativeVoice}\nHeading system: ${content.formatting.headingSystem}\nCitation style: ${content.formatting.citationStyle}\nIllustration plan: ${content.formatting.illustrationPlan}\nAccessibility: ${content.formatting.accessibility}\nRecurring features: ${content.formatting.recurringFeatures.join('; ')}\nFront matter: ${content.formatting.frontMatter.join('; ')}\nBack matter: ${content.formatting.backMatter.join('; ')}\n\nFRONT MATTER\nEpigraph: “${content.frontMatter.epigraph}”\nPurpose: ${content.frontMatter.purpose}\n${intro.title}\n${intro.summary}\n\n${intro.paragraphs.join('\n\n')}\n\nTABLE OF CONTENTS\n${table}\n\n${content.isFullDraft ? 'GENERATED BODY DRAFT' : 'CHAPTER AND DIVISION ARCHITECTURE'}\n\n${content.units.map(unitText).join('\n\n')}\n\nAPPENDICES AND BACK MATTER\n${appendices}\n\nPRODUCTION NOTES\n${content.productionNotes.targetLength}\n${content.productionNotes.expansionOrder}\n${content.productionNotes.sourceProfile}`;
  }

  function book(book) {
    return `${book.code} — ${book.title}\n${book.format.label}; ${book.pages} pages; ${book.format.physicalClass}\n\nSUMMARY\n${book.summary}\n\nPHYSICAL DESCRIPTION\n${book.description}\n\nAUTHOR\n${book.author.name}\nOrigin: ${book.author.origin}\nSpecialty: ${book.author.specialty}\nReputation: ${book.author.reputation}\n\nPUBLICATION AND ORIGIN\nEdition: ${book.edition}\nPublisher: ${book.publisher}\nSeries: ${book.series}\nProduction: ${book.origin.production}\nInstitutional origin: ${book.origin.institutionalOrigin}\nAge: ${book.origin.age}\n${book.origin.provenance ? `Provenance: ${book.origin.provenance}\n` : ''}Condition: ${book.condition}\nRarity: ${book.rarity.label}\nPrice: ${book.price.display}\nAcquisition: ${book.price.acquisition}\nShelf: ${book.shelf.label}\nCirculation: ${book.circulation}\nCall number: ${book.callNumber}\n\nCOMPOSITION\n${composition(book)}\n\nSENSORY AND COPY-SPECIFIC FEATURES\nHandling: ${book.sensory.handling}\n${optional(book)}\n\nRATINGS\n${ratingLines(book.ratings)}\n\nACADEMIC CLASSIFICATION\nCourse association: ${book.courseAssociation}\nAudience: ${book.intendedAudience}\nPrimary subject: ${book.subject.topic}\nRequired exercise: ${book.subject.exercise}\nKnown complication: ${book.subject.hazard}\n\n${generatedContent(book)}`;
  }

  function catalog(catalog) {
    return `${catalog.libraryName}\n${catalog.notice}\nDisciplines: ${catalog.totals.disciplines}\nPublications and content packages: ${catalog.totals.books}\nPublications per discipline: ${catalog.controls.titlesPerDiscipline}\nComplete body-draft formats: ${catalog.contentGeneration?.completeDraftFormats.join(', ') || 'none'}\nStructured-draft formats: ${catalog.contentGeneration?.structuredDraftFormats.join(', ') || 'none'}\nArchitecture formats: ${catalog.contentGeneration?.architectureFormats.join(', ') || 'none'}\n\n${catalog.disciplines.map(discipline => `${discipline.label.toUpperCase()} SYLLABUS SHELF\nSource: ${discipline.sourceLabel}\nAssociated courses: ${discipline.courseSeeds.length ? discipline.courseSeeds.join('; ') : 'Departmental and elective syllabus materials'}\n\n${discipline.books.map(book).join('\n\n')}`).join('\n\n============================================================\n\n')}`;
  }

  window.HBMagicalLibraryText = { catalog };
})();
