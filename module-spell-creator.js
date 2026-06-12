(() => {
  const ALIGNMENTS=['Any','Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];
  const SCHOOLS=['Auto','Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
  const css=`.module-spell-creator{border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}.msc-controls{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px}.msc-controls label{font-size:.78rem;color:var(--muted)}.msc-controls select,.msc-controls input{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px}.msc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.msc-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.msc-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:rgba(0,0,0,.16);margin-top:10px}.msc-card h3{color:var(--accent);margin-top:0}.msc-tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:3px 7px;margin:0 5px 5px 0;color:var(--muted);font-size:.75rem}.msc-card p{color:var(--muted);line-height:1.55}.msc-status{color:var(--muted);font-size:.82rem}.msc-audit{white-space:pre-wrap;max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px;background:#080a0f;color:var(--muted);font-size:.74rem}.msc-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.msc-stat{border:1px solid var(--line);border-radius:10px;padding:8px;background:rgba(0,0,0,.15);color:var(--muted)}@media(max-width:980px){.msc-controls{grid-template-columns:1fr 1fr}.msc-stat-grid{grid-template-columns:1fr}}`;

  let results=[];
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const options=obj=>Object.entries(obj).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function styleOnce(){if(document.getElementById('module-spell-creator-style'))return;const s=document.createElement('style');s.id='module-spell-creator-style';s.textContent=css;document.head.appendChild(s)}

  function init(){
    const V=window.HBSpellVocabulary;
    const host=document.getElementById('spell-creator-root');
    if(!V||!host||document.getElementById('module-spell-creator-root'))return;
    styleOnce();
    const root=document.createElement('section');root.id='module-spell-creator-root';root.className='module-spell-creator';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">Generator bench</p><h2>Spell Creator</h2><p>Generate spells with expanded wording libraries for theme, class, effects, origin, complexity, morality, delivery, targeting, components, consequences, and scaling.</p></div><div class="msc-controls"><label>Theme<select id="msc-theme">${options(V.THEMES)}</select></label><label>Level<select id="msc-level">${Array.from({length:10},(_,i)=>`<option value="${i}">${i?'Level '+i:'Cantrip'}</option>`).join('')}</select></label><label>Alignment<select id="msc-alignment">${ALIGNMENTS.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Class<select id="msc-class">${options(V.CLASSES)}</select></label><label>School<select id="msc-school">${SCHOOLS.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Competence / Complexity<select id="msc-competence">${options(V.COMPETENCE)}</select></label><label>Moral Tone<select id="msc-morality">${options(V.MORALITY)}</select></label><label>Quantity<input id="msc-quantity" type="number" min="1" max="20" value="1"></label></div><div class="msc-actions"><button id="msc-generate" type="button">Generate Spells</button><button id="msc-copy" type="button">Copy Text</button><button id="msc-export" type="button">Export JSON</button><button id="msc-audit-toggle" type="button">Show Vocabulary Audit</button></div><p id="msc-status" class="msc-status">Ready.</p><pre id="msc-audit" class="msc-audit" hidden></pre><div id="msc-output"></div>`;
    host.appendChild(root);
    root.querySelector('#msc-generate').onclick=()=>generate(root,V);
    root.querySelector('#msc-copy').onclick=()=>copy(root,V);
    root.querySelector('#msc-export').onclick=()=>exportJson(root);
    root.querySelector('#msc-audit-toggle').onclick=()=>toggleAudit(root,V);
    generate(root,V);
  }

  function makeSpell(V,themeId,level,alignment,classId,requested,competenceId,moralityId){
    const t=V.THEMES[themeId],c=V.CLASSES[classId],comp=V.COMPETENCE[competenceId],moral=V.MORALITY[moralityId];
    const school=requested==='Auto'?pick(c.schools):requested;
    const name=`${pick(moral.names)}: ${pick(comp.names)} of ${pick(t.names)}`;
    const damage=level===0?'1d6':`${Math.max(1,level+1)}d${level<3?6:level<6?8:10}`;
    const effect=`${pick(comp.effects)} ${pick(moral.purposesExpanded)} ${pick(V.GLOBAL.targets)} ${pick(V.GLOBAL.resolutions)} Base magnitude: ${damage} damage, healing, protection, movement, or equivalent control appropriate to ${school}.`;
    const origin=`Origin: ${pick(t.origins)} ${pick(c.wording)}`;
    const description=`Description: ${pick(t.visuals)} ${pick(moral.flavorsExpanded)}`;
    const details=`Procedure: ${pick(comp.casting)} ${pick(V.GLOBAL.components)} ${pick(comp.sideEffects)}`;
    return {
      id:`spell-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name,theme:themeId,level,alignment,class:classId,school,competence:competenceId,morality:moralityId,
      castingTime:pick(V.GLOBAL.castingTimes),range:pick(V.GLOBAL.ranges),duration:pick(V.GLOBAL.durations),components:'V, S, M',
      effect,origin,description,details,higherLevels:pick(V.GLOBAL.higherLevels)
    };
  }

  function generate(root,V){
    const theme=root.querySelector('#msc-theme').value,level=Number(root.querySelector('#msc-level').value),alignment=root.querySelector('#msc-alignment').value,classId=root.querySelector('#msc-class').value,requested=root.querySelector('#msc-school').value,competence=root.querySelector('#msc-competence').value,morality=root.querySelector('#msc-morality').value,quantity=Math.max(1,Math.min(20,Number(root.querySelector('#msc-quantity').value)||1));
    results=Array.from({length:quantity},()=>makeSpell(V,theme,level,alignment,classId,requested,competence,morality));
    render(root,V);
    root.querySelector('#msc-status').textContent=`Generated ${quantity} spell${quantity===1?'':'s'} using 70-plus-entry modulation pools.`;
  }

  function render(root,V){
    root.querySelector('#msc-output').innerHTML=results.map(s=>`<article class="msc-card"><h3>${esc(s.name)}</h3><span class="msc-tag">${esc(V.THEMES[s.theme].label)}</span><span class="msc-tag">${s.level?'Level '+s.level:'Cantrip'}</span><span class="msc-tag">${esc(V.CLASSES[s.class].label)}</span><span class="msc-tag">${esc(V.COMPETENCE[s.competence].label)}</span><span class="msc-tag">${esc(V.MORALITY[s.morality].label)}</span><div class="msc-stat-grid"><div class="msc-stat"><strong>Casting Time</strong><br>${esc(s.castingTime)}</div><div class="msc-stat"><strong>Range</strong><br>${esc(s.range)}</div><div class="msc-stat"><strong>Duration</strong><br>${esc(s.duration)}</div><div class="msc-stat"><strong>School</strong><br>${esc(s.school)}</div></div><p><strong>Effect:</strong> ${esc(s.effect)}</p><p>${esc(s.origin)}</p><p>${esc(s.description)}</p><p>${esc(s.details)}</p><p><strong>Higher Levels:</strong> ${esc(s.higherLevels)}</p></article>`).join('');
  }

  function spellText(s,V){return `${s.name}\n${s.level?'Level '+s.level:'Cantrip'} ${s.school}\n${V.CLASSES[s.class].label}; ${V.COMPETENCE[s.competence].label}; ${V.MORALITY[s.morality].label}\nCasting Time: ${s.castingTime}\nRange: ${s.range}\nDuration: ${s.duration}\nComponents: ${s.components}\n\n${s.effect}\n\n${s.origin}\n${s.description}\n${s.details}\nHigher Levels: ${s.higherLevels}`}
  async function copy(root,V){try{await navigator.clipboard.writeText(results.map(s=>spellText(s,V)).join('\n\n---\n\n'));root.querySelector('#msc-status').textContent='Spell text copied.'}catch(e){root.querySelector('#msc-status').textContent='Clipboard unavailable.'}}
  function exportJson(root){const blob=new Blob([JSON.stringify({schemaVersion:'0.3.0',generator:'module-spell-creator',spells:results},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='generated-spells.json';a.click();URL.revokeObjectURL(a.href);root.querySelector('#msc-status').textContent='Spell JSON exported.'}
  function toggleAudit(root,V){const box=root.querySelector('#msc-audit');box.hidden=!box.hidden;if(!box.hidden){const failures=Object.entries(V.counts).filter(([,count])=>count<70);box.textContent=`Vocabulary pools: ${Object.keys(V.counts).length}\nMinimum required per pool: 70\nPools below minimum: ${failures.length}\n\n${Object.entries(V.counts).sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>`${name}: ${count}`).join('\n')}`}}

  window.initStandaloneSpellCreator=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
