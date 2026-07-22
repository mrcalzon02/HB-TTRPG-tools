(() => {
  'use strict';
  const supervisor=globalThis.BlacklightExoRuntimeSupervisor;
  if(!supervisor)return;
  const phase='stellar-sector-runtime',failureEvent='blacklight:exo-sector-failed';let settled=false;
  supervisor.start(phase);
  const fail=(error,details={})=>{if(settled)return;settled=true;const message=error instanceof Error?(error.message||String(error)):String(error?.message||error||'Unknown stellar-sector runtime failure');supervisor.fail(phase,message,{...details,statusMessage:message});};
  const ready=event=>{if(settled)return;settled=true;supervisor.ready(phase,{sectorId:event.detail?.sector?.sectorId,archiveHash:event.detail?.archiveHash});};
  document.addEventListener('blacklight:exo-sector-generated',ready,{once:true});
  document.addEventListener(failureEvent,event=>fail(event.detail?.message||'The stellar-sector generator reported an unspecified failure.',{source:'generator-event',stage:event.detail?.stage||'unknown',stack:event.detail?.stack||'',...(event.detail?.details||{})}),{once:true});
  const inspect=()=>{
    if(settled)return;
    const status=document.getElementById('exo-sector-status'),message=status?.textContent?.trim()||'';
    if(/failed|error|could not initialize/i.test(message))fail(message,{source:'status-element'});
  };
  if('MutationObserver'in globalThis){const observer=new MutationObserver(inspect);const begin=()=>{const status=document.getElementById('exo-sector-status');if(status)observer.observe(status,{childList:true,subtree:true,characterData:true});inspect();};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',begin,{once:true}):begin();}
  else{document.readyState==='loading'?document.addEventListener('DOMContentLoaded',inspect,{once:true}):inspect();}
  setTimeout(()=>{if(!settled){const status=document.getElementById('exo-sector-status')?.textContent?.trim()||'no status text',authority=globalThis.BlacklightExoStellarSectorData;fail(`The sector runtime did not publish a generated-sector event within 12 seconds. Current status: ${status}.`,{source:'startup-timeout',authorityPresent:Boolean(authority),generatorPresent:Boolean(authority?.generate),schemaVersion:authority?.schemaVersion||null});}},12000);
})();
