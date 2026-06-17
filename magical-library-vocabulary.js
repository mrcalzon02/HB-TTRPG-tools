(() => {
  const FORMATS = {
    pamphlet:{label:'Liturgical Pamphlet',minPages:8,maxPages:28,binding:'stapled vellum pamphlet',scale:'brief'},
    lectureNotes:{label:'Annotated Lecture Notes',minPages:42,maxPages:96,binding:'string-bound lecture folio',scale:'brief'},
    fieldGuide:{label:'Practical Field Guide',minPages:88,maxPages:176,binding:'oilcloth field binding',scale:'course'},
    handbook:{label:'Departmental Handbook',minPages:160,maxPages:280,binding:'reinforced buckram handbook',scale:'course'},
    textbook:{label:'Collegiate Textbook',minPages:280,maxPages:480,binding:'library-board textbook',scale:'course'},
    monograph:{label:'Scholarly Monograph',minPages:190,maxPages:360,binding:'clothbound monograph with unnecessary ribbon',scale:'course'},
    atlas:{label:'Illustrated Arcane Atlas',minPages:320,maxPages:520,binding:'oversized plate binding',scale:'substantial'},
    ritualManual:{label:'Ritual and Laboratory Manual',minPages:240,maxPages:440,binding:'lay-flat chain-stitched manual',scale:'substantial'},
    devotionalTome:{label:'Hefty Devotional Tome',minPages:600,maxPages:720,binding:'iron-cornered devotional tome',scale:'monumental'},
    concordance:{label:'Exhaustive Scholastic Concordance',minPages:720,maxPages:960,binding:'two-clasp reference brick',scale:'monumental'}
  };

  const PUBLISHERS = {
    luminous:[
      'Magical Library Press','The Responsible Thaumaturgy Imprint','Silver Lantern Academic Books','The Collegium Public Instruction Office','Saint Oria’s Practical Mysteries','The Kindly Ward Society','The Open Grimoire Cooperative'
    ],
    neutral:[
      'Interplanar Scholastics Program','The Wandering Index','Planar Reference Bureau','Cairn & Quill Academic','The Ninefold Footnote','University Catalogue Consortium','The Department of Comparative Margins'
    ],
    dubious:[
      'The Unsupervised Graduate Imprint','Questionable Applications Quarterly','The Department of Apologies','Late-Night Faculty Editions','The Society for Preventable Incidents','Borrowed Robe Publishing','The Provisional Tenure Press'
    ],
    malefic:[
      'Undead Publishing Cooperative','Blackglass University Press','The Candleless Cellar Imprint','Monolith Editions','The Ninth Ash Seminary Press','The Crooked Thesis Office','The Foul Spirit Academic Trust'
    ]
  };

  const SERIES = [
    'The Magical Library Syllabus Series','Interplanar Scholastics Required Readings','The Undead Publishing Graduate Shelf','The Responsible Catastrophe Collection','Studies in Needlessly Specific Thaumaturgy','The Collegiate Grimoire Companion Library','The Departmental Books Nobody Admits Assigning','The Ninefold Footnote Reference Programme','The Practical Mysteries Student Editions','The Blackglass Restricted Curriculum'
  ];

  const AUTHORS = [
    'Professor Emerita Liora Quill','Doctor Belden Twice-Corrected','Magister Orin Fold','Sister Calamity Wren','Adjunct Lecturer Pell Varnish','Dean Maribel Soot','Archivist Tallow-of-the-Stacks','Professor Nemea Ash','Heresiarch D. Preamble','Chairwizard Ossian Minor','Doctor Ilyra Footnote','The Late Professor Morrow, revised by committee','Canon Veyra Blackglass','Visiting Scholar Xaviel-of-the-Abyss','Associate Professor Fenwick Perhaps','Rector Selene Noct','Professor Caldus Ruin','The Anonymous Faculty Working Group on Regrettable Outcomes'
  ];

  const EDITIONS = [
    'First Student Edition','Second Corrected Edition','Third Edition, Now with Fewer Doors','Fourth Edition with Revised Apologies','Fifth Edition, Faculty Disputed','Sixth Printing from the Surviving Plates','Seventh Edition, Chronologically Earlier','Abridged Classroom Edition','Unabridged and Unnecessarily Defensive Edition','Posthumous Edition with Aggressive Marginalia','Restricted Stacks Edition','Popular Edition for Readers with Adequate Insurance'
  ];

  const TITLE_OPENERS = [
    'A Concise Guide to','A Brief Liturgy Concerning','The Student’s Companion to','An Excessively Complete Introduction to','Notes Toward a Responsible Theory of','Proceedings on the Unexpected Persistence of','A Pocket Catechism for','The Junior Scholar’s Illustrated Guide to','A Devotional Examination of','The Collegiate Handbook of','A Corrective Treatise on','The Officially Unofficial Manual of','A Comparative Index of','The Sevenfold Commentary upon','A Faculty Disputation Regarding','The Practical Anatomy of','An Introductory Atlas of','The Complete and Defensively Footnoted History of','A Modest Proposal Concerning','Selected Complaints About'
  ];

  const TITLE_CONNECTORS = [
    'with Particular Attention to','Including a Necessary Appendix on','Followed by Seventeen Clarifications Regarding','As Observed During','With Marginal Notes Concerning','Together with a Foldout Diagram of','And the Administrative Consequences of','For Students Who Have Already Misplaced','With a Strongly Worded Warning About','Being an Account of','As Distinguished from','Without Once Explaining','In Which the Author Reluctantly Admits','With Special Reference to','And Other Problems Incorrectly Blamed on'
  ];

  const HUMOR_CLAUSES = [
    'the intern who was specifically told not to touch it','the door that opens into yesterday’s pantry','the gargoyle that has begun requesting office hours','the ritual circle drawn around the wrong chair','the footnote that achieved independent tenure','the familiar who has unionized the laboratory mice','the prophecy that keeps citing unpublished sources','the demon who insists it is only auditing the course','the wand that refuses to work weekends','the monolith that will answer questions only in committee minutes','the potion that has become emotionally invested in the experiment','the skeleton serving as temporary department chair','the cursed sword currently appealing its classification','the chronomancer who submitted the assignment before enrollment','the cairn that remembers a completely different funeral','the ward that protects everything except the object inside it','the summoned spirit that demands a better bibliography','the spellbook that has begun correcting the lecturer','the apprentice who enchanted the emergency instructions','the departmental cat who is now technically an oracle'
  ];

  const CONTENT_FEATURES = [
    'eleven diagrams that contradict the cover illustration','a foldout decision tree for determining whether the problem is sentient','forty-seven case studies, six of which are still under appeal','a glossary whose definitions become increasingly personal','three sample examinations and one formal accusation','an appendix explaining why the previous appendix was sealed','comparative tables printed on heat-resistant paper','a detachable apology form for laboratory use','marginal warnings contributed by former students','a colour plate showing the incident from several incompatible timelines','an index of entities that deny appearing in the book','a faculty-approved checklist for leaving before the chanting starts','a chapter devoted entirely to the correct labeling of suspicious jars','a concordance of phrases never to say near an open threshold','a troubleshooting section written by the thing being troubleshot','a bibliography arranged by degree of authorial regret','a devotional calendar with thirteen academically disputed weekdays','a map of the library stacks before they began migrating','a chapter-by-chapter estimate of likely property damage','an errata sheet longer than the original first edition'
  ];

  const AUDIENCES = [
    'first-year apprentices','licensed heretics','overconfident graduate students','faculty members denied laboratory access','battlefield thaumaturges','responsible summoners','irresponsible summoners seeking tenure','interplanar librarians','junior cult administrators','alchemical bursars','ward engineers','students repeating the course for chronological reasons','monastic crypt scholars','court enchanters','adjunct necromancers','researchers whose ethics review is still pending'
  ];

  const SHELVES = {
    luminous:{label:'Luminous and Responsible',description:'protective, ethical, civic, restorative, and cautiously practical scholarship'},
    neutral:{label:'Neutral Scholastic',description:'comparative, taxonomic, theoretical, bureaucratic, and interplanar scholarship'},
    dubious:{label:'Dubious Academic',description:'ill-advised, overconfident, underfunded, and administratively deniable scholarship'},
    malefic:{label:'Malefic and Forbidden',description:'infernal, corruptive, heretical, sepulchral, and cognitively hazardous scholarship'}
  };

  const LIBRARIES = [
    'The Grand Magical Syllabus Library','The Interplanar Scholastics Lending Programme','The Undead Publishing Depository','The Ninefold Collegiate Stacks','The Wandering Curriculum Archive','The Joint Light-and-Dark Academic Repository','The Library of Extremely Specific Magical Problems','The Public Grimoire and Restricted Pamphlet Exchange'
  ];

  window.HBMagicalLibraryVocabulary = { FORMATS, PUBLISHERS, SERIES, AUTHORS, EDITIONS, TITLE_OPENERS, TITLE_CONNECTORS, HUMOR_CLAUSES, CONTENT_FEATURES, AUDIENCES, SHELVES, LIBRARIES };
})();
