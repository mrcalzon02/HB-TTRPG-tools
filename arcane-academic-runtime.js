(() => {
  function init() {
    const root = document.getElementById('arcane-academic-root');
    const Domains = window.HBArcaneAcademicDomains;
    const Vocabulary = window.HBArcaneAcademicVocabulary;
    const Engine = window.HBArcaneAcademicEngine;
    const View = window.HBArcaneAcademicView;
    const Text = window.HBArcaneAcademicText;
    const Core = window.HBArcaneAcademicControllerCore;
    const Actions = window.HBArcaneAcademicActions;
    if (!root || !Domains || !Vocabulary || !Engine || !View || !Text || !Core || !Actions) return;

    const dependencies = { Domains, Vocabulary, Engine, View, Text, Core, Actions };
    Core.fill(root.querySelector('#aas-tone'), Vocabulary.INSTITUTION_TONES);
    Core.fill(root.querySelector('#aas-type'), Vocabulary.PROGRAM_TYPES);
    Core.fill(root.querySelector('#aas-domain'), Domains.DOMAINS);
    Core.fill(root.querySelector('#aas-secondary'), Domains.DOMAINS);
    Core.fill(root.querySelector('#aas-orientation'), Vocabulary.ORIENTATIONS);
    Core.fill(root.querySelector('#aas-level'), Vocabulary.LEVELS);
    Core.fill(root.querySelector('#aas-policy'), Vocabulary.POLICIES);

    root.querySelector('#aas-generate').addEventListener('click', () => Actions.generate(root, dependencies));
    root.querySelector('#aas-copy').addEventListener('click', () => Actions.copy(root, dependencies));
    root.querySelector('#aas-export').addEventListener('click', () => Actions.exportJson(root));
    Actions.generate(root, dependencies);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
