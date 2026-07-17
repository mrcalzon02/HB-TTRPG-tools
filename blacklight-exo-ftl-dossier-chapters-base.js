(() => {
  'use strict';
  const chapters = globalThis.BlacklightExoFTLDossierChapters;
  if (!chapters) return;
  Object.assign(chapters, {
    'exo-ftl-controls-title': {
      eyebrow: 'Charles // assessment request',
      title: 'Tell me which machine, maturity, and route you want assessed.',
      brief: 'I will treat these selections as the terms of an engineering inquiry, not as proof that the requested combination can exist. Where the controls conflict, I will preserve the request in the record and explain what I changed before calculating the result.',
      confidence: 'operational'
    },
    'exo-ftl-performance': {
      eyebrow: 'Charles // certified performance',
      title: 'What I can certify about its transit performance.',
      brief: 'I separate clean-space capability, route-degraded performance, payload crossing time, and complete mission response. Those numbers answer different questions and should not be collapsed into a single impressive velocity.',
      confidence: 'measured'
    },
    'exo-ftl-kinematics': {
      eyebrow: 'Charles // time and motion',
      title: 'How I separate speed, crossing time, and total mission response.',
      brief: 'Continuous drives, folds, gates, and state translations do not experience distance in the same way. I therefore report the standardized comparison, the modeled payload interval, the crew interval, and the complete operational cycle separately.',
      confidence: 'modeled'
    },
    'exo-ftl-power': {
      eyebrow: 'Charles // primary energy account',
      title: 'What this machine demands from its power plant.',
      brief: 'This is the immediate field-formation account. It remains useful, but it should be read alongside the complete mission budget, which includes sustained operation, braking or collapse, recharge, fuel segregation, and thermal recovery.',
      confidence: 'measured'
    },
    'exo-ftl-energy-budget': {
      eyebrow: 'Charles // complete mission account',
      title: 'Where the energy actually goes.',
      brief: 'I have divided the mission into formation, transit or acceleration, controlled termination, recoverable energy, irreversible losses, carried fuel, and heat that the vessel must survive after the dramatic part is over.',
      confidence: 'modeled'
    },
    'exo-ftl-dimensional': {
      eyebrow: 'Charles // field integrity',
      title: 'What the field must hold together.',
      brief: 'These terms describe the controlled geometry, coherence, computation, and vessel integration required to make the effect apply to one complete machine rather than a collection of unrelated components.',
      confidence: 'theoretical'
    },
    'exo-ftl-navigation': {
      eyebrow: 'Charles // departure and arrival geometry',
      title: 'Where it may be started, steered, and safely stopped.',
      brief: 'A drive rating is meaningless without a permitted origin, a verified destination volume, a current mass map, and an environment quiet enough for the controller to distinguish the intended route from the surrounding gravitational and dimensional structure.',
      confidence: 'operational'
    },
    'exo-ftl-route-envelope': {
      eyebrow: 'Charles // route certification',
      title: 'Where the route is open—and where it is not.',
      brief: 'I translate gravity wells, moving barycenters, magnetospheres, traffic wakes, mass shadows, and Q/N disturbance into an operating window. A closed window is not a slower route. It is a route I would refuse to authorize.',
      confidence: 'modeled'
    },
    'exo-ftl-reliability': {
      eyebrow: 'Charles // service confidence',
      title: 'How often I expect it to work, drift, or demand intervention.',
      brief: 'Reliability is reported with cycle life, calibration drift, abort authority, single-point failures, manufacturing tolerance, inspection burden, and industrial dependencies. A high success percentage without those conditions would be decorative.',
      confidence: 'modeled'
    },
    'exo-ftl-compatibility': {
      eyebrow: 'Charles // resolved configuration',
      title: 'What I corrected before allowing the model to proceed.',
      brief: 'This chapter preserves the distinction between what was requested and what the technology can support. I do not silently substitute a convenient machine and then pretend the original request was valid.',
      confidence: 'operational'
    },
    'exo-ftl-hierarchy': {
      eyebrow: 'Charles // shared capability scale',
      title: 'How this architecture compares with the wider technology hierarchy.',
      brief: 'This is the broad civilization-scale comparison. It should not replace the family-specific development path, but it remains useful for understanding what supporting science and industry the machine assumes.',
      confidence: 'archival',
      collapsed: true
    },
    'exo-ftl-hurdles': {
      eyebrow: 'Charles // unresolved engineering',
      title: 'What still prevents routine service.',
      brief: 'I have kept the barriers divided into ordinary engineering, dimensional uncertainty, and environmental limitations. The categories overlap in practice, but separating them makes it easier to identify which institution or research program could actually improve the machine.',
      confidence: 'theoretical',
      collapsed: true
    },
    'exo-ftl-failures': {
      eyebrow: 'Charles // failure analysis',
      title: 'How the rating becomes misleading, unsafe, or false.',
      brief: 'A drive can retain an impressive clean-space number while becoming unusable because of route closure, boundary failure, destination uncertainty, traffic, damage, or an assumption the controller can no longer verify.',
      confidence: 'operational',
      collapsed: true
    },
    'exo-ftl-source-impact': {
      eyebrow: 'Charles // provenance and institutional effects',
      title: 'How its builders and institutions changed the final machine.',
      brief: 'No technology emerges from physics alone. This record preserves how the source civilization, government, economy, infrastructure, doctrine, and political constraints shaped the architecture that was actually built.',
      confidence: 'archival',
      collapsed: true
    }
  });
})();
