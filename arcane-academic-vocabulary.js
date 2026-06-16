(() => {
  const LEVELS = {
    remedial:{label:'Remedial',rank:0,verbs:['identify','repeat','stabilize','recognize'],depth:'foundational correction'},
    foundational:{label:'Foundational',rank:1,verbs:['describe','construct','compare','demonstrate'],depth:'introductory mastery'},
    intermediate:{label:'Intermediate',rank:2,verbs:['analyze','adapt','diagnose','combine'],depth:'working professional competence'},
    advanced:{label:'Advanced',rank:3,verbs:['design','evaluate','reconstruct','defend'],depth:'independent advanced practice'},
    graduate:{label:'Graduate',rank:4,verbs:['theorize','publish','synthesize','challenge'],depth:'original supervised research'},
    postdoctoral:{label:'Postdoctoral',rank:5,verbs:['redefine','direct','formalize','dispute'],depth:'field-changing specialist work'}
  };

  const INSTITUTION_TONES = {
    prestigious:{label:'Prestigious Collegium',names:['The Argent Collegium','Royal Academy of Applied Thaumaturgy','The Nine-Towered University','Imperial Lyceum of High Magic'],style:'formal, heavily credentialed, and obsessed with publication priority'},
    practical:{label:'Practical Academy',names:['Guildhall Institute of Useful Magic','Civic College of Applied Spellwork','The Working Thaumaturges’ Academy','Metropolitan School of Arcane Trades'],style:'employment-focused, laboratory-heavy, and openly suspicious of elegant theories that cannot survive field conditions'},
    hazardous:{label:'Hazardous Institute',names:['Blackglass Experimental College','The Red Door Academy','Volatile Arts Polytechnic','Saint Ordelia’s Institute for Contained Catastrophe'],style:'notorious for dangerous laboratories, excellent alumni, and waivers written in six languages'},
    eccentric:{label:'Eccentric University',names:['The University of Improbable Disciplines','Marmalade Hall of Sorcerous Inquiry','The Collegium of Unnecessarily Specific Magic','Professor Pell’s Peripatetic Academy'],style:'academically serious despite baffling traditions, contradictory timetables, and aggressively peculiar faculty'},
    military:{label:'Military Academy',names:['Crown War-Casters’ College','The Seventh Strategic Thaumaturgy Academy','Fort Aegis School of Battle Magic','Royal Corps Arcane Staff College'],style:'disciplined, rank-conscious, and designed around deployment, logistics, and survival under hostile magical conditions'},
    forbidden:{label:'Restricted Seminary',names:['The Sealed Faculty','Academy Beneath the Black Archive','The Proscribed Chair of Unlicensed Studies','The Ninth Basement Seminary'],style:'secretive, ethically disputed, and protected by legal language nobody admits to understanding'}
  };

  const PROGRAM_TYPES = {
    survey:{label:'Survey Course',courseCount:1,credential:'Single-course academic credit'},
    certificate:{label:'Certificate Program',courseCount:4,credential:'Certificate of Arcane Proficiency'},
    minor:{label:'Minor Field',courseCount:6,credential:'Minor concentration'},
    major:{label:'Major Course of Study',courseCount:8,credential:'Bachelor-equivalent arcane degree'},
    masters:{label:'Graduate Program',courseCount:10,credential:'Master of Thaumaturgic Studies'},
    doctoral:{label:'Doctoral Track',courseCount:12,credential:'Doctor of Arcane Philosophy'}
  };

  const ORIENTATIONS = {
    theoretical:{label:'Theoretical',adjectives:['Theoretical','Analytical','Formal','Relativistic','Abstract'],formats:['seminar','proof workshop','faculty colloquium','modeling studio']},
    practical:{label:'Practical',adjectives:['Practical','Applied','Operational','Field','Essential'],formats:['laboratory','practicum','supervised workshop','field exercise']},
    comparative:{label:'Comparative',adjectives:['Comparative','Cross-Traditional','Parallel','Historical-Comparative','Interdisciplinary'],formats:['comparative seminar','case-study laboratory','translation workshop','paired-method practicum']},
    experimental:{label:'Experimental',adjectives:['Experimental','Investigative','Prototype','Speculative','Future'],formats:['experimental laboratory','research studio','prototype clinic','controlled trial']},
    military:{label:'Military',adjectives:['Military','Strategic','Tactical','Campaign','Defensive'],formats:['staff exercise','battle laboratory','command seminar','field deployment']},
    inadvisable:{label:'Inadvisable',adjectives:['Inadvisable','Restricted','Ill-Advised','Proscribed','Controversial'],formats:['sealed seminar','containment laboratory','waiver-required practicum','restricted archive session']}
  };

  const ASSESSMENTS = [
    'closed-book sigil analysis','oral defense before three faculty examiners','supervised laboratory practical','timed ward-construction examination','comparative case-study paper','field demonstration under controlled interference','anonymous peer review of a failed spell model','sealed-room diagnostic examination','translation of a damaged ritual manuscript','live correction of a deliberately flawed working','cumulative written examination','capstone presentation to a hostile academic panel'
  ];

  const ASSIGNMENTS = [
    'maintain a laboratory journal with reproducible observations','submit a twelve-page comparative analysis','construct a safe demonstration model','annotate a disputed primary-source manuscript','interview a licensed practitioner and critique their method','perform a controlled replication of a historical experiment','prepare a hazard assessment before attempting the assigned working','produce a diagrammed failure analysis','design a teaching demonstration for first-year students','write a formal rebuttal to a canonical theory','complete a supervised field observation','assemble a reference catalogue of specimens, symbols, or effects'
  ];

  const MATERIALS = [
    'The Annotated Lesser Grimoire, student edition','A Practical Concordance of Arcane Failures','Comparative Tables of Magical Correspondence','Laboratory Notebook with anti-copying ward','Faculty-approved reagent and specimen kit','Standard brass dividers, chalk compass, and ward string','Protective gloves rated for hostile symbolism','Pocket field manual of emergency dismissals','A calibrated mana lens','Six blank vellum folios and archival ink','Departmental safety codex','Restricted readings packet issued against signature'
  ];

  const FACILITIES = [
    'the east containment laboratory','a shielded lecture theatre','the lower alchemical works','the rotating observatory','the faculty summoning court','the geomantic survey yard','the temporal calibration chamber','the restricted stacks','the battle-magic proving ground','the inter-planar specimen vault','the cabbalistic computation room','the public demonstration amphitheatre'
  ];

  const FACULTY = [
    'Professor Emerita Valis Quill','Doctor Orren Blackglass','Magister Pell of the Seventh Diagram','Colonel-Instructor Mara Venn','Dean Ilyra Sable','Adjunct Lecturer P. Thistlewick','Canon-Researcher Amiel Dross','Senior Demonstrator Hadrin Coil','Chairwoman Selene Voss','Visiting Scholar Xaviel-of-the-Threshold','Archivist Nemea Brass','Professor Caldus Rime'
  ];

  const POLICIES = {
    cautious:{label:'Conservative Safety',note:'All practical work requires faculty inspection, redundant wards, and a written abort procedure.'},
    supervised:{label:'Supervised Risk',note:'Students may perform hazardous work only in approved facilities with a qualified observer present.'},
    inadvisable:{label:'Inadvisable but Permitted',note:'The department acknowledges substantial risk and requires waivers, witness signatures, and post-experiment interviews.'},
    reckless:{label:'Institutionally Reckless',note:'Safety guidance exists, but ambitious students quickly learn which locks are decorative.'}
  };

  const CAPSTONES = [
    'design and defend an original magical procedure','replicate a disputed historical working under modern controls','produce a complete field manual for a dangerous discipline','construct a stable cross-disciplinary demonstration','diagnose and repair a faculty-designed magical catastrophe','publish a thesis challenging a standard taxonomic category','lead a supervised team through a complex practical exercise','curate an exhibition of functioning academic spellwork'
  ];

  const STUDY_METHODS = [
    'paired recitation and diagram drills','laboratory replication','faculty-led close reading','field observation','structured debate','supervised practical casting','case-study comparison','failure reconstruction','oral disputation','specimen classification','simulation and predictive modeling','peer critique workshops'
  ];

  window.HBArcaneAcademicVocabulary = { LEVELS, INSTITUTION_TONES, PROGRAM_TYPES, ORIENTATIONS, ASSESSMENTS, ASSIGNMENTS, MATERIALS, FACILITIES, FACULTY, POLICIES, CAPSTONES, STUDY_METHODS };
})();
