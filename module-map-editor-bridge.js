(() => {
  const FILLER_SCRIPT = 'module-content-filler.js';
  const DUNGEON_SCRIPT = 'module-random-dungeon-generator.js';
  const SPELL_ENTRY_SCRIPT = 'spell-creator-entry.js';
  const RECORD_BRIDGE_SCRIPT = 'module-viewer-record-bridge.js';
  const REFERENCE_LIBRARY_SCRIPT = 'module-reference-library.js';
  const PRIMARY_GENERATOR_BRIDGE_SCRIPT = 'module-generator-primary-bridge.js';
  const VALID_TILE_TYPES = new Set(['void','floor','wall','door','secret-door','trap','stairs','label']);
  let injected = false;
  let fillerButtonInjected = false;
  let pendingPdfModule = null;
  let generatedResults = [];

  function slugify(value){
    return String(value || 'module').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'module';
  }

  function loadScriptOnce(src){
    if([...document.scripts].some(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src))) return;
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
    loadScriptOnce(PRIMARY_GENERATOR_BRIDGE_SCRIPT);
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

  function validateEditorState(mapState){
    if(!mapState || typeof mapState!=='object') return 'Editable map state is missing or invalid.';
    const width=Number(mapState.width), height=Number(mapState.height);
    if(!Number.isInteger(width) || width<1 || width>200 || !Number.isInteger(height) || height<1 || height>200) return 'Editable map state has invalid map dimensions.';
    if(!Array.isArray(mapState.cells) || mapState.cells.length!==height) return 'Editable map state row count does not match its height.';
    for(let y=0;y<height;y++){
      const row=mapState.cells[y];
      if(!Array.isArray(row) || row.length!==width) return `Editable map state row ${y+1} does not match its width.`;
      for(let x=0;x<width;x++){
        const cell=row[x];
        if(!cell || typeof cell!=='object') return `Editable map state cell ${x}, ${y} is invalid.`;
        if(!VALID_TILE_TYPES.has(String(cell.type||''))) return `Editable map state cell ${x}, ${y} has unsupported tile type "${String(cell.type||'')}".`;
      }
    }
    return null;
  }

  function loadEditorState(mapState,{message='Imported editable map state.'}={}){
    const validationError=validateEditorState(mapState);
    if(validationError){
      status(validationError);
      return false;
    }
    const importBox = document.querySelector('#mme-import');
    const importButton = document.querySelector('#mme-import-json');
    if(!importBox || !importButton){
      status('Map editor import controls are unavailable.');
      return false;
    }
    let serialized;
    try{
      serialized = JSON.stringify(mapState);
    }catch(error){
      status(`Editable map state could not be serialized: ${error.message}`);
      return false;
    }
    importBox.value = JSON.stringify(mapState,null,2);
    importButton.click();
    const loadedState = window.getModuleMapEditorState?.();
    let loadedSerialized = null;
    try{ loadedSerialized = loadedState ? JSON.stringify(loadedState) : null; }catch(error){ loadedSerialized = null; }
    if(!loadedState || loadedSerialized !== serialized){
      const editorMessage = document.querySelector('#mme-status')?.textContent || '';
      if(!/^Import failed:/i.test(editorMessage)) status('Map editor did not accept the requested editable state.');
      return false;
    }
    status(message);
    return true;
  }
  window.loadModuleMapEditorState = loadEditorState;

  function applySelectedTileContent({notesAppend='',type=null}={}){
    const notes=document.querySelector('#mme-inspector-notes');
    const typeSelect=document.querySelector('#mme-inspector-type');
    const apply=document.querySelector('#mme-inspector-apply');
    const selected=document.querySelector('.module-tile.selected');
    if(!notes||!typeSelect||!apply||!selected){
      fillerStatus('Select a tile in the map editor first.');
      return false;
    }
    if(type && ![...typeSelect.options].some(option=>option.value===type)){
      fillerStatus(`Unsupported tile type: ${type}.`);
      return false;
    }
    const x=Number(selected.dataset.x), y=Number(selected.dataset.y);
    const appended=String(notesAppend || '').trim();
    if(appended) notes.value=[notes.value.trim(),appended].filter(Boolean).join('\n\n');
    if(type) typeSelect.value=type;
    const expectedNotes=notes.value;
    const expectedType=typeSelect.value;
    apply.click();
    const updated=window.getModuleMapEditorState?.()?.cells?.[y]?.[x];
    if(!updated || updated.type!==expectedType || String(updated.meta?.notes || '')!==expectedNotes){
      fillerStatus('Selected tile update could not be verified.');
      return false;
    }
    return true;
  }
  window.applyModuleMapEditorSelectedTileContent = applySelectedTileContent;

  function restoreCurrentSessionMap(event){
    const current = window.getCurrentModuleViewerModule?.() || {};
    if(!String(current.path || '').startsWith('memory:')) return false;
    if(event){ event.preventDefault(); event.stopImmediatePropagation(); }
    const mapState = current.editorState || current.module?.mapEditorState || null;
    const validationError=validateEditorState(mapState);
    if(validationError){
      status(validationError==='Editable map state is missing or invalid.'?'Current session module has no editable map state to load.':validationError);
      return true;
    }
    loadEditorState(mapState,{message:`Loaded session map for ${current.module?.title || current.module?.id || 'current module'}.`});
    return true;
  }

  function insertGeneratedIntoSelectedTile(){
    if(!generatedResults.length){ fillerStatus('Generate content first.'); return; }
    const text=generatedResults.map(resultText).join('\n\n---\n\n');
    const primary=generatedResults[0]?.type;
    const tileType=primary==='room'?'label':primary==='door'?'door':primary==='trap'?'trap':null;
    if(!applySelectedTileContent({notesAppend:text,type:tileType})) return;
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
      const previousState=window.getModuleMapEditorState ? window.getModuleMapEditorState() : null;
      pendingPdfModule={fileName:file.name,page,title:file.name.replace(/\.pdf$/i,'')+` — page ${page}`,previousState,expectedSource:`uploaded-PDF page ${page}-extraction`,triggeringExtractor:true};
      status('Extracting PDF page into a new module draft…');
      extractor.click();
      if(pendingPdfModule) pendingPdfModule.triggeringExtractor=false;
    });
    extractor.addEventListener('click',()=>{
      if(pendingPdfModule && !pendingPdfModule.triggeringExtractor) pendingPdfModule=null;
    });
    fileInput.addEventListener('change',()=>{ pendingPdfModule=null; });
    actionRow.insertBefore(button,actionRow.firstChild); injected=true;
  }

  document.addEventListener('click',event=>{
    if(!event.target.closest?.('#mme-load-current')) return;
    restoreCurrentSessionMap(event);
  },true);
  document.addEventListener('module-content-filler-generated',event=>{ generatedResults=event.detail?.results||[]; injectFillerButton(); });
  document.addEventListener('module-map-editor-output',event=>{
    if(!pendingPdfModule) return;
    const detail=event.detail||{};
    if(!detail.state || detail.state===pendingPdfModule.previousState) return;
    if(detail.state.source!==pendingPdfModule.expectedSource) return;
    const module=makeModule(detail);
    document.dispatchEvent(new CustomEvent('module-map-editor-new-module',{detail:{module,svg:detail.svg,state:detail.state,title:module.title}}));
    status(`Created new module from PDF: ${module.title}`); pendingPdfModule=null;
  });

  const observer=new MutationObserver(()=>{ injectButton(); injectFillerButton(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectButton); else injectButton();
})();
