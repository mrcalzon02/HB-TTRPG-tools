import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const context = { console, Date, Math };
context.window = context;
vm.createContext(context);

for (const file of ['malefic-academic-domains.js', 'malefic-academic-vocabulary.js', 'malefic-academic-engine.js']) {
  const source = await fs.readFile(path.join(root, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const Domains = context.HBMaleficAcademicDomains;
const Vocabulary = context.HBMaleficAcademicVocabulary;
const Engine = context.HBMaleficAcademicEngine;
if (!Domains || !Vocabulary || !Engine) throw new Error('Malefic academic modules failed to initialize.');

const requiredSeeds = [
  'Introduction to Heretics Cult Rituals 101','Advanced Demonic Soul Corruption',"Chagoth's Manual of the Insane: Communion of Curses",'Crystaline Enchantment of Cairns',"Dying Divnities' Sacrifice of the Labyrinths of Falsehood",'Enchantment of Doom',"Evil Messiah's Evocation of Dungeons",'Evocation of Abyssimal Edges',"Fiends' Sacrifice of Demonic Omens","Fiends' Transfiguration of Darkness",'High Communion of the Monolith of Horror','High Summoning of the Foul Spirit of Curses',"Messiahs' Abjuration of Supreme Cairns","Princesses' Incantation of Blackness",'Ritual of the Sinful Sword','Sacrament of the Monolith of Disruption','Sacrifice of the Low Knife',"Sinners' Sacrament of Blood",'Summoning of Bloody Crypts','Summoning of Unspeakable Vorticies','Twisted Summoning of the Tomb of Silence','Unknowable Evocation of the Spirits of Madness'
];
for (const title of requiredSeeds) {
  if (!Domains.CURATED_TITLES.includes(title)) throw new Error(`Missing canonical malefic title: ${title}`);
}

const mappedSeeds = new Set();
for (const [domainId, titles] of Object.entries(Domains.TITLE_SEEDS || {})) {
  if (!Domains.DOMAINS[domainId]) throw new Error(`Title seed map references unknown domain '${domainId}'.`);
  for (const title of titles) {
    if (!Domains.CURATED_TITLES.includes(title)) throw new Error(`Title seed map contains unknown title '${title}'.`);
    mappedSeeds.add(title);
  }
}
for (const title of requiredSeeds) {
  if (!mappedSeeds.has(title)) throw new Error(`Canonical malefic title '${title}' is not routed to a discipline.`);
}

function validateProgram(program, expectedCourseCount, allowedCurated) {
  if (!program.title || !program.institution || !program.department || program.alignment !== 'Deliberately Evil') throw new Error('Program identity or alignment is incomplete.');
  if (program.courses.length !== expectedCourseCount) throw new Error(`Expected ${expectedCourseCount} courses, found ${program.courses.length}.`);
  for (const field of ['doctrine','patron','initiation','centralTaboo','dropoutFate','comprehensiveExamination','capstone']) {
    if (!program[field]) throw new Error(`Program '${program.title}' is missing ${field}.`);
  }
  if (program.forbiddenLibrary.length < 5) throw new Error(`Program '${program.title}' has an incomplete forbidden library.`);
  program.courses.forEach((course, index) => {
    const required = ['code','title','catalogDescription','practicum','midterm','finalExam','principalHazard','prohibitedShortcut','passStandard'];
    for (const field of required) if (!course[field]) throw new Error(`Course '${course.code}' is missing ${field}.`);
    if (course.units.length < 5 || course.learningOutcomes.length < 3 || course.requiredMaterials.length < 3) throw new Error(`Course '${course.code}' has an incomplete syllabus.`);
    if (index > 0 && !course.prerequisite.includes(program.courses[index - 1].code)) throw new Error(`Course '${course.code}' has a broken prerequisite chain.`);
    if (Domains.CURATED_TITLES.includes(course.title) && allowedCurated && !allowedCurated.has(course.title)) throw new Error(`Curated title '${course.title}' appeared outside its relevant disciplines.`);
  });
}

let programsChecked = 0;
let coursesChecked = 0;
const domainIds = Object.keys(Domains.DOMAINS);
for (const domainId of domainIds) {
  for (const levelId of Object.keys(Vocabulary.LEVELS)) {
    for (const orientationId of Object.keys(Vocabulary.ORIENTATIONS)) {
      const secondaryId = domainIds[(domainIds.indexOf(domainId) + 1) % domainIds.length];
      const allowedCurated = new Set([...(Domains.TITLE_SEEDS[domainId] || []), ...(Domains.TITLE_SEEDS[secondaryId] || [])]);
      const program = Engine.buildProgram(Domains, Vocabulary, {
        toneId: 'infernalSeminary', typeId: 'fortyNight', domainId, secondaryId,
        orientationId, levelId, policyId: 'supervised', quantity: 1, courseCount: 4
      });
      validateProgram(program, 4, allowedCurated);
      programsChecked += 1;
      coursesChecked += program.courses.length;
    }
  }
}

const signatures = {
  heretics101: { institution:'The Seven-Day School of Convenient Heresy', title:'Seven-Day Training Course: Introduction to Heretics Cult Rituals 101', firstCourse:'Introduction to Heretics Cult Rituals 101', count:1 },
  astralCorruption: { institution:'Advanced Astral Plane University', title:'Demonology of the Advanced Astral Plane University: Advanced Demonic Soul Corruption', firstCourse:'Advanced Demonic Soul Corruption', count:10 },
  chagothManual: { institution:'The Chagoth Memorial Faculty of Unsound Conclusions', title:"Chagoth's Manual of the Insane: Communion of Curses", firstCourse:"Chagoth's Manual of the Insane: Communion of Curses", count:12 }
};
for (const [signatureId, expected] of Object.entries(signatures)) {
  const program = Engine.buildSignature(Domains, Vocabulary, signatureId);
  validateProgram(program, expected.count);
  if (program.institution !== expected.institution) throw new Error(`${signatureId} institution mismatch.`);
  if (program.title !== expected.title) throw new Error(`${signatureId} program title mismatch.`);
  if (program.courses[0].title !== expected.firstCourse) throw new Error(`${signatureId} first course mismatch.`);
  programsChecked += 1;
  coursesChecked += program.courses.length;
}

console.log('Malefic Academic Studies Generator validation passed.');
console.log(`Programs checked: ${programsChecked}`);
console.log(`Courses checked: ${coursesChecked}`);
console.log(`Canonical titles checked: ${requiredSeeds.length}`);
console.log(`Discipline-routed titles: ${mappedSeeds.size}`);
console.log('Signature curricula checked: 3');
