(() => {
"use strict";
const wrap=document.getElementById("fmpl-results");if(!wrap)return;
const summary=document.getElementById("fmpl-summary"),count=document.getElementById("fmpl-count");
const search=document.getElementById("fmpl-search"),kind=document.getElementById("fmpl-kind");
const node=(tag,txt,cls)=>{const e=document.createElement(tag);e.textContent=String(txt??"");if(cls)e.className=cls;return e};
function safe(url){try{const u=new URL(url);return u.protocol==="https:"&&u.hostname==="github.com"&&u.pathname.startsWith("/mrcalzon02/")?u.href:null}catch{return null}}
function create(r){
 const card=node("article","","fmpl-card");
 card.append(node("h3",r.id),node("small",r.kind+" · "+(r.status||"registered")),
             node("p",r.summary||"Indexed FMPL source","fmpl-note"));
 const link=safe(r.href);
 if(link){const a=node("a","View pinned source");a.href=link;a.target="_blank";a.rel="noopener noreferrer";card.append(a)}
 else card.append(node("p","Private source; not publicly mirrored","fmpl-note"));
 return card;
}
fetch("api/ai/fmpl-library.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("FMPL not available");return r.json()}).then(d=>{
 if(d.schema!=="hb-fmpl-directory.v1"||!Array.isArray(d.records))throw Error("FMPL schema mismatch");
 const i=d.inventory;
 summary.textContent="FMPL v"+d.canonical.version+" · pinned "+d.canonical.commit.slice(0,12)+" · "+i.models+" models · "+i.programs+" programs · "+i.pipelines+" pipelines · "+i.materials+" PBR presets / "+i.pbr_maps+" maps · "+i.verified_parts+" verified shared parts";
 function render(){const q=search.value.toLowerCase().trim(),k=kind.value;
  const rows=d.records.filter(r=>(k==="all"||r.kind===k)&&(!q||[r.id,r.status,r.summary,r.kind].some(v=>String(v??"").toLowerCase().includes(q))));
  wrap.replaceChildren(...rows.map(create));if(!rows.length)wrap.append(node("p","No matching assets."));
  count.textContent=rows.length+" of "+d.records.length+" records";
 }
 search.addEventListener("input",render);kind.addEventListener("change",render);render();
}).catch(()=>{summary.textContent="Local catalog unavailable: use the pinned canonical source link.";count.textContent="Catalog could not be read.";});
})();
