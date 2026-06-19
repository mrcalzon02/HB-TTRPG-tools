(() => {
  const registryUrl = 'data/barotrauma-tools-registry.json';
  const indexUrl = 'data/barotrauma/wiki/crewmans-primer-index.json';
  const parts = Array.from({ length: 8 }, (_, i) => `source/crewmans-primer-compact-part-${String(i).padStart(2, '0')}.b64`);
  const search = document.getElementById('barotrauma-search');
  const status = document.getElementById('barotrauma-status');
  const grid = document.getElementById('barotrauma-overview-grid');
  const filters = [...document.querySelectorAll('[data-barotrauma-filter]')];
  let registry, activeFilter = 'all', primer, activeId, category = 'all';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const human = value => String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  const text = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.text(); };
  const json = async url => JSON.parse(await text(url));

  function styles() {
    if (document.getElementById('barotrauma-primer-styles')) return;
    const s = document.createElement('style'); s.id = 'barotrauma-primer-styles';
    s.textContent = `.primer-browser{margin:24px 0 34px;border:1px solid var(--line);border-radius:24px;padding:20px;background:rgba(0,0,0,.22);box-shadow:var(--shadow)}.primer-browser[hidden]{display:none}.primer-header{display:flex;justify-content:space-between;gap:18px;align-items:start}.primer-edition,.primer-entry-meta{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.76rem}.primer-disclaimer,.primer-source-meta,.primer-entry p,.primer-entry li,.primer-list small{color:var(--muted)}.primer-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px 14px;margin:16px 0}.primer-controls input{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}.primer-categories{display:flex;flex-wrap:wrap;gap:7px;grid-column:1/-1}.primer-chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.04);color:var(--muted)}.primer-chip.active,.primer-chip:hover{color:var(--ink);border-color:var(--accent)}.primer-layout{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:16px}.primer-list{display:grid;gap:7px;align-content:start;max-height:78vh;overflow:auto}.primer-list button{text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 10px 10px calc(10px + var(--level,0)*14px);background:rgba(255,255,255,.025);color:var(--ink)}.primer-list button.active,.primer-list button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}.primer-entry{border:1px solid rgba(200,138,53,.36);border-radius:18px;padding:22px;background:rgba(0,0,0,.18);min-width:0}.primer-entry h3{font-size:clamp(1.45rem,3vw,2.45rem);margin:4px 0 14px}.primer-entry p,.primer-entry li{line-height:1.66}.primer-entry p{margin:0 0 1em}.primer-entry ul,.primer-entry ol{padding-left:1.6em}.primer-navigation{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);margin-top:24px;padding-top:16px}.primer-navigation button:last-child{margin-left:auto}.primer-empty{padding:18px;color:var(--muted);border:1px dashed var(--line);border-radius:14px}@media(max-width:900px){.primer-header,.primer-layout,.primer-controls{grid-template-columns:1fr;display:grid}.primer-list{max-height:45vh}}`;
    document.head.appendChild(s);
  }

  function card(module) {
    const a = document.createElement('article'); a.className = 'module-card'; a.dataset.moduleId = module.id;
    a.innerHTML = `<div class="module-meta"><span class="badge ${module.status === 'planned' ? 'status-planned' : ''}">${esc(human(module.status))}</span><span class="badge section-${esc(module.section)}">${esc(human(module.section))}</span></div><h3>${esc(module.title)}</h3><p>${esc(module.description)}</p><div class="chip-list">${(module.dataFamilies || []).map(x => `<span class="chip">${esc(human(x))}</span>`).join('')}</div>`;
    if (module.launchTarget === 'crewmans-primer') { const b = document.createElement('button'); b.type = 'button'; b.className = 'primary-action'; b.textContent = module.actionLabel || 'Open Crewman’s Primer'; b.onclick = openPrimer; a.appendChild(b); }
    return a;
  }

  function renderRegistry() {
    if (!registry || !grid || !status) return;
    const q = (search?.value || '').trim().toLowerCase();
    const all = [...(registry.modules || [])].sort((a,b) => (a.priority || 999) - (b.priority || 999));
    const shown = all.filter(m => (activeFilter === 'all' || m.section === activeFilter) && (!q || [m.title,m.section,m.status,m.description,...(m.tags||[]),...(m.dataFamilies||[])].join(' ').toLowerCase().includes(q)));
    grid.innerHTML = ''; shown.forEach(m => grid.appendChild(card(m)));
    if (!shown.length) grid.innerHTML = '<div class="module-empty">No Barotrauma modules match the current search and filter.</div>';
    status.textContent = `${shown.length} of ${all.length} modules shown · ${registry.status}`;
  }

  async function loadPrimer() {
    if (primer) return primer;
    const index = await json(indexUrl), base = indexUrl.slice(0, indexUrl.lastIndexOf('/') + 1);
    const encoded = (await Promise.all(parts.map(p => text(base + p)))).join('').replace(/\s+/g, '');
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const { default: BZip2 } = await import('https://cdn.jsdelivr.net/npm/bzip2-wasm@1.0.1/+esm');
    const decoder = new BZip2(); await decoder.init();
    const source = JSON.parse(new TextDecoder().decode(decoder.decompress(bytes, 393184)));
    const entries = source.entries || [];
    if (entries.length !== 198) throw new Error(`Expected 198 source-titled entries; loaded ${entries.length}.`);
    primer = { index, entries }; activeId = entries[0].id; return primer;
  }

  function shell() {
    let box = document.getElementById('barotrauma-primer-browser');
    if (!box) { box = document.createElement('section'); box.id = 'barotrauma-primer-browser'; box.className = 'primer-browser no-print'; box.hidden = true; document.getElementById('barotrauma')?.appendChild(box); }
    return box;
  }

  async function openPrimer() {
    const box = shell(); if (!box) return; box.hidden = false; box.innerHTML = '<p class="helper-note">Loading all 198 source sections…</p>';
    try { renderPrimer(box, await loadPrimer()); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (error) { box.innerHTML = `<div class="primer-empty">The Crewman’s Primer could not be loaded: ${esc(error.message)}</div>`; console.error(error); }
  }

  const entryText = e => [e.title,e.category,e.chapter,...(e.blocks||[]).flatMap(b => b.type === 'list' ? b.items || [] : [b.text || ''])].join(' ').toLowerCase();
  function visible(box, entries) { const q = (box.querySelector('#primer-search')?.value || '').trim().toLowerCase(); return entries.filter(e => (category === 'all' || e.category === category) && (!q || entryText(e).includes(q))); }

  function renderPrimer(box, { index, entries }) {
    box.innerHTML = `<div class="primer-header"><div><p class="eyebrow">Complete source-document wiki conversion</p><h2>${esc(index.displayTitle || index.title)}</h2><p class="primer-edition">198 source-titled entries · ${Number(index.wordCount || 0).toLocaleString()} words</p><p>${esc(index.subtitle)}</p><p>${esc(index.description)}</p></div><p class="primer-disclaimer">${esc(index.disclaimer)}</p></div><div class="primer-controls"><input id="primer-search" type="search" placeholder="Search every title, paragraph, and list item..."><button id="primer-close" class="secondary-action">Close Primer</button><div id="primer-categories" class="primer-categories"></div></div><div class="primer-layout"><nav id="primer-list" class="primer-list"></nav><article id="primer-entry" class="primer-entry"></article></div>`;
    box.querySelector('#primer-search').oninput = () => renderList(box, entries); box.querySelector('#primer-close').onclick = () => { box.hidden = true; };
    const cats = box.querySelector('#primer-categories'); ['all',...(index.categories||[])].forEach(c => { const b = document.createElement('button'); b.type='button'; b.className=`primer-chip ${c===category?'active':''}`; b.textContent=c==='all'?'All Source Sections':c; b.onclick=()=>{category=c; [...cats.children].forEach(x=>x.classList.toggle('active',x===b)); renderList(box,entries);}; cats.appendChild(b); });
    renderList(box, entries); renderEntry(box, entries, activeId);
  }

  function renderList(box, entries) {
    const list = box.querySelector('#primer-list'), matches = visible(box, entries); list.innerHTML='';
    if (!matches.length) { list.innerHTML='<div class="primer-empty">No source sections match the current search.</div>'; return; }
    if (!matches.some(e => e.id === activeId)) { activeId = matches[0].id; renderEntry(box, entries, activeId); }
    matches.forEach(e => { const b=document.createElement('button'); const n=entries.indexOf(e)+1; b.type='button'; b.dataset.entryId=e.id; b.className=e.id===activeId?'active':''; b.style.setProperty('--level',Math.max(0,(e.headingLevel||1)-1)); b.innerHTML=`<strong>${String(n).padStart(3,'0')}. ${esc(e.title)}</strong><br><small>${esc(e.category)} · heading level ${e.headingLevel}</small>`; b.onclick=()=>renderEntry(box,entries,e.id); list.appendChild(b); });
  }

  function renderBlocks(target, blocks) {
    (blocks||[]).forEach(block => { if (block.type === 'list') { const list=document.createElement(block.ordered?'ol':'ul'); (block.items||[]).forEach(t=>{const li=document.createElement('li'); li.textContent=t; list.appendChild(li);}); target.appendChild(list); } else { const p=document.createElement('p'); p.textContent=block.text||''; target.appendChild(p); } });
  }

  function renderEntry(box, entries, id) {
    const e=entries.find(x=>x.id===id)||entries[0], target=box.querySelector('#primer-entry'), n=entries.indexOf(e); activeId=e.id;
    box.querySelectorAll('#primer-list button').forEach(b=>b.classList.toggle('active',b.dataset.entryId===e.id));
    target.innerHTML=`<div class="primer-entry-meta">Source entry ${n+1} of 198 · ${esc(e.category)}</div><h3>${esc(e.title)}</h3><div class="primer-source-meta">${esc(e.chapter)} · source paragraphs ${e.sourceStartParagraph}–${e.sourceEndParagraph} · ${e.wordCount} words</div>`; renderBlocks(target,e.blocks);
    const nav=document.createElement('div'); nav.className='primer-navigation'; if(n>0){const b=document.createElement('button');b.className='secondary-action';b.textContent=`← ${entries[n-1].title}`;b.onclick=()=>renderEntry(box,entries,entries[n-1].id);nav.appendChild(b);} if(n<197){const b=document.createElement('button');b.className='secondary-action';b.textContent=`${entries[n+1].title} →`;b.onclick=()=>renderEntry(box,entries,entries[n+1].id);nav.appendChild(b);} target.appendChild(nav);
  }

  search?.addEventListener('input', renderRegistry);
  filters.forEach(b => b.addEventListener('click', () => { activeFilter=b.dataset.barotraumaFilter||'all'; filters.forEach(x=>x.classList.toggle('active',x===b)); renderRegistry(); }));
  styles(); shell(); json(registryUrl).then(data => { registry=data; renderRegistry(); }).catch(error => { if(status) status.textContent='The Barotrauma registry could not be loaded.'; console.error(error); });
})();
