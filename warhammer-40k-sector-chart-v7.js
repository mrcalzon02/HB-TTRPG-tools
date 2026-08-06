(() => {
  'use strict';

  const GUARD_POSITIONS = Object.freeze({
    'node-caldan-homeworld': [-48, -16, -8],
    'node-tanvar-homeworld': [-56, 30, 18],
    'node-halcyon-homeworld': [-28, 46, 6],
    'node-ersak-homeworld': [62, 38, -10],
    'node-mirradon-homeworld': [8, -24, 12],
    'node-brannis-homeworld': [-10, 12, -15],
    'node-draven-homeworld': [46, -42, 9],
    'node-vandrell-homeworld': [84, 30, -6],
    'node-karron-homeworld': [-28, -34, 8],
    'node-vektran-homeworld': [-66, -4, 16],
    'node-caraphus': [66, -28, -16]
  });

  const NAME_OVERRIDES = Object.freeze({
    'node-caldan-homeworld': 'Caldan System',
    'node-tanvar-homeworld': 'Tanvar System',
    'node-halcyon-homeworld': 'Halcyon System',
    'node-ersak-homeworld': 'Ersak System',
    'node-mirradon-homeworld': 'Mirradon System',
    'node-brannis-homeworld': 'Brannis System',
    'node-draven-homeworld': 'Draven System',
    'node-vandrell-homeworld': 'Vandrell System',
    'node-karron-homeworld': 'Karron System',
    'node-vektran-homeworld': 'Vektran System',
    'node-caraphus': 'Caraphus System'
  });

  const ROUTES = Object.freeze([
    {
      id: 'route-cafarron-primary-spine',
      name: 'Cafarron Corridor Primary Warp Spine',
      nodeIds: ['node-segrea', 'node-new-presidio', 'node-galladin', 'node-core-anchorage', 'node-core-forge', 'node-pelzane', 'node-valikor', 'node-thesk', 'node-pilcher'],
      kind: 'Primary warp corridor',
      layer: 'major-warp',
      authority: 'Navis Cartographica Seal Primus',
      traffic: 'Battlefleet movements, tithe convoys, strategic freight',
      status: 'Open under sector navigation writ'
    },
    {
      id: 'route-galladin-pelzane-bypass',
      name: 'Galladin–Pelzane Priority Passage',
      nodeIds: ['node-galladin', 'node-pelzane'],
      kind: 'Priority warp bypass',
      layer: 'major-warp',
      authority: 'Navis Cartographica emergency charter',
      traffic: 'Priority dispatch, relief fleets, emergency translation',
      status: 'Restricted but serviceable'
    },
    {
      id: 'route-northern-arc',
      name: 'Northern Scholastica and Border Warp Arc',
      nodeIds: ['node-galladin', 'node-presteria', 'node-sygsnsei', 'node-cyprian', 'node-havenvard', 'node-panthes'],
      kind: 'Northern warp corridor',
      layer: 'major-warp',
      authority: 'Navis Cartographica northern chart office',
      traffic: 'Administratum dispatches, scholastica traffic, frontier military shipping',
      status: 'Charted and patrolled'
    },
    {
      id: 'route-western-tithe-circuit',
      name: 'Western Tithe and Penal Circuit',
      nodeIds: ['node-vektran-homeworld', 'node-segrea', 'node-caldan-homeworld', 'node-new-presidio', 'node-galladin'],
      kind: 'Munitorum tithe circuit',
      layer: 'trade',
      authority: 'Departmento Munitorum western prefecture',
      traffic: 'Grain tithe, penal levies, replacement personnel, civic freight',
      status: 'Sanctioned convoy route'
    },
    {
      id: 'route-vektran-transfer-leg',
      name: 'Vektran–ReaalSpekcs Transfer Leg',
      nodeIds: ['node-vektran-homeworld', 'node-reaalspekcs', 'node-new-presidio'],
      kind: 'Penal and custodial transport lane',
      layer: 'trade',
      authority: 'Adeptus Arbites and Munitorum joint seal',
      traffic: 'Penal drafts, custodial transports, ration and security shipments',
      status: 'Heavily regulated'
    },
    {
      id: 'route-northern-muster-circuit',
      name: 'Northern Muster and Provisioning Circuit',
      nodeIds: ['node-tanvar-homeworld', 'node-presteria', 'node-halcyon-homeworld', 'node-sygsnsei', 'node-havenvard', 'node-ersak-homeworld', 'node-thesk'],
      kind: 'Muster and provisioning lane',
      layer: 'trade',
      authority: 'Departmento Munitorum northern command',
      traffic: 'Cold-weather stores, forest products, troop drafts, rapid-deployment equipment',
      status: 'Sanctioned convoy route'
    },
    {
      id: 'route-central-munitorum-artery',
      name: 'Central Munitorum Industrial Artery',
      nodeIds: ['node-karron-homeworld', 'node-core-forge', 'node-mirradon-homeworld', 'node-core-anchorage', 'node-brannis-homeworld', 'node-galladin'],
      kind: 'Industrial and military supply artery',
      layer: 'trade',
      authority: 'Departmento Munitorum and Mechanicus freight compact',
      traffic: 'Artillery, armour, replacement parts, line regiments, fleet stores',
      status: 'High-priority freight route'
    },
    {
      id: 'route-eastern-siege-supply',
      name: 'Eastern Siege and Promethium Supply Chain',
      nodeIds: ['node-core-forge', 'node-mirradon-homeworld', 'node-kertora', 'node-draven-homeworld', 'node-caraphus', 'node-parban'],
      kind: 'Siege and fuel supply lane',
      layer: 'trade',
      authority: 'Munitorum siege office',
      traffic: 'Promethium, siege guns, ammunition, engineering stores, field replacements',
      status: 'Active under armed escort'
    },
    {
      id: 'route-frontier-recon-deployment',
      name: 'Frontier Reconnaissance and Drop Deployment Route',
      nodeIds: ['node-havenvard', 'node-ersak-homeworld', 'node-vandrell-homeworld', 'node-thesk', 'node-pilcher'],
      kind: 'Rapid-deployment military lane',
      layer: 'trade',
      authority: 'Sector Militarum frontier command',
      traffic: 'Reconnaissance cadres, drop-troop assets, auspex stores, frontier relief',
      status: 'Operational military route'
    },
    {
      id: 'route-gazeras-provisioning',
      name: 'Gazeras Provisioning and War-World Spur',
      nodeIds: ['node-galladin', 'node-gazeras', 'node-sullivan', 'node-panthes'],
      kind: 'Provisioning and personnel lane',
      layer: 'trade',
      authority: 'Sector tithe office',
      traffic: 'Food tithe, personnel, war materiel',
      status: 'Sanctioned convoy route'
    },
    {
      id: 'route-southern-supply',
      name: 'Southern Promethium and Agri Supply Spur',
      nodeIds: ['node-pelzane', 'node-kertora', 'node-parban', 'node-jhasyiapan', 'node-thesk'],
      kind: 'Frontier supply lane',
      layer: 'trade',
      authority: 'Munitorum southern prefecture',
      traffic: 'Promethium, food tithe, frontier supply',
      status: 'Operational under convoy escort'
    },
    {
      id: 'route-pilcher-fringe',
      name: 'Pilcher–Thesk Production Circuit',
      nodeIds: ['node-thesk', 'node-production-1', 'node-production-2', 'node-pilcher', 'node-production-3', 'node-thesk'],
      kind: 'Local production circuit',
      layer: 'trade',
      authority: 'Thesk Ward logistics command',
      traffic: 'Industrial output, evacuation lift, frontier stores',
      status: 'Local circuit under emergency protocols'
    },
    {
      id: 'route-havenvard-mandible',
      name: 'Havenvard–Mandible Approach',
      nodeIds: ['node-havenvard', 'node-mandible'],
      kind: 'Local navigation approach',
      layer: 'local-navigation',
      authority: 'Navis Cartographica approach seal',
      traffic: 'Pilots, survey craft, local shipping',
      status: 'Charted local passage'
    },
    {
      id: 'route-exodite-moons',
      name: 'Exodite Satellite Orbit Register',
      nodeIds: ['node-unnamed-02', 'node-unnamed-03'],
      kind: 'Local orbital relationship',
      layer: 'local-navigation',
      authority: 'Ordo Xenos observation seal',
      traffic: 'Observation only',
      status: 'Restricted chart notation'
    }
  ]);

  function systemName(value) {
    return String(value || '')
      .replace(/\s+homeworld$/i, ' System')
      .replace(/^Caraphus$/i, 'Caraphus System');
  }

  function nodes(data) {
    return data.mapNodes.map(node => {
      const position = GUARD_POSITIONS[node.id] || node.position;
      const name = NAME_OVERRIDES[node.id] || node.name;
      if (!GUARD_POSITIONS[node.id]) return Object.freeze({ ...node, position: [...position], name });
      return Object.freeze({
        ...node,
        name,
        position: [...position],
        kind: 'Astra Militarum origin system',
        layer: 'guard-origin',
        provenance: 'Munitorum origin register',
        status: 'Astra Militarum origin system under sector tithe writ',
        threatNote: node.threat === 'standard'
          ? 'No active war seal is entered against this system.'
          : node.threatNote,
        guardOrigin: true,
        labelPriority: 'guard-origin'
      });
    });
  }

  function exploratoryRoutes(data) {
    return data.mapNodes
      .filter(node => node.layer === 'exploratory' && node.parentNodeId)
      .map(node => ({
        id: `route-${node.id}`,
        name: `${systemName(data.mapNodes.find(item => item.id === node.parentNodeId)?.name || 'Parent system')} Explorator Approach`,
        nodeIds: [node.parentNodeId, node.id],
        kind: 'Explorator approach',
        layer: 'exploratory',
        authority: 'Navis Cartographica Explorator Office',
        traffic: 'Survey craft only',
        status: 'Unratified frontier contact'
      }));
  }

  function routes(data) {
    return [...ROUTES, ...exploratoryRoutes(data)].map(route => Object.freeze({ ...route, nodeIds: [...route.nodeIds] }));
  }

  window.CafarronSectorChartV7 = Object.freeze({
    version: '0.7.0',
    nodes,
    routes,
    systemName,
    guardSystemIds: Object.freeze(Object.keys(GUARD_POSITIONS))
  });
})();
