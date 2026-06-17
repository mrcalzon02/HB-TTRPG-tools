(() => {
  let catalog = null;

  function generate(root,dependencies) {
    const controls = dependencies.Core.read(root);
    catalog = dependencies.Engine.buildCatalog(dependencies.Arcane,dependencies.Malefic,dependencies.Vocabulary,controls);
    dependencies.View.render(root,catalog);
    const completeDrafts = catalog.disciplines.reduce((sum,discipline) => sum + discipline.books.filter(book => book.generatedContent?.isFullDraft).length,0);
    root.querySelector('#ml-status').textContent = `Generated ${catalog.totals.books} publication content packages across ${catalog.totals.disciplines} disciplines, including ${completeDrafts} complete pamphlet or study-guide drafts.`;
  }

  async function copy(root,dependencies) {
    if (!catalog) return;
    try {
      await navigator.clipboard.writeText(dependencies.Text.catalog(catalog));
      root.querySelector('#ml-status').textContent = 'Complete magical catalogue, publication profiles, and generated contents copied as text.';
    } catch (_) {
      root.querySelector('#ml-status').textContent = 'Clipboard access is unavailable.';
    }
  }

  function exportJson(root) {
    if (!catalog) return;
    const payload = {
      schemaVersion:'3.0.0',
      generator:'magical-syllabus-library-generator',
      profileStage:'systematic-publication-content',
      generatedAt:new Date().toISOString(),
      catalog
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{ type:'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'magical-syllabus-library-generated-contents.json';
    link.click();
    URL.revokeObjectURL(link.href);
    root.querySelector('#ml-status').textContent = 'Magical publication profiles and generated contents exported as JSON.';
  }

  window.HBMagicalLibraryActions = { generate, copy, exportJson };
})();
