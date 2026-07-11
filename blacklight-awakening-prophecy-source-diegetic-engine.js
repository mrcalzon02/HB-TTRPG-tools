(()=>{
  'use strict';
  const profiles=window.BAP_SOURCE_DIEGETIC?.profiles;
  if(!profiles)return;

  function hash(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function choose(seed,list){return list[hash(seed)%list.length]}
  function sourceKeyFromLabel(label){
    return Object.keys(profiles).find(key=>label.trim().toLowerCase().startsWith(profiles[key].label.toLowerCase()))||null;
  }
  function cleanBase(text){
    return String(text)
      .replace(/^\s*(?:MINOR|MAJOR) PROPHECY OCCURRENCE[^\n]*\n+/i,'')
      .replace(/\[[^\]]{0,220}\]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function splitSentences(text){
    const clean=cleanBase(text);
    const matches=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return (matches||[clean]).map(x=>x.trim()).filter(Boolean);
  }
  function preserveCase(match,replacement){
    if(match===match.toUpperCase())return replacement.toUpperCase();
    if(match.charAt(0)===match.charAt(0).toUpperCase())return replacement.charAt(0).toUpperCase()+replacement.slice(1);
    return replacement;
  }
  function applyDiction(text,profile,seed){
    let out=text;
    profile.swaps.forEach((entry,index)=>{
      const [pattern,options]=entry;
      if(hash(`${seed}|swap|${index}`)%5<2){
        const replacement=choose(`${seed}|choice|${index}`,options);
        out=out.replace(pattern,match=>preserveCase(match,replacement));
      }
    });
    return out;
  }
  function ensurePeriod(text){return /[.!?\]]$/.test(text.trim())?text.trim():`${text.trim()}.`}
  function lowerFirst(text){return text?text.charAt(0).toLowerCase()+text.slice(1):text}
  function voiceSentence(sentence,sourceKey,seed,index){
    const mode=hash(`${seed}|voice|${index}`)%6;
    if(mode<2)return sentence;
    const lower=lowerFirst(sentence);
    const frames={
      Fae:[`In the other tense, ${lower}`,`The mirror objects, yet ${lower}`,`Or perhaps—because the noun has changed masks—${lower}`,`The thorn-copy remembers that ${lower}`],
      Blood:[`Thereupon, ${lower}`,`And the chronicler records that ${lower}`,`So the red herald swore: ${sentence}`,`The grail-darkened verse declares that ${lower}`],
      Gaian:[`The roots remember that ${lower}`,`The river answered that ${lower}`,`In the body of the territory, ${lower}`,`The animals carried this part without speech: ${sentence}`],
      Dream:[`In the next room, ${lower}`,`The dream insists: ${sentence}`,`You remember—incorrectly, but together—that ${lower}`,`Behind the mirror, ${lower}`],
      'Dead Reality':[`I saw it happen: ${sentence}`,`The emergency broadcast lied, but this part was true: ${sentence}`,`Someone wrote beneath my warning that ${lower}`,`What we understood too late was this: ${sentence}`],
      Charles:[`Branch evidence: ${sentence}`,`Observed function: ${sentence}`,`Cross-source convergence indicates that ${lower}`,`Operationally relevant image: ${sentence}`]
    };
    const pool=frames[sourceKey]||[];
    return pool.length?choose(`${seed}|voice-frame|${index}`,pool):sentence;
  }
  function rotate(list,amount){return list.slice(amount).concat(list.slice(0,amount))}
  function prepareCore(baseText,profile,sourceKey,seed){
    let sentences=splitSentences(baseText).map((s,i)=>voiceSentence(applyDiction(s,profile,`${seed}|sentence|${i}`),sourceKey,seed,i));
    if(!sentences.length)sentences=['The surviving image refuses a single operational name.'];
    const mode=hash(`${seed}|core-mode`)%9;
    if(sentences.length>2){
      if(mode===1)sentences=rotate(sentences,1);
      if(mode===2)sentences=[sentences[0],sentences[sentences.length-1],...sentences.slice(1,-1)];
      if(mode===3)sentences=[...sentences].reverse();
      if(mode===4)sentences=sentences.filter((_,i)=>i%2===0).concat(sentences.filter((_,i)=>i%2===1));
      if(mode===5)sentences=rotate(sentences,Math.floor(sentences.length/2));
      if(mode===6)sentences=[sentences[1],sentences[0],...sentences.slice(2)];
      if(mode===7)sentences=[...sentences.slice(0,-2),sentences.at(-1),sentences.at(-2)];
    }
    return sentences;
  }
  function styleTitle(baseTitle,sourceKey,seed){
    const profile=profiles[sourceKey];
    const frame=choose(`${seed}|frame`,profile.titleFrames);
    const bare=baseTitle.replace(/^The\s+/i,'');
    let replacement=baseTitle;
    if(/of\s+\{title\}/i.test(frame))replacement=`the ${bare}`;
    else if(/(?:called|about|to|says|beneath|under|remembers|dreams)\s+\{title\}/i.test(frame))replacement=bare;
    return frame.replace('{title}',replacement);
  }
  function stylePassage(baseText,sourceKey,seed,kind='event'){
    const profile=profiles[sourceKey];
    const core=prepareCore(baseText,profile,sourceKey,seed);
    const opening=choose(`${seed}|opening`,profile.openings);
    const turn=choose(`${seed}|turn`,profile.turns);
    const ending=choose(`${seed}|ending`,profile.endings);
    const lacuna=choose(`${seed}|lacuna`,profile.lacunae);
    const includeLacuna=(hash(`${seed}|lacuna-use`)%4===0)||(sourceKey==='Dead Reality'&&hash(`${seed}|dead-lacuna`)%3===0);
    const mode=hash(`${seed}|form`)%12;
    const a=core[0]||'', b=core[1]||'', c=core[2]||'', rest=core.slice(3);
    let parts;
    switch(mode){
      case 0: parts=[opening,a,b,turn,c,...rest,includeLacuna?lacuna:'',ending]; break;
      case 1: parts=[a,opening,b,c,turn,...rest,includeLacuna?lacuna:'',ending]; break;
      case 2: parts=[opening,a,turn,b,...rest,c,ending,includeLacuna?lacuna:'']; break;
      case 3: parts=[opening,turn,a,b,includeLacuna?lacuna:'',c,...rest,ending]; break;
      case 4: parts=[a,b,opening,c,...rest,turn,ending]; break;
      case 5: parts=[opening,a,includeLacuna?lacuna:'',b,turn,c,...rest,ending]; break;
      case 6: parts=[turn,opening,a,c,b,...rest,ending]; break;
      case 7: parts=[opening,c,a,turn,b,...rest,includeLacuna?lacuna:'',ending]; break;
      case 8: parts=[a,turn,b,opening,c,...rest,ending]; break;
      case 9: parts=[opening,a,b,c,...rest,ending,includeLacuna?lacuna:'']; break;
      case 10: parts=[opening,a,turn,includeLacuna?lacuna:'',...core.slice(1),ending]; break;
      default: parts=[opening,...core.slice(0,2),turn,...core.slice(2),ending];
    }
    parts=parts.filter(Boolean).map(ensurePeriod);

    if(sourceKey==='Fae'){
      const cut=1+(hash(`${seed}|fae-cut`)%Math.max(1,parts.length-2));
      return `${parts.slice(0,cut).join(' ')}\n\n${parts.slice(cut).join(' ')}`;
    }
    if(sourceKey==='Blood'){
      const cut=Math.min(parts.length-1,2+(hash(`${seed}|blood-cut`)%Math.max(1,parts.length-3)));
      return `${parts.slice(0,cut).join(' ')}\n\n${parts.slice(cut).join(' ')}`;
    }
    if(sourceKey==='Gaian'){
      const cut=1+(hash(`${seed}|gaia-cut`)%Math.max(1,parts.length-2));
      return `${parts.slice(0,cut).join(' ')}\n\n${parts.slice(cut).join(' ')}`;
    }
    if(sourceKey==='Dream'){
      const lineMode=hash(`${seed}|dream-lines`)%3;
      return lineMode===0?parts.join('\n'):lineMode===1?parts.join('\n\n'):parts.join(' ');
    }
    if(sourceKey==='Dead Reality'){
      const lineMode=hash(`${seed}|dead-lines`)%3;
      if(lineMode===0)return parts.join('\n');
      const cut=1+(hash(`${seed}|dead-cut`)%Math.max(1,parts.length-2));
      return `${parts.slice(0,cut).join(' ')}\n\n${parts.slice(cut).join(' ')}`;
    }
    if(sourceKey==='Charles'){
      const cut=Math.min(parts.length-1,2+(hash(`${seed}|charles-cut`)%Math.max(1,parts.length-3)));
      return `${parts.slice(0,cut).join(' ')}\n\n${parts.slice(cut).join(' ')}`;
    }
    return parts.join(' ');
  }

  function sourceArtifact(sourceKey,seed){return choose(`${seed}|artifact`,profiles[sourceKey].artifacts)}
  function sourceReading(sourceKey,seed){return choose(`${seed}|reading`,profiles[sourceKey].sourceReadings)}

  window.BAP_SOURCE_DIEGETIC_API={stylePassage,styleTitle,sourceArtifact,sourceReading,sourceKeyFromLabel};

  const output=document.getElementById('prophecy-output');
  const status=document.getElementById('prophecy-status');
  const meta=document.querySelector('.prophecy-meta');
  if(meta&&!meta.dataset.sourceDiegeticNotice){
    meta.textContent+=' The selected source family now changes the artifact provenance, event titles, diction, chronology, damage conventions, and prophetic narrative form—not merely the label above the file.';
    meta.dataset.sourceDiegeticNotice='1';
  }
  if(!output)return;

  function findPrimarySource(record){
    return [...record.querySelectorAll('.intel-field')].find(field=>field.querySelector('span')?.textContent.trim()==='Primary source')||null;
  }
  function replaceSourceInterpretation(card,sourceKey,seed){
    const items=[...card.querySelectorAll('.interpretation-drawer li')];
    if(!items.length)return;
    const target=items.find(item=>/source|custody/i.test(item.textContent))||items[Math.min(3,items.length-1)];
    target.textContent=sourceReading(sourceKey,seed);
  }
  function processCard(card,record,sourceKey,seed){
    if(!card||card.dataset.sourceDiegeticRevision==='1')return;
    const heading=card.querySelector('.fragment-heading strong');
    const quote=card.querySelector('blockquote');
    if(!heading||!quote)return;
    const baseTitle=heading.textContent.trim();
    const baseText=quote.textContent.trim();
    heading.textContent=styleTitle(baseTitle,sourceKey,`${seed}|title`);
    quote.textContent=stylePassage(baseText,sourceKey,`${seed}|passage`,'event');
    replaceSourceInterpretation(card,sourceKey,`${seed}|interpretation`);
    card.dataset.sourceDiegeticRevision='1';
  }
  function processRecord(record){
    if(record.dataset.sourceDiegeticRevision==='1'||record.dataset.deepVariantRevision!=='1')return;
    const id=record.querySelector(':scope > summary span')?.textContent.trim()||'BAP';
    const sourceField=findPrimarySource(record);
    const sourceText=sourceField?.querySelector('p')?.textContent.trim()||'';
    const sourceKey=sourceKeyFromLabel(sourceText);
    if(!sourceKey)return;
    record.dataset.sourceFamily=sourceKey;
    if(sourceField?.querySelector('p'))sourceField.querySelector('p').textContent=sourceArtifact(sourceKey,`${id}|source`);

    const overarching=record.querySelector('.prophecy-major blockquote');
    if(overarching)overarching.textContent=stylePassage(overarching.textContent,sourceKey,`${id}|overarching`,'overarching');

    [...record.querySelectorAll('.stage-pair')].forEach((stage,index)=>{
      processCard(stage.querySelector('.minor-fragment'),record,sourceKey,`${id}|${index}|minor`);
      processCard(stage.querySelector('.major-fragment'),record,sourceKey,`${id}|${index}|major`);
    });
    record.dataset.sourceDiegeticRevision='1';
  }
  function process(){
    let changed=false;
    output.querySelectorAll('.prophecy-record').forEach(record=>{
      const before=record.dataset.sourceDiegeticRevision;
      processRecord(record);
      if(before!==record.dataset.sourceDiegeticRevision)changed=true;
    });
    if(changed&&status)status.textContent='Mounted source-diegetic prophecy file: artifact, title, voice, damage pattern, and interpretive grammar reflect the selected tradition.';
  }
  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;process()}))));
  }
  new MutationObserver(schedule).observe(output,{childList:true,subtree:true});
  schedule();
})();
