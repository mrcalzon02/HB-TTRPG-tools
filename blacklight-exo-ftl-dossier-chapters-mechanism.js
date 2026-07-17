(() => {
  'use strict';
  const chapters = globalThis.BlacklightExoFTLDossierChapters;
  if (!chapters) return;
  Object.assign(chapters, {
    'exo-ftl-path-overview': {
      eyebrow: 'Charles // family maturity',
      title: 'Where this machine sits in its own engineering lineage.',
      brief: 'The shared civilization tier and the maturity of this particular method are related but not identical. This chapter identifies the current form of the device, the apparatus required to make it useful, and the burden still carried from its primitive ancestor.',
      confidence: 'archival'
    },
    'exo-ftl-path-utility': {
      eyebrow: 'Charles // practical justification',
      title: 'Why even the crude version is worth building.',
      brief: 'The earliest installation is allowed to be enormous, slow to charge, wasteful, and narrow in application. It is not allowed to be pointless. I compare the complete mission against a chemical-drive benchmark over the distance for which the machine was actually built.',
      confidence: 'modeled'
    },
    'exo-ftl-path-hierarchy': {
      eyebrow: 'Charles // development record',
      title: 'How the same physical method improves across seven stages.',
      brief: 'Each stage refines control, containment, compactness, reliability, route access, and energy recovery. The device remains recognizably descended from the same base engineering action.',
      confidence: 'archival',
      collapsed: true
    },
    'exo-ftl-mechanism-overview': {
      eyebrow: 'Charles // base mechanism',
      title: 'What the device physically does when powered.',
      brief: 'This is the invariant action beneath the technology ladder: the prime mover, the transduced output, the vessel-wide effect, and the physical limit that refinement cannot simply engineer away.',
      confidence: 'theoretical'
    },
    'exo-ftl-mechanism-motivation': {
      eyebrow: 'Charles // design motive',
      title: 'Why anyone would choose this method.',
      brief: 'Technologies are rarely selected in a vacuum. Available energy, prior discoveries, strategic needs, infrastructure, risk tolerance, and the geometry of inhabited space all influence which difficult machine a civilization decides to make less difficult.',
      confidence: 'archival'
    },
    'exo-ftl-device-chain': {
      eyebrow: 'Charles // causal device train',
      title: 'How power becomes transit.',
      brief: 'I follow the energy through each physical stage until it produces the claimed effect. This prevents words such as field, phase, fold, or manifold from replacing the machinery that must actually be constructed.',
      confidence: 'theoretical'
    },
    'exo-ftl-mechanism-coverage': {
      eyebrow: 'Charles // whole-vessel inclusion',
      title: 'How the effect reaches the entire ship or controlled volume.',
      brief: 'A useful drive must act on every intended part of the payload. This chapter defines the controlled boundary, inclusion rule, scaling law, hull integration, and the consequences of leaving a radiator, docking bridge, rotating section, or attached craft outside it.',
      confidence: 'modeled'
    },
    'exo-ftl-mechanism-cycle': {
      eyebrow: 'Charles // operating procedure',
      title: 'What the crew and machine must do before, during, and after transit.',
      brief: 'The spectacular interval is only one part of the operation. Initiation, verification, commitment, termination, discharge, reconciliation, and recovery determine whether the machine can be used twice.',
      confidence: 'operational'
    },
    'exo-ftl-mechanism-environment': {
      eyebrow: 'Charles // environmental permission',
      title: 'What the surrounding space must permit.',
      brief: 'The drive does not operate against an empty mathematical background. It must coexist with local mass, radiation, plasma, traffic, dimensional noise, field wakes, and the consequences it leaves for the next vessel.',
      confidence: 'operational'
    },
    'exo-ftl-mechanism-control': {
      eyebrow: 'Charles // controlled quantities',
      title: 'What the controller must keep inside tolerance.',
      brief: 'These are the variables that turn a theoretical effect into an operable machine. Their failure consequences explain why refinement usually appears first as better sensing, timing, alignment, containment, and abort authority.',
      confidence: 'measured'
    },
    'exo-ftl-mechanism-benchmarks': {
      eyebrow: 'Charles // current refinement',
      title: 'What improved—and by how much.',
      brief: 'I report the present values of the engineering quantities that distinguish a monumental experiment from a dependable transport system. These benchmarks are estimates, but they are tied to specific mechanical burdens rather than a vague declaration of advancement.',
      confidence: 'modeled'
    },
    'exo-ftl-mechanism-progression': {
      eyebrow: 'Charles // refinement ledger',
      title: 'How those engineering improvements accumulate.',
      brief: 'This is the full Path 0–6 comparison for the same underlying device. I have retained it as an annex because it is valuable, but it is not necessary to read every number before understanding the machine.',
      confidence: 'modeled',
      collapsed: true
    }
  });
})();
