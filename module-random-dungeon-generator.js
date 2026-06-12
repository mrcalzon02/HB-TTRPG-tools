(() => {
  const css = `
    .module-dungeon-generator{margin-top:18px;border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}
    .mdg-layout{display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start}.mdg-controls{display:grid;gap:10px;border:1px solid var(--line);border-radius:14px;padding:12px;background:rgba(0,0,0,.16)}.mdg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mdg-controls input,.mdg-controls select{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 10px}.mdg-controls label{font-size:.78rem;color:var(--muted)}.mdg-controls input[type='checkbox']{width:auto;margin-right:6px}.mdg-actions{display:flex;flex-wrap:wrap;gap:8px}.mdg-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.mdg-actions button:hover{border-color:var(--accent)}.mdg-preview{overflow:auto;max-height:70vh;border:1px solid rgba(200,138,53,.35);border-radius:14px;background:#07090d;padding:10px}.mdg-preview-grid{display:grid;width:max-content}.mdg-cell{width:10px;height:10px}.mdg-cell.wall{background:#05070b}.mdg-cell.floor{background:#fff}.mdg-cell.door{background:#d47b46}.mdg-cell.secret-door{background:#bd7cff}.mdg-cell.stairs{background:#7aa7ff}.mdg-cell.label{background:#fff;color:#111;font:700 7px/10px monospace;text-align:center}.mdg-status{color:var(--muted);font-size:.82rem}.mdg-stats{white-space:pre-wrap;border:1px solid var(--line);border-radius:12px;padding:10px;background:rgba(0,0,0,.18);color:var(--muted);font-size:.78rem}@media(max-width:980px){.mdg-layout{grid-template-columns:1fr}}`;

  let lastMap = null;
  let lastStats = null;

  function styleOnce(){ if(document.getElementById('module-dungeon-generator-style')) return; const s=document.createElement('style'); s.id='module-dungeon-generator-style'; s.textContent=css; document.head.appendChild(s); }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,Number(v)||min)); }
  function int(v,min,max){ return Math.floor(clamp(v,min,max)); }
  function slug(value){ return String(value||'random-dungeon').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'random-dungeon'; }
  function hashSeed(seed){ let h=2166136261; for(const c of String(seed)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
  function rngFromSeed(seed){ let a=hashSeed(seed)||1; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function fade(t){ return t*t*(3-2*t); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function valueAt(ix,iy,seed){ let h=(ix*374761393 + iy*668265263 + seed*1442695041)|0; h=(h^(h>>>13))*1274126177; return ((h^(h>>>16))>>>0)/4294967295; }
  function valueNoise(x,y,seed){ const x0=Math.floor(x), y0=Math.floor(y), tx=fade(x-x0), ty=fade(y-y0); const a=lerp(valueAt(x0,y0,seed),valueAt(x0+1,y0,seed),tx); const b=lerp(valueAt(x0,y0+1,seed),valueAt(x0+1,y0+1,seed),tx); return lerp(a,b,ty); }
  function fractalNoise(x,y,seed,octaves,persistence){ let total=0,amp=1,freq=1,norm=0; for(let i=0;i<octaves;i++){ total+=valueNoise(x*freq,y*freq,seed+i*1013)*amp; norm+=amp; amp*=persistence; freq*=2; } return total/norm; }
  function blank(width,height,type='wall'){ return {schemaVersion:'0.1.0',tool:'module-map-editor',width,height,tileSize:1,cells:Array.from({length:height},()=>Array.from({length:width},()=>({type,label:''})))}; }
  function inBounds(map,x,y){ return x>=0&&y>=0&&x<map.width&&y<map.height; }
  function setCell(map,x,y,type,label='',meta={}){ if(inBounds(map,x,y)) map.cells[y][x]={type,label,meta}; }
  function isOpen(cell){ return ['floor','label','stairs','trap'].includes(cell.type); }

  function init(){
    styleOnce();
    const anchor=document.getElementById('module-content-filler-root')||document.getElementById('module-map-editor-root');
    if(!anchor || document.getElementById('module-random-dungeon-generator-root')) return;
    const root=document.createElement('section');
    root.id='module-random-dungeon-generator-root';
    root.className='module-dungeon-generator no-print';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">New module maker</p><h2>Perlin Noise Random Dungeon Generator & Room Sealer</h2><p>Generate a seeded noise dungeon, carve rooms, connect corridors, seal leaks, remove disconnected pockets, place doors and labels, then send the result directly into the map editor and viewer.</p></div><div class="mdg-layout"><aside class="mdg-controls"><label>Module name<input id="mdg-name" value="Random Noise Dungeon"></label><label>Seed<input id="mdg-seed" value="dungeon-001"></label><div class="mdg-grid"><label>Width<input id="mdg-width" type="number" min="15" max="120" value="55"></label><label>Height<input id="mdg-height" type="number" min="15" max="120" value="45"></label><label>Noise scale<input id="mdg-scale" type="number" min="4" max="40" step="1" value="13"></label><label>Open threshold<input id="mdg-threshold" type="number" min="0.2" max="0.8" step="0.01" value="0.53"></label><label>Octaves<input id="mdg-octaves" type="number" min="1" max="6" value="4"></label><label>Smoothing passes<input id="mdg-smooth" type="number" min="0" max="8" value="3"></label><label>Room count<input id="mdg-rooms" type="number" min="0" max="40" value="12"></label><label>Room min size<input id="mdg-room-min" type="number" min="3" max="15" value="4"></label><label>Room max size<input id="mdg-room-max" type="number" min="4" max="24" value="9"></label><label>Corridor width<input id="mdg-corridor" type="number" min="1" max="3" value="1"></label></div><label><input id="mdg-seal" type="checkbox" checked>Seal outside border and one-tile leaks</label><label><input id="mdg-connected" type="checkbox" checked>Keep one connected traversable network</label><label><input id="mdg-doors" type="checkbox" checked>Place doors at room/corridor thresholds</label><label><input id="mdg-labels" type="checkbox" checked>Place numbered room labels</label><label><input id="mdg-stairs" type="checkbox" checked>Place entrance and exit stairs</label><div class="mdg-actions"><button id="mdg-generate" type="button">Generate Preview</button><button id="mdg-reroll" type="button">Reroll Seed</button><button id="mdg-apply" type="button">Apply To Current Editor</button><button id="mdg-new-module" type="button">Create New Module</button></div><p id="mdg-status" class="mdg-status">Ready.</p><pre id="mdg-stats" class="mdg-stats">No dungeon generated.</pre></aside><div id="mdg-preview" class="mdg-preview"></div></div>`;
    anchor.insertAdjacentElement('afterend',root);
    root.querySelector('#mdg-generate').onclick=()=>generate(root);
    root.querySelector('#mdg-reroll').onclick=()=>{ root.querySelector('#mdg-seed').value=`dungeon-${Math.random().toString(36).slice(2,10)}`; generate(root); };
    root.querySelector('#mdg-apply').onclick=()=>applyToEditor(root,false);
    root.querySelector('#mdg-new-module').onclick=()=>applyToEditor(root,true);
    generate(root);
  }

  function readOptions(root){
    return {
      name:root.querySelector('#mdg-name').value.trim()||'Random Noise Dungeon', seed:root.querySelector('#mdg-seed').value.trim()||'dungeon',
      width:int(root.querySelector('#mdg-width').value,15,120), height:int(root.querySelector('#mdg-height').value,15,120),
      scale:clamp(root.querySelector('#mdg-scale').value,4,40), threshold:clamp(root.querySelector('#mdg-threshold').value,.2,.8),
      octaves:int(root.querySelector('#mdg-octaves').value,1,6), smooth:int(root.querySelector('#mdg-smooth').value,0,8),
      rooms:int(root.querySelector('#mdg-rooms').value,0,40), roomMin:int(root.querySelector('#mdg-room-min').value,3,15), roomMax:int(root.querySelector('#mdg-room-max').value,4,24),
      corridor:int(root.querySelector('#mdg-corridor').value,1,3), seal:root.querySelector('#mdg-seal').checked, connected:root.querySelector('#mdg-connected').checked,
      doors:root.querySelector('#mdg-doors').checked, labels:root.querySelector('#mdg-labels').checked, stairs:root.querySelector('#mdg-stairs').checked
    };
  }

  function generate(root){
    const o=readOptions(root), rng=rngFromSeed(o.seed), map=blank(o.width,o.height,'wall'), seed=hashSeed(o.seed);
    for(let y=1;y<o.height-1;y++) for(let x=1;x<o.width-1;x++){
      const n=fractalNoise(x/o.scale,y/o.scale,seed,o.octaves,.52);
      const edge=Math.min(x,y,o.width-1-x,o.height-1-y);
      const edgeBias=edge<3?.12:0;
      setCell(map,x,y,n>o.threshold+edgeBias?'floor':'wall','',{generator:'noise',noise:Number(n.toFixed(3))});
    }
    for(let i=0;i<o.smooth;i++) smoothMap(map);
    const rooms=carveRooms(map,o,rng);
    connectRooms(map,rooms,o,rng);
    if(o.seal) sealMap(map);
    if(o.connected) retainPrimaryNetwork(map,rooms);
    if(o.doors) placeDoors(map,rooms,rng);
    if(o.labels) labelRooms(map,rooms);
    if(o.stairs) placeStairs(map,rooms);
    map.title=o.name; map.source='perlin-noise-dungeon-generator'; map.seed=o.seed; map.generatorOptions=o; map.rooms=rooms;
    lastMap=map;
    lastStats=analyze(map,rooms);
    renderPreview(root,map);
    root.querySelector('#mdg-stats').textContent=JSON.stringify(lastStats,null,2);
    status(root,`Generated ${o.width} × ${o.height} dungeon with ${rooms.length} carved rooms.`);
  }

  function smoothMap(map){
    const next=map.cells.map(row=>row.map(cell=>({...cell})));
    for(let y=1;y<map.height-1;y++) for(let x=1;x<map.width-1;x++){
      let walls=0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(dx||dy){ if(!isOpen(map.cells[y+dy][x+dx])) walls++; }
      next[y][x]={type:walls>=5?'wall':'floor',label:'',meta:{generator:'smoothed-noise'}};
    }
    map.cells=next;
  }

  function carveRooms(map,o,rng){
    const rooms=[];
    for(let attempt=0;attempt<o.rooms*12 && rooms.length<o.rooms;attempt++){
      const w=Math.floor(o.roomMin+rng()*(Math.max(o.roomMin+1,o.roomMax)-o.roomMin+1));
      const h=Math.floor(o.roomMin+rng()*(Math.max(o.roomMin+1,o.roomMax)-o.roomMin+1));
      const x=2+Math.floor(rng()*Math.max(1,map.width-w-4)), y=2+Math.floor(rng()*Math.max(1,map.height-h-4));
      const room={id:`room-${rooms.length+1}`,number:rooms.length+1,x,y,w,h,cx:Math.floor(x+w/2),cy:Math.floor(y+h/2)};
      if(rooms.some(r=>rectOverlap(room,r,2))) continue;
      for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) setCell(map,xx,yy,'floor','',{generator:'room',roomId:room.id});
      rooms.push(room);
    }
    return rooms;
  }
  function rectOverlap(a,b,pad=0){ return a.x-pad < b.x+b.w+pad && a.x+a.w+pad > b.x-pad && a.y-pad < b.y+b.h+pad && a.y+a.h+pad > b.y-pad; }

  function connectRooms(map,rooms,o,rng){
    if(rooms.length<2) return;
    const connected=[rooms[0]], remaining=rooms.slice(1);
    while(remaining.length){
      let best=null;
      for(const a of connected) for(const b of remaining){ const d=Math.abs(a.cx-b.cx)+Math.abs(a.cy-b.cy); if(!best||d<best.d) best={a,b,d}; }
      carveCorridor(map,best.a.cx,best.a.cy,best.b.cx,best.b.cy,o.corridor,rng()<.5);
      connected.push(best.b); remaining.splice(remaining.indexOf(best.b),1);
    }
    const extras=Math.floor(rooms.length*.25);
    for(let i=0;i<extras;i++){ const a=rooms[Math.floor(rng()*rooms.length)], b=rooms[Math.floor(rng()*rooms.length)]; if(a!==b) carveCorridor(map,a.cx,a.cy,b.cx,b.cy,o.corridor,rng()<.5); }
  }
  function carveCorridor(map,x1,y1,x2,y2,width,horizontalFirst){
    const carve=(x,y)=>{ const r=Math.floor((width-1)/2); for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) setCell(map,x+dx,y+dy,'floor','',{generator:'corridor'}); };
    let x=x1,y=y1;
    const horizontal=()=>{ while(x!==x2){ carve(x,y); x+=Math.sign(x2-x); } };
    const vertical=()=>{ while(y!==y2){ carve(x,y); y+=Math.sign(y2-y); } };
    if(horizontalFirst){ horizontal(); vertical(); } else { vertical(); horizontal(); }
    carve(x2,y2);
  }

  function sealMap(map){
    for(let x=0;x<map.width;x++){ setCell(map,x,0,'wall'); setCell(map,x,map.height-1,'wall'); }
    for(let y=0;y<map.height;y++){ setCell(map,0,y,'wall'); setCell(map,map.width-1,y,'wall'); }
    const next=map.cells.map(row=>row.map(cell=>({...cell})));
    for(let y=1;y<map.height-1;y++) for(let x=1;x<map.width-1;x++){
      if(!isOpen(map.cells[y][x])) continue;
      const orth=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>isOpen(map.cells[y+dy][x+dx])).length;
      const diag=[[-1,-1],[1,-1],[-1,1],[1,1]].filter(([dx,dy])=>isOpen(map.cells[y+dy][x+dx])).length;
      if(orth===0 || (orth===1 && diag===0)) next[y][x]={type:'wall',label:'',meta:{generator:'sealed-leak'}};
    }
    map.cells=next;
  }

  function floodRegions(map){
    const seen=Array.from({length:map.height},()=>Array(map.width).fill(false)), regions=[], dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let y=0;y<map.height;y++) for(let x=0;x<map.width;x++){
      if(seen[y][x]||!isOpen(map.cells[y][x])) continue;
      const tiles=[], stack=[[x,y]]; seen[y][x]=true;
      while(stack.length){ const [cx,cy]=stack.pop(); tiles.push([cx,cy]); for(const [dx,dy] of dirs){ const nx=cx+dx,ny=cy+dy; if(inBounds(map,nx,ny)&&!seen[ny][nx]&&isOpen(map.cells[ny][nx])){ seen[ny][nx]=true; stack.push([nx,ny]); } } }
      regions.push(tiles);
    }
    return regions.sort((a,b)=>b.length-a.length);
  }
  function retainPrimaryNetwork(map,rooms){
    const regions=floodRegions(map); if(!regions.length) return;
    let primary=regions[0];
    const roomCenters=new Set(rooms.map(r=>`${r.cx},${r.cy}`));
    const roomRegion=regions.find(region=>region.some(([x,y])=>roomCenters.has(`${x},${y}`)));
    if(roomRegion) primary=roomRegion;
    const keep=new Set(primary.map(([x,y])=>`${x},${y}`));
    for(let y=1;y<map.height-1;y++) for(let x=1;x<map.width-1;x++) if(isOpen(map.cells[y][x])&&!keep.has(`${x},${y}`)) setCell(map,x,y,'wall','',{generator:'sealed-disconnected-region'});
  }

  function placeDoors(map,rooms,rng){
    const roomIds=new Set(rooms.map(r=>r.id));
    for(const room of rooms){
      const candidates=[];
      for(let x=room.x;x<room.x+room.w;x++){ candidates.push([x,room.y-1,x,room.y]); candidates.push([x,room.y+room.h,x,room.y+room.h-1]); }
      for(let y=room.y;y<room.y+room.h;y++){ candidates.push([room.x-1,y,room.x,y]); candidates.push([room.x+room.w,y,room.x+room.w-1,y]); }
      const valid=candidates.filter(([wx,wy,ix,iy])=>inBounds(map,wx,wy)&&isOpen(map.cells[wy][wx])&&map.cells[iy]?.[ix]?.meta?.roomId===room.id);
      const chosen=[];
      for(const c of valid){ const key=`${c[0]},${c[1]}`; if(chosen.some(x=>x.key===key)) continue; if(chosen.length===0 || rng()<.18) chosen.push({key,c}); }
      chosen.slice(0,3).forEach(({c})=>{ const [x,y]=c; setCell(map,x,y,rng()<.1?'secret-door':'door','',{generator:'room-threshold',roomId:room.id,connects:room.id}); });
    }
  }
  function labelRooms(map,rooms){ for(const room of rooms){ setCell(map,room.cx,room.cy,'label',String(room.number),{generator:'room-label',roomId:room.id}); } }
  function placeStairs(map,rooms){ if(!rooms.length) return; const a=rooms[0], b=rooms[rooms.length-1]; setCell(map,a.cx,a.cy,'stairs','',{generator:'entrance-stairs',roomId:a.id}); if(b!==a) setCell(map,b.cx,b.cy,'stairs','',{generator:'exit-stairs',roomId:b.id}); }

  function analyze(map,rooms){
    const counts={wall:0,floor:0,door:0,'secret-door':0,stairs:0,label:0};
    map.cells.flat().forEach(c=>{ counts[c.type]=(counts[c.type]||0)+1; });
    const regions=floodRegions(map);
    return {seed:map.seed,size:`${map.width} x ${map.height}`,rooms:rooms.length,regions:regions.length,largestRegion:regions[0]?.length||0,tiles:counts,sealedBorder:map.cells[0].every(c=>c.type==='wall')&&map.cells[map.height-1].every(c=>c.type==='wall')};
  }

  function renderPreview(root,map){
    const preview=root.querySelector('#mdg-preview'); preview.innerHTML='';
    const grid=document.createElement('div'); grid.className='mdg-preview-grid'; grid.style.gridTemplateColumns=`repeat(${map.width},10px)`;
    for(const cell of map.cells.flat()){ const d=document.createElement('div'); d.className=`mdg-cell ${cell.type}`; if(cell.type==='label') d.textContent=cell.label; grid.appendChild(d); }
    preview.appendChild(grid);
  }

  function applyToEditor(root,createModule){
    if(!lastMap){ status(root,'Generate a dungeon first.'); return; }
    const textarea=document.querySelector('#mme-import'), button=document.querySelector('#mme-import-json');
    if(!textarea||!button){ status(root,'Module Map Editor is not available.'); return; }
    textarea.value=JSON.stringify(lastMap);
    button.click();
    if(createModule){
      const id=`${slug(lastMap.title)}-${Date.now()}`;
      document.dispatchEvent(new CustomEvent('module-map-editor-new-module',{detail:{
        module:{schemaVersion:'0.1.0',id,path:`memory:${id}`,title:lastMap.title||'Random Noise Dungeon',subtitle:'Seeded Perlin-noise dungeon module',system:'Generated module draft',source:{notes:`Generated from seed ${lastMap.seed}.`},general:{size:`${lastMap.width} x ${lastMap.height}`,status:'generated draft'},map:{image:'',grid:`${lastMap.width} x ${lastMap.height}`},hotspots:[],rooms:[],doors:[],mapEditorState:lastMap,generatorStats:lastStats},
        state:lastMap,title:lastMap.title
      }}));
      setTimeout(()=>{ const apply=document.querySelector('#mme-apply-viewer'); if(apply) apply.click(); },0);
      status(root,`Created new generated module: ${lastMap.title}`);
    } else status(root,'Applied generated dungeon to the current editor and viewer.');
  }

  function status(root,msg){ root.querySelector('#mdg-status').textContent=msg; }
  const observer=new MutationObserver(init); observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
