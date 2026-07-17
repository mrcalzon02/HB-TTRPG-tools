(() => {
  'use strict';
  if (globalThis.BlacklightExoVesselModuleDefinitions) return;

  const moduleTypes = {
    drive:{semanticType:'DRIVE_APPARATUS',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['FIELD_EVENT','HIGH_ENERGY'],zone:'MACHINERY'},
    'drive-integration':{semanticType:'DRIVE_INTEGRATION',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['FIELD_EVENT'],zone:'STRUCTURE'},
    power:{semanticType:'REACTOR',criticality:'CRITICAL',requires:{power:false,cooling:true,data:true,atmosphere:false,access:true},hazards:['HIGH_ENERGY','RADIATION'],zone:'MACHINERY'},
    fuel:{semanticType:'ENERGY_STORAGE',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['FUEL','EXPLOSION'],zone:'MACHINERY'},
    thermal:{semanticType:'THERMAL_CONTROL',criticality:'CRITICAL',requires:{power:true,cooling:false,data:true,atmosphere:false,access:true},hazards:['HIGH_TEMPERATURE','COOLANT'],zone:'MACHINERY'},
    'life-support':{semanticType:'LIFE_SUPPORT',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:true,access:true},hazards:['BIOLOGICAL','PRESSURE'],zone:'HABITAT',crewDependent:true},
    'protection-fields':{semanticType:'ACTIVE_PROTECTION',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['HIGH_ENERGY'],zone:'MACHINERY'},
    navigation:{semanticType:'NAVIGATION',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:[],zone:'COMMAND'},
    sensors:{semanticType:'SENSOR',criticality:'MISSION',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['EMISSIONS'],zone:'COMMAND'},
    'fire-control':{semanticType:'FIRE_CONTROL',criticality:'COMBAT',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:[],zone:'COMMAND'},
    'electronic-warfare':{semanticType:'ELECTRONIC_WARFARE',criticality:'COMBAT',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['EMISSIONS'],zone:'COMMAND'},
    maintenance:{semanticType:'MAINTENANCE',criticality:'MISSION',requires:{power:true,cooling:false,data:true,atmosphere:true,access:true},hazards:['INDUSTRIAL'],zone:'SERVICE',crewDependent:true},
    payload:{semanticType:'CARGO',criticality:'MISSION',requires:{power:false,cooling:false,data:true,atmosphere:false,access:true},hazards:['VARIABLE_CARGO'],zone:'CARGO'},
    structure:{semanticType:'STRUCTURE',criticality:'CRITICAL',requires:{power:false,cooling:false,data:false,atmosphere:false,access:true},hazards:[],zone:'STRUCTURE'},
    'conventional-engine':{semanticType:'MAIN_ENGINE',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['EXHAUST','HIGH_TEMPERATURE'],zone:'MACHINERY'},
    'conventional-propellant':{semanticType:'PROPELLANT_TANK',criticality:'CRITICAL',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['PROPELLANT','PRESSURE'],zone:'MACHINERY'},
    'weapon-mounts':{semanticType:'WEAPON',criticality:'COMBAT',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['RECOIL','WEAPON'],zone:'COMBAT'},
    'weapon-support':{semanticType:'WEAPON_SUPPORT',criticality:'COMBAT',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['HIGH_ENERGY'],zone:'COMBAT'},
    'weapon-magazines':{semanticType:'MAGAZINE',criticality:'COMBAT',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['AMMUNITION','EXPLOSION'],zone:'MAGAZINE'},
    'weapon-cooling':{semanticType:'WEAPON_COOLING',criticality:'COMBAT',requires:{power:true,cooling:true,data:true,atmosphere:false,access:true},hazards:['COOLANT','HIGH_TEMPERATURE'],zone:'COMBAT'},
    countermeasures:{semanticType:'COUNTERMEASURE',criticality:'COMBAT',requires:{power:true,cooling:false,data:true,atmosphere:false,access:true},hazards:['EXPENDABLES'],zone:'COMBAT'},
    margin:{semanticType:'RESERVED_VOLUME',criticality:'RESERVE',requires:{power:false,cooling:false,data:false,atmosphere:false,access:true},hazards:[],zone:'RESERVE'}
  };

  const infrastructure = [
    {key:'structural-root',nodeType:'STRUCTURAL_ROOT',label:'Principal vessel structural root',properties:['STRUCTURAL_ROOT','LOAD_PATH_ORIGIN']},
    {key:'thrust-keel',nodeType:'THRUST_KEEL',label:'Continuous conventional-thrust and recoil keel',properties:['STRUCTURAL_LOAD_PATH','THRUST_ALIGNED','RECOIL_PATH']},
    {key:'pressure-vault',nodeType:'PRESSURE_VAULT',label:'Protected pressure-vault attachment manifold',properties:['ATMOSPHERE_MANIFOLD','PRESSURIZED_ACCESS','STRUCTURAL_ATTACHMENT']},
    {key:'vacuum-truss',nodeType:'VACUUM_TRUSS',label:'Vacuum-exposed structural hardpoint network',properties:['VACUUM_EXPOSED','REMOTE_SERVICEABLE','STRUCTURAL_ATTACHMENT']},
    {key:'power-root',nodeType:'POWER_TRUNK',label:'Primary power-distribution root',properties:['POWER_SOURCE','REDUNDANT_BRANCHING']},
    {key:'cooling-root',nodeType:'COOLANT_TRUNK',label:'Primary coolant and heat-transport root',properties:['COOLANT_SOURCE','HEAT_TRANSPORT']},
    {key:'data-root',nodeType:'DATA_TRUNK',label:'Primary command and data root',properties:['DATA_SOURCE','CONTROL_AUTHORITY']},
    {key:'atmosphere-root',nodeType:'ATMOSPHERE_MANIFOLD',label:'Primary atmosphere and environmental manifold',properties:['ATMOSPHERE_SOURCE','ISOLATABLE']},
    {key:'access-root',nodeType:'SERVICE_ACCESS_ROOT',label:'Primary internal and EVA service-access root',properties:['ACCESS_SOURCE','EVACUATION_OR_SERVICE']}
  ];

  const pressureZoneTemplates = {
    HABITAT:{label:'Primary inhabited pressure zone',inhabited:true,isolated:false,environment:'CREW_ENVIRONMENT'},
    COMMAND:{label:'Command, navigation, and control zone',inhabited:true,isolated:true,environment:'CREW_ENVIRONMENT'},
    SERVICE:{label:'Pressurized maintenance and service zone',inhabited:true,isolated:true,environment:'CREW_ENVIRONMENT'},
    MACHINERY:{label:'Protected machinery zone',inhabited:false,isolated:true,environment:'CONTROLLED_MACHINERY'},
    CARGO:{label:'Mission cargo and staging zone',inhabited:false,isolated:true,environment:'VARIABLE'},
    COMBAT:{label:'Combat systems service zone',inhabited:false,isolated:true,environment:'CONTROLLED_MACHINERY'},
    STRUCTURE:{label:'Structural service and distributed-hardening zone',inhabited:false,isolated:true,environment:'UNPRESSURIZED_OR_BUFFER'},
    RESERVE:{label:'Reserved integration volume',inhabited:false,isolated:true,environment:'UNASSIGNED'}
  };

  const utilityGraphs = ['structural','power','cooling','data','atmosphere','access','magazineFeed','sensorDependency'];
  const weaponFacings = ['FORWARD','AFT','PORT','STARBOARD','DORSAL','VENTRAL'];
  const repairableFaults = ['INVALID_FIRST_ATTACHMENT','REMOVE_FIRST_POWER_EDGE','REMOVE_FIRST_COOLING_EDGE','REMOVE_FIRST_DATA_EDGE','REMOVE_FIRST_ACCESS_EDGE','REMOVE_FIRST_MAGAZINE_LINK','BREAK_FIRST_LOAD_PATH'];

  globalThis.BlacklightExoVesselModuleDefinitions = Object.freeze({
    schemaVersion:'1.0.0',
    graphVersion:1,
    moduleTypes,
    forbiddenStandaloneSubsystems:['armor'],
    infrastructure,
    pressureZoneTemplates,
    utilityGraphs,
    weaponFacings,
    repairableFaults
  });
})();
