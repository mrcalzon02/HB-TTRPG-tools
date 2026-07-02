(() => {
  'use strict';

  const SOURCE_URL = 'docs/blacklight-continuum/campaign-introduction.md';
  const documentTarget = document.getElementById('blacklight-reader-document');
  const tocTarget = document.getElementById('blacklight-reader-toc');

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function slugify(value, used) {
    const base = String(value ?? '')
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
    let slug = base;
    let index = 2;
    while (used.has(slug)) slug = `${base}-${index++}`;
    used.add(slug);
    return slug;
  }

  function renderInline(value) {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = String(href).replace(/"/g, '&quot;');
      return `<a href="${safeHref}" target="_blank" rel="noopener">${label}</a>`;
    });
    return html;
  }

  function isTableSeparator(line) {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) return false;
    const cells = trimmed.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
    return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
  }

  function tableCells(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    const headings = [];
    const usedSlugs = new Set();
    let paragraph = [];
    let quote = [];
    let listType = null;
    let listItems = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      output.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }

    function flushQuote() {
      if (!quote.length) return;
      const blocks = quote.join('\n').split(/\n\s*\n/).map(block => `<p>${renderInline(block.replace(/\n/g, ' '))}</p>`).join('');
      output.push(`<blockquote>${blocks}</blockquote>`);
      quote = [];
    }

    function flushList() {
      if (!listItems.length || !listType) return;
      output.push(`<${listType}>${listItems.map(item => `<li>${renderInline(item)}</li>`).join('')}</${listType}>`);
      listItems = [];
      listType = null;
    }

    function flushBlocks() {
      flushParagraph();
      flushQuote();
      flushList();
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      const next = lines[index + 1] ?? '';

      if (!trimmed) {
        flushBlocks();
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushBlocks();
        const level = headingMatch[1].length;
        const rawTitle = headingMatch[2].replace(/\s+#+$/, '');
        const renderedTitle = renderInline(rawTitle);
        const id = slugify(rawTitle, usedSlugs);
        output.push(`<h${level} id="${id}">${renderedTitle}</h${level}>`);
        if (level <= 3) headings.push({ level, title: rawTitle.replace(/[*_`]/g, ''), id });
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushBlocks();
        output.push('<hr>');
        continue;
      }

      if (trimmed.startsWith('>')) {
        flushParagraph();
        flushList();
        quote.push(trimmed.replace(/^>\s?/, ''));
        continue;
      }

      const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        flushQuote();
        const requestedType = unorderedMatch ? 'ul' : 'ol';
        if (listType && listType !== requestedType) flushList();
        listType = requestedType;
        listItems.push((unorderedMatch || orderedMatch)[1]);
        continue;
      }

      if (trimmed.includes('|') && isTableSeparator(next)) {
        flushBlocks();
        const headers = tableCells(trimmed);
        index += 1;
        const rows = [];
        while (index + 1 < lines.length) {
          const candidate = lines[index + 1];
          if (!candidate.trim() || !candidate.includes('|')) break;
          rows.push(tableCells(candidate));
          index += 1;
        }
        output.push(`
          <div class="blacklight-reader-table-wrap"><table>
            <thead><tr>${headers.map(header => `<th>${renderInline(header)}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${headers.map((_header, cellIndex) => `<td>${renderInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>`);
        continue;
      }

      paragraph.push(trimmed);
    }

    flushBlocks();
    return { html: output.join('\n'), headings };
  }

  function renderToc(headings) {
    if (!tocTarget) return;
    if (!headings.length) {
      tocTarget.innerHTML = '<p class="helper-note">No document headings were found.</p>';
      return;
    }
    tocTarget.innerHTML = headings.map(heading =>
      `<a href="#${escapeHtml(heading.id)}" data-level="${heading.level}">${escapeHtml(heading.title)}</a>`
    ).join('');
  }

  async function initialize() {
    try {
      const response = await fetch(SOURCE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Campaign source request failed with status ${response.status}.`);
      const markdown = await response.text();
      const rendered = renderMarkdown(markdown);
      documentTarget.innerHTML = rendered.html;
      renderToc(rendered.headings);
      document.title = 'Blacklight Continuum: No Return Signal';
    } catch (error) {
      documentTarget.innerHTML = `
        <div class="blacklight-reader-loading">
          <p class="eyebrow">Campaign record unavailable</p>
          <h2>The formatted document could not be loaded.</h2>
          <p>${escapeHtml(error.message)}</p>
          <p>Serve the repository through GitHub Pages or another web server so the reader can fetch the campaign source.</p>
        </div>`;
      if (tocTarget) tocTarget.innerHTML = '<p class="helper-note">Contents unavailable.</p>';
    }
  }

  document.getElementById('blacklight-reader-print')?.addEventListener('click', () => window.print());
  void initialize();
})();