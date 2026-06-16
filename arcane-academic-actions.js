(() => {
  let programs = [];

  function generate(root, dependencies) {
    const controls = dependencies.Core.read(root);
    programs = Array.from({ length: controls.quantity }, () =>
      dependencies.Engine.buildProgram(dependencies.Domains, dependencies.Vocabulary, controls)
    );
    dependencies.View.render(root, programs);
    root.querySelector('#aas-status').textContent = `Generated ${programs.length} arcane academic program${programs.length === 1 ? '' : 's'}.`;
  }

  async function copy(root, dependencies) {
    try {
      const text = programs.map(dependencies.Text.program).join('\n\n========================================\n\n');
      await navigator.clipboard.writeText(text);
      root.querySelector('#aas-status').textContent = 'Academic programs copied as full text.';
    } catch (_) {
      root.querySelector('#aas-status').textContent = 'Clipboard access is unavailable.';
    }
  }

  function exportJson(root) {
    const payload = {
      schemaVersion: '1.0.0',
      generator: 'arcane-academic-studies-generator',
      generatedAt: new Date().toISOString(),
      programs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'generated-arcane-academic-programs.json';
    link.click();
    URL.revokeObjectURL(link.href);
    root.querySelector('#aas-status').textContent = 'Academic programs exported as JSON.';
  }

  window.HBArcaneAcademicActions = { generate, copy, exportJson };
})();
