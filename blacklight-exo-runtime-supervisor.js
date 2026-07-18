(() => {
  'use strict';
  if(globalThis.BlacklightExoRuntimeSupervisor)return;
  const startedAt=Date.now(),phases=new Map(),failures=[];
  let panel=null,list=null,badge=null;
  const now=()=>new Date().toISOString();
  const text=value=>value instanceof Error?(value.stack||value.message):String(value?.reason||value?.message||value||'Unknown runtime failure');
  function ensurePanel(){
    if(panel||!document?.body)return panel;
    panel=document.createElement('aside');panel.id='exo-runtime-supervisor';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
    panel.style.cssText='position:fixed;right:14px;bottom:14px;z-index:99999;width:min(430px,calc(100vw - 28px));max-height:48vh;overflow:auto;border:1px solid rgba(217,168,79,.55);border-radius:12px;background:rgba(5,8,12,.96);color:#ded7cb;padding:12px;box-shadow:0 12px 35px rgba(0,0,0,.55);font:13px/1.45 system-ui,sans-serif';
    const head=document.createElement('div');head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px';
    const title=document.createElement('strong');title.textContent='EXO Runtime Supervisor';
    badge=document.createElement('span');badge.textContent='healthy';badge.style.cssText='font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8fd2a8';
    const controls=document.createElement('div');controls.style.cssText='display:flex;gap:6px;margin-top:9px';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Copy diagnostics';
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Dismiss';
    for(const button of[copy,dismiss])button.style.cssText='border:1px solid rgba(217,168,79,.35);border-radius:7px;background:#111820;color:#e4dccf;padding:5px 8px;cursor:pointer';
    copy.addEventListener('click',async()=>{const report=JSON.stringify(api.report(),null,2);try{await navigator.clipboard.writeText(report);copy.textContent='Copied';}catch(_){const area=document.createElement('textarea');area.value=report;document.body.append(area);area.select();document.execCommand?.('copy');area.remove();copy.textContent='Copied';}});
    dismiss.addEventListener('click',()=>{panel.hidden=true;});
    list=document.createElement('ol');list.style.cssText='margin:10px 0 0;padding-left:22px';
    head.append(title,badge);controls.append(copy,dismiss);panel.append(head,controls,list);document.body.append(panel);return panel;
  }
  function persist(){try{sessionStorage.setItem('blacklight-exo-runtime-diagnostics',JSON.stringify(api.report()));}catch(_){}}
  function render(){ensurePanel();if(!panel)return;list.replaceChildren();for(const failure of failures.slice(-8)){const item=document.createElement('li');item.style.cssText='margin:7px 0;overflow-wrap:anywhere;color:#e7b1a7';item.textContent=`${failure.phase}: ${failure.message}`;list.append(item);}badge.textContent=failures.length?`${failures.length} failure${failures.length===1?'':'s'}`:'healthy';badge.style.color=failures.length?'#e5a095':'#8fd2a8';panel.hidden=!failures.length;persist();}
  function start(name,details={}){phases.set(name,{name,state:'working',startedAt:now(),details});persist();return name;}
  function ready(name,details={}){const previous=phases.get(name)||{name,startedAt:now()};phases.set(name,{...previous,state:'ready',finishedAt:now(),details:{...(previous.details||{}),...details}});persist();}
  function fail(name,error,details={}){const message=text(error),previous=phases.get(name)||{name,startedAt:now()};phases.set(name,{...previous,state:'failed',finishedAt:now(),message,details:{...(previous.details||{}),...details}});failures.push({phase:name,message,at:now(),details});console.error(`[Blacklight EXO] ${name} failed:`,error);render();}
  function guard(name,operation){start(name);try{const result=operation();if(result&&typeof result.then==='function')return result.then(value=>{ready(name);return value;}).catch(error=>{fail(name,error);throw error;});ready(name);return result;}catch(error){fail(name,error);throw error;}}
  const api=Object.freeze({version:1,start,ready,fail,guard,report:()=>({recordType:'blacklightExoRuntimeDiagnostics',version:1,page:location?.href||'',userAgent:navigator?.userAgent||'',startedAt:new Date(startedAt).toISOString(),capturedAt:now(),phases:[...phases.values()],failures:[...failures]})});
  globalThis.BlacklightExoRuntimeSupervisor=api;
  globalThis.addEventListener?.('error',event=>fail(event.filename?`script:${event.filename.split('/').pop()}`:'window-error',event.error||event.message,{line:event.lineno,column:event.colno}),true);
  globalThis.addEventListener?.('unhandledrejection',event=>fail('unhandled-promise',event.reason));
  if(document?.readyState==='loading')document.addEventListener('DOMContentLoaded',ensurePanel,{once:true});else ensurePanel();
})();