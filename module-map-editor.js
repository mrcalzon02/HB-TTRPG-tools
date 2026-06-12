(() => {
  const DEFAULT_W = 39;
  const DEFAULT_H = 39;
  const PRESET_URL = 'data/modules/map-editor-tests/northern-watchtower-09-from-image-test.json';
  const TILE_TYPES = [
    { id: 'void', label: 'Void', className: 'tile-void', char: ' ' },
    { id: 'floor', label: 'Floor', className: 'tile-floor', char: '.' },
    { id: 'wall', label: 'Wall', className: 'tile-wall', char: '#' },
    { id: 'door', label: 'Door', className: 'tile-door', char: 'D' },
    { id: 'secret-door', label: 'Secret Door', className: 'tile-secret-door', char: 'S' },
    { id: 'trap', label: 'Trap', className: 'tile-trap', char: 'T' },
    { id: 'stairs', label: 'Stairs', className: 'tile-stairs', char: '^' },
    { id: 'label', label: 'Room Label', className: 'tile-label', char: 'L' }
  ];
  const CHAR_TO_TILE = { '#':'wall', '.':'floor', ' ':'void', 'D':'door', 'S':'secret-door', 'T':'trap', '^':'stairs', 'L':'label' };

  const css = `
    .module-editor-card{margin-top:18px;border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}
    .module-editor-layout{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start}
    .module-editor-tools{display:grid;gap:10px}.module-editor-tools input,.module-editor-tools select,.module-editor-tools textarea{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 10px}.module-editor-tools textarea{min-height:110px;font-family:ui-monospace,Consolas,monospace;font-size:.78rem}.module-editor-actions{display:flex;flex-wrap:wrap;gap:8px}.module-editor-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.module-editor-actions button:hover{border-color:var(--accent)}
    .module-tile-palette{display:grid;grid-template-columns:1fr 1fr;gap:6px}.module-palette-button{border:1px solid var(--line);border-radius:10px;padding:7px 8px;background:rgba(0,0,0,.22);color:var(--muted);cursor:pointer;text-align:left}.module-palette-button.active{border-color:var(--accent);color:var(--ink);background:rgba(200,138,53,.16)}
    .module-editor-map-shell{overflow:auto;max-height:72vh;border:1px solid rgba(200,138,53,.35);border-radius:14px;background:#0a0c12;padding:10px}.module-tile-grid{display:grid;gap:0;width:max-content;line-height:1}.module-tile{width:18px;height:18px;border:1px solid rgba(0,0,0,.18);padding:0;margin:0;font:700 10px/1 ui-monospace,Consolas,monospace;display:grid;place-items:center;cursor:pointer}.module-tile:hover{outline:2px solid var(--accent);z-index:2}.tile-void{background:#05070b;color:#05070b}.tile-floor{background:#fff;color:#111}.tile-wall{background:#000;color:#000}.tile-door{background:#fff;color:#d47b46}.tile-secret-door{background:#fff;color:#bd7cff}.tile-trap{background:#fff;color:#d33030}.tile-stairs{background:#fff;color:#111}.tile-label{background:#fff;color:#111;border-color:#8cb7ff}.module-editor-status{color:var(--muted);font-size:.82rem}.module-editor-preview{white-space:pre;overflow:auto;max-height:220px;background:#05070b;border:1px solid var(--line);border-radius:12px;padding:10px;color:#d8d1bf;font-size:.72rem}
    @media(max-width:980px){.module-editor-layout{grid-template-columns:1fr}.module-editor-map-shell{max-height:55vh}.module-tile{width:16px;height:16px}}
  `;

  let state = makeBlank(DEFAULT_W, DEFAULT_H);
  let selectedType = 'wall';
  let paintDown = false;

  function styleOnce(){ if(document.getElementById('module-map-editor-style')) return; const s=document.createElement('style'); s.id='module-map-editor-style'; s.textContent=css; document.head.appendChild(s); }
  function tileById(id){ return TILE_TYPES.find(t=>t.id===id) || TILE_TYPES[0]; }
  function makeBlank(width,height){ return { schemaVersion:'0.1.0', tool:'module-map-editor', width, height, tileSize:1, cells:Array.from({length:height},()=>Array.from({length:width},()=>({type:'void', label:''}))) }; }
  function clampInt(v,min,max){ return Math.max(min, Math.min(max, parseInt(v,10)||min)); }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function getJson(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(url); return r.json(); }

  function normalizeMap(input){
    if(input && Array.isArray(input.cells)) return input;
    if(!input || !Array.isArray(input.rows)) throw new Error('Invalid map JSON: expected cells or rows.');
    const width=input.width || Math.max(...input.rows.map(r=>String(r).length));
    const height=input.height || input.rows.length;
    const next=makeBlank(width,height);
    for(let y=0;y<height;y++){
      const row=String(input.rows[y] || '').padEnd(width,'#');
      for(let x=0;x<width;x++) next.cells[y][x]={ type: CHAR_TO_TILE[row[x]] || 'floor', label:'' };
    }
    (input.labels||[]).forEach(l=>{ if(next.cells[l.y] && next.cells[l.y][l.x]) next.cells[l.y][l.x]={type:'label',label:String(l.label ?? '')}; });
    next.source=input.source; next.moduleId=input.moduleId; next.title=input.title; next.notes=input.notes;
    return next;
  }

  function resizeMap(width,height){ const next=makeBlank(width,height); for(let y=0;y<Math.min(height,state.height);y++) for(let x=0;x<Math.min(width,state.width);x++) next.cells[y][x]=state.cells[y][x]; state=next; }

  function init(){
    styleOnce();
    const anchor=document.getElementById('module-viewer-root');
    if(!anchor || document.getElementById('module-map-editor-root')) return;
    const root=document.createElement('section');
    root.id='module-map-editor-root';
    root.className='module-editor-card no-print';
    root.innerHTML=`
      <div class="section-heading"><p class="eyebrow">Module editor</p><h2>Tile-Based Module Map Editor</h2><p>Build a clean grid map directly: cycle black/white/door/secret/trap/stairs/label tiles, adjust map dimensions, and export JSON or SVG for later module import.</p></div>
      <div class="module-editor-layout"><aside class="module-editor-tools">
        <label class="control-label">Map width<input id="mme-width" type="number" min="1" max="120" value="${DEFAULT_W}"></label>
        <label class="control-label">Map height<input id="mme-height" type="number" min="1" max="120" value="${DEFAULT_H}"></label>
        <label class="control-label">Paint mode<select id="mme-mode"><option value="selected">Paint selected tile</option><option value="cycle">Click cycles tile types</option><option value="label">Room label mode</option></select></label>
        <label class="control-label">Room label<input id="mme-label" type="text" placeholder="1, 2, 15, a..."></label>
        <div class="module-tile-palette" id="mme-palette"></div>
        <div class="module-editor-actions"><button id="mme-load-preset" type="button">Load Northern Watchtower Test Map</button><button id="mme-apply-size" type="button">Apply Size</button><button id="mme-clear" type="button">Clear</button><button id="mme-export-json" type="button">Export JSON</button><button id="mme-export-svg" type="button">Export SVG</button><button id="mme-copy-ascii" type="button">Copy ASCII</button></div>
        <label class="control-label">Import JSON<textarea id="mme-import" placeholder="Paste exported map JSON or compact rows JSON here"></textarea></label>
        <div class="module-editor-actions"><button id="mme-import-json" type="button">Import JSON</button></div>
        <p class="module-editor-status" id="mme-status">39 × 39 grid ready.</p><pre class="module-editor-preview" id="mme-preview"></pre>
      </aside><div class="module-editor-map-shell"><div id="mme-grid" class="module-tile-grid" aria-label="Tile map editor"></div></div></div>`;
    anchor.insertAdjacentElement('afterend',root);
    bind(root); render(root);
  }

  function bind(root){
    const palette=root.querySelector('#mme-palette');
    TILE_TYPES.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='module-palette-button'; b.dataset.tileType=t.id; b.textContent=t.label; b.onclick=()=>{selectedType=t.id; updatePalette(root)}; palette.appendChild(b); });
    root.querySelector('#mme-load-preset').onclick=async()=>{ try{ state=normalizeMap(await getJson(PRESET_URL)); syncSizeInputs(root); render(root); status(root,'Loaded Northern Watchtower image-derived test map.'); }catch(e){ status(root,'Preset load failed: '+e.message); } };
    root.querySelector('#mme-apply-size').onclick=()=>{ resizeMap(clampInt(root.querySelector('#mme-width').value,1,120), clampInt(root.querySelector('#mme-height').value,1,120)); render(root); };
    root.querySelector('#mme-clear').onclick=()=>{ state=makeBlank(state.width,state.height); render(root); };
    root.querySelector('#mme-export-json').onclick=()=>download('module-map.json', JSON.stringify(state,null,2), 'application/json');
    root.querySelector('#mme-export-svg').onclick=()=>download('module-map.svg', toSvg(), 'image/svg+xml');
    root.querySelector('#mme-copy-ascii').onclick=async()=>{ const text=toAscii(); try{ await navigator.clipboard.writeText(text); status(root,'ASCII copied.'); }catch(e){ root.querySelector('#mme-preview').textContent=text; status(root,'ASCII shown in preview.'); }};
    root.querySelector('#mme-import-json').onclick=()=>{ try{ state=normalizeMap(JSON.parse(root.querySelector('#mme-import').value)); syncSizeInputs(root); render(root); status(root,'Imported map JSON.'); }catch(e){ status(root,'Import failed: '+e.message); }};
    document.addEventListener('mouseup',()=>{paintDown=false});
  }

  function syncSizeInputs(root){ root.querySelector('#mme-width').value=state.width; root.querySelector('#mme-height').value=state.height; }
  function render(root){ updatePalette(root); drawGrid(root); root.querySelector('#mme-preview').textContent=toAscii(); status(root,`${state.width} × ${state.height} grid ready.`); }
  function updatePalette(root){ root.querySelectorAll('.module-palette-button').forEach(b=>b.classList.toggle('active',b.dataset.tileType===selectedType)); }
  function drawGrid(root){ const grid=root.querySelector('#mme-grid'); grid.style.gridTemplateColumns=`repeat(${state.width}, 18px)`; grid.innerHTML=''; for(let y=0;y<state.height;y++) for(let x=0;x<state.width;x++) grid.appendChild(tileButton(root,x,y)); }
  function tileButton(root,x,y){ const cell=state.cells[y][x]; const t=tileById(cell.type); const b=document.createElement('button'); b.type='button'; b.className=`module-tile ${t.className}`; b.dataset.x=x; b.dataset.y=y; b.title=`${x},${y} ${t.label}`; b.textContent=cell.type==='label'?cell.label:(['door','secret-door','trap','stairs'].includes(cell.type)?t.char:''); b.onmousedown=e=>{paintDown=true; paint(root,x,y,e.shiftKey)}; b.onmouseenter=e=>{ if(paintDown) paint(root,x,y,e.shiftKey,true); }; return b; }
  function paint(root,x,y,shiftKey,drag=false){ const mode=root.querySelector('#mme-mode').value; const cell=state.cells[y][x]; if(mode==='cycle' && !drag){ const i=TILE_TYPES.findIndex(t=>t.id===cell.type); const next=TILE_TYPES[(i+1)%TILE_TYPES.length]; state.cells[y][x]={type:next.id,label:next.id==='label'?(root.querySelector('#mme-label').value||'1'):''}; } else if(mode==='label' || selectedType==='label'){ state.cells[y][x]={type:'label',label:root.querySelector('#mme-label').value||String(nextRoomNumber())}; } else if(shiftKey){ state.cells[y][x]={type:'void',label:''}; } else { state.cells[y][x]={type:selectedType,label:''}; } refreshTile(root,x,y); root.querySelector('#mme-preview').textContent=toAscii(); }
  function refreshTile(root,x,y){ const old=root.querySelector(`.module-tile[data-x="${x}"][data-y="${y}"]`); if(old) old.replaceWith(tileButton(root,x,y)); }
  function nextRoomNumber(){ let max=0; state.cells.flat().forEach(c=>{ const n=parseInt(c.label,10); if(c.type==='label'&&!Number.isNaN(n)) max=Math.max(max,n); }); return max+1; }
  function status(root,msg){ root.querySelector('#mme-status').textContent=msg; }
  function toAscii(){ return state.cells.map(row=>row.map(c=>c.type==='label'?(c.label||'L').slice(0,1):tileById(c.type).char).join('')).join('\n'); }
  function toSvg(){ const s=18, w=state.width*s, h=state.height*s; const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,`<rect width="${w}" height="${h}" fill="#fff"/>`]; for(let y=0;y<state.height;y++) for(let x=0;x<state.width;x++){ const c=state.cells[y][x], px=x*s, py=y*s; if(c.type==='void'||c.type==='wall') parts.push(`<rect x="${px}" y="${py}" width="${s}" height="${s}" fill="#000"/>`); if(['floor','label','door','secret-door','trap','stairs'].includes(c.type)) parts.push(`<rect x="${px}" y="${py}" width="${s}" height="${s}" fill="#fff" stroke="#d0d0d0" stroke-width="1"/>`); if(c.type==='door') parts.push(`<text x="${px+s/2}" y="${py+s*.72}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">D</text>`); if(c.type==='secret-door') parts.push(`<text x="${px+s/2}" y="${py+s*.72}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">S</text>`); if(c.type==='trap') parts.push(`<text x="${px+s/2}" y="${py+s*.72}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">T</text>`); if(c.type==='stairs') parts.push(`<text x="${px+s/2}" y="${py+s*.72}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">^</text>`); if(c.type==='label') parts.push(`<text x="${px+s/2}" y="${py+s*.72}" text-anchor="middle" font-family="serif" font-size="12" fill="#000">${esc(c.label)}</text>`); } parts.push('</svg>'); return parts.join('\n'); }
  function download(name,content,type){ const blob=new Blob([content],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.initModuleMapEditor = init;
})();
