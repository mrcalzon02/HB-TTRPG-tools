(() => {
  'use strict';
  const $=id=>document.getElementById(id);

  function section(id,eyebrow,title,anchorId,position='after'){
    let container=$(id);if(container)return container;
    const anchor=$(anchorId)?.closest('.bli-section');if(!anchor)return null;
    const wrapper=document.createElement('section');wrapper.className='bli-section exo-ftl-mechanism-section';
    const head=document.createElement('div');head.className='bli-section-head';
    const small=document.createElement('p');small.className='bli-eyebrow';small.textContent=eyebrow;
    const heading=document.createElement('h2');heading.textContent=title;
    container=document.createElement('div');container.id=id;container.className='exo-ftl-grid';
    head.append(small,heading);wrapper.append(head,container);
    position==='before'?anchor.before(wrapper):anchor.after(wrapper);
    return container;
  }

  function listSection(id,eyebrow,title,anchorId){
    let wrapper=$(id);if(wrapper)return wrapper;
    const anchor=$(anchorId)?.closest('.bli-section');if(!anchor)return null;
    wrapper=document.createElement('section');wrapper.id=id;wrapper.className='bli-section exo-ftl-mechanism-section';
    const head=document.createElement('div');head.className='bli-section-head';
    const small=document.createElement('p');small.className='bli-eyebrow';small.textContent=eyebrow;
    const heading=document.createElement('h2');heading.textContent=title;
    const grid=document.createElement('div');grid.className='exo-ftl-list-grid';grid.dataset.mechanismGrid='true';
    head.append(small,heading);wrapper.append(head,grid);anchor.after(wrapper);return wrapper;
  }

  function card(label,title,text,state=''){
    const article=document.createElement('article');article.className='exo-ftl-card';if(state)article.dataset.mechanismState=state;
    const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    small.textContent=label;heading.textContent=title;paragraph.textContent=text;article.append(small,heading,paragraph);return article;
  }
  function renderCards(container,rows){if(container)container.replaceChildren(...rows.map(row=>card(...row)));}
  function listArticle(title,items){
    const article=document.createElement('article'),heading=document.createElement('h3'),list=document.createElement('ul');
    heading.textContent=title;for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}article.append(heading,list);return article;
  }
  function renderLists(wrapper,groups){
    const grid=wrapper?.querySelector('[data-mechanism-grid="true"]');if(!grid)return;
    grid.replaceChildren(...groups.map(group=>listArticle(group[0],group[1])));
  }

  function addBadge(text){
    const badges=$('exo-ftl-badges');if(!badges)return;
    badges.querySelector('[data-mechanism-badge="true"]')?.remove();
    const span=document.createElement('span');span.dataset.mechanismBadge='true';span.textContent=text;badges.append(span);
  }

  function renderChain(mechanism){
    const container=section('exo-ftl-device-chain','Prime mover and device train','Follow input energy through the actual machine until it produces the physical transit effect.','exo-ftl-mechanism-motivation');
    const rows=mechanism.machineChain.map((item,index)=>[`Device stage ${index+1}`,item.stage,item.function]);
    renderCards(container,rows);
  }

  function renderBenchmarks(rating){
    const mechanism=rating.mechanism;
    const current=section('exo-ftl-mechanism-benchmarks','Current mechanical benchmarks','Measurements that improve as the original device becomes smaller, more efficient, more precise, and more reliable.','exo-ftl-mechanism-control');
    renderCards(current,mechanism.benchmarks.map(axis=>[
      axis.direction==='higher'?'Increasing capability':'Decreasing burden or error',
      axis.label,
      `${axis.valueText}. ${axis.meaning}`
    ]));

    let hierarchy=$('exo-ftl-mechanism-progression');
    if(!hierarchy){
      const anchor=current?.closest('.bli-section');if(!anchor)return;
      const wrapper=document.createElement('section');wrapper.className='bli-section exo-ftl-mechanism-section';
      const head=document.createElement('div');head.className='bli-section-head';
      const small=document.createElement('p');small.className='bli-eyebrow';small.textContent='Benchmark refinement across the path';
      const heading=document.createElement('h2');heading.textContent='The underlying device performs the same action at every level; engineering refinement changes how well it performs that action.';
      hierarchy=document.createElement('div');hierarchy.id='exo-ftl-mechanism-progression';hierarchy.className='exo-ftl-hierarchy';
      head.append(small,heading);wrapper.append(head,hierarchy);anchor.after(wrapper);
    }
    hierarchy.replaceChildren();
    for(const level of mechanism.benchmarkProgression){
      const article=document.createElement('article');article.className='exo-ftl-tier-card';article.dataset.status=level.rank<mechanism.refinement.rank?'mastered precursor':level.rank===mechanism.refinement.rank?'current capability':'future or unavailable';
      const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
      small.textContent=`Path ${level.rank} · ${level.rank===mechanism.refinement.rank?'current mechanism':'engineering benchmark'}`;heading.textContent=level.label;
      paragraph.textContent=level.values.map(item=>`${item.label}: ${item.valueText}`).join(' · ');
      article.append(small,heading,paragraph);hierarchy.append(article);
    }
  }

  function render(rating){
    const m=rating?.mechanism;if(!m)return;
    addBadge(m.doctrineLabel);

    const overview=section('exo-ftl-mechanism-overview','Base engineering method','What the powered device physically does, why a civilization builds it, and what remains unchanged through every refinement.','exo-ftl-path-overview');
    renderCards(overview,[
      ['Engineering doctrine',m.doctrineLabel,m.principle],
      ['Powered physical action','What the device does',m.poweredAction],
      ['Complete functional chain',m.primeMover.name,m.functionalStatement],
      ['Motive input',m.primeMover.currentEnergySystem,`${m.primeMover.input}. Current mission-energy model: ${m.primeMover.currentPowerCycle||'not established'}; peak delivery ${m.primeMover.currentPeakPower||'not established'}.`],
      ['Transduced output',m.primeMover.output,m.primeMover.transduction],
      ['Governing physical limit','What ultimately constrains the method',m.primeMover.governingLimit]
    ]);

    const motivation=listSection('exo-ftl-mechanism-motivation','Technological motivation','Why this civilization pursues this method instead of another transit architecture.','exo-ftl-mechanism-overview');
    renderLists(motivation,[['Path motivators',m.motivators],['Current refinements',m.refinement.currentRefinements],['Signatures and detectability',m.signatures]]);

    renderChain(m);

    const coverage=section('exo-ftl-mechanism-coverage','Ship-wide effect and field coverage','How the mechanism reaches an entire ship, aperture, payload volume, structural load path, or enclosed region of space.','exo-ftl-device-chain');
    renderCards(coverage,[
      ['Coverage type',m.coverage.type.replaceAll('-',' '),m.coverage.method],
      ['Generated controlled extent',m.coverage.extent,`Estimated reference hull ${m.coverage.estimatedHullLengthM.toFixed(1)} m long by ${m.coverage.estimatedHullBeamM.toFixed(1)} m wide; controlled margin ${m.coverage.coverageMarginPercent.toFixed(2)}%.`],
      ['Field or mechanical geometry',m.coverage.geometry,m.coverage.boundary],
      ['Inclusion rule','What travels and what does not',m.coverage.inclusionRule],
      ['Scaling law','Why large ships are harder',m.coverage.scalingConstraint],
      ['Hull integration','How it becomes a whole-vessel system',m.coverage.hullIntegration],
      ['Current apparatus burden',`${m.coverage.apparatusToPayloadRatio.toLocaleString(undefined,{maximumFractionDigits:3})}:1 apparatus-to-payload mass`,`Payload model ${m.coverage.payloadMassText}; controlled volume approximately ${m.coverage.controlledVolumeM3.toLocaleString(undefined,{maximumFractionDigits:1})} m³.`],
      ['Current level coverage',m.refinement.coverage,m.refinement.containment]
    ]);

    const cycle=listSection('exo-ftl-mechanism-cycle','Operational cycle','What must happen before, during, and after the device performs its transit function.','exo-ftl-mechanism-coverage');
    renderLists(cycle,[['Initiation sequence',m.operationalCycle.initiation],['Prime transit operation',m.operationalCycle.transit],['Termination and recovery',m.operationalCycle.termination]]);

    const environment=listSection('exo-ftl-mechanism-environment','Mechanical and environmental envelope','Conditions required to initiate the effect, constraints imposed by the machine, and effects left in the surrounding environment.','exo-ftl-mechanism-cycle');
    renderLists(environment,[['Required environment',m.environment.requirements],['Generated certification conditions',m.environment.generatedConditions],['Mechanical constraints',m.mechanicalConstraints],['Environmental effects',m.environment.effects]]);

    const control=section('exo-ftl-mechanism-control','Prime control variables','The physical quantities the drive controller must hold inside tolerance while the machine is operating.','exo-ftl-mechanism-environment');
    renderCards(control,m.controlVariables.map(variable=>['Controlled quantity',variable.name,`${variable.role} Failure consequence: ${variable.failure}`]));

    renderBenchmarks(rating);
  }

  document.addEventListener('blacklight:exo-ftl-generated',event=>render(event.detail?.rating));
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveFTL?.()));
})();
