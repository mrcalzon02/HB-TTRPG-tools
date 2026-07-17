(() => {
  'use strict';
  const chapters = globalThis.BlacklightExoFTLDossierChapters;
  if (!chapters) return;
  Object.assign(chapters, {
    'exo-ftl-charles-overview': {
      eyebrow: 'Charles // lower-level interpretation',
      title: 'My working explanation of the machine.',
      brief: 'I distinguish what the apparatus demonstrably does from the mathematical model used to control it and from the deeper explanation we merely prefer. A successful controller is not automatically a correct theory of nature.',
      confidence: 'theoretical'
    },
    'exo-ftl-charles-evaluated': {
      eyebrow: 'Charles // evaluated terms',
      title: 'The generated values I used.',
      brief: 'These quantities connect the abstract control model to this particular machine, payload, route, energy budget, and maturity level. They are estimates within the fictional engineering model, not assertions about real-world physics.',
      confidence: 'modeled'
    },
    'exo-ftl-charles-equations': {
      eyebrow: 'Charles // control mathematics',
      title: 'The equations I would trust—carefully.',
      brief: 'These expressions are control-grade approximations intended to keep the machine inside its operating envelope. They are included because they explain what the controller changes and how failure begins, not because symbolic density is a substitute for understanding.',
      confidence: 'theoretical',
      collapsed: true
    },
    'exo-ftl-charles-limits': {
      eyebrow: 'Charles // ignorance ledger',
      title: 'Where the model stops being knowledge.',
      brief: 'I have preserved the boundary conditions, unresolved physics, and explicit unknowns. This is the portion most likely to be lost when a system is rewritten to sound confident, which is precisely why it remains.',
      confidence: 'theoretical',
      collapsed: true
    },
    'exo-ftl-charles-alternates': {
      eyebrow: 'Charles // alternate interpretations',
      title: 'Other explanations that fit the same observations.',
      brief: 'Multiple mathematical stories may reproduce the same machine behavior. I record plausible alternatives and my objections so the dossier does not confuse a useful interpretation with an established ontology.',
      confidence: 'theoretical',
      collapsed: true
    }
  });
})();
