(() => {
  let programs = [];

  function generate(root, dependencies) {
    const controls = dependencies.Core.read(root);
    programs = Array.from({ length: controls.quantity }, () => dependencies.Engine.buildProgram(dependencies.Domains, dependencies.Vocabulary, controls));
    dependencies.View.render(root, programs);
    root.querySelector('#mas-status').textContent = `Generated ${programs.length} malefic academic program${programs.length === 1 ? '' : 's'}.`;
  }

  function generateSignature(root, dependencies, signatureId) {
    programs = [dependencies.Engine.buildSignature(dependencies.Domains, dependencies.Vocabulary, signatureId)];
    dependencies.View.render(root, programs);
    root.querySelector('#mas-status').textContent = `Generated signature curriculum: ${programs[0].title}.`;
  }

  async function copy(root, dependencies) {
    try {
      const text = programs.map(dependencies.Text.program).join('\n\n========================================\n\n');
      await navigator.clipboard.writeText(text);
      root.querySelector('#mas-status').textContent = 'Malefic curricula copied as full text.';
    } catch (_) {
      root.querySelector('#mas-status').textContent = 'Clipboard access is unavailable.';
    }
  }

  function exportJson(root) {
    const payload = {
      schemaVersion: '1.0.0',
      generator: 'malefic-academic-studies-generator',
      fictionalContentNotice: 'All institutions, rituals, doctrines, hazards, and academic practices are fictional worldbuilding material.',
      generatedAt: new Date().toISOString(),
      programs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'generated-malefic-academic-programs.json';
    link.click();
    URL.revokeObjectURL(link.href);
    root.querySelector('#mas-status').textContent = 'Malefic curricula exported as JSON.';
  }

  window.HBMaleficAcademicActions = { generate, generateSignature, copy, exportJson };
})();
