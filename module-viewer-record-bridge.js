(() => {
  let latestState = null;

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
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

  document.addEventListener('click', event => {
    const point = event.target.closest?.('.module-hotspot.editor-point');
    if(!point) return;
    const match = String(point.title || '').match(/tile\s+(\d+)\s*,\s*(\d+)/i);
    if(match) setTimeout(()=>renderMergedTile(Number(match[1]),Number(match[2])),0);
  });
})();
