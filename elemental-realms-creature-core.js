(() => {
  const registry = window.HBElementalRealmsWiki = window.HBElementalRealmsWiki || {};
  registry.schemaVersion = '1.1.0';
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
    { id:'leech-ecologies', name:'Planar Leeches, Parasites, and Symbiotes' },
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
  registry.leechTreatise = {
    title:'The Leech Problem: A Historical Topology of Feeding',
    provenance:'new-canon-expansion',
    body:[
      'No creature-name in the swamp catalogues has produced more ink, accusations, or ruined professional dinners than the word leech. The oldest catalogues used the term anatomically: a soft segmented body, one or more suckers, an aquatic or mud-dwelling life, and a habit of taking blood. That definition was serviceable until planar travel revealed creatures that performed the same ecological act with bodies made of vapor, stone, dream-stuff, elemental flame, or no permanent matter at all.',
      'The later topological school stopped asking what shape the creature possessed and instead mapped the relationship between feeder and host. In that model, a leech is any creature whose primary sustenance crosses a persistent living boundary from another creature into itself. Blood is only one possible current. Heat, breath, memory, fear, mineral salts, elemental charge, diseased tissue, and even harmful excess energy may occupy the same feeding pathway.',
      'This change created the historical ambiguity between parasite and symbiote. A parasitic feeder extracts value while returning little or causing measurable harm. A symbiotic feeder still lives by consuming part of another creature, but returns a service: cleaning wounds, filtering poison, regulating heat, removing disease, or sharing stored energy. Many swamp species are facultative and move between these states according to hunger, population density, season, or the plane through which they migrate.',
      'The present author therefore uses leech as a broad ecological and relational category: any creature that feeds upon another creature for its primary sustenance, whether the exchange is destructive, tolerated, cultivated, or mutually beneficial. The author is fully aware that this decision will anger anatomical purists, annelid catalogists, lamprey specialists, ooze scholars, and several rival swamp cataloguing societies. Their objections are preserved in individual catalogue notes rather than allowed to erase useful ecological similarities.',
      'Most planes contain several varieties of leech-like parasite or symbiote. The flame-aligned wetlands are the conspicuous exception in scale, possessing at least twice the variety commonly recorded in other planar swamp systems. The author proposes a simple energetic explanation: in an environment already saturated with heat, a creature that drains heat from a host does not need to spend most of that stolen energy on movement, digestion, reproduction, or thermal maintenance. Ambient fire performs those basic functions, leaving host-derived heat available for growth, storage, defense, and increasingly specialized forms.'
    ]
  };
})();
