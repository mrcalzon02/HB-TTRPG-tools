(() => {
  'use strict';

  const UPSTREAM = 'https://donjon.bin.sh/code/dungeon/dungeon.pl';
  const LOCAL_REFERENCE = 'SRC/third-party/donjon-dungeon/TOPOLOGY-ADAPTATION.md';
  const DIRS = [
    {key:'north',dx:0,dy:-1},
    {key:'south',dx:0,dy:1},
    {key:'west',dx:-1,dy:0},
    {key:'east',dx:1,dy:0}
  ];
  const PERSISTENCE = {Labyrinth:0, Bent:0.5, Straight:1};
  let lastMap = null;
  let lastStats = null;

  const css = `
    .module-dungeon-generator{margin-top:18px;border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}
    .mdg-layout{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}.mdg-controls{display:grid;gap:10px;border:1px solid var(--line);border-radius:14px;padding:12px;background:rgba(0,0,0,.16)}.mdg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mdg-controls input,.mdg-controls select{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 10px}.mdg-controls label{font-size:.78rem;color:var(--muted)}.mdg-controls input[type='checkbox']{width:auto;margin-right:6px}.mdg-actions{display:flex;flex-wrap:wrap;gap:8px}.mdg-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.mdg-actions button:hover{border-color:var(--accent)}.mdg-preview{overflow:auto;max-height:76vh;border:1px solid rgba(200,138,53,.35);border-radius:14px;background:#07090d;padding:10px}.mdg-preview-grid{display:grid;width:max-content}.mdg-cell{width:10px;height:10px}.mdg-cell.wall{background:#05070b}.mdg-cell.floor{background:#fff}.mdg-cell.door{background:#d47b46}.mdg-cell.secret-door{background:#bd7cff}.mdg-cell.stairs{background:#7aa7ff}.mdg-cell.label{background:#fff;color:#111;font:700 7px/10px monospace;text-align:center}.mdg-status{color:var(--muted);font-size:.82rem;line-height:1.4}.mdg-stats{white-space:pre-wrap;border:1px solid var(--line);border-radius:12px;padding:10px;background:rgba(0,0,0,.18);color:var(--muted);font-size:.76rem;max-height:300px;overflow:auto}.mdg-provenance{font-size:.74rem;color:var(--muted);line-height:1.4}.mdg-provenance a{color:var(--accent)}@media(max-width:980px){.mdg-layout{grid-template-columns:1fr}}
  `;

  function styleOnce(){ if(document.getElementById('module-dungeon-generator-style')) return; const s=document.createElement('style'); s.id='module-dungeon-generator-style'; s.textContent=css; document.head.appendChild(s); }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,Number(v)||min)); }
  function int(v,min,max){ return Math.floor(clamp(v,min,max)); }
  function odd(v,min,max){ let n=int(v,min,max); if(n%2===0) n += n<max?1:-1; return n; }
  function oddRange(rng,min,max){ const lo=odd(min,3,99), hi=odd(Math.max(lo,max),lo,99); const count=Math.floor((hi-lo)/2)+1; return lo+2*rng.int(0,Math.max(0,count-1)); }
  function slug(value){ return String(value||'random-dungeon').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'random-dungeon'; }
  function hashSeed(seed){ let h=2166136261; for(const c of String(seed)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
  function rngFromSeed(seed){
    let a=hashSeed(seed)||1;
    const random=()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
    random.int=(min,max)=>min+Math.floor(random()*(Math.max(min,max)-min+1));
    random.pick=list=>list.length?list[random.int(0,list.length-1)]:null;
    random.shuffle=list=>{ const a=list.slice(); for(let i=a.length-1;i>0;i--){ const j=random.int(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; };
    return random;
  }
  function blankLogical(width,height){ return {width,height,cells:Array.from({length:height},()=>Array.from({length:width},()=>({blocked:false,room:false,roomId:0,perimeter:false,corridor:false,entrance:false,doorType:null,stair:null,label:''}))),rooms:[],doors:[],stairs:[]}; }
  function inBounds(d,x,y){ return x>=0&&y>=0&&x<d.width&&y<d.height; }
  function cell(d,x,y){ return inBounds(d,x,y)?d.cells[y][x]:null; }

  function init(){
    styleOnce();
    const anchor=document.getElementById('module-content-filler-root')||document.getElementById('module-map-editor-root');
    if(!anchor || document.getElementById('module-random-dungeon-generator-root')) return;
    const root=document.createElement('section');
    root.id='module-random-dungeon-generator-root'; root.className='module-dungeon-generator no-print';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">Reference-driven module maker</p><h2>Donjon-Informed Random Dungeon Generator</h2><p>Build room-and-corridor modules using the same topology order that makes the preserved example dungeons readable: mask the field, place rooms, cut room openings, tunnel corridors, place stairs, prune dead ends, validate, and then render into the Module Map Editor.</p></div><div class="mdg-layout"><aside class="mdg-controls"><label>Module name<input id="mdg-name" value="Random Dungeon Module"></label><label>Seed<input id="mdg-seed" value="dungeon-001"></label><label>Reference preset<select id="mdg-preset"><option value="small">Classic small · 39 × 39</option><option value="huge">Huge example · 73 × 65</option><option value="custom">Custom dimensions</option></select></label><div class="mdg-grid"><label>Width<input id="mdg-width" type="number" min="15" max="121" value="39"></label><label>Height<input id="mdg-height" type="number" min="15" max="121" value="39"></label><label>Dungeon mask<select id="mdg-layout"><option>None</option><option>Box</option><option>Cross</option><option>Round</option></select></label><label>Room layout<select id="mdg-room-layout"><option>Scattered</option><option>Packed</option></select></label><label>Room target (0 = auto)<input id="mdg-room-target" type="number" min="0" max="80" value="0"></label><label>Room min size<input id="mdg-room-min" type="number" min="3" max="19" value="3"></label><label>Room max size<input id="mdg-room-max" type="number" min="3" max="25" value="9"></label><label>Corridor behavior<select id="mdg-corridor"><option>Labyrinth</option><option selected>Bent</option><option>Straight</option></select></label><label>Remove dead ends<select id="mdg-deadends"><option value="0">0%</option><option value="25">25%</option><option value="50" selected>50%</option><option value="75">75%</option><option value="100">100%</option></select></label><label>Stairs / exits<input id="mdg-stairs" type="number" min="0" max="8" value="2"></label></div><label><input id="mdg-labels" type="checkbox" checked>Number room centers</label><div class="mdg-actions"><button id="mdg-generate" type="button">Generate Preview</button><button id="mdg-reroll" type="button">Reroll Seed</button><button id="mdg-apply" type="button">Apply To Current Editor</button><button id="mdg-new-module" type="button">Create New Module</button></div><p id="mdg-status" class="mdg-status">Ready.</p><pre id="mdg-stats" class="mdg-stats">No dungeon generated.</pre><p class="mdg-provenance">Topology is an original JavaScript implementation informed by the preserved <a href="${UPSTREAM}" target="_blank" rel="noopener">Donjon dungeon.pl reference</a> and the local adaptation contract at <code>${LOCAL_REFERENCE}</code>. The preserved example modules above are the visual/use-case corpus.</p></aside><div id="mdg-preview" class="mdg-preview"></div></div>`;
    anchor.insertAdjacentElement('afterend',root);
    root.querySelector('#mdg-preset').addEventListener('change',()=>applyPreset(root));
    root.querySelector('#mdg-generate').onclick=()=>generate(root);
    root.querySelector('#mdg-reroll').onclick=()=>{ root.querySelector('#mdg-seed').value=`dungeon-${Math.random().toString(36).slice(2,10)}`; generate(root); };
    root.querySelector('#mdg-apply').onclick=()=>applyToEditor(root,false);
    root.querySelector('#mdg-new-module').onclick=()=>applyToEditor(root,true);
    generate(root);
  }

  function applyPreset(root){
    const p=root.querySelector('#mdg-preset').value;
    if(p==='small'){ root.querySelector('#mdg-width').value=39; root.querySelector('#mdg-height').value=39; root.querySelector('#mdg-room-min').value=3; root.querySelector('#mdg-room-max').value=9; }
    if(p==='huge'){ root.querySelector('#mdg-width').value=73; root.querySelector('#mdg-height').value=65; root.querySelector('#mdg-room-min').value=3; root.querySelector('#mdg-room-max').value=11; }
  }
  function readOptions(root){
    return {
      name:root.querySelector('#mdg-name').value.trim()||'Random Dungeon Module',
      seed:root.querySelector('#mdg-seed').value.trim()||'dungeon',
      width:odd(root.querySelector('#mdg-width').value,15,121),
      height:odd(root.querySelector('#mdg-height').value,15,121),
      dungeonLayout:root.querySelector('#mdg-layout').value,
      roomLayout:root.querySelector('#mdg-room-layout').value,
      roomTarget:int(root.querySelector('#mdg-room-target').value,0,80),
      roomMin:odd(root.querySelector('#mdg-room-min').value,3,19),
      roomMax:odd(root.querySelector('#mdg-room-max').value,3,25),
      corridorLayout:root.querySelector('#mdg-corridor').value,
      removeDeadends:int(root.querySelector('#mdg-deadends').value,0,100),
      addStairs:int(root.querySelector('#mdg-stairs').value,0,8),
      labels:root.querySelector('#mdg-labels').checked
    };
  }

  function generate(root){
    const o=readOptions(root), rng=rngFromSeed(o.seed), d=blankLogical(o.width,o.height);
    applyMask(d,o.dungeonLayout);
    placeRooms(d,o,rng);
    openRooms(d,o,rng);
    carveCorridors(d,o,rng);
    placeStairs(d,o,rng);
    pruneDeadEnds(d,o,rng);
    cleanDoors(d);
    if(o.labels) labelRooms(d);
    const map=toEditorState(d,o);
    lastMap=map; lastStats=analyze(map,d,o);
    renderPreview(root,map);
    root.querySelector('#mdg-stats').textContent=JSON.stringify(lastStats,null,2);
    status(root,`Generated ${o.width} × ${o.height}: ${d.rooms.length} rooms, ${d.doors.length} room openings, ${d.stairs.length} stairs/exits, ${lastStats.regions} traversable region${lastStats.regions===1?'':'s'}.`);
  }

  function applyMask(d,layout){
    if(layout==='None') return;
    const cx=(d.width-1)/2, cy=(d.height-1)/2;
    for(let y=0;y<d.height;y++) for(let x=0;x<d.width;x++){
      let blocked=false;
      if(layout==='Round'){
        const nx=(x-cx)/Math.max(1,cx), ny=(y-cy)/Math.max(1,cy); blocked=(nx*nx+ny*ny)>1;
      } else {
        const tx=Math.min(2,Math.floor(x/d.width*3)), ty=Math.min(2,Math.floor(y/d.height*3));
        if(layout==='Box') blocked=(tx===1&&ty===1);
        if(layout==='Cross') blocked=!((tx===1)||(ty===1));
      }
      if(blocked) d.cells[y][x].blocked=true;
    }
  }
  function roomSize(o,rng){ const min=Math.min(o.roomMin,o.roomMax), max=Math.max(o.roomMin,o.roomMax); return {w:oddRange(rng,min,max),h:oddRange(rng,min,max)}; }
  function randomOddStart(rng,limit){ const slots=[]; for(let n=1;n<=limit;n+=2) slots.push(n); return rng.pick(slots)??1; }
  function canPlaceRoom(d,x,y,w,h){
    if(x<1||y<1||x+w>=d.width||y+h>=d.height) return false;
    for(let yy=y-1;yy<=y+h;yy++) for(let xx=x-1;xx<=x+w;xx++){
      const c=cell(d,xx,yy); if(!c||c.blocked||c.room||c.perimeter) return false;
    }
    return true;
  }
  function emplaceRoom(d,x,y,w,h){
    const id=d.rooms.length+1, room={id:`room-${id}`,number:id,x,y,w,h,north:y,south:y+h-1,west:x,east:x+w-1,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};
    for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++){ const c=cell(d,xx,yy); c.room=true; c.roomId=id; c.perimeter=false; }
    for(let yy=y-1;yy<=y+h;yy++) for(let xx=x-1;xx<=x+w;xx++){
      const c=cell(d,xx,yy); if(c&&!c.blocked&&!c.room) c.perimeter=true;
    }
    d.rooms.push(room); return room;
  }
  function placeRooms(d,o,rng){
    const auto=Math.max(1,Math.floor((d.width*d.height)/(Math.max(o.roomMax,5)**2*1.35)));
    const target=o.roomTarget||Math.min(80,auto);
    if(o.roomLayout==='Packed'){
      outer: for(let y=1;y<d.height-3;y+=2) for(let x=1;x<d.width-3;x+=2){
        if(d.rooms.length>=target) break outer;
        if((x===1||y===1)&&rng()<0.5) continue;
        const {w,h}=roomSize(o,rng); if(canPlaceRoom(d,x,y,w,h)) emplaceRoom(d,x,y,w,h);
      }
    } else {
      const attempts=Math.max(80,target*28);
      for(let attempt=0;attempt<attempts&&d.rooms.length<target;attempt++){
        const {w,h}=roomSize(o,rng), x=randomOddStart(rng,d.width-w-2), y=randomOddStart(rng,d.height-h-2);
        if(canPlaceRoom(d,x,y,w,h)) emplaceRoom(d,x,y,w,h);
      }
    }
    if(!d.rooms.length){
      const w=Math.min(7,d.width-4), h=Math.min(7,d.height-4), x=odd(Math.max(1,Math.floor((d.width-w)/2)),1,d.width-w-2), y=odd(Math.max(1,Math.floor((d.height-h)/2)),1,d.height-h-2);
      if(canPlaceRoom(d,x,y,w,h)) emplaceRoom(d,x,y,w,h);
    }
  }

  function doorType(rng){
    const roll=rng.int(0,109);
    if(roll<15) return 'archway';
    if(roll<60) return 'unlocked';
    if(roll<75) return 'locked';
    if(roll<90) return 'trapped';
    if(roll<100) return 'secret';
    return 'portcullis';
  }
  function candidateDoor(d,room,sx,sy,dir){
    const doorX=sx+dir.dx, doorY=sy+dir.dy, outX=doorX+dir.dx, outY=doorY+dir.dy;
    const dc=cell(d,doorX,doorY), oc=cell(d,outX,outY);
    if(!dc||!oc||!dc.perimeter||dc.blocked||dc.doorType||oc.blocked||oc.room||oc.perimeter) return null;
    return {roomId:room.number,sillX:sx,sillY:sy,x:doorX,y:doorY,outX,outY,direction:dir.key};
  }
  function doorCandidates(d,room){
    const list=[];
    for(let x=room.west;x<=room.east;x+=2){
      const n=candidateDoor(d,room,x,room.north,DIRS[0]); if(n) list.push(n);
      const s=candidateDoor(d,room,x,room.south,DIRS[1]); if(s) list.push(s);
    }
    for(let y=room.north;y<=room.south;y+=2){
      const w=candidateDoor(d,room,room.west,y,DIRS[2]); if(w) list.push(w);
      const e=candidateDoor(d,room,room.east,y,DIRS[3]); if(e) list.push(e);
    }
    return list;
  }
  function openRooms(d,o,rng){
    for(const room of d.rooms){
      let candidates=rng.shuffle(doorCandidates(d,room)); if(!candidates.length) continue;
      const coarseW=Math.floor(room.w/2)+1, coarseH=Math.floor(room.h/2)+1, base=Math.max(1,Math.floor(Math.sqrt(coarseW*coarseH)));
      const count=Math.min(candidates.length,Math.min(5,base+rng.int(0,Math.max(0,base-1))));
      for(let i=0;i<count;i++){
        const opening=candidates[i], type=doorType(rng), dc=cell(d,opening.x,opening.y), oc=cell(d,opening.outX,opening.outY);
        dc.perimeter=false; dc.entrance=true; dc.doorType=type; oc.entrance=true;
        const record={id:`door-${d.doors.length+1}`,label:`${type[0].toUpperCase()+type.slice(1)} door`,kind:type,...opening};
        d.doors.push(record);
      }
    }
  }

  function tunnelAllowed(d,x,y){ const c=cell(d,x,y); return Boolean(c&&!c.blocked&&!c.room&&!c.perimeter&&!c.doorType&&!c.corridor); }
  function orderedDirs(rng,last,persistence){
    let dirs=rng.shuffle(DIRS);
    if(last&&rng()<persistence){ const idx=dirs.findIndex(d=>d.key===last); if(idx>=0) dirs.unshift(...dirs.splice(idx,1)); }
    return dirs;
  }
  function carveCorridors(d,o,rng){
    const persistence=PERSISTENCE[o.corridorLayout]??0.5;
    for(let sy=1;sy<d.height-1;sy+=2) for(let sx=1;sx<d.width-1;sx+=2){
      const start=cell(d,sx,sy); if(!start||start.blocked||start.room||start.perimeter||start.doorType||start.corridor) continue;
      start.corridor=true;
      const stack=[{x:sx,y:sy,last:null}];
      while(stack.length){
        const current=stack[stack.length-1]; let moved=false;
        for(const dir of orderedDirs(rng,current.last,persistence)){
          const mx=current.x+dir.dx, my=current.y+dir.dy, nx=current.x+dir.dx*2, ny=current.y+dir.dy*2;
          if(!inBounds(d,nx,ny)||!tunnelAllowed(d,mx,my)||!tunnelAllowed(d,nx,ny)) continue;
          cell(d,mx,my).corridor=true; cell(d,nx,ny).corridor=true;
          current.last=dir.key; stack.push({x:nx,y:ny,last:dir.key}); moved=true; break;
        }
        if(!moved) stack.pop();
      }
    }
  }

  function openNeighbor(c){ return Boolean(c&&(c.corridor||c.entrance||c.doorType)); }
  function corridorDegree(d,x,y){ let n=0; for(const dir of DIRS) if(openNeighbor(cell(d,x+dir.dx,y+dir.dy))) n++; return n; }
  function stairCandidates(d){
    const out=[];
    for(let y=1;y<d.height-1;y++) for(let x=1;x<d.width-1;x++){
      const c=cell(d,x,y); if(!c?.corridor||c.entrance||c.doorType||c.room) continue;
      if(corridorDegree(d,x,y)===1) out.push({x,y});
    }
    return out;
  }
  function placeStairs(d,o,rng){
    let list=rng.shuffle(stairCandidates(d));
    if(list.length<o.addStairs){
      const fallback=[]; for(let y=1;y<d.height-1;y++) for(let x=1;x<d.width-1;x++){ const c=cell(d,x,y); if(c?.corridor&&!c.entrance&&!c.doorType&&!c.room) fallback.push({x,y}); }
      list=rng.shuffle([...list,...fallback.filter(p=>!list.some(q=>q.x===p.x&&q.y===p.y))]);
    }
    for(let i=0;i<Math.min(o.addStairs,list.length);i++){
      const p=list[i], c=cell(d,p.x,p.y), type=i===0?'down':i===1?'up':(rng()<0.5?'down':'up'); c.stair=type;
      const record={id:`stair-${i+1}`,x:p.x,y:p.y,type}; d.stairs.push(record);
    }
  }
  function protectedCorridor(d,x,y){
    const c=cell(d,x,y); if(!c||c.stair||c.entrance||c.doorType) return true;
    return DIRS.some(dir=>cell(d,x+dir.dx,y+dir.dy)?.doorType);
  }
  function pruneDeadEnds(d,o,rng){
    const p=o.removeDeadends/100; if(!p) return;
    for(let pass=0;pass<Math.max(d.width,d.height);pass++){
      const remove=[];
      for(let y=1;y<d.height-1;y++) for(let x=1;x<d.width-1;x++){
        const c=cell(d,x,y); if(!c?.corridor||protectedCorridor(d,x,y)) continue;
        if(corridorDegree(d,x,y)<=1 && (p>=1||rng()<p)) remove.push([x,y]);
      }
      if(!remove.length) break;
      for(const [x,y] of remove){ const c=cell(d,x,y); c.corridor=false; }
    }
  }
  function cleanDoors(d){
    const kept=[];
    for(const door of d.doors){
      const outside=cell(d,door.outX,door.outY), dc=cell(d,door.x,door.y);
      if(outside&&(outside.corridor||outside.entrance)) kept.push(door);
      else if(dc){ dc.doorType=null; dc.entrance=false; dc.perimeter=true; }
    }
    d.doors=kept;
  }
  function labelRooms(d){ for(const room of d.rooms){ const c=cell(d,room.cx,room.cy); if(c) c.label=String(room.number); } }

  function toEditorState(d,o){
    const cells=Array.from({length:d.height},()=>Array(d.width));
    for(let y=0;y<d.height;y++) for(let x=0;x<d.width;x++){
      const c=d.cells[y][x]; let type=(c.room||c.corridor||c.entrance)?'floor':'wall', label='';
      if(c.doorType) type=c.doorType==='secret'?'secret-door':'door';
      if(c.stair){ type='stairs'; label=c.stair==='up'?'↑':'↓'; }
      if(c.label){ type='label'; label=c.label; }
      cells[y][x]={type,label,meta:{generator:'donjon-informed-topology',roomId:c.roomId||undefined,doorKind:c.doorType||undefined,stair:c.stair||undefined,blocked:c.blocked||undefined}};
    }
    return {
      schemaVersion:'0.1.0',tool:'module-map-editor',title:o.name,width:d.width,height:d.height,tileSize:1,cells,
      seed:o.seed,source:'donjon-informed-topology',generatorOptions:o,
      generatorProvenance:{upstream:UPSTREAM,localReference:LOCAL_REFERENCE,implementation:'Original project JavaScript reimplementation of the reference generation phases; no Perl source is executed at runtime.'},
      referenceCorpus:['The Northern Watchtower 09','Veteck Henrina\'yea 09','Caves of Whispering Wild 10','The Secret Chambers of Sabiesha the Enchantress 10','The Secret Prison of Souls 10','Tomb of Antwig 05'],
      rooms:d.rooms.map(room=>({...room,title:`Room #${room.number}`,summary:'Generated room shell awaiting semantic content population.'})),
      doors:d.doors.map(door=>({...door})),stairs:d.stairs.map(stair=>({...stair}))
    };
  }
  function isTraversable(c){ return ['floor','label','stairs','door','secret-door','trap'].includes(c.type); }
  function floodRegions(map){
    const seen=Array.from({length:map.height},()=>Array(map.width).fill(false)),regions=[];
    for(let y=0;y<map.height;y++) for(let x=0;x<map.width;x++){
      if(seen[y][x]||!isTraversable(map.cells[y][x])) continue;
      const region=[],stack=[[x,y]]; seen[y][x]=true;
      while(stack.length){ const [cx,cy]=stack.pop(); region.push([cx,cy]); for(const dir of DIRS){ const nx=cx+dir.dx,ny=cy+dir.dy; if(inBounds(map,nx,ny)&&!seen[ny][nx]&&isTraversable(map.cells[ny][nx])){ seen[ny][nx]=true; stack.push([nx,ny]); } } }
      regions.push(region);
    }
    return regions.sort((a,b)=>b.length-a.length);
  }
  function analyze(map,d,o){
    const tiles={}; map.cells.flat().forEach(c=>tiles[c.type]=(tiles[c.type]||0)+1); const regions=floodRegions(map);
    const connectedRooms=d.rooms.filter(room=>regions.some(region=>region.some(([x,y])=>x===room.cx&&y===room.cy))).length;
    return {seed:o.seed,size:`${map.width} x ${map.height}`,mask:o.dungeonLayout,roomLayout:o.roomLayout,corridorLayout:o.corridorLayout,deadEndRemoval:`${o.removeDeadends}%`,rooms:d.rooms.length,doors:d.doors.length,stairs:d.stairs.length,regions:regions.length,largestRegion:regions[0]?.length||0,connectedRoomCenters:connectedRooms,tiles,referenceAlgorithm:UPSTREAM};
  }
  function renderPreview(root,map){
    const preview=root.querySelector('#mdg-preview'); preview.innerHTML=''; const grid=document.createElement('div'); grid.className='mdg-preview-grid'; grid.style.gridTemplateColumns=`repeat(${map.width},10px)`;
    for(const c of map.cells.flat()){ const d=document.createElement('div'); d.className=`mdg-cell ${c.type}`; if(c.type==='label') d.textContent=c.label; if(c.type==='stairs') d.title=c.label==='↑'?'Stairs up':'Stairs down'; if(c.meta?.doorKind) d.title=c.meta.doorKind; grid.appendChild(d); }
    preview.appendChild(grid);
  }
  function applyToEditor(root,createModule){
    if(!lastMap){ status(root,'Generate a dungeon first.'); return; }
    const textarea=document.querySelector('#mme-import'), button=document.querySelector('#mme-import-json');
    if(!textarea||!button){ status(root,'Module Map Editor is not available.'); return; }
    textarea.value=JSON.stringify(lastMap); button.click();
    if(createModule){
      const id=`${slug(lastMap.title)}-${Date.now()}`;
      const moduleRooms=(lastMap.rooms||[]).map(room=>({id:room.id,number:room.number,title:room.title,summary:room.summary,features:[],monsters:[],treasure:[]}));
      const moduleDoors=(lastMap.doors||[]).map(door=>({id:door.id,label:door.label,kind:door.kind,roomId:door.roomId,direction:door.direction}));
      document.dispatchEvent(new CustomEvent('module-map-editor-new-module',{detail:{module:{schemaVersion:'0.1.0',id,path:`memory:${id}`,title:lastMap.title||'Random Dungeon Module',subtitle:'Reference-driven procedural dungeon module',system:'Generated module draft',source:{notes:`Generated from seed ${lastMap.seed} using the Donjon-informed topology pipeline.`,reference:UPSTREAM},general:{size:`${lastMap.width} x ${lastMap.height}`,status:'generated draft'},map:{image:'',grid:`${lastMap.width} x ${lastMap.height}`},hotspots:[],rooms:moduleRooms,doors:moduleDoors,mapEditorState:lastMap,generatorStats:lastStats},state:lastMap,title:lastMap.title}}));
      setTimeout(()=>document.querySelector('#mme-apply-viewer')?.click(),0);
      status(root,`Created new generated module: ${lastMap.title}`);
    } else status(root,'Applied generated dungeon to the current editor and viewer.');
  }
  function status(root,msg){ const el=root.querySelector('#mdg-status'); if(el) el.textContent=msg; }

  window.HBDonjonInformedDungeonGenerator={generateState:(options={})=>{ const o={name:'Generated Dungeon',seed:'api',width:39,height:39,dungeonLayout:'None',roomLayout:'Scattered',roomTarget:0,roomMin:3,roomMax:9,corridorLayout:'Bent',removeDeadends:50,addStairs:2,labels:true,...options}; o.width=odd(o.width,15,121); o.height=odd(o.height,15,121); const rng=rngFromSeed(o.seed),d=blankLogical(o.width,o.height); applyMask(d,o.dungeonLayout); placeRooms(d,o,rng); openRooms(d,o,rng); carveCorridors(d,o,rng); placeStairs(d,o,rng); pruneDeadEnds(d,o,rng); cleanDoors(d); if(o.labels) labelRooms(d); return toEditorState(d,o); },upstream:UPSTREAM,localReference:LOCAL_REFERENCE};

  const observer=new MutationObserver(init); observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
