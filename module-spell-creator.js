(() => {
  const ALIGNMENTS=['Any','Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];
  const SCHOOLS=['Auto','Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
  const NONE_OPTION='<option value="none">None / N/A</option>';
  const css=`.module-spell-creator{border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}.msc-controls{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px}.msc-controls label{font-size:.78rem;color:var(--muted)}.msc-controls select,.msc-controls input{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px}.msc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.msc-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.msc-card{border:1px solid var(--line);border-radius:14px;padding:18px;background:rgba(0,0,0,.16);margin-top:12px}.msc-card h3{color:var(--accent);margin:0 0 10px;font-size:1.35rem}.msc-tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:3px 7px;margin:0 5px 5px 0;color:var(--muted);font-size:.75rem}.msc-card h4{color:var(--accent);margin:18px 0 6px}.msc-card p{color:var(--muted);line-height:1.68;margin:7px 0}.msc-status{color:var(--muted);font-size:.82rem}.msc-audit{white-space:pre-wrap;max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px;background:#080a0f;color:var(--muted);font-size:.74rem}.msc-rules-note{border-left:3px solid var(--accent);padding:8px 10px;color:var(--muted);background:rgba(200,138,53,.08);font-size:.8rem}@media(max-width:980px){.msc-controls{grid-template-columns:1fr 1fr}}`;

  let results=[];
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=obj=>NONE_OPTION+Object.entries(obj).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');
  const pool=(a,b)=>{const out=[];for(const x of a)for(const y of b)out.push(`${x} ${y}`);return out};
  function styleOnce(){if(document.getElementById('module-spell-creator-style'))return;const s=document.createElement('style');s.id='module-spell-creator-style';s.textContent=css;document.head.appendChild(s)}

  const CONSEQUENCES=pool([
    'Every nearby chair develops a personal grievance and begins facing away from the caster,',
    'A spectral municipal inspector appears with a clipboard and several deeply concerning questions,',
    'The nearest doorway becomes convinced it is a window and refuses to cooperate,',
    'All written labels within thirty feet rearrange themselves into passive-aggressive criticism,',
    'A perfectly ordinary goose is appointed temporary arcane supervisor,',
    'The target’s shadow files a formal complaint and begins representing itself,',
    'Every spoon in the area points accusingly toward the least responsible creature,',
    'A choir of invisible accountants begins calculating emotional damages,',
    'The floor briefly remembers being a ceiling and attempts to reverse local expectations,',
    'One random bystander receives a ceremonial sash reading ASSISTANT TO THE CONSEQUENCE,'
  ],[
    'remaining until someone offers a sincere apology.',
    'and the apparition refuses to leave without three signatures.',
    'for exactly eleven minutes and one deeply awkward second.',
    'while announcing each new objection in a tiny brass voice.',
    'until the spell’s creator is mentioned by full legal name.',
    'and the disagreement becomes binding in at least two planes.',
    'without causing damage but with devastating social consequences.',
    'while all involved are assigned case numbers.',
    'until a competent wizard arrives and sighs loudly.',
    'after which the entire event is entered into an invisible permanent record.'
  ]);

  const CREATIONS=pool([
    'The spell creates a waist-high crystal kiosk staffed by',
    'The working extrudes a temporary brass annex containing',
    'A velvet curtain parts to reveal',
    'The air folds open and deposits',
    'A tiny auxiliary universe is manufactured solely to house',
    'The caster accidentally commissions',
    'Seven nested circles assemble themselves into',
    'A puff of perfumed smoke condenses into',
    'The target is issued',
    'Reality reluctantly produces'
  ],[
    'a judgmental homunculus with impeccable penmanship.',
    'three emergency levers, all labeled differently and none correctly.',
    'an enchanted filing cabinet full of forms that predate language.',
    'a committee of miniature robed figures who disagree about everything.',
    'a ceremonial duck wearing the insignia of an extinct empire.',
    'an ornate machine whose only function is to ring a bell when observed.',
    'a backup target that is visibly less qualified than the original.',
    'a portable weather system limited to one person’s immediate disappointment.',
    'a crown of rotating disclaimers written in fireproof script.',
    'a temporary monument commemorating an event that has not yet occurred.'
  ]);

  const OUTLANDISH=pool([
    'The primary effect arrives as a procession of luminous diagrams, legal footnotes, theatrical smoke, and unnecessary fanfare,',
    'The magic performs its task through a chain of increasingly implausible intermediaries,',
    'Rather than acting directly, the spell petitions local reality for provisional authority,',
    'The effect begins sensibly before escalating into a baroque catastrophe of procedure,',
    'The spell constructs an entire magical institution around a problem that required one gesture,',
    'The caster’s intention is translated through several symbolic animals and one confused bureaucrat,',
    'The working temporarily appoints itself governor of the immediate area,',
    'The magic divides into primary, secondary, tertiary, emergency, ceremonial, and decorative versions,',
    'The spell solves the target problem and then continues solving increasingly unrelated problems,',
    'The effect becomes self-aware just long enough to object to its own design,'
  ],[
    'before finally delivering the intended result with insulting precision.',
    'each of which demands recognition before passing the effect onward.',
    'and receives approval from an authority that no scholar recognizes.',
    'while spectators are assigned mandatory explanatory pamphlets.',
    'then dissolves the institution without settling its outstanding invoices.',
    'causing the final result to emerge wearing ceremonial ribbons.',
    'and immediately publishes seventeen regulations governing movement and posture.',
    'with the decorative version somehow becoming the most dangerous.',
    'until somebody dispels it or asks it a sufficiently difficult question.',
    'then leaves behind a dissenting opinion signed by the laws of nature.'
  ]);

  const AFTERMATH=pool([
    'For the next hour, witnesses remember the event as',
    'After the visible magic fades, the area retains',
    'The final discharge leaves behind',
    'Local animals react by treating the site as',
    'Divination performed afterward reports',
    'The caster’s reputation is temporarily affected because everyone describes the spell as',
    'A faint residual enchantment causes future visitors to perceive',
    'The site acquires an unofficial name referring to',
    'One minor object in the area becomes permanently convinced that it witnessed',
    'The spell concludes by presenting all involved with'
  ],[
    'a civic ceremony that somehow went catastrophically wrong.',
    'the smell of warm parchment, lightning, and misplaced confidence.',
    'a glowing plaque explaining the least relevant part of the process.',
    'a protected historical nesting ground.',
    'an event of major significance but refuses to say why.',
    'both technically brilliant and emotionally irresponsible.',
    'a tiny parade passing through the walls.',
    'the regrettable incident with the ceremonial machinery.',
    'the founding of a new age.',
    'a receipt, a warning, and a small commemorative biscuit.'
  ]);

  const ORIGIN_EXPANSIONS=pool([
    'Its earliest surviving account claims the spell was invented after',
    'According to the least trustworthy manuscript, the formula originated when',
    'Academics insist the spell began as a respectable project, but surviving notes reveal that',
    'The official history omits the embarrassing fact that',
    'Its creator described the work as a minor correction, despite evidence that',
    'The spell entered common circulation only after',
    'A damaged marginal note suggests the original purpose was to prevent',
    'The tradition preserving this spell refuses to discuss the evening when',
    'One rival school claims ownership because',
    'The most complete version was recovered from a locked cabinet containing'
  ],[
    'a senior archmage lost an argument with a coat rack.',
    'three apprentices attempted to automate tea service with planar geometry.',
    'the entire faculty accidentally signed the same infernal waiver.',
    'the prototype promoted a broom to department chair.',
    'the first casting required evacuation of a moderately important kingdom.',
    'a saint, a lich, and a tax assessor independently reached the same conclusion.',
    'a duke demanded a spell that looked more expensive than it was.',
    'the moon was temporarily categorized as movable equipment.',
    'a familiar submitted the only legible research proposal.',
    'seventy-three pages of corrections and one drawing of an angry turnip.'
  ]);

  function randomObject(obj){const keys=Object.keys(obj);return obj[pick(keys)]}
  function selectedOrRandom(obj,id){return id==='none'?randomObject(obj):obj[id]}
  function labelOrNull(obj,id){return id==='none'?null:obj[id]?.label||null}

  function init(){
    const V=window.HBSpellVocabulary;
    const host=document.getElementById('spell-creator-root');
    if(!V||!host||document.getElementById('module-spell-creator-root'))return;
    styleOnce();
    const root=document.createElement('section');root.id='module-spell-creator-root';root.className='module-spell-creator';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">Generator bench</p><h2>Spell Creator</h2><p>Create narrative-first spells with optional modulation. Reader-facing descriptions contain no visible rules package; complete mechanics remain embedded in exported JSON.</p></div><div class="msc-controls"><label>Theme<select id="msc-theme">${options(V.THEMES)}</select></label><label>Level<select id="msc-level">${NONE_OPTION}${Array.from({length:10},(_,i)=>`<option value="${i}">${i?'Level '+i:'Cantrip'}</option>`).join('')}</select></label><label>Alignment<select id="msc-alignment">${NONE_OPTION}${ALIGNMENTS.map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label><label>Class<select id="msc-class">${options(V.CLASSES)}</select></label><label>School<select id="msc-school">${NONE_OPTION}${SCHOOLS.map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label><label>Competence / Complexity<select id="msc-competence">${options(V.COMPETENCE)}</select></label><label>Moral Tone<select id="msc-morality">${options(V.MORALITY)}</select></label><label>Quantity<input id="msc-quantity" type="number" min="1" max="20" value="1"></label></div><div class="msc-actions"><button id="msc-generate" type="button">Generate Spells</button><button id="msc-copy" type="button">Copy Reader Text</button><button id="msc-export" type="button">Export Full JSON</button><button id="msc-audit-toggle" type="button">Show Vocabulary Audit</button></div><p class="msc-rules-note">Rules package: stored behind the scenes in exported JSON and intentionally omitted from the visible spell prose.</p><p id="msc-status" class="msc-status">Ready.</p><pre id="msc-audit" class="msc-audit" hidden></pre><div id="msc-output"></div>`;
    host.appendChild(root);
    root.querySelector('#msc-generate').onclick=()=>generate(root,V);
    root.querySelector('#msc-copy').onclick=()=>copy(root);
    root.querySelector('#msc-export').onclick=()=>exportJson(root);
    root.querySelector('#msc-audit-toggle').onclick=()=>toggleAudit(root,V);
    generate(root,V);
  }

  function makeSpell(V,themeId,levelValue,alignmentValue,classId,schoolValue,competenceId,moralityId){
    const theme=selectedOrRandom(V.THEMES,themeId);
    const casterClass=selectedOrRandom(V.CLASSES,classId);
    const competence=selectedOrRandom(V.COMPETENCE,competenceId);
    const morality=selectedOrRandom(V.MORALITY,moralityId);
    const level=levelValue==='none'?null:Number(levelValue);
    const school=schoolValue==='none'?null:schoolValue==='Auto'?pick(casterClass.schools):schoolValue;
    const alignment=alignmentValue==='none'?null:alignmentValue;
    const titleCore=pick(theme.names);
    const titlePrefix=moralityId==='none'?'':pick(morality.names);
    const titleMethod=competenceId==='none'?'':pick(competence.names);
    const title=[titlePrefix,titleMethod,'of',titleCore].filter(Boolean).join(' ').replace(/^of\s+/,'');

    const origin=`${pick(theme.origins)} ${pick(ORIGIN_EXPANSIONS)} ${classId==='none'?'':pick(casterClass.wording)}`;
    const manifestation=`${pick(theme.visuals)} ${moralityId==='none'?'':pick(morality.flavorsExpanded)} The effect is accompanied by ${pick(['a fanfare audible only to guilty furniture','a ribbon of punctuation marks that argue over comma placement','a procession of tiny lantern-bearing witnesses','a rotating subtitle explaining the obvious','the smell of rain falling on old libraries','a distant bell that rings one beat too late','a spotlight that follows the least dramatic participant','a decorative thundercloud shaped like a disapproving eyebrow'])}.`;
    const mainEffect=`${competenceId==='none'?'The spell acts with unpredictable but thematically appropriate force.':pick(competence.effects)} ${moralityId==='none'?'':pick(morality.purposesExpanded)} ${pick(OUTLANDISH)} What begins as a recognizable ${school||'magical'} working quickly develops secondary ambitions, including the correction of nearby posture, furniture arrangement, emotional tone, and at least one problem nobody had noticed before.`;
    const creation=`${pick(CREATIONS)} It behaves as though this appointment is permanent, demands to be addressed by its full title, and may attempt to continue the spell’s work long after everyone else agrees the matter is settled.`;
    const consequence=`${pick(CONSEQUENCES)} ${pick(CONSEQUENCES)} None of these results are strictly necessary to the spell’s purpose, but the magic treats them as essential safeguards against unspecified future litigation.`;
    const aftermath=`${pick(AFTERMATH)} ${pick(AFTERMATH)} Scholars examining the residue later disagree over whether the spell ended, resigned, was reassigned, or simply left for lunch.`;

    const rules={
      level,
      alignment,
      class:classId==='none'?null:casterClass.label,
      school,
      theme:themeId==='none'?null:theme.label,
      competence:competenceId==='none'?null:competence.label,
      morality:moralityId==='none'?null:morality.label,
      castingTime:pick(V.GLOBAL.castingTimes),
      range:pick(V.GLOBAL.ranges),
      duration:pick(V.GLOBAL.durations),
      components:pick(V.GLOBAL.components),
      target:pick(V.GLOBAL.targets),
      resolution:pick(V.GLOBAL.resolutions),
      higherLevels:level===null?null:pick(V.GLOBAL.higherLevels),
      baseMagnitude:level===null?null:(level===0?'1d6':`${Math.max(1,level+1)}d${level<3?6:level<6?8:10}`)
    };

    return {
      id:`spell-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name:title,
      modulations:{theme:labelOrNull(V.THEMES,themeId),level,alignment,class:labelOrNull(V.CLASSES,classId),school,competence:labelOrNull(V.COMPETENCE,competenceId),morality:labelOrNull(V.MORALITY,moralityId)},
      narrative:{origin,manifestation,mainEffect,creation,consequence,aftermath},
      rules
    };
  }

  function generate(root,V){
    const values={theme:root.querySelector('#msc-theme').value,level:root.querySelector('#msc-level').value,alignment:root.querySelector('#msc-alignment').value,classId:root.querySelector('#msc-class').value,school:root.querySelector('#msc-school').value,competence:root.querySelector('#msc-competence').value,morality:root.querySelector('#msc-morality').value,quantity:Math.max(1,Math.min(20,Number(root.querySelector('#msc-quantity').value)||1))};
    results=Array.from({length:values.quantity},()=>makeSpell(V,values.theme,values.level,values.alignment,values.classId,values.school,values.competence,values.morality));
    render(root);
    root.querySelector('#msc-status').textContent=`Generated ${values.quantity} narrative spell${values.quantity===1?'':'s'}; mechanics remain hidden in the JSON rules package.`;
  }

  function render(root){
    root.querySelector('#msc-output').innerHTML=results.map(spell=>{const tags=Object.values(spell.modulations).filter(value=>value!==null&&value!==undefined&&value!=='').map(value=>`<span class="msc-tag">${esc(value)}</span>`).join('');return `<article class="msc-card"><h3>${esc(spell.name)}</h3><div>${tags}</div><h4>Origin and Dubious Historical Context</h4><p>${esc(spell.narrative.origin)}</p><h4>Manifestation</h4><p>${esc(spell.narrative.manifestation)}</p><h4>What the Spell Actually Does</h4><p>${esc(spell.narrative.mainEffect)}</p><h4>Unnecessary Creation</h4><p>${esc(spell.narrative.creation)}</p><h4>Collateral Consequences</h4><p>${esc(spell.narrative.consequence)}</p><h4>Aftermath and Long-Term Embarrassment</h4><p>${esc(spell.narrative.aftermath)}</p></article>`}).join('');
  }

  function readerText(spell){return `${spell.name}\n\nORIGIN AND DUBIOUS HISTORICAL CONTEXT\n${spell.narrative.origin}\n\nMANIFESTATION\n${spell.narrative.manifestation}\n\nWHAT THE SPELL ACTUALLY DOES\n${spell.narrative.mainEffect}\n\nUNNECESSARY CREATION\n${spell.narrative.creation}\n\nCOLLATERAL CONSEQUENCES\n${spell.narrative.consequence}\n\nAFTERMATH AND LONG-TERM EMBARRASSMENT\n${spell.narrative.aftermath}`}
  async function copy(root){try{await navigator.clipboard.writeText(results.map(readerText).join('\n\n====================\n\n'));root.querySelector('#msc-status').textContent='Reader-facing spell text copied without rules.'}catch(e){root.querySelector('#msc-status').textContent='Clipboard unavailable.'}}
  function exportJson(root){const blob=new Blob([JSON.stringify({schemaVersion:'0.4.0',generator:'module-spell-creator',presentation:'narrative-first',rulesVisibility:'hidden-in-exported-data',spells:results},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='generated-spells-full-records.json';a.click();URL.revokeObjectURL(a.href);root.querySelector('#msc-status').textContent='Full spell records exported with hidden rules package.'}
  function toggleAudit(root,V){const box=root.querySelector('#msc-audit');box.hidden=!box.hidden;if(!box.hidden){const failures=Object.entries(V.counts).filter(([,count])=>count<70);box.textContent=`Vocabulary pools: ${Object.keys(V.counts).length}\nMinimum required per pool: 70\nPools below minimum: ${failures.length}\nNarrative consequence pool: ${CONSEQUENCES.length}\nNarrative creation pool: ${CREATIONS.length}\nOutlandish effect pool: ${OUTLANDISH.length}\nAftermath pool: ${AFTERMATH.length}\nOrigin expansion pool: ${ORIGIN_EXPANSIONS.length}\n\n${Object.entries(V.counts).sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>`${name}: ${count}`).join('\n')}`}}

  window.initStandaloneSpellCreator=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
