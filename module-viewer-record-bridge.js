(() => {
  let latestState = null;

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'
    }[char]));
  }

  function section(title, values){
    const items = Array.isArray(values) ? values.filter(Boolean) : [];
    if(!items.length) return '';
    return `<h4>${esc(title)}</h4><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
  }

  function sourceSection(title, value){
    if(!value) return '';
    return `<h4>${esc(title)}</h4><pre class="module-source-text">${esc(value)}</pre>`;
  }

  function currentModule(){
    return window.getCurrentModuleViewerModule?.().module || null;
  }

  function moduleFilename(module){
    const base = String(module?.id || module?.title || 'session-module')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'') || 'session-module';
    return `${base}.json`;
  }

  function exportSessionModule(){
    const state = window.getCurrentModuleViewerModule?.() || {};
    if(!String(state.path || '').startsWith('memory:') || !state.module) return;
    const blob = new Blob([JSON.stringify(state.module,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = moduleFilename(state.module);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importStatus(message, isError=false){
    const status = document.querySelector('#module-persistence-status');
    if(!status) return;
    status.textContent = message;
    status.dataset.importState = isError ? 'error' : 'ok';
  }

  function normalizeImportedModule(value){
    if(!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a full module JSON object.');
    if(Array.isArray(value.cells) || Array.isArray(value.rows)) throw new Error('This is map-only JSON. Import a full module draft exported from the Viewer.');
    if(!value.id && !value.title) throw new Error('Module draft is missing both id and title.');
    if(value.rooms != null && !Array.isArray(value.rooms)) throw new Error('Module rooms must be an array.');
    if(value.doors != null && !Array.isArray(value.doors)) throw new Error('Module doors must be an array.');
    if(value.mapEditorState && !Array.isArray(value.mapEditorState.cells)) throw new Error('Module mapEditorState is not a valid editable map.');
    const module = structuredClone(value);
    const key = String(module.id || module.title || `session-${Date.now()}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'') || `session-${Date.now()}`;
    module.id = module.id || key;
    module.path = `memory:${key}`;
    module.rooms = Array.isArray(module.rooms) ? module.rooms : [];
    module.doors = Array.isArray(module.doors) ? module.doors : [];
    module.hotspots = Array.isArray(module.hotspots) ? module.hotspots : [];
    return module;
  }

  async function importSessionModuleFile(file){
    try{
      const module = normalizeImportedModule(JSON.parse(await file.text()));
      const state = module.mapEditorState || null;
      document.dispatchEvent(new CustomEvent('module-map-editor-new-module',{detail:{module,state,title:module.title || module.id}}));
      if(state){
        if(typeof window.loadModuleMapEditorState !== 'function') throw new Error('Map editor state loader is unavailable.');
        const loaded = window.loadModuleMapEditorState(state,{message:`Loaded editable map for ${module.title || module.id}.`});
        if(!loaded) throw new Error('Editable map state could not be loaded.');
      }
      importStatus(`Restored session draft · ${module.title || module.id}`);
    }catch(error){
      console.error('Module draft import failed',error);
      importStatus(`Draft import failed · ${error.message}`,true);
    }
  }

  function renderPersistenceStatus(detail){
    const root = document.getElementById('module-viewer-root');
    const toolbar = root?.querySelector('.module-viewer-toolbar');
    if(!toolbar) return;
    const state = detail || window.getCurrentModuleViewerModule?.() || {};
    const path = String(state.path || '');
    const inMemory = path.startsWith('memory:');
    let status = toolbar.querySelector('#module-persistence-status');
    if(!status){
      status = document.createElement('span');
      status.id = 'module-persistence-status';
      status.className = 'helper-note';
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      toolbar.appendChild(status);
    }
    status.textContent = inMemory
      ? 'Session draft · not saved to the project module library'
      : 'Indexed module · repository-backed project data';
    status.title = inMemory
      ? 'This module exists only in the current browser session until you export or otherwise persist it.'
      : 'This module was loaded from the project module index rather than created only in this browser session.';
    delete status.dataset.importState;

    let exportButton = toolbar.querySelector('#module-session-export');
    if(!exportButton){
      exportButton = document.createElement('button');
      exportButton.id = 'module-session-export';
      exportButton.type = 'button';
      exportButton.className = 'secondary-action';
      exportButton.textContent = 'Export Draft JSON';
      exportButton.title = 'Download this session-only module as JSON so it can be preserved outside the current browser session.';
      exportButton.addEventListener('click', exportSessionModule);
      toolbar.appendChild(exportButton);
    }
    exportButton.hidden = !inMemory || !state.module;

    let importInput = toolbar.querySelector('#module-session-import-file');
    if(!importInput){
      importInput = document.createElement('input');
      importInput.id = 'module-session-import-file';
      importInput.type = 'file';
      importInput.accept = '.json,application/json';
      importInput.hidden = true;
      importInput.addEventListener('change',async event=>{
        const file = event.target.files?.[0];
        if(file) await importSessionModuleFile(file);
        event.target.value = '';
      });
      toolbar.appendChild(importInput);
    }

    let importButton = toolbar.querySelector('#module-session-import');
    if(!importButton){
      importButton = document.createElement('button');
      importButton.id = 'module-session-import';
      importButton.type = 'button';
      importButton.className = 'secondary-action';
      importButton.textContent = 'Import Draft JSON';
      importButton.title = 'Restore a full module draft previously exported from the Viewer, including room, door, source, and editable map data.';
      importButton.addEventListener('click',()=>importInput.click());
      toolbar.appendChild(importButton);
    }
  }

  function resolveRoom(cell, module){
    if(!cell || !module) return null;
    const meta = cell.meta || {};
    const rooms = module.rooms || [];
    const label = String(cell.label || '').trim();
    const explicit = String(meta.roomId || meta.id || '').trim();

    return rooms.find(room => room.id === explicit)
      || rooms.find(room => String(room.number ?? '').trim() === label)
      || rooms.find(room => String(room.id || '').toLowerCase() === label.toLowerCase())
      || rooms.find(room => String(room.title || '').toLowerCase() === label.toLowerCase())
      || null;
  }

  function resolveDoor(cell, module){
    if(!cell || !module) return null;
    const meta = cell.meta || {};
    const id = String(meta.doorId || meta.id || '').trim();
    return (module.doors || []).find(door => door.id === id) || null;
  }

  function tileStats(cell, x, y){
    const meta = cell.meta || {};
    const stats = [
      ['Tile', `${x}, ${y}`],
      ['Type', cell.type || 'unknown'],
      ['Label', cell.label || '—'],
      ['ID', meta.id || meta.roomId || meta.doorId || '—'],
      ['Connects', meta.connects || '—'],
      ['Search DC', meta.searchDc || '—'],
      ['Open Lock DC', meta.openLockDc || '—'],
      ['Disable DC', meta.disableDc || '—'],
      ['Break DC / HP', meta.breakDc || '—']
    ];
    return `<div class="module-stat-grid">${stats.map(([label,value])=>`<div class="module-stat"><strong>${esc(label)}</strong>${esc(value)}</div>`).join('')}</div>`;
  }

  function roomRecord(room){
    if(!room) return '';
    return `
      <hr>
      <p class="eyebrow">PDF-extracted room record</p>
      <h3>${esc(room.number != null ? `Room ${room.number}: ${room.title || ''}` : room.title || room.id)}</h3>
      ${room.summary ? `<p>${esc(room.summary)}</p>` : ''}
      ${section('Features',room.features)}
      ${section('Traps',room.traps)}
      ${section('Tricks',room.tricks)}
      ${section('Monsters',room.monsters)}
      ${section('Treasure',room.treasure)}
      ${section('Doors and entries',(room.doorIds || []).map(String))}
      ${sourceSection('Source room listing',room.sourceText)}
    `;
  }

  function doorRecord(door, module){
    if(!door) return '';
    const roomName = id => (module?.rooms || []).find(room=>room.id===id)?.title || id || 'Unlinked / external';
    return `
      <hr>
      <p class="eyebrow">PDF-extracted door record</p>
      <h3>${esc(door.label || door.id)}</h3>
      <div class="module-stat-grid">
        <div class="module-stat"><strong>From</strong>${esc(roomName(door.from))}</div>
        <div class="module-stat"><strong>To</strong>${esc(roomName(door.to))}</div>
        <div class="module-stat"><strong>Kind</strong>${esc(door.kind || '—')}</div>
        <div class="module-stat"><strong>Tags</strong>${esc((door.tags || []).join(', ') || '—')}</div>
      </div>
      ${door.notes ? `<p>${esc(door.notes)}</p>` : ''}
      ${sourceSection('Source door listing',door.sourceText)}
    `;
  }

  function renderMergedTile(x, y){
    const detail = document.getElementById('module-detail');
    const state = latestState || window.getCurrentModuleViewerModule?.().editorState;
    const cell = state?.cells?.[y]?.[x];
    if(!detail || !cell) return;

    const module = currentModule();
    const meta = cell.meta || {};
    const room = cell.type === 'label' ? resolveRoom(cell,module) : null;
    const door = ['door','secret-door'].includes(cell.type) ? resolveDoor(cell,module) : null;

    detail.innerHTML = `
      <p class="eyebrow">Editor tile record</p>
      <h3>${esc(cell.label || meta.id || `${cell.type || 'Tile'} ${x}, ${y}`)}</h3>
      ${tileStats(cell,x,y)}
      ${meta.notes ? sourceSection('Tile / GM notes',meta.notes) : ''}
      ${meta.extracted ? sourceSection('Extraction metadata',JSON.stringify(meta.extracted,null,2)) : ''}
      ${roomRecord(room)}
      ${doorRecord(door,module)}
      ${!room && cell.type === 'label' ? '<p class="helper-note">No extracted room record matched this label yet. Set the tile ID to the room ID or use the printed room number as its label.</p>' : ''}
      ${!door && ['door','secret-door'].includes(cell.type) ? '<p class="helper-note">No extracted door record matched this tile yet. Set the tile ID to the extracted door ID to bind them.</p>' : ''}
    `;
  }

  function refreshSelected(){
    const active = document.querySelector('.module-hotspot.editor-point.active');
    if(!active) return;
    const match = String(active.title || '').match(/tile\s+(\d+)\s*,\s*(\d+)/i);
    if(match) renderMergedTile(Number(match[1]),Number(match[2]));
  }

  document.addEventListener('module-map-editor-output', event => {
    latestState = event.detail?.state || latestState;
    setTimeout(refreshSelected,0);
  });

  document.addEventListener('module-viewer-module-changed', event => {
    latestState = event.detail?.editorState || event.detail?.module?.mapEditorState || null;
    setTimeout(()=>renderPersistenceStatus(event.detail),0);
  });

  document.addEventListener('click', event => {
    const point = event.target.closest?.('.module-hotspot.editor-point');
    if(!point) return;
    const match = String(point.title || '').match(/tile\s+(\d+)\s*,\s*(\d+)/i);
    if(match) setTimeout(()=>renderMergedTile(Number(match[1]),Number(match[2])),0);
  });

  setTimeout(()=>renderPersistenceStatus(),0);
})();
