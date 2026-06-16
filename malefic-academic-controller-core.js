(() => {
  function fill(select, source, includeRandom = true) {
    select.replaceChildren();
    if (includeRandom) select.add(new Option('Random', 'random'));
    for (const [id, value] of Object.entries(source)) select.add(new Option(value.label, id));
  }

  function read(root) {
    const value = id => root.querySelector(id).value;
    return {
      toneId: value('#mas-tone'),
      typeId: value('#mas-type'),
      domainId: value('#mas-domain'),
      secondaryId: value('#mas-secondary'),
      orientationId: value('#mas-orientation'),
      levelId: value('#mas-level'),
      policyId: value('#mas-policy'),
      quantity: Math.max(1, Math.min(10, Number(value('#mas-quantity')) || 1)),
      courseCount: Number(value('#mas-course-count')) || 0
    };
  }

  window.HBMaleficAcademicControllerCore = { fill, read };
})();
