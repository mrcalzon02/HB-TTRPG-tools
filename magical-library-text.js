(() => {
  const ratingLines = ratings => Object.entries(ratings).map(([name,rating]) => `- ${name.replace(/([A-Z])/g,' $1')}: ${rating.score}/100 (${rating.label})`).join('\n');

  function composition(book) {
    const lines = [
      `Substrate: ${book.composition.substrate}`,
      `Ink: ${book.composition.ink}`,
      `Cover or wrapper: ${book.composition.cover}`,
      `Leaf arrangement: ${book.composition.leafArrangement}`,
      `Dimensions: ${book.composition.dimensions}`,
      `Illustrations: ${book.composition.illustrations}`,
      `Weight: approximately ${book.composition.weightKg} kg`
    ];
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

  function book(book) {
    return `${book.code} — ${book.title}\n${book.format.label}; ${book.pages} pages; ${book.format.physicalClass}\n\nSUMMARY\n${book.summary}\n\nPHYSICAL DESCRIPTION\n${book.description}\n\nAUTHOR\n${book.author.name}\nOrigin: ${book.author.origin}\nSpecialty: ${book.author.specialty}\nReputation: ${book.author.reputation}\n\nPUBLICATION AND ORIGIN\nEdition: ${book.edition}\nPublisher: ${book.publisher}\nSeries: ${book.series}\nProduction: ${book.origin.production}\nInstitutional origin: ${book.origin.institutionalOrigin}\nAge: ${book.origin.age}\n${book.origin.provenance ? `Provenance: ${book.origin.provenance}\n` : ''}Condition: ${book.condition}\nRarity: ${book.rarity.label}\nPrice: ${book.price.display}\nAcquisition: ${book.price.acquisition}\nShelf: ${book.shelf.label}\nCirculation: ${book.circulation}\nCall number: ${book.callNumber}\n\nCOMPOSITION\n${composition(book)}\n\nSENSORY AND COPY-SPECIFIC FEATURES\nHandling: ${book.sensory.handling}\n${optional(book)}\n\nRATINGS\n${ratingLines(book.ratings)}\n\nACADEMIC CLASSIFICATION\nCourse association: ${book.courseAssociation}\nAudience: ${book.intendedAudience}\nPrimary subject: ${book.subject.topic}\nRequired exercise: ${book.subject.exercise}\nKnown complication: ${book.subject.hazard}`;
  }

  function catalog(catalog) {
    return `${catalog.libraryName}\n${catalog.notice}\nDisciplines: ${catalog.totals.disciplines}\nPublication profiles: ${catalog.totals.books}\nPublications per discipline: ${catalog.controls.titlesPerDiscipline}\n\n${catalog.disciplines.map(discipline => `${discipline.label.toUpperCase()} SYLLABUS SHELF\nSource: ${discipline.sourceLabel}\nAssociated courses: ${discipline.courseSeeds.length ? discipline.courseSeeds.join('; ') : 'Departmental and elective syllabus materials'}\n\n${discipline.books.map(book).join('\n\n')}`).join('\n\n============================================================\n\n')}`;
  }

  window.HBMagicalLibraryText = { catalog };
})();
