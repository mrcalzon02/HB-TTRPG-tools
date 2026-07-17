(() => {
  'use strict';
  const $=id=>document.getElementById(id);

  function makeSection(id,eyebrow,title,anchorId,kind='grid'){
    let container=$(id);if(container)return container;
    const anchor=$(anchorId)?.closest('.bli-section');if(!anchor)return null;
    const section=document.createElement('section');section.className='bli-section exo-ftl-charles-section';
    const head=document.createElement('div');head.className='bli-section-head';
    const small=document.createElement('p');small.className='bli-eyebrow';small.textContent=eyebrow;
    const heading=document.createElement('h2');heading.textContent=title;
    container=document.createElement('div');container.id=id;container.className=kind==='list'?'exo-ftl-list-grid':kind==='equations'?'exo-ftl-charles-equations':'exo-ftl-grid';
    head.append(small,heading);section.append(head,container);anchor.after(section);return container;
  }

  function card(label,title,text,state=''){
    const article=document.createElement('article');article.className='exo-ftl-card exo-ftl-charles-card';if(state)article.dataset.charlesState=state;
    const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    small.textContent=label;heading.textContent=title;paragraph.textContent=text;article.append(small,heading,paragraph);return article;
  }
  function listArticle(title,items){
    const article=document.createElement('article');article.className='exo-ftl-charles-list';
    const heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent=title;
    for(const item of items){const li=document.createElement('li');li.textContent=item;list.append(li);}article.append(heading,list);return article;
  }
  function addBadge(){
    const badges=$('exo-ftl-badges');if(!badges)return;
    badges.querySelector('[data-charles-badge="true"]')?.remove();
    const span=document.createElement('span');span.dataset.charlesBadge='true';span.textContent='Charles commentary · speculative control physics';badges.append(span);
  }

  function renderEquations(c){
    const container=makeSection('exo-ftl-charles-equations','Charles · mathematical control sketch','Equations the machinery appears to obey, what the controller changes, and how each approximation fails.','exo-ftl-mechanism-progression','equations');
    if(!container)return;container.replaceChildren();
    for(const eq of c.equations){
      const article=document.createElement('article');article.className='exo-ftl-charles-equation';
      const top=document.createElement('div');top.className='exo-ftl-charles-equation-head';
      const small=document.createElement('small');small.textContent=`Equation ${eq.index} · ${eq.confidence}`;
      const heading=document.createElement('h3');heading.textContent=eq.name;top.append(small,heading);
      const expression=document.createElement('code');expression.textContent=eq.expression;
      const terms=document.createElement('p');terms.innerHTML=`<strong>Terms.</strong> ${eq.terms}`;
      const interpretation=document.createElement('p');interpretation.innerHTML=`<strong>Charles's reading.</strong> ${eq.interpretation}`;
      const control=document.createElement('p');control.innerHTML=`<strong>What the machine controls.</strong> ${eq.control}`;
      const failure=document.createElement('p');failure.innerHTML=`<strong>When the math stops being decorative.</strong> ${eq.failure}`;
      article.append(top,expression,terms,interpretation,control,failure);container.append(article);
    }
  }

  function render(rating){
    const c=rating?.charlesPhysics;if(!c)return;addBadge();
    const overview=makeSection('exo-ftl-charles-overview','Charles · lower-level technical briefing','A computationally advanced explanation from the intelligence responsible for keeping the mission, the crew, and the world in approximately that order of survival.','exo-ftl-mechanism-progression');
    if(overview)overview.replaceChildren(
      card('Speaker',`${c.speaker} · ${c.role}`,c.standingDisclaimer,'charles'),
      card('Operational explanation','What the machine is doing',c.operationalSummary),
      card('Mathematical frame','What the controller calculates',c.mathematicalFrame),
      card(`Path ${c.levelRank} assessment`,'How refinement changes the same base effect',c.levelAssessment),
      card('Epistemic warning','Model is not mechanism is not truth',`${c.epistemicStatus.measured} ${c.epistemicStatus.modeled} ${c.epistemicStatus.speculative}`,'warning')
    );

    const params=makeSection('exo-ftl-charles-evaluated','Charles · evaluated terms','Generated values inserted into the lower-level model for this particular ship, route, and technology level.','exo-ftl-charles-overview');
    const p=c.evaluatedParameters;
    if(params)params.replaceChildren(
      card('Route-equivalent solution','External transit rating',`${p.routeEquivalentText}; payload crossing ${p.payloadTransitText}; complete mission ${p.missionText}.`),
      card('Controlled geometry',p.fieldVolumeText,`Current apparatus burden ${p.apparatusRatioText}; route window ${p.routeWindowText}.`),
      card('Energy density',p.missionEnergyDensityText,'Mission energy divided by the modeled controlled volume. This is a comparison term, not proof that every cubic meter stores energy uniformly.'),
      card('Dimensional state',`${p.activeDimensions||0} active dimensions`,p.activeDimensions?`Q-index ${p.qPhaseIndex}; coherence ${p.coherenceWindowText}.`:'This path does not require the same active-dimensional accounting in the generated model.'),
      card('Relativistic term',`γ = ${p.gammaText}`,'For non-inertial superluminal architectures this is deliberately marked inapplicable rather than abused as a decorative infinity.'),
      card('Certification probability',p.successText,`Gravity-gradient index ${p.gravityGradientIndex}; plane tolerance ${p.planeToleranceText}.`)
    );

    renderEquations(c);

    const limits=makeSection('exo-ftl-charles-limits','Charles · boundary conditions and ignorance ledger','What must remain true, what other models might explain the same machine, and what even Charles does not claim to know.','exo-ftl-charles-equations','list');
    if(limits)limits.replaceChildren(
      listArticle('Required mathematical and mechanical boundary conditions',c.boundaryConditions),
      listArticle('Unresolved physics',c.unknowns),
      listArticle('Charles remarks',c.remarks)
    );

    const alternates=makeSection('exo-ftl-charles-alternates','Charles · alternate interpretations','Other mathematical descriptions capable of resembling the observed drive, along with the reason Charles has not promoted them to fact.','exo-ftl-charles-limits');
    if(alternates)alternates.replaceChildren(...c.alternateModels.map(model=>card(model.name,model.premise,`Implication: ${model.implication} Charles's objection: ${model.objection}`)));
  }

  document.addEventListener('blacklight:exo-ftl-generated',event=>render(event.detail?.rating));
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveFTL?.()));
})();
