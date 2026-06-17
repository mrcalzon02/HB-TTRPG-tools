(() => {
  function populateDisciplines(select, disciplines) {
    select.replaceChildren(new Option('All disciplines', 'all'));
    const groups = {
      arcane: document.createElement('optgroup'),
      malefic: document.createElement('optgroup')
    };
    groups.arcane.label = 'Arcane Academic Studies';
    groups.malefic.label = 'Malefic Academic Studies';
    for (const discipline of disciplines) groups[discipline.source].appendChild(new Option(discipline.label, discipline.id));
    select.append(groups.arcane, groups.malefic);
  }

  function read(root) {
    const value = id => root.querySelector(id).value;
    return {
      sourceId:value('#ml-source'),
      disciplineId:value('#ml-discipline'),
      shelfId:value('#ml-shelf'),
      scale:value('#ml-scale'),
      titlesPerDiscipline:Math.max(10, Math.min(30, Number(value('#ml-count')) || 10))
    };
  }

  function syncDisciplineAvailability(root, disciplines) {
    const source = root.querySelector('#ml-source').value;
    const select = root.querySelector('#ml-discipline');
    for (const option of select.options) {
      if (option.value === 'all') continue;
      const discipline = disciplines.find(item => item.id === option.value);
      option.disabled = source !== 'all' && discipline?.source !== source;
    }
    if (select.selectedOptions[0]?.disabled) select.value = 'all';
  }

  window.HBMagicalLibraryControllerCore = { populateDisciplines, read, syncDisciplineAvailability };
})();
