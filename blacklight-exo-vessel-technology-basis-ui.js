(() => {
  'use strict';
  const D=globalThis.BlacklightExoVesselTechnologyBasisDefinitions;
  if(!D||document.getElementById('exo-vessel-technology-basis-section'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=1)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');if(!grid||$('exo-vessel-technology-basis'))return;
    const label=node('label');label.append(node('span','','Operative technology basis'));
    const select=node('select');select.id='exo-vessel-technology-basis';select.add(new Option('Infer from species and society','INHERIT'));
    for(const family of Object.values(D.families))select.add(new Option(family.label,family.key));
    label.append(select);grid.append(label);select.addEventListener('change',()=>$('exo-vessel-generate')?.click());
  }
  function card(label,title,body,state=''){const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',body));return article;}
  function table(headers,bodyId){const wrap=node('div','exo-vessel-table-wrap'),table=node('table','exo-vessel-table'),thead=node('thead'),row=node('tr');for(const header of headers)row.append(node('th','',header));thead.append(row);const body=node('tbody');body.id=bodyId;table.append(thead,body);wrap.append(table);return wrap;}
  function listCard(title,items){const article=node('article','exo-vessel-philosophy-card');article.append(node('p','bli-eyebrow',title));const list=node('ul');for(const item of items)list.append(node('li','',item));article.append(list);return article;}
  function build(){
    const section=node('section','bli-section');section.id='exo-vessel-technology-basis-section';
    const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow','Charles // species-derived operative technology'),node('h2','','The route requirement is universal. The machinery satisfying it is not.'),node('p','','Power, cooling, data, atmosphere, structure, and access remain required end effects. Their carriers may instead be metallic current, ionic fluid, pressure pulses, biochemical energy, photonic state, superconductive loops, adaptive fields, contractile tissue, or other internally coherent methods. Similar output does not make the connectors, tolerances, working chemistry, seals, maintenance environment, or safety assumptions interchangeable.'));
    const actions=node('div','bli-actions'),exportButton=node('button','bli-action','Export Technology Basis');exportButton.id='exo-vessel-export-technology-basis';exportButton.type='button';actions.append(exportButton);head.append(actions);
    const grid=node('div','exo-vessel-grid');grid.id='exo-vessel-technology-basis-grid';
    const comparison=node('div','exo-vessel-philosophy-comparison');comparison.id='exo-vessel-technology-basis-comparison';
    const routes=table(['Invariant route','Required end effect','Native carrier','Native interface','Tolerance basis'],'exo-vessel-technology-route-body');
    const modules=table(['Module','End effect','Operative theory','Native interfaces','Human compatibility'],'exo-vessel-module-method-body');
    section.append(head,grid,comparison,routes,modules);
    const anchor=$('exo-vessel-manufacturer-section')||$('exo-vessel-designation-section')||document.querySelector('.exo-vessel-overview');if(anchor)anchor.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
    exportButton.addEventListener('click',()=>{const vessel=globalThis.BlacklightExoGetActiveVessel?.(),basis=vessel?.technologyBasis;if(!basis)return;const blob=new Blob([`${JSON.stringify(basis,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${basis.basisId}.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);});
  }
  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.(),basis=vessel?.technologyBasis;if(!basis)return;
    const interoperability=basis.interoperability.humanInteroperability;
    $('exo-vessel-technology-basis-grid')?.replaceChildren(
      card('Primary operative basis',basis.primaryLabel,basis.summary,'ok'),
      card('Secondary influence',basis.secondaryLabel,`${fmt(basis.hybridizationFraction*100,1)}% bounded hybrid influence derived from manufacturer and societal pressures.`),
      card('Energy distribution',basis.operativeTheories.energyDistribution,basis.routeStandards.power.tolerance),
      card('Control theory',basis.operativeTheories.control,basis.routeStandards.data.interface),
      card('Atmospheric regulation',basis.operativeTheories.atmosphereRegulation,basis.routeStandards.atmosphere.carrier),
      card('Actuation',basis.operativeTheories.actuation,basis.standards.orientationSensitivity),
      card('Boundary and sealing',basis.operativeTheories.sealing,basis.materials.sealants.join('; ')),
      card('Human interoperability',interoperability,basis.interoperability.adapterPolicy,interoperability==='DIRECT'?'ok':'warning')
    );
    $('exo-vessel-technology-basis-comparison')?.replaceChildren(
      listCard('NATIVE MATERIALS',basis.materials.preferred.slice(0,8)),
      listCard('INSTALLATION AND COMMISSIONING',[basis.standards.maintenanceEnvironment,basis.standards.commissioningEnvironment,basis.standards.pressureCompatibility,basis.standards.immersionCompatibility,`Service-clearance factor ${fmt(basis.standards.clearanceMultiplier,2)}×`]),
      listCard('NATIVE FAILURE MODES',basis.failureModes.slice(0,9)),
      listCard('CONVERSION BOUNDARY',basis.interoperability.conversionInterfaces.length?basis.interoperability.conversionInterfaces:['No conversion stage required for terrestrial-compatible service.'])
    );
    const routeBody=$('exo-vessel-technology-route-body');if(routeBody){routeBody.replaceChildren();for(const route of Object.values(basis.routeStandards)){const row=node('tr');for(const value of[route.routeKey,route.endEffect,route.carrier,route.interface,route.tolerance])row.append(node('td','',value));routeBody.append(row);}}
    const moduleBody=$('exo-vessel-module-method-body');if(moduleBody){moduleBody.replaceChildren();for(const module of (vessel.moduleGraph?.modules||[]).slice(0,40)){const method=module.extensions?.operativeMethodology;if(!method)continue;const row=node('tr');for(const value of[module.label,method.endEffect,method.operativeTheory,method.routeInterfaces.map(item=>item.routeKey).join(', '),method.interoperability.humanInteroperability])row.append(node('td','',value));moduleBody.append(row);}}
    const manufacturerSelect=$('exo-vessel-manufacturer-index');if(manufacturerSelect&&Array.isArray(vessel.manufacturerCatalog))vessel.manufacturerCatalog.forEach((item,index)=>{if(manufacturerSelect.options[index])manufacturerSelect.options[index].textContent=`${item.name} · ${item.technologyBasisLabel}`;});
  }
  addControls();build();document.addEventListener('blacklight:exo-vessel-generated',render);queueMicrotask(()=>render());
})();
