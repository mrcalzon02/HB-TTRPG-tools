(() => {
  'use strict';
  const supervisor=globalThis.BlacklightExoRuntimeSupervisor;
  if(!supervisor)return;
  const phase='stellar-sector-runtime';let settled=false;
  supervisor.start(phase);
  const ready=event=>{if(settled)return;settled=true;supervisor.ready(phase,{sectorId:event.detail?.sector?.sectorId,archiveHash:event.detail?.archiveHash});};
  document.addEventListener('blacklight:exo-sector-generated',ready,{once:true});
  const inspect=()=>{
    if(settled)return;
    const status=document.getElementById('exo-sector-status'),message=status?.textContent||'';
    if(/failed|error|could not initialize/i.test(message)){settled=true;supervisor.fail(phase,new Error(message));}
  };
  if('MutationObserver'in globalThis){const observer=new MutationObserver(inspect);const begin=()=>{const status=document.getElementById('exo-sector-status');if(status)observer.observe(status,{childList:true,subtree:true,characterData:true});};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',begin,{once:true}):begin();}
  setTimeout(()=>{if(!settled)supervisor.fail(phase,new Error('The sector runtime did not publish a generated-sector event within 12 seconds.'));},12000);
})();