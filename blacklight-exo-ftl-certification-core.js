(() => {
  'use strict';
  const base=globalThis.BlacklightExoFTL;
  if(!base||globalThis.BlacklightExoFTLCertificationAudit)return;
  const EPS=1e-12;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  function num(v,d=5){const n=finite(v),a=Math.abs(n);return a!==0&&(a>=1e9||a<1e-5)?n.toExponential(Math.min(5,d)):n.toLocaleString(undefined,{maximumFractionDigits:d});}
  const pct=(v,d=2)=>`${num(v,d)}%`;
  const seconds=v=>base.format?.secondsToText?base.format.secondsToText(Math.max(0,finite(v))):`${num(v,4)} seconds`;
  const distance=v=>base.format?.distanceText?base.format.distanceText(Math.max(0,finite(v))):`${num(v,6)} AU`;
  const mass=v=>base.format?.massText?base.format.massText(Math.max(0,finite(v))):`${num(v,5)} kg`;
  const probability=(p,n)=>Math.max(0,Math.min(1,finite(p,1)))**Math.max(0,Math.round(finite(n)));
  const scalePolicy=Object.freeze({
    probe:{minimumSuccess:95,label:'uncrewed experimental article'},
    fighter:{minimumSuccess:98.5,label:'crewed tactical article'},
    shuttle:{minimumSuccess:99.5,label:'crewed transport article'},
    corvette:{minimumSuccess:99.7,label:'crewed independent warship'},
    frigate:{minimumSuccess:99.8,label:'crewed fleet or merchant hull'},
    cruiser:{minimumSuccess:99.85,label:'crewed major combatant'},
    capital:{minimumSuccess:99.9,label:'crewed capital asset'},
    megastructure:{minimumSuccess:99.95,label:'public strategic infrastructure'}
  });
  function policy(result){return scalePolicy[result.identity?.scaleKey]||scalePolicy.frigate;}
  function statusRank(value){return{authorized:0,'conditionally authorized':1,restricted:2,refused:3}[value]??2;}
  function worstStatus(...values){return values.sort((a,b)=>statusRank(b)-statusRank(a))[0]||'restricted';}
  globalThis.BlacklightExoFTLCertificationAudit={base,EPS,clamp,finite,num,pct,seconds,distance,mass,probability,scalePolicy,policy,statusRank,worstStatus};
})();
