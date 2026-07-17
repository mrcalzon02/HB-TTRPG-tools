(() => {
  'use strict';
  const A=globalThis.BlacklightExoFTLCalculationAudit;if(!A)return;
  const {EPS,clamp,finite,num,pct,seconds,energy,power,mass,confidence,range,system}=A;
  A.energyLedger=function(result,context){
    const e=result.energyBudget||{},p=result.power||{},plant=system(result);
    const activation=Math.max(0,finite(e.activationJ,p.activationJ)),transit=Math.max(0,finite(e.transitJ)),collapse=Math.max(0,finite(e.collapseJ));
    const mission=Math.max(EPS,finite(e.missionJ,activation+transit+collapse)),peak=Math.max(EPS,finite(e.peakPowerW,p.averagePowerW)),recharge=Math.max(EPS,finite(e.rechargeSeconds));
    const fuel=Math.max(0,finite(e.missionFuelKg)),efficiency=clamp(finite(plant?.efficiency,1),EPS,1),specific=Math.max(EPS,finite(plant?.specific,fuel>0?mission/(fuel*efficiency):mission));
    const thermal=Math.max(0,finite(e.thermalDebtJ)),thermalFraction=thermal/mission,multiplier=Math.max(EPS,finite(e.pathEnergyMultiplier,1)),mature=mission/multiplier;
    const sensitivity=clamp((6-context.rank)*.045+Math.abs(1-efficiency)*.16+(1-context.routeAvailability/100)*.22+.05,.05,.75);
    return{
      confidence:confidence(context.rank,'modeled',context.routeAvailability,context.reliability),
      energySystem:{label:result.identity?.energySystem||'unidentified energy architecture',specificEnergyJkg:specific,efficiency,efficiencyText:pct(efficiency*100,3),note:plant?'Specific energy and conversion efficiency come from the selected in-universe energy architecture.':'The public energy-system table did not resolve this architecture; the audit inferred only what was required to retain the generated fuel figure.'},
      assumptions:[
        `The mission is divided into field formation (${energy(activation)}), transit or acceleration (${energy(transit)}), and controlled termination (${energy(collapse)}).`,
        `Path ${context.rank} applies a ${num(multiplier,4)}× maturity burden to the underlying architecture.`,
        `Fuel conversion uses ${result.identity?.energySystem||'the selected energy system'} at ${pct(efficiency*100,3)} modeled efficiency.`,
        'Thermal debt is energy the vessel must store, radiate, convert, or deliberately discharge after useful work is complete.'
      ],
      calculations:[
        {key:'mission-sum',label:'Complete mission energy',expression:'formation + transit + termination',substitution:`${energy(activation)} + ${energy(transit)} + ${energy(collapse)}`,result:mission,resultText:energy(mission),meaning:`${pct(activation/mission*100,2)} formation, ${pct(transit/mission*100,2)} transit, and ${pct(collapse/mission*100,2)} termination.`,confidence:confidence(context.rank,'derived',context.routeAvailability,context.reliability)},
        {key:'maturity-burden',label:'Underlying mature-equivalent energy',expression:'complete mission energy ÷ path maturity burden',substitution:`${energy(mission)} ÷ ${num(multiplier,4)}`,result:mature,resultText:energy(mature),meaning:`Approximately ${energy(mission-mature)} is attributed to immature control, oversized fields, containment loss, charge leakage, and poor recovery.`,confidence:confidence(context.rank,'modeled',context.routeAvailability,context.reliability)},
        {key:'fuel-conversion',label:'Energy-medium requirement',expression:'mission energy ÷ (specific energy × efficiency)',substitution:`${energy(mission)} ÷ (${num(specific,5)} J/kg × ${num(efficiency,6)})`,result:fuel,resultText:mass(fuel),meaning:'This is active energy medium, not containment, shielding, tanks, pumps, reserve segregation, or the power plant.',confidence:confidence(context.rank,plant?'derived':'modeled',context.routeAvailability,context.reliability)},
        {key:'recharge-power',label:'Implied recharge power',expression:'mission energy ÷ recharge interval',substitution:`${energy(mission)} ÷ ${seconds(recharge)}`,result:mission/recharge,resultText:power(mission/recharge),meaning:`Recharge averages ${pct((mission/recharge)/peak*100,3)} of peak delivery. It remains a sustained industrial burden even when far below the activation pulse.`,confidence:confidence(context.rank,'derived',context.routeAvailability,context.reliability)},
        {key:'thermal-debt',label:'Irreversible thermal and disposal burden',expression:'thermal debt ÷ complete mission energy',substitution:`${energy(thermal)} ÷ ${energy(mission)}`,result:thermalFraction,resultText:`${pct(thermalFraction*100,3)} of mission energy`,meaning:`${pct((1-thermalFraction)*100,3)} remains outside this thermal-loss account. That remainder includes useful work, stored or recovered field energy, radiation, and other modeled channels.`,confidence:confidence(context.rank,'modeled',context.routeAvailability,context.reliability)}
      ],
      sensitivity:{fraction:sensitivity,fractionText:pct(sensitivity*100,1),missionJ:range(mission,sensitivity,EPS),fuelKg:range(fuel,sensitivity,0),rechargeSeconds:range(recharge,sensitivity,EPS),thermalJ:range(thermal,Math.min(.9,sensitivity*1.15),0),explanation:`The ±${pct(sensitivity*100,1)} energy sensitivity is driven by maturity, conversion assumptions, route availability, and modeled exotic-field losses.`},
      interpretation:thermalFraction>.7?'The machine is principally a heat-management project with a transit effect attached.':multiplier>10?'Maturity burden dominates the account; better containment and recovery are more valuable than a higher nominal speed.':'No single loss channel dominates, so improvements must be distributed across formation, transit, termination, and recovery.',
      warning:finite(e.tankageCycles,0)<=2?'Carried energy medium supports very few complete missions. Replenishment infrastructure is part of the drive system, not ordinary logistics.':'Generated tankage supports repeated complete missions, subject to thermal recovery and maintenance limits.'
    };
  };
})();
