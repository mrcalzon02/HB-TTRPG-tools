(() => {
  'use strict';

  const chapters = [
    ['# Unfazun, the Guildhall of a Thousand Roads', 'Introduction'],
    ['# Running the Guildhall', 'Running the Guildhall'],
    ['# District I: The Broken Crown', 'I · The Broken Crown'],
    ['# District II: The Civic Halls', 'II · The Civic Halls'],
    ['# District III: The Halls of Labor', 'III · The Halls of Labor'],
    ['# District IV: The Great Rail Nexus', 'IV · The Great Rail Nexus'],
    ['# District V: The Thousand Excavations', 'V · The Thousand Excavations'],
    ['# District VI: The War Beneath the Guildhall', 'VI · The War Beneath'],
    ['# District VII: The Sealed Road Below', 'VII · The Sealed Road'],
    ['# The Central Revelation', 'The Central Revelation'],
    ['# Possible Final States of Unfazun', 'Possible Final States']
  ];

  const districts = {
    1: { name: 'The Broken Crown', color: '#85b9cf', level: 280 },
    2: { name: 'The Civic Halls', color: '#d2a45d', level: 170 },
    3: { name: 'The Halls of Labor', color: '#9dbb7a', level: 40 },
    4: { name: 'The Great Rail Nexus', color: '#c98264', level: -110 },
    5: { name: 'The Thousand Excavations', color: '#7f91c8', level: -260 },
    6: { name: 'The War Beneath the Guildhall', color: '#b06f9c', level: -410 },
    7: { name: 'The Sealed Road Below', color: '#d0c5a5', level: -650 }
  };

  const rawNodes = [
    [1,'The Fallen Lightwell Landing',1,-180,280,-40,'cylinder',62,62,28,'A vast circular landing beneath the shattered Lightwell and its suspended stair.'],
    [2,'The Frozen Processional',1,-110,280,-20,'hall',84,28,20,'A broad ceremonial avenue buried under supernatural snow.'],
    [3,'The Hall of the Last Shift',1,-30,280,0,'hall',72,42,24,'A memorial hall lined with thousands of worker plaques.'],
    [4,'The Brass-Breath Gatehouse',1,50,280,0,'hall',58,30,30,'A monumental double gate with heated vents and bronze guardians.'],
    [5,'The Security Inspection Room',1,100,280,50,'room',42,32,20,'A lane-filled inspection chamber of stone tables and sealed evidence.'],
    [6,'The Civic Rotunda',1,120,280,-40,'cylinder',74,74,34,'The upper guildhall’s domed crossroads with eight monumental arches.'],
    [7,'The Broken Liftwell',1,-20,230,-100,'shaft',28,28,120,'A deep industrial shaft with broken platforms, chains, and maintenance stairs.'],
    [8,'The Watch Barracks',1,-20,280,80,'room',48,38,22,'A bunk hall arranged around a petrified central stove.'],
    [9,'The Chapel of the Banked Ember',1,-120,280,80,'room',38,34,26,'A compact warming chapel centered on a black iron brazier.'],
    [10,'The Confiscated Property Vault',1,170,280,90,'room',46,38,24,'A secure cage vault holding seized goods and funerary objects.'],

    [11,'The Petitioners’ Gallery',2,-100,170,40,'hall',76,28,22,'A long waiting gallery divided by the grievances once heard there.'],
    [12,'The Grand Ledger Hall',2,50,170,-80,'hall',66,54,58,'A three-story archive of shelves, balconies, and rotating cabinets.'],
    [13,'The Hall of Measures',2,130,170,-80,'hall',62,40,24,'A measured forest of scales, rods, standards, and calibrated vessels.'],
    [14,'The Council Stair',2,110,170,10,'cylinder',58,58,62,'Twin sweeping stairs circle the statue of Unfazun’s founder.'],
    [15,'The Chamber of Clan Delegates',2,160,170,60,'hall',76,52,28,'A descending semicircular chamber of clan desks and a speaking platform.'],
    [16,'The Council of Hammers',2,210,170,0,'cylinder',54,54,26,'Nine executive chairs surround a circular map table.'],
    [17,'The Hall of Arbitration',2,40,170,80,'cylinder',62,62,28,'A circular courtroom marked by geometric truth-speaking zones.'],
    [18,'The Speaker’s Archive',2,-20,170,-130,'hall',56,34,36,'A censored archive with a concealed passage of original records.'],
    [19,'The Treasury Antechamber',2,190,170,-100,'hall',62,30,22,'Tax and payment counters channel traffic toward the treasury.'],
    [20,'The Treasury of Common Weight',2,260,170,-50,'room',68,54,32,'A broad civic reserve vault built for industrial wealth rather than coin.'],
    [21,'The Dead Letter Office',2,20,170,140,'hall',64,38,34,'Thousands of undelivered messages fill narrow pigeonholes and dispatch ways.'],
    [22,'The Emergency Council Bunker',2,0,125,0,'room',58,48,26,'A buried command bunker of war maps and final emergency plans.'],

    [23,'The Labor Registry',3,0,40,-20,'hall',76,58,30,'An immense registration chamber serving hundreds of professions.'],
    [24,'The Hiring Hall',3,-100,40,-50,'hall',72,48,24,'A bannered labor market divided by colored employer mosaics.'],
    [25,'The Shift Assignment Gallery',3,80,40,-60,'hall',82,34,28,'A long mechanical assignment board of moving bronze plates.'],
    [26,'The Bellmaster’s Chamber',3,140,40,-20,'tower',34,34,72,'A vertical knot of chains, gears, hammers, bells, and speaking tubes.'],
    [27,'The Tool Issue Hall',3,-160,40,-30,'hall',82,42,28,'An equipment hall of racks, issue counters, and heavy specialist tools.'],
    [28,'The Lamp House',3,-220,40,-80,'room',44,40,26,'A light-absorbing chamber centered on the sealed First Lamp of Unfazun.'],
    [29,'The Guild Bathhouse',3,-40,40,100,'cavern',72,62,24,'A broad mineral bath cavern beneath a painted summer sky.'],
    [30,'The Guild Canteen',3,-100,40,50,'hall',92,50,22,'A communal dining hall of long tables and carved ration counters.'],
    [31,'The Kitchens of Endless Broth',3,-170,40,90,'hall',70,46,28,'Industrial kitchens dominated by enormous enchanted cauldrons.'],
    [32,'The Dormitory Ring',3,50,40,90,'cylinder',90,90,26,'A circular corridor enclosing dozens of communal sleeping chambers.'],
    [33,'The Hall of Joined Hands',3,120,40,110,'hall',72,48,28,'A workers’ assembly hall split through its monumental relief.'],
    [34,'The Infirmary of Crushed Stone',3,-10,40,160,'hall',78,52,26,'A long surgical infirmary arranged for mining catastrophes.'],
    [35,'The Disciplinary Cells',3,190,40,150,'hall',64,34,30,'A narrow detention block of labeled stone cells.'],
    [36,'The Mortuary Lift',3,70,-10,210,'shaft',30,30,112,'A narrow freight lift descending toward release, retention, and special assignment.'],

    [37,'The Grand Switchyard',4,0,-110,0,'cavern',128,104,30,'A city-sized rail cavern where dozens of lines cross, merge, rise, and descend.'],
    [38,'The Weighing Hall',4,-120,-110,-20,'hall',86,42,26,'A rail hall with colossal cart scales set directly into the tracks.'],
    [39,'The Sample House',4,-180,-110,-80,'room',54,46,30,'A cabinet house storing samples from every recorded ore shipment.'],
    [40,'The Assay Furnace',4,-100,-110,-130,'room',48,44,42,'A hot testing furnace and destruction chamber for magical materials.'],
    [41,'The Dispatch Tower',4,70,-70,-40,'tower',34,34,108,'A narrow control tower overlooking every major track in the switchyard.'],
    [42,'The Railmaster’s Office',4,130,-110,-80,'room',44,36,24,'A track-chart office hiding maps of illegal private rail lines.'],
    [43,'The Turntable Pit',4,100,-110,80,'cylinder',82,82,36,'A great rotating platform over a deep maintenance machinery pit.'],
    [44,'The Cartwright Shops',4,180,-110,100,'hall',84,58,34,'Heavy work bays for carts, engines, cranes, and an armored locomotive.'],
    [45,'The Powder Magazine',4,150,-110,180,'hall',68,46,30,'Separated stone magazines packed with blasting charges and a frozen fuse.'],
    [46,'The Ventilation Crown',4,-30,-70,-180,'cylinder',78,78,104,'Concentric brass rings and fan blades surrounding a vertical air shaft.'],
    [47,'The Eastern Dead Line',4,-220,-110,40,'road',104,24,18,'A long frozen rail approach leading toward the ruined Arcane University.'],
    [48,'The Ore Elevator',4,-90,-160,80,'shaft',54,54,126,'A colossal platform and counterweight shaft for entire ore trains.'],
    [49,'The Smuggler’s Line',4,220,-110,-20,'road',112,20,18,'A narrow concealed railway built for fast private cargo.'],
    [50,'The Refugee Train',4,-130,-110,170,'train',118,26,26,'A moving spectral train of sealed passenger and mail cars.'],

    [51,'The Thousand-Mouth Gallery',5,0,-260,0,'cavern',132,106,42,'A natural cavern pierced by hundreds of mine mouths at every height.'],
    [52,'The Surveyor’s Maze',5,-100,-260,-70,'room',78,68,28,'A reconfiguring training maze whose walls model changing mines.'],
    [53,'The Mapmakers’ Chamber',5,-180,-260,-100,'hall',66,48,30,'A crystal-map workshop of three-dimensional tunnel models.'],
    [54,'The Echo Drill Hall',5,-230,-260,-20,'hall',82,38,28,'A training hall of resonant practice walls and hidden hollows.'],
    [55,'The Heart-Ice Vein',5,-250,-260,80,'road',94,26,42,'A pulsing blue mineral vein containing centuries of displaced supernatural cold.'],
    [56,'The Sump Chasm',5,20,-320,160,'shaft',46,46,150,'A bottomless frozen drainage chasm containing a vertical river of ice.'],
    [57,'The Waterworks',5,-40,-260,130,'hall',74,56,34,'Pumps, cisterns, filters, and pressure tanks serving the guildhall.'],
    [58,'The Frozen Fungus Cisterns',5,-120,-260,160,'cavern',84,72,26,'Terraced agricultural caverns of dormant mushrooms and medicinal fungi.'],
    [59,'The Deep Animal Stables',5,-210,-260,160,'hall',86,54,30,'Broad stalls for subterranean beasts and an enormous chained cave ox.'],
    [60,'The Rescue Station',5,80,-260,70,'hall',70,52,28,'An emergency station stocked for cave-ins and unresolved rescue calls.'],
    [61,'The Cave-In Memorial',5,160,-260,110,'cavern',60,54,24,'A low solemn cavern covered in the names of unrecovered workers.'],
    [62,'The Unauthorized Excavation',5,140,-260,-60,'road',88,28,28,'An illegal mine following god-blinding black stone toward an older doorway.'],
    [63,'The Bone Seam',5,220,-260,-120,'road',86,24,32,'A pale excavated seam of compacted bones assembling into a door.'],

    [64,'The Alarm Gallery',6,-150,-410,80,'hall',82,32,32,'A bell-lined alarm corridor ending at a breached loyalist barricade.'],
    [65,'The Hall of Severed Providence',6,80,-410,-100,'hall',86,42,36,'A split temple corridor filled with kneeling, powerless clerics.'],
    [66,'The Loyalist Barricades',6,-40,-410,20,'road',92,34,26,'Successive defensive lines facing contradictory directions.'],
    [67,'The Clerics’ Refuge',6,130,-410,-20,'room',56,48,30,'A theological refuge whose walls preserve competing explanations of divine judgment.'],
    [68,'The Procession of the Unresting',6,120,-410,70,'cylinder',76,76,26,'A circular corridor carrying two endless lines of assigned dead.'],
    [69,'The Embalming Galleries',6,180,-410,130,'hall',96,54,30,'Funerary preparation rooms widening into an industrial corpse-processing line.'],
    [70,'The Archive of Consent',6,250,-410,80,'hall',78,54,42,'A vast clay-tablet archive recording the limits and forgeries of posthumous consent.'],
    [71,'The Soul-Chain Foundry',6,260,-410,170,'hall',88,60,46,'A foundry of glowing script chains forged from duty, blood, love, and shame.'],
    [72,'The Bone Marshalling Yard',6,100,-410,190,'cavern',112,88,34,'A military assembly cavern of sorted bones, armor racks, and command podiums.'],
    [73,'The Frozen Shrine of Moraden',6,10,-410,-100,'cylinder',62,62,38,'An ice-bound shrine depicting Moraden at rest after creation.'],
    [74,'The Civic Ward Engine',6,-70,-410,-150,'room',70,58,54,'A miniature-city engine built around the crystal source of the warming wards.'],
    [75,'Moraden’s Spear Chamber',6,-20,-410,-20,'hall',104,48,42,'A colossal sanctified drilling weapon aimed toward the royal sepulchers.'],
    [76,'The Royal Recovery Depot',6,70,-410,250,'hall',116,72,36,'A militarized rail depot holding the armored royal recovery train.'],
    [77,'The Necromancer Command Crypt',6,220,-410,230,'cylinder',72,72,34,'A command crypt centered on a black table imprisoning its leaders’ spirits.'],
    [78,'The Hall of Names',6,300,-410,160,'cylinder',86,86,48,'Rotating stone rings carry the true names of kings, heroes, and monsters.'],

    [79,'The Sealed Command Descent',7,100,-560,100,'shaft',58,58,120,'Three parallel authority stairs descend through one deep command shaft.'],
    [80,'The Three-Seal Gate',7,130,-650,80,'hall',76,30,44,'A monumental gate requiring civic, guild, and ancestral agreement.'],
    [81,'The Road of Kneeling Kings',7,160,-740,40,'road',128,28,28,'A long descending royal road lined by colossal kneeling king statues.'],
    [82,'The Royal Recovery Terminus',7,200,-830,0,'cavern',116,82,42,'A funerary railway terminus of golden platforms and sleeping royal names.']
  ];

  const nodes = rawNodes.map(([id,name,district,x,y,z,shape,width,depth,height,note]) => ({
    id,name,district,x,y,z,shape,width,depth,height,note
  }));
  const nodeById = new Map(nodes.map(node => [node.id, node]));

  const adjacency = {
    1:[2,7],2:[1,3,9],3:[2,4,8,11],4:[3,5,6],5:[4,8,10],6:[4,7,12,14,22,23],7:[1,6,37],8:[3,5,64],9:[2,11,29,46,73,74],10:[5,21],
    11:[3,6,9,17],12:[6,13,18,23],13:[12,19,40],14:[6,15,16,22],15:[14,17,30],16:[14,20,22],17:[11,15,35,66],18:[12,21,65],19:[13,20],20:[16,19,48,49],21:[10,18,19,36,70],22:[6,14,64,79],
    23:[6,12,24,25],24:[23,27,30],25:[23,26,32,51],26:[25,41,46,64],27:[24,28,44],28:[27,45,51],29:[9,30,32,34,46,57],30:[15,24,29,31],31:[30,58],32:[25,29,33,34],33:[32,35,61],34:[29,32,36,60],35:[17,33],36:[21,34,69,77],
    37:[7,38,41,43,47,50],38:[37,39,48],39:[38,40,53],40:[13,39,46],41:[26,37,42],42:[41,49],43:[37,44,45,46],44:[27,43],45:[28,43],46:[9,26,29,40,43,55,71,74],47:[37,50],48:[20,38,51],49:[20,42,62],50:[37,47],
    51:[25,28,48,52,60],52:[51,53,62],53:[39,52,54],54:[53,55,59],55:[46,54,73],56:[57,60],57:[29,56,58],58:[31,57,59],59:[54,58],60:[34,51,56,61],61:[33,60,62],62:[49,52,61,63,81],63:[62,65,69],
    64:[8,22,26,66],65:[18,63,66,67,68],66:[17,64,65,75],67:[65,73],68:[65,69,72],69:[36,63,68,70,71],70:[21,69,78],71:[46,69,72,77],72:[68,71,76],73:[9,55,67,75],74:[9,46,75,79],75:[66,73,74,76],76:[72,75,77,81,82],77:[36,71,76,78,79],78:[70,77,80],
    79:[22,74,77,80],80:[78,79,81],81:[62,76,80,82],82:[76,81]
  };

  const edgeKeys = new Set();
  const edges = [];
  Object.entries(adjacency).forEach(([from, targets]) => {
    targets.forEach(to => {
      const a = Number(from);
      const key = a < to ? `${a}-${to}` : `${to}-${a}`;
      if (!edgeKeys.has(key) && nodeById.has(a) && nodeById.has(to)) {
        edgeKeys.add(key);
        edges.push([a, to]);
      }
    });
  });

  nodes.forEach(node => {
    node.connections = [...new Set(adjacency[node.id] || [])].filter(id => nodeById.has(id));
  });

  const frame = document.getElementById('unfazun-source-frame');
  const chapterList = document.getElementById('unfazun-chapter-list');
  const roomJump = document.getElementById('unfazun-room-jump');
  const canvas = document.getElementById('unfazun-map-canvas');
  const wrap = document.getElementById('unfazun-map-wrap');
  const info = document.getElementById('unfazun-room-info');
  const status = document.getElementById('unfazun-map-status');
  const districtFilter = document.getElementById('unfazun-district-filter');
  const labelMode = document.getElementById('unfazun-label-mode');
  const search = document.getElementById('unfazun-map-search');
  const legend = document.getElementById('unfazun-map-legend');
  const context = canvas?.getContext('2d');

  let sourceDocument = null;
  let sourcePre = null;
  let sourceTextNode = null;
  let chapterPositions = [];

  function createNavigation() {
    chapters.forEach(([heading, label], index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'unfazun-chapter-button';
      button.textContent = label;
      button.dataset.heading = heading;
      button.addEventListener('click', () => {
        jumpToText(heading);
        chapterList.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      });
      if (index === 0) button.classList.add('active');
      chapterList.appendChild(button);
    });

    roomJump.innerHTML = '<option value="">Select a room…</option>';
    nodes.forEach(node => {
      const option = document.createElement('option');
      option.value = String(node.id);
      option.textContent = `${node.id}. ${node.name}`;
      roomJump.appendChild(option);
    });
    roomJump.addEventListener('change', () => {
      const id = Number(roomJump.value);
      if (!id) return;
      selectNode(id, true);
    });
  }

  function prepareSourceFrame() {
    try {
      sourceDocument = frame.contentDocument;
      sourcePre = sourceDocument?.querySelector('.static-module-text');
      sourceTextNode = sourcePre?.firstChild || null;
      if (!sourceDocument || !sourcePre || !sourceTextNode) throw new Error('Preserved text was not found.');

      const style = sourceDocument.createElement('style');
      style.dataset.unfazunReaderPresentation = 'true';
      style.textContent = `
        .site-header,.static-module-tabs,.static-module-note,.site-footer{display:none!important}
        html{scroll-behavior:smooth}
        body{background:#111318!important}
        .static-module-shell{width:auto!important;margin:0!important;padding:0!important}
        .static-module-card{border:0!important;border-radius:0!important;box-shadow:none!important;padding:28px!important;background:transparent!important}
        .static-module-text{font-size:1rem!important;line-height:1.68!important}
      `;
      sourceDocument.head.appendChild(style);
      calculateChapterPositions();
      frame.contentWindow.addEventListener('scroll', updateActiveChapter, { passive: true });
      status.textContent = `${nodes.length} keyed rooms and ${edges.length} interpreted connections loaded. The prose is still served from the preserved static source.`;
    } catch (error) {
      status.textContent = `The map loaded, but the preserved text frame could not be indexed: ${error.message}`;
    }
  }

  function rangeForText(term) {
    if (!sourceTextNode) return null;
    const text = sourceTextNode.nodeValue || '';
    const index = text.indexOf(term);
    if (index < 0) return null;
    const range = sourceDocument.createRange();
    range.setStart(sourceTextNode, index);
    range.setEnd(sourceTextNode, Math.min(index + term.length, text.length));
    return range;
  }

  function jumpToText(term) {
    const range = rangeForText(term);
    if (!range) return false;
    const rect = range.getBoundingClientRect();
    const target = frame.contentWindow.scrollY + rect.top - 24;
    frame.contentWindow.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    const selection = frame.contentWindow.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    window.setTimeout(() => selection.removeAllRanges(), 1200);
    return true;
  }

  function calculateChapterPositions() {
    chapterPositions = chapters.map(([heading]) => {
      const range = rangeForText(heading);
      if (!range) return { heading, top: 0 };
      return { heading, top: frame.contentWindow.scrollY + range.getBoundingClientRect().top };
    });
  }

  function updateActiveChapter() {
    if (!chapterPositions.length) return;
    const y = frame.contentWindow.scrollY + 70;
    let active = chapterPositions[0]?.heading;
    chapterPositions.forEach(item => {
      if (item.top <= y) active = item.heading;
    });
    chapterList.querySelectorAll('button').forEach(button => {
      button.classList.toggle('active', button.dataset.heading === active);
    });
  }

  const state = {
    yaw: -0.68,
    pitch: -0.42,
    zoom: 0.94,
    panX: 0,
    panY: 18,
    center: { x: 10, y: -270, z: 30 },
    selected: 6,
    hovered: null,
    district: 'all',
    labels: 'selected',
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    downX: 0,
    downY: 0,
    moved: false,
    screenNodes: []
  };

  function visibleNodes() {
    if (state.district === 'all') return nodes;
    return nodes.filter(node => String(node.district) === state.district);
  }

  function resizeCanvas() {
    if (!canvas || !wrap || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(500, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.viewport = { width, height, ratio };
    draw();
  }

  function rotatePoint(point) {
    const x = point.x - state.center.x;
    const y = point.y - state.center.y;
    const z = point.z - state.center.z;
    const cosY = Math.cos(state.yaw);
    const sinY = Math.sin(state.yaw);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const cosX = Math.cos(state.pitch);
    const sinX = Math.sin(state.pitch);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    return { x: x1, y: y2, z: z2 };
  }

  function project(point) {
    const rotated = rotatePoint(point);
    const camera = 1080;
    const denominator = Math.max(180, camera - rotated.z);
    const scale = state.zoom * 760 / denominator;
    return {
      x: state.viewport.width / 2 + state.panX + rotated.x * scale,
      y: state.viewport.height / 2 + state.panY - rotated.y * scale,
      z: rotated.z,
      scale
    };
  }

  function rgba(hex, alpha) {
    const value = hex.replace('#', '');
    const number = Number.parseInt(value, 16);
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function mix(hex, amount) {
    const value = hex.replace('#', '');
    const number = Number.parseInt(value, 16);
    const r = Math.max(0, Math.min(255, ((number >> 16) & 255) + amount));
    const g = Math.max(0, Math.min(255, ((number >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (number & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function drawPolygon(points, fill, stroke, width = 1) {
    if (!points.length) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => context.lineTo(point.x, point.y));
    context.closePath();
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = width;
      context.stroke();
    }
  }

  function prismGeometry(node, sides) {
    const vertices = [];
    const radiusX = node.width / 2;
    const radiusZ = node.depth / 2;
    const bottom = node.y - node.height / 2;
    const top = node.y + node.height / 2;
    for (let layer = 0; layer < 2; layer += 1) {
      const y = layer === 0 ? bottom : top;
      for (let i = 0; i < sides; i += 1) {
        const angle = -Math.PI / 2 + (i / sides) * Math.PI * 2;
        vertices.push({ x: node.x + Math.cos(angle) * radiusX, y, z: node.z + Math.sin(angle) * radiusZ });
      }
    }
    const faces = [];
    faces.push([...Array(sides).keys()]);
    faces.push([...Array(sides).keys()].map(index => index + sides).reverse());
    for (let i = 0; i < sides; i += 1) {
      const next = (i + 1) % sides;
      faces.push([i, next, next + sides, i + sides]);
    }
    return { vertices, faces };
  }

  function boxGeometry(node) {
    const x0 = node.x - node.width / 2;
    const x1 = node.x + node.width / 2;
    const y0 = node.y - node.height / 2;
    const y1 = node.y + node.height / 2;
    const z0 = node.z - node.depth / 2;
    const z1 = node.z + node.depth / 2;
    return {
      vertices: [
        {x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x0,y:y0,z:z1},
        {x:x0,y:y1,z:z0},{x:x1,y:y1,z:z0},{x:x1,y:y1,z:z1},{x:x0,y:y1,z:z1}
      ],
      faces: [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]
    };
  }

  function geometryFor(node) {
    if (node.shape === 'cylinder') return prismGeometry(node, 12);
    if (node.shape === 'cavern') return prismGeometry(node, 8);
    return boxGeometry(node);
  }

  function drawDistrictPlates(visible) {
    const grouped = new Map();
    visible.forEach(node => {
      if (!grouped.has(node.district)) grouped.set(node.district, []);
      grouped.get(node.district).push(node);
    });
    grouped.forEach((group, districtId) => {
      const minX = Math.min(...group.map(node => node.x - node.width / 2)) - 28;
      const maxX = Math.max(...group.map(node => node.x + node.width / 2)) + 28;
      const minZ = Math.min(...group.map(node => node.z - node.depth / 2)) - 28;
      const maxZ = Math.max(...group.map(node => node.z + node.depth / 2)) + 28;
      const y = districts[districtId].level - 16;
      const projected = [
        project({x:minX,y,z:minZ}),project({x:maxX,y,z:minZ}),project({x:maxX,y,z:maxZ}),project({x:minX,y,z:maxZ})
      ];
      drawPolygon(projected, rgba(districts[districtId].color, .045), rgba(districts[districtId].color, .2), 1);
      const labelPoint = project({x:minX,y:y+4,z:minZ});
      context.fillStyle = rgba(districts[districtId].color, .72);
      context.font = '600 11px system-ui, sans-serif';
      context.fillText(`District ${districtId} · ${districts[districtId].name}`, labelPoint.x + 5, labelPoint.y - 5);
    });
  }

  function drawEdges(visible) {
    const visibleIds = new Set(visible.map(node => node.id));
    edges.forEach(([aId,bId]) => {
      if (!visibleIds.has(aId) || !visibleIds.has(bId)) return;
      const a = nodeById.get(aId);
      const b = nodeById.get(bId);
      const start = project(a);
      const end = project(b);
      const active = state.selected === aId || state.selected === bId;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.strokeStyle = active ? 'rgba(244,210,150,.9)' : (a.district !== b.district ? 'rgba(180,210,232,.32)' : 'rgba(180,190,205,.18)');
      context.lineWidth = active ? 2.4 : 1;
      context.setLineDash(a.district !== b.district ? [5,4] : []);
      context.stroke();
    });
    context.setLineDash([]);
  }

  function drawNode(node) {
    const geometry = geometryFor(node);
    const projectedVertices = geometry.vertices.map(project);
    const faces = geometry.faces.map((face, index) => ({
      face,
      index,
      depth: face.reduce((sum, vertexIndex) => sum + projectedVertices[vertexIndex].z, 0) / face.length
    })).sort((a,b) => a.depth - b.depth);
    const base = districts[node.district].color;
    const selected = state.selected === node.id;
    const hovered = state.hovered === node.id;

    faces.forEach((entry, faceIndex) => {
      const points = entry.face.map(vertexIndex => projectedVertices[vertexIndex]);
      const light = faceIndex === faces.length - 1 ? 20 : (entry.index % 3) * -9;
      const fill = selected ? rgba('#f4d296', .72) : rgba(mix(base, light), hovered ? .76 : .58);
      const stroke = selected ? '#fff0c4' : (hovered ? '#ffffff' : rgba(base, .82));
      drawPolygon(points, fill, stroke, selected ? 1.8 : 1);
    });

    const center = project(node);
    const radius = Math.max(7, Math.min(22, Math.max(node.width,node.depth) * center.scale * .34));
    state.screenNodes.push({ id: node.id, x: center.x, y: center.y, radius, depth: center.z });

    const showLabel = state.labels === 'all' || state.labels === 'numbers' ||
      (state.labels === 'selected' && (selected || hovered));
    if (!showLabel) return;
    const label = state.labels === 'all' ? `${node.id}. ${node.name}` : String(node.id);
    context.font = selected ? '700 12px system-ui, sans-serif' : '600 11px system-ui, sans-serif';
    const width = context.measureText(label).width;
    const lx = center.x - width / 2 - 5;
    const ly = center.y - radius - 20;
    context.fillStyle = 'rgba(5,7,11,.86)';
    context.fillRect(lx, ly, width + 10, 17);
    context.strokeStyle = selected ? '#f4d296' : 'rgba(255,255,255,.24)';
    context.strokeRect(lx, ly, width + 10, 17);
    context.fillStyle = selected ? '#fff0c4' : '#e9e3d7';
    context.fillText(label, lx + 5, ly + 12);
  }

  function draw() {
    if (!context || !state.viewport) return;
    context.clearRect(0, 0, state.viewport.width, state.viewport.height);
    const visible = visibleNodes();
    state.screenNodes = [];
    drawDistrictPlates(visible);
    drawEdges(visible);
    [...visible]
      .sort((a,b) => project(a).z - project(b).z)
      .forEach(drawNode);
  }

  function nearestNode(x, y) {
    return [...state.screenNodes]
      .sort((a,b) => b.depth - a.depth)
      .find(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 8) || null;
  }

  function renderInfo() {
    const node = nodeById.get(state.selected);
    if (!node) {
      info.innerHTML = '<h3>No room selected</h3><p>Select a room in the map or chapter controls.</p>';
      return;
    }
    const connections = node.connections.map(id => `${id}. ${nodeById.get(id).name}`).join(' · ');
    info.innerHTML = `
      <h3>${node.id}. ${node.name}</h3>
      <p>${node.note}</p>
      <div class="unfazun-room-meta">
        <div><strong>District</strong>${node.district} · ${districts[node.district].name}</div>
        <div><strong>Spatial form</strong>${node.shape}</div>
        <div><strong>Model footprint</strong>${node.width} × ${node.depth}</div>
        <div><strong>Connected routes</strong>${node.connections.length}</div>
      </div>
      <p><strong>Mapped connections:</strong> ${connections || 'No numbered connection represented.'}</p>
      <button id="unfazun-room-text-button" class="unfazun-room-action" type="button">Jump to room text</button>
    `;
    info.querySelector('#unfazun-room-text-button')?.addEventListener('click', () => jumpToRoom(node.id));
    roomJump.value = String(node.id);
  }

  function jumpToRoom(id) {
    const node = nodeById.get(id);
    if (!node) return;
    jumpToText(`## ${node.id}. ${node.name}`);
  }

  function selectNode(id, jump = false) {
    const node = nodeById.get(id);
    if (!node) return;
    state.selected = id;
    renderInfo();
    draw();
    if (jump) jumpToRoom(id);
  }

  function centerSelected() {
    const node = nodeById.get(state.selected);
    if (!node) return;
    state.center = { x: node.x, y: node.y, z: node.z };
    state.zoom = Math.max(state.zoom, 1.25);
    state.panX = 0;
    state.panY = 0;
    draw();
  }

  function fitVisible() {
    const visible = visibleNodes();
    if (!visible.length) return;
    const average = visible.reduce((acc,node) => ({x:acc.x+node.x,y:acc.y+node.y,z:acc.z+node.z}), {x:0,y:0,z:0});
    average.x /= visible.length;
    average.y /= visible.length;
    average.z /= visible.length;
    state.center = average;
    const maxRange = Math.max(...visible.map(node => Math.hypot(node.x-average.x, (node.y-average.y)*.8, node.z-average.z) + Math.max(node.width,node.depth,node.height)));
    state.zoom = Math.max(.42, Math.min(2.1, 520 / Math.max(260, maxRange)));
    state.panX = 0;
    state.panY = 0;
    draw();
  }

  function resetView() {
    state.yaw = -0.68;
    state.pitch = -0.42;
    state.zoom = 0.94;
    state.panX = 0;
    state.panY = 18;
    state.center = { x: 10, y: -270, z: 30 };
    state.district = 'all';
    districtFilter.value = 'all';
    draw();
  }

  function installMapControls() {
    Object.entries(districts).forEach(([id,district]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${id}. ${district.name}`;
      districtFilter.appendChild(option);

      const item = document.createElement('span');
      item.innerHTML = `<i style="--legend-color:${district.color}"></i>${id}. ${district.name}`;
      legend.appendChild(item);
    });

    districtFilter.addEventListener('change', () => {
      state.district = districtFilter.value;
      if (state.district !== 'all') {
        const first = visibleNodes()[0];
        if (first && !visibleNodes().some(node => node.id === state.selected)) state.selected = first.id;
      }
      fitVisible();
      renderInfo();
    });

    labelMode.addEventListener('change', () => {
      state.labels = labelMode.value;
      draw();
    });

    document.getElementById('unfazun-map-reset')?.addEventListener('click', resetView);
    document.getElementById('unfazun-map-fit')?.addEventListener('click', fitVisible);
    document.getElementById('unfazun-map-center')?.addEventListener('click', centerSelected);

    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      if (!query) return;
      const numeric = Number(query);
      const match = Number.isInteger(numeric) && nodeById.has(numeric)
        ? nodeById.get(numeric)
        : nodes.find(node => node.name.toLowerCase().includes(query));
      if (!match) return;
      state.selected = match.id;
      if (state.district !== 'all' && String(match.district) !== state.district) {
        state.district = 'all';
        districtFilter.value = 'all';
      }
      state.center = {x:match.x,y:match.y,z:match.z};
      state.zoom = Math.max(state.zoom, 1.18);
      renderInfo();
      draw();
    });

    canvas.addEventListener('pointerdown', event => {
      state.dragging = true;
      state.pointerId = event.pointerId;
      state.lastX = state.downX = event.clientX;
      state.lastY = state.downY = event.clientY;
      state.moved = false;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('dragging');
    });

    canvas.addEventListener('pointermove', event => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (state.dragging && event.pointerId === state.pointerId) {
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        if (Math.hypot(event.clientX-state.downX,event.clientY-state.downY) > 4) state.moved = true;
        state.yaw += dx * .008;
        state.pitch = Math.max(-1.25, Math.min(.65, state.pitch + dy * .007));
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        draw();
        return;
      }
      const hit = nearestNode(x,y);
      const next = hit?.id || null;
      if (next !== state.hovered) {
        state.hovered = next;
        draw();
      }
    });

    canvas.addEventListener('pointerup', event => {
      if (event.pointerId !== state.pointerId) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (!state.moved) {
        const hit = nearestNode(x,y);
        if (hit) selectNode(hit.id, false);
      }
      state.dragging = false;
      state.pointerId = null;
      canvas.classList.remove('dragging');
      canvas.releasePointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointercancel', () => {
      state.dragging = false;
      state.pointerId = null;
      canvas.classList.remove('dragging');
    });

    canvas.addEventListener('dblclick', event => {
      const rect = canvas.getBoundingClientRect();
      const hit = nearestNode(event.clientX - rect.left, event.clientY - rect.top);
      if (hit) selectNode(hit.id, true);
    });

    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const multiplier = event.deltaY > 0 ? .9 : 1.1;
      state.zoom = Math.max(.35, Math.min(3.2, state.zoom * multiplier));
      draw();
    }, { passive: false });
  }

  createNavigation();
  installMapControls();
  renderInfo();
  frame.addEventListener('load', prepareSourceFrame);
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();
})();
