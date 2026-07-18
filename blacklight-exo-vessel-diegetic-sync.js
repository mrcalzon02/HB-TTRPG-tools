(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselDiegeticSync)return;
  const refresh=()=>queueMicrotask(()=>globalThis.BlacklightExoVesselDiegeticControls?.refreshAll(document.getElementById('exo-vessel-campaign-damage-editor')||document));
  document.addEventListener('change',event=>{if(event.target?.closest?.('#exo-vessel-campaign-damage-editor'))refresh();});
  document.addEventListener('blacklight:exo-vessel-activate',refresh);
  document.addEventListener('blacklight:exo-vessel-generated',refresh);
  globalThis.BlacklightExoVesselDiegeticSync=Object.freeze({version:1,refresh});
})();
