(() => {
  function init() {
    const root = document.getElementById('malefic-academic-root');
    const Domains = window.HBMaleficAcademicDomains;
    const Vocabulary = window.HBMaleficAcademicVocabulary;
    const Engine = window.HBMaleficAcademicEngine;
    const View = window.HBMaleficAcademicView;
    const Text = window.HBMaleficAcademicText;
    const Core = window.HBMaleficAcademicControllerCore;
    const Actions = window.HBMaleficAcademicActions;
    if (!root || !Domains || !Vocabulary || !Engine || !View || !Text || !Core || !Actions) return;

    const dependencies = { Domains, Vocabulary, Engine, View, Text, Core, Actions };
    Core.fill(root.querySelector('#mas-tone'), Vocabulary.INSTITUTION_TONES);
    Core.fill(root.querySelector('#mas-type'), Vocabulary.PROGRAM_TYPES);
    Core.fill(root.querySelector('#mas-domain'), Domains.DOMAINS);
    Core.fill(root.querySelector('#mas-secondary'), Domains.DOMAINS);
    Core.fill(root.querySelector('#mas-orientation'), Vocabulary.ORIENTATIONS);
    Core.fill(root.querySelector('#mas-level'), Vocabulary.LEVELS);
    Core.fill(root.querySelector('#mas-policy'), Vocabulary.POLICIES);

    root.querySelector('#mas-generate').addEventListener('click', () => Actions.generate(root, dependencies));
    root.querySelector('#mas-copy').addEventListener('click', () => Actions.copy(root, dependencies));
    root.querySelector('#mas-export').addEventListener('click', () => Actions.exportJson(root));
    root.querySelector('#mas-heretics-101').addEventListener('click', () => Actions.generateSignature(root, dependencies, 'heretics101'));
    root.querySelector('#mas-astral-corruption').addEventListener('click', () => Actions.generateSignature(root, dependencies, 'astralCorruption'));
    root.querySelector('#mas-chagoth-manual').addEventListener('click', () => Actions.generateSignature(root, dependencies, 'chagothManual'));
    Actions.generate(root, dependencies);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
