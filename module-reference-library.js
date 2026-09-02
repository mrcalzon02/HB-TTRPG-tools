(() => {
  'use strict';

  const INVENTORY_URL = 'data/modules/module-inventory.json';
  let inventory = null;
  let activeModule = null;
  let activePath = null;

  const css = `
    .module-example-library{border:1px solid var(--line);border-radius:22px;padding:14px;background:rgba(255,255,255,.04);box-shadow:var(--shadow)}
    .module-example-library-head{display:flex;gap:12px;align-items:end;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px}
    .module-example-library-head h3{margin:0}.module-example-library-head p{margin:4px 0 0;color:var(--muted);max-width:72ch}
    .module-example-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}
    .module-example-card{display:grid;gap:7px;border:1px solid var(--line);border-radius:14px;padding:10px;background:rgba(0,0,0,.16)}
    .module-example-card strong{line-height:1.25}.module-example-card small{color:var(--muted);line-height:1.35}.module-example-card button{justify-self:start;border:1px solid var(--line);border-radius:10px;padding:7px 9px;background:rgba(0,0,0,.2);color:var(--ink);cursor:pointer}.module-example-card button:hover{border-color:var(--accent)}
    .module-example-badges{display:flex;flex-wrap:wrap;gap:5px}.module-example-badge{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line);border-radius:999px;padding:3px 6px;color:var(--muted)}
    .module-source-reference{margin-top:12px;border:1px solid rgba(200,138,53,.35);border-radius:14px;overflow:hidden;background:#05070b}.module-source-reference iframe{display:block;width:100%;height:min(72vh,900px);border:0;background:white}
    .module-source-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 0}.module-source-tools button,.module-source-tools a{border:1px solid var(--line);border-radius:10px;padding:7px 9px;background:rgba(0,0,0,.2);color:var(--ink);text-decoration:none;cursor:pointer}.module-source-tools button:hover,.module-source-tools a:hover{border-color:var(--accent)}
    .module-reference-only #module-map{display:none}
  `;

  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function styleOnce(){ if(document.getElementById('module-reference-library-style')) return; const s=document.createElement('style'); s.id='module-reference-library-style'; s.textContent=css; document.head.appendChild(s); }
  async function getInventory(){
    if(inventory) return inventory;
    const response = await fetch(INVENTORY_URL,{cache:'no-store'});
    if(!response.ok) throw new Error(`Unable to load ${INVENTORY_URL}`);
    inventory = await response.json();
    return inventory;
  }
  function itemFor(module,path){
    const items=inventory?.items||[];
    return items.find(item=>item.id===module?.id) || items.find(item=>item.viewerPath===path) || null;
  }
  function openInViewer(path){
    const select=document.querySelector('#module-select');
    if(!select) return;
    select.value=path;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#module-viewer-root')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderLibrary(){
    const shell=document.querySelector('#module-viewer-root .module-viewer-shell');
    if(!shell || document.getElementById('module-example-library')) return;
    const section=document.createElement('section');
    section.id='module-example-library'; section.className='module-example-library no-print';
    section.innerHTML=`<div class="module-example-library-head"><div><p class="eyebrow">Examples, templates, and use cases</p><h3>Module Example Library</h3><p>These preserved modules are the reference corpus for the module viewer and procedural generator. Open any example here without leaving the Modules workspace.</p></div><span class="module-example-badge">${(inventory?.items||[]).length} references</span></div><div class="module-example-grid">${(inventory?.items||[]).map(item=>`<article class="module-example-card" data-module-example="${esc(item.id)}"><strong>${esc(item.title)}</strong><div class="module-example-badges"><span class="module-example-badge">${esc(item.status)}</span>${(item.role||[]).map(role=>`<span class="module-example-badge">${esc(role)}</span>`).join('')}</div><small>${esc(item.notes||'Preserved module reference.')}</small><button type="button" data-open-module="${esc(item.viewerPath)}">Open in Viewer</button></article>`).join('')}</div>`;
    shell.insertBefore(section,shell.firstChild);
    section.querySelectorAll('[data-open-module]').forEach(button=>button.addEventListener('click',()=>openInViewer(button.dataset.openModule)));
  }
  function removeSourcePane(){
    document.querySelector('#module-source-reference')?.remove();
    document.querySelector('#module-source-tools')?.remove();
    document.querySelector('.module-map-card')?.classList.remove('module-reference-only');
  }
  function addSourcePane(item,module){
    removeSourcePane();
    if(!item?.sourcePdf) return;
    const mapCard=document.querySelector('.module-map-card');
    const map=document.querySelector('#module-map');
    if(!mapCard || !map) return;
    const tools=document.createElement('div');
    tools.id='module-source-tools'; tools.className='module-source-tools no-print';
    const toggle=document.createElement('button'); toggle.type='button';
    const direct=document.createElement('a'); direct.href=item.sourcePdf; direct.target='_blank'; direct.rel='noopener'; direct.textContent='Open Source PDF';
    tools.append(toggle,direct);
    map.insertAdjacentElement('afterend',tools);

    const pane=document.createElement('div'); pane.id='module-source-reference'; pane.className='module-source-reference';
    const iframe=document.createElement('iframe'); iframe.title=`${item.title} source PDF`; iframe.loading='lazy'; iframe.src=`${item.sourcePdf}#view=FitH`;
    pane.appendChild(iframe); tools.insertAdjacentElement('afterend',pane);

    let sourceVisible=Boolean(module?.referenceOnly || item.status==='source-reference');
    const sync=()=>{
      pane.hidden=!sourceVisible;
      toggle.textContent=sourceVisible?'Hide Source PDF':'Show Source PDF';
      mapCard.classList.toggle('module-reference-only',sourceVisible && Boolean(module?.referenceOnly || item.status==='source-reference'));
    };
    toggle.addEventListener('click',()=>{ sourceVisible=!sourceVisible; sync(); });
    sync();
  }
  function enhance(module,path){
    activeModule=module||activeModule; activePath=path||activePath;
    if(!inventory) return;
    renderLibrary();
    const item=itemFor(activeModule,activePath);
    addSourcePane(item,activeModule);
  }
  async function boot(){
    styleOnce();
    try{ await getInventory(); }catch(error){ console.warn('Module example inventory failed to load',error); return; }
    renderLibrary();
    const select=document.querySelector('#module-select');
    if(select){ activePath=select.value; const item=(inventory.items||[]).find(entry=>entry.viewerPath===activePath); if(item) addSourcePane(item,{id:item.id,referenceOnly:item.status==='source-reference'}); }
  }

  document.addEventListener('module-viewer-module-changed',event=>{ const detail=event.detail||{}; enhance(detail.module,detail.path); });
  const observer=new MutationObserver(()=>{ if(inventory) renderLibrary(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
