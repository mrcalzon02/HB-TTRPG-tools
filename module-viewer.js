(() => {
  const INDEX_URL = 'data/modules/module-index.json';
  const EDITOR_SCRIPT = 'module-map-editor.js';
  const MODULE_PATCHES = {
    'northern-watchtower-09': [
      'data/modules/patches/northern-watchtower-09-door-pass-rooms-1-5.json',
      'data/modules/patches/northern-watchtower-09-door-pass-rooms-6-10.json',
      'data/modules/patches/northern-watchtower-09-door-pass-rooms-11-15.json',
      'data/modules/patches/northern-watchtower-09-door-pass-rooms-16-20.json',
      'data/modules/patches/northern-watchtower-09-door-pass-rooms-21-25.json',
      'data/modules/patches/northern-watchtower-09-door-pass-rooms-26-30.json',
      'data/modules/patches/northern-watchtower-09-extraction-status.json'
    ]
  };

  let indexData = null;
  let moduleData = null;
  let selectedId = null;
  let showRooms = true;
  let showDoors = true;
  let usingEditorMap = false;

  const css = `
    .module-viewer-shell{display:grid;gap:18px}.module-viewer-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:14px}.module-viewer-toolbar select{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}.module-viewer-layout{display:grid;grid-template-columns:minmax(320px,1.6fr) minmax(300px,.9fr);gap:18px;align-items:start}.module-map-card,.module-detail-card,.module-list-card{border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}.module-map-wrap{position:relative;max-width:980px;margin:0 auto;overflow:hidden;border-radius:14px;border:1px solid rgba(200,138,53,.35);background:#090b10}.module-map-wrap img,.module-map-wrap svg{display:block;width:100%;height:auto}.module-hotspot{position:absolute;border:2px solid rgba(200,138,53,.95);background:rgba(200,138,53,.2);color:#fff1ca;border-radius:999px;font-weight:900;font-size:clamp(9px,1.2vw,13px);display:grid;place-items:center;cursor:pointer;box-shadow:0 0 0 2px rgba(0,0,0,.35),0 0 14px rgba(200,138,53,.35)}.module-hotspot.room{background:rgba(64,132,255,.18);border-color:rgba(115,165,255,.95)}.module-hotspot.door{background:rgba(255,110,88,.16);border-color:rgba(255,143,122,.95);color:transparent}.module-hotspot.door:after{content:'';width:45%;height:45%;border-radius:50%;background:rgba(255,190,132,.95)}.module-hotspot.door.grouped{color:#fff1ca;font-size:.7rem}.module-hotspot.door.grouped:after{display:none}.module-hotspot.active{outline:3px solid var(--ink);z-index:5}.module-list{display:grid;gap:8px;max-height:460px;overflow:auto}.module-list button{text-align:left;border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:rgba(0,0,0,.14);color:var(--ink);cursor:pointer}.module-list button.active,.module-list button:hover{border-color:var(--accent);background:rgba(200,138,53,.12)}.module-list small{display:block;color:var(--muted);margin-top:3px}.module-detail-card p,.module-detail-card li{color:var(--muted);line-height:1.55}.module-detail-card h4{color:var(--accent);margin:18px 0 8px}.module-pill-row{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 14px}.module-pill{border:1px solid var(--line);border-radius:999px;padding:5px 9px;color:var(--muted);background:rgba(0,0,0,.18);font-size:.8rem;cursor:pointer}.module-pill.secret{border-color:#8ed4ff;color:#ccefff}.module-pill.trapped{border-color:#ff8f7a;color:#ffd3ca}.module-pill.locked{border-color:#f3c76b;color:#ffe3a0}.module-pill.unlocked{border-color:#a8e69b;color:#ddffd7}.module-pill.stuck{border-color:#dca8ff;color:#efd8ff}.module-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.module-stat{border:1px solid var(--line);border-radius:12px;padding:8px 10px;color:var(--muted);background:rgba(0,0,0,.18)}.module-stat strong{display:block;color:var(--accent);font-size:.76rem;text-transform:uppercase;letter-spacing:.06em}.module-door-summary{display:block;color:var(--muted);font-size:.76rem;margin-top:3px}.module-source-text{white-space:pre-wrap;max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px;background:rgba(0,0,0,.25);color:var(--muted);font-size:.82rem;line-height:1.45}@media(max-width:980px){.module-viewer-layout{grid-template-columns:1fr}.module-stat-grid{grid-template-columns:1fr}}
  `;

  function styleOnce(){ if(document.getElementById('module-viewer-style')) return; const s=document.createElement('style'); s.id='module-viewer-style'; s.textContent=css; document.head.appendChild(s); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function getJson(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(url); return r.json(); }
  async function getText(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(url); return r.text(); }

  async function loadModule(path){ const data=await getJson(path); for(const patchPath of MODULE_PATCHES[data.id] || []){ try{ applyPatch(data, await getJson(patchPath)); } catch(e){ console.warn('Module patch failed',patchPath,e); } } return data; }
  function applyPatch(data,patch){
    const roomMap=new Map((data.rooms||[]).map(r=>[r.id,r])); (patch.rooms||[]).forEach(r=>roomMap.set(r.id,{...(roomMap.get(r.id)||{}),...r})); data.rooms=Array.from(roomMap.values()).sort((a,b)=>(a.number||0)-(b.number||0));
    const doorMap=new Map((data.doors||[]).map(d=>[d.id,d])); (patch.doors||[]).forEach(d=>doorMap.set(d.id,d)); data.doors=Array.from(doorMap.values());
    const hotMap=new Map((data.hotspots||[]).map(h=>[h.id,h])); (patch.doorHotspots||[]).forEach(h=>hotMap.set(h.id,h)); data.hotspots=Array.from(hotMap.values());
    data.extractionStatus={...(data.extractionStatus||{}),...(patch.extractionStatus||{})};
  }
  function loadEditorScript(){ if(document.querySelector(`script[src="${EDITOR_SCRIPT}"]`)) return; const s=document.createElement('script'); s.src=EDITOR_SCRIPT; s.defer=true; document.body.appendChild(s); }

  async function init(){
    styleOnce(); const root=document.getElementById('module-viewer-root'); if(!root) return; loadEditorScript(); root.innerHTML='<p class="helper-note">Loading module viewer…</p>';
    try{ indexData=await getJson(INDEX_URL); const first=indexData.modules?.[0]; moduleData=await loadModule(first.path); selectedId=moduleData.rooms?.[0]?.id; render(root); }
    catch(e){ root.innerHTML='<p class="helper-note">Module viewer could not load. Use GitHub Pages or a local web server so JSON files can be fetched.</p>'; }
  }

  function render(root){
    usingEditorMap=false;
    const opts=(indexData.modules||[]).map(m=>`<option value="${esc(m.path)}">${esc(m.title)}</option>`).join('');
    root.innerHTML=`<div class="module-viewer-shell"><div class="module-viewer-toolbar no-print"><label class="control-label">Module <select id="module-select">${opts}</select></label><button id="toggle-rooms" class="secondary-action" type="button">Rooms On</button><button id="toggle-doors" class="secondary-action" type="button">Doors On</button></div><div class="module-viewer-layout"><section class="module-map-card"><div class="section-heading"><p class="eyebrow">${esc(moduleData.system)}</p><h2>${esc(moduleData.title)}</h2><p>${esc(moduleData.subtitle)}</p></div><div id="module-map" class="module-map-wrap"></div></section><aside><section id="module-detail" class="module-detail-card"></section><section class="module-list-card"><h3>Rooms and Doors</h3><div id="module-list" class="module-list"></div></section></aside></div></div>`;
    root.querySelector('#module-select').addEventListener('change',async e=>{ moduleData=await loadModule(e.target.value); selectedId=moduleData.rooms?.[0]?.id; render(root); document.dispatchEvent(new CustomEvent('module-viewer-module-changed',{detail:{module:moduleData}})); });
    root.querySelector('#toggle-rooms').addEventListener('click',e=>{ showRooms=!showRooms; e.target.textContent=showRooms?'Rooms On':'Rooms Off'; drawHotspots(root); });
    root.querySelector('#toggle-doors').addEventListener('click',e=>{ showDoors=!showDoors; e.target.textContent=showDoors?'Doors On':'Doors Off'; drawHotspots(root); });
    drawMap(root); detail(root); list(root);
  }

  async function drawMap(root){
    if(usingEditorMap) return drawHotspots(root);
    const wrap=root.querySelector('#module-map'); const image=moduleData.map?.image || ''; wrap.innerHTML='';
    if(image.toLowerCase().endsWith('.svg')){ try{ wrap.innerHTML=await getText(image); const svg=wrap.querySelector('svg'); if(svg){ svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('preserveAspectRatio','xMidYMid meet'); } } catch(e){ wrap.innerHTML=`<img src="${esc(image)}" alt="${esc(moduleData.title)} map" />`; } }
    else { wrap.innerHTML=`<img src="${esc(image)}" alt="${esc(moduleData.title)} map" />`; }
    drawHotspots(root);
  }

  function useEditorMap(svg){ const root=document.getElementById('module-viewer-root'); const wrap=document.getElementById('module-map'); if(!root||!wrap||!svg) return; usingEditorMap=true; wrap.innerHTML=svg; const s=wrap.querySelector('svg'); if(s){ s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('preserveAspectRatio','xMidYMid meet'); } drawHotspots(root); }
  function doorGroupKey(h){ return `${Math.round(h.box.x*10)/10}|${Math.round(h.box.y*10)/10}`; }
  function doorGroups(){ const groups=new Map(); (moduleData.hotspots||[]).filter(h=>h.type==='door').forEach(h=>{ const key=doorGroupKey(h); if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(h); }); return groups; }
  function doorGroupById(groupId){ return doorGroups().get(groupId.replace('door-group:','')) || []; }
  function drawHotspots(root){ const m=root.querySelector('#module-map'); if(!m) return; m.querySelectorAll('.module-hotspot').forEach(n=>n.remove()); (moduleData.hotspots||[]).filter(h=>h.type!=='door').forEach(h=>{ if(h.type==='room'&&!showRooms) return; renderHotspot(m,h,h.targetId,h.type==='room'?h.label:''); }); if(!showDoors) return; doorGroups().forEach((group,key)=>{ const h=group[0]; const groupId=group.length>1?`door-group:${key}`:h.targetId; renderHotspot(m,h,groupId,group.length>1?String(group.length):'',group.length>1); }); }
  function renderHotspot(m,h,targetId,label,grouped=false){ const b=document.createElement('button'); b.type='button'; b.className=`module-hotspot ${h.type} ${grouped?'grouped':''} ${selectedId===targetId?'active':''}`; Object.assign(b.style,{left:h.box.x+'%',top:h.box.y+'%',width:h.box.w+'%',height:h.box.h+'%'}); b.textContent=label; b.title=grouped?`${label} listed entries at this physical doorway`:(h.label||h.targetId); b.onclick=()=>{ selectedId=targetId; const root=document.getElementById('module-viewer-root'); detail(root); list(root); drawHotspots(root); }; m.appendChild(b); }

  function list(root){ const target=root.querySelector('#module-list'); target.innerHTML=''; [...(moduleData.rooms||[]).map(r=>({id:r.id,title:r.title,meta:r.summary,kind:'room'})),...(moduleData.doors||[]).map(d=>({id:d.id,title:d.label,meta:d.kind,kind:'door'}))].forEach(x=>{ const b=document.createElement('button'); b.type='button'; b.className=selectedId===x.id?'active':''; b.innerHTML=`<strong>${esc(x.title)}</strong><small>${esc(x.kind)} · ${esc(x.meta||'')}</small>`; b.onclick=()=>{ selectedId=x.id; detail(root); list(root); drawHotspots(root); }; target.appendChild(b); }); }
  function detail(root){ const t=root.querySelector('#module-detail'); if(String(selectedId||'').startsWith('door-group:')){ const group=doorGroupById(selectedId); t.innerHTML=`<p class="eyebrow">Physical doorway</p><h3>${group.length} listed room-side entries share this map position</h3><p>The printed map shows one doorway here, while the room text lists one or more room-side entries for that same physical position.</p><div class="module-pill-row">${group.map(h=>doorById(h.targetId)).filter(Boolean).map(d=>doorButton(d)).join('')}</div>`; return; } const room=(moduleData.rooms||[]).find(r=>r.id===selectedId); const door=(moduleData.doors||[]).find(d=>d.id===selectedId); if(room){ t.innerHTML=`<p class="eyebrow">Room ${esc(room.number)}</p><h3>${esc(room.title)}</h3><p>${esc(room.summary)}</p>${section('Features',room.features)}${section('Traps',room.traps)}${section('Tricks',room.tricks)}${section('Monsters',room.monsters)}${section('Treasure',room.treasure)}${doorLinks(room)}${rawSection('Source room listing',room.sourceText)}`; return; } if(door){ t.innerHTML=`<p class="eyebrow">Door / Entry</p><h3>${esc(door.label)}</h3><div class="module-pill-row">${(door.tags||[]).map(x=>`<span class="module-pill ${esc(x)}">${esc(x)}</span>`).join('')}</div><div class="module-stat-grid"><div class="module-stat"><strong>From</strong>${esc(roomName(door.from))}</div><div class="module-stat"><strong>To</strong>${esc(roomName(door.to))}</div><div class="module-stat"><strong>Type</strong>${esc(door.kind)}</div><div class="module-stat"><strong>Notes</strong>${esc(door.notes)}</div></div>${rawSection('Source door listing',door.sourceText)}`; return; } t.innerHTML=`<h3>${esc(moduleData.title)}</h3><p>${esc(moduleData.source?.notes||'')}</p>`; }
  function section(title,arr=[]){ return arr.length?`<h4>${esc(title)}</h4><ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''; }
  function rawSection(title,text){ return text?`<h4>${esc(title)}</h4><pre class="module-source-text">${esc(text)}</pre>`:''; }
  function doorButton(d){ return `<button type="button" class="module-pill ${(d.tags||[]).join(' ')}" data-door="${esc(d.id)}">${esc(d.label)}<span class="module-door-summary">${esc(d.kind)}</span></button>`; }
  function doorLinks(room){ const doorIds=room.doorIds||[]; const exact=doorIds.map(id=>doorById(id)).filter(Boolean); const doors=exact.length?exact:(moduleData.doors||[]).filter(d=>d.from===room.id||d.to===room.id); return `<h4>Listed doors and entries</h4><div class="module-pill-row">${doors.map(d=>doorButton(d)).join('')}</div>`; }
  function doorById(id){ return (moduleData.doors||[]).find(d=>d.id===id); }
  function roomName(id){ if(!id) return 'Unlinked / external'; return (moduleData.rooms||[]).find(r=>r.id===id)?.title || id; }

  document.addEventListener('click',e=>{ const b=e.target.closest?.('[data-door]'); if(!b) return; const root=document.getElementById('module-viewer-root'); selectedId=b.dataset.door; detail(root); list(root); drawHotspots(root); });
  document.addEventListener('module-map-editor-output',e=>useEditorMap(e.detail?.svg));
  document.addEventListener('DOMContentLoaded',init);
  window.initModuleViewer=init;
})();
