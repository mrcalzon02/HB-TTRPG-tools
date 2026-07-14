(() => {
  'use strict';

  const PRESET = 'EXAMPLE';
  const MERGE_RADIUS_AU = 1000;
  const EPSILON_INDI_SUBSTELLAR_SOLAR = 0.778 + (66.92 + 53.25) / 1047.3486;
  const EPSILON_INDI_PLANET_SOLAR = (7.6 * 317.82838) / 332946.0487;

  function waitForModel(attempt = 0) {
    const base = globalThis.BlacklightExoLensingModel;
    if (!base || !base.exampleNeighborhoodCalibrated) {
      if (attempt < 360) requestAnimationFrame(() => waitForModel(attempt + 1));
      return;
    }
    if (base.examplePhysics2026) return;

    const originalBuildScene = base.buildScene;
    function buildScene(entries, clusterSeed, options = {}) {
      const scene = originalBuildScene(entries, clusterSeed, options);
      if (String(clusterSeed || '').trim().toUpperCase() !== PRESET) return scene;

      const epsilonIndi = scene.entries?.find(entry => entry.name === 'Epsilon Indi');
      if (epsilonIndi) {
        epsilonIndi.stellarMass = EPSILON_INDI_SUBSTELLAR_SOLAR;
        epsilonIndi.planetaryMass = EPSILON_INDI_PLANET_SOLAR;
        epsilonIndi.mass = EPSILON_INDI_SUBSTELLAR_SOLAR + EPSILON_INDI_PLANET_SOLAR;
        epsilonIndi.massBreakdown = {
          primarySolarMass:0.778,
          brownDwarfMassesJupiter:[66.92,53.25],
          planetMassJupiter:7.6,
          provenance:'2022 dynamical brown-dwarf masses plus 2026 JWST planet solution'
        };
      }

      scene.lensingNodes = rebuildNodes(
        scene,
        base,
        Number(options.mergeRadiusAu) || scene.mergeRadiusAu || MERGE_RADIUS_AU
      );
      scene.referencePhysicsUpdated = '2026-07-13';
      return scene;
    }

    globalThis.BlacklightExoLensingModel = Object.freeze({
      ...base,
      buildScene,
      examplePhysics2026:true
    });
  }

  function rebuildNodes(scene, model, mergeRadiusAu) {
    const sources = sourceIndex(scene, model);
    const pairs = new Map();
    for (const node of scene.lensingNodes || []) {
      for (const connection of node.connections || []) {
        const a = resolveSource(connection, 'from', sources);
        const b = resolveSource(connection, 'to', sources);
        if (!a || !b || a.id === b.id) continue;
        const key = [a.id,b.id].sort().join('::');
        if (!pairs.has(key)) pairs.set(key, {a,b,reasons:new Set(),anomaly:false});
        const pair = pairs.get(key);
        pair.anomaly ||= Boolean(node.anomaly) || connection.kind === 'anomaly' || a.category === 'anomaly-source' || b.category === 'anomaly-source';
        for (const reason of connection.reasons || ['mass influence']) pair.reasons.add(reason);
      }
    }

    const raw = [...pairs.values()].map((pair,index) => {
      const weightA = balanceWeight(pair.a);
      const weightB = balanceWeight(pair.b);
      const fraction = boundedFraction(weightA,weightB);
      const distanceAu = distance3(pair.a.position,pair.b.position);
      return {
        id:`example-2026-${index+1}`,
        anomaly:pair.anomaly,
        position:interpolate(pair.a.position,pair.b.position,fraction),
        rawStrength:pairInfluence(pair.a,pair.b,scene.maxRadius),
        connections:[{
          kind:pair.anomaly ? 'anomaly' : 'derived',
          fromId:pair.a.id,
          fromName:pair.a.name,
          fromCategory:pair.a.category,
          fromMass:pair.a.mass,
          fromPosition:{...pair.a.position},
          fromWeight:weightA,
          toId:pair.b.id,
          toName:pair.b.name,
          toCategory:pair.b.category,
          toMass:pair.b.mass,
          toPosition:{...pair.b.position},
          toWeight:weightB,
          distanceAu,
          balanceFractionFromA:fraction,
          midpointOffsetAu:Math.abs(fraction-.5)*distanceAu,
          dominantSource:weightA>=weightB?pair.a.name:pair.b.name,
          reasons:[...pair.reasons,'2026 EXAMPLE mass calibration']
        }]
      };
    });
    return mergeNearby(raw,mergeRadiusAu);
  }

  function sourceIndex(scene,model) {
    const index = new Map();
    const add = source => index.set(source.id,source);
    for (const entry of scene.entries || []) add({
      id:`system:${entry.seed}`,
      category:'system',
      name:entry.name,
      mass:Math.max(.00001,Number(entry.mass)||1),
      effectiveMass:Math.max(.00001,Number(entry.mass)||1),
      sizeFactor:model.volumeFactor?.(entry.star||'')||1,
      position:entry.position
    });
    for (const item of scene.protostars || []) add({
      id:item.id,category:item.category,name:item.name,mass:item.mass,
      effectiveMass:Math.max(.00001,item.mass*.88),sizeFactor:1.08,position:item.position
    });
    for (const item of scene.darkMasses || []) add({
      id:item.id,category:item.category,name:item.name,mass:item.mass,
      effectiveMass:Math.max(.000001,item.mass),sizeFactor:1,position:item.position
    });
    for (const item of scene.nebulae || []) add({
      id:item.id,category:item.category,name:item.name,mass:item.mass,
      effectiveMass:Math.max(.001,Math.sqrt(item.mass)*(.35+item.density*.65)),
      sizeFactor:1.3,position:item.position
    });
    return index;
  }

  function resolveSource(connection,prefix,sources) {
    const id = connection[`${prefix}Id`];
    if (id && sources.has(id)) return sources.get(id);
    const position = connection[`${prefix}Position`];
    if (!position) return null;
    const mass = Math.max(.000001,Number(connection[`${prefix}Mass`])||.000001);
    return {
      id:id||`${prefix}:unresolved:${connection[`${prefix}Name`]||'source'}`,
      category:id?.startsWith('anomaly')?'anomaly-source':'unresolved',
      name:connection[`${prefix}Name`]||'Unresolved curvature source',
      mass,
      effectiveMass:Math.max(.000001,Number(connection[`${prefix}Weight`])||mass),
      sizeFactor:1,
      position:{...position}
    };
  }

  function mergeNearby(nodes,radius) {
    if (!nodes.length) return [];
    const parent=nodes.map((_,index)=>index);
    const find=index=>parent[index]===index?index:(parent[index]=find(parent[index]));
    const union=(a,b)=>{const left=find(a),right=find(b);if(left!==right)parent[right]=left;};
    for(let left=0;left<nodes.length;left+=1){
      for(let right=left+1;right<nodes.length;right+=1){
        if(distance3(nodes[left].position,nodes[right].position)<=radius)union(left,right);
      }
    }
    const groups=new Map();
    nodes.forEach((node,index)=>{const root=find(index);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(node);});
    const merged=[...groups.values()].map(group=>{
      const total=group.reduce((sum,node)=>sum+Math.max(1e-9,node.rawStrength),0);
      const position=group.reduce((point,node)=>({
        x:point.x+node.position.x*node.rawStrength/total,
        y:point.y+node.position.y*node.rawStrength/total,
        z:point.z+node.position.z*node.rawStrength/total
      }),{x:0,y:0,z:0});
      return {
        id:`example-2026-aggregate-${hashString(group.map(node=>node.id).sort().join('|')).toString(36)}`,
        position,
        rawStrength:group.reduce((sum,node)=>sum+node.rawStrength,0),
        anomaly:group.some(node=>node.anomaly),
        mergedPointCount:group.length,
        connections:group.flatMap(node=>node.connections),
        placementMethod:'2026 reference-mass bounded midpoint'
      };
    });
    const maximum=Math.max(1e-9,...merged.map(node=>node.rawStrength));
    merged.sort((a,b)=>b.rawStrength-a.rawStrength);
    merged.forEach((node,index)=>{
      const normalized=Math.sqrt(node.rawStrength/maximum);
      node.strength=.25+normalized*2.75;
      node.displayRadius=3.5+Math.log2(node.connections.length+1)*1.7+normalized*4.2;
      node.name=node.anomaly
        ?(node.connections.length>1?'Anomalous Aggregate Lensing Node':'Anomaly Gravitational Point')
        :`Aggregate Lensing Node ${String(index+1).padStart(2,'0')}`;
    });
    return merged;
  }

  function balanceWeight(source){
    return Math.pow(Math.max(1e-9,source.effectiveMass||source.mass||1),.56)*
      Math.pow(Math.max(.2,source.sizeFactor||1),.44);
  }
  function boundedFraction(a,b){return clamp(.5+.22*Math.tanh(Math.log(b/a)/1.8),.28,.72);}
  function pairInfluence(a,b,maxRadius){
    const normalized=distance3(a.position,b.position)/Math.max(1,maxRadius);
    return Math.sqrt(balanceWeight(a)*balanceWeight(b))/Math.pow(.035+normalized,1.18);
  }
  function interpolate(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}
  function distance3(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function hashString(value){let hash=2166136261;for(const character of String(value)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}

  waitForModel();
})();
