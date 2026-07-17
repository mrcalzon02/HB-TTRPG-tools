(() => {
  'use strict';
  if (globalThis.BlacklightExoVesselManufacturerDefinitions) return;

  const focusProfiles = [
    {key:'CONTINUITY',label:'Continuity and long-service works',architectureNudge:.10,standardization:.08,modularity:-.08,quality:.10,automation:-.02,serviceLife:1.35,prototype:.55,legacy:1.15,topology:{MONOCOQUE:.16,SPINE:-.04,CLUSTER:-.06,RING:.02,HYBRID:-.08}},
    {key:'MODULAR',label:'Modular industrial systems',architectureNudge:-.14,standardization:.12,modularity:.18,quality:.02,automation:.06,serviceLife:.92,prototype:.85,legacy:.90,topology:{MONOCOQUE:-.12,SPINE:.12,CLUSTER:.10,RING:-.06,HYBRID:-.04}},
    {key:'PRECISION',label:'High-specification advanced fabrication',architectureNudge:.02,standardization:.08,modularity:.04,quality:.18,automation:.14,serviceLife:1.08,prototype:1.65,legacy:.45,topology:{MONOCOQUE:.02,SPINE:-.02,CLUSTER:-.04,RING:.08,HYBRID:-.04}},
    {key:'FRONTIER',label:'Frontier repair and refit yards',architectureNudge:-.08,standardization:-.16,modularity:.14,quality:-.04,automation:-.04,serviceLife:1.12,prototype:1.20,legacy:1.45,topology:{MONOCOQUE:-.10,SPINE:.08,CLUSTER:.14,RING:-.08,HYBRID:-.04}}
  ];

  const archetypeMatrices = {
    VAULT_KEEPER:{
      topology:{MONOCOQUE:.48,SPINE:.10,CLUSTER:.05,RING:.17,HYBRID:.20},
      variants:{LEGACY:.08,STANDARD:.62,REFINED:.18,ADVANCED:.09,PROTOTYPE:.03},
      materials:['heavy composite plate','ceramic-metal pressure laminate','radiation-loaded structural polymer','boron-rich shadow shielding'],
      repair:['protected internal overhaul galleries','compartment-by-compartment isolation','scheduled deep-vault refit'],
      visual:['continuous armored pressure envelope','recessed machinery apertures','layered citadel sections','few exposed conduits'],
      weapons:['missiles','countermeasure missiles','lasers','coil guns']
    },
    VOID_NOMAD:{
      topology:{MONOCOQUE:.05,SPINE:.38,CLUSTER:.30,RING:.05,HYBRID:.22},
      variants:{LEGACY:.18,STANDARD:.42,REFINED:.14,ADVANCED:.08,PROTOTYPE:.18},
      materials:['open nickel-iron industrial truss','carbon lattice rail','reclaimed pressure modules','replaceable ceramic bumper panels'],
      repair:['external module exchange','mixed-standard adapter frames','salvage-compatible field reconstruction'],
      visual:['long exposed structural spine','asymmetric replacement pods','visible tank and radiator farms','nonuniform refit scars'],
      weapons:['missiles','sand guns','coil guns','chemical ballistics']
    },
    CORP_LOGISTICS:{
      topology:{MONOCOQUE:.16,SPINE:.29,CLUSTER:.10,RING:.05,HYBRID:.40},
      variants:{LEGACY:.08,STANDARD:.72,REFINED:.13,ADVANCED:.05,PROTOTYPE:.02},
      materials:['monocoque frame with external service rails','standardized aluminum-titanium truss','commercial ceramic debris panel','replaceable freight hardpoint lattice'],
      repair:['line-replaceable unit exchange','licensed service-bay maintenance','predictable inspection and fleet-parts rotation'],
      visual:['regular container and machinery spacing','standard hardpoint intervals','clear cargo handling corridors','manufacturer-identical service panels'],
      weapons:['countermeasure missiles','lasers','chemical ballistics','missiles']
    },
    APEX_WARLORD:{
      topology:{MONOCOQUE:.31,SPINE:.20,CLUSTER:.09,RING:.08,HYBRID:.32},
      variants:{LEGACY:.07,STANDARD:.52,REFINED:.16,ADVANCED:.20,PROTOTYPE:.05},
      materials:['layered ablative armor','high-strength armored keel','spaced ceramic-metal battle plate','sacrificial external weapon truss'],
      repair:['armored damage-control galleries','battle-replaceable external combat pods','redundant combat-system rerouting'],
      visual:['armored central citadel','distributed weapon and sensor blisters','redundant engine clusters','threat-facing armor concentration'],
      weapons:['missiles','coil guns','rail guns','lasers','sand guns']
    }
  };

  const materialRules = [
    {pattern:/icebound|cryosphere|ammonia|low temperature/i,materials:['cryogenic composite pressure shell','low-temperature nickel alloy']},
    {pattern:/high-gravity|pressure|subterranean|ocean/i,materials:['high-pressure ceramic-metal laminate','deep-load continuous frame']},
    {pattern:/radiation|toxic|stellar|orbital denial/i,materials:['radiation-loaded boron composite','sacrificial ceramic ablator']},
    {pattern:/synthetic|machine|post-material|advanced interstellar/i,materials:['precision-grown carbon lattice','metamaterial service panel']},
    {pattern:/salvage|relic|clan|distributed|militia/i,materials:['reclaimed industrial truss','multi-standard adapter collar']},
    {pattern:/corporate|commercial|transit-service|export economy/i,materials:['certified modular monocoque','standard freight hardpoint rail']}
  ];

  const nameRoots=['Aster','Khe','Orin','Prax','Vey','Talon','Rhea','Nex','Ilyr','Qin','Drax','Lumen'];
  const nameMiddles=['Continuity','Transit','Orbital','Void','Deep','Vector','Keel','Habitat','Systems','Fabrication','Yard','Works'];
  const nameEnds=['Works','Systems','Fabrication','Yards','Consortium','Forge','Industries','Collective','Directorate','Assembly'];

  const visualAxes = {
    symmetry:['strict bilateral symmetry','functional bilateral symmetry','radial subsystem repetition','deliberate asymmetric service geometry'],
    surface:['continuous plated shell','segmented pressure cells','open truss and detachable pods','hybrid citadel with exposed rails'],
    rhythm:['regular standardized bays','long machinery blocks','clustered replaceable pods','species-scale repeating compartments'],
    sensors:['distributed protected apertures','long-baseline boom arrays','replaceable external sensor bricks','armored dorsal and ventral blisters'],
    radiators:['recessed shuttered panels','deployable lateral wings','distributed truss radiators','trailing shadowed radiator farms']
  };

  globalThis.BlacklightExoVesselManufacturerDefinitions=Object.freeze({
    schemaVersion:'1.0.0',
    catalogSize:4,
    focusProfiles,
    archetypeMatrices,
    materialRules,
    nameRoots,
    nameMiddles,
    nameEnds,
    visualAxes
  });
})();