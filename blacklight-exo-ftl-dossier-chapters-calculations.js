(() => {
  'use strict';
  const chapters = globalThis.BlacklightExoFTLDossierChapters;
  if (!chapters) return;
  Object.assign(chapters, {
    'exo-ftl-calculation-overview': {
      eyebrow: 'Charles // calculation review',
      title: 'Which numbers I inherited, which I derived, and how much trust I place in them.',
      brief: 'I have not replaced the original performance or energy records. I have recomputed their key relationships beside them, stated the assumptions in ordinary language, and separated arithmetic consistency from uncertainty in the underlying transit theory.',
      confidence: 'modeled'
    },
    'exo-ftl-calculation-performance': {
      eyebrow: 'Charles // transit arithmetic',
      title: 'How the route rate becomes a payload interval and then a complete mission.',
      brief: 'The clean-space rate, route-certified rate, payload crossing, and complete mission response answer different questions. This chapter shows the equation and substituted values for each rather than asking the reader to trust a headline number.',
      confidence: 'modeled'
    },
    'exo-ftl-calculation-performance-sensitivity': {
      eyebrow: 'Charles // transit sensitivity',
      title: 'How stable the transit estimate remains when its operating assumptions move.',
      brief: 'These are engineering sensitivity envelopes derived from route availability, reliability, maturity, and transit type. They are deliberately not presented as experimental confidence intervals.',
      confidence: 'theoretical'
    },
    'exo-ftl-calculation-energy': {
      eyebrow: 'Charles // energy arithmetic',
      title: 'How formation, transit, termination, fuel, recharge, and heat are related.',
      brief: 'I retain the original mission-energy account and then expose the arithmetic beneath it. Active fuel mass is kept separate from the power plant, storage, shielding, cooling, reserve segregation, and other machinery required to use that energy safely.',
      confidence: 'modeled'
    },
    'exo-ftl-calculation-energy-sensitivity': {
      eyebrow: 'Charles // energy sensitivity',
      title: 'How far the energy and thermal estimates can move before the architecture must change.',
      brief: 'The upper end matters for radiators, heat stores, power conditioning, tankage, and recharge infrastructure. The nominal value remains useful for comparison but should not be mistaken for a procurement guarantee.',
      confidence: 'theoretical'
    },
    'exo-ftl-calculation-consistency': {
      eyebrow: 'Charles // arithmetic annex',
      title: 'Whether the generated values reproduce one another.',
      brief: 'This annex verifies unit conversion, mission-time addition, energy addition, and fuel conversion where the selected power architecture provides the required constants. Passing these checks establishes arithmetic coherence, not physical truth.',
      confidence: 'measured',
      collapsed: true
    }
  });
})();
