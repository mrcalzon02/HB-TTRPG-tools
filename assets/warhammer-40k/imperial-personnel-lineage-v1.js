(()=>{'use strict';

const VERSION='1.2.0';
const CSS='assets/warhammer-40k/imperial-personnel-lineage-v1.css?v=3';
const SOURCE=Object.freeze({
  status:'authorial',
  label:'Cafarron Corridor Imperial Personnel, Command, Career & Longevity Register'
});
const CACHE=new WeakMap();

const GN='Acastus|Adran|Aelia|Amael|Cassia|Cyran|Darius|Edras|Elara|Galen|Helena|Hester|Hiram|Ilyra|Jorun|Kael|Loric|Lucan|Lysa|Marek|Meridia|Mira|Nadia|Octavian|Rhett|Sabine|Serin|Severin|Talia|Tavian|Valeria|Varro|Veren|Voss|Alia|Avel|Mord'.split('|');
const SN='Acastor|Bale|Bellisar|Cassel|Draxil|Drost|Ferrum|Halcyon|Helican|Kord|Morcant|Ormond|Panthes|Pilcher|Severus|Solenne|Tanvar|Thesk|Vandrell|Varn|Vex|Veyr|Vorn|Brannis|Cyprian|Dravus|Ersak|Kertor|Merov|Mirrad|Sable|Valcyr|Rauk|Ophion|Kessel|Demeris|Holt'.split('|');
const CT=['Rear-Admiral','Commodore','Lord-Captain','Convoy Marshal','Fleet Prefect','Senior Captain'];
const MT=['Archmagos Navalis','Magos Reclamator','Magos Ordinator','Magos Dominus','Magos Logis','Magos Artifex'];

const RANK_VALUE=Object.freeze({
  'Conscript':0,
  'Trooper':0,
  'Sergeant':1,
  'Senior Sergeant':2,
  'Lieutenant':1,
  'Master':1,
  'Monitor-Captain':2,
  'Commander':2,
  'Senior Commander':3,
  'Captain':3,
  'Major':3,
  'Colonel':4,
  'Senior Captain':4,
  'Commodore':5,
  'Marshal':5,
  'Rear-Admiral':6,
  'Lord-Captain':5,
  'Lord Marshal':7,
  'Convoy Marshal':4,
  'Fleet Prefect':4,
  'Commandant Rear-Admiral':6,
  'Abbess-Commandant':4,
  'Depot-Master':3,
  'Prefect-Logister':3,
  'Navis-Magister':4,
  'Magos Navalis':5,
  'Magos Artifex':4,
  'Magos Logis':5,
  'Magos Ordinator':5,
  'Magos Reclamator':5,
  'Magos Dominus':6,
  'Archmagos Navalis':7
});

const LONGEVITY_STANDARDS=Object.freeze({
  baselineHuman:Object.freeze({
    lifeExpectancyYears:Object.freeze([50,70]),
    productiveMarginYears:0,
    serviceEntryAgeYears:Object.freeze([18,26]),
    note:'Unaugmented human life is short by Imperial standards. A normal human usually dies between roughly fifty and seventy years of age; the register uses that same range as the baseline productive-service envelope, while individual health may fail earlier.'
  }),
  prolong:Object.freeze({
    middling:Object.freeze({
      label:'Middling Prolong course',
      productiveYears:20,
      cost:'expensive retention-grade medicae allocation',
      composition:'rejuvenat compounds, endocrine and marrow therapies, organ maintenance, irradiative cellular treatment, and mixed human or sanctioned xenobiological derivatives',
      note:'Commonly granted in repeated smaller courses when a veteran remains useful but has not justified the very best treatment.'
    }),
    full:Object.freeze({
      label:'Full Prolong suite',
      productiveYears:50,
      cost:'extremely expensive senior-command allocation',
      composition:'gene-tailored rejuvenat, deep organ renewal or replacement, chemical and irradiative cellular therapy, and tightly controlled human or sanctioned xenos-derived medical sources',
      note:'The best routinely imaginable Prolong allocation. Timing matters; repeated high-grade courses can double or even triple productive human service, but senescence is never abolished.'
    })
  }),
  augmentation:Object.freeze({
    serviceable:Object.freeze({
      label:'Serviceable augmentation',
      productiveYears:10,
      ceilingMultiplier:1.45,
      cost:'comparatively cheap mass-serviceable augmentation',
      note:'Restores function cheaply but does not turn ordinary bionics into true immortality.'
    }),
    mediocre:Object.freeze({
      label:'Mediocre longevity augmentation',
      productiveYears:20,
      ceilingMultiplier:2,
      cost:'moderate augmetic and organ-bank allocation',
      note:'Can at best push a standard human toward roughly twice an unaugmented lifetime when repeatedly maintained.'
    }),
    good:Object.freeze({
      label:'Good longevity augmentation',
      productiveYears:35,
      ceilingMultiplier:2.5,
      cost:'expensive specialist augmentation',
      note:'High-quality organ, vascular, endocrine, neural and augmetic reconstruction reserved for personnel whose retention has institutional value.'
    }),
    excellent:Object.freeze({
      label:'Excellent longevity augmentation',
      productiveYears:50,
      ceilingMultiplier:3,
      cost:'extremely expensive artisan / Mechanicus reconstruction',
      note:'The best augmentation can rival full Prolong treatment, but the accumulating burden of age and replacement eventually wins.'
    })
  }),
  hardSenescenceMultiplier:3,
  note:'Prolong is a suite rather than one drug: chemical, surgical, organ-replacement, irradiative and engineered biological treatments may be combined. Imperial records care about the productive years purchased and who authorized them, not a single universal recipe.'
});

function h(v){
  let x=2166136261;
  for(const c of String(v||'')){
    x^=c.charCodeAt(0);
    x=Math.imul(x,16777619);
  }
  return x>>>0;
}
function slug(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'sealed'}
function u(a){return[...new Set((a||[]).filter(Boolean))]}
function naval(s){return/BFC-NAV|CFR-SDF|MEC-SDF/.test(s?.registry||'')||/Navy|Defence Monitor|Patrol Craft/.test((s?.className||'')+' '+(s?.role||''))}
function person(k){const x=h(k);return GN[x%GN.length]+' '+SN[(x>>>7)%SN.length]}
function magos(k){
  const x=h(k),a=['Rho','Theta','Sigma','Kappa','Lambda','Omicron','Ferrum','Cobalt','Vermilion','Axiom'],b=['Theta','Rho','Nine','Delta','Prime','Sigma','Tau','Lambda','Hex','Octa'];
  return`${a[x%10]}-${b[(x>>>6)%10]} ${11+(x>>>11)%88}`;
}
function rank(v){
  const m=/^(Monitor-Captain|Senior Commander|Commander|Captain|Lieutenant|Master)\s+(.+)$/i.exec(String(v||'').trim());
  return m?{rank:m[1].replace(/\b\w/g,c=>c.toUpperCase()),name:m[2]}:{rank:'Commanding Officer',name:String(v||'Sealed Officer')};
}
function rankValue(v){
  if(RANK_VALUE[v]!=null)return RANK_VALUE[v];
  const x=String(v||'');
  if(/Lord.*Marshal|Warmaster|Archmagos/i.test(x))return 7;
  if(/Admiral|Marshal|General|Dominus/i.test(x))return 6;
  if(/Commodore|Lord-Captain|Magos/i.test(x))return 5;
  if(/Colonel|Senior Captain|Commandant|Prefect/i.test(x))return 4;
  if(/Captain|Major|Senior Commander|Depot-Master/i.test(x))return 3;
  if(/Commander|Monitor-Captain|Senior Sergeant/i.test(x))return 2;
  if(/Lieutenant|Sergeant|Master/i.test(x))return 1;
  return 0;
}
function shipRank(s){
  return!naval(s)?'Master':/Light Cruiser/i.test(s.className||'')?'Captain':/Defence Monitor/i.test(s.className||'')?'Monitor-Captain':/Patrol Craft/i.test(s.className||'')?'Lieutenant':'Commander';
}
function ownerRecord(id,L){return L?.records?.find?.(r=>r?.logistics?.id===id)?.id||''}
function add(P,id,name,branch,kind,a){
  let p=P.get(id);
  if(!p){
    p={personId:id,name,branch,kind,assignments:[],nodes:[],records:[]};
    P.set(id,p);
  }
  p.assignments.push(Object.freeze(a));
  p.nodes.push(...(a.nodeIds||[]));
  if(a.relatedRecordId)p.records.push(a.relatedRecordId);
  if(a.ownerRecordId)p.records.push(a.ownerRecordId);
}
function age(s,H,L){return Number(H?.historyFor?.(s,L)?.documentedAgeYears)||parseInt(s.service,10)||80}

function ships(P,SM,L,H){
  const G=new Map();
  for(const s of L?.REGISTERED_SHIPS||[]){
    const k=s.ownerId||s.ownerName||s.home||'unassigned';
    if(!G.has(k))G.set(k,[]);
    G.get(k).push(s);
  }
  for(const[owner,ss]of G){
    ss.sort((a,b)=>String(a.registry).localeCompare(String(b.registry)));
    const n=ss.length,span=ss.some(naval)?28:38,names=ss.map(s=>rank(s.commander)),max=Math.max(...ss.map(s=>age(s,H,L)));
    for(let g=0;g<=Math.floor(max/span);g++){
      const career=Math.floor(g/2);
      for(let i=0;i<n;i++){
        const s=ss[i],a=age(s,H,L),end=g*span;
        if(end>=a)continue;
        const start=Math.min(a,(g+1)*span),slot=(i+g)%n,id=`PERS/VOID/${slug(owner)}/${career}/${slot}`,nm=career===0?names[slot]?.name:person(`${owner}|${career}|${slot}`),r=g===0?names[i]?.rank||shipRank(s):shipRank(s);
        const as={
          kind:'ship-command',
          rank:r,
          role:naval(s)?'Commanding officer':'Ship master',
          postName:s.name,
          shipRegistry:s.registry,
          shipName:s.name,
          shipClass:s.className,
          ownerId:s.ownerId||'',
          ownerName:s.ownerName||'',
          ownerRecordId:ownerRecord(s.ownerId,L),
          startYearsBeforePresent:start,
          endYearsBeforePresent:end,
          nodeIds:u([s.homeNodeId,...(s.operatingNodes||[])]),
          location:s.home||'',
          active:end===0
        };
        add(P,id,nm,naval(s)?'Imperial Navy / System Defence':'Chartist Mercatura','void-command',as);
        if(!SM.has(s.registry))SM.set(s.registry,[]);
        SM.get(s.registry).push({personId:id,start,end,assignment:as});
      }
    }
  }
}

function institutions(P,M,I,list,span,prefix,branch,titles,nameFn,kind){
  const n=list.length;
  if(!n)return;
  const max=Math.max(...list.map(x=>x.formedYearsAgo||x.ageYears||0));
  for(let g=0;g<=Math.floor(max/span);g++){
    const career=Math.floor(g/2);
    for(let i=0;i<n;i++){
      const x=list[i],a=Number(x.formedYearsAgo||x.ageYears)||0,end=g*span;
      if(end>=a)continue;
      const start=Math.min(a,(g+1)*span),slot=(i+g)%n,id=`PERS/${prefix}/${career}/${slot}`,r=titles[h(`${x.id}|${career}|${slot}`)%titles.length];
      const as={
        kind:'institution-command',
        rank:r,
        role:kind==='command'?'Command authority':'Custodial superior',
        postName:x.name,
        institutionId:x.id,
        institutionKind:kind,
        relatedRecordId:`infra-${kind}-${x.id}`,
        startYearsBeforePresent:start,
        endYearsBeforePresent:end,
        nodeIds:u(I?.YARDS?.filter(y=>kind==='command'?y.commandId===x.id:y.conclaveId===x.id).flatMap(y=>y.nodeIds)||[]),
        location:x.seat||'',
        active:end===0
      };
      add(P,id,nameFn(`${prefix}|${career}|${slot}`),branch,kind==='command'?'strategic-command':'mechanicus-command',as);
      if(!M.has(x.id))M.set(x.id,[]);
      M.get(x.id).push({personId:id,start,end,assignment:as});
    }
  }
}

function schools(P,L){
  const titles=['Commandant Rear-Admiral','Abbess-Commandant','Depot-Master','Prefect-Logister','Navis-Magister','Magos Navalis'];
  for(const s of L?.SCHOOLS||[]){
    const lead=String(s.note||'').split(';')[0],t=titles.find(x=>lead.toLowerCase().startsWith(x.toLowerCase()));
    if(!t)continue;
    const nm=lead.slice(t.length).trim(),existing=[...P.entries()].find(([,p])=>p.name===nm&&p.assignments.some(a=>a.endYearsBeforePresent===0)),id=existing?.[0]||`PERS/SCHOOL/${slug(s.id)}`,d=8+h(s.id)%17;
    add(P,id,nm,/Magos/i.test(t)?'Adeptus Mechanicus':/Navis/i.test(t)?'Navis Imperialis / Imperial Navy':'Imperial Scholastica',/Magos/i.test(t)?'mechanicus-command':'institutional-command',{
      kind:'institution-command',
      rank:t,
      role:'Institutional superior',
      postName:s.name,
      institutionId:s.id,
      institutionKind:'school',
      relatedRecordId:`log-school-${s.id}`,
      startYearsBeforePresent:d,
      endYearsBeforePresent:0,
      nodeIds:u(s.nodeIds||[]),
      location:s.nodeIds?.[0]||'',
      active:true
    });
  }
}

function assignmentAt(rows,y){
  y=Math.max(0,Number(y)||0);
  return(rows||[]).find(r=>y<=r.start&&y>=r.end)||null;
}
function rawAssignmentAt(assignments,y){
  y=Math.max(0,Number(y)||0);
  return(assignments||[]).find(a=>y<=a.startYearsBeforePresent&&y>=a.endYearsBeforePresent)||null;
}
function eventKey(ship,e){return`${ship?.registry||ship?.name}|${Number(e?.yearsBeforePresent)||0}|${e?.title||''}`}
function inAssignment(e,a){
  const y=Number(e?.yearsBeforePresent);
  return Number.isFinite(y)&&y<=a.startYearsBeforePresent&&y>=a.endYearsBeforePresent;
}
function significant(e){
  const x=`${e?.kind||''} ${e?.title||''} ${e?.text||''}`.toLowerCase();
  return e&&Number(e.yearsBeforePresent)>0&&!['commissioning','current'].includes(e.kind)&&(/combat|damage|recovery|refit|battle|convoy|gellar|warp|lost|fire|collision|boarding|raider|torpedo|casualty|salvage|reconstruction|quarantine|drift|interdiction|emergency/.test(x)||['combat','damage','recovery','refit'].includes(e.kind));
}

function eventOutcome(personId,a,e,s){
  const q=h(`${personId}|${eventKey(s,e)}|career`)%100,x=`${e.kind} ${e.title} ${e.text}`.toLowerCase(),combat=e.kind==='combat'||/battle|engag|raider|torpedo|boarding|rearguard|picket|interdiction/.test(x),damage=e.kind==='damage'||/damage|casualty|fire|collision|breach|lost/.test(x),warp=/gellar|warp|translation|navigator/.test(x),bad=/convoy loss|failed|inquiry|lost|disaster|collision|quarantine/.test(x);
  let kind,title,text,severity='notable';
  if(combat&&q<38){
    kind='commendation';
    title='Battle commendation entered';
    text=`Commendation was entered for command conduct during “${e.title}”; later promotion and Prolong boards retained the action in the officer's sealed service abstract.`;
    severity='honour';
  }else if((combat||damage||warp)&&q<58){
    kind='wounding';
    title='Command casualty / medicae absence';
    text=`The officer was wounded or void-exposed during “${e.title}” and temporarily relinquished direct duty while the command cadre maintained continuity.`;
    severity='casualty';
  }else if(bad&&q<72){
    kind='censure';
    title='Command censure and inquiry';
    text=`A formal inquiry followed “${e.title}”. The surviving seal records censure without voiding the officer's entire prior service.`;
    severity='disciplinary';
  }else if((e.kind==='recovery'||e.kind==='refit')&&q<46){
    kind='commendation';
    title='Reclamation service citation';
    text=`The officer received a reclamation citation for preserving the hull, crew or charter through “${e.title}”.`;
    severity='honour';
  }else return null;
  return Object.freeze({
    outcomeId:`OUT/${slug(personId)}/${slug(s?.registry||a.postName)}/${e.yearsBeforePresent}/${slug(e.title)}`,
    personId,kind,title,text,severity,terminal:false,
    yearsBeforePresent:Number(e.yearsBeforePresent),
    eventTitle:e.title,
    eventKey:eventKey(s,e),
    postName:a.postName,
    shipRegistry:s?.registry||a.shipRegistry||'',
    careerEffect:kind==='commendation'?'Positive consideration in subsequent appointment, promotion and longevity-treatment review.':kind==='wounding'?'Temporary medicae absence; command continuity passed through the senior surviving cadre.':'Adverse notation retained for later appointment, charter and medical-retention review.'
  });
}

function boundaryOutcome(personId,older,newer){
  if(!older||!newer)return null;
  const y=Math.max(older.endYearsBeforePresent,newer.startYearsBeforePresent),up=rankValue(newer.rank)>rankValue(older.rank),kind=up?'promotion':'transfer',title=up?'Promotion and reassignment':'Transfer under fresh command seal',text=up?`${older.rank} ${older.postName} was followed by appointment as ${newer.rank} at ${newer.postName}; the promotion and transfer share the same surviving personnel seal.`:`The officer transferred from ${older.postName} to ${newer.postName} without a recorded break in Imperial service.`;
  return Object.freeze({
    outcomeId:`OUT/${slug(personId)}/boundary/${y}/${slug(newer.postName)}`,
    personId,kind,title,text,severity:'career',terminal:false,yearsBeforePresent:y,eventTitle:'Posting transition',eventKey:'',postName:newer.postName,shipRegistry:newer.shipRegistry||'',
    careerEffect:up?'Rank and appointment authority increased; future Prolong entitlement is recalculated at the higher standing.':'Service continued under a different hull or institutional command.'
  });
}

function finalOutcome(personId,a,branch,serviceYears=0){
  if(!a||a.endYearsBeforePresent===0)return null;
  const y=a.endYearsBeforePresent,q=h(`${personId}|${a.postName}|${y}|final`)%100,mech=/Mechanicus/i.test(branch),navy=/Navy|Defence|Navis/i.test(branch),extreme=serviceYears>=130;
  let kind,title,text;
  if(mech){
    if(extreme){
      if(q<8){kind='missing';title='Noospheric contact lost';text='After more than a century of recorded service the final custodial seal closes with no authenticated destruction record.'}
      else if(q<68){kind='retirement';title='Withdrawn after extreme service longevity';text='The Magos was withdrawn from front-line Cafarron responsibility after an exceptionally long productive career; further forge or noospheric duty is sealed.'}
      else{kind='transfer';title='Transferred beyond the Cafarron register';text='Extreme longevity and accumulated expertise justified transfer to a higher forge, fleet or priesthood authority beyond the local register.'}
    }else if(q<18){kind='missing';title='Noospheric contact lost';text='The final custodial seal closes after an unexplained loss of noospheric contact; no authenticated destruction record survives.'}
    else if(q<38){kind='retirement';title='Withdrawn to sealed Mechanicus duty';text='The Magos was withdrawn from the Cafarron command ledger for deeper forge or noospheric duty; subsequent disposition is not available at this access tier.'}
    else if(q<52){kind='relief';title='Custodial authority reassigned';text='The priesthood reassigned custodial authority following doctrinal review; the record contains no execution or destruction seal.'}
    else{kind='transfer';title='Transferred beyond the Cafarron register';text='The final local appointment ended in transfer to a forge, fleet or priesthood authority beyond the surviving Cafarron index.'}
  }else if(navy){
    if(extreme){
      if(q<8){kind='killed';title='Killed in Imperial service';text='Even after more than a century of retained service, the final personnel roll carries a death seal rather than retirement.'}
      else if(q<12){kind='missing';title='Missing in action';text='The final command seal closes without confirmed recovery after an exceptionally long service life.'}
      else if(q<78){kind='retirement';title='Retired after extreme service longevity';text='After roughly a century and a half of retained usefulness, the officer was finally released from active command under senior retirement or reserve writ.'}
      else{kind='transfer';title='Transferred to senior sealed appointment';text='The officer left local command after extreme service longevity for a higher-order staff, marshalate or reserve appointment beyond this archive.'}
    }else if(q<15){kind='killed';title='Killed in Imperial service';text='The final personnel roll carries a death seal associated with the end of this command tenure.'}
    else if(q<25){kind='missing';title='Missing in action';text='The final command seal closes without confirmed recovery of the officer; the individual remains listed missing rather than formally dead.'}
    else if(q<39){kind='relief';title='Relieved of command';text='The officer was formally relieved and the command transferred to a successor after review by higher fleet authority.'}
    else if(q<48){kind='disgrace';title='Command standing revoked';text='The final surviving notation records loss of command standing after disciplinary review; subsequent service, if any, is sealed.'}
    else if(q<72){kind='retirement';title='Retired from active command';text='The officer left active void command under an honourable retirement or reserve writ.'}
    else{kind='transfer';title='Transferred beyond local rolls';text='The officer departed the Cafarron command structure under a sealed higher-order appointment.'}
  }else{
    if(extreme){
      if(q<7){kind='missing';title='Lost with chartered traffic';text='An exceptionally long mercantile career ends during a missing-vessel or missing-convoy interval.'}
      else if(q<70){kind='retirement';title='Retired after extreme void service';text='After more than a century of retained usefulness, the master finally relinquished command to household, factor, reserve or pensioned service.'}
      else{kind='transfer';title='Transferred to senior charter authority';text='The veteran left direct hull command for a charter, factor or household authority beyond the local vessel register.'}
    }else if(q<10){kind='missing';title='Lost with chartered traffic';text='The final mercantile personnel seal ends during a missing-vessel or missing-convoy interval; no confirmed death record survives.'}
    else if(q<24){kind='relief';title='Charter authority withdrawn';text='The master was removed from command by house factors, creditors or charter authority after formal review.'}
    else if(q<34){kind='disgrace';title="Master's seal censured";text='The final local record carries a severe mercantile censure and withdrawal of command privilege.'}
    else if(q<70){kind='retirement';title='Retired from void command';text='The master relinquished active command after a completed charter tenure and passed into reserve, factor or household service.'}
    else{kind='transfer';title='Transferred to another charter';text='The master left the local hull register for another chartered command not retained in the present archive.'}
  }
  return Object.freeze({
    outcomeId:`OUT/${slug(personId)}/final/${y}/${kind}`,
    personId,kind,title,text,severity:'terminal',terminal:true,yearsBeforePresent:y,eventTitle:'Final disposition seal',eventKey:'',postName:a.postName,shipRegistry:a.shipRegistry||'',
    careerEffect:kind==='killed'?'Career terminated by confirmed death.':kind==='missing'?'Career terminates in unresolved missing status.':kind==='relief'||kind==='disgrace'?'Command authority terminated by adverse administrative action.':kind==='retirement'?'Active command career ended.':'Local career record ends in transfer beyond this archive.'
  });
}

function baseOutcomesForRaw(p,L,H){
  const a=[...p.assignments].sort((x,y)=>y.startYearsBeforePresent-x.startYearsBeforePresent),out=[];
  for(const as of a){
    if(as.shipRegistry){
      const s=L?.REGISTERED_SHIPS?.find(x=>x.registry===as.shipRegistry);
      if(s){
        const ev=(H?.historyFor?.(s,L)?.events||[]).filter(e=>significant(e)&&inAssignment(e,as)).sort((x,y)=>y.yearsBeforePresent-x.yearsBeforePresent);
        let kept=0;
        for(const e of ev){
          const o=eventOutcome(p.personId,as,e,s);
          if(o){
            out.push(o);
            if(++kept>=2)break;
          }
        }
      }
    }
  }
  for(let i=0;i<a.length-1;i++){
    const older=a[i],newer=a[i+1];
    if(older.endYearsBeforePresent===newer.startYearsBeforePresent){
      const o=boundaryOutcome(p.personId,older,newer);
      if(o)out.push(o);
    }
  }
  const active=a.some(x=>x.endYearsBeforePresent===0),newest=a.at(-1);
  if(!active){
    const o=finalOutcome(p.personId,newest,p.branch,Math.max(0,careerStart(a)-careerEnd(a)));
    if(o)out.push(o);
  }
  return Object.freeze(out.sort((x,y)=>y.yearsBeforePresent-x.yearsBeforePresent||x.outcomeId.localeCompare(y.outcomeId)));
}

function careerStart(assignments){return Math.max(0,...assignments.map(a=>Number(a.startYearsBeforePresent)||0))}
function careerEnd(assignments){return Math.min(...assignments.map(a=>Number(a.endYearsBeforePresent)||0))}
function treatmentState(p,assignments,baseOutcomes,y,startYear){
  const as=rawAssignmentAt(assignments,y)||assignments.at(-1);
  const elapsed=Math.max(0,startYear-y);
  const prior=baseOutcomes.filter(o=>o.yearsBeforePresent>=y);
  const commendations=prior.filter(o=>o.kind==='commendation').length;
  const wounds=prior.filter(o=>o.kind==='wounding').length;
  const adverse=prior.filter(o=>['censure','relief','disgrace'].includes(o.kind)).length;
  const value=rankValue(as?.rank);
  const score=value*1.35+Math.floor(elapsed/35)+commendations*1.5+wounds*.35-adverse*1.4;
  return Object.freeze({assignment:as,elapsed,commendations,wounds,adverse,rankValue:value,score});
}
function treatmentPlan(p,state,sequence,supportedAge,naturalLife){
  const mech=/Mechanicus/i.test(p.branch),chartist=/Chartist/i.test(p.branch),navy=/Navy|Defence|Navis/i.test(p.branch);
  const q=h(`${p.personId}|longevity|${sequence}|${state.assignment?.postName||''}`)%100;
  if(mech){
    if(state.rankValue>=5||state.score>=7||q<28)return{kind:'augmentation',grade:'excellent',...LONGEVITY_STANDARDS.augmentation.excellent};
    if(state.rankValue>=3||state.score>=4.5)return{kind:'augmentation',grade:'good',...LONGEVITY_STANDARDS.augmentation.good};
    if(supportedAge<naturalLife*2)return{kind:'augmentation',grade:'mediocre',...LONGEVITY_STANDARDS.augmentation.mediocre};
    return{kind:'prolong-treatment',grade:'middling',...LONGEVITY_STANDARDS.prolong.middling};
  }
  if(state.rankValue>=5||state.score>=7.25)return{kind:'prolong-treatment',grade:'full',...LONGEVITY_STANDARDS.prolong.full};
  if(state.wounds>0&&q<42&&supportedAge<naturalLife*LONGEVITY_STANDARDS.augmentation.serviceable.ceilingMultiplier)return{kind:'augmentation',grade:'serviceable',...LONGEVITY_STANDARDS.augmentation.serviceable};
  if(state.rankValue>=3&&state.score>=4.5){
    if(state.wounds>0&&q<48)return{kind:'augmentation',grade:'good',...LONGEVITY_STANDARDS.augmentation.good};
    return q<72?{kind:'prolong-treatment',grade:'full',...LONGEVITY_STANDARDS.prolong.full}:{kind:'augmentation',grade:'good',...LONGEVITY_STANDARDS.augmentation.good};
  }
  if(chartist&&q<35&&supportedAge<naturalLife*2)return{kind:'augmentation',grade:'mediocre',...LONGEVITY_STANDARDS.augmentation.mediocre};
  if(navy&&state.commendations>0&&state.score>=3.5&&q<45)return{kind:'prolong-treatment',grade:'full',...LONGEVITY_STANDARDS.prolong.full};
  return{kind:'prolong-treatment',grade:'middling',...LONGEVITY_STANDARDS.prolong.middling};
}
function treatmentJustification(p,state,plan){
  const rank=state.assignment?.rank||'Imperial servant',post=state.assignment?.postName||'sealed appointment';
  if(plan.grade==='full')return`${rank} standing, ${state.elapsed} years of accumulated service and ${state.commendations} retained commendation seal${state.commendations===1?'':'s'} justified a full high-cost Prolong allocation while assigned to ${post}.`;
  if(plan.grade==='excellent')return`${rank} standing and institutional retention value justified excellent augmetic and organ-replacement work capable of competing with the best Prolong suites.`;
  if(plan.grade==='good')return`${rank} standing, accumulated service and medical history justified expensive specialist augmentation rather than disposable replacement of the officer.`;
  if(plan.grade==='serviceable')return`Existing wounds or organ loss were cheaper to repair with serviceable augmetics than to discard the veteran; the work restored function and bought only limited additional longevity.`;
  if(plan.grade==='mediocre')return`The personnel board judged continued service useful but did not authorize elite rejuvenat expenditure; serviceable organ and augmetic renewal was cheaper than replacement and training of an equivalent veteran.`;
  return`The officer remained useful enough to justify another retention-grade course, but standing and available writs did not support the full fifty-year Prolong suite.`;
}
function medicalLedgerForRaw(p,assignments,baseOutcomes){
  const start=careerStart(assignments),end=careerEnd(assignments),span=Math.max(0,start-end),entryAge=18+h(`${p.personId}|entry-age`)%9,targetAge=entryAge+span;
  let naturalLife=50+h(`${p.personId}|natural-life`)%21;
  naturalLife=Math.min(70,Math.max(naturalLife,Math.ceil(targetAge/LONGEVITY_STANDARDS.hardSenescenceMultiplier)));
  const naturalProductive=Math.max(40,naturalLife-LONGEVITY_STANDARDS.baselineHuman.productiveMarginYears),hardCeiling=Math.max(naturalLife,Math.round(naturalLife*LONGEVITY_STANDARDS.hardSenescenceMultiplier));
  let supported=naturalProductive;
  const treatments=[];
  let sequence=0,lastY=start;
  while(supported<targetAge&&supported<hardCeiling&&sequence<12){
    const triggerAge=Math.max(entryAge+10,Math.min(targetAge,supported-3));
    const elapsed=Math.max(0,triggerAge-entryAge);
    let y=Math.round(start-elapsed);
    y=Math.max(end,Math.min(start,y));
    if(sequence&&y>=lastY)y=Math.max(end,lastY-1);
    lastY=y;
    const state=treatmentState(p,assignments,baseOutcomes,y,start),plan=treatmentPlan(p,state,sequence,supported,naturalLife);
    let packageCeiling=hardCeiling;
    if(plan.kind==='augmentation'&&plan.ceilingMultiplier)packageCeiling=Math.min(packageCeiling,Math.round(naturalLife*plan.ceilingMultiplier));
    let grant=Math.max(0,Math.min(plan.productiveYears,packageCeiling-supported,hardCeiling-supported));
    if(grant<=0&&plan.kind==='augmentation'){
      const fallback={kind:'prolong-treatment',grade:'middling',...LONGEVITY_STANDARDS.prolong.middling};
      grant=Math.max(0,Math.min(fallback.productiveYears,hardCeiling-supported));
      if(grant>0){
        treatments.push(Object.freeze({
          outcomeId:`MED/${slug(p.personId)}/${sequence}/${y}/middling`,
          personId:p.personId,
          kind:fallback.kind,
          grade:fallback.grade,
          title:fallback.label,
          text:`A further mixed rejuvenat and organ-support course was authorized after augmetic lifespan ceilings had been reached. ${fallback.composition}.`,
          severity:'medicae',
          terminal:false,
          yearsBeforePresent:y,
          chronologicalAgeYears:entryAge+(start-y),
          eventTitle:'Prolong treatment seal',
          eventKey:'',
          postName:state.assignment?.postName||'sealed appointment',
          shipRegistry:state.assignment?.shipRegistry||'',
          productiveYearsGranted:grant,
          supportedProductiveAgeBefore:supported,
          supportedProductiveAgeAfter:supported+grant,
          cost:fallback.cost,
          composition:fallback.composition,
          authorization:treatmentJustification(p,state,fallback),
          careerEffect:`Purchased approximately ${grant} additional productive year${grant===1?'':'s'} before another major longevity intervention would be required.`
        }));
        supported+=grant;
        sequence++;
        continue;
      }
    }
    if(grant<=0)break;
    treatments.push(Object.freeze({
      outcomeId:`MED/${slug(p.personId)}/${sequence}/${y}/${slug(plan.grade)}`,
      personId:p.personId,
      kind:plan.kind,
      grade:plan.grade,
      title:plan.label,
      text:`${plan.composition}. ${plan.note}`,
      severity:'medicae',
      terminal:false,
      yearsBeforePresent:y,
      chronologicalAgeYears:entryAge+(start-y),
      eventTitle:plan.kind==='augmentation'?'Longevity augmentation seal':'Prolong treatment seal',
      eventKey:'',
      postName:state.assignment?.postName||'sealed appointment',
      shipRegistry:state.assignment?.shipRegistry||'',
      productiveYearsGranted:grant,
      supportedProductiveAgeBefore:supported,
      supportedProductiveAgeAfter:supported+grant,
      cost:plan.cost,
      composition:plan.composition||'multi-modal augmetic and biological reconstruction',
      authorization:treatmentJustification(p,state,plan),
      careerEffect:`Purchased approximately ${grant} additional productive year${grant===1?'':'s'}; senescence was deferred, not abolished.`
    }));
    supported+=grant;
    sequence++;
  }
  const plausible=targetAge<=supported&&targetAge<=hardCeiling;
  const treatmentSummary=treatments.length
    ?`${treatments.length} major longevity intervention${treatments.length===1?'':'s'} extend the estimated productive-service envelope from about age ${naturalProductive} to about age ${supported}.`
    :'No major life-extension course is required by the surviving service span.';
  return Object.freeze({
    serviceEntryAgeYears:entryAge,
    chronologicalAgeAtCurrentOrFinalSeal:targetAge,
    naturalLifeExpectancyYears:naturalLife,
    naturalProductiveAgeYears:naturalProductive,
    hardSenescenceCeilingYears:hardCeiling,
    supportedProductiveAgeYears:supported,
    longevityMultiple:Number((supported/Math.max(1,naturalProductive)).toFixed(2)),
    treatmentCount:treatments.length,
    treatments:Object.freeze(treatments),
    plausible,
    summary:treatmentSummary
  });
}

function finalDisposition(active,outcomes){
  if(active)return'Active under the present personnel seal';
  const o=[...(outcomes||[])].reverse().find(x=>x.terminal);
  if(!o)return'Historical officer; final disposition held under sealed personnel rolls';
  return`${o.title} · T−${o.yearsBeforePresent}`;
}

function finish(p,i,L,H){
  const a=[...p.assignments].sort((x,y)=>y.startYearsBeforePresent-x.startYearsBeforePresent),old=Math.max(0,...a.map(x=>x.startYearsBeforePresent)),active=a.some(x=>x.endYearsBeforePresent===0),baseOutcomes=baseOutcomesForRaw(p,L,H),medical=medicalLedgerForRaw(p,a,baseOutcomes),outcomes=Object.freeze([...baseOutcomes,...medical.treatments].sort((x,y)=>y.yearsBeforePresent-x.yearsBeforePresent||x.outcomeId.localeCompare(y.outcomeId))),honours=outcomes.filter(x=>x.kind==='commendation'),wounds=outcomes.filter(x=>x.kind==='wounding'),censures=outcomes.filter(x=>['censure','relief','disgrace'].includes(x.kind)),now=a.find(x=>x.endYearsBeforePresent===0)||a.at(-1),span=Math.max(1,old-Math.min(...a.map(x=>x.endYearsBeforePresent))),status=finalDisposition(active,outcomes);
  const summary=`${p.name} is cross-indexed through ${a.length} surviving command posting${a.length===1?'':'s'} spanning approximately ${span} years of recorded service. Estimated age at the present or final local seal is ${medical.chronologicalAgeAtCurrentOrFinalSeal}, against an unaugmented life expectancy of roughly ${medical.naturalLifeExpectancyYears}. ${medical.summary} ${active?'The present seal lists an active command or institutional appointment.':`The final surviving disposition is ${status}.`} ${outcomes.length?`${outcomes.length} career, medical and consequence seal${outcomes.length===1?' is':'s are'} attached.`:''}`;
  return Object.freeze({
    ...p,
    assignments:Object.freeze(a),
    nodeIds:Object.freeze(u(p.nodes)),
    relatedRecordIds:Object.freeze(u(p.records)),
    active,
    ranks:Object.freeze(u(a.map(x=>x.rank))),
    posts:Object.freeze(u(a.map(x=>x.postName))),
    serviceSpanYears:span,
    status,
    summary,
    currentAssignment:now,
    careerOutcomes:outcomes,
    honours:Object.freeze(honours),
    wounds:Object.freeze(wounds),
    censures:Object.freeze(censures),
    medical,
    prolongTreatments:medical.treatments,
    finalDisposition:status,
    referenceId:`PERS-${String(i+1).padStart(4,'0')}`
  });
}

function record(p){
  return Object.freeze({
    id:`personnel-${slug(p.personId)}`,
    referenceId:p.referenceId,
    name:p.name,
    category:'personnel',
    objectType:'Imperial command personnel dossier',
    classification:`${p.branch} command lineage`,
    summary:p.summary,
    relationships:Object.freeze(u([
      ...p.posts,
      ...p.assignments.flatMap(a=>[a.shipName,a.shipClass,a.ownerName,a.postName]),
      ...p.careerOutcomes.flatMap(o=>[o.title,o.eventTitle,o.postName])
    ])),
    mapNodeIds:p.nodeIds,
    tags:Object.freeze(['personnel','command lineage','longevity register',p.kind,p.active?'active officer':'historical officer',...u(p.careerOutcomes.map(o=>o.kind))]),
    source:SOURCE,
    logistics:Object.freeze({
      kind:'personnel',
      personId:p.personId,
      branch:p.branch,
      status:p.status,
      active:p.active,
      serviceSpanYears:p.serviceSpanYears,
      postingCount:p.assignments.length,
      currentPost:p.currentAssignment?.postName||'',
      careerOutcomeCount:p.careerOutcomes.length,
      commendations:p.honours.length,
      wounds:p.wounds.length,
      censures:p.censures.length,
      prolongTreatments:p.medical.treatmentCount,
      estimatedAge:p.medical.chronologicalAgeAtCurrentOrFinalSeal,
      naturalLifeExpectancy:p.medical.naturalLifeExpectancyYears,
      supportedProductiveAge:p.medical.supportedProductiveAgeYears,
      longevityMultiple:p.medical.longevityMultiple,
      finalDisposition:p.finalDisposition
    })
  });
}

function build(L,H,I){
  const S=L?.REGISTERED_SHIPS;
  if(!S||!H?.historyFor)return Object.freeze({people:Object.freeze([]),records:Object.freeze([]),byId:new Map(),byShip:new Map(),byCommand:new Map(),byConclave:new Map(),byOutcomeEvent:new Map()});
  const z=CACHE.get(S);
  if(z&&z.historyFor===H.historyFor&&z.I===I)return z.index;
  const P=new Map(),SM=new Map(),CM=new Map(),MM=new Map();
  ships(P,SM,L,H);
  institutions(P,CM,I,[...(I?.COMMANDS||[])].sort((a,b)=>a.id.localeCompare(b.id)),34,'NAVCMD','Imperial Navy / Departmento Munitorum',CT,person,'command');
  institutions(P,MM,I,[...(I?.CONCLAVES||[])].sort((a,b)=>a.id.localeCompare(b.id)),72,'MECH','Adeptus Mechanicus',MT,magos,'conclave');
  schools(P,L);
  const people=[...P.values()].map((p,i)=>finish(p,i,L,H)).sort((a,b)=>a.name.localeCompare(b.name)),byId=new Map(people.map(p=>[p.personId,p]));
  const bind=M=>new Map([...M].map(([k,v])=>[k,Object.freeze(v.map(r=>Object.freeze({...r,person:byId.get(r.personId)})))]));
  const byOutcomeEvent=new Map();
  for(const p of people)for(const o of p.careerOutcomes)if(o.eventKey){
    if(!byOutcomeEvent.has(o.eventKey))byOutcomeEvent.set(o.eventKey,[]);
    byOutcomeEvent.get(o.eventKey).push(Object.freeze({person:p,outcome:o}));
  }
  for(const[k,v]of byOutcomeEvent)byOutcomeEvent.set(k,Object.freeze(v));
  const index=Object.freeze({
    people:Object.freeze(people),
    records:Object.freeze(people.map(record)),
    byId,
    byShip:bind(SM),
    byCommand:bind(CM),
    byConclave:bind(MM),
    byOutcomeEvent
  });
  CACHE.set(S,{historyFor:H.historyFor,I,index});
  return index;
}

function at(rows,y){return assignmentAt(rows,y)}
function wrap(r){return r?Object.freeze({person:r.person,assignment:r.assignment}):null}
function personForShipEvent(s,e,L,H,I){return wrap(at(build(L,H,I).byShip.get(s?.registry),e?.yearsBeforePresent))}
function personForCommand(id,y,L,H,I){return wrap(at(build(L,H,I).byCommand.get(id),y))}
function personForConclave(id,y,L,H,I){return wrap(at(build(L,H,I).byConclave.get(id),y))}
function careerOutcomeForShipEvent(s,e,L,H,I){return Object.freeze([...(build(L,H,I).byOutcomeEvent.get(eventKey(s,e))||[])])}
function peopleForEvent(ev,L,H,I){
  const idx=build(L,H,I),out=[];
  if(ev?.personnel?.length)for(const l of ev.personnel){
    const p=idx.byId.get(l.personId),y=Number(ev.yearsBeforePresent)||0,a=p?.assignments.find(a=>a.postName===l.postName&&y<=a.startYearsBeforePresent&&y>=a.endYearsBeforePresent)||p?.assignments.find(a=>a.postName===l.postName);
    if(p&&a)out.push({person:p,assignment:a});
  }else for(const o of ev?.observations||[])if(o.shipRegistry){
    const s=L?.REGISTERED_SHIPS?.find(s=>s.registry===o.shipRegistry),x=personForShipEvent(s,{yearsBeforePresent:o.yearsBeforePresent},L,H,I);
    if(x)out.push(x);
  }
  const seen=new Set();
  return Object.freeze(out.filter(x=>{
    const k=x.person.personId+'|'+x.assignment.postName+'|'+x.assignment.endYearsBeforePresent;
    if(seen.has(k))return false;
    seen.add(k);
    return true;
  }));
}
function careerOutcomesForEvent(ev,L,H,I){
  const out=[];
  for(const o of ev?.observations||[]){
    if(!o.shipRegistry)continue;
    const s=L?.REGISTERED_SHIPS?.find(x=>x.registry===o.shipRegistry);
    if(!s)continue;
    out.push(...careerOutcomeForShipEvent(s,{yearsBeforePresent:o.yearsBeforePresent,title:o.title},L,H,I));
  }
  const seen=new Set();
  return Object.freeze(out.filter(x=>{
    const k=x.person.personId+'|'+x.outcome.outcomeId;
    if(seen.has(k))return false;
    seen.add(k);
    return true;
  }));
}
function peopleForRecord(r,L,H,I){
  const idx=build(L,H,I),ids=new Set(),x=r?.logistics||{},nodes=new Set(r?.mapNodeIds||[]);
  if(x.kind==='personnel')return Object.freeze([idx.byId.get(x.personId)].filter(Boolean));
  for(const s of H?.shipsForRecord?.(r,L)||[])for(const q of idx.byShip.get(s.registry)||[])ids.add(q.person.personId);
  if(x.kind==='naval-command')for(const q of idx.byCommand.get(x.id)||[])ids.add(q.person.personId);
  if(x.kind==='mechanicus-conclave')for(const q of idx.byConclave.get(x.id)||[])ids.add(q.person.personId);
  for(const p of idx.people)if(p.assignments.some(a=>a.relatedRecordId===r?.id||a.ownerRecordId===r?.id||a.nodeIds?.some(n=>nodes.has(n))))ids.add(p.personId);
  return Object.freeze([...ids].map(id=>idx.byId.get(id)).filter(Boolean));
}

function E(t,c='',x=''){
  const n=document.createElement(t);
  if(c)n.className=c;
  if(x!=='')n.textContent=x;
  return n;
}
function D(dl,k,v){
  if(v==null||v===''||Array.isArray(v)&&!v.length)return;
  dl.append(E('dt','',k),E('dd','',Array.isArray(v)?v.join(' · '):String(v)));
}
function text(a){return`${a.rank} · ${a.postName} · T−${a.startYearsBeforePresent} to ${a.endYearsBeforePresent?`T−${a.endYearsBeforePresent}`:'present'}`}
function outcomeText(o){
  if(o.kind==='prolong-treatment'||o.kind==='augmentation')return`${o.yearsBeforePresent?`T−${o.yearsBeforePresent}`:'PRESENT'} · age ${o.chronologicalAgeYears} · ${o.title} · +${o.productiveYearsGranted} productive years`;
  return`${o.yearsBeforePresent?`T−${o.yearsBeforePresent}`:'PRESENT'} · ${o.title} · ${o.careerEffect}`;
}
function medicalText(t){return`T−${t.yearsBeforePresent} · age ${t.chronologicalAgeYears} · ${t.title} · +${t.productiveYearsGranted} years · ${t.cost}`}

function renderOutcomes(p,small=false){
  if(!p?.careerOutcomes?.length)return null;
  const d=E('details',small?'wh-personnel-outcomes wh-personnel-outcomes-compact':'wh-personnel-outcomes'),q=E('summary','',`Unseal career & medicae consequences · ${p.careerOutcomes.length}`),body=E('div','wh-personnel-outcome-list');
  for(const o of p.careerOutcomes){
    const a=E('article',`wh-personnel-outcome is-${o.kind}${o.terminal?' is-terminal':''}`),stamp=E('div','wh-personnel-outcome-stamp',o.yearsBeforePresent?`T−${o.yearsBeforePresent}`:'PRESENT'),copy=E('div','wh-personnel-outcome-copy');
    const meta=o.kind==='prolong-treatment'||o.kind==='augmentation'
      ?`${o.kind.replace(/-/g,' ')} · age ${o.chronologicalAgeYears} · ${o.postName}`
      :`${o.kind.replace(/-/g,' ')} · ${o.postName}${o.eventTitle&&o.eventTitle!=='Final disposition seal'?` · ${o.eventTitle}`:''}`;
    copy.append(E('h5','',o.title),E('p','wh-small',meta),E('p','',o.text));
    if(o.authorization)copy.append(E('p','wh-personnel-medicae-authorization',o.authorization));
    copy.append(E('p','wh-small',o.careerEffect));
    a.append(stamp,copy);
    body.append(a);
  }
  d.append(q,body);
  return d;
}

function core(p,small=false){
  const b=E(small?'div':'section',small?'wh-personnel-compact':'wh-personnel-dossier'),dl=E('dl','wh-entry-ledger');
  b.append(E('p','wh-kicker',small?`♜ ${p.referenceId}`:'♜ Imperial Personnel, Command, Career & Longevity Lineage'),E(small?'strong':'h3','',p.name));
  if(!small)b.append(E('p','wh-entry-copy',p.summary));
  [
    ['Personnel seal',p.personId],
    ['Service branch',p.branch],
    ['Present / final standing',p.status],
    ['Recorded service span',`${p.serviceSpanYears} years`],
    ['Estimated age at present / final seal',`${p.medical.chronologicalAgeAtCurrentOrFinalSeal} years`],
    ['Unaugmented human life expectancy',`${p.medical.naturalLifeExpectancyYears} years`],
    ['Natural productive-service envelope',`approximately age ${p.medical.naturalProductiveAgeYears}`],
    ['Supported productive-service envelope',`approximately age ${p.medical.supportedProductiveAgeYears} · ${p.medical.longevityMultiple}× natural productive span`],
    ['Prolong / longevity interventions',p.prolongTreatments.map(medicalText)],
    ['Ranks and dignities',p.ranks],
    ['Recorded postings',p.assignments.map(text)],
    ['Commendations',p.honours.map(outcomeText)],
    ['Wounds / medicae interruptions',p.wounds.map(outcomeText)],
    ['Censures / adverse actions',p.censures.map(outcomeText)]
  ].forEach(x=>D(dl,...x));
  b.append(dl);
  if(!small){
    const note=E('p','wh-small wh-personnel-medicae-standard',`Medicae standard: ordinary unaugmented human life is entered at roughly ${LONGEVITY_STANDARDS.baselineHuman.lifeExpectancyYears[0]}–${LONGEVITY_STANDARDS.baselineHuman.lifeExpectancyYears[1]} years. Middling Prolong courses purchase about ${LONGEVITY_STANDARDS.prolong.middling.productiveYears} productive years; the best full suites purchase about ${LONGEVITY_STANDARDS.prolong.full.productiveYears}. Augmentation is cheaper, but only expensive high-quality reconstruction approaches the best Prolong outcomes. No treatment removes terminal senescence.`);
    b.append(note);
  }
  const outcomes=renderOutcomes(p,small);
  if(outcomes)b.append(outcomes);
  return b;
}

function renderRecordContext(r,L,H,I){
  const p=build(L,H,I).byId.get(r?.logistics?.personId);
  return p?core(p):null;
}
function renderRecordCrossIndex(r,L,H,I){
  if(r?.category==='personnel')return null;
  const ps=peopleForRecord(r,L,H,I);
  if(!ps.length)return null;
  const s=E('section','wh-entry-section wh-personnel-cross-index');
  s.append(E('h2','',`♜ Personnel & Command Cross-Index · ${ps.length}`),E('p','wh-entry-copy','Named masters, captains, senior officers and Mechanicus authorities are sealed once in the personnel register. Their appointments, longevity treatments and career consequences are cross-indexed here rather than duplicated.'));
  for(const p of ps.slice(0,30)){
    const d=E('details','wh-personnel-link'),q=E('summary','',`${p.name} · ${p.status} · age ${p.medical.chronologicalAgeAtCurrentOrFinalSeal}`);
    d.append(q,core(p,true));
    s.append(d);
  }
  if(ps.length>30)s.append(E('p','wh-small',`${ps.length-30} additional personnel seals remain available through the Command Personnel archive category.`));
  return s;
}
function renderShipCommandLineage(s,L,H,I){
  const rows=build(L,H,I).byShip.get(s?.registry)||[];
  if(!rows.length)return null;
  const d=E('details','wh-personnel-link wh-ship-command-lineage'),q=E('summary','',`♜ Unseal command succession · ${rows.length} tenures`),body=E('div','wh-personnel-command-list');
  for(const r of [...rows].sort((a,b)=>b.start-a.start)){
    const a=E('article','wh-personnel-command-tenure'),p=r.person,outcomes=p.careerOutcomes.filter(o=>o.shipRegistry===s.registry&&o.yearsBeforePresent<=r.start&&o.yearsBeforePresent>=r.end);
    a.append(E('strong','',`${r.assignment.rank} ${p.name}`),E('p','wh-small',`${text(r.assignment)} · estimated final/present age ${p.medical.chronologicalAgeAtCurrentOrFinalSeal}`));
    if(outcomes.length)a.append(E('p','wh-small',outcomes.map(outcomeText).join(' · ')));
    body.append(a);
  }
  d.append(q,body);
  return d;
}
function renderShipCommandLink(s,e,L,H,I){
  const x=personForShipEvent(s,e,L,H,I);
  if(!x)return null;
  const d=E('details','wh-personnel-link wh-event-command-link'),outcomes=careerOutcomeForShipEvent(s,e,L,H,I),q=E('summary','',`♜ Period command · ${x.assignment.rank} ${x.person.name}`),c=core(x.person,true);
  d.append(q,c);
  if(outcomes.length){
    const note=E('div','wh-personnel-event-consequence');
    note.append(E('p','wh-kicker','Career consequence recorded from this event'));
    for(const o of outcomes)note.append(E('p','',`${o.outcome.title} — ${o.outcome.careerEffect}`));
    d.append(note);
  }
  return d;
}

function validate(L,H,I){
  const idx=build(L,H,I),dups=[],seen=new Set(),overlaps=[],medicalErrors=[];
  for(const p of idx.people){
    if(seen.has(p.personId))dups.push(p.personId);
    seen.add(p.personId);
    const byPost=new Map();
    for(const a of p.assignments){
      const k=a.shipRegistry||`${a.institutionKind}:${a.institutionId}`||a.postName;
      if(!byPost.has(k))byPost.set(k,[]);
      byPost.get(k).push(a);
    }
    for(const[k,rows]of byPost)for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
      const a=rows[i],b=rows[j],overlap=Math.min(a.startYearsBeforePresent,b.startYearsBeforePresent)>Math.max(a.endYearsBeforePresent,b.endYearsBeforePresent);
      if(overlap)overlaps.push(`${p.personId}|${k}`);
    }
    const terminal=p.careerOutcomes.filter(o=>o.terminal);
    if(p.active&&terminal.length)overlaps.push(`${p.personId}|active-terminal`);
    if(!p.active&&terminal.length!==1)overlaps.push(`${p.personId}|terminal-count-${terminal.length}`);
    const start=careerStart(p.assignments),end=careerEnd(p.assignments);
    for(const t of p.medical.treatments){
      if(t.yearsBeforePresent>start||t.yearsBeforePresent<end)medicalErrors.push(`${p.personId}|treatment-outside-career`);
      if(t.chronologicalAgeYears<p.medical.serviceEntryAgeYears)medicalErrors.push(`${p.personId}|treatment-before-entry-age`);
      if(t.supportedProductiveAgeAfter<t.supportedProductiveAgeBefore)medicalErrors.push(`${p.personId}|negative-medical-extension`);
    }
    if(!p.medical.plausible)medicalErrors.push(`${p.personId}|career-exceeds-longevity-envelope`);
    if(p.medical.chronologicalAgeAtCurrentOrFinalSeal>p.medical.hardSenescenceCeilingYears)medicalErrors.push(`${p.personId}|hard-senescence-breach`);
  }
  const allOutcomesBound=idx.people.every(p=>p.careerOutcomes.every(o=>o.personId===p.personId&&o.yearsBeforePresent>=0)),currentNames=(L?.REGISTERED_SHIPS||[]).every(s=>{
    const x=personForShipEvent(s,{yearsBeforePresent:0},L,H,I);
    return!x||x.person.name===rank(s.commander).name;
  }),allRecordsBound=idx.records.every(r=>idx.byId.has(r.logistics?.personId)),allMedicalPlausible=!medicalErrors.length;
  return Object.freeze({
    people:idx.people.length,
    records:idx.records.length,
    duplicatePersonIds:Object.freeze(dups),
    overlapErrors:Object.freeze(overlaps),
    overlappingSameKindPostings:Object.freeze(overlaps),
    careerOutcomes:idx.people.reduce((n,p)=>n+p.careerOutcomes.length,0),
    commendations:idx.people.reduce((n,p)=>n+p.honours.length,0),
    wounds:idx.people.reduce((n,p)=>n+p.wounds.length,0),
    adverseActions:idx.people.reduce((n,p)=>n+p.censures.length,0),
    terminalDispositions:idx.people.reduce((n,p)=>n+p.careerOutcomes.filter(o=>o.terminal).length,0),
    longevityTreatments:idx.people.reduce((n,p)=>n+p.medical.treatmentCount,0),
    medicalErrors:Object.freeze(medicalErrors),
    allMedicalPlausible,
    allOutcomesBound,
    currentNamesPreserved:currentNames,
    currentCommandNamesPreserved:currentNames,
    currentShipCommandsResolved:currentNames,
    allRecordsBound,
    allValid:!dups.length&&!overlaps.length&&allOutcomesBound&&currentNames&&allRecordsBound&&allMedicalPlausible
  });
}

if(typeof document!=='undefined'){
  const u0=new URL(CSS,document.baseURI).href;
  if(![...document.styleSheets].some(x=>x.href===u0)){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href=CSS;
    document.head.append(l);
  }
}

window.CafarronPersonnelLineageV1=Object.freeze({
  VERSION,
  SOURCE,
  LONGEVITY_STANDARDS,
  build,
  personForShipEvent,
  personForCommand,
  personForConclave,
  peopleForEvent,
  peopleForRecord,
  careerOutcomeForShipEvent,
  careerOutcomesForEvent,
  renderRecordContext,
  renderRecordCrossIndex,
  renderShipCommandLineage,
  renderShipCommandLink,
  renderOutcomes,
  validate
});
})();
