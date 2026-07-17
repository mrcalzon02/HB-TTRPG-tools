(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const FTL = globalThis.BlacklightExoFTL;
  const HANDOFF_KEY = 'blacklight-exo-ftl-source-v1';
  const controls = {
    generate:$('exo-ftl-generate'), export:$('exo-ftl-export'), seed:$('exo-ftl-seed'),
    tier:$('exo-ftl-tier'), family:$('exo-ftl-family'), scale:$('exo-ftl-scale'),
    infrastructure:$('exo-ftl-infrastructure'), route:$('exo-ftl-route'),
    doctrine:$('exo-ftl-doctrine'), energy:$('exo-ftl-energy'),
    distance:$('exo-ftl-distance'), distanceUnit:$('exo-ftl-distance-unit')
  };
  if (!FTL || !controls.generate) return;

  const ui = {
    summaryName:$('exo-ftl-summary-name'), summaryTier:$('exo-ftl-summary-tier'),
    summarySpeed:$('exo-ftl-summary-speed'), summaryRisk:$('exo-ftl-summary-risk'),
    source:$('exo-ftl-source'), sourceTitle:$('exo-ftl-source-title'), sourceBody:$('exo-ftl-source-body'),
    sourceReturn:$('exo-ftl-source-return'), name:$('exo-ftl-name'), description:$('exo-ftl-description'),
    visual:$('exo-ftl-visual'), badges:$('exo-ftl-badges'), ratingTitle:$('exo-ftl-rating-title'),
    ratingSummary:$('exo-ftl-rating-summary'), riskFill:$('exo-ftl-risk-fill'), ratingData:$('exo-ftl-rating-data'),
    performance:$('exo-ftl-performance'), power:$('exo-ftl-power'), dimensional:$('exo-ftl-dimensional'),
    navigation:$('exo-ftl-navigation'), hierarchy:$('exo-ftl-hierarchy'), hurdles:$('exo-ftl-hurdles'),
    qn:$('exo-ftl-qn'), gravity:$('exo-ftl-gravity'), failures:$('exo-ftl-failures'),
    edge:$('exo-ftl-edge'), protocols:$('exo-ftl-protocols'), sourceImpact:$('exo-ftl-source-impact')
  };

  let sourceContext = loadSource();
  let rating = null;
  globalThis.BlacklightExoGetActiveFTL = () => rating;

  function randomSeed(){
    if(globalThis.crypto?.getRandomValues){
      const values=new Uint32Array(2);
      crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function loadSource(){
    const params=new URLSearchParams(location.search);
    const allowed=['government','dossier','system','cluster'];
    if(!allowed.includes(params.get('source')))return null;
    try{
      const stored=JSON.parse(localStorage.getItem(HANDOFF_KEY)||'null');
      if(!stored||stored.version!==1||stored.type!==params.get('source'))return null;
      return stored;
    }catch(error){
      console.warn('Unable to load FTL source handoff.',error);
      return null;
    }
  }

  function options(){
    return{
      tier:controls.tier.value,
      family:controls.family.value,
      scale:controls.scale.value,
      infrastructure:controls.infrastructure.value,
      route:controls.route.value,
      doctrine:controls.doctrine.value,
      energy:controls.energy.value,
      distance:Math.max(.000001,Number(controls.distance.value)||1),
      distanceUnit:controls.distanceUnit.value
    };
  }

  function card(label,title,text){
    const article=document.createElement('article');
    article.className='exo-ftl-card';
    const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    small.textContent=label;heading.textContent=title;paragraph.textContent=text;
    article.append(small,heading,paragraph);
    return article;
  }

  function renderCards(container,rows){
    if(!container)return;
    container.replaceChildren(...rows.map(row=>card(...row)));
  }

  function renderList(container,items){
    if(!container)return;
    container.replaceChildren();
    for(const item of items){
      const li=document.createElement('li');
      li.textContent=String(item);
      container.append(li);
    }
  }

  function addData(label,value){
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=label;dd.textContent=value;
    ui.ratingData.append(dt,dd);
  }

  function formatNumber(value,digits=3){
    const number=Number(value)||0;
    if(Math.abs(number)>=1e9)return number.toExponential(3);
    return number.toLocaleString(undefined,{maximumFractionDigits:digits});
  }

  function drawVisual(){
    if(!ui.visual||!rating)return;
    ui.visual.replaceChildren();
    const ns='http://www.w3.org/2000/svg';
    const make=(tag,attrs={})=>{
      const node=document.createElementNS(ns,tag);
      for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
      return node;
    };
    const cx=105,cy=215,targetX=595,targetY=215;
    ui.visual.append(
      make('line',{x1:55,y1:215,x2:650,y2:215,class:'exo-ftl-axis'}),
      make('line',{x1:350,y1:50,x2:350,y2:380,class:'exo-ftl-axis'})
    );
    const routeShadow=make('path',{d:`M${cx} ${cy} C245 ${cy-115} 455 ${cy+115} ${targetX} ${targetY}`,class:'exo-ftl-route-shadow'});
    const route=make('path',{d:`M${cx} ${cy} C245 ${cy-115} 455 ${cy+115} ${targetX} ${targetY}`,class:'exo-ftl-route'});
    ui.visual.append(routeShadow,route);
    const rings=Math.max(3,Math.min(9,rating.identity.tierRank+3));
    for(let index=0;index<rings;index+=1){
      const rx=44+index*18,ry=28+index*10;
      ui.visual.append(make('ellipse',{cx,cy,rx,ry,class:`exo-ftl-field${index%2?' secondary':''}`}));
    }
    const dimensionalCount=Math.min(10,rating.dimensional.activeDimensions);
    for(let index=0;index<dimensionalCount;index+=1){
      const angle=index/dimensionalCount*Math.PI*2;
      const x=350+Math.cos(angle)*94,y=215+Math.sin(angle)*62;
      ui.visual.append(
        make('line',{x1:350,y1:215,x2:x,y2:y,class:'exo-ftl-node-line'}),
        make('circle',{cx:x,cy:y,r:6,class:'exo-ftl-node'})
      );
    }
    ui.visual.append(
      make('circle',{cx,cy,r:19,class:'exo-ftl-node'}),
      make('circle',{cx:targetX,cy:targetY,r:19,class:'exo-ftl-node target'})
    );
    if(rating.identity.routeEnvironment!=='Deep interstellar space'){
      ui.visual.append(make('circle',{cx:470,cy:150,r:14,class:'exo-ftl-node hazard'}));
      const hazardLabel=make('text',{x:470,y:128,class:'exo-ftl-label'});
      hazardLabel.textContent='GRADIENT / ROUTE INTERFERENCE';
      ui.visual.append(hazardLabel);
    }
    const labels=[
      [cx,cy+60,'ORIGIN FIELD'],
      [350,335,`${rating.dimensional.activeDimensions}D / Q${rating.dimensional.qPhaseIndex} SOLUTION`],
      [targetX,targetY+60,'CERTIFIED EMERGENCE VOLUME'],
      [350,64,rating.performance.compressionReading]
    ];
    for(const [x,y,text] of labels){
      const node=make('text',{x,y,class:'exo-ftl-label'});
      node.textContent=text;
      ui.visual.append(node);
    }
  }

  function renderSource(){
    if(!ui.source)return;
    ui.source.hidden=!sourceContext;
    if(!sourceContext)return;
    const facts=FTL.sourceFacts(sourceContext);
    const labels={government:'Stellar government',dossier:'System dossier',system:'Solar system',cluster:'Solar cluster'};
    ui.sourceTitle.textContent=`${labels[sourceContext.type]||'EXO record'} imported`;
    const details=[
      facts.polity?`polity ${facts.polity}`:null,
      facts.technology?`technology ${facts.technology}`:null,
      facts.reach?`reach ${facts.reach}`:null,
      facts.systemNames.length?`${facts.systemNames.length} named system records`:null,
      facts.strategicAssets.length?`strategic assets ${facts.strategicAssets.join(', ')}`:null
    ].filter(Boolean);
    ui.sourceBody.textContent=`The hierarchy preserves ${details.join('; ')||'the imported EXO source record'} and uses it to infer a credible starting tier, infrastructure burden, strategic range, and supply architecture.`;
    const returns={government:'blacklight-exo-stellar-government.html',dossier:'blacklight-exo-species-civilization.html',system:'blacklight-exo-solar-system.html',cluster:'blacklight-exo-solar-system.html'};
    ui.sourceReturn.href=returns[sourceContext.type]||'blacklight-exo-operations.html';
  }

  function renderHierarchy(){
    if(!ui.hierarchy)return;
    ui.hierarchy.replaceChildren();
    for(const tier of rating.hierarchy){
      const article=document.createElement('article');
      article.className='exo-ftl-tier-card';
      article.dataset.status=tier.status;
      article.dataset.compatible=String(tier.compatible);
      const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
      small.textContent=`Tier ${tier.rank} · ${tier.status}`;
      heading.textContent=tier.label;
      paragraph.textContent=`Speed: ${tier.cRange}. Range: ${tier.range}. Typical installations: ${tier.typicalVessels}. Principal hurdle: ${tier.principalHurdle}.`;
      article.append(small,heading,paragraph);
      ui.hierarchy.append(article);
    }
  }

  function render(){
    const {identity,performance,range,navigation,power,dimensional,architecture,risk}=rating;
    ui.summaryName.textContent=identity.name;
    ui.summaryTier.textContent=`Tier ${identity.tierRank} · ${identity.tier}`;
    ui.summarySpeed.textContent=performance.cStatus.label;
    ui.summaryRisk.textContent=`${risk.label} · ${risk.score}/100`;
    ui.name.textContent=identity.name;
    ui.description.textContent=rating.summary;
    ui.badges.replaceChildren();
    for(const value of[identity.family,identity.tier,identity.scale,identity.infrastructure,identity.routeEnvironment]){
      const span=document.createElement('span');
      span.textContent=value;
      ui.badges.append(span);
    }
    drawVisual();
    ui.ratingTitle.textContent=performance.cStatus.label;
    ui.ratingSummary.textContent=performance.compressionReading;
    ui.riskFill.style.width=`${risk.score}%`;
    ui.ratingData.replaceChildren();
    addData('Clean-space rating',`${formatNumber(performance.ratedCleanSpaceC)}c`);
    addData('Route-degraded rating',`${formatNumber(performance.practicalRouteC)}c`);
    addData('AU per hour',formatNumber(performance.practicalAuPerHour));
    addData('Reference transit',performance.transitText);
    addData('Mission elapsed',performance.missionText);
    addData('Certified range',range.certifiedText);
    addData('Arrival uncertainty',navigation.referenceArrivalErrorText);
    addData('Risk',`${risk.label} · ${risk.score}/100`);

    const cRelation=performance.cStatus.mode==='sublight'
      ?`${performance.cStatus.percentOfC.toFixed(5)}% of c; ${performance.cStatus.shortfallPercent.toFixed(5)}% below light speed.`
      :`${formatNumber(performance.cStatus.multipleC)} times c; ${formatNumber(performance.cStatus.percentBeyondC,1)}% beyond light speed.`;

    renderCards(ui.performance,[
      ['Light-speed relationship',performance.cStatus.label,cRelation],
      ['AU compression reading',`${formatNumber(performance.practicalAuPerHour)} AU/hour`,`${formatNumber(performance.practicalAuPerMinute)} AU/minute; ${formatNumber(performance.practicalAuPerDay)} AU/day; ${formatNumber(performance.lightTimeCompression)}× light-time compression.`],
      ['Reference route',`${FTL.format.distanceText(performance.referenceDistanceAU)} in ${performance.transitText}`,`Spool ${performance.spoolText}; transit ${performance.transitText}; cooldown ${performance.cooldownText}; complete mission cycle ${performance.missionText}.`],
      ['Standard comparisons','1 AU / 1 ly / 10 ly',`${performance.oneAuText} per AU; ${performance.oneLightYearText} per light-year; ${performance.tenLightYearText} for ten light-years under the selected route conditions.`],
      ['Single-transit range',range.certifiedText,`Nominal engineering limit ${range.nominalText}; ${range.reservePercent.toFixed(1)}% retained as route and abort reserve; ${range.timeAtCertifiedRange} transit time at the reference route rating.`],
      ['Reference-route endurance',`${range.routeCountAtReference} complete reference legs`,`Number of selected-distance transits geometrically contained in the certified range before fuel, thermal, or maintenance restrictions are separately applied.`]
    ]);

    renderCards(ui.power,[
      ['Reference installation',architecture.referenceVehicle,`${architecture.referenceMass}; integration problem: ${architecture.scaleChallenge}.`],
      ['Activation energy',power.activationText,`Required field-bank storage ${power.storageText}; average spool power ${power.averagePowerText}.`],
      ['Energy architecture',architecture.energySystem,`${architecture.fuel}; ${architecture.recharge}.`],
      ['Fuel requirement',power.fuelText,`Estimated energy-medium mass for one reference activation at ${(power.efficiencyPercent).toFixed(1)}% conversion efficiency.`],
      ['Thermal and field waste',power.wasteText,`${architecture.thermalBurden}.`],
      ['Containment reserve',power.emergencyReserve,power.energyHurdle]
    ]);

    renderCards(ui.dimensional,[
      ['Transit mechanism',architecture.transitMethod,architecture.fieldMethod],
      ['Dimensional framework',dimensional.framework,`${dimensional.activeDimensions} active dimensions with Q-phase index ${dimensional.qPhaseIndex}.`],
      ['Coherence window',dimensional.coherenceWindowText,`The complete field solution must remain synchronized inside this phase tolerance.`],
      ['Topology tolerance',dimensional.topologyTolerance,'Errors above this level can change route topology rather than merely reducing speed.'],
      ['Computational burden',dimensional.computationalLoad,'Independent synchronized solution channels must agree before commitment.'],
      ['Certified development window',architecture.certifiedTierWindow,`Current architecture is implemented at Tier ${identity.tierRank}.`]
    ]);

    renderCards(ui.navigation,[
      ['Arrival uncertainty',navigation.referenceArrivalErrorText,`${formatNumber(navigation.errorKmPerAU)} km of modeled error per AU before route-distance scaling.`],
      ['Emergence exclusion volume',navigation.exclusionText,'The destination must be verified clear beyond this radius before commitment.'],
      ['Gravitational-plane tolerance',navigation.planeToleranceText,'Departure or emergence outside this angular envelope requires a fresh solution.'],
      ['Gradient interference limit',navigation.gradientLimitText,'Variation across the field, not merely absolute gravity, is the controlling quantity.'],
      ['Navigation sensor architecture',navigation.sensorHorizon,`Route solution refresh interval ${FTL.format.secondsToText(navigation.solutionRefreshSeconds)}.`],
      ['Destination verification',navigation.destinationVerification,'No single beacon or coordinate source is considered sufficient.']
    ]);

    renderHierarchy();
    renderList(ui.hurdles,rating.operational.hurdles);
    renderList(ui.qn,rating.dimensional.factors);
    renderList(ui.gravity,rating.operational.gravity);
    renderList(ui.failures,rating.operational.failures);
    renderList(ui.edge,rating.operational.edge);
    renderList(ui.protocols,rating.operational.protocols);
    renderCards(ui.sourceImpact,rating.sourceImpact.map((text,index)=>['Source consequence',`Constraint ${index+1}`,text]));
    document.querySelectorAll('.exo-ftl-card,.exo-ftl-tier-card').forEach(node=>{
      node.classList.remove('exo-ftl-fade');
      void node.offsetWidth;
      node.classList.add('exo-ftl-fade');
    });
  }

  function generate(){
    const seed=controls.seed.value.trim()||randomSeed();
    controls.seed.value=seed;
    rating=FTL.generate(seed,options(),sourceContext);
    renderSource();
    render();
    document.dispatchEvent(new CustomEvent('blacklight:exo-ftl-generated',{detail:{seed,rating}}));
  }

  function exportJson(){
    if(!rating)return;
    const blob=new Blob([JSON.stringify(rating,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;
    link.download=rating.fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function applySourceDefaults(){
    if(!sourceContext)return;
    const facts=FTL.sourceFacts(sourceContext);
    controls.tier.value=`t${facts.inferredTier}`;
    controls.seed.value=`${facts.sourceSeed||randomSeed()}:ftl`;
    if(facts.strategicAssets.some(item=>/gate/i.test(item)))controls.family.value='wormhole-gate';
    if(sourceContext.type==='cluster'){
      controls.distance.value='4';
      controls.distanceUnit.value='ly';
      controls.infrastructure.value='corridor';
    }
  }

  controls.generate.addEventListener('click',generate);
  controls.export.addEventListener('click',exportJson);
  controls.seed.addEventListener('keydown',event=>{if(event.key==='Enter')generate();});
  applySourceDefaults();
  generate();
})();