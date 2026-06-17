import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const context = { console, Date, Math };
context.window = context;
vm.createContext(context);

for (const file of ['arcane-academic-domains.js','malefic-academic-domains.js','magical-library-vocabulary.js','magical-library-engine.js']) {
  const source = await fs.readFile(path.join(root, file), 'utf8');
  vm.runInContext(source, context, { filename:file });
}

const Arcane = context.HBArcaneAcademicDomains;
const Malefic = context.HBMaleficAcademicDomains;
const Vocabulary = context.HBMagicalLibraryVocabulary;
const Engine = context.HBMagicalLibraryEngine;
if (!Arcane || !Malefic || !Vocabulary || !Engine) throw new Error('Magical library dependencies failed to initialize.');

for (const requiredPublisher of ['Magical Library Press','Undead Publishing Cooperative','Interplanar Scholastics Program']) {
  const exists = Object.values(Vocabulary.PUBLISHERS).some(list => list.includes(requiredPublisher));
  if (!exists) throw new Error(`Missing required publisher '${requiredPublisher}'.`);
}

const disciplines = Engine.collectDisciplines(Arcane, Malefic);
if (disciplines.length !== 32) throw new Error(`Expected 32 combined disciplines, found ${disciplines.length}.`);
if (disciplines.filter(item => item.source === 'arcane').length !== 14) throw new Error('Arcane discipline count is not 14.');
if (disciplines.filter(item => item.source === 'malefic').length !== 18) throw new Error('Malefic discipline count is not 18.');

function validateBook(book, formatId) {
  for (const field of ['code','title','courseAssociation','discipline','source','sourceLabel','pages','author','publisher','series','edition','intendedAudience','contents','callNumber','circulation']) {
    if (!book[field]) throw new Error(`Book '${book.code || 'unknown'}' is missing ${field}.`);
  }
  if (!book.subject?.topic || !book.subject?.exercise || !book.subject?.hazard) throw new Error(`Book '${book.code}' has incomplete subject metadata.`);
  if (!book.format?.id || !book.shelf?.id) throw new Error(`Book '${book.code}' has incomplete format or shelf metadata.`);
  const format = Vocabulary.FORMATS[formatId || book.format.id];
  if (!format) throw new Error(`Book '${book.code}' references unknown format '${book.format.id}'.`);
  if (book.pages < format.minPages || book.pages > format.maxPages) throw new Error(`Book '${book.code}' has ${book.pages} pages outside ${format.minPages}-${format.maxPages}.`);
  if (!Vocabulary.PUBLISHERS[book.shelf.id]?.includes(book.publisher)) throw new Error(`Book '${book.code}' publisher does not belong to shelf '${book.shelf.id}'.`);
}

const full = Engine.buildCatalog(Arcane, Malefic, Vocabulary, {
  sourceId:'all', disciplineId:'all', shelfId:'all', scale:'all', titlesPerDiscipline:10
});
if (full.totals.disciplines !== 32 || full.totals.books !== 320) throw new Error(`Full catalogue expected 32 disciplines and 320 books; found ${full.totals.disciplines} and ${full.totals.books}.`);
for (const discipline of full.disciplines) {
  if (discipline.books.length !== 10) throw new Error(`${discipline.label} does not contain ten titles.`);
  const titles = new Set(discipline.books.map(book => book.title));
  if (titles.size !== 10) throw new Error(`${discipline.label} contains duplicate titles.`);
  const expectedFormats = ['pamphlet','lectureNotes','fieldGuide','handbook','textbook','monograph','atlas','ritualManual','devotionalTome','concordance'];
  discipline.books.forEach((book, index) => validateBook(book, expectedFormats[index]));
  if (discipline.books[0].pages > 28) throw new Error(`${discipline.label} lacks a brief pamphlet.`);
  if (discipline.books[8].pages < 600 || discipline.books[9].pages < 720) throw new Error(`${discipline.label} lacks monumental six-hundred-page scholarship.`);
}

const arcaneOnly = Engine.buildCatalog(Arcane, Malefic, Vocabulary, { sourceId:'arcane', disciplineId:'all', shelfId:'luminous', scale:'brief', titlesPerDiscipline:10 });
if (arcaneOnly.totals.disciplines !== 14 || arcaneOnly.totals.books !== 140) throw new Error('Arcane-only catalogue totals are incorrect.');
for (const discipline of arcaneOnly.disciplines) for (const book of discipline.books) {
  if (book.source !== 'arcane' || book.shelf.id !== 'luminous' || book.format.scale !== 'brief') throw new Error('Arcane-only shelf filtering failed.');
  validateBook(book);
}

const maleficOnly = Engine.buildCatalog(Arcane, Malefic, Vocabulary, { sourceId:'malefic', disciplineId:'all', shelfId:'malefic', scale:'monumental', titlesPerDiscipline:10 });
if (maleficOnly.totals.disciplines !== 18 || maleficOnly.totals.books !== 180) throw new Error('Malefic-only catalogue totals are incorrect.');
for (const discipline of maleficOnly.disciplines) for (const book of discipline.books) {
  if (book.source !== 'malefic' || book.shelf.id !== 'malefic' || book.format.scale !== 'monumental' || book.pages < 600) throw new Error('Malefic monumental shelf filtering failed.');
  validateBook(book);
}

const singleId = disciplines[0].id;
const single = Engine.buildCatalog(Arcane, Malefic, Vocabulary, { sourceId:'all', disciplineId:singleId, shelfId:'neutral', scale:'course', titlesPerDiscipline:15 });
if (single.totals.disciplines !== 1 || single.totals.books !== 15) throw new Error('Single-discipline custom-count catalogue failed.');

console.log('Magical Syllabus Library Generator validation passed.');
console.log(`Disciplines checked: ${disciplines.length}`);
console.log(`Full catalogue titles checked: ${full.totals.books}`);
console.log(`Arcane filtered titles checked: ${arcaneOnly.totals.books}`);
console.log(`Malefic filtered titles checked: ${maleficOnly.totals.books}`);
console.log(`Single-discipline titles checked: ${single.totals.books}`);
