(() => {
  let catalog = null;

  function generate(root,dependencies) {
    const controls = dependencies.Core.read(root);
    catalog = dependencies.Engine.buildCatalog(dependencies.Arcane,dependencies.Malefic,dependencies.Vocabulary,controls);
    dependencies.View.render(root,catalog);
    root.querySelector('#ml-status').textContent = `Catalogued ${catalog.totals.books} complete magical publication profiles across ${catalog.totals.disciplines} disciplines.`;
  }

  async function copy(root,dependencies) {
    if (!catalog) return;
    try {
      await navigator.clipboard.writeText(dependencies.Text.catalog(catalog));
      root.querySelector('#ml-status').textContent = 'Complete magical publication profiles copied as text.';
    } catch (_) {
      root.querySelector('#ml-status').textContent = 'Clipboard access is unavailable.';
    }
  }

  function exportJson(root) {
    if (!catalog) return;
    const payload = {
      schemaVersion:'2.0.0',
      generator:'magical-syllabus-library-generator',
      profileStage:'complete-publication-metadata',
      generatedAt:new Date().toISOString(),
      catalog
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{ type:'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'magical-syllabus-library-publication-profiles.json';
    link.click();
    URL.revokeObjectURL(link.href);
    root.querySelector('#ml-status').textContent = 'Magical publication profiles exported as JSON.';
  }

  window.HBMagicalLibraryActions = { generate, copy, exportJson };
})();
