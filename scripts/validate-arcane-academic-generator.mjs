import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const context = { console, Date, Math };
context.window = context;
vm.createContext(context);

for (const file of ['arcane-academic-domains.js', 'arcane-academic-vocabulary.js', 'arcane-academic-engine.js']) {
  const source = await fs.readFile(path.join(root, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const Domains = context.HBArcaneAcademicDomains;
const Vocabulary = context.HBArcaneAcademicVocabulary;
const Engine = context.HBArcaneAcademicEngine;
if (!Domains || !Vocabulary || !Engine) throw new Error('Arcane academic modules failed to initialize.');

const requiredSeeds = [
  'Alchemical Experimentation','Analytical Temporal Engineering','Comparative Demonic Instruction','Comparative Pyrotechnic Geomancy','Divinatory Experimentation','Essential Enchantment','Essential Inter-Planar Taxonomy','Future Invocation','Future Sorcery','Inadvisable Ancient Geomancy','Inadvisable Applied Demonology','Magical Arts','Military Sorcery','Practical Cabbalism','Relativistic Alchemy','Remedial Pyrotechnic Alchemy','Sorcerous Arts','Temporal Taxonomy','Theoretical Popular Abjuration'
];
for (const title of requiredSeeds) {
  if (!Domains.CURATED_TITLES.includes(title)) throw new Error(`Missing supplied seed title: ${title}`);
}

let programsChecked = 0;
let coursesChecked = 0;
const domainIds = Object.keys(Domains.DOMAINS);
for (const domainId of domainIds) {
  for (const levelId of Object.keys(Vocabulary.LEVELS)) {
    for (const orientationId of Object.keys(Vocabulary.ORIENTATIONS)) {
      const secondaryId = domainIds[(domainIds.indexOf(domainId) + 1) % domainIds.length];
      const program = Engine.buildProgram(Domains, Vocabulary, {
        toneId: 'prestigious', typeId: 'certificate', domainId, secondaryId,
        orientationId, levelId, policyId: 'supervised', quantity: 1, courseCount: 4
      });
      programsChecked += 1;
      if (!program.title || !program.institution || !program.department) throw new Error('Program identity is incomplete.');
      if (program.courses.length !== 4) throw new Error(`Expected four courses, found ${program.courses.length}.`);
      if (!program.comprehensiveExamination || !program.capstone || program.coreLibrary.length < 4) throw new Error(`Program '${program.title}' lacks completion requirements.`);
      program.courses.forEach((course, index) => {
        coursesChecked += 1;
        const required = ['code','title','catalogDescription','laboratory','midterm','finalExam','principalHazard','passStandard'];
        for (const field of required) if (!course[field]) throw new Error(`Course '${course.code}' is missing ${field}.`);
        if (course.units.length < 5 || course.learningOutcomes.length < 3 || course.requiredMaterials.length < 3) throw new Error(`Course '${course.code}' has an incomplete syllabus.`);
        if (index > 0 && !course.prerequisite.includes(program.courses[index - 1].code)) throw new Error(`Course '${course.code}' has a broken prerequisite chain.`);
      });
    }
  }
}

console.log('Arcane Academic Studies Generator validation passed.');
console.log(`Programs checked: ${programsChecked}`);
console.log(`Courses checked: ${coursesChecked}`);
console.log(`Canonical supplied titles: ${requiredSeeds.length}`);
