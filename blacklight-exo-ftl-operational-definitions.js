(() => {
  'use strict';

  const SCALES = [
    {key:'probe',label:'Uncrewed probe',mass:[1,40],speed:1.22,range:1.18,energy:.58,accuracy:.78,spool:.7,minTier:0,challenge:'radiation-hard autonomous navigation and no crew recovery margin'},
    {key:'fighter',label:'Fighter or strike craft',mass:[18,180],speed:1.16,range:.72,energy:.82,accuracy:1.08,spool:.55,minTier:7,challenge:'extreme miniaturization with almost no redundant field hardware'},
    {key:'shuttle',label:'Shuttle or courier',mass:[120,2200],speed:1.1,range:.9,energy:.9,accuracy:.9,spool:.72,minTier:1,challenge:'compact field coils and limited thermal reserve'},
    {key:'corvette',label:'Corvette',mass:[1800,18000],speed:1.04,range:1,energy:1,accuracy:1,spool:.88,minTier:2,challenge:'military responsiveness without sacrificing field symmetry'},
    {key:'frigate',label:'Frigate or merchant hull',mass:[15000,180000],speed:1,range:1.08,energy:1.08,accuracy:.92,spool:1,minTier:3,challenge:'maintaining a uniform field around cargo, modular hulls, and battle damage'},
    {key:'cruiser',label:'Cruiser',mass:[160000,1800000],speed:.94,range:1.22,energy:1.18,accuracy:.86,spool:1.18,minTier:3,challenge:'large-aperture field control and combat redundancy'},
    {key:'capital',label:'Capital ship or carrier',mass:[1500000,24000000],speed:.86,range:1.42,energy:1.34,accuracy:.8,spool:1.45,minTier:4,challenge:'fielding a stable envelope around kilometers of mass and internal movement'},
    {key:'megastructure',label:'Gatework or megastructure',mass:[2.4e7,2.4e10],speed:.72,range:2.8,energy:1.65,accuracy:.35,spool:2.4,minTier:2,challenge:'planetary-scale construction, synchronization, and strategic immobility'}
  ];

  const INFRASTRUCTURES = [
    {key:'self-contained',label:'Self-contained ship drive',speed:.94,range:.82,energy:1.28,accuracy:1.15,spool:1.08,description:'The vessel carries every field, navigation, power, and emergence system required for independent transit.'},
    {key:'beacon-assisted',label:'Beacon-assisted navigation',speed:1.08,range:1.2,energy:.94,accuracy:.62,spool:.78,description:'Remote phase, timing, or gravity references reduce solution uncertainty but create dependence on trusted navigation infrastructure.'},
    {key:'corridor',label:'Prepared transit corridor',speed:1.32,range:1.55,energy:.78,accuracy:.48,spool:.66,description:'A surveyed and continuously maintained route supports faster, safer travel than open-space operation.'},
    {key:'paired-gate',label:'Paired mobile or orbital gates',speed:1.7,range:2.1,energy:.62,accuracy:.22,spool:.42,description:'Both endpoints provide active field support. Strategic access is limited to prepared destinations.'},
    {key:'fixed-gate',label:'Fixed stellar gateworks',speed:2.35,range:3.4,energy:.48,accuracy:.12,spool:.28,description:'Colossal anchored infrastructure provides exceptional range and throughput at the cost of immobility and network dependence.'}
  ];

  const ROUTES = [
    {key:'deep-space',label:'Deep interstellar space',speed:1,gradient:1,error:1,heat:1,description:'Low local curvature and sparse matter provide the clean reference environment for the rating.'},
    {key:'planetary-well',label:'Planetary gravity well',speed:.72,gradient:2.2,error:2.4,heat:1.08,description:'Departure or emergence occurs near a planet where local acceleration and tidal gradients distort the field solution.'},
    {key:'gas-giant',label:'Gas-giant and magnetosphere region',speed:.61,gradient:3.1,error:3.3,heat:1.22,description:'Strong gravity, radiation belts, plasma, and magnetic phase noise complicate both navigation and field formation.'},
    {key:'binary',label:'Binary or multiple-star system',speed:.68,gradient:3.7,error:4.1,heat:1.12,description:'Moving barycenters and overlapping gravity gradients create narrow and time-dependent transit windows.'},
    {key:'compact-object',label:'Compact-object neighborhood',speed:.34,gradient:8.5,error:11,heat:1.45,description:'Neutron stars, black holes, or similarly steep curvature may exceed the drive’s normal operating envelope.'},
    {key:'nebula',label:'Dense plasma or nebular region',speed:.78,gradient:1.35,error:1.8,heat:1.38,description:'Matter density, charge separation, and sensor scattering degrade route certainty even when gravity remains mild.'},
    {key:'uncharted',label:'Uncharted route',speed:.64,gradient:1.8,error:5.4,heat:1.06,description:'The dominant limitation is incomplete knowledge: unknown mass shadows, phase defects, and moving hazards.'},
    {key:'q-disturbed',label:'Q-space or N-space disturbed region',speed:.43,gradient:2.5,error:9.2,heat:1.3,description:'Higher-dimensional turbulence invalidates ordinary route extrapolation and can change while the vessel is in transit.'}
  ];

  const DOCTRINES = [
    {key:'balanced',label:'Balanced fleet standard',speed:1,range:1,energy:1,accuracy:1,spool:1},
    {key:'speed',label:'Maximum transit speed',speed:1.42,range:.78,energy:1.72,accuracy:1.55,spool:.82},
    {key:'range',label:'Maximum single-transit range',speed:.88,range:1.72,energy:1.3,accuracy:1.18,spool:1.14},
    {key:'efficiency',label:'Fuel and thermal efficiency',speed:.72,range:1.05,energy:.58,accuracy:.88,spool:1.3},
    {key:'precision',label:'Precision emergence',speed:.78,range:.84,energy:1.14,accuracy:.38,spool:1.26},
    {key:'tactical',label:'Rapid tactical cycling',speed:1.08,range:.62,energy:1.34,accuracy:1.2,spool:.46}
  ];

  const ENERGY = [
    {key:'fusion-bank',label:'Fusion pulse banks',minTier:0,specific:3.2e14,efficiency:.41,recharge:'refuelable from deuterium, tritium, or helium-3 supply chains',fuel:'fusion isotopes and high-density capacitor working fluid',waste:'large sustained thermal load',hurdle:'capacitor mass and radiator area dominate the installation'},
    {key:'antimatter',label:'Antimatter-catalyzed field plant',minTier:1,specific:8.5e16,efficiency:.58,recharge:'requires industrial antimatter production and magnetically isolated storage',fuel:'antimatter with conventional reaction mass or field medium',waste:'intense prompt radiation and containment heat',hurdle:'storage failure is equivalent to a strategic weapon detonation'},
    {key:'singularity',label:'Contained micro-singularity accumulator',minTier:3,specific:5e17,efficiency:.69,recharge:'fed with mass and angular momentum through specialized containment infrastructure',fuel:'ordinary mass converted through a controlled compact-object process',waste:'hard radiation, tidal containment stress, and long shutdown times',hurdle:'the power source remains hazardous even when the drive is offline'},
    {key:'vacuum-cell',label:'Metastable vacuum-polarization cells',minTier:3,specific:1.8e18,efficiency:.74,recharge:'cells must be reconditioned in precision field foundries',fuel:'precharged Casimir or vacuum-polarization modules',waste:'low bulk heat but severe field-coil stress',hurdle:'damaged cells can decay into uncontrolled metric noise'},
    {key:'q-condensate',label:'Q-state condensate reservoir',minTier:4,specific:8e18,efficiency:.82,recharge:'requires Q-phase refineries and protected dimensional handling',fuel:'metastable higher-dimensional condensate',waste:'phase contamination and localized reality-index drift',hurdle:'the fuel must remain coherent with the drive’s current dimensional index'},
    {key:'star-fed',label:'Direct stellar power and mass tap',minTier:2,specific:2e19,efficiency:.87,recharge:'continuous collection from a star, accretion source, or equivalent fixed industrial supply',fuel:'stellar plasma, magnetic flux, and massive stationary energy storage',waste:'station-scale heat rejection and electromagnetic emissions',hurdle:'only fixed gateworks can support the collectors, storage, and structural separation required'}
  ];

  const GENERAL_HURDLES = [
    'Field metrology must resolve distortions smaller than the hull while the external route spans astronomical distances.',
    'The navigation system must distinguish real gravitational mass from sensor noise, cloaking, and higher-dimensional projection artifacts.',
    'Every drive needs a safe abort state that does not simply convert field energy into hull stress or radiation.',
    'Power delivery must rise to full field strength without producing destructive asymmetry between drive sectors.',
    'Heat generated during spool and collapse must be stored or radiated without exposing the vessel before it can maneuver.',
    'Arrival sensors cannot depend entirely on information that would have needed to travel faster than the ship.',
    'Civilian certification requires repeatable limits, while military operation rewards pushing beyond those limits.',
    'Field interaction between nearby ships can invalidate individually correct navigation solutions.',
    'Drive calibration drifts as coils age, hull mass distribution changes, or modular cargo is loaded.',
    'The ship must reconcile relativistic clock, destination ephemeris, and dimensional phase time.'
  ];

  const GRAVITY_LIMITS = [
    'Operation is prohibited inside the modeled mass-shadow boundary of a star or giant planet.',
    'The departure vector must remain within the permitted angle of the local barycentric plane.',
    'Tidal-gradient variation across the hull must remain below the field controller’s differential limit.',
    'Unmapped moons, rogue planets, or dense artificial structures can create a route-breaking gravity ridge.',
    'The drive must cross local Lagrange regions slowly because competing gravitational solutions can cause mode hopping.',
    'Strong magnetospheres can interfere with phase sensors even when the gravitational field itself is acceptable.',
    'A compact object can distort the destination solution long before ordinary sensors identify it.',
    'Artificial gravity generators and active mass manipulation near a port can corrupt drive calibration.'
  ];

  const QN_FACTORS = [
    'Q-phase index must match the destination epoch within the generated coherence window.',
    'N-dimensional embedding axes must remain ordered; axis permutation can rotate or invert the return projection.',
    'Higher-dimensional turbulence may be direction-dependent and cannot be inferred from a reverse route.',
    'Dimensional defects can persist after major stellar events or repeated heavy gate use.',
    'A route solution may be locally optimal but topologically intersect an unseen higher-dimensional obstacle.',
    'Phase references can be spoofed, captured, or allowed to drift as a form of strategic interdiction.',
    'Chronometric shear can separate ship time, local time, and network scheduling time.',
    'The computational cost rises sharply with every additional active dimension and moving gravity source.'
  ];

  const EDGE_CASES = [
    'Atmospheric activation can couple the field to ionized air and produce a destructive surface discharge.',
    'A ship carrying a large movable cargo can invalidate its own calibrated mass map during transit.',
    'Docking with another vessel may create a combined hull geometry the drive was never certified to enclose.',
    'Launching immediately after weapons fire can confuse field sensors with local plasma and gravitational transients.',
    'A destination under construction may move enough mass to invalidate a previously reliable emergence volume.',
    'Emergency shutdown can preserve the crew but strand the vessel at a large residual velocity.',
    'Transit through a route with an active gate wake can either accelerate or destabilize an independent drive.',
    'A formation can arrive separated by millions of kilometers even when every craft used the same target coordinates.',
    'Computer compromise can alter a safe coordinate solution without changing the visible destination label.',
    'A rescue attempt near a failed drive may trigger sympathetic field collapse in the rescue vessel.',
    'A drive may remain mechanically functional while legally unusable because its phase keys or route licenses are invalid.',
    'Crossing a jurisdictional border during transit can create disputes over which law governed an onboard event.'
  ];

  globalThis.BlacklightExoFTLOperationalDefinitions=Object.freeze({
    scales:Object.freeze(SCALES),
    infrastructures:Object.freeze(INFRASTRUCTURES),
    routes:Object.freeze(ROUTES),
    doctrines:Object.freeze(DOCTRINES),
    energySystems:Object.freeze(ENERGY),
    generalHurdles:Object.freeze(GENERAL_HURDLES),
    gravityLimits:Object.freeze(GRAVITY_LIMITS),
    qnFactors:Object.freeze(QN_FACTORS),
    edgeCases:Object.freeze(EDGE_CASES)
  });
})();