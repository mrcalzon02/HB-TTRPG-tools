(() => {
  'use strict';
  const CONFIG_URL='data/npc-generator/packs/kaysender-compatibility.json';
  const cache=new Map();
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const splitPipe=value=>String(value||'').split('|').filter(Boolean);
  const slug=value=>String(value||'').normalize('NFKD').replace(/[’']/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'unknown';
  const unique=entries=>[...new Map((entries||[]).map(entry=>[JSON.stringify(entry),entry])).values()];

  function normalizeClass(row){
    return{
      id:`kaysender-class-${slug(row[0])}`,
      name:row[0],pool:row[1],role:row[2],hitDie:row[3],baseAttack:row[4],
      goodSaves:splitPipe(row[5]),keyAbilities:splitPipe(row[6]),paths:splitPipe(row[7]),
      conversionStatus:row[8]||''
    };
  }
  function normalizeAncestry(row,compatibility){
    const name=row[0];
    return{
      id:compatibility.ancestryIds?.[name]||`kaysender-${slug(name)}`,
      name,givenNames:splitPipe(row[1]),familyNames:splitPipe(row[2])
    };
  }
  function preferredClasses(value){
    return splitPipe(value).map(entry=>{
      const separator=entry.lastIndexOf(':');
      return separator<1?{name:entry,weight:1}:{name:entry.slice(0,separator),weight:Number(entry.slice(separator+1))||0};
    });
  }
  function normalizeBand(row,sourcePath,compatibility){
    const levels=String(row[4]||'1-1').split('-').map(Number);
    return{
      id:row[0],label:row[1],description:row[2],ageBands:splitPipe(row[3]),
      levelRange:{min:Number.isInteger(levels[0])?levels[0]:1,max:Number.isInteger(levels[1])?levels[1]:Number.isInteger(levels[0])?levels[0]:1},
      combatReadiness:row[5],occupations:splitPipe(row[6]),crewRoles:splitPipe(row[7]),
      preferredClasses:preferredClasses(row[8]),sourcePath,
      family:compatibility.populationBandFamilies?.[row[0]]||'unknown',
      archetypeId:compatibility.populationBandArchetypes?.[row[0]]||'civilian-general'
    };
  }
  function indexBy(entries,key='id'){
    return Object.fromEntries((entries||[]).map(entry=>[entry[key],entry]));
  }
  function normalizeSources(compatibility,manifest,bandParts){
    const classes=(manifest.classes||[]).map(normalizeClass);
    const ancestries=(manifest.ancestries||[]).map(row=>normalizeAncestry(row,compatibility));
    const populationBands=[];
    (bandParts||[]).forEach((part,index)=>{
      const sourcePath=compatibility.sources?.bandPacks?.[index]||manifest.bandPacks?.[index]||`band-pack-${index}`;
      for(const row of part.populationBands||[])populationBands.push(normalizeBand(row,sourcePath,compatibility));
    });
    const classPools={pc:[],npc:[],custom:[]};
    classes.forEach(entry=>{if(classPools[entry.pool])classPools[entry.pool].push(entry);});
    const powerTiers=(manifest.powerTiers||[]).map(entry=>({...entry}));
    return{
      dataType:'kaysenderCompatibilityData',schemaVersion:'1.0.0',setting:manifest.setting||'Kaysender',
      compatibility:clone(compatibility),manifest:clone(manifest),classes,classPools,
      classIndex:indexBy(classes,'name'),classIdIndex:indexBy(classes),
      ancestries,ancestryIndex:indexBy(ancestries,'name'),ancestryIdIndex:indexBy(ancestries),
      populationBands,bandIndex:indexBy(populationBands),
      selectableBands:populationBands.filter(entry=>entry.id!=='random-population'),
      powerTiers,powerTierIndex:indexBy(powerTiers),ageBands:[...(manifest.ageBands||[])],
      homeRegions:[...(manifest.homeRegions||[])],factions:[...(manifest.factions||[])],
      needs:[...(manifest.needs||[])],fears:[...(manifest.fears||[])],loyalties:[...(manifest.loyalties||[])],
      secrets:[...(manifest.secrets||[])],problems:[...(manifest.problems||[])],dispositions:[...(manifest.dispositions||[])],
      occupations:unique(populationBands.flatMap(entry=>entry.occupations)),
      crewRoles:unique(populationBands.flatMap(entry=>entry.crewRoles)),
      sourcePaths:[compatibility.sources?.manifest,...(compatibility.sources?.bandPacks||[])].filter(Boolean)
    };
  }

  async function fetchJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`${url} returned ${response.status}.`);
    return response.json();
  }
  async function load(configUrl=CONFIG_URL){
    if(cache.has(configUrl))return cache.get(configUrl);
    const promise=fetchJson(configUrl).then(async compatibility=>{
      const manifest=await fetchJson(compatibility.sources.manifest);
      const paths=compatibility.sources.bandPacks?.length?compatibility.sources.bandPacks:manifest.bandPacks||[];
      const bandParts=await Promise.all(paths.map(fetchJson));
      return normalizeSources(compatibility,manifest,bandParts);
    });
    cache.set(configUrl,promise);
    try{return await promise;}catch(error){cache.delete(configUrl);throw error;}
  }

  function rangesFor(rule){
    const adult=Number(rule.adultThreshold||18),elder=Math.max(adult+2,Number(rule.elderThreshold||70)),maximum=Math.max(elder,Number(rule.maxAge||95));
    const childEnd=Math.max(0,Math.floor(adult*.55)-1),middleStart=Math.max(adult+1,Math.floor(adult+(elder-adult)*.65));
    return{child:[0,childEnd],adolescent:[childEnd+1,adult-1],adult:[adult,middleStart-1],'middle-aged':[middleStart,elder-1],elderly:[elder,maximum]};
  }
  function appendUnique(target,entries){
    const output=[...(target||[])],seen=new Set(output.map(entry=>JSON.stringify(entry)));
    for(const entry of entries||[]){const key=JSON.stringify(entry);if(!seen.has(key)){seen.add(key);output.push(clone(entry));}}
    return output;
  }
  function extendPack(basePack,data){
    const pack=clone(basePack||{}),compatibility=data.compatibility;
    pack.tables=pack.tables||{};pack.ageRanges=pack.ageRanges||{};pack.ancestryRules=pack.ancestryRules||{};pack.customAncestries=pack.customAncestries||{};
    pack.tables.givenNames=appendUnique(pack.tables.givenNames,data.ancestries.flatMap(entry=>entry.givenNames));
    pack.tables.familyNames=appendUnique(pack.tables.familyNames,data.ancestries.flatMap(entry=>entry.familyNames));
    pack.tables.ancestries=appendUnique(pack.tables.ancestries,data.ancestries.map(entry=>entry.id));
    const defaultRule=clone(pack.defaultAncestryRule||{adultThreshold:18,elderThreshold:70,maxAge:95,parentGapMin:16,parentGapMax:45,siblingSpread:12,partnerSpread:15});
    for(const ancestry of data.ancestries){
      pack.ancestryRules[ancestry.id]={id:ancestry.id,...clone(defaultRule)};
      pack.ageRanges[ancestry.id]=rangesFor(defaultRule);
      pack.customAncestries[ancestry.id]={id:ancestry.id,label:ancestry.name,sourcePackId:compatibility.packId};
    }
    Object.assign(pack.tables,{
      kaysenderHomeRegions:clone(data.homeRegions),kaysenderFactions:clone(data.factions),
      kaysenderNeeds:clone(data.needs),kaysenderFears:clone(data.fears),kaysenderLoyalties:clone(data.loyalties),
      kaysenderSecrets:clone(data.secrets),kaysenderProblems:clone(data.problems),kaysenderDispositions:clone(data.dispositions),
      kaysenderPopulationBands:data.populationBands.map(entry=>entry.id),kaysenderOccupations:clone(data.occupations),
      kaysenderCrewRoles:clone(data.crewRoles),kaysenderClasses:data.classes.map(entry=>entry.name)
    });
    pack.compatibilityPacks=appendUnique(pack.compatibilityPacks,[{packId:compatibility.packId,version:compatibility.version,title:compatibility.title}]);
    pack.activeCustomPackIds=appendUnique(pack.activeCustomPackIds,[compatibility.packId]);
    pack.kaysenderData=clone(data);
    return pack;
  }

  globalThis.NpcProfileGeneratorKaysenderData=Object.freeze({CONFIG_URL,clone,splitPipe,slug,unique,normalizeClass,normalizeAncestry,preferredClasses,normalizeBand,indexBy,normalizeSources,fetchJson,load,rangesFor,appendUnique,extendPack,clearCache:()=>cache.clear()});
})();
