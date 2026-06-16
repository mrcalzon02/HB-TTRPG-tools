(() => {
  const LEVELS = {
    uninitiated:{label:'Uninitiated',rank:0,verbs:['recognize','repeat','identify','survive'],depth:'entry-level exposure for the dangerously curious'},
    acolyte:{label:'Acolyte',rank:1,verbs:['describe','prepare','compare','demonstrate'],depth:'foundational cult and occult competence'},
    heretic:{label:'Licensed Heretic',rank:2,verbs:['analyze','adapt','diagnose','conduct'],depth:'independent profane practice under limited supervision'},
    adept:{label:'Malefic Adept',rank:3,verbs:['design','evaluate','reconstruct','command'],depth:'advanced operational mastery'},
    maleficScholar:{label:'Malefic Scholar',rank:4,verbs:['theorize','publish','synthesize','corrupt'],depth:'original infernal research and doctrinal authorship'},
    archCorruptor:{label:'Arch-Corruptor',rank:5,verbs:['redefine','direct','formalize','damn'],depth:'field-defining work of catastrophic academic ambition'}
  };

  const INSTITUTION_TONES = {
    hiddenCult:{label:'Hidden Cult School',names:['The Seven-Day School of Convenient Heresy','The Candleless Cellar Institute','Saint Veyra’s Unauthorized Catechism Circle','The Quiet Door School of Profane Studies'],style:'small, secretive, aggressively informal, and usually located beneath a respectable business'},
    infernalSeminary:{label:'Infernal Seminary',names:['The Seminary of the Ninth Ash','Black Mitre College','The Infernal Synodical Academy','The Basilica School of Inverted Grace'],style:'hierarchical, doctrinally vicious, and obsessed with correct liturgy, titles, and ceremonial humiliation'},
    abyssalUniversity:{label:'Abyssal University',names:['Abyssal University of the Unclosed Gate','The Blackglass University Below','The University of Endless Descent','The Deep Faculty of Unspeakable Vorticies'],style:'large, ancient, administratively hostile, and built around dangerous cross-planar research'},
    astralUniversity:{label:'Advanced Astral University',names:['Advanced Astral Plane University','The Transplanar College of Malefic Projection','Astral Dominion University','The Outer Faculty of Demonic Transit'],style:'research-intensive, planar, elitist, and dismissive of students who remain entirely embodied'},
    royalOccult:{label:'Royal Occult College',names:['The Crown College of Black Incantation','Royal Academy of Profane Statecraft','The Obsidian Court University','The Princesses’ Collegium of Sovereign Blackness'],style:'aristocratic, political, well funded, and designed to turn curses into instruments of court administration'},
    insaneFaculty:{label:'Insane Faculty',names:['The Chagoth Memorial Faculty of Unsound Conclusions','University of the Crooked Thesis','The Laughing Archive Collegium','The Faculty of Contradictory Nightmares'],style:'academically productive, cognitively hazardous, and governed by faculty minutes that disagree with themselves'},
    warCult:{label:'Militant Heretical Academy',names:['The Sinful Sword War College','The Crimson Campaign Seminary','Fort Anathema School of Ritual Warfare','The Low Knife Strategic Institute'],style:'disciplined, expansionist, and centered on weapon rites, battlefield curses, and expendable cohorts'},
    tombMonastery:{label:'Tomb Monastery',names:['The Monastery of the Silent Tomb','Bloody Crypts Scholastic Order','The Cairn-Bound Abbey','The Monolith Cloister of Disruption'],style:'funereal, austere, monastic, and permanently cold regardless of season'}
  };

  const PROGRAM_TYPES = {
    sevenDay:{label:'Seven-Day Training Course',courseCount:1,duration:'Seven consecutive nights',credential:'Provisional Heretic’s Attendance Mark'},
    fortyNight:{label:'Forty-Night Certificate',courseCount:4,duration:'Forty nights and one mandatory eclipse',credential:'Certificate of Licensed Profanity'},
    cultDiploma:{label:'Cult Seminary Diploma',courseCount:6,duration:'One liturgical year',credential:'Diploma of Infernal Ministry'},
    blackDegree:{label:'Black Collegiate Degree',courseCount:8,duration:'Three academic years or two successful resurrections',credential:'Bachelor of Malefic Arts'},
    masters:{label:'Advanced Malefic Graduate Program',courseCount:10,duration:'Two years plus an unsupervised astral term',credential:'Master of Demonic and Occult Studies'},
    blackDoctorate:{label:'Black Doctoral Track',courseCount:12,duration:'Until the thesis accepts the candidate',credential:'Doctor of Profane Philosophy'}
  };

  const ORIENTATIONS = {
    ritual:{label:'Ritual',adjectives:['Ritual','Liturgical','Ceremonial','Sacramental','Initiatory'],formats:['sealed ritual workshop','night liturgy','masked practicum','circle rehearsal']},
    theological:{label:'Profane Theological',adjectives:['Profane','Messianic','Heretical','Doctrinal','Apocalyptic'],formats:['blasphemous seminar','doctrinal disputation','heresy colloquium','false-revelation workshop']},
    applied:{label:'Applied Malefic',adjectives:['Applied','Operational','Practical','Field','Essential'],formats:['containment laboratory','supervised malefic practicum','field exercise','curse clinic']},
    comparative:{label:'Comparative Infernal',adjectives:['Comparative','Cross-Cult','Parallel','Historical-Infernal','Syncretic'],formats:['comparative demonology seminar','case-study crypt laboratory','translation workshop','paired-cult practicum']},
    sacrificial:{label:'Sacrificial',adjectives:['Sacrificial','Crimson','Low-Knife','Offering-Bound','Vital'],formats:['symbolic offering laboratory','sacrament clinic','omen workshop','knife-law seminar']},
    astral:{label:'Advanced Astral',adjectives:['Astral','Transplanar','Abyssal','Outer-Plane','Relativistic Malefic'],formats:['astral simulation chamber','projection laboratory','transplanar seminar','return-anchor practicum']},
    forbiddenResearch:{label:'Forbidden Research',adjectives:['Unknowable','Insane','Proscribed','Unspeakable','Reality-Offending'],formats:['redacted archive session','cognitive quarantine seminar','impossible-logic laboratory','faculty-supervised nightmare']}
  };

  const POLICIES = {
    warded:{label:'Warded Malice',note:'All rituals use inert substitutions, redundant dismissals, and three independent containment seals.'},
    supervised:{label:'Faculty-Supervised Corruption',note:'Hazardous work requires a licensed malefic scholar, a witness, and an available exorcist who dislikes the institution.'},
    careless:{label:'Carelessly Permitted',note:'Students sign a short waiver confirming that screaming does not automatically end the lesson.'},
    expendable:{label:'Expendable Cohort Policy',note:'The institution treats casualties, possessions, and permanent alignment drift as academically meaningful attrition.'},
    none:{label:'No Recognizable Safety Policy',note:'The faculty regards safety as a rival school of magic and has denied it accreditation.'}
  };

  const ASSESSMENTS = [
    'sealed oral confession before a masked faculty tribunal','supervised summoning-and-dismissal practical','closed-book infernal taxonomy examination','timed reconstruction of a damaged curse lattice','comparative heresy paper defended against hostile questioning','field demonstration inside a warded crypt','anonymous peer review of a failed damnation model','night-long diagnosis of a simulated possession','translation of a manuscript that changes when criticized','live correction of a deliberately treacherous ritual','cumulative written examination in red ink that is not supplied','capstone defense before a demonically biased academic panel'
  ];

  const ASSIGNMENTS = [
    'maintain a sealed grimoire journal with reproducible observations','submit a thirteen-page analysis of a failed cult schism','construct a harmless but convincing ritual demonstration','annotate a disputed heretical manuscript','interview a licensed exorcist and rebut their objections','replicate a historical curse using inert symbolic components','prepare a soul-hazard assessment before entering the laboratory','produce a diagrammed possession-failure analysis','design an introductory lesson for disposable acolytes','write a formal condemnation of a rival infernal theory','complete a supervised midnight crypt survey','assemble a catalogue of omens, false miracles, and contradictory prophecies'
  ];

  const MATERIALS = [
    "Chagoth's Manual of the Insane, student abridgement",'The Lesser Black Grimoire with removable pages','Comparative Tables of Infernal Correspondence','Sealed laboratory journal with confession lock','Faculty-approved inert sacrifice kit','Obsidian dividers, black chalk, and ward string','Protective gloves rated for hostile symbolism','Pocket manual of emergency dismissals and plausible denials','A smoked crystal soul-lens','Thirteen vellum folios and nonreflective ink','Departmental damnation and liability codex','Restricted readings packet issued against bloodless signature','Replica low knife with blunted ceremonial edge','Portable return-anchor for supervised astral work','Noise-canceling hood for monolith communion'
  ];

  const FACILITIES = [
    'the lower summoning court','a shielded blasphemy theatre','the crimson sacrament laboratory','the rotating astral oubliette','the faculty crypt','the monolith resonance yard','the soul-corruption clinic','the restricted stacks beneath the restricted stacks','the sinful sword proving ground','the cairn specimen vault','the impossible testimony chamber','the tomb-of-silence practicum hall','the false-messiah auditorium','the curse quarantine annex'
  ];

  const FACULTY = [
    'Professor Malovar Thrice-Damned','Doctor Veyra Blackglass','Heresiarch Pell of the Ninth Diagram','Canon-Corruptor Mara Venn','Dean Ilyra Graves','Adjunct Lecturer P. Wormwood','Arch-Theologian Amiel Dross','Senior Summoner Hadrin Coil','Chairwoman Selene Noct','Visiting Scholar Xaviel-of-the-Abyss','Archivist Nemea Ash','Professor Caldus Ruin','Sister Rector Vel Anathema','The Faculty Member Currently Called Chagoth'
  ];

  const DOCTRINES = [
    'All virtue is merely unexamined obedience.','Knowledge becomes sacred only after somebody forbids it.','A curse is a theorem with a victim.','The soul is both student and laboratory.','No gate is truly sealed; some are merely tenured.','The abyss does not answer questions—it grades them.','Every false messiah begins as an excellent lecturer.','Tradition is what remains after the witnesses disappear.'
  ];

  const PATRONS = [
    'an unnamed prince beneath the ninth gate','the Monolith of Disruption','a committee of mutually hostile fiends','the Crown Office of Profane Affairs','the Dying Divinity of the Crooked Labyrinth','the Silent Thing Below the Crypt','the Princesses of Sovereign Blackness','the Foul Spirit of Curses','no patron officially recognized by the bursar','Chagoth, subject to ongoing identity litigation'
  ];

  const TABOOS = [
    'speaking a true name before enrollment is finalized','bringing unwarded mirrors into a summoning examination','showing mercy during a doctrinal debate','correcting the dean’s pronunciation of Abyssimal','using white chalk without a theological exemption','asking why the library has a pulse','graduating without leaving at least one curse for future cohorts','entering the monolith yard while entirely sane','claiming a prophecy was merely a coincidence','returning a borrowed grimoire in better condition than received'
  ];

  const CAPSTONES = [
    'design and defend an original malefic ritual using only inert substitutions','replicate a disputed infernal working under modern containment','produce a complete field manual for surviving a hostile cult hierarchy','construct a stable cross-disciplinary curse demonstration','diagnose and reverse a faculty-designed spiritual catastrophe','publish a black thesis challenging a standard category of damnation','lead a supervised cohort through a complex crypt exercise','curate an exhibition of functioning but legally nonbinding profane spellwork','map and return from a simulated hostile astral route','translate a fragment of Chagoth without adopting its punctuation habits'
  ];

  const STUDY_METHODS = [
    'masked recitation and diagram drills','warded laboratory replication','faculty-led close reading of condemned texts','midnight field observation','structured blasphemous debate','supervised ritual performance','comparative cult case study','catastrophe reconstruction','oral heresy disputation','omen and relic classification','astral simulation and predictive modeling','peer condemnation workshop'
  ];

  const INITIATIONS = [
    'A candle is extinguished in the student’s name and must remain unlit until graduation.','The candidate recites a harmless false oath before three witnesses wearing borrowed masks.','The student crosses a chalk threshold while faculty argue over whether admission was wise.','A sealed envelope containing the candidate’s first assigned taboo is opened at midnight.','The candidate identifies the least trustworthy figure in a mural; every answer is accepted and recorded.','The student is issued a number, a title, and an ominous key that opens only the bursar’s office.'
  ];

  const DROPOUT_FATES = [
    'Transferred to a respectable institution under an assumed name.','Retained as a cautionary example in the introductory syllabus.','Employed by the university as an assistant containment technician.','Officially never enrolled, despite substantial tuition debt.','Allowed to leave after signing a nondisclosure agreement in an extinct language.','Reclassified as independent field research.'
  ];

  window.HBMaleficAcademicVocabulary = { LEVELS, INSTITUTION_TONES, PROGRAM_TYPES, ORIENTATIONS, POLICIES, ASSESSMENTS, ASSIGNMENTS, MATERIALS, FACILITIES, FACULTY, DOCTRINES, PATRONS, TABOOS, CAPSTONES, STUDY_METHODS, INITIATIONS, DROPOUT_FATES };
})();
