(() => {
  'use strict';
  const V = globalThis.BlacklightExoVessel;
  if (!V) return;
  const $ = id => document.getElementById(id);
  const HANDOFF_KEY = 'blacklight-exo-vessel-source-v1';
  let source = loadSource();
  let vessel = null;
  globalThis.BlacklightExoGetActiveVessel = () => vessel == null ? null : structuredClone(vessel);

  const controls = {
    seed:$('exo-vessel-seed'),family:$('exo-vessel-family'),path:$('exo-vessel-path'),role:$('exo-vessel-role'),biology:$('exo-vessel-biology'),defense:$('exo-vessel-defense'),crew:$('exo-vessel-crew'),endurance:$('exo-vessel-endurance'),reserve:$('exo-vessel-reserve'),distance:$('exo-vessel-distance'),payload:$('exo-vessel-payload'),generate:$('exo-vessel-generate'),export:$('exo-vessel-export')
  };
  if (!controls.generate) return;

  function loadSource() {
    const type = new URLSearchParams(location.search).get('source');
    if (!['ftl','biology','route'].includes(type)) return null;
    try {
      const stored = JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null');
      return stored?.version === 1 && stored.type === type ? stored : null;
    } catch (error) {
      console.warn('Unable to read vessel source handoff.',error);
      return null;
    }
  }

  function randomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2); crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  const fmt = (value,digits=3) => Number(value || 0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const text = (id,value) => { const target=$(id); if (target) target.textContent=String(value); };
  const node = (tag,className='',content='') => { const element=document.createElement(tag); if(className)element.className=className;if(content)element.textContent=content;return element; };

  function populateControls() {
    controls.family.add(new Option('Inherit source or use default','inherit'));
    for (const item of globalThis.BlacklightExoFTL.families || []) controls.family.add(new Option(item.label,item.key));
    controls.path.add(new Option('Inherit source or use Path 4','inherit'));
    for (const item of globalThis.BlacklightExoFTL.pathLevels || []) controls.path.add(new Option(`Path ${item.rank} · ${item.label}`,item.key));
    for (const item of V.roles) controls.role.add(new Option(item.label,item.key));
    controls.biology.add(new Option('Infer inherited biology','inherit'));
    for (const item of V.biologyProfiles) controls.biology.add(new Option(item.label,item.key));
    for (const item of V.defenses) controls.defense.add(new Option(item.label,item.key));
    controls.role.value='explorer';controls.biology.value='inherit';controls.defense.value='hardened';controls.path.value='inherit';controls.family.value='inherit';
  }

  function applySourceDefaults() {
    const rating = source?.route?.rating || source?.ftl || null;
    const dossier = source?.dossier || null;
    if (rating) {
      controls.family.value = rating.identity?.familyKey || 'inherit';
      controls.path.value = rating.pathLevel?.key || rating.identity?.pathLevelKey || 'inherit';
      controls.seed.value = `${rating.seed || randomSeed()}:vessel`;
      const distanceLy = source?.route?.effectiveDistanceLy || Number(rating.performance?.referenceDistanceAU || 0)/Number(globalThis.BlacklightExoFTL.constants?.LY_AU || 63241.077084);
      if (distanceLy) controls.distance.value = String(Number(distanceLy.toFixed(6)));
    }
    if (source?.type === 'route') {
      controls.role.value = 'merchant';
      controls.reserve.value = '3';
      controls.endurance.value = String(Math.max(30,Math.ceil(Number(source.route?.timing?.completeSeconds || 0)/86400)+21));
    }
    if (source?.type === 'biology' && dossier?.system?.life === 'multispecies') controls.biology.value='multispecies';
    if (!controls.seed.value) controls.seed.value = `${dossier?.seed || randomSeed()}:vessel`;
  }

  function input() {
    return {
      family:controls.family.value,pathLevel:controls.path.value,role:controls.role.value,biologyProfile:controls.biology.value,defense:controls.defense.value,
      crew:Math.max(1,Number(controls.crew.value)||1),enduranceDays:Math.max(1,Number(controls.endurance.value)||1),reserveJumps:Math.max(1,Number(controls.reserve.value)||1),distanceLy:Math.max(.000001,Number(controls.distance.value)||4),payloadTonnes:controls.payload.value.trim()===''?'':Math.max(0,Number(controls.payload.value)||0)
    };
  }

  function card(label,title,body,state='') {
    const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;
    article.append(node('small','',label),node('h3','',title),node('p','',body));return article;
  }

  function renderCards(id,rows) {
    const container=$(id);if(!container)return;container.replaceChildren(...rows.map(row=>card(...row)));
  }

  function drawHull() {
    const svg=$('exo-vessel-visual');if(!svg||!vessel)return;svg.replaceChildren();
    const NS='http://www.w3.org/2000/svg';const make=(tag,attrs={})=>{const element=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))element.setAttribute(k,v);return element;};
    const length=vessel.hull.lengthM,beam=vessel.hull.beamM,scale=Math.min(520/Math.max(1,length),150/Math.max(1,beam));
    const hullL=Math.max(170,length*scale),hullH=Math.max(42,beam*scale),x=(700-hullL)/2,y=(330-hullH)/2;
    svg.append(make('path',{d:`M ${x+30} ${y} H ${x+hullL-70} Q ${x+hullL} ${y+hullH/2} ${x+hullL-70} ${y+hullH} H ${x+30} Q ${x-12} ${y+hullH/2} ${x+30} ${y} Z`,class:'exo-vessel-hull'}));
    const driveWidth=Math.max(24,hullL*Math.min(.42,vessel.drive.driveFractionPercent/120));
    svg.append(make('rect',{x:x+28,y:y+8,width:driveWidth,height:Math.max(18,hullH-16),rx:8,class:'exo-vessel-drive-core'}));
    const habitatX=x+driveWidth+45,habitatW=Math.max(30,hullL-driveWidth-145);
    svg.append(make('rect',{x:habitatX,y:y+12,width:habitatW,height:Math.max(16,hullH-24),rx:10,class:'exo-vessel-habitat'}));
    for(let i=0;i<Math.min(10,vessel.hull.decks);i+=1){const yy=y+16+(hullH-32)*(i+1)/(Math.min(10,vessel.hull.decks)+1);svg.append(make('line',{x1:habitatX+8,y1:yy,x2:habitatX+habitatW-8,y2:yy,class:'exo-vessel-deck-line'}));}
    const labels=[
      [x+driveWidth/2+28,y-18,'FTL APPARATUS'],[habitatX+habitatW/2,y-18,'HABITAT / MISSION VOLUME'],[350,295,`${fmt(vessel.hull.lengthM,1)} m × ${fmt(vessel.hull.beamM,1)} m × ${fmt(vessel.hull.heightM,1)} m`]
    ];
    for(const [lx,ly,value] of labels){const t=make('text',{x:lx,y:ly,class:'exo-vessel-label'});t.textContent=value;svg.append(t);}
  }

  function renderMassTable() {
    const body=$('exo-vessel-mass-body');if(!body)return;body.replaceChildren();
    for(const row of vessel.hull.massBudget){const tr=node('tr');tr.append(node('td','',row.label),node('td','',row.massText),node('td','',`${fmt(row.massPercent,2)}%`),node('td','',row.volumeText),node('td','',row.note));body.append(tr);}
  }

  function renderSource() {
    const panel=$('exo-vessel-source');panel.hidden=!source;if(!source)return;
    const labels={ftl:'FTL architecture',biology:'species and civilization dossier',route:'cluster jump route'};
    text('exo-vessel-source-title',`${labels[source.type] || 'EXO source'} inherited`);
    const details=[];
    if(source.ftl?.identity?.name)details.push(`drive ${source.ftl.identity.name}`);
    if(source.route?.start?.name&&source.route?.end?.name)details.push(`route ${source.route.start.name} to ${source.route.end.name}`);
    if(source.dossier?.species?.name)details.push(`biology ${source.dossier.species.name}`);
    text('exo-vessel-source-body',`Charles will preserve ${details.join('; ') || 'the imported source record'} while allowing the vessel mission and reserve assumptions to be changed independently.`);
  }

  function render() {
    const {identity,hull,drive,lifeSupport,power,fuel,thermal,protection,navigation,maintenance}=vessel;
    text('exo-vessel-summary-name',identity.name);text('exo-vessel-summary-mass',hull.totalMassText);text('exo-vessel-summary-drive',`${drive.family} · Path ${drive.pathLevelRank}`);text('exo-vessel-summary-crew',`${lifeSupport.crew} / ${fmt(lifeSupport.enduranceDays,0)} d`);
    text('exo-vessel-name',identity.name);text('exo-vessel-description',`${identity.mobilityClass}. ${identity.status}. The inherited drive occupies ${fmt(drive.driveFractionPercent,2)}% of loaded mass and determines the ship's foundations, peak-power routing, thermal stores, navigation baselines, and maintenance access.`);
    const badges=$('exo-vessel-badges');badges.replaceChildren(...[identity.role,identity.defense,drive.family,`Path ${drive.pathLevelRank}`,lifeSupport.profile.label].map(value=>node('span','',value)));
    text('exo-vessel-rating',identity.status);text('exo-vessel-rating-summary',`${hull.totalMassText}; ${fmt(hull.lengthM,1)} m long; ${power.peakPowerText} drive peak.`);
    $('exo-vessel-drive-fill').style.width=`${Math.min(100,drive.driveFractionPercent)}%`;
    const data=$('exo-vessel-rating-data');data.replaceChildren();
    for(const [label,value] of [['Mobility',identity.mobilityClass],['Loaded mass',hull.totalMassText],['Drive share',`${fmt(drive.driveFractionPercent,2)}%`],['Continuous power',power.continuousPowerText],['Mission energy',drive.missionEnergyText],['Mission duration',drive.missionTimeText],['Crew endurance',`${fmt(lifeSupport.enduranceDays,0)} days`]]){data.append(node('dt','',label),node('dd','',value));}
    drawHull();renderMassTable();

    renderCards('exo-vessel-drive-grid',[
      ['Transit architecture',drive.family,`${drive.architecture}; ${drive.pathLevelLabel}.`],
      ['Installed drive mass',mass(drive.integratedDriveMassTonnes),`${mass(drive.apparatusMassTonnes)} active apparatus plus structural, field-coverage, isolation, and service-access integration.`],
      ['Installed drive volume',`${fmt(drive.serviceVolumeM3,1)} m³`,`${fmt(drive.apparatusVolumeM3,1)} m³ active apparatus before service galleries and whole-effect coverage allowance.`],
      ['Reference mission',drive.missionTimeText,`${drive.missionEnergyText}; certified range ${drive.certifiedRangeText || 'not established'}.`],
      ['Peak activation power',drive.peakPowerText,'This is not the ordinary hotel load. Pulse storage and drive bus isolation must survive it without collapsing life support or navigation.'],
      ['Integration finding',`${fmt(drive.driveFractionPercent,2)}% loaded mass`,identity.mobilityClass,drive.driveFractionPercent>45?'warning':'ok']
    ]);

    renderCards('exo-vessel-power-grid',[
      ['Continuous generation',power.continuousPowerText,`${power.rechargePowerText} is reserved for drive recharge; the remainder supports habitat, sensors, shielding, and conventional maneuver systems.`],
      ['Power-plant mass',mass(power.generationPlantTonnes),'Ship generation and recharge plant external to the qualified drive assembly.'],
      ['Energy medium',fuel.medium || fuel.energySystem,`${fuel.carriedMissionCycles} mission cycles; ${mass(fuel.carriedFuelTonnes)} active medium and ${mass(fuel.containmentAndTransferTonnes)} containment and transfer plant.`],
      ['Thermal debt',thermal.thermalDebtText,`${thermal.averageRejectionText} average rejection during recharge.`],
      ['Heat stores and radiators',mass(thermal.heatStoreTonnes+thermal.radiatorTonnes),`${mass(thermal.coolantTonnes)} coolant and working fluid.`],
      ['Reserve policy',`${fmt(fuel.routeReservePercent,1)}% route reserve`,`${mass(fuel.totalFuelSystemTonnes)} complete fuel, containment, transfer, and reserve system.`]
    ]);

    renderCards('exo-vessel-life-grid',[
      ['Inherited habitat class',lifeSupport.profile.label,lifeSupport.profile.inferenceReason],
      ['Crew and endurance',`${lifeSupport.crew} crew · ${fmt(lifeSupport.enduranceDays,0)} days`,`${fmt(lifeSupport.volumeM3,1)} m³ net inhabited volume across ${lifeSupport.zones} isolated zone${lifeSupport.zones===1?'':'s'}.`],
      ['Environmental set point',`${fmt(lifeSupport.profile.pressureKPa,1)} kPa · ${fmt(lifeSupport.profile.temperatureK,1)} K`,`${fmt(lifeSupport.profile.gravityG,2)} g local gravity; ${lifeSupport.profile.medium} environmental medium.`],
      ['Environmental-medium mass',mass(lifeSupport.mediumMassTonnes),`${mass(lifeSupport.solventReserveTonnes)} unrecovered solvent reserve.`],
      ['Nutrition and medicine',mass(lifeSupport.nutritionTonnes+lifeSupport.medicalTonnes),`${mass(lifeSupport.nutritionTonnes)} nutrition or repair feedstock; ${mass(lifeSupport.medicalTonnes)} medical and isolation equipment.`],
      ['Life-support power',powerValue(lifeSupport.powerW),`${fmt(lifeSupport.recoveryPercent,2)}% modeled solvent recovery. ${lifeSupport.profile.confidenceNote}`]
    ]);

    renderCards('exo-vessel-protection-grid',[
      ['Protection doctrine',protection.doctrine,protection.notes],
      ['Shield mass',mass(protection.shieldMassTonnes),`${fmt(protection.arealDensityKgM2,1)} kg/m² reference protection before field and family hazard multipliers.`],
      ['Navigation architecture',navigation.sensorArchitecture || 'Independent transit metrology',navigation.destinationVerification || 'Independent destination confirmation required.'],
      ['Sensor baseline',`${fmt(navigation.baselineM,1)} m`,`${mass(navigation.independentSensorMassTonnes)} independent navigation, clocks, and sensor plant.`],
      ['Arrival solution',navigation.arrivalUncertainty || 'not established',`Route solution refresh ${navigation.solutionRefresh}; computational burden ${navigation.clockAndSolutionChannels || 'not established'}.`],
      ['Compartmentation',`${hull.decks} nominal decks`,`${fmt(hull.surfaceAreaM2,1)} m² modeled exterior and ${fmt(hull.averageDensityTonnesM3,3)} t/m³ loaded average density.`]
    ]);

    renderCards('exo-vessel-maintenance-grid',[
      ['Maintenance complement',`${maintenance.technicians} specialists`,`${maintenance.estimatedHoursPerJumpText} modeled coordinated work after each transit.`],
      ['Carried drive spares',mass(maintenance.driveSpareTonnes),`${mass(maintenance.totalMaintenanceTonnes)} complete maintenance shops, calibration stock, and carried spares.`],
      ['Shortest-life constraint',maintenance.shortestLifeComponent || 'not established',maintenance.inspectionRule || 'Inspection after every abort, overload, or uncommanded environmental exposure.'],
      ['Overhaul authority','Coordinated drive-chain overhaul',maintenance.overhaulRule || 'Use the inherited drive certification interval.'],
      ['Service doctrine','Direct access retained',maintenance.servicePhilosophy || 'Preserve access to active surfaces, seals, switches, reference nodes, sensors, containment sectors, and independent isolation boundaries.'],
      ['Growth margin',mass(hull.massBudget.find(row=>row.key==='margin')?.massTonnes || 0),'Reserved rather than silently consumed by the first unresolved mission request.']
    ]);

    const warnings=$('exo-vessel-warnings');warnings.replaceChildren(...vessel.warnings.map(item=>node('li','',item)));
  }

  function mass(tonnes) {
    const value=Math.max(0,Number(tonnes)||0);
    const row=vessel?.hull?.massBudget?.find(item=>Math.abs(item.massTonnes-value)<1e-12);
    if(row?.massText)return row.massText;
    if(value>=1e12)return`${fmt(value/1e12,3)} trillion tonnes`;
    if(value>=1e9)return`${fmt(value/1e9,3)} billion tonnes`;
    if(value>=1e6)return`${fmt(value/1e6,3)} million tonnes`;
    if(value>=1e3)return`${fmt(value/1e3,3)} thousand tonnes`;
    if(value>=1)return`${fmt(value,3)} tonnes`;
    return`${fmt(value*1000,3)} kg`;
  }
  function powerValue(value) { return globalThis.BlacklightExoFTL.format?.powerText?.(value) || `${fmt(value)} W`; }

  function generate() {
    const seed=controls.seed.value.trim()||randomSeed();controls.seed.value=seed;
    vessel=V.generate(seed,input(),source);renderSource();render();
    document.dispatchEvent(new CustomEvent('blacklight:exo-vessel-generated',{detail:{seed,vessel}}));
  }

  function activate(event) {
    const imported=event.detail?.vessel;
    if(!imported||typeof imported!=='object')return;
    vessel=structuredClone(imported);source=null;renderSource();render();
    document.dispatchEvent(new CustomEvent('blacklight:exo-vessel-generated',{detail:{seed:vessel.seed,vessel,activation:'campaign-archive'}}));
  }

  function exportJson() {
    if(!vessel)return;const blob=new Blob([JSON.stringify(vessel,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${vessel.seed}-exo-vessel.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  populateControls();applySourceDefaults();
  controls.generate.addEventListener('click',generate);controls.export.addEventListener('click',exportJson);controls.seed.addEventListener('keydown',event=>{if(event.key==='Enter')generate();});
  document.addEventListener('blacklight:exo-vessel-activate',activate);
  generate();
})();
