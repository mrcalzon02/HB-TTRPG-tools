(() => {
  function book(book) {
    return `${book.code} — ${book.title}\n${book.format.label}; ${book.pages} pages; ${book.format.binding}\nBy ${book.author}\n${book.edition}\nPublisher: ${book.publisher}\nSeries: ${book.series}\nShelf: ${book.shelf.label}\nCirculation: ${book.circulation}\nCourse association: ${book.courseAssociation}\nAudience: ${book.intendedAudience}\nCall number: ${book.callNumber}\n${book.contents}\nPrimary subject: ${book.subject.topic}\nRequired exercise: ${book.subject.exercise}\nKnown complication: ${book.subject.hazard}`;
  }

  function catalog(catalog) {
    return `${catalog.libraryName}\n${catalog.notice}\nDisciplines: ${catalog.totals.disciplines}\nTitles: ${catalog.totals.books}\nTitles per discipline: ${catalog.controls.titlesPerDiscipline}\n\n${catalog.disciplines.map(discipline => `${discipline.label.toUpperCase()} SYLLABUS SHELF\nSource: ${discipline.sourceLabel}\nAssociated courses: ${discipline.courseSeeds.length ? discipline.courseSeeds.join('; ') : 'Departmental and elective syllabus materials'}\n\n${discipline.books.map(book).join('\n\n')}`).join('\n\n============================================================\n\n')}`;
  }

  window.HBMagicalLibraryText = { catalog };
})();
