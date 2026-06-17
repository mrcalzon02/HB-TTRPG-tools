(() => {
  const registry = window.HBElementalRealmsWiki = window.HBElementalRealmsWiki || {};
  registry.schemaVersion = '1.0.0';
  registry.system = 'Hypertext d20 / 3.5-compatible';
  registry.categories = [
    { id:'primordial-swamp', name:'Primordial Swamps and Guardians' },
    { id:'water-plane', name:'Plane of Water' },
    { id:'fire-plane', name:'Plane of Fire' },
    { id:'earth-plane', name:'Plane of Earth' },
    { id:'ethereal-astral', name:'Ethereal and Astral Bogs' },
    { id:'air-plane', name:'Plane of Air' },
    { id:'para-elemental', name:'Para-Elemental Quagmire' },
    { id:'unconventional-planes', name:'Unconventional Planes' },
    { id:'arthropod-ecologies', name:'Swamp Arthropods and Adjacent Fauna' },
    { id:'contextual-fauna', name:'Contextual Fauna and Prey' }
  ];
  registry.entries = [];
  registry.addEntries = entries => registry.entries.push(...entries.map(entry => ({
    aliases:[], subtypes:[], alignment:'Usually neutral', languages:'None', treasure:'None', advancement:'—',
    sourcePages:[], provenance:'manuscript-conversion', confidence:'medium',
    ...entry
  })));
  registry.ecologyOverview = {
    title:'The Profusion of Planar Swamp Life',
    provenance:'new-canon-expansion',
    body:[
      'The amphibious beasts of the many planes are as numerous and as varied as their diets. Some graze luminous moss, some filter mineral-rich water, some crack crystal-shelled beetles, some swallow carrion, some hunt astral insects, and some prey upon other amphibians large enough to threaten travelers.',
      'Every elemental swamp is supported by a deep and richly layered food web. Giant insects, arachnoids, crustaceans, worms, leeches, mollusks, and planar analogues occupy the reeds, mud, floating vegetation, cavern ceilings, lava margins, coral forests, and ethereal shallows. These creatures are not background decoration; they pollinate, decompose, aerate, hunt, parasitize, migrate, and carry elemental energy between habitats.',
      'The creature references therefore treat each frog, toad, salamander, spirit, and swamp guardian as part of a living ecology. Diet, prey, predators, symbiosis, and environmental function are recorded alongside combat statistics so encounters can function as ecosystems rather than isolated monsters.'
    ]
  };
})();
