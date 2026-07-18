(() => {
  'use strict';
  const D=globalThis.BlacklightExoFTLPathDefinitions;
  if(!D||D.level5Balance)return;

  const observedAuPerHour=4280265.90675;
  const nonWormholeCapAuPerHour=observedAuPerHour/3;
  const wormholeCapAuPerHour=observedAuPerHour/2;
  const cAuPerHour=299792.458/149597870.7*3600;
  const nonWormholeCapC=nonWormholeCapAuPerHour/cAuPerHour;
  const wormholeCapC=wormholeCapAuPerHour/cAuPerHour;

  const p5Ranges={
    'metric-envelope':[65000,150000],
    'gravitic-plane':[50000,130000],
    'slipstream-shear':[75000,165000],
    'q-lattice':[95000,185000],
    'n-manifold':[105000,nonWormholeCapC],
    'fold-jump':[100000,190000],
    'phase-displacement':[90000,180000],
    'wormhole-gate':[210000,wormholeCapC]
  };

  for(const [familyKey,speedRange] of Object.entries(p5Ranges)){
    const path=D.paths[familyKey];
    if(path?.speedC?.[5])path.speedC[5]=speedRange;
  }

  const wormhole=D.paths['wormhole-gate'];
  if(wormhole){
    wormhole.level5Authority=Object.freeze({
      rarityClass:'UNIVERSE_RAREST',
      capitalBurdenClass:'CIVILIZATION_SCALE_MAXIMUM',
      engineeringDifficultyClass:'EXTREME_TOPOLOGICAL',
      infrastructureRule:'Path 5 wormhole transit requires paired fixed mouths, chronology-safe synchronization, civilization-scale construction, protected route governance, and exceptional exotic-state production.',
      balanceRule:'Its standardized route ceiling is higher than every other Path 5 method, but only by fifty percent over the common non-wormhole ceiling.'
    });
  }

  D.level5Balance=Object.freeze({
    sourceObservedAuPerHour:observedAuPerHour,
    nonWormholeCapAuPerHour,
    wormholeCapAuPerHour,
    nonWormholeCapC,
    wormholeCapC,
    p5Ranges:Object.freeze(Object.fromEntries(Object.entries(p5Ranges).map(([key,value])=>[key,Object.freeze([...value])])))
  });
})();