(() => {
  'use strict';

  const RESOURCE_INDEX = 'api/resources/warhammer-40k-lore-index.json';
  const group = document.getElementById('indexed-chronicles-group');
  const list = document.getElementById('indexed-chronicles-list');
  const stories = document.getElementById('stories');
  if (!group || !list || !stories) return;

  function cleanInline(value) {
    return String(value || '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\`([^\`]+)\`/g, '$1');
  }

  function slug(path) {
    return 'indexed-story-' + path
      .replace(/^.*\//, '')
      .replace(/\.md$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function identity(markdown, path) {
    const lines = markdown.split(/\r?\n/);
    const h1 = lines.find(line => /^#\s+/.test(line));
    const h2 = lines.find(line => /^##\s+/.test(line));
    const series = cleanInline(h1 ? h1.replace(/^#\s+/, '').trim() : path.replace(/^.*\//, '').replace(/\.md$/i, '').replace(/[-_]+/g, ' '));
    const chapter = cleanInline(h2 ? h2.replace(/^##\s+/, '').trim() : '');
    return {series, chapter, title: chapter ? series + ' — ' + chapter : series};
  }

  function renderMarkdown(target, markdown) {
    const lines = markdown.split(/\r?\n/);
    let skippedH1 = false;
    let skippedH2 = false;
    let paragraph = [];
    let ul = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement('p');
      p.textContent = cleanInline(paragraph.join(' '));
      target.append(p);
      paragraph = [];
    };
    const flushList = () => {
      if (!ul) return;
      target.append(ul);
      ul = null;
    };
    const flush = () => { flushParagraph(); flushList(); };

    for (const raw of lines) {
      const line = raw.trimEnd();
      const trimmed = line.trim();
      if (!trimmed) { flush(); continue; }

      if (/^#\s+/.test(trimmed) && !skippedH1) { skippedH1 = true; continue; }
      if (/^##\s+/.test(trimmed) && !skippedH2) { skippedH2 = true; continue; }

      const heading = trimmed.match(/^(#{2,6})\s+(.+)$/);
      if (heading) {
        flush();
        const h = document.createElement('h' + Math.min(6, Math.max(3, heading[1].length + 1)));
        h.textContent = cleanInline(heading[2]);
        target.append(h);
        continue;
      }
      if (/^---+$/.test(trimmed)) {
        flush();
        target.append(document.createElement('hr'));
        continue;
      }
      if (/^>\s?/.test(trimmed)) {
        flush();
        const quote = document.createElement('blockquote');
        quote.textContent = cleanInline(trimmed.replace(/^>\s?/, ''));
        target.append(quote);
        continue;
      }
      if (/^-\s+/.test(trimmed)) {
        flushParagraph();
        if (!ul) ul = document.createElement('ul');
        const li = document.createElement('li');
        li.textContent = cleanInline(trimmed.replace(/^-\s+/, ''));
        ul.append(li);
        continue;
      }
      if (/^\*[^*].*\*$/.test(trimmed)) {
        flush();
        const p = document.createElement('p');
        const em = document.createElement('em');
        em.textContent = cleanInline(trimmed.slice(1, -1));
        p.append(em);
        target.append(p);
        continue;
      }
      flushList();
      paragraph.push(trimmed);
    }
    flush();
  }

  async function load() {
    try {
      const response = await fetch(RESOURCE_INDEX, {cache:'no-store'});
      if (!response.ok) throw new Error('resource index returned ' + response.status);
      const index = await response.json();
      const paths = (index.resources || []).filter(path => /^assets\/warhammer-40k\/lore\/.+\.md$/i.test(path));
      const loaded = await Promise.all(paths.map(async path => {
        const item = await fetch(path, {cache:'no-store'});
        if (!item.ok) throw new Error(path + ' returned ' + item.status);
        const markdown = await item.text();
        return {path, markdown, identity: identity(markdown, path)};
      }));

      list.replaceChildren();
      loaded.forEach((entry, offset) => {
        const id = slug(entry.path);
        const li = document.createElement('li');
        li.value = 87 + offset;
        const link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = entry.identity.title;
        li.append(link);
        list.append(li);

        const article = document.createElement('article');
        article.className = 'story indexed-chronicle';
        article.id = id;
        article.dataset.storyTitle = entry.identity.title;
        article.dataset.storySection = 'VII. Recovered & Continuing Chronicles';

        const header = document.createElement('header');
        header.className = 'story-header';
        const meta = document.createElement('p');
        meta.className = 'story-meta';
        meta.textContent = 'Project Chronicle #' + (offset + 1) + ' · VII. Recovered & Continuing Chronicles';
        const h2 = document.createElement('h2');
        h2.textContent = entry.identity.title;
        const byline = document.createElement('p');
        byline.className = 'byline';
        byline.textContent = 'By Mrcalzon02 / Christopher Vardeman · indexed project chronicle';
        header.append(meta, h2, byline);

        const body = document.createElement('div');
        body.className = 'story-text indexed-markdown';
        renderMarkdown(body, entry.markdown);

        const back = document.createElement('p');
        back.className = 'story-return';
        const backLink = document.createElement('a');
        backLink.href = '#archive-top';
        backLink.textContent = 'Return to Story Index';
        back.append(backLink);

        article.append(header, body, back);
        stories.append(article);
      });

      window.Warhammer40KStorySearchApply?.();
      if (location.hash && document.querySelector(location.hash)) {
        requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({block:'start'}));
      }
    } catch (error) {
      list.replaceChildren();
      const li = document.createElement('li');
      li.className = 'indexed-loading';
      li.textContent = 'Indexed project chronicles could not be loaded: ' + error.message;
      list.append(li);
    }
  }

  void load();
})();
