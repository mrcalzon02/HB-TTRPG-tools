(() => {
  'use strict';
  if (globalThis.BlacklightExoVesselVoxelDefinitions) return;

  const topologyPolicies = {
    MONOCOQUE:{key:'MONOCOQUE',label:'Monocoque pressure hull',packingFraction:.46,internalBias:.78,radialBranches:2,description:'A compact pressure-bearing shell with machinery packed around one protected centerline.'},
    SPINE:{key:'SPINE',label:'Long structural spine',packingFraction:.34,internalBias:.44,radialBranches:4,description:'A long thrust-aligned keel with modules attached along protected and vacuum-exposed branches.'},
    CLUSTER:{key:'CLUSTER',label:'Clustered pods and hub',packingFraction:.28,internalBias:.38,radialBranches:6,description:'Multiple isolated pods arranged around a central transfer, command, and structural hub.'},
    RING:{key:'RING',label:'Ring and central hub',packingFraction:.26,internalBias:.58,radialBranches:8,description:'A circular inhabited or industrial ring around a central thrust, utility, and docking hub.'},
    HYBRID:{key:'HYBRID',label:'Citadel and external rail',packingFraction:.32,internalBias:.60,radialBranches:5,description:'A protected internal citadel connected to exposed replaceable machinery, radiators, weapons, and tanks.'}
  };

  const semanticPlacement = {
    DRIVE_APPARATUS:{priority:100,region:'AFT_CENTER',shape:'LONGITUDINAL'},
    DRIVE_INTEGRATION:{priority:98,region:'CENTERLINE',shape:'LONGITUDINAL'},
    MAIN_ENGINE:{priority:97,region:'AFT_BOUNDARY',shape:'LONGITUDINAL'},
    REACTOR:{priority:95,region:'CENTER_AFT',shape:'COMPACT'},
    ENERGY_STORAGE:{priority:93,region:'CENTER_AFT',shape:'TANK'},
    PROPELLANT_TANK:{priority:92,region:'AFT_FLANK',shape:'TANK'},
    STRUCTURE:{priority:90,region:'CENTERLINE',shape:'LONGITUDINAL'},
    LIFE_SUPPORT:{priority:86,region:'HABITAT_CORE',shape:'COMPACT'},
    NAVIGATION:{priority:84,region:'FORWARD_CORE',shape:'COMPACT'},
    FIRE_CONTROL:{priority:83,region:'FORWARD_CORE',shape:'COMPACT'},
    ELECTRONIC_WARFARE:{priority:82,region:'FORWARD_SURFACE',shape:'SURFACE'},
    SENSOR:{priority:81,region:'SENSOR_BASELINE',shape:'SURFACE'},
    MAGAZINE:{priority:80,region:'ISOLATED_COMBAT',shape:'COMPACT'},
    WEAPON_SUPPORT:{priority:78,region:'COMBAT_BRANCH',shape:'COMPACT'},
    WEAPON_COOLING:{priority:77,region:'COMBAT_BRANCH',shape:'SURFACE'},
    WEAPON:{priority:76,region:'WEAPON_SURFACE',shape:'SURFACE'},
    ACTIVE_PROTECTION:{priority:74,region:'SURFACE',shape:'SURFACE'},
    ARMOR:{priority:72,region:'HULL_SURFACE',shape:'SHELL'},
    THERMAL_CONTROL:{priority:70,region:'RADIATOR_SURFACE',shape:'PANEL'},
    COUNTERMEASURE:{priority:68,region:'SURFACE',shape:'SURFACE'},
    MAINTENANCE:{priority:62,region:'SERVICE_CORE',shape:'COMPACT'},
    CARGO:{priority:55,region:'MID_BODY',shape:'BAY'},
    RESERVED_VOLUME:{priority:10,region:'RESERVE',shape:'BAY'}
  };

  const semanticColors = {
    DRIVE_APPARATUS:'#9b59b6',DRIVE_INTEGRATION:'#8e44ad',MAIN_ENGINE:'#e67e22',REACTOR:'#f1c40f',ENERGY_STORAGE:'#d35400',PROPELLANT_TANK:'#3498db',
    STRUCTURE:'#7f8c8d',LIFE_SUPPORT:'#2ecc71',NAVIGATION:'#1abc9c',FIRE_CONTROL:'#c0392b',ELECTRONIC_WARFARE:'#16a085',SENSOR:'#00bcd4',MAGAZINE:'#8b0000',
    WEAPON_SUPPORT:'#a93226',WEAPON_COOLING:'#5dade2',WEAPON:'#e74c3c',ACTIVE_PROTECTION:'#5b2c6f',ARMOR:'#566573',THERMAL_CONTROL:'#85c1e9',COUNTERMEASURE:'#f39c12',
    MAINTENANCE:'#27ae60',CARGO:'#a569bd',RESERVED_VOLUME:'#95a5a6'
  };

  const infrastructureVoxelTypes = {
    'structural-root':'STRUCTURE','thrust-keel':'STRUCTURE','pressure-vault':'PRESSURE_HULL','vacuum-truss':'VACUUM_TRUSS',
    'power-root':'POWER_TRUNK','cooling-root':'COOLANT_TRUNK','data-root':'DATA_TRUNK','atmosphere-root':'ATMOSPHERE_MANIFOLD','access-root':'CORRIDOR'
  };

  const suggestedResolution = [
    {maximumLengthM:40,cellEdgeM:1,label:'small-craft one-metre grid'},
    {maximumLengthM:300,cellEdgeM:2,label:'ordinary-vessel two-metre grid'},
    {maximumLengthM:800,cellEdgeM:5,label:'large-vessel five-metre grid'},
    {maximumLengthM:2000,cellEdgeM:10,label:'capital-vessel ten-metre grid'},
    {maximumLengthM:10000,cellEdgeM:20,label:'megastructure twenty-metre aggregate grid'},
    {maximumLengthM:50000,cellEdgeM:50,label:'megastructure fifty-metre aggregate grid'},
    {maximumLengthM:Infinity,cellEdgeM:100,label:'extreme installation hundred-metre aggregate grid'}
  ];

  globalThis.BlacklightExoVesselVoxelDefinitions = Object.freeze({
    schemaVersion:'1.0.0',layoutVersion:1,maxEnvelopeCells:120000,maxPlacementAttempts:900,
    topologyPolicies,semanticPlacement,semanticColors,infrastructureVoxelTypes,suggestedResolution,
    deferredSystems:{conditionApplication:'VESSEL-05',trackAndCombatGeometry:'VESSEL-06',weaponEngagementEnvelopes:'VESSEL-07',localDamageResolution:'VESSEL-08'}
  });
})();