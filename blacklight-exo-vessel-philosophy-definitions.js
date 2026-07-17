(() => {
  'use strict';
  if (globalThis.BlacklightExoVesselPhilosophyDefinitions) return;

  const philosophies = {
    INTERNAL: {
      key:'INTERNAL',label:'Internals-first pressure-vault architecture',shortLabel:'Internals-first',
      massMultiplier:1.25,volumeMultiplier:1.40,armorEfficiency:1.30,repairTimeMultiplier:1.50,
      cascadeRisk:'high',cascadeRiskIndex:.78,thermalSignatureMultiplier:.80,
      attachmentProperty:'ATMOSPHERE_MANIFOLD',utilityRouting:'INTEGRATED',structuralEnvelope:'PRESSURE_VAULT',
      principle:'The vessel is treated as one inhabited armored machine. Critical equipment is buried behind the primary hull belt and reached through protected internal circulation, atmosphere, power, coolant, and data trunks.',
      benefits:['Global armor protects many systems with one continuous belt.','Crew can inspect and repair machinery without routine EVA.','Internal utility trunks are short, protected, and easy to monitor from one damage-control network.','Pressure-vault compartmentation supports long-duration habitation and conservative evacuation planning.'],
      tradeoffs:['Pressure hulls, corridors, buffer spaces, and access galleries add mass and volume.','Buried machinery takes longer to reach, isolate, remove, and replace.','Fire, coolant loss, contamination, and decompression can propagate through shared inhabited infrastructure.','Heat is easier to conceal but harder to conduct through the armored envelope to radiators.']
    },
    EVA: {
      key:'EVA',label:'EVA-first modular truss architecture',shortLabel:'EVA-first',
      massMultiplier:.85,volumeMultiplier:1.00,armorEfficiency:.90,repairTimeMultiplier:.50,
      cascadeRisk:'low',cascadeRiskIndex:.24,thermalSignatureMultiplier:1.20,
      attachmentProperty:'VACUUM_EXPOSED',utilityRouting:'DISCONNECT_VALVES',structuralEnvelope:'EXPOSED_TRUSS',
      principle:'The vessel is treated as a protected crew nucleus attached to a vacuum-native industrial machine. Most serviceable systems remain outside the pressure boundary on standardized structural, power, coolant, and data hardpoints.',
      benefits:['Vacuum-native modules avoid duplicate pressure shells and internal access corridors.','Damaged pods can be isolated, detached, abandoned, or replaced rapidly.','Fire, contamination, and mechanical destruction usually remain local to one truss branch.','Radiators and high-temperature machinery reject heat directly to space with short conductive paths.'],
      tradeoffs:['Each exposed pod requires local micrometeoroid, radiation, and battle-damage protection.','Routine maintenance depends on EVA crews, teleoperators, drones, or manipulators.','External conduits and hardpoints are visible, vulnerable, and thermally conspicuous.','Crew survival depends on the continued integrity of a smaller number of protected habitat and transfer nodes.']
    }
  };

  const moduleTypes = {
    drive:{label:'Transit drive',internalForm:'Buried Field Vault',evaForm:'Truss-Mounted Field Array',internalTag:'GEN_PROP: STRUCTURAL_KEEL_VAULT',evaTag:'GEN_PROP: VACUUM_FIELD_TRUSS',crewDependent:false},
    'drive-integration':{label:'Drive integration',internalForm:'Armored Coverage Gallery',evaForm:'External Coverage Cage',internalTag:'FIELD_ROUTE: INTERNAL_KEEL',evaTag:'FIELD_ROUTE: EXTERNAL_CAGE',crewDependent:false},
    power:{label:'Power plant',internalForm:'Vault Core',evaForm:'Outrigger Pod',internalTag:'GEN_PROP: CENTER_OF_MASS',evaTag:'GEN_PROP: AFT_BOOM_ATTACH',crewDependent:false},
    'life-support':{label:'Life support',internalForm:'Distributed Manifold',evaForm:'Modular Canisters',internalTag:'PLUMBING: INTEGRATED',evaTag:'PLUMBING: DISCONNECT_VALVES',crewDependent:true},
    fuel:{label:'Fuel / propellant',internalForm:'Armored Internal Bladders',evaForm:'Saddle Tanks',internalTag:'HULL_SHAPE: SMOOTH',evaTag:'HULL_SHAPE: EXPOSED_TRUSS',crewDependent:false},
    navigation:{label:'Avionics / mainframe',internalForm:'Shirtsleeve Server Room',evaForm:'Rad-Hardened Bricks',internalTag:'COOLING: CONVECTIVE',evaTag:'COOLING: CONDUCTIVE_PLATE',crewDependent:false},
    payload:{label:'Cargo / logistics',internalForm:'Internal Staging Bays',evaForm:'Cargo Container Arrays',internalTag:'BAY_TYPE: DECK_SPACE',evaTag:'BAY_TYPE: MAG_ANCHOR_GRID',crewDependent:false},
    thermal:{label:'Thermal control',internalForm:'Armored Coolant Trunks and Heat Vaults',evaForm:'Deployable Radiator Farms',internalTag:'THERMAL: INTERNAL_HEAT_BUS',evaTag:'THERMAL: VACUUM_RADIATOR_BRANCH',crewDependent:false},
    shielding:{label:'Protection',internalForm:'Continuous Primary Armor Belt',evaForm:'Localized Pod and Shadow Shields',internalTag:'ARMOR: GLOBAL_BELT',evaTag:'ARMOR: LOCAL_POD',crewDependent:false},
    maintenance:{label:'Maintenance',internalForm:'Pressurized Service Galleries',evaForm:'External Service Gantries',internalTag:'SERVICE: INTERNAL_ACCESS',evaTag:'SERVICE: EVA_SWAP',crewDependent:true},
    structure:{label:'Primary structure',internalForm:'Monocoque Pressure Citadel',evaForm:'Open Industrial Truss',internalTag:'STRUCTURE: PRESSURE_MONOCOQUE',evaTag:'STRUCTURE: OPEN_TRUSS',crewDependent:false},
    maneuver:{label:'Conventional propulsion',internalForm:'Armored Thrust Tunnels',evaForm:'Detachable Engine Clusters',internalTag:'PROPULSION: BURIED_THRUST_FRAME',evaTag:'PROPULSION: EXTERNAL_CLUSTER',crewDependent:false},
    margin:{label:'Growth margin',internalForm:'Reserved Internal Machinery Voids',evaForm:'Reserved External Hardpoints',internalTag:'MARGIN: INTERNAL_VOID',evaTag:'MARGIN: VACUUM_HARDPOINT',crewDependent:false}
  };

  const archetypes = [
    {key:'VAULT_KEEPER',label:'Vault Keeper',internalsBias:.90,evaBias:.10,material:'Heavy Composite Plate',variance:.05,standardization:.74,description:'Subterranean, high-pressure, or siege-conditioned builders that regard the hull as a protective inhabited vault.'},
    {key:'VOID_NOMAD',label:'Void Nomad',internalsBias:.15,evaBias:.85,material:'Open Industrial Truss',variance:.20,standardization:.42,description:'Scavenger, migratory, or decentralized builders that treat exposed modular replacement as ordinary shipkeeping.'},
    {key:'CORP_LOGISTICS',label:'Corporate Logistics',internalsBias:.40,evaBias:.60,material:'Monocoque Frame / External Rails',variance:.10,standardization:.94,description:'Standardized commercial builders that bury crew-critical systems while exposing freight, tanks, radiators, and replaceable machinery.'},
    {key:'APEX_WARLORD',label:'Apex Warlord',internalsBias:.75,evaBias:.25,material:'Layered Ablative Armor',variance:.08,standardization:.68,description:'Fortress-oriented military builders that bury critical systems and expose expendable utility, weapon, sensor, and maneuver pods.'}
  ];

  const germinationSequence = [
    {step:1,key:'READ_SEED',label:'Read generation seed',output:'Origin profile, architectural weights, material flag, class mass and volume limits.'},
    {step:2,key:'GENERATE_SPINE',label:'Generate structural spine',output:'Pressure-vault envelope, open truss, or hybrid citadel-and-rail structure.'},
    {step:3,key:'ROUTE_INFRASTRUCTURE',label:'Route critical infrastructure',output:'Integrated internal trunks or isolated exterior power, heat, atmosphere, and data buses.'},
    {step:4,key:'POPULATE_MODULES',label:'Populate subsystem modules',output:'Concrete internal or EVA form, hardpoint parent, attachment property, and service method for every required ship system.'},
    {step:5,key:'APPLY_ACTUARY',label:'Apply actuarial modifiers',output:'Final mass, volume, armor behavior, repair burden, cascading-risk index, thermal signature, production factor, and maintainability rating.'}
  ];

  globalThis.BlacklightExoVesselPhilosophyDefinitions = Object.freeze({philosophies,moduleTypes,archetypes,germinationSequence});
})();
