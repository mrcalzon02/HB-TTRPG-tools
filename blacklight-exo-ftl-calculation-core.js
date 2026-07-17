(() => {
  'use strict';
  const base = globalThis.BlacklightExoFTL;
  if (!base || globalThis.BlacklightExoFTLCalculationAudit) return;
  const C_KM_S = Number(base.constants?.C_KM_S) || 299792.458;
  const C_AU_S = Number(base.constants?.C_AU_S) || C_KM_S / (Number(base.constants?.AU_KM) || 149597870.7);
  const EPS = 1e-12;
  const DISCRETE = new Set(['q-lattice','fold-jump','wormhole-gate','phase-displacement']);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const relError=(a,e)=>Math.abs(a-e)/Math.max(EPS,Math.abs(e));
  function num(v,d=5){const n=finite(v),a=Math.abs(n);return a!==0&&(a>=1e9||a<1e-5)?n.toExponential(Math.min(5,d)):n.toLocaleString(undefined,{maximumFractionDigits:d});}
  const pct=(v,d=2)=>`${num(v,d)}%`;
  function seconds(v){const s=Math.max(0,finite(v));if(base.format?.secondsToText)return base.format.secondsToText(s);if(s<60)return`${num(s,3)} seconds`;if(s<3600)return`${num(s/60,3)} minutes`;if(s<86400)return`${num(s/3600,3)} hours`;if(s<31557600)return`${num(s/86400,3)} days`;return`${num(s/31557600,3)} years`;}
  const energy=v=>base.format?.energyText?base.format.energyText(Math.max(0,finite(v))):`${num(v,4)} J`;
  const power=v=>base.format?.powerText?base.format.powerText(Math.max(0,finite(v))):`${num(v,4)} W`;
  const mass=v=>base.format?.massText?base.format.massText(Math.max(0,finite(v))):`${num(v,4)} kg`;
  function confidence(rank,type,availability,reliability){
    const m=clamp(rank/6,0,1),a=clamp(availability/100,0,1),r=clamp(reliability/100,0,1);
    const w={direct:[.82,.08,.10],derived:[.55,.22,.23],modeled:[.38,.31,.31],theoretical:[.22,.39,.39]}[type]||[.4,.3,.3];
    const score=clamp(100*(w[0]+w[1]*m+w[2]*Math.sqrt(a*r)),5,99.9);
    const label=score>=85?'high internal confidence':score>=65?'usable engineering confidence':score>=45?'provisional engineering confidence':'theoretical or fragile confidence';
    return{score,scoreText:`${score.toFixed(1)}%`,label,basis:'This is Charles\'s confidence in the internal calculation and its operating assumptions, not a statistical claim that the fictional physics has been demonstrated.'};
  }
  function range(v,f,low=0){const n=finite(v),x=clamp(f,0,.95);return{low:Math.max(low,n*(1-x)),nominal:n,high:n*(1+x),fraction:x,percent:x*100};}
  function check(key,label,actual,expected,tolerance,explanation){const a=finite(actual),e=finite(expected),error=relError(a,e);return{key,label,actual:a,expected:e,relativeError:error,relativeErrorText:pct(error*100,error<1e-6?8:5),tolerance,toleranceText:pct(tolerance*100,tolerance<1e-6?8:5),status:error<=tolerance?'consistent':'review required',explanation};}
  const system=result=>(base.energySystems||[]).find(item=>item.label===result.identity?.energySystem)||null;
  const isDiscrete=result=>DISCRETE.has(result.identity?.familyKey)||['discrete','gate','translation','fold','displacement'].some(t=>String(result.kinematics?.mode||'').includes(t));
  globalThis.BlacklightExoFTLCalculationAudit={base,C_KM_S,C_AU_S,EPS,DISCRETE,clamp,finite,num,pct,seconds,energy,power,mass,confidence,range,check,system,isDiscrete};
})();
