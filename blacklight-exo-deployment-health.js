(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const requiredFiles=[
    ['blacklight-exo-solar-system.html',['blacklight-exo-system-bootstrap.js','exo-generate-system']],
    ['blacklight-exo-system-bootstrap.js',['solar-core','loadCluster','loadRoutes']],
    ['blacklight-exo-runtime-supervisor.js',['blacklightExoRuntimeDiagnostics','unhandledrejection']],
    ['blacklight-exo-stellar-sector.html',['blacklight-exo-stellar-sector.js','exo-sector-generate']],
    ['blacklight-exo-stellar-sector-generator.js',['seeded-procedural-sector','taskForces']],
    ['blacklight-exo-stellar-sector-contracts.js',['controlledWorldIds','scientific']],
    ['blacklight-exo-stellar-sector.js',['blacklightExoStellarSectorArchive','IntersectionObserver']]
  ];
  let latestReport=null;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${ms} ms`)),ms))]);
  const criticalSolar=phase=>phase==='solar-bootstrap'||phase==='solar-core'||phase.startsWith('script:blacklight-exo-orbital-layout')||phase.startsWith('script:blacklight-exo-solar-system-v6');
  const criticalSector=phase=>phase==='stellar-sector-runtime'||phase==='window-error'||phase==='unhandled-promise'||phase.startsWith('script:');

  function setStatus(message,state='working'){$('exo-health-status').textContent=message;$('exo-health-status').dataset.state=state;$('exo-health-result').textContent=state;}
  function card(title,state,rows){const article=document.createElement('article');article.className='exo-health-card';const eyebrow=document.createElement('small');eyebrow.className=state==='pass'?'exo-health-pass':'exo-health-fail';eyebrow.textContent=state.toUpperCase();const heading=document.createElement('h3');heading.textContent=title;const dl=document.createElement('dl');for(const[label,value]of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);dl.append(dt,dd);}article.append(eyebrow,heading,dl);return article;}
  function addResult(title,state,rows){$('exo-health-grid').append(card(title,state,rows));}
  async function fetchText(path){const response=await fetch(`${path}?health=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}`);return response.text();}
  async function loadManifest(){try{const response=await fetch(`artifacts/exo-deployment-health.json?health=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}catch(error){return{recordType:'blacklightExoDeploymentHealth',status:'manifest-unavailable',commit:'unknown',builtAt:null,error:error.message};}}
  async function verifyFiles(){const results=[];for(const[path,signatures]of requiredFiles){try{const text=await fetchText(path),missing=signatures.filter(signature=>!text.includes(signature));results.push({path,ok:!missing.length,bytes:text.length,missing});}catch(error){results.push({path,ok:false,bytes:0,error:error.message,missing:signatures});}}return results;}

  function frameLoad(src){return new Promise((resolve,reject)=>{const frame=document.createElement('iframe');frame.className='exo-health-frame';frame.title=`Health test ${src}`;frame.src=`${src}?health=${Date.now()}`;frame.addEventListener('load',()=>resolve(frame),{once:true});frame.addEventListener('error',()=>reject(new Error(`${src} iframe failed to load`)),{once:true});document.body.append(frame);});}
  async function pollFrame(frame,predicate,label,limit=15000){const start=Date.now();while(Date.now()-start<limit){try{const result=predicate(frame.contentWindow,frame.contentDocument);if(result)return result;}catch(error){if(Date.now()-start>limit-500)throw error;}await sleep(120);}throw new Error(`${label} did not become ready within ${limit} ms`);}
  function supervisorReport(win){try{return win.BlacklightExoRuntimeSupervisor?.report?.()||{phases:[],failures:[]};}catch(error){return{phases:[],failures:[{phase:'health-inspection',message:error.message}]};}}

  async function verifySolar(){let frame,requested=false;try{frame=await timeout(frameLoad('blacklight-exo-solar-system.html'),10000,'Solar frame load');const evidence=await pollFrame(frame,(win,doc)=>{const system=win.BlacklightExoGetActiveSystem?.(),name=doc.getElementById('exo-summary-name')?.textContent,status=doc.getElementById('exo-cluster-status')?.textContent;if(system?.planets?.length&&name&&name!=='pending')return{system,name,status};const generate=doc.getElementById('exo-generate-system');if(!requested&&generate&&!generate.disabled){requested=true;generate.click();}return null;},'Solar lightweight runtime');const diagnostics=supervisorReport(frame.contentWindow),criticalFailures=(diagnostics.failures||[]).filter(item=>criticalSolar(item.phase));return{ok:criticalFailures.length===0,name:evidence.name,planets:evidence.system.planets.length,status:evidence.status,controlTriggered:requested,criticalFailures,diagnostics};}finally{frame?.remove();}}
  async function verifySector(){let frame,requested=false;try{frame=await timeout(frameLoad('blacklight-exo-stellar-sector.html'),10000,'Sector frame load');const evidence=await pollFrame(frame,(win,doc)=>{const sector=win.BlacklightExoGetActiveSector?.(),name=doc.getElementById('exo-sector-summary-name')?.textContent,status=doc.getElementById('exo-sector-status')?.textContent;if(sector?.clusters?.length>=24&&name&&name!=='loading')return{sector,name,status};const loadExample=doc.getElementById('exo-sector-load-example');if(!requested&&loadExample&&!loadExample.disabled){requested=true;loadExample.click();}return null;},'Stellar Sector runtime');const diagnostics=supervisorReport(frame.contentWindow),criticalFailures=(diagnostics.failures||[]).filter(item=>criticalSector(item.phase));return{ok:criticalFailures.length===0,name:evidence.name,clusters:evidence.sector.clusters.length,species:evidence.sector.species.length,worlds:evidence.sector.worlds?.length||0,status:evidence.status,controlTriggered:requested,criticalFailures,diagnostics};}finally{frame?.remove();}}

  async function run(){
    $('exo-health-run').disabled=true;$('exo-health-copy').disabled=true;$('exo-health-grid').replaceChildren();setStatus('Loading deployment manifest and verifying deployed files…');
    const report={recordType:'blacklightExoDeploymentBrowserReport',schemaVersion:'1.0.0',testedAt:new Date().toISOString(),page:location.href,manifest:null,files:[],solar:null,sector:null,passed:false};
    try{
      report.manifest=await loadManifest();$('exo-health-commit').textContent=report.manifest.commit||report.manifest.sha||'unknown';$('exo-health-built').textContent=report.manifest.builtAt||report.manifest.deployedAt||'unknown';
      report.files=await verifyFiles();const failedFiles=report.files.filter(item=>!item.ok);addResult('Pages artifact files',failedFiles.length?'fail':'pass',[['Checked',report.files.length],['Failed',failedFiles.length],['Commit',report.manifest.commit||'unknown']]);
      setStatus('Testing the deployed Solar System lightweight runtime…');
      try{report.solar=await verifySolar();addResult('Solar System runtime',report.solar.ok?'pass':'fail',[['System',report.solar.name],['Planets',report.solar.planets],['Generate invoked',report.solar.controlTriggered],['Status',report.solar.status],['Critical failures',report.solar.criticalFailures.length]]);}catch(error){report.solar={ok:false,error:error.message};addResult('Solar System runtime','fail',[['Error',error.message]]);}
      setStatus('Testing the deployed Stellar Sector authority…');
      try{report.sector=await verifySector();addResult('Stellar Sector runtime',report.sector.ok?'pass':'fail',[['Sector',report.sector.name],['Clusters',report.sector.clusters],['Species',report.sector.species],['Worlds',report.sector.worlds],['Load invoked',report.sector.controlTriggered],['Critical failures',report.sector.criticalFailures.length]]);}catch(error){report.sector={ok:false,error:error.message};addResult('Stellar Sector runtime','fail',[['Error',error.message]]);}
      report.passed=!failedFiles.length&&report.solar?.ok===true&&report.sector?.ok===true;setStatus(report.passed?'Deployment verification passed. Both generators initialized from the deployed Pages artifact.':'Deployment verification found one or more failures. Copy the report for exact file and runtime evidence.',report.passed?'pass':'fail');
    }catch(error){report.fatalError=error.message;setStatus(`Deployment verification could not complete: ${error.message}`,'fail');}
    latestReport=report;$('exo-health-log').textContent=JSON.stringify(report,null,2);$('exo-health-copy').disabled=false;$('exo-health-run').disabled=false;
  }

  $('exo-health-run')?.addEventListener('click',run);$('exo-health-copy')?.addEventListener('click',async()=>{if(!latestReport)return;const text=JSON.stringify(latestReport,null,2);try{await navigator.clipboard.writeText(text);$('exo-health-copy').textContent='Copied';}catch(_){const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand?.('copy');area.remove();}});run();
})();