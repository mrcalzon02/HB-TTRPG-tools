(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselCampaignVoxelRouteOverlay)return;
  let current=null;
  function stateRows(vessel){return vessel?.campaignEffectiveState?.routeStates||vessel?.combatResolutionModel?.postImpactState?.routeStates||vessel?.conditionHistory?.routeStates||[];}
  function apply(vessel=current){if(!vessel)return;current=structuredClone(vessel);const states=new Map(stateRows(vessel).map(item=>[item.routeId,item]));for(const line of document.querySelectorAll('#exo-vessel-campaign-voxel-canvas [data-route-id]')){const state=states.get(line.dataset.routeId),functional=state?state.functional!==false&&!['SEVERED','REMOVED'].includes(state.state):!line.classList.contains('severed');line.classList.toggle('active',functional);line.classList.toggle('severed',!functional);line.dataset.campaignRouteState=state?.state||line.dataset.campaignRouteState||'ACTIVE';}}
  const refresh=vessel=>queueMicrotask(()=>apply(vessel));
  document.addEventListener('blacklight:exo-vessel-generated',event=>refresh(event.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.()));
  document.addEventListener('change',event=>{if(event.target?.id==='exo-vessel-campaign-voxel-view'||event.target?.id==='exo-vessel-campaign-voxel-filter')refresh(globalThis.BlacklightExoGetActiveVessel?.());});
  globalThis.BlacklightExoVesselCampaignVoxelRouteOverlay=Object.freeze({version:1,apply,stateRows});
})();
