(() => {
  const FILLER_SCRIPT = 'module-content-filler.js';
  const DUNGEON_SCRIPT = 'module-random-dungeon-generator.js';
  const SPELL_ENTRY_SCRIPT = 'spell-creator-entry.js';
  const RECORD_BRIDGE_SCRIPT = 'module-viewer-record-bridge.js';
  const REFERENCE_LIBRARY_SCRIPT = 'module-reference-library.js';
  let injected = false;
  let fillerButtonInjected = false;
  let pendingPdfModule = null;
  let generatedResults = [];

  function slugify(value){
    return String(value || 'module').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'module';
  }

  function loadScriptOnce(src){
    if(document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function loadGenerators(){
    loadScriptOnce(FILLER_SCRIPT);
    loadScriptOnce(DUNGEON_SCRIPT);
    loadScriptOnce(SPELL_ENTRY_SCRIPT);
    loadScriptOnce(RECORD_BRIDGE_SCRIPT);
    loadScriptOnce(REFERENCE_LIBRARY_SCRIPT);
  }

  function makeModule(detail){
    const state = detail.state || (window.getModuleMapEditorState ? window.getModuleMapEditorState() : null);
    const title = pendingPdfModule?.title || 'Extracted PDF Module';
    const id = `${slugify(title)}-${Date.now()}`;
    return {
      schemaVersion: '0.1.0', id, path: `memory:${id}`, title,
      subtitle: 'In-memory module extracted from uploaded PDF map page', system: 'PDF extracted module draft',
      source: { fileName: pendingPdfModule?.fileName || '', page: pendingPdfModule?.page || null, notes: 'Created in-browser by the Module Map Editor PDF extraction bridge. Export JSON/SVG to persist it.' },
      general: { size: state ? `${state.width} x ${state.height}` : 'Unknown', status: 'draft extracted from PDF' },
      map: { image: '', width: state?.width || 39, height: state?.height || 39, grid: state ? `${state.width} x ${state.height}` : '39 x 39' },
      hotspots: [], rooms: [], doors: [], mapEditorState: state || null,
      extractionStatus: { map: 'Extracted from uploaded PDF page into editable tile grid.', persistence: 'In-memory until exported or committed.' }
    };
  }

  function status(message){ const el=document.querySelector('#mme-status'); if(el) el.textContent=message; }
  function fillerStatus(message){ const el=document.querySelector('#mcf-status'); if(el) el.textContent=message; }
  function resultText(result){ const lines=[result.title,result.description]; if(result.mechanics) lines.push(`Mechanics: ${result.mechanics}`); if(result.occupant) lines.push(`Occupancy: ${result.occupant}`); if(Array.isArray(result.tags)&&result.tags.length) lines.push(`Tags: ${result.tags.join(', ')}`); return lines.filter(Boolean).join('\n'); }

  function insertGeneratedIntoSelectedTile(){
    if(!generatedResults.length){ fillerStatus('Generate content first.'); return; }
    const notes=document.querySelector('#mme-inspector-notes'); const type=document.querySelector('#mme-inspector-type'); const apply=document.querySelector('#mme-inspector-apply');
    if(!notes||!type||!apply){ fillerStatus('Select a tile in the map editor first.'); return; }
    const text=generatedResults.map(resultText).join('\n\n---\n\n');
    notes.value=[notes.value.trim(),text].filter(Boolean).join('\n\n');
    const primary=generatedResults[0]?.type;
    if(primary==='room') type.value='label'; if(primary==='door') type.value='door'; if(primary==='trap') type.value='trap';
    apply.click();
    fillerStatus(`Inserted ${generatedResults.length} generated entr${generatedResults.length===1?'y':'ies'} into the selected tile.`);
  }

  function injectFillerButton(){
    if(fillerButtonInjected) return;
    const root=document.querySelector('#module-content-filler-root'); const actions=root?.querySelector('.module-filler-actions');
    if(!root||!actions) return;
    const button=document.createElement('button'); button.id='mcf-insert-selected-tile'; button.type='button'; button.textContent='Insert Into Selected Tile';
    button.title='Append generated content to the selected tile inspector and apply an appropriate tile type.'; button.addEventListener('click',insertGeneratedIntoSelectedTile);
    actions.insertBefore(button,actions.children[1]||null); fillerButtonInjected=true;
  }

  function injectButton(){
    loadGenerators(); injectFillerButton(); if(injected) return;
    const root=document.querySelector('#module-map-editor-root'); const fileInput=document.querySelector('#mme-image'); const extractor=document.querySelector('#mme-extract-image'); const actionRow=document.querySelector('.module-extractor-box .module-editor-actions');
    if(!root||!fileInput||!extractor||!actionRow) return;
    const button=document.createElement('button'); button.id='mme-extract-new-module-pdf'; button.type='button'; button.textContent='Extract New Module From PDF';
    button.title='Rasterize the selected PDF page, extract the grid, create a new in-memory module, and show it in the viewer above.';
    button.addEventListener('click',()=>{
      const file=fileInput.files?.[0];
      if(!file){ status('Choose a PDF first.'); return; }
      if(!(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))){ status('Extract New Module From PDF requires a PDF file. Use Create From PDF / Image for normal image extraction.'); return; }
      const page=document.querySelector('#mme-pdf-page')?.value||'1';
      pendingPdfModule={fileName:file.name,page,title:file.name.replace(/\.pdf$/i,'')+` — page ${page}`};
      status('Extracting PDF page into a new module draft…'); extractor.click();
    });
    actionRow.insertBefore(button,actionRow.firstChild); injected=true;
  }

  document.addEventListener('module-content-filler-generated',event=>{ generatedResults=event.detail?.results||[]; injectFillerButton(); });
  document.addEventListener('module-map-editor-output',event=>{
    if(!pendingPdfModule) return;
    const detail=event.detail||{}; const module=makeModule(detail);
    document.dispatchEvent(new CustomEvent('module-map-editor-new-module',{detail:{module,svg:detail.svg,state:detail.state,title:module.title}}));
    status(`Created new module from PDF: ${module.title}`); pendingPdfModule=null;
  });

  const observer=new MutationObserver(()=>{ injectButton(); injectFillerButton(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectButton); else injectButton();
})();
