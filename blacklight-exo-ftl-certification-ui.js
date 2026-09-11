(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const SAFETY_SCRIPTS=[
    'blacklight-exo-ftl-safety-calibration-runtime.js',
    'blacklight-exo-ftl-safety-certification-runtime.js',
    'blacklight-exo-ftl-route-safety-runtime.js'
  ];
  let safetyLoadPromise=null;
  let activeSafety=null;
  let generationToken=0;

  function anchor(id){return $(id)?.closest('.bli-section')||$('exo-ftl-route-envelope')?.closest('.bli-section')||$('exo-ftl-reliability')?.closest('.bli-section');}
  function section(id,eyebrow,title,anchorId,className='exo-ftl-grid'){let box=$(id);if(box)return box;const a=anchor(anchorId);if(!a)return null;const s=document.createElement('section');s.className='bli-section exo-ftl-certification-section';const h=document.createElement('div');h.className='bli-section-head';const e=document.createElement('p');e.className='bli-eyebrow';e.textContent=eyebrow;const t=document.createElement('h2');t.textContent=title;box=document.createElement('div');box.id=id;box.className=className;h.append(e,t);s.append(h,box);a.after(s);return box;}
  function card(label,title,text,state=''){const a=document.createElement('article');a.className='exo-ftl-card exo-ftl-certification-card';if(state)a.dataset.certificationState=state;const s=document.createElement('small'),h=document.createElement('h3'),p=document.createElement('p');s.textContent=label;h.textContent=title;p.textContent=text;a.append(s,h,p);return a;}
  function list(title,items){const a=document.createElement('article');a.className='exo-ftl-calculation-list';const h=document.createElement('h3'),ul=document.createElement('ul');h.textContent=title;for(const item of items){const li=document.createElement('li');li.textContent=item;ul.append(li);}a.append(h,ul);return a;}
  function calculation(item){return card('Calculation and operational meaning',item.label,`${item.expression}. Values entered: ${item.substitution}. Result: ${item.resultText}. Charles's interpretation: ${item.meaning}`);}
  function state(value){return value==='refused'||value==='restricted'||['REJECTED','UNRESOLVED','CONFLICT','MARGINAL'].includes(value)?'warning':value==='authorized'||value==='ADMISSIBLE'?'ok':'resolved';}
  function badge(a){const b=$('exo-ftl-badges');if(!b)return;b.querySelector('[data-certification-audit-badge="true"]')?.remove();const s=document.createElement('span');s.dataset.certificationAuditBadge='true';s.textContent=`Charles authorization · ${a.status}`;b.append(s);}
  function safetyBadge(safety){const b=$('exo-ftl-badges');if(!b)return;b.querySelector('[data-route-safety-badge="true"]')?.remove();if(!safety)return;const s=document.createElement('span');s.dataset.routeSafetyBadge='true';s.textContent=`Route certificate · ${safety.status}`;b.append(s);}
  function overview(a){const c=section('exo-ftl-certification-overview','Charles // authorization finding','What I would authorize, restrict, or refuse before anyone energizes the machine.','exo-ftl-calculation-consistency');if(!c)return;c.replaceChildren(card('Current dossier disposition',a.statusLabel,a.reason,state(a.status)),card('Authority limit','A dossier is not live clearance',a.standingLimit,'warning'),card('Preservation record','Original operational records retained',a.preservationRecord.method),card('Route finding',a.route.status,a.route.standingFinding,state(a.route.status)),card('Reliability finding',a.reliability.status,a.reliability.standingFinding,state(a.reliability.status)));}
  function route(a){const r=a.route,c=section('exo-ftl-certification-route','Charles // route authorization','The route geometry, traffic burden, mass-map tolerance, and live evidence I require.','exo-ftl-route-envelope','exo-ftl-calculation-stack');if(!c)return;const top=document.createElement('div');top.className='exo-ftl-grid';top.append(card('Route-model confidence',r.confidenceText,'Confidence describes the generated route model. Live clearance remains unestablished.'),card('Live route state',r.liveClearance,r.standingFinding,state(r.status)),card('Required evidence',`${r.liveDataRequired.length} live records`,r.liveDataRequired.join(' · ')));const assumptions=document.createElement('div');assumptions.className='exo-ftl-list-grid';assumptions.append(list('Assumptions I inherited',r.assumptions),list('Conditions that stop authorization',r.refusalConditions));const calculations=document.createElement('div');calculations.className='exo-ftl-grid';calculations.append(...r.calculations.map(calculation));c.replaceChildren(top,assumptions,calculations);}
  function reliability(a){const r=a.reliability,c=section('exo-ftl-certification-reliability','Charles // reliability authorization','The repeated-use risk, calibration burden, abort authority, and redundancy standard.','exo-ftl-reliability','exo-ftl-calculation-stack');if(!c)return;const top=document.createElement('div');top.className='exo-ftl-grid';top.append(card('Reliability disposition',r.status,r.standingFinding,state(r.status)),card('Installation policy',r.policy.class,`${r.policy.minimumSuccessText}. ${r.policy.note}`),card('Reliability-model confidence',r.confidenceText,'This remains a generated engineering estimate rather than field-service statistics.'));const assumptions=document.createElement('div');assumptions.className='exo-ftl-list-grid';assumptions.append(list('Assumptions I inherited',r.assumptions),list('Conditions that stop certification',r.refusalConditions));const calculations=document.createElement('div');calculations.className='exo-ftl-grid';calculations.append(...r.calculations.map(calculation));c.replaceChildren(top,assumptions,calculations);}

  function scriptLoaded(src){return [...document.scripts].some(node=>node.getAttribute('src')===src||node.src.endsWith(`/${src}`));}
  function loadScript(src){
    if(scriptLoaded(src))return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const node=document.createElement('script');
      node.src=src;
      node.async=false;
      node.dataset.routeSafetyRuntime='true';
      node.addEventListener('load',resolve,{once:true});
      node.addEventListener('error',()=>reject(new Error(`Unable to load ${src}`)),{once:true});
      document.head.append(node);
    });
  }
  function ensureSafetyRuntime(){
    if(globalThis.BlacklightExoFTLRouteSafetyRuntime)return Promise.resolve(globalThis.BlacklightExoFTLRouteSafetyRuntime);
    if(!safetyLoadPromise){
      safetyLoadPromise=SAFETY_SCRIPTS.reduce((chain,src)=>chain.then(()=>loadScript(src)),Promise.resolve())
        .then(()=>{
          if(!globalThis.BlacklightExoFTLRouteSafetyRuntime)throw new Error('FTL route-safety runtime failed to initialize.');
          return globalThis.BlacklightExoFTLRouteSafetyRuntime;
        })
        .catch(error=>{safetyLoadPromise=null;throw error;});
    }
    return safetyLoadPromise;
  }

  function requestFromPage(rating){
    return {
      family:$('exo-ftl-family')?.value||rating?.identity?.familyKey||null,
      route:$('exo-ftl-route')?.value||null
    };
  }

  function renderSafety(rating,safety){
    activeSafety=safety;
    globalThis.BlacklightExoGetActiveFTLSafety=()=>activeSafety;
    safetyBadge(safety);
    const c=section('exo-ftl-route-safety-live','Charles // modeled route safety certificate','Generated performance is not certification. This gate applies family-specific environment, uncertainty, observability, intervention, and recovery rules before a route is presented as usable.','exo-ftl-certification-route','exo-ftl-calculation-stack');
    if(c){
      const reasons=safety?.presentation?.reasons||safety?.warnings||[];
      const certificate=safety?.certificate||{};
      const response=certificate.familyResponse||{};
      const horizon=certificate.lookahead||certificate.safetyHorizon||{};
      const recovery=certificate.recovery||certificate.recoveryState||{};
      const calibration=safety?.calibration||{};
      const top=document.createElement('div');top.className='exo-ftl-grid';
      top.append(
        card('Route certificate',safety?.presentation?.label||safety?.status||'UNRESOLVED',reasons.length?reasons.join(' · '):'No blocking reason was returned by the modeled certificate.',state(safety?.status)),
        card('Family / route',`${safety?.family||'unresolved'} · ${safety?.route||'unresolved'}`,`Safety path ${safety?.path||'unresolved'}. Generated architecture remains ${rating?.identity?.name||'unnamed'}.`),
        card('Calibration provenance',calibration.profileIdentity||'unresolved',`Calibration status ${calibration.status||'UNRESOLVED'}. Numerical profiles are simulation calibration, not setting constants.`,state(calibration.status)),
        card('Gravity efficiency',Number.isFinite(Number(response.gravityEfficiency))?`${(Number(response.gravityEfficiency)*100).toFixed(2)}%`:'unresolved','Family-specific route efficiency after modeled gravitational/environmental penalty.'),
        card('Calculation efficiency',Number.isFinite(Number(response.calculationEfficiency))?`${(Number(response.calculationEfficiency)*100).toFixed(2)}%`:'unresolved','Efficiency retained after uncertainty and family-specific miscalculation amplification.'),
        card('Recovery protection',Number.isFinite(Number(recovery.protectedReserve))?String(recovery.protectedReserve):'modeled by certificate','Protected recovery authority is not available for nominal performance optimization.')
      );
      const details=document.createElement('div');details.className='exo-ftl-list-grid';
      details.append(
        list('Certificate reasons / warnings',reasons.length?reasons:['No blocking warnings returned.']),
        list('Provenance',safety?.provenance?.length?safety.provenance:['No provenance roots returned.'])
      );
      c.replaceChildren(top,details);
    }

    const summary=$('exo-ftl-summary-speed');
    if(summary){
      const blocked=safety?.presentation?.blocking;
      if(blocked)summary.textContent=safety.presentation.label;
      else if(safety?.status==='MARGINAL')summary.textContent=`${rating?.performance?.cStatus?.label||'Generated rate'} · MARGINAL`;
      else if(safety?.status==='ADMISSIBLE')summary.textContent=`${rating?.performance?.cStatus?.label||'Generated rate'} · CERTIFIED`;
      else summary.textContent=safety?.presentation?.label||'Certification unresolved';
      summary.dataset.routeCertification=safety?.status||'UNRESOLVED';
    }
  }

  async function certifyGeneratedRating(rating){
    if(!rating)return;
    const token=++generationToken;
    try{
      const runtime=await ensureSafetyRuntime();
      const safety=await runtime.resolveGeneratedFTLRouteSafety({rating,request:requestFromPage(rating)});
      if(token!==generationToken)return;
      renderSafety(rating,safety);
    }catch(error){
      if(token!==generationToken)return;
      console.error('Unable to resolve FTL route safety certificate.',error);
      renderSafety(rating,{status:'UNRESOLVED',presentation:{label:'Unresolved — certification runtime unavailable',blocking:true,reasons:[error.message]},warnings:[error.message],provenance:[]});
    }
  }

  function render(rating){const a=rating?.certificationAudit;if(a){badge(a);overview(a);route(a);reliability(a);}certifyGeneratedRating(rating);}

  function exportCertifiedDossier(event){
    const rating=globalThis.BlacklightExoGetActiveFTL?.();
    if(!rating||!activeSafety)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload={
      ...rating,
      routeSafetyCertificate:activeSafety,
      certificationExport:{
        schemaVersion:'1.0.0',
        generatedCapabilityIsNotRouteCertification:true,
        blocked:Boolean(activeSafety.presentation?.blocking),
        status:activeSafety.status,
        provenance:[...(activeSafety.provenance||[])]
      }
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;
    link.download=rating.fileName||'blacklight-ftl-dossier.json';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('blacklight:exo-ftl-generated',event=>render(event.detail?.rating));
  $('exo-ftl-export')?.addEventListener('click',exportCertifiedDossier,true);
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveFTL?.()));
})();
