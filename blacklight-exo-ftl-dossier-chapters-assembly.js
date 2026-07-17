(() => {
  'use strict';
  const chapters = globalThis.BlacklightExoFTLDossierChapters;
  if (!chapters) return;
  Object.assign(chapters, {
    'exo-ftl-assembly-overview': {
      eyebrow: 'Charles // construction authority',
      title: 'How I would authorize construction.',
      brief: 'This is the current production-scale view: apparatus mass, installed volume, labor, workforce, fabrication loss, spare allocation, commissioning standard, and the distinction between a model that works on paper and a machine that can be accepted for service.',
      confidence: 'modeled'
    },
    'exo-ftl-assembly-components': {
      eyebrow: 'Charles // bill of material classes',
      title: 'What the machine is made of.',
      brief: 'The component ledger preserves mass, power, volume, count, placement, material, ratio, function, interfaces, wear, and service access. It is dense by necessity, so I have retained it as an expandable construction annex rather than reducing it to a few decorative parts.',
      confidence: 'modeled',
      collapsed: true
    },
    'exo-ftl-assembly-sequence': {
      eyebrow: 'Charles // assembly order',
      title: 'In what order it should be assembled.',
      brief: 'Construction order follows physical dependency. Foundations, reference geometry, energy conditioning, the prime effect, distributed coverage, control, cooling, and abort systems must be accepted in a sequence that leaves later interfaces reachable and earlier assumptions testable.',
      confidence: 'operational',
      collapsed: true
    },
    'exo-ftl-assembly-interfaces': {
      eyebrow: 'Charles // subsystem boundaries',
      title: 'Where separately sound components can still fail together.',
      brief: 'An interface can transmit load, heat, timing error, field distortion, contamination, or a common power failure. The ledger therefore treats boundaries as independently qualified engineering objects rather than blank lines between boxes.',
      confidence: 'operational',
      collapsed: true
    },
    'exo-ftl-assembly-quality': {
      eyebrow: 'Charles // production standard',
      title: 'What qualifies the machine for service.',
      brief: 'Fabrication, joining, metrology, nondestructive examination, commissioning, energy recovery, tolerance, and automation all improve with maturity. None of them excuse an independent acceptance authority from proving the complete operating cycle.',
      confidence: 'operational'
    },
    'exo-ftl-assembly-maintenance': {
      eyebrow: 'Charles // wear and intervention',
      title: 'What wears out, how quickly, and what must be replaced.',
      brief: 'Life estimates are adjusted for the generated route and mission rather than copied from a universal catalog. The shortest-lived component sets the coordinated inspection burden, because the machine is only as reusable as the first subsystem that consumes its certification margin.',
      confidence: 'modeled',
      collapsed: true
    },
    'exo-ftl-assembly-progression': {
      eyebrow: 'Charles // manufacturing development',
      title: 'How construction improves without changing the device’s purpose.',
      brief: 'This annex compares labor, modularity, tolerances, examination, energy recovery, waste, spare burden, component life, and commissioning from monumental precursor to mature production.',
      confidence: 'modeled',
      collapsed: true
    },
    'exo-ftl-assembly-warnings': {
      eyebrow: 'Charles // refusal conditions',
      title: 'Conditions under which I would refuse commissioning.',
      brief: 'These warnings preserve the assumptions behind every ratio and life estimate. If the base effect, inclusion boundary, scaling rule, route severity, spares, or critical interfaces are unresolved, the machine is not ready merely because its components exist.',
      confidence: 'operational',
      collapsed: true
    }
  });
})();
