(() => {
  'use strict';
  const Storage=globalThis.NpcProfileGeneratorStorage;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));

  function stable(value){
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return`[${value.map(stable).join(',')}]`;
    return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  function stablePretty(value,space=2){return JSON.stringify(JSON.parse(stable(value)),null,space);}
  function label(value){return String(value||'').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[-_]+/g,' ').replace(/\b\w/g,character=>character.toUpperCase());}
  function scalar(value){
    if(value===null||value===undefined||value==='')return'None';
    if(Array.isArray(value))return value.map(scalar).join(', ');
    if(typeof value==='object'){
      if('state'in value){const suffix='value'in value?`: ${scalar(value.value)}`:value.reason?`: ${value.reason}`:'';return`${label(value.state)}${suffix}`;}
      return Object.entries(value).map(([key,entry])=>`${label(key)}: ${scalar(entry)}`).join('; ');
    }
    return String(value);
  }
  function sectionEntries(profile){
    const entries=[];
    for(const[id,envelope]of Object.entries(profile.sections||{})){
      if(id==='extensions')continue;
      entries.push([id,envelope]);
    }
    for(const[id,envelope]of Object.entries(profile.sections?.extensions||{}))entries.push([id,envelope]);
    return entries;
  }
  function textLines(profile,options={}){
    const lines=[profile.identity?.fullName||'Unnamed NPC',`${profile.archetype?.label||label(profile.archetype?.id)} · ${label(profile.identity?.ancestryId)} · ${label(profile.identity?.ageBand)}`,`Profile: ${profile.profileId} · Seed: ${profile.generator?.seed||'unknown'} · Mode: ${profile.generator?.mode||'unknown'}`,''];
    const identity=Object.entries(profile.identity||{}).filter(([key])=>!['fullName'].includes(key));
    lines.push('IDENTITY');identity.forEach(([key,value])=>lines.push(`${label(key)}: ${scalar(value)}`));
    for(const[id,envelope]of sectionEntries(profile)){
      if(options.compact&&['appearance','background','possessionsResources'].includes(id))continue;
      lines.push('',label(id).toUpperCase(),`State: ${label(envelope?.state||'unknown')}`);
      if(envelope?.reason)lines.push(`Reason: ${envelope.reason}`);
      if(envelope?.state==='present')for(const[key,value]of Object.entries(envelope.data||{}))lines.push(`${label(key)}: ${scalar(value)}`);
    }
    if(options.includeReceipt!==false){
      lines.push('','GENERATION RECEIPT');
      for(const[key,value]of Object.entries(profile.generator||{}))lines.push(`${label(key)}: ${scalar(value)}`);
      lines.push(`Locks: ${(profile.locks||[]).join(', ')||'None'}`);
    }
    return lines;
  }
  function canonicalJson(profile){
    const validation=Storage?.validateProfile?.(profile);
    if(validation&&!validation.valid)throw new Error(validation.errors.map(item=>item.message).join(' '));
    return stablePretty(clone(profile));
  }
  function readableText(profile,options={}){return`${textLines(profile,options).join('\n').trim()}\n`;}
  function markdown(profile,options={}){
    const lines=[`# ${profile.identity?.fullName||'Unnamed NPC'}`,`**${profile.archetype?.label||label(profile.archetype?.id)}** · ${label(profile.identity?.ancestryId)} · ${label(profile.identity?.ageBand)}`,'',`- **Profile ID:** ${profile.profileId}` ,`- **Seed:** ${profile.generator?.seed||'unknown'}`,`- **Generation mode:** ${profile.generator?.mode||'unknown'}`,'','## Identity'];
    for(const[key,value]of Object.entries(profile.identity||{})){if(key==='fullName')continue;lines.push(`- **${label(key)}:** ${scalar(value)}`);}
    for(const[id,envelope]of sectionEntries(profile)){
      if(options.compact&&['appearance','background','possessionsResources'].includes(id))continue;
      lines.push('',`## ${label(id)}`,`**State:** ${label(envelope?.state||'unknown')}`);
      if(envelope?.reason)lines.push('',envelope.reason);
      if(envelope?.state==='present')for(const[key,value]of Object.entries(envelope.data||{}))lines.push(`- **${label(key)}:** ${scalar(value)}`);
    }
    if(options.includeReceipt!==false){lines.push('','## Generation Receipt','```json',stablePretty(profile.generator||{}),'```','',`**Locks:** ${(profile.locks||[]).join(', ')||'None'}`);}
    return`${lines.join('\n').trim()}\n`;
  }
  function filename(profile,extension){const base=(profile.identity?.fullName||profile.profileId||'npc-profile').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return`${base||'npc-profile'}.${extension}`;}
  function download(content,name,mime='text/plain'){
    if(typeof document==='undefined'||typeof URL==='undefined')return{ok:false,error:'Browser download APIs are unavailable.'};
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);return{ok:true};
  }
  function copy(content){return globalThis.navigator?.clipboard?.writeText?globalThis.navigator.clipboard.writeText(content):Promise.reject(new Error('Clipboard API is unavailable.'));}

  globalThis.NpcProfileGeneratorExport=Object.freeze({stable,stablePretty,label,scalar,sectionEntries,textLines,canonicalJson,readableText,markdown,filename,download,copy});
})();
