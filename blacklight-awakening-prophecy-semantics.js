(()=>{
  'use strict';

  const output=document.getElementById('prophecy-output');
  const copyButton=document.getElementById('prophecy-copy');
  const status=document.getElementById('prophecy-status');
  if(!output)return;

  function cleanTriggerText(text){
    return String(text)
      .replace(/^(?:MINOR|MAJOR) PROPHECY OCCURRENCE\s*\/\/[^\n]*\n+/i,'')
      .replace(/\s*The line does not claim that this occurrence completes, causes, or explains the neighboring occurrence in Stage \d+\. It is filed beside it because both fragments orbit [^,\n]+, not because they are one chain\./gi,'')
      .replace(/\s*The surviving gloss says:\s*[“"]Do not marry the fragments unless the field evidence marries them first\.[”"]\s*Charles highlights this sentence twice\./gi,'')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }

  function reviseInterpretations(card){
    card.querySelectorAll('.interpretation-drawer li').forEach(item=>{
      item.textContent=item.textContent
        .replace(/treat this as a (?:low|high)-order prophetic occurrence, not as half of a two-step cause-and-effect pair\./i,'read this Event Trigger as an independent prophecy.')
        .replace(/points toward a possible field manifestation:/i,'most strongly corresponds to:')
        .replace(/matching the manifestation/gi,'matching the Event Correspondence');
    });
  }

  function prepareCard(card,kind,title){
    card.dataset.eventKind=kind;
    card.dataset.eventTitle=title;
    const heading=card.querySelector('.fragment-heading');
    if(heading){
      const type=heading.querySelector('span');
      const name=heading.querySelector('strong');
      if(type)type.textContent=kind==='minor'?'MINOR EVENT':'MAJOR EVENT';
      if(name)name.textContent=title;
    }

    const quote=card.querySelector('blockquote');
    if(quote){
      quote.textContent=cleanTriggerText(quote.textContent);
      if(!quote.previousElementSibling?.classList.contains('event-trigger-label')){
        const label=document.createElement('span');
        label.className='event-trigger-label';
        label.textContent='Event trigger';
        quote.parentNode.insertBefore(label,quote);
      }
    }

    const correspondence=card.querySelector('.event-correspondence');
    if(correspondence){
      const label=correspondence.querySelector('span');
      if(label)label.textContent='Event correspondence';
    }
    reviseInterpretations(card);
  }

  function processRecord(record){
    if(record.dataset.semanticRevision==='2')return;
    const stages=[...record.querySelectorAll('.stage-pair')];
    if(stages.length!==6)return;

    const majors=[];
    stages.forEach((stage,index)=>{
      const header=stage.querySelector(':scope > header');
      const sharedTitle=header?.querySelector('h3')?.textContent.trim()||`Record ${index+1}`;
      const minor=stage.querySelector('.minor-fragment');
      const major=stage.querySelector('.major-fragment');
      if(minor)prepareCard(minor,'minor',sharedTitle);
      if(major){prepareCard(major,'major',sharedTitle);majors.push(major)}
      header?.querySelector('h3')?.remove();
      stage.querySelector('.seal-rule')?.remove();
    });

    if(majors.length===stages.length){
      majors.forEach(card=>card.remove());
      stages.forEach((stage,index)=>{
        const grid=stage.querySelector('.stage-pair-grid');
        const independentMajor=majors[(index+1)%majors.length];
        if(grid&&independentMajor)grid.appendChild(independentMajor);
      });
    }
    record.dataset.semanticRevision='2';
  }

  function processOutput(){
    output.querySelectorAll('.prophecy-record').forEach(processRecord);
    if(output.querySelector('.prophecy-record')){
      status.textContent='Mounted prophecy file: six Minor Events and six independently assigned Major Events, each recorded as Event Trigger plus Event Correspondence.';
    }
  }

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;processOutput()});
  };
  new MutationObserver(schedule).observe(output,{childList:true});
  schedule();

  if(copyButton){
    copyButton.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      processOutput();
      const text=output.innerText.trim();
      try{
        await navigator.clipboard.writeText(text);
        status.textContent='Visible Event Trigger / Event Correspondence records copied.';
      }catch(error){
        status.textContent='Clipboard access was blocked. Select the visible prophecy file manually.';
      }
    },true);
  }
})();