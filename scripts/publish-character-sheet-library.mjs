import fs from 'node:fs';

function replaceFile(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (before !== after) fs.writeFileSync(path, after, 'utf8');
}

replaceFile('index.html', source => {
  if (source.includes('id="master-character-sheet-library"')) return source;
  const marker = '      <div id="character-sheet-mount"><div class="module-empty">Open Utilities to load the character sheet.</div></div>';
  const block = `${marker}\n      <section id="master-character-sheet-library" class="registry-section no-print" aria-labelledby="master-character-sheet-library-title">\n        <div class="section-heading">\n          <p class="eyebrow">Master document library</p>\n          <h2 id="master-character-sheet-library-title">TTRPG Character Sheet PDF Index</h2>\n          <p>Search 186 official, open-license, publisher-authorized, and clearly labeled community sheet records across fantasy, horror, science-fiction, cyberpunk, generic, mecha, and post-apocalyptic systems.</p>\n        </div>\n        <div class="module-grid">\n          <article class="module-card">\n            <h3>Master Character Sheet Index</h3>\n            <p>D&amp;D editions, Shadowrun, Cyberpunk, Vampire and World of Darkness, Changing Breeds, Traveller, GURPS, Call of Cthulhu, Eclipse Phase, Pathfinder, Free League systems, and many more.</p>\n            <a class="link-button" href="character-sheet-library.html">Open Character Sheet Library</a>\n          </article>\n        </div>\n      </section>`;
  if (!source.includes(marker)) throw new Error('Utilities mount marker not found in index.html');
  return source.replace(marker, block);
});

replaceFile('utilities.html', source => {
  let output = source;
  output = output.replace(
    '<div class="workspace-actions"><a class="link-button primary-action" href="index.html?view=utilities">Open Utilities Workspace</a><a class="link-button" href="generators.html">Browse Generators</a></div>',
    '<div class="workspace-actions"><a class="link-button primary-action" href="index.html?view=utilities">Open Utilities Workspace</a><a class="link-button" href="character-sheet-library.html">Open Character Sheet PDF Index</a><a class="link-button" href="generators.html">Browse Generators</a></div>'
  );
  if (!output.includes('Master TTRPG Character Sheet PDF Index')) {
    const grid = '      <div class="workspace-card-grid">';
    const card = `${grid}\n        <article class="workspace-tool-card"><h3>Master TTRPG Character Sheet PDF Index</h3><p>Search official direct PDFs, publisher download pages, open resources, and personal-use community archives for 186 character-sheet records across major game systems and editions.</p><a class="link-button" href="character-sheet-library.html">Open Character Sheet Index</a></article>`;
    if (!output.includes(grid)) throw new Error('Utilities card grid not found');
    output = output.replace(grid, card);
  }
  output = output.replace('without uploading character content to the analytics system', 'without uploading character content to an external service');
  output = output.replace(
    'Free browser-based TTRPG utilities including an editable d20 character sheet, printable pages, trackers, reference tools, JSON export, import, and table-side aids.',
    'Free browser-based TTRPG utilities including an editable d20 sheet and a master index of official and authorized character sheet PDFs for major tabletop systems.'
  );
  output = output.replace(
    'TTRPG utilities, d20 character sheet, D&D 3.5 character sheet, printable RPG sheets, campaign trackers, table aids, JSON character sheet',
    'TTRPG utilities, character sheet PDF index, D&D character sheet, Shadowrun sheet, Cyberpunk character sheet, World of Darkness sheets, Traveller sheet, GURPS sheet'
  );
  return output;
});

replaceFile('search-index.json', source => {
  const data = JSON.parse(source);
  if (!data.some(entry => entry.id === 'character-sheet-library')) {
    data.splice(2, 0, {
      id: 'character-sheet-library',
      title: 'Master TTRPG Character Sheet PDF Index',
      workspace: 'Utilities',
      description: 'Search 186 official, open-license, publisher-authorized, and clearly labeled community character sheet records across major tabletop systems and editions.',
      keywords: ['character sheet pdf', 'D&D character sheet', 'Shadowrun sheet', 'Cyberpunk RED sheet', 'World of Darkness sheets', 'Changing Breeds sheet', 'Traveller sheet', 'GURPS sheet', 'Call of Cthulhu sheet', 'Eclipse Phase sheet'],
      url: 'character-sheet-library.html'
    });
  }
  return `${JSON.stringify(data, null, 2)}\n`;
});

replaceFile('sitemap.xml', source => {
  if (source.includes('/character-sheet-library.html')) return source;
  const marker = '  <url>\n    <loc>https://mrcalzon02.github.io/HB-TTRPG-tools/utilities.html</loc>';
  const entry = `  <url>\n    <loc>https://mrcalzon02.github.io/HB-TTRPG-tools/character-sheet-library.html</loc>\n    <lastmod>2026-07-10</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  if (!source.includes(marker)) throw new Error('Utilities sitemap marker not found');
  return source.replace(marker, `${entry}${marker}`);
});

replaceFile('site-map.html', source => {
  if (source.includes('Master TTRPG Character Sheet PDF Index')) return source;
  const marker = '<article class="html-sitemap-item"><h3><a href="utilities.html">TTRPG Utilities</a></h3>';
  const card = '<article class="html-sitemap-item"><h3><a href="character-sheet-library.html">Master TTRPG Character Sheet PDF Index</a></h3><p>Search 186 sheet records covering D&amp;D, Shadowrun, Cyberpunk, World of Darkness, Changing Breeds, Traveller, GURPS, Call of Cthulhu, Eclipse Phase, Pathfinder, and many additional systems.</p><div class="keyword-cloud"><span>character sheet PDF</span><span>D&amp;D editions</span><span>World of Darkness</span><span>cyberpunk RPG</span><span>science-fiction RPG</span></div></article>\n        ';
  if (!source.includes(marker)) throw new Error('Site map utilities marker not found');
  return source.replace(marker, `${card}${marker}`);
});

console.log('Character sheet library integrated into Utilities, search, and site maps.');
