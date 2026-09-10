(() => {
  'use strict';

  const sectorAuthority = globalThis.BlacklightExoStellarSectorData;
  const speciesSelect = document.getElementById('alien-equipment-species');
  const governmentSelect = document.getElementById('alien-equipment-government');
  const tierSelect = document.getElementById('alien-equipment-tier');
  const generateButton = document.getElementById('alien-equipment-generate');
  const result = document.getElementById('alien-equipment-result');
  const status = document.getElementById('alien-equipment-status');

  if (!speciesSelect || !governmentSelect || !tierSelect || !generateButton || !result || !status) return;

  const TIER_BLUEPRINTS = Object.freeze({
    1: Object.freeze([
      Object.freeze({id:'survey-contact',name:'Survey Contact Set',role:'Initial survey / contact',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Native-environment survival pack — {environment}; calibrated for {gravity}.',
        'Body-plan fitted load harness — {bodyPlan}.',
        'Local communication and translation slate.',
        'Basic field survey instrument keyed to {specialty}.'
      ])}),
      Object.freeze({id:'technical-contact',name:'Technical Contact Set',role:'Inspection / maintenance',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Native-environment maintenance pack — {environment}.',
        'Body-plan fitted tool harness — {bodyPlan}.',
        'Hardened diagnostic reader for {techBand} systems.',
        'Field tool package specialized for {specialty}.'
      ])}),
      Object.freeze({id:'authority-contact',name:'Authority Contact Set',role:'Official movement / inspection',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} authority credential package ({government}).',
        'Native-environment survival pack — {environment}.',
        'Body-plan fitted protective field layer — {bodyPlan}.',
        'Secure local communications unit.'
      ])})
    ]),
    2: Object.freeze([
      Object.freeze({id:'field-survey',name:'Field Survey Set',role:'Routine planetary survey',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Extended native-environment survival pack — {environment}; {gravity}.',
        'Body-plan fitted load harness — {bodyPlan}.',
        'Secure field communications unit.',
        'Portable multispectrum survey package.',
        '{specialty} sampling and analysis kit.'
      ])}),
      Object.freeze({id:'field-engineering',name:'Field Engineering Set',role:'Repair / infrastructure support',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted engineering harness — {bodyPlan}.',
        'Hardened {techBand} diagnostic reader.',
        'Portable power and interface package.',
        '{specialty} repair tools.',
        'Emergency environmental reserve for {environment}.'
      ])}),
      Object.freeze({id:'field-security',name:'Field Security Set',role:'Escort / site security',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} authority credential package ({government}).',
        'Body-plan fitted protective field layer — {bodyPlan}.',
        'Secure field communications unit.',
        'General defensive equipment package.',
        'Emergency medical and extraction kit.'
      ])})
    ]),
    3: Object.freeze([
      Object.freeze({id:'specialist-recon',name:'Specialist Reconnaissance Set',role:'Reconnaissance / remote sensing',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Extended survival and exposure system — {environment}; {gravity}.',
        'Body-plan fitted expedition harness — {bodyPlan}.',
        'Remote sensor probe package.',
        'Portable mapping and navigation suite.',
        '{specialty} specialist instrument.',
        'Secure field communications unit.'
      ])}),
      Object.freeze({id:'specialist-service',name:'Specialist Service Set',role:'Complex repair / scientific service',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted engineering harness — {bodyPlan}.',
        'Hardened {techBand} systems diagnostic suite.',
        'Portable fabrication and repair package.',
        '{specialty} specialist tools.',
        'Environmental reserve for {environment}.',
        'Secure technical data slate.'
      ])}),
      Object.freeze({id:'specialist-response',name:'Specialist Response Set',role:'Protected response / boarding support',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} authority credential package ({government}).',
        'Body-plan fitted protective field layer — {bodyPlan}.',
        'General defensive equipment package.',
        'Tactical sensor and marking suite.',
        'Emergency medical and extraction kit.',
        'Secure command communications unit.'
      ])})
    ]),
    4: Object.freeze([
      Object.freeze({id:'expedition-survey',name:'Expedition Survey Set',role:'Extended independent survey',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Extended-duration environmental system — {environment}; {gravity}.',
        'Body-plan fitted expedition harness — {bodyPlan}.',
        'Remote probe and relay package.',
        'Portable multispectrum survey suite.',
        '{specialty} analysis instrument.',
        'Field power and recharging package.',
        'Secure navigation and communications slate.'
      ])}),
      Object.freeze({id:'expedition-engineering',name:'Expedition Engineering Set',role:'Independent technical operation',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted engineering harness — {bodyPlan}.',
        'Hardened {techBand} diagnostic suite.',
        'Portable fabrication package.',
        'Field power and conversion package.',
        '{specialty} specialist tool set.',
        'Environmental reserve for {environment}.',
        'Secure technical archive slate.'
      ])}),
      Object.freeze({id:'expedition-security',name:'Expedition Security Set',role:'Protected expedition / patrol',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} authority credential package ({government}).',
        'Body-plan fitted protective expedition layer — {bodyPlan}.',
        'General defensive equipment package.',
        'Tactical sensor and remote observation unit.',
        'Emergency medical and extraction kit.',
        'Secure command communications unit.',
        'Extended environmental reserve for {environment}.'
      ])})
    ]),
    5: Object.freeze([
      Object.freeze({id:'advanced-recon',name:'Advanced Reconnaissance Set',role:'Deep reconnaissance / intelligence',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Deep-field environmental system — {environment}; {gravity}.',
        'Body-plan fitted mission harness — {bodyPlan}.',
        'Autonomous probe and relay package.',
        'Advanced multispectrum survey suite.',
        '{specialty} analysis instrument.',
        'Low-signature communications and navigation package.',
        'Portable field power unit.',
        'Doctrine reference: {loadout}.'
      ])}),
      Object.freeze({id:'advanced-technical',name:'Advanced Technical Set',role:'Field fabrication / systems recovery',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted technical harness — {bodyPlan}.',
        'Advanced {techBand} diagnostic suite.',
        'Portable fabrication and materials package.',
        'Power conversion and interface unit.',
        '{specialty} specialist tool set.',
        'Remote inspection drone.',
        'Extended environmental reserve for {environment}.',
        'Secure technical archive slate.'
      ])}),
      Object.freeze({id:'advanced-response',name:'Advanced Response Set',role:'Military / emergency response',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} command credential package ({government}).',
        'Body-plan fitted protective mission layer — {bodyPlan}.',
        'Advanced defensive equipment package.',
        'Tactical sensor and targeting suite.',
        'Remote support drone.',
        'Emergency medical and extraction package.',
        'Secure command communications unit.',
        'Doctrine reference: {loadout}.'
      ])})
    ]),
    6: Object.freeze([
      Object.freeze({id:'command-survey',name:'Command Survey Set',role:'Survey team command',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Command-grade environmental system — {environment}; {gravity}.',
        'Body-plan fitted command harness — {bodyPlan}.',
        'Autonomous probe and relay package.',
        'Advanced multispectrum survey and mapping suite.',
        '{specialty} command analysis instrument.',
        'Encrypted command communications package.',
        'Portable field power and fabrication unit.',
        '{polity} mission authority package.',
        'Doctrine reference: {loadout}.'
      ])}),
      Object.freeze({id:'command-engineering',name:'Command Engineering Set',role:'Technical team command',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted command engineering harness — {bodyPlan}.',
        'Command-grade {techBand} diagnostic suite.',
        'Portable fabrication and materials package.',
        'Power conversion and interface unit.',
        '{specialty} command tool set.',
        'Remote inspection and repair drone.',
        'Extended environmental reserve for {environment}.',
        'Encrypted technical archive and communications slate.',
        '{polity} mission authority package.'
      ])}),
      Object.freeze({id:'command-response',name:'Command Response Set',role:'Protected team command',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} command credential package ({government}).',
        'Body-plan fitted command protective layer — {bodyPlan}.',
        'Advanced defensive equipment package.',
        'Tactical sensor and coordination suite.',
        'Remote support drone.',
        'Emergency medical and extraction package.',
        'Encrypted command communications unit.',
        'Extended environmental reserve for {environment}.',
        'Doctrine reference: {loadout}.'
      ])})
    ]),
    7: Object.freeze([
      Object.freeze({id:'strategic-recon',name:'Strategic Reconnaissance Set',role:'Long-range strategic reconnaissance',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Strategic-grade environmental system — {environment}; {gravity}.',
        'Body-plan fitted strategic mission harness — {bodyPlan}.',
        'Autonomous probe, relay, and sensor package.',
        'Deep-range multispectrum survey suite.',
        '{specialty} strategic analysis instrument.',
        'Low-signature encrypted communications package.',
        'Portable field power and fabrication unit.',
        'Transit-reference interface: {transit}.',
        '{polity} strategic authority package.',
        'Doctrine reference: {loadout}.'
      ])}),
      Object.freeze({id:'strategic-technical',name:'Strategic Technical Set',role:'Critical systems intervention',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted strategic engineering harness — {bodyPlan}.',
        'Strategic {techBand} diagnostic and systems suite.',
        'Portable fabrication and materials package.',
        'Power conversion and interface unit.',
        '{specialty} strategic tool set.',
        'Autonomous inspection and repair drone.',
        'Strategic environmental reserve for {environment}.',
        'Encrypted technical archive and communications slate.',
        'Transit-reference interface: {transit}.',
        '{polity} strategic authority package.'
      ])}),
      Object.freeze({id:'strategic-response',name:'Strategic Response Set',role:'High-readiness protected operation',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} strategic credential package ({government}).',
        'Body-plan fitted strategic protective layer — {bodyPlan}.',
        'High-readiness defensive equipment package.',
        'Tactical sensor, coordination, and remote observation suite.',
        'Autonomous support drone.',
        'Advanced medical and extraction package.',
        'Low-signature encrypted command communications unit.',
        'Strategic environmental reserve for {environment}.',
        'Transit-reference interface: {transit}.',
        'Doctrine reference: {loadout}.'
      ])})
    ]),
    8: Object.freeze([
      Object.freeze({id:'elite-recon',name:'Elite Reconnaissance Set',role:'Sensitive deep-field reconnaissance',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Elite environmental and exposure system — {environment}; {gravity}.',
        'Body-plan fitted elite mission harness — {bodyPlan}.',
        'Autonomous probe, relay, and sensor network package.',
        'Deep-range multispectrum survey and analysis suite.',
        '{specialty} elite analysis instrument.',
        'Low-signature encrypted communications and navigation package.',
        'Portable fabrication and field-power unit.',
        'Transit-reference interface: {transit}.',
        '{polity} sensitive-mission authority package.',
        'Doctrine support package: {loadout}.',
        'Hardened mission archive.'
      ])}),
      Object.freeze({id:'elite-technical',name:'Elite Technical Set',role:'Advanced recovery / fabrication',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted elite engineering harness — {bodyPlan}.',
        'Elite {techBand} diagnostic and systems suite.',
        'Advanced portable fabrication and materials package.',
        'Adaptive power conversion and interface unit.',
        '{specialty} elite tool set.',
        'Autonomous inspection and repair drone package.',
        'Elite environmental reserve for {environment}.',
        'Encrypted technical archive and communications slate.',
        'Transit-reference interface: {transit}.',
        '{polity} sensitive-mission authority package.',
        'Doctrine support package: {loadout}.'
      ])}),
      Object.freeze({id:'elite-response',name:'Elite Response Set',role:'Sensitive military / security operation',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} sensitive-mission credential package ({government}).',
        'Body-plan fitted elite protective system — {bodyPlan}.',
        'Elite defensive equipment package.',
        'Advanced tactical sensor and coordination suite.',
        'Autonomous support drone package.',
        'Advanced medical and extraction package.',
        'Low-signature encrypted command communications unit.',
        'Elite environmental reserve for {environment}.',
        'Transit-reference interface: {transit}.',
        'Doctrine support package: {loadout}.',
        'Hardened mission archive.'
      ])})
    ]),
    9: Object.freeze([
      Object.freeze({id:'apex-recon',name:'Apex Reconnaissance Set',role:'Polity-critical reconnaissance',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Apex environmental and exposure system — {environment}; {gravity}.',
        'Body-plan fitted apex mission harness — {bodyPlan}.',
        'Autonomous distributed probe and relay package.',
        'Polity-grade multispectrum survey and analysis suite.',
        '{specialty} apex analysis instrument.',
        'Low-signature encrypted communications and navigation package.',
        'Advanced field fabrication and power unit.',
        'Transit-reference interface: {transit}.',
        '{polity} restricted strategic authority package.',
        'Doctrine support package: {loadout}.',
        'Hardened intelligence archive.',
        'Emergency extraction and casualty package.'
      ])}),
      Object.freeze({id:'apex-technical',name:'Apex Technical Set',role:'Polity-critical technical intervention',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted apex engineering harness — {bodyPlan}.',
        'Apex {techBand} diagnostic and systems suite.',
        'Advanced field fabrication and materials package.',
        'Adaptive power conversion and interface unit.',
        '{specialty} apex tool set.',
        'Autonomous inspection, repair, and relay drone package.',
        'Apex environmental reserve for {environment}.',
        'Encrypted technical archive and communications slate.',
        'Transit-reference interface: {transit}.',
        '{polity} restricted strategic authority package.',
        'Doctrine support package: {loadout}.',
        'Emergency extraction and casualty package.'
      ])}),
      Object.freeze({id:'apex-response',name:'Apex Response Set',role:'Polity-critical protected operation',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} restricted strategic credential package ({government}).',
        'Body-plan fitted apex protective system — {bodyPlan}.',
        'Apex defensive equipment package.',
        'Polity-grade tactical sensor and coordination suite.',
        'Autonomous support and relay drone package.',
        'Advanced medical, casualty, and extraction package.',
        'Low-signature encrypted command communications unit.',
        'Apex environmental reserve for {environment}.',
        'Transit-reference interface: {transit}.',
        'Doctrine support package: {loadout}.',
        'Hardened intelligence archive.',
        'Advanced field power and fabrication unit.'
      ])})
    ]),
    10: Object.freeze([
      Object.freeze({id:'sovereign-recon',name:'Sovereign Reconnaissance Set',role:'Highest-authority strategic reconnaissance',specialtyIndex:0,loadoutIndex:0,items:Object.freeze([
        'Sovereign-grade environmental and exposure system — {environment}; {gravity}.',
        'Body-plan fitted sovereign mission harness — {bodyPlan}.',
        'Autonomous distributed probe, relay, and sensor network package.',
        'Highest-grade multispectrum survey, mapping, and analysis suite.',
        '{specialty} sovereign analysis instrument.',
        'Low-signature encrypted command communications and navigation package.',
        'Advanced field fabrication, materials, and power unit.',
        'Transit-reference interface: {transit}.',
        '{polity} highest-authority strategic credential package ({government}).',
        'Doctrine support package: {loadout}.',
        'Hardened intelligence and mission archive.',
        'Advanced medical, casualty, and extraction package.',
        'Redundant emergency survival reserve.'
      ])}),
      Object.freeze({id:'sovereign-technical',name:'Sovereign Technical Set',role:'Highest-authority technical intervention',specialtyIndex:1,loadoutIndex:1,items:Object.freeze([
        'Body-plan fitted sovereign engineering harness — {bodyPlan}.',
        'Sovereign {techBand} diagnostic and systems suite.',
        'Advanced field fabrication and materials package.',
        'Adaptive power conversion, interface, and storage unit.',
        '{specialty} sovereign tool set.',
        'Autonomous inspection, repair, and relay drone network.',
        'Sovereign environmental reserve for {environment}.',
        'Encrypted technical archive and command communications slate.',
        'Transit-reference interface: {transit}.',
        '{polity} highest-authority strategic credential package ({government}).',
        'Doctrine support package: {loadout}.',
        'Advanced medical, casualty, and extraction package.',
        'Redundant emergency survival reserve.'
      ])}),
      Object.freeze({id:'sovereign-response',name:'Sovereign Response Set',role:'Highest-authority protected operation',specialtyIndex:2,loadoutIndex:2,items:Object.freeze([
        '{polity} highest-authority strategic credential package ({government}).',
        'Body-plan fitted sovereign protective system — {bodyPlan}.',
        'Sovereign defensive equipment package.',
        'Highest-grade tactical sensor, coordination, and remote observation suite.',
        'Autonomous support, relay, and inspection drone network.',
        'Advanced medical, casualty, and extraction package.',
        'Low-signature encrypted command communications and navigation unit.',
        'Sovereign environmental reserve for {environment}.',
        'Transit-reference interface: {transit}.',
        'Doctrine support package: {loadout}.',
        'Hardened intelligence and mission archive.',
        'Advanced field fabrication, materials, and power unit.',
        'Redundant emergency survival reserve.'
      ])})
    ])
  });

  const tierDescriptions = Object.freeze({
    1:'Contact-scale personal kit',2:'Routine field kit',3:'Specialist field kit',4:'Extended expedition kit',5:'Advanced operational kit',6:'Command-grade team kit',7:'Strategic mission kit',8:'Elite sensitive-mission kit',9:'Polity-critical apex kit',10:'Highest-authority sovereign kit'
  });

  let sector = null;
  let alienSpecies = [];

  function makeOption(value,label){const option=document.createElement('option');option.value=value;option.textContent=label;return option;}
  function replaceTokens(text,context){return text.replace(/\{(\w+)\}/g,(_,key)=>context[key]??`{${key}}`);}
  function findPolities(speciesId){return sector.polities.filter((polity)=>Array.isArray(polity.speciesIds)&&polity.speciesIds.includes(speciesId));}
  function findFleet(polityId){return sector.fleetCommands.find((fleet)=>fleet.polityId===polityId)||null;}
  function findOrganizations(polityId){return sector.organizations.filter((organization)=>organization.polityId===polityId);}

  function syncGovernmentOptions(){
    governmentSelect.replaceChildren();
    const species=alienSpecies.find((entry)=>entry.speciesId===speciesSelect.value);
    if(!species){governmentSelect.append(makeOption('','No polity available'));governmentSelect.disabled=true;return;}
    const polities=findPolities(species.speciesId);
    if(!polities.length){governmentSelect.append(makeOption('','Government not recorded'));governmentSelect.disabled=true;return;}
    governmentSelect.disabled=false;
    polities.forEach((polity)=>governmentSelect.append(makeOption(polity.polityId,`${polity.name} · ${polity.government}`)));
  }

  function field(label,value,wide=false){
    const section=document.createElement('section');section.className=`equipment-field${wide?' wide':''}`;
    const heading=document.createElement('span');heading.textContent=label;
    const paragraph=document.createElement('p');paragraph.textContent=value;
    section.append(heading,paragraph);return section;
  }

  function listField(label,values){
    const section=document.createElement('section');section.className='equipment-field wide';
    const heading=document.createElement('span');heading.textContent=label;
    const list=document.createElement('ul');
    values.forEach((value)=>{const item=document.createElement('li');item.textContent=value;list.append(item);});
    section.append(heading,list);return section;
  }

  function renderSet(){
    const species=alienSpecies.find((entry)=>entry.speciesId===speciesSelect.value);
    const polity=sector.polities.find((entry)=>entry.polityId===governmentSelect.value);
    const tier=Number(tierSelect.value),variants=TIER_BLUEPRINTS[tier];
    if(!species||!polity||!variants?.length){status.textContent='Unable to resolve a fixed equipment set from the selected authority records.';result.replaceChildren();return;}

    const variant=variants[Math.floor(Math.random()*variants.length)];
    const fleet=findFleet(polity.polityId),organizations=findOrganizations(polity.polityId);
    const specialties=Array.isArray(species.technology?.specialties)&&species.technology.specialties.length?species.technology.specialties:['general systems'];
    const specialty=specialties[variant.specialtyIndex%specialties.length];
    const loadouts=Array.isArray(fleet?.loadoutFamilies)&&fleet.loadoutFamilies.length?fleet.loadoutFamilies:['general support assets'];
    const loadout=loadouts[variant.loadoutIndex%loadouts.length];
    const context={environment:species.biology?.nativeEnvironment||'recorded native environment',gravity:species.biology?.nativeGravity||'recorded native gravity',bodyPlan:species.biology?.bodyPlan||'recorded body plan',specialty,techBand:species.technology?.principalBand||'recorded technology band',transit:species.technology?.transit||'recorded transit system',polity:polity.name,government:polity.government,loadout};
    const items=variant.items.map((item)=>replaceTokens(item,context));

    const article=document.createElement('article');article.className='equipment-detail';
    const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=`Fixed Helios Vale set · Tier ${tier} · ${variant.role}`;
    const title=document.createElement('h2');title.textContent=`${species.name} — ${variant.name}`;
    const meta=document.createElement('div');meta.className='equipment-meta';
    [`Species: ${species.name}`,`Polity: ${polity.name}`,`Government: ${polity.government}`,`Technology: ${species.technology?.principalBand||'unrecorded'}`,`Tier: ${tier}`].forEach((text)=>{const span=document.createElement('span');span.textContent=text;meta.append(span);});
    const grid=document.createElement('div');grid.className='equipment-detail-grid';
    grid.append(
      field('Tier Meaning',tierDescriptions[tier]),
      field('Diplomatic Posture',`${species.dispositionArchetype} · ${species.sectorStance}`),
      field('Biological Fit',`${species.biology?.bodyPlan}; ${species.biology?.nativeEnvironment}; ${species.biology?.nativeGravity}`,true),
      field('Technology Context',`${species.technology?.principalBand}: ${species.technology?.transit}; ${species.technology?.energy}; ${species.technology?.inertialControl}. Specialties: ${specialties.join(', ')}.`,true),
      field('Government / Strategic Context',`${polity.government}; ${polity.empireScale}. Objectives: ${(polity.strategicObjectives||[]).join('; ')}.`,true),
      field('Fleet Doctrine Link',fleet?`${fleet.name}: ${fleet.doctrine}. Loadout families: ${loadouts.join(', ')}.`:'No fleet command is recorded for this polity.',true),
      listField('Fixed Equipment Set',items),
      field('Associated Institutions',organizations.length?organizations.map((organization)=>`${organization.name} (${organization.organizationType})`).join('; '):'No associated organizations recorded.',true),
      field('Provenance / Canon Safeguard','Species, biology, polity, government, technology, strategic objectives, fleet doctrine, and fleet loadout families are read directly from the immutable Helios Vale fixed-example authority. The equipment-set compositions are authored derived doctrine for this generator; they are not claims that these exact personal kits already existed elsewhere in canon. Rerolling selects another complete fixed set at the same tier and never assembles random individual items.',true)
    );
    article.append(eyebrow,title,meta,grid);result.replaceChildren(article);
    status.textContent=`${variants.length} authored fixed sets are available for Tier ${tier}; showing one complete set.`;
  }

  function initialize(){
    if(!sectorAuthority?.sector){status.textContent='Helios Vale sector authority did not load. The equipment generator is unavailable rather than inventing replacement race or government data.';generateButton.disabled=true;return;}
    sector=sectorAuthority.sector;
    alienSpecies=sector.species.filter((species)=>species.status==='extant'&&species.speciesId!=='species-01');
    speciesSelect.replaceChildren();
    alienSpecies.forEach((species)=>speciesSelect.append(makeOption(species.speciesId,species.name)));
    tierSelect.replaceChildren();
    for(let tier=1;tier<=10;tier+=1)tierSelect.append(makeOption(String(tier),`Tier ${tier} — ${tierDescriptions[tier]}`));
    speciesSelect.addEventListener('change',()=>{syncGovernmentOptions();renderSet();});
    governmentSelect.addEventListener('change',renderSet);
    tierSelect.addEventListener('change',renderSet);
    generateButton.addEventListener('click',renderSet);
    syncGovernmentOptions();
    status.textContent=`${alienSpecies.length} documented alien species loaded from ${sector.name}; humanity is excluded from the alien selector.`;
    renderSet();
  }

  initialize();
})();
