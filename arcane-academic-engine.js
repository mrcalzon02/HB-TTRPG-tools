(() => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const sample = (list,count) => [...list].sort(()=>Math.random()-.5).slice(0,count);
  const keys = object => Object.keys(object);
  const choose = (object,id) => id === 'random' ? pick(keys(object)) : id;
  const titleCase = value => value.replace(/\b\w/g,letter=>letter.toUpperCase());

  function academicTitle(D,V,domainId,secondaryId,orientationId,levelId,index){
    const domain=D.DOMAINS[domainId],secondary=D.DOMAINS[secondaryId],orientation=V.ORIENTATIONS[orientationId],level=V.LEVELS[levelId];
    if(index===0 && Math.random()<.35) return pick(D.CURATED_TITLES);
    const forms=[
      ()=>`${pick(orientation.adjectives)} ${pick(domain.nouns)}`,
      ()=>`${level.label} ${pick(domain.nouns)}`,
      ()=>`${pick(orientation.adjectives)} ${secondary.label.replace(' Studies','')} ${pick(domain.nouns)}`,
      ()=>`${level.label} ${pick(orientation.adjectives)} ${pick(domain.nouns)}`,
      ()=>`${pick(['Essential','Popular','Ancient','Relativistic','Future','Comparative','Practical'])} ${pick(domain.nouns)}`
    ];
    return titleCase(pick(forms)().replace(/\s+/g,' '));
  }

  function courseCode(domainId,levelRank,index){
    const prefix=domainId.replace(/[^a-z]/gi,'').slice(0,3).toUpperCase();
    return `${prefix}-${(levelRank+1)*100+index+1}`;
  }

  function unitSequence(domain,secondary,orientation,level,count=6){
    const topics=[...domain.topics,...secondary.topics];
    return Array.from({length:count},(_,i)=>({
      unit:i+1,
      title:titleCase(pick(topics)),
      method:pick(orientation.formats),
      studyMethod:pick(window.HBArcaneAcademicVocabulary.STUDY_METHODS),
      focus:`Students ${pick(level.verbs)} ${pick(topics)} through ${pick(orientation.formats)} work and documented comparison.`
    }));
  }

  function makeCourse(D,V,settings,index,previous){
    const primary=D.DOMAINS[settings.domainId];
    const secondary=D.DOMAINS[settings.secondaryId];
    const levelKeys=keys(V.LEVELS);
    const levelIndex=Math.min(levelKeys.length-1,Math.max(0,V.LEVELS[settings.levelId].rank+Math.floor(index/2)));
    const levelId=levelKeys[levelIndex],level=V.LEVELS[levelId],orientation=V.ORIENTATIONS[settings.orientationId];
    const title=academicTitle(D,V,settings.domainId,settings.secondaryId,settings.orientationId,levelId,index);
    const practical=pick([...primary.labs,...secondary.labs]);
    const hazard=pick([...primary.hazards,...secondary.hazards]);
    const units=unitSequence(primary,secondary,orientation,level,index<2?5:6);
    return {
      code:courseCode(settings.domainId,level.rank,index),title,level:{id:levelId,label:level.label},credits:index%3===0?4:3,
      format:pick(orientation.formats),instructor:pick(V.FACULTY),facility:pick(V.FACILITIES),
      prerequisite:previous?`${previous.code} — ${previous.title}`:'Admission to the program or faculty permission',
      catalogDescription:`A ${level.depth} course examining ${pick(primary.topics)}, ${pick(secondary.topics)}, and their use in ${pick(orientation.formats)} environments. Students are expected to connect theory, documented practice, and failure analysis.`,
      learningOutcomes:sample([
        `${pick(level.verbs)} ${pick(primary.topics)} using accepted academic notation`,
        `${pick(level.verbs)} the relationship between ${pick(primary.topics)} and ${pick(secondary.topics)}`,
        `${pick(level.verbs)} a controlled procedure without violating departmental safety rules`,
        `${pick(level.verbs)} historical and contemporary methods in written and oral form`,
        `${pick(level.verbs)} failures involving ${hazard}`
      ],4),
      units,
      laboratory:`Students complete ${practical} in ${pick(V.FACILITIES)}. The exercise is repeated after introducing one controlled failure condition.`,
      coursework:[pick(V.ASSIGNMENTS),pick(V.ASSIGNMENTS)],
      midterm:pick(V.ASSESSMENTS),finalExam:pick(V.ASSESSMENTS),
      requiredMaterials:sample(V.MATERIALS,4),
      principalHazard:hazard,
      passStandard:`Pass the final examination, complete all practical work, and demonstrate safe recognition of ${hazard}.`
    };
  }

  function buildProgram(D,V,controls){
    const toneId=choose(V.INSTITUTION_TONES,controls.toneId),typeId=choose(V.PROGRAM_TYPES,controls.typeId),domainId=choose(D.DOMAINS,controls.domainId);
    let secondaryId=choose(D.DOMAINS,controls.secondaryId);
    if(secondaryId===domainId) secondaryId=pick(keys(D.DOMAINS).filter(id=>id!==domainId));
    const orientationId=choose(V.ORIENTATIONS,controls.orientationId),levelId=choose(V.LEVELS,controls.levelId),policyId=choose(V.POLICIES,controls.policyId);
    const tone=V.INSTITUTION_TONES[toneId],programType=V.PROGRAM_TYPES[typeId],primary=D.DOMAINS[domainId],secondary=D.DOMAINS[secondaryId];
    const settings={toneId,typeId,domainId,secondaryId,orientationId,levelId,policyId};
    const courseCount=controls.courseCount||programType.courseCount;
    const courses=[];
    for(let i=0;i<courseCount;i++) courses.push(makeCourse(D,V,settings,i,courses[i-1]));
    const terms=[];
    const perTerm=typeId==='doctoral'?3:typeId==='masters'?3:2;
    for(let i=0;i<courses.length;i+=perTerm) terms.push({term:terms.length+1,courses:courses.slice(i,i+perTerm).map(course=>course.code)});
    const institution=pick(tone.names);
    const programTitle=`${programType.credential} in ${pick(V.ORIENTATIONS[orientationId].adjectives)} ${pick(primary.nouns)}`;
    return {
      id:`arcane-program-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      institution,tone:{id:toneId,label:tone.label,style:tone.style},
      programType:{id:typeId,label:programType.label,credential:programType.credential},
      title:programTitle,department:`Department of ${primary.label} and ${secondary.label}`,
      primaryDiscipline:{id:domainId,label:primary.label},secondaryDiscipline:{id:secondaryId,label:secondary.label},
      orientation:{id:orientationId,label:V.ORIENTATIONS[orientationId].label},entryLevel:{id:levelId,label:V.LEVELS[levelId].label},
      safetyPolicy:{id:policyId,label:V.POLICIES[policyId].label,note:V.POLICIES[policyId].note},
      overview:`${institution} offers this ${programType.label.toLowerCase()} as a ${tone.style} course of study. The curriculum combines ${primary.label.toLowerCase()} with ${secondary.label.toLowerCase()}, emphasizing ${V.ORIENTATIONS[orientationId].label.toLowerCase()} instruction, documented experimentation, and defensible academic conclusions.`,
      admissionRequirements:[
        `${V.LEVELS[levelId].label} proficiency in general spell notation`,
        `A faculty recommendation or successful entrance demonstration`,
        `Signed acknowledgement of the ${V.POLICIES[policyId].label} policy`,
        `Ability to identify at least three forms of ${pick(primary.hazards)}`
      ],
      programOutcomes:[
        `Complete a coherent sequence of ${courses.length} courses`,
        `Maintain reproducible academic records across theoretical and practical work`,
        `Defend conclusions concerning ${pick(primary.topics)} and ${pick(secondary.topics)}`,
        `Recognize, contain, and report ${pick([...primary.hazards,...secondary.hazards])}`
      ],
      terms,courses,
      comprehensiveExamination:`A ${pick(V.ASSESSMENTS)} covering the entire curriculum, followed by an oral defense before ${pick(V.FACULTY)} and two external examiners.`,
      capstone:`Candidates must ${pick(V.CAPSTONES)} combining ${primary.label.toLowerCase()} and ${secondary.label.toLowerCase()}.`,
      coreLibrary:sample(V.MATERIALS,6),
      facultyNote:`The faculty considers this program academically respectable, although graduates are advised not to demonstrate it at weddings, treaty negotiations, or near unsecured clocks.`
    };
  }

  window.HBArcaneAcademicEngine={buildProgram};
})();
