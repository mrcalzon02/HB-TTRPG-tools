(() => {
  const combine = (starts, middles, ends, limit = 180) => {
    const output = [];
    for (const start of starts) for (const middle of middles) for (const end of ends) {
      const value = `${start} ${middle} ${end}`.replace(/\s+/g, ' ').trim();
      if (!output.includes(value)) output.push(value);
      if (output.length >= limit) return output;
    }
    return output;
  };

  const COMPETENCE = {
    incompetent: {
      label: 'Hilariously Incompetent', rank: 0,
      adjectives: ['Minor','Dubious','Accidental','Barely Functional','Misfiled','Crooked','Backwards','Unlicensed','Questionable','Budget'],
      procedures: ['after an apologetic pause','while checking the instructions upside down','provided the caster remembers the final syllable','using the wrong hand twice','after loudly asking whether this is correct','with a fifty-percent-confidence flourish','following an unnecessary warm-up','after correcting three visible mistakes'],
      results: ['produces the intended effect six inches to the left','works only on something already nearly affected','creates a harmless puff and a disappointing noise','solves a problem too small to matter','affects the caster instead','succeeds in the least useful interpretation','creates paperwork but no magic','conjures a substitute of visibly inferior quality','works perfectly for half a second'],
      side: ['leaves the caster smelling faintly of onions','summons a tiny clerk who criticizes the technique','awards the subject a certificate of participation','causes nearby spoons to rotate','makes one shoe squeak dramatically','temporarily misspells the caster’s name in glowing letters','creates a small raincloud over the caster','produces applause from one invisible spectator','changes the caster’s hair part']
    },
    clumsy: {
      label: 'Clumsy Apprentice', rank: 1,
      adjectives: ['Unsteady','Improvised','Student’s','Second-Hand','Practice','Wobbly','Approximate','Experimental','Unpolished','Rehearsal'],
      procedures: ['with excessive smoke','using an overlarge gesture','after a basic concentration exercise','through two redundant syllables','with visible hesitation','after consulting a flash card','using a borrowed focus','while counting aloud'],
      results: ['functions but introduces a minor complication','achieves a reduced version of the intended result','works reliably only under ordinary conditions','creates a delayed but usable effect','requires a second attempt to stabilize','succeeds while attracting attention','delivers the effect with poor precision','works at half the expected range','creates a harmless secondary discharge'],
      side: ['makes the caster’s hair stand on end','causes nearby glassware to hum','leaves soot on both hands','produces an embarrassing echo','turns the focus warm for an hour','causes brief hiccups','makes written text shimmer','changes the caster’s voice pitch','creates a visible error rune']
    },
    competent: {
      label: 'Competent', rank: 2,
      adjectives: ['Focused','Reliable','Measured','Disciplined','Refined','Standard','Exact','Professional','Stable','Proven'],
      procedures: ['with one clean gesture','using a practiced cadence','without wasted motion','through a stable focus','with precise timing','using standard components','through a reliable sequence','under ordinary adventuring pressure'],
      results: ['applies the intended effect cleanly','creates a dependable magical result','resolves the stated magical task','maintains stable duration and targeting','operates within expected parameters','produces a predictable secondary trace','functions without unusual complication','supports practical use as designed','scales normally with its intended power'],
      side: ['leaves a faint thematic residue','produces no unusual side effect','creates a brief harmless afterimage','warms or cools the focus slightly','leaves a standard school aura','causes a soft resonant tone','produces a visible completion sigil','fades without lingering disruption','briefly sharpens nearby shadows']
    },
    elaborate: {
      label: 'Needlessly Elaborate', rank: 3,
      adjectives: ['Grand','Sevenfold','Ceremonial','Regulated','Multi-Stage','Annotated','Procedural','Hierarchical','Triple-Sealed','Committee-Approved'],
      procedures: ['after three preparatory clauses','through six redundant magical subsystems','using color-coded component trays','after announcing each operational phase','with a backup gesture for every primary gesture','through a formally witnessed sequence','after validating two contingency circles','using a twelve-step activation rubric'],
      results: ['achieves a normal result with absurd precision','creates nested safeguards around a simple effect','performs a straightforward task through multiple departments','solves the problem only after documenting it','provides three redundant confirmations','delivers the effect through a ceremonial chain','creates both primary and audit copies','uses planar routing for local delivery','measures success to unnecessary decimals'],
      side: ['leaves three explanatory diagrams in the air','announces each completed stage aloud','triggers a contingency confirming another contingency','prints a spectral receipt','summons an auditor for post-cast review','creates a completion certificate','requires the caster to initial the final rune','projects a flowchart of the effect','logs the result in an invisible archive']
    },
    impossible: {
      label: 'Massively Overcomplicated', rank: 4,
      adjectives: ['Transplanar Bureaucratic','Thirteen-Layered','Recursive','Hyperdimensional','Cathedral-Scale','Chronologically Indexed','Multiversal','Self-Auditing','Ontologically Redundant','Imperially Certified'],
      procedures: ['after a week of preparatory calculations','using synchronized circles on three planes','after filing component manifests in triplicate','through recursive sub-spells that cast one another','using temporal buffering and legal contingencies','after obtaining signatures from seven summoned witnesses','through a lattice requiring municipal zoning','after calibrating against twelve alternate timelines'],
      results: ['uses kingdom-scale magical architecture for a modest result','routes the effect through several unnecessary realities','creates a recursive chain of summoned sub-effects','performs local magic through continental infrastructure','rewrites the relevant law of physics temporarily','constructs a secondary universe to test the outcome','invokes a celestial appeals process','duplicates the subject concept before affecting it','creates eleven fallback realities'],
      side: ['summons a spectral review committee','creates a forty-page appendix','causes a backup spell to argue with the primary spell','requires an after-action hearing','leaves behind a temporary administrative dimension','generates a dissenting opinion from reality itself','creates a miniature bureaucracy in the caster’s pocket','opens a complaint portal to the astral plane','issues everyone nearby a case number']
    }
  };

  for (const competence of Object.values(COMPETENCE)) {
    competence.names = combine(competence.adjectives, ['Arcane','Mystic','Thaumaturgic','Ritual','Spellbound','Planar','Runic','Aetheric'], ['Procedure','Method','Operation','Working','Protocol','Sequence','Application','Instrument']);
    competence.casting = combine(['The spell is cast','Activation occurs','The caster proceeds','The procedure begins','Completion follows'], competence.procedures, ['before anything sensible happens','while witnesses reconsider their choices','under visible magical strain','with full component expenditure','in accordance with its questionable tradition','before the main spectacle begins','while the focus remains intact','until the final sign appears']);
    competence.effects = combine(['The spell','Its primary function','The resulting magic','The completed working','The manifested effect'], competence.results, ['within the selected area','against the chosen subject','for as long as the joke remains funny','subject to narrative interpretation','with severity-appropriate consequences','until the caster loses confidence','without becoming any less ridiculous','according to the caster’s tradition']);
    competence.sideEffects = combine(['As a side effect, it','After resolution, it','The residual magic','A secondary discharge','The spell’s aftermath'], competence.side, ['for one minute','until the next meal','within ten feet of the caster','without serious mechanical consequence','unless someone formally objects','for the remainder of the scene','until someone comments on it','in a visibly embarrassing fashion']);
  }

  window.HBEccentricCompetence = COMPETENCE;
})();
