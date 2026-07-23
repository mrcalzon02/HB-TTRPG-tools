(() => {
  'use strict';

  const chapters = [
    ['# Alkroves Ichesnas Arcane Academia Universitalis','Introduction'],
    ['# Conditions Within the University','Conditions'],
    ['# Powers Within the Ruin','Powers Within the Ruin'],
    ['# Room-by-Room Dungeon Key','Dungeon Key'],
    ['# I. The Frostbound Approaches','I · Frostbound Approaches'],
    ['# II. The Instructional Halls','II · Instructional Halls'],
    ['# III. The Student Houses','III · Student Houses'],
    ['# IV. The Great Workshops','IV · Great Workshops'],
    ['# V. The Library Labyrinth','V · Library Labyrinth'],
    ['# VI. The Necromantic Annex','VI · Necromantic Annex'],
    ['# VII. Treasury and Expedition Levels','VII · Treasury Levels'],
    ['# VIII. The Outer Watch and Final Defenses','VIII · Outer Watch'],
    ['# The Hidden Structure Beneath the University','Hidden Structure'],
    ['# Using the University as a Campaign Dungeon','Campaign Use']
  ];

  const districts = {
    1:{name:'The Frostbound Approaches',color:'#85b9cf',level:320},
    2:{name:'The Instructional Halls',color:'#d2a45d',level:210},
    3:{name:'The Student Houses',color:'#9dbb7a',level:90},
    4:{name:'The Great Workshops',color:'#c98264',level:-50},
    5:{name:'The Library Labyrinth',color:'#7f91c8',level:-200},
    6:{name:'The Necromantic Annex',color:'#b06f9c',level:-365},
    7:{name:'Treasury and Expedition Levels',color:'#d0c5a5',level:-535},
    8:{name:'The Outer Watch and Final Defenses',color:'#a6acb9',level:-665}
  };

  const rawNodes = [
    [1,'The Processional of Empty Banners',1,-220,320,-70,'road',116,24,18],[2,'The Outer Watch Gatehouse',1,-120,320,-50,'tower',64,48,62],[3,'The Court of Silenced Welcome',1,-30,320,0,'cavern',86,74,22],[4,'The Avenue of Founders',1,70,320,-70,'road',96,26,24],[5,'The Fallen Provost’s Tower',1,-100,275,85,'tower',38,104,54],[6,'The Hall of Admissions',1,45,320,80,'hall',82,42,26],[7,'The Registry of Names',1,120,300,115,'cylinder',66,66,40],[8,'The Hall of Cloaks and Seals',1,125,320,25,'hall',54,34,24],[9,'The Grand Lecture Rotunda',1,55,285,-105,'cylinder',86,86,48],[10,'The Hall of Bells',1,180,320,80,'tower',46,46,72],[11,'The Northern Cloister',1,220,320,0,'cavern',92,78,22],[12,'The Sunken Court',1,-35,260,155,'cavern',92,82,56],
    [13,'The Chamber of Practical Thaumaturgy',2,-190,210,-85,'room',72,56,30],[14,'The Hall of Runic Geometry',2,-105,210,-125,'hall',92,58,28],[15,'The Counterspell Amphitheater',2,-15,210,-125,'cylinder',84,72,40],[16,'The Laboratory of Applied Silence',2,75,210,-105,'hall',76,54,30],[17,'The Faculty Commons',2,170,210,-65,'room',66,52,26],[18,'The Scriptorium of Repeated Errors',2,190,210,25,'hall',82,50,30],[19,'The Vault of Examinations',2,120,210,105,'room',66,54,34],[20,'The Dueling Gallery',2,25,210,130,'hall',112,34,28],[21,'The University Infirmary',2,-75,210,125,'hall',88,58,30],[22,'The Apothecary of Deep Remedies',2,-160,210,85,'room',64,52,30],[23,'The Refectory of the Thousand Seats',2,-215,180,10,'hall',126,72,32],[24,'The Kitchens and Brewer’s Descent',2,-245,140,115,'shaft',72,62,92],
    [25,'House Anvil',3,-190,90,-110,'hall',88,66,30],[26,'House Lantern',3,-85,90,-145,'tower',72,72,52],[27,'House Deepstone',3,20,90,-130,'cavern',84,70,34],[28,'House Crown',3,130,90,-105,'hall',92,70,36],[29,'The Communal Bathing Vault',3,-145,90,20,'cavern',96,78,26],[30,'The Frozen Laundry',3,-45,90,35,'hall',68,48,24],[31,'The Servants’ Labyrinth',3,45,45,25,'road',132,24,44],[32,'The Custodians’ Rune Closet',3,120,90,5,'room',42,34,24],[33,'The Chapel of Student Petitions',3,185,90,55,'room',52,46,34],[34,'The Hall of Debts',3,125,90,140,'hall',84,56,32],[35,'The Society Behind the Wall',3,20,90,150,'room',58,44,24],[36,'The Broken Spiral',3,-85,30,145,'shaft',48,48,144],
    [37,'The Runesmiths’ Hall',4,-210,-50,-100,'hall',112,68,34],[38,'The Enchantment Crucible',4,-100,-50,-135,'cylinder',70,70,52],[39,'The Elemental Binding Laboratory',4,5,-50,-145,'hall',82,60,34],[40,'The Practical Smithy',4,110,-50,-120,'hall',106,64,38],[41,'The Golem Foundry',4,205,-50,-70,'hall',90,70,46],[42,'The University Armory',4,225,-50,30,'room',72,58,34],[43,'The Wardstone Laboratory',4,135,-50,110,'hall',88,66,42],[44,'The Observatory of Deep Cold',4,25,-50,135,'cylinder',86,86,58],[45,'The Geomantic Survey Hall',4,-85,-50,130,'hall',98,72,36],[46,'The Transmutation Vault',4,-175,-50,85,'room',70,62,32],[47,'The Destructive Testing Range',4,-235,-50,5,'road',142,30,28],[48,'The Disaster Regulation Chamber',4,-105,-95,20,'room',76,62,44],
    [49,'The Great Library of Ichesnas',5,-165,-200,-95,'shaft',112,112,130],[50,'The Cataloguing Chamber',5,-50,-200,-125,'hall',88,62,34],[51,'The Living Indexes',5,55,-200,-125,'hall',84,52,34],[52,'The Forbidden Stacks',5,155,-200,-90,'hall',96,58,44],[53,'The Faculty Archive',5,215,-200,0,'hall',78,56,38],[54,'The Draconic War Collection',5,165,-200,95,'hall',102,74,42],[55,'The Wyrm-Men Specimen Vault',5,60,-200,135,'hall',78,62,44],[56,'The Hall of Ancestral Contracts',5,-45,-200,135,'hall',96,66,38],[57,'The Crypt of Theorems',5,-150,-200,95,'cavern',86,76,40],[58,'The Memory Vault',5,-225,-200,15,'hall',82,60,42],[59,'The Absolute Reading Room',5,-115,-245,10,'room',64,54,30],[60,'The Rector’s Archive',5,10,-245,15,'cylinder',72,72,54],
    [61,'The Black Stair',6,-195,-365,-110,'shaft',42,42,126],[62,'The Anatomical Theater',6,-105,-365,-135,'cylinder',84,84,42],[63,'The Laboratory of Soul Acoustics',6,0,-365,-145,'hall',86,60,40],[64,'The Hall of the Unspoken Lecture',6,105,-365,-125,'hall',90,54,34],[65,'The Embalming Forges',6,195,-365,-70,'hall',104,68,44],[66,'The Reliquary of Heroes',6,220,-365,35,'hall',96,76,48],[67,'The Gate of Kings',6,145,-365,125,'hall',78,30,64],[68,'The Final Conclave',6,35,-365,150,'cylinder',88,88,44],[69,'The Hall of Revoked Provenance',6,-75,-365,145,'hall',94,62,42],[70,'The Battlefield Chapel',6,-170,-365,95,'room',78,64,48],[71,'The Glacier Vault',6,-230,-365,0,'cavern',96,76,72],[72,'The Well of Returning Names',6,-75,-430,20,'shaft',88,88,174],
    [73,'The Caravan Muster Hall',7,-180,-535,-95,'hall',122,78,36],[74,'The Hall of Levies',7,-65,-535,-125,'hall',88,58,34],[75,'The Assay Vault',7,45,-535,-125,'room',70,58,38],[76,'The Royal Ledger Chamber',7,150,-535,-85,'hall',96,66,44],[77,'The Expedition Barracks',7,185,-535,30,'hall',92,64,34],[78,'The Supply Cisterns',7,70,-535,120,'cavern',108,84,48],[79,'The Great Descent Lift',7,-55,-585,115,'shaft',68,68,156],[80,'The Shattered Lightwell Landing',7,-175,-535,45,'cavern',118,102,46],
    [81,'The Outer Watch Command Hall',8,115,-665,-90,'hall',106,70,44],[82,'The Siege Passage',8,15,-665,-20,'road',126,30,30],[83,'The Bridge of the Expelled',8,-95,-665,50,'road',132,24,22],[84,'The Gate of the Lower Road',8,-205,-705,105,'hall',94,32,72]
  ];

  const nodes = rawNodes.map(([id,name,district,x,y,z,shape,width,depth,height]) => ({id,name,district,x,y,z,shape,width,depth,height}));
  const nodeById = new Map(nodes.map(node => [node.id,node]));
  const adjacency = {
    1:[2,31],2:[3,81,5],3:[4,6,9,12],4:[3,49],5:[2,7,17,36],6:[3,7,8,10],7:[5,6,19,50],8:[6,9,25],9:[3,8,13,61],10:[6,11,18,53],11:[10,17,22,49],12:[3,23,25,37],
    13:[9,14,16,43],14:[13,15,37,51],15:[14,16,20,47],16:[13,15,18,64],17:[5,11,18,52,60],18:[10,16,17,50],19:[7,20,34,57],20:[15,19,21,47],21:[20,22,29,65],22:[11,21,23,39],23:[12,22,24,25,27],24:[23,31,78],
    25:[8,12,23,26,37],26:[25,27,33,44],27:[23,26,28,45,72],28:[27,34,54,73],29:[21,30,31,33],30:[29,31,35],31:[1,24,29,30,32,40,50,58,65,78],32:[31,43],33:[26,29,34,70],34:[19,28,33,35,56],35:[30,34,36,62],36:[5,35,48,53,61],
    37:[12,14,25,38,40],38:[37,39,43,46],39:[22,38,40,44],40:[31,37,39,41,78],41:[40,42,43,65],42:[41,47,69,81],43:[13,32,38,41,44,48],44:[26,39,43,45],45:[27,44,46,73,80],46:[38,45,47,55],47:[15,20,42,46,48],48:[36,43,47,61,79],
    49:[4,11,50,51,52,53,57],50:[7,18,31,49,51,58],51:[14,49,50,52,57],52:[17,49,51,54,63],53:[10,36,49,54,60],54:[28,52,53,55,56],55:[46,54,56,66],56:[34,54,55,57,67],57:[19,49,51,56,58,63],58:[31,50,57,59,68],59:[58,60,64],60:[17,53,59,61,73],
    61:[9,36,48,60,62],62:[35,61,63,65],63:[52,57,62,64,68],64:[16,59,63,65,69],65:[21,31,41,62,64,66],66:[55,65,67,71],67:[56,66,68,72],68:[58,63,67,69,72],69:[42,64,68,70,81],70:[33,69,71,82],71:[66,70,72,80],72:[27,67,68,71],
    73:[28,45,60,74,77],74:[73,75,76,77],75:[74,76,79],76:[74,75,77,80],77:[73,74,76,78,79],78:[24,31,40,77,79],79:[48,75,77,78,80],80:[45,71,76,79,81],81:[2,42,69,80,82],82:[70,81,83],83:[82,84],84:[83]
  };

  const edgeKeys = new Set();
  const edges = [];
  Object.entries(adjacency).forEach(([from,targets]) => targets.forEach(to => {
    const a = Number(from);
    const key = a < to ? `${a}-${to}` : `${to}-${a}`;
    if (!edgeKeys.has(key) && nodeById.has(a) && nodeById.has(to)) { edgeKeys.add(key); edges.push([a,to]); }
  }));
  nodes.forEach(node => { node.connections = [...new Set(adjacency[node.id] || [])].filter(id => nodeById.has(id)); });

  const frame=document.getElementById('unfazun-source-frame');
  const chapterList=document.getElementById('unfazun-chapter-list');
  const roomJump=document.getElementById('unfazun-room-jump');
  const canvas=document.getElementById('unfazun-map-canvas');
  const wrap=document.getElementById('unfazun-map-wrap');
  const info=document.getElementById('unfazun-room-info');
  const status=document.getElementById('unfazun-map-status');
  const districtFilter=document.getElementById('unfazun-district-filter');
  const labelMode=document.getElementById('unfazun-label-mode');
  const search=document.getElementById('unfazun-map-search');
  const legend=document.getElementById('unfazun-map-legend');
  const context=canvas && canvas.getContext('2d');
  let sourceDocument=null,sourceTextNode=null,chapterPositions=[];

  function createNavigation(){
    chapters.forEach(([heading,label],index)=>{
      const button=document.createElement('button');button.type='button';button.className='unfazun-chapter-button';button.textContent=label;button.dataset.heading=heading;
      button.addEventListener('click',()=>{jumpToText(heading);chapterList.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));});
      if(index===0)button.classList.add('active');chapterList.appendChild(button);
    });
    roomJump.innerHTML='<option value="">Select a room…</option>';
    nodes.forEach(node=>{const option=document.createElement('option');option.value=String(node.id);option.textContent=`${node.id}. ${node.name}`;roomJump.appendChild(option);});
    roomJump.addEventListener('change',()=>{const id=Number(roomJump.value);if(id)selectNode(id,true);});
  }

  function prepareSourceFrame(){
    try{
      sourceDocument=frame.contentDocument;
      const sourcePre=sourceDocument && sourceDocument.querySelector('.static-module-text');
      sourceTextNode=sourcePre && sourcePre.firstChild;
      if(!sourceDocument||!sourcePre||!sourceTextNode)throw new Error('Preserved text was not found.');
      const style=sourceDocument.createElement('style');style.dataset.unfazunReaderPresentation='true';style.textContent='.site-header,.static-module-tabs,.static-module-note,.site-footer{display:none!important}html{scroll-behavior:smooth}body{background:#111318!important}.static-module-shell{width:auto!important;margin:0!important;padding:0!important}.static-module-card{border:0!important;border-radius:0!important;box-shadow:none!important;padding:28px!important;background:transparent!important}.static-module-text{font-size:1rem!important;line-height:1.68!important}';sourceDocument.head.appendChild(style);
      calculateChapterPositions();frame.contentWindow.addEventListener('scroll',updateActiveChapter,{passive:true});
      status.textContent=`${nodes.length} keyed rooms and ${edges.length} stated connections loaded. The prose remains served from the preserved static source.`;
    }catch(error){status.textContent=`The map loaded, but the preserved text frame could not be indexed: ${error.message}`;}
  }

  function rangeForText(term){if(!sourceTextNode)return null;const text=sourceTextNode.nodeValue||'';const index=text.indexOf(term);if(index<0)return null;const range=sourceDocument.createRange();range.setStart(sourceTextNode,index);range.setEnd(sourceTextNode,Math.min(index+term.length,text.length));return range;}
  function jumpToText(term){const range=rangeForText(term);if(!range)return false;const rect=range.getBoundingClientRect();frame.contentWindow.scrollTo({top:Math.max(0,frame.contentWindow.scrollY+rect.top-24),behavior:'smooth'});const selection=frame.contentWindow.getSelection();selection.removeAllRanges();selection.addRange(range);window.setTimeout(()=>selection.removeAllRanges(),1200);return true;}
  function calculateChapterPositions(){chapterPositions=chapters.map(([heading])=>{const range=rangeForText(heading);return range?{heading,top:frame.contentWindow.scrollY+range.getBoundingClientRect().top}:{heading,top:0};});}
  function updateActiveChapter(){if(!chapterPositions.length)return;const y=frame.contentWindow.scrollY+70;let active=chapterPositions[0].heading;chapterPositions.forEach(item=>{if(item.top<=y)active=item.heading;});chapterList.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.heading===active));}

  const state={yaw:-.72,pitch:-.4,zoom:.82,panX:0,panY:18,center:{x:0,y:-180,z:10},selected:3,hovered:null,district:'all',labels:'selected',dragging:false,pointerId:null,lastX:0,lastY:0,downX:0,downY:0,moved:false,screenNodes:[]};
  function visibleNodes(){return state.district==='all'?nodes:nodes.filter(node=>String(node.district)===state.district);}
  function resizeCanvas(){if(!canvas||!wrap||!context)return;const ratio=Math.min(window.devicePixelRatio||1,2);const rect=wrap.getBoundingClientRect();const width=Math.max(320,Math.round(rect.width)),height=Math.max(500,Math.round(rect.height));canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;context.setTransform(ratio,0,0,ratio,0,0);state.viewport={width,height};draw();}
  function rotatePoint(point){const x=point.x-state.center.x,y=point.y-state.center.y,z=point.z-state.center.z,cosY=Math.cos(state.yaw),sinY=Math.sin(state.yaw),x1=x*cosY-z*sinY,z1=x*sinY+z*cosY,cosX=Math.cos(state.pitch),sinX=Math.sin(state.pitch);return{x:x1,y:y*cosX-z1*sinX,z:y*sinX+z1*cosX};}
  function project(point){const rotated=rotatePoint(point),camera=1080,denominator=Math.max(180,camera-rotated.z),scale=state.zoom*760/denominator;return{x:state.viewport.width/2+state.panX+rotated.x*scale,y:state.viewport.height/2+state.panY-rotated.y*scale,z:rotated.z,scale};}
  function rgba(hex,alpha){const number=Number.parseInt(hex.replace('#',''),16);return`rgba(${(number>>16)&255},${(number>>8)&255},${number&255},${alpha})`;}
  function mix(hex,amount){const number=Number.parseInt(hex.replace('#',''),16);const channel=shift=>Math.max(0,Math.min(255,((number>>shift)&255)+amount));return`rgb(${channel(16)},${channel(8)},${channel(0)})`;}
  function drawPolygon(points,fill,stroke,width=1){if(!points.length)return;context.beginPath();context.moveTo(points[0].x,points[0].y);points.slice(1).forEach(point=>context.lineTo(point.x,point.y));context.closePath();if(fill){context.fillStyle=fill;context.fill();}if(stroke){context.strokeStyle=stroke;context.lineWidth=width;context.stroke();}}
  function prismGeometry(node,sides){const vertices=[],radiusX=node.width/2,radiusZ=node.depth/2,bottom=node.y-node.height/2,top=node.y+node.height/2;for(let layer=0;layer<2;layer+=1){const y=layer===0?bottom:top;for(let i=0;i<sides;i+=1){const angle=-Math.PI/2+(i/sides)*Math.PI*2;vertices.push({x:node.x+Math.cos(angle)*radiusX,y,z:node.z+Math.sin(angle)*radiusZ});}}const faces=[[...Array(sides).keys()],[...Array(sides).keys()].map(index=>index+sides).reverse()];for(let i=0;i<sides;i+=1){const next=(i+1)%sides;faces.push([i,next,next+sides,i+sides]);}return{vertices,faces};}
  function boxGeometry(node){const x0=node.x-node.width/2,x1=node.x+node.width/2,y0=node.y-node.height/2,y1=node.y+node.height/2,z0=node.z-node.depth/2,z1=node.z+node.depth/2;return{vertices:[{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x0,y:y0,z:z1},{x:x0,y:y1,z:z0},{x:x1,y:y1,z:z0},{x:x1,y:y1,z:z1},{x:x0,y:y1,z:z1}],faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]};}
  function geometryFor(node){if(node.shape==='cylinder'||node.shape==='shaft')return prismGeometry(node,12);if(node.shape==='cavern')return prismGeometry(node,8);return boxGeometry(node);}
  function drawDistrictPlates(visible){const grouped=new Map();visible.forEach(node=>{if(!grouped.has(node.district))grouped.set(node.district,[]);grouped.get(node.district).push(node);});grouped.forEach((group,districtId)=>{const minX=Math.min(...group.map(node=>node.x-node.width/2))-28,maxX=Math.max(...group.map(node=>node.x+node.width/2))+28,minZ=Math.min(...group.map(node=>node.z-node.depth/2))-28,maxZ=Math.max(...group.map(node=>node.z+node.depth/2))+28,y=districts[districtId].level-18;drawPolygon([project({x:minX,y,z:minZ}),project({x:maxX,y,z:minZ}),project({x:maxX,y,z:maxZ}),project({x:minX,y,z:maxZ})],rgba(districts[districtId].color,.045),rgba(districts[districtId].color,.2),1);const labelPoint=project({x:minX,y:y+4,z:minZ});context.fillStyle=rgba(districts[districtId].color,.72);context.font='600 11px system-ui, sans-serif';context.fillText(`${districtId} · ${districts[districtId].name}`,labelPoint.x+5,labelPoint.y-5);});}
  function drawEdges(visible){const visibleIds=new Set(visible.map(node=>node.id));edges.forEach(([aId,bId])=>{if(!visibleIds.has(aId)||!visibleIds.has(bId))return;const a=nodeById.get(aId),b=nodeById.get(bId),start=project(a),end=project(b),active=state.selected===aId||state.selected===bId;context.beginPath();context.moveTo(start.x,start.y);context.lineTo(end.x,end.y);context.strokeStyle=active?'rgba(244,210,150,.9)':(a.district!==b.district?'rgba(180,210,232,.32)':'rgba(180,190,205,.18)');context.lineWidth=active?2.4:1;context.setLineDash(a.district!==b.district?[5,4]:[]);context.stroke();});context.setLineDash([]);}
  function drawNode(node){const geometry=geometryFor(node),projectedVertices=geometry.vertices.map(project),faces=geometry.faces.map((face,index)=>({face,index,depth:face.reduce((sum,vertexIndex)=>sum+projectedVertices[vertexIndex].z,0)/face.length})).sort((a,b)=>a.depth-b.depth),base=districts[node.district].color,selected=state.selected===node.id,hovered=state.hovered===node.id;faces.forEach((entry,faceIndex)=>{const points=entry.face.map(vertexIndex=>projectedVertices[vertexIndex]),light=faceIndex===faces.length-1?20:(entry.index%3)*-9,fill=selected?rgba('#f4d296',.72):rgba(mix(base,light),hovered?.76:.58),stroke=selected?'#fff0c4':(hovered?'#ffffff':rgba(base,.82));drawPolygon(points,fill,stroke,selected?1.8:1);});const center=project(node),radius=Math.max(7,Math.min(22,Math.max(node.width,node.depth)*center.scale*.34));state.screenNodes.push({id:node.id,x:center.x,y:center.y,radius,depth:center.z});const showLabel=state.labels==='all'||state.labels==='numbers'||(state.labels==='selected'&&(selected||hovered));if(!showLabel)return;const label=state.labels==='all'?`${node.id}. ${node.name}`:String(node.id);context.font=selected?'700 12px system-ui, sans-serif':'600 11px system-ui, sans-serif';const width=context.measureText(label).width,lx=center.x-width/2-5,ly=center.y-radius-20;context.fillStyle='rgba(5,7,11,.86)';context.fillRect(lx,ly,width+10,17);context.strokeStyle=selected?'#f4d296':'rgba(255,255,255,.24)';context.strokeRect(lx,ly,width+10,17);context.fillStyle=selected?'#fff0c4':'#e9e3d7';context.fillText(label,lx+5,ly+12);}
  function draw(){if(!context||!state.viewport)return;context.clearRect(0,0,state.viewport.width,state.viewport.height);const visible=visibleNodes();state.screenNodes=[];drawDistrictPlates(visible);drawEdges(visible);[...visible].sort((a,b)=>project(a).z-project(b).z).forEach(drawNode);}
  function nearestNode(x,y){return[...state.screenNodes].sort((a,b)=>b.depth-a.depth).find(item=>Math.hypot(item.x-x,item.y-y)<=item.radius+8)||null;}
  function renderInfo(){const node=nodeById.get(state.selected);if(!node){info.innerHTML='<h3>No room selected</h3><p>Select a room in the map or chapter controls.</p>';return;}const connections=node.connections.map(id=>`${id}. ${nodeById.get(id).name}`).join(' · ');info.innerHTML=`<h3>${node.id}. ${node.name}</h3><p>Synthesized as a ${node.shape} from the room description and placed according to its section, vertical role, and stated routes.</p><div class="unfazun-room-meta"><div><strong>Section</strong>${node.district} · ${districts[node.district].name}</div><div><strong>Spatial form</strong>${node.shape}</div><div><strong>Model volume</strong>${node.width} × ${node.depth} × ${node.height}</div><div><strong>Connected routes</strong>${node.connections.length}</div></div><p><strong>Mapped connections:</strong> ${connections||'No numbered connection represented.'}</p><button id="unfazun-room-text-button" class="unfazun-room-action" type="button">Jump to room text</button>`;info.querySelector('#unfazun-room-text-button').addEventListener('click',()=>jumpToRoom(node.id));roomJump.value=String(node.id);}
  function jumpToRoom(id){const node=nodeById.get(id);if(node)jumpToText(`## ${node.id}. ${node.name}`);}
  function selectNode(id,jump=false){if(!nodeById.has(id))return;state.selected=id;renderInfo();draw();if(jump)jumpToRoom(id);}
  function centerSelected(){const node=nodeById.get(state.selected);if(!node)return;state.center={x:node.x,y:node.y,z:node.z};state.zoom=Math.max(state.zoom,1.25);state.panX=0;state.panY=0;draw();}
  function fitVisible(){const visible=visibleNodes();if(!visible.length)return;const average=visible.reduce((acc,node)=>({x:acc.x+node.x,y:acc.y+node.y,z:acc.z+node.z}),{x:0,y:0,z:0});average.x/=visible.length;average.y/=visible.length;average.z/=visible.length;state.center=average;const maxRange=Math.max(...visible.map(node=>Math.hypot(node.x-average.x,(node.y-average.y)*.8,node.z-average.z)+Math.max(node.width,node.depth,node.height)));state.zoom=Math.max(.38,Math.min(2.1,520/Math.max(260,maxRange)));state.panX=0;state.panY=0;draw();}
  function resetView(){state.yaw=-.72;state.pitch=-.4;state.zoom=.82;state.panX=0;state.panY=18;state.center={x:0,y:-180,z:10};state.district='all';districtFilter.value='all';draw();}

  function installMapControls(){
    Object.entries(districts).forEach(([id,district])=>{const option=document.createElement('option');option.value=id;option.textContent=`${id}. ${district.name}`;districtFilter.appendChild(option);const item=document.createElement('span');item.innerHTML=`<i style="--legend-color:${district.color}"></i>${id}. ${district.name}`;legend.appendChild(item);});
    districtFilter.addEventListener('change',()=>{state.district=districtFilter.value;if(state.district!=='all'){const first=visibleNodes()[0];if(first&&!visibleNodes().some(node=>node.id===state.selected))state.selected=first.id;}fitVisible();renderInfo();});
    labelMode.addEventListener('change',()=>{state.labels=labelMode.value;draw();});
    document.getElementById('unfazun-map-reset').addEventListener('click',resetView);document.getElementById('unfazun-map-fit').addEventListener('click',fitVisible);document.getElementById('unfazun-map-center').addEventListener('click',centerSelected);
    search.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();if(!query)return;const numeric=Number(query),match=Number.isInteger(numeric)&&nodeById.has(numeric)?nodeById.get(numeric):nodes.find(node=>node.name.toLowerCase().includes(query));if(!match)return;state.selected=match.id;if(state.district!=='all'&&String(match.district)!==state.district){state.district='all';districtFilter.value='all';}state.center={x:match.x,y:match.y,z:match.z};state.zoom=Math.max(state.zoom,1.18);renderInfo();draw();});
    canvas.addEventListener('pointerdown',event=>{state.dragging=true;state.pointerId=event.pointerId;state.lastX=state.downX=event.clientX;state.lastY=state.downY=event.clientY;state.moved=false;canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');});
    canvas.addEventListener('pointermove',event=>{const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;if(state.dragging&&event.pointerId===state.pointerId){const dx=event.clientX-state.lastX,dy=event.clientY-state.lastY;if(Math.hypot(event.clientX-state.downX,event.clientY-state.downY)>4)state.moved=true;state.yaw+=dx*.008;state.pitch=Math.max(-1.25,Math.min(.65,state.pitch+dy*.007));state.lastX=event.clientX;state.lastY=event.clientY;draw();return;}const next=(nearestNode(x,y)||{}).id||null;if(next!==state.hovered){state.hovered=next;draw();}});
    canvas.addEventListener('pointerup',event=>{if(event.pointerId!==state.pointerId)return;const rect=canvas.getBoundingClientRect(),hit=nearestNode(event.clientX-rect.left,event.clientY-rect.top);if(!state.moved&&hit)selectNode(hit.id,false);state.dragging=false;state.pointerId=null;canvas.classList.remove('dragging');canvas.releasePointerCapture(event.pointerId);});
    canvas.addEventListener('pointercancel',()=>{state.dragging=false;state.pointerId=null;canvas.classList.remove('dragging');});
    canvas.addEventListener('dblclick',event=>{const rect=canvas.getBoundingClientRect(),hit=nearestNode(event.clientX-rect.left,event.clientY-rect.top);if(hit)selectNode(hit.id,true);});
    canvas.addEventListener('wheel',event=>{event.preventDefault();state.zoom=Math.max(.32,Math.min(3.2,state.zoom*(event.deltaY>0?.9:1.1)));draw();},{passive:false});
  }

  createNavigation();installMapControls();renderInfo();frame.addEventListener('load',prepareSourceFrame);window.addEventListener('resize',resizeCanvas,{passive:true});resizeCanvas();
})();