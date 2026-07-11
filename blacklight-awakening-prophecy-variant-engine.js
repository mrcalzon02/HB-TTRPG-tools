(()=>{
  'use strict';

  const {TITLE_LEXICON,DAMAGE_FORMS,WORD_SWAPS}=window.BAP_VARIANT_DATA||{};
  if(!TITLE_LEXICON||!DAMAGE_FORMS||!WORD_SWAPS)return;
  function hash(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function choose(seed,list){return list[hash(seed)%list.length]}
  function unique(list){return [...new Set(list.filter(Boolean))]}
  function cleanWord(word){return word.replace(/^[^A-Za-z0-9’']+|[^A-Za-z0-9’']+$/g,'')}
  function titleCore(title){
    const words=title.replace(/^The\s+/i,'').split(/\s+/).map(cleanWord).filter(Boolean);
    const stop=new Set(['of','the','a','an','and','at','under','beneath','before','after','without','with','to','from','in','on','when']);
    const content=words.filter(w=>!stop.has(w.toLowerCase()));
    return {phrase:words.join(' '),lead:content[0]||words[0]||'Omen',root:content[content.length-1]||words[words.length-1]||'Omen'};
  }
  function buildNames(baseTitle,triggerName,seed,kind,stageIndex){
    const lex=TITLE_LEXICON[triggerName]||Object.values(TITLE_LEXICON)[0];
    const core=titleCore(baseTitle);
    const candidates=[baseTitle,`The ${core.phrase}`];
    lex.prefixes.forEach(prefix=>{
      candidates.push(`The ${prefix} ${core.root}`);
      candidates.push(`${prefix}: ${core.phrase}`);
      candidates.push(`The ${prefix} ${core.lead}`);
    });
    lex.places.forEach(place=>{
      candidates.push(`${core.root} Beneath ${place.replace(/^the\s+/i,'')}`);
      candidates.push(`The ${core.root} of ${place.replace(/^the\s+/i,'')}`);
      candidates.push(`${core.lead} at ${place}`);
    });
    lex.verbs.forEach(verb=>{
      candidates.push(`When ${core.root} ${verb}`);
      candidates.push(`${core.root} ${verb.charAt(0).toUpperCase()+verb.slice(1)}`);
      candidates.push(`The ${core.lead} That ${verb.charAt(0).toUpperCase()+verb.slice(1)}`);
    });
    candidates.push(`${kind==='minor'?'Lesser':'Greater'} Record ${stageIndex+1}: ${core.phrase}`);
    const pool=unique(candidates);
    return choose(seed,pool);
  }

  function splitSentences(text){
    const normalized=text.replace(/\s+/g,' ').trim();
    const matches=normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return (matches||[normalized]).map(s=>s.trim()).filter(Boolean);
  }
  function splitClauses(sentence){
    return sentence.split(/(?<=[,;:—])\s+/).map(x=>x.trim()).filter(Boolean);
  }
  function mutateWords(text,seed){
    let out=text;
    WORD_SWAPS.forEach((entry,index)=>{
      const [pattern,options]=entry;
      if((hash(`${seed}|swap|${index}`)%7)<2){
        const replacement=choose(`${seed}|choice|${index}`,options);
        out=out.replace(pattern,match=>{
          if(match[0]===match[0].toUpperCase())return replacement.toUpperCase();
          if(match.charAt(0)===match.charAt(0).toUpperCase()&&match.slice(1)===match.slice(1).toLowerCase())return replacement.charAt(0).toUpperCase()+replacement.slice(1);
          return replacement;
        });
      }
    });
    return out;
  }
  function damageLine(seed,omitted){
    const form=choose(`${seed}|damage`,DAMAGE_FORMS);
    if(!omitted)return `[${form}]`;
    const words=omitted.replace(/[“”"'’.,;:!?()[\]]/g,'').split(/\s+/).filter(Boolean);
    const start=words.length?hash(`${seed}|fragment`)%Math.max(1,words.length-3):0;
    const fragment=words.slice(start,start+Math.min(4,words.length)).join(' ');
    return fragment?`[${form} The recoverable impression contains: “${fragment}.”]`:`[${form}]`;
  }
  function weaveClauses(sentences,seed){
    const clauses=sentences.flatMap(splitClauses);
    if(clauses.length<5)return sentences.join(' ');
    const offset=hash(`${seed}|clause-offset`)%clauses.length;
    const rotated=clauses.slice(offset).concat(clauses.slice(0,offset));
    const selected=rotated.slice(0,Math.min(rotated.length,9));
    const lines=[];
    for(let i=0;i<selected.length;i+=2){
      const pair=selected.slice(i,i+2).join(' ');
      lines.push(pair.replace(/[,:;—]+$/,'')+(i+2>=selected.length?'.':';'));
    }
    return lines.join(' ');
  }
  function buildPassage(baseText,seed,source){
    let sentences=splitSentences(baseText).map((s,i)=>mutateWords(s,`${seed}|sentence|${i}`));
    if(sentences.length<3)return mutateWords(baseText,seed);
    const mode=hash(`${seed}|mode`)%20;
    const n=sentences.length;
    const rotate=(amount)=>sentences.slice(amount).concat(sentences.slice(0,amount));
    let arranged;
    switch(mode){
      case 0: arranged=sentences; break;
      case 1: arranged=rotate(1); break;
      case 2: arranged=[sentences[n-1],...sentences.slice(0,n-1)]; break;
      case 3: arranged=[sentences[0],sentences[n-1],...sentences.slice(1,n-1)]; break;
      case 4: arranged=sentences.filter((_,i)=>i%2===0).concat(sentences.filter((_,i)=>i%2===1)); break;
      case 5: arranged=sentences.filter((_,i)=>i%2===1).concat(sentences.filter((_,i)=>i%2===0)); break;
      case 6: arranged=[sentences[0],...sentences.slice(1,n-1).reverse(),sentences[n-1]]; break;
      case 7: arranged=rotate(Math.max(1,Math.floor(n/2))); break;
      case 8:{
        const omit=hash(`${seed}|omit`)%n;
        arranged=sentences.flatMap((s,i)=>i===omit?[damageLine(seed,s)]:[s]);
        break;
      }
      case 9:{
        const omit=(hash(`${seed}|omit-a`)%n);
        const omit2=(omit+1+hash(`${seed}|omit-b`)%Math.max(1,n-1))%n;
        arranged=sentences.flatMap((s,i)=>i===omit?[damageLine(`${seed}|a`,s)]:i===omit2?[]:[s]);
        break;
      }
      case 10: return weaveClauses(sentences,seed);
      case 11: arranged=[...sentences.slice(0,2),damageLine(seed,sentences[2]),...sentences.slice(3)]; break;
      case 12: arranged=[sentences[1],sentences[0],...sentences.slice(2)]; break;
      case 13: arranged=[...sentences.slice(0,n-2),sentences[n-1],sentences[n-2]]; break;
      case 14: arranged=sentences.map((s,i)=>i===Math.floor(n/2)?`${damageLine(seed,'')} ${s}`:s); break;
      case 15: arranged=rotate(hash(`${seed}|rotation`)%n); break;
      case 16: arranged=[sentences[0],...sentences.slice(2),sentences[1]]; break;
      case 17: arranged=[sentences[n-2],sentences[n-1],...sentences.slice(0,n-2)]; break;
      case 18: return weaveClauses(sentences.slice().reverse(),seed);
      default: arranged=sentences;
    }
    const stanzaMode=hash(`${seed}|stanza`)%5;
    if(stanzaMode===0&&arranged.length>3){
      const cut=1+(hash(`${seed}|cut`)%Math.max(1,arranged.length-2));
      return `${arranged.slice(0,cut).join(' ')}\n\n${arranged.slice(cut).join(' ')}`;
    }
    if(stanzaMode===1)return arranged.join('\n');
    if(stanzaMode===2&&/dream/i.test(source))return arranged.join('\n\n');
    return arranged.join(' ');
  }

  function processCard(card,record,triggerName,stageIndex,kind){
    if(!card||card.dataset.deepVariantRevision==='1')return;
    const heading=card.querySelector('.fragment-heading strong');
    const quote=card.querySelector('blockquote');
    if(!heading||!quote)return;
    const id=record.querySelector(':scope > summary span')?.textContent.trim()||triggerName;
    const source=[...record.querySelectorAll('.intel-field')].find(x=>x.querySelector('span')?.textContent.trim()==='Primary source')?.querySelector('p')?.textContent.trim()||'';
    const baseTitle=heading.textContent.trim();
    const baseText=quote.textContent.trim();
    const seed=`${id}|${triggerName}|${stageIndex}|${kind}`;
    heading.textContent=buildNames(baseTitle,triggerName,`${seed}|title`,kind,stageIndex);
    quote.textContent=buildPassage(baseText,`${seed}|passage`,source);
    card.dataset.deepVariantRevision='1';
  }

  function processRecord(record){
    if(record.dataset.deepVariantRevision==='1'||record.dataset.uniqueEventRevision!=='1')return;
    const triggerName=record.querySelector(':scope > summary strong')?.textContent.trim();
    if(!TITLE_LEXICON[triggerName])return;
    [...record.querySelectorAll('.stage-pair')].forEach((stage,index)=>{
      processCard(stage.querySelector('.minor-fragment'),record,triggerName,index,'minor');
      processCard(stage.querySelector('.major-fragment'),record,triggerName,index,'major');
    });
    record.dataset.deepVariantRevision='1';
  }

  const output=document.getElementById('prophecy-output');
  const status=document.getElementById('prophecy-status');
  if(!output)return;
  function process(){
    let changed=false;
    output.querySelectorAll('.prophecy-record').forEach(record=>{
      const before=record.dataset.deepVariantRevision;
      processRecord(record);
      if(before!==record.dataset.deepVariantRevision)changed=true;
    });
    if(changed&&status)status.textContent='Mounted prophecy file with expanded event-name pools and dozens of coherent Event Trigger variants per event slot.';
  }
  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;process()})));
  };
  new MutationObserver(schedule).observe(output,{childList:true,subtree:true});
  schedule();
})();
