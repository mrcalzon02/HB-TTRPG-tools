(() => {
  function init() {
    const root = document.getElementById('magical-library-root');
    const Arcane = window.HBArcaneAcademicDomains;
    const Malefic = window.HBMaleficAcademicDomains;
    const Vocabulary = window.HBMagicalLibraryVocabulary;
    const Engine = window.HBMagicalLibraryEngine;
    const View = window.HBMagicalLibraryView;
    const Text = window.HBMagicalLibraryText;
    const Core = window.HBMagicalLibraryControllerCore;
    const Actions = window.HBMagicalLibraryActions;
    if (!root || !Arcane || !Malefic || !Vocabulary || !Engine || !View || !Text || !Core || !Actions) return;

    const dependencies = { Arcane, Malefic, Vocabulary, Engine, View, Text, Core, Actions };
    const disciplines = Engine.collectDisciplines(Arcane, Malefic);
    Core.populateDisciplines(root.querySelector('#ml-discipline'), disciplines);
    root.querySelector('#ml-source').addEventListener('change', () => Core.syncDisciplineAvailability(root, disciplines));
    root.querySelector('#ml-generate').addEventListener('click', () => Actions.generate(root, dependencies));
    root.querySelector('#ml-copy').addEventListener('click', () => Actions.copy(root, dependencies));
    root.querySelector('#ml-export').addEventListener('click', () => Actions.exportJson(root));
    Core.syncDisciplineAvailability(root, disciplines);
    Actions.generate(root, dependencies);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
