(() => {
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;

  function text(value){return String(value||'').trim().toLowerCase();}
  function optionValues(select){return [...(select?.options||[])].map(option=>option.value);}
  function defaultValue(select){return [...(select?.options||[])].find(option=>option.defaultSelected)?.value||select?.options?.[0]?.value||'';}
  function setLegalValue(select,candidate,fallback=''){
    if(!select)return false;
    const values=optionValues(select);
    const next=values.includes(candidate)?candidate:values.includes(fallback)?fallback:defaultValue(select);
    if(!next||select.value===next)return false;
    select.value=next;
    return true;
  }

  function mapSettlementType(value){
    const source=text(value);
    if(/abandon|ruin|evacuat|depopulat/.test(source))return'evacuated ruin settlement';
    if(/pirate|criminal|smuggl/.test(source))return'pirate-tolerated harbor';
    if(/military|fortress|watch|garrison/.test(source))return'military watchpost';
    if(/extract|mining|quarry|guild|industrial/.test(source))return'guild extraction camp';
    if(/dragon|tithe/.test(source))return'dragon-tithed hamlet';
    if(/pilgrim|refuge|sanctuary/.test(source))return'pilgrim refuge';
    if(/trade district|crowded market|metropolis|city/.test(source))return'crowded trade district';
    if(/trade|port|skyport|harbor|route/.test(source))return'minor skyport';
    if(/agricultur|farm|pasture|settled|town/.test(source))return'agricultural island town';
    if(/temporary|camp|survey/.test(source))return'temporary sky camp';
    return'small fortified village';
  }

  function sourceIsland(panel){
    try{return panel?.dataset?.sourceIsland?JSON.parse(panel.dataset.sourceIsland):null;}
    catch{return null;}
  }

  function repairSettlementInheritance(panel){
    const form=panel?.querySelector?.('#settlement-editor-form');
    if(!form)return{changed:false,fields:[]};
    const island=sourceIsland(panel)||{};
    const footprint=island.settlementFootprint||island.classification?.currentUse||island.currentUse||'';
    const changedFields=[];
    if(setLegalValue(form.elements.settlementType,mapSettlementType(footprint),'small fortified village'))changedFields.push('settlementType');
    for(const select of form.querySelectorAll('select')){
      if(select.value&&optionValues(select).includes(select.value))continue;
      if(setLegalValue(select,defaultValue(select)))changedFields.push(select.name||select.id||'unnamed-select');
    }
    if(changedFields.length)panel.querySelector('#settlement-build-profile')?.click();
    return{changed:changedFields.length>0,fields:[...new Set(changedFields)]};
  }

  function handleClick(event){
    if(!event.target?.closest?.('#settlement-load-island'))return;
    const panel=event.target.closest('#kaysender-settlement-editor-panel');
    root.setTimeout?.(()=>repairSettlementInheritance(panel),0);
  }

  if(typeof document!=='undefined')document.addEventListener('click',handleClick);
  root.KaysenderSettlementInheritanceGuard=Object.freeze({defaultValue,mapSettlementType,optionValues,repairSettlementInheritance,setLegalValue});
})();
