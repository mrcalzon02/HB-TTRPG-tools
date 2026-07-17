(() => {
  'use strict';
  const A=globalThis.BlacklightExoFTLCalculationAudit;if(!A)return;
  const {EPS,C_AU_S,clamp,finite,num,pct,seconds,confidence,range,isDiscrete}=A;
  A.performanceLedger=function(result,context){
    const p=result.performance||{},k=result.kinematics||{};
    const distance=Math.max(EPS,finite(p.referenceDistanceAU,1)),clean=Math.max(EPS,finite(p.ratedCleanSpaceC)),practical=Math.max(EPS,finite(p.practicalRouteC));
    const routeFactor=practical/clean,auSecond=practical*C_AU_S,equivalent=distance/Math.max(EPS,auSecond);
    const payload=Math.max(EPS,finite(k.payloadTransitSeconds,finite(p.transitSeconds,equivalent))),spool=Math.max(0,finite(p.spoolSeconds)),cooldown=Math.max(0,finite(p.cooldownSeconds));
    const complete=Math.max(EPS,finite(k.completeMissionSeconds,spool+payload+cooldown)),overhead=spool+cooldown,lightTime=distance/C_AU_S,discrete=isDiscrete(result);
    const type=discrete?'modeled':'derived',c=confidence(context.rank,type,context.routeAvailability,context.reliability);
    const sensitivity=clamp((1-context.routeAvailability/100)*.35+(1-context.reliability/100)*1.8+(6-context.rank)*.025+(discrete?.08:.03),.03,.65);
    return{
      classification:discrete?'discrete or noncontinuous transit':'continuous-equivalent transit',confidence:c,
      assumptions:[
        `The reference route is ${num(distance,6)} AU and the selected environment is ${result.routeEnvelope?.routeLabel||result.identity?.routeKey||'not identified'}.`,
        `The clean-space rating is ${num(clean,7)} c; the route-certified rating is ${num(practical,7)} c.`,
        `The model treats spool (${seconds(spool)}), payload crossing (${seconds(payload)}), and recovery (${seconds(cooldown)}) as separate intervals.`,
        discrete?'The crossing interval comes from the family-specific transition model. The continuous-equivalent rate exists only for comparison.':'The payload interval is reference distance divided by the route-certified continuous-equivalent rate.'
      ],
      calculations:[
        {key:'route-factor',label:'Route retention factor',expression:'route-certified c ÷ clean-space c',substitution:`${num(practical,7)} ÷ ${num(clean,7)}`,result:routeFactor,resultText:`${pct(routeFactor*100,4)} of clean-space capability retained`,meaning:routeFactor>=1?'The route does not degrade the clean-space rating in this case.':`The route removes ${pct((1-routeFactor)*100,3)} of clean-space capability through environmental and certification constraints.`,confidence:confidence(context.rank,'derived',context.routeAvailability,context.reliability)},
        {key:'au-rate',label:'Route rate in astronomical units',expression:'route-certified c × light speed in AU/s',substitution:`${num(practical,7)} × ${num(C_AU_S,10)} AU/s`,result:auSecond,resultText:`${num(auSecond,9)} AU/s`,meaning:'This is a comparison rate. For a fold, gate, or state translation it is not local hull velocity.',confidence:confidence(context.rank,'derived',context.routeAvailability,context.reliability)},
        {key:'payload-crossing',label:'Payload crossing interval',expression:discrete?'family-specific crossing model':'reference distance ÷ route rate',substitution:discrete?`${k.ratingBasis||'Discrete crossing model'}; reference distance ${num(distance,6)} AU`:`${num(distance,6)} AU ÷ ${num(auSecond,9)} AU/s`,result:payload,resultText:seconds(payload),meaning:discrete?'This is the interval experienced by the payload model, not proof of continuous motion through intervening space.':'This is the interval between committed departure and completed arrival before charge and recovery.',confidence:confidence(context.rank,type,context.routeAvailability,context.reliability)},
        {key:'mission-response',label:'Complete mission response',expression:'spool + payload crossing + controlled recovery',substitution:`${seconds(spool)} + ${seconds(payload)} + ${seconds(cooldown)}`,result:complete,resultText:seconds(complete),meaning:`${pct(overhead/complete*100,2)} of the mission is charge and recovery overhead; ${pct(payload/complete*100,2)} is payload transit.`,confidence:confidence(context.rank,'derived',context.routeAvailability,context.reliability)},
        {key:'mission-equivalent-c',label:'Mission-effective light-time compression',expression:'reference light time ÷ complete mission time',substitution:`${seconds(lightTime)} ÷ ${seconds(complete)}`,result:lightTime/complete,resultText:`${num(lightTime/complete,7)} c mission-equivalent`,meaning:'This is the honest end-to-end comparison after preparation and recovery. Early systems often perform far below their headline crossing rate.',confidence:confidence(context.rank,'derived',context.routeAvailability,context.reliability)}
      ],
      sensitivity:{fraction:sensitivity,fractionText:pct(sensitivity*100,1),payloadSeconds:range(payload,sensitivity,EPS),completeSeconds:range(complete,sensitivity,EPS),practicalC:range(practical,sensitivity,EPS),explanation:`The ±${pct(sensitivity*100,1)} band is a sensitivity envelope derived from route availability, reliability, maturity, and transit type. It is not a measured confidence interval.`},
      interpretation:routeFactor<.25?'The drive is dominated by route conditions; the clean-space figure is a laboratory capability and the practical figure is the actual machine.':overhead/complete>.6?'The machine is fast after commitment but operationally slow because charge and recovery dominate the mission.':'The route-certified rate and complete mission response are close enough to remain operationally representative.',
      warning:finite(p.minimumUsefulC,-1)>0&&practical<=finite(p.minimumUsefulC)*1.000001?'This result rests on the minimum-useful-performance floor. Treat the exact route rate as a design requirement imposed by the model, not an independently emerging prediction.':'No minimum-performance floor appears to determine the nominal route rate.'
    };
  };
})();
