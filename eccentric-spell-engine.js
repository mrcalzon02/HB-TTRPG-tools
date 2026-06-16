(() => {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const choose = (o, id) => id === 'random' ? pick(Object.keys(o)) : id;
  const strip = s => s.replace(/^(As a side effect, it|After resolution, it|The residual magic|A secondary discharge|The spell’s aftermath)\s*/i, '');

  function concept(E, bias, preset) {
    if (preset) return preset;
    const id = bias === 'random' ? pick(Object.keys(E.CONCEPTS)) : bias;
    const pool = E.CONCEPTS[id];
    return { biasId:id, subject:pick(pool.subjects), phenomenon:pick(pool.phenomena), ritual:pick(pool.rituals) };
  }

  function title(E, themeId, comp, moral, oddity, c, preset) {
    if (preset?.label) return preset.label;
    if (comp.rank <= 1 && oddity.rank <= 1) return `${c.subject} ${c.phenomenon}`;
    if (comp.rank === 2) return `${pick(moral.adjectives)} ${c.subject} ${c.phenomenon}`;
    if (comp.rank === 3) return `${pick(comp.adjectives)} ${E.THEME_ADJECTIVES[themeId] || 'Arcane'} ${c.phenomenon} of the ${c.subject}`;
    return `${E.THEME_ADJECTIVES[themeId] || 'Arcane'} ${pick(['Incantation','Invocation','Ordinance','Recursive Formula'])} of the ${c.subject} ${c.ritual}`;
  }

  function primary(c, oddity) {
    const weather = ['Storm','Front','Monsoon','Drizzle','Cyclone','Fog','Downpour','Hail','Rainbow','Thunderhead'];
    if (weather.includes(c.phenomenon)) return `${pick(oddity.scope)} becomes the center of a ${c.subject.toLowerCase()} ${c.phenomenon.toLowerCase()} with impossible clouds and completely unjustified atmospheric confidence.`;
    if (c.phenomenon.includes('Banishment')) return `The working declares the ${c.subject} cosmologically unwelcome and attempts to expel it from ${pick(oddity.scope)}, including its footprints, paperwork, and dramatic entrances.`;
    if (c.phenomenon.includes('Summoning')) return `The spell calls forth the ${c.subject} into ${pick(oddity.scope)}, already confused, fully introduced, and carrying whatever documentation the ritual requires.`;
    return `The ${c.subject} undergoes a highly public ${c.phenomenon.toLowerCase()} throughout ${pick(oddity.scope)}, presented as the inevitable conclusion of serious magical scholarship.`;
  }

  function build(V, C, M, E, controls, preset = null) {
    const themeId = preset?.themeId || choose(V.THEMES, controls.themeId);
    const classId = preset?.classId || choose(V.CLASSES, controls.classId);
    const competenceId = preset?.competenceId || controls.competenceId;
    const moralityId = preset?.moralityId || controls.moralityId;
    const oddityId = preset?.oddityId || controls.oddityId;
    const theme = V.THEMES[themeId], cls = V.CLASSES[classId];
    const comp = C[competenceId], moral = M[moralityId], oddity = E.ODDITY[oddityId];
    const c = concept(E, preset?.biasId || controls.biasId, preset);
    return {
      id:`eccentric-spell-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
      name:title(E, themeId, comp, moral, oddity, c, preset),
      theme:{id:themeId,label:theme.label}, castingTradition:{id:classId,label:cls.label},
      competence:{id:competenceId,label:comp.label}, moralTone:{id:moralityId,label:moral.label},
      odditySeverity:{id:oddityId,label:oddity.label}, conceptBias:{id:c.biasId,label:E.CONCEPT_BIASES[c.biasId]?.label || c.biasId},
      subject:c.subject, phenomenon:c.phenomenon, ritual:c.ritual,
      suggestedLevel:E.suggestLevel(competenceId,moralityId,oddityId),
      manifestation:`${pick(theme.visuals)} ${pick(moral.flavorsExpanded)}`,
      casting:`${pick(comp.casting)} Required nonsense: ${pick(E.COMPONENTS)}. ${pick(cls.wording)}`,
      primaryEffect:`${primary(c,oddity)} ${pick(comp.effects)} ${pick(moral.purposesExpanded)}`,
      secondaryEffect:`${pick(E.SECONDARY_EFFECTS)}; additionally, ${strip(pick(comp.sideEffects))}.`,
      knockOnEffect:`${pick(E.KNOCK_ON_EFFECTS)}. The incident ${pick(oddity.aftermath)}.`,
      afterEffect:`${pick(E.AFTER_EFFECTS)}; this remains noticeable ${pick(oddity.persistence)}.`,
      origin:`${pick(theme.origins)} The surviving account insists the spell was intentional, although every margin note argues otherwise.`,
      gmUse:pick(E.GM_USES), mechanicalStatus:'Thematic concept only; exact mechanics intentionally omitted.'
    };
  }

  window.HBEccentricSpellEngine = { build };
})();
