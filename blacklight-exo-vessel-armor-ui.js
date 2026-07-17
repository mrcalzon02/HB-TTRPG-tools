(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel;
  if(!V?.distributedArmorVersion||document.getElementById('exo-vessel-directional-protection-body'))return;
  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  const fmt=(value,digits=3)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  const mass=value=>{const tonnes=Math.max(0,Number(value)||0);if(tonnes>=1e9)return`${fmt(tonnes/1e9)} billion t`;if(tonnes>=1e6)return`${fmt(tonnes/1e6)} million t`;if(tonnes>=1e3)return`${fmt(tonnes/1e3)} thousand t`;if(tonnes>=1)return`${fmt(tonnes)} t`;return`${fmt(tonnes*1000)} kg`;};
  const card=(label,title,body)=>{const article=node('article','exo-vessel-card');article.append(node('small','',label),node('h3','',title),node('p','',body));return article;};
  function build(){
    const section=$('exo-vessel-armor-section');if(!section)return;
    const heading=section.querySelector('.bli-section-head h2'),description=section.querySelector('.bli-section-head p:last-child');
    if(heading)heading.textContent='Armor is the vessel’s hull thickness, reinforced structure, protected citadel, and hardened external systems.';
    if(description)description.textContent='Passive protection is distributed through the ship rather than packed into detachable armor modules. Active energy protection remains separate installed hardware and may emphasize different directions from the physical hull.';
    const wrap=node('div','exo-vessel-table-wrap');wrap.innerHTML='<table class="exo-vessel-table"><thead><tr><th>Protection direction</th><th>Passive mass</th><th>Equivalent thickness</th><th>Physical density</th><th>Active-field mass</th><th>Relative field strength</th></tr></thead><tbody id="exo-vessel-directional-protection-body"></tbody></table>';
    section.append(wrap);
  }
  function render(event){
    const vessel=event?.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.(),armor=vessel?.armor;if(!armor||!$('exo-vessel-armor-grid'))return;
    const allocations=armor.allocations||{};
    $('exo-vessel-armor-grid').replaceChildren(
      card('Distributed passive hardening',mass(armor.passiveArmorMassTonnes),`${fmt(armor.armorToMassPercent,3)}% of loaded mass is integrated into the hull, structure, citadel, and hardened installed systems.`),
      card('Equivalent outer-hull thickness',`${fmt(armor.equivalentOuterHullThicknessMm,3)} mm`,`${fmt(armor.physicalArealDensityKgM2,2)} kg/m² reference physical areal density at ${fmt(armor.coverageFraction*100,1)}% modeled coverage.`),
      card('Outer-hull allocation',mass(allocations.outerHull?.massTonnes),allocations.outerHull?.label||'Continuous outer-hull protection.'),
      card('External-system hardening',mass(allocations.externalSystems?.massTonnes),`${fmt(armor.externalSystemDurabilityMultiplier,3)}× modeled durability multiplier for exposed machinery, sensors, radiators, engines, and combat systems.`),
      card('Structural armoring',mass(allocations.structural?.massTonnes),allocations.structural?.label||'Reinforced primary load paths and attachment structure.'),
      card('Citadel armoring',mass(allocations.citadel?.massTonnes),allocations.citadel?.label||'Localized protection around critical internal systems.'),
      card('Directional active protection',mass(armor.fieldProtectionMassTonnes),'Energy-based field generation, projection, isolation, and control hardware remains separate from passive construction mass.'),
      card('Armor-module policy','No standalone armor modules',armor.distributionRule)
    );
    const body=$('exo-vessel-directional-protection-body');if(body){body.replaceChildren();for(const key of['FORE','AFT','LEFT','RIGHT','UP','DOWN','CITADEL','STRUCTURAL']){const passive=armor.facings?.[key],field=armor.fieldFacings?.[key],row=node('tr');for(const value of[passive?.label||key,mass(passive?.massTonnes),`${fmt(passive?.equivalentThicknessMm,3)} mm`,`${fmt(passive?.physicalArealDensityKgM2,2)} kg/m²`,mass(field?.massTonnes),`${fmt(field?.relativeFieldStrength,3)}×`])row.append(node('td','',value));body.append(row);}}
  }
  build();document.addEventListener('blacklight:exo-vessel-generated',render);queueMicrotask(render);
})();
