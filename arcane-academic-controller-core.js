(() => {
  function fill(select, source, includeRandom = true) {
    select.replaceChildren();
    if (includeRandom) select.add(new Option('Random', 'random'));
    for (const [id, value] of Object.entries(source)) {
      select.add(new Option(value.label, id));
    }
  }

  function read(root) {
    const value = id => root.querySelector(id).value;
    return {
      toneId: value('#aas-tone'),
      typeId: value('#aas-type'),
      domainId: value('#aas-domain'),
      secondaryId: value('#aas-secondary'),
      orientationId: value('#aas-orientation'),
      levelId: value('#aas-level'),
      policyId: value('#aas-policy'),
      quantity: Math.max(1, Math.min(10, Number(value('#aas-quantity')) || 1)),
      courseCount: Number(value('#aas-course-count')) || 0
    };
  }

  window.HBArcaneAcademicControllerCore = { fill, read };
})();
