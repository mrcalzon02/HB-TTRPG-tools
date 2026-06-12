(() => {
  const ALIGNMENTS=['Any','Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];
  const SCHOOLS=['Auto','Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
  const css=`.module-spell-creator{border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}.msc-controls{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px}.msc-controls label{font-size:.78rem;color:var(--muted)}.msc-controls select,.msc-controls input{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px}.msc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.msc-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.msc-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:rgba(0,0,0,.16);margin-top:10px}.msc-card h3{color:var(--accent);margin-top:0}.msc-tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:3px 7px;margin:0 5px 5px 0;color:var(--muted);font-size:.75rem}.msc-card p{color:var(--muted);line-height:1.55}.msc-status{color:var(--muted);font-size:.82rem}.msc-audit{white-space:pre-wrap;max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px;background:#080a0f;color:var(--muted);font-size:.74rem}.msc-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.msc-stat{border:1px solid var(--line);border-radius:10px;padding:8px;background:rgba(0,0,0,.15);color:var(--muted)}.msc-balance{border-left:4px solid var(--accent);padding:10px 12px;background:rgba(200,138,53,.08);border-radius:8px}.msc-warning{color:#ffb7aa}.msc-section-title{margin:18px 0 8px;color:var(--accent)}@media(max-width:980px){.msc-controls{grid-template-columns:1fr 1fr}.msc-stat-grid{grid-template-columns:1fr}}`;

  let results=[];
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const options=obj=>Object.entries(obj).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');
  const simpleOptions=values=>values.map(value=>`<option value="${value}">${value}</option>`).join('');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function styleOnce(){if(document.getElementById('module-spell-creator-style'))return;const s=document.createElement('style');s.id='module-spell-creator-style';s.textContent=css;document.head.appendChild(s)}

  function init(){
    const V=window.HBSpellVocabulary,M=window.HBSpellMechanics;
    const host=document.getElementById('spell-creator-root');
    if(!V||!M||!host||document.getElementById('module-spell-creator-root'))return;
    styleOnce();
    const root=document.createElement('section');root.id='module-spell-creator-root';root.className='module-spell-creator';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">Generator bench</p><h2>Spell Creator</h2><p>Generate mechanically structured spells with expanded wording libraries for theme, class, effects, origin, complexity, morality, delivery, targeting, components, consequences, and scaling.</p></div><h3 class="msc-section-title">Identity and flavor</h3><div class="msc-controls"><label>Theme<select id="msc-theme">${options(V.THEMES)}</select></label><label>Level<select id="msc-level">${Array.from({length:10},(_,i)=>`<option value="${i}">${i?'Level '+i:'Cantrip'}</option>`).join('')}</select></label><label>Alignment<select id="msc-alignment">${simpleOptions(ALIGNMENTS)}</select></label><label>Class<select id="msc-class">${options(V.CLASSES)}</select></label><label>School<select id="msc-school">${simpleOptions(SCHOOLS)}</select></label><label>Competence / Complexity<select id="msc-competence">${options(V.COMPETENCE)}</select></label><label>Moral Tone<select id="msc-morality">${options(V.MORALITY)}</select></label><label>Quantity<input id="msc-quantity" type="number" min="1" max="20" value="1"></label></div><h3 class="msc-section-title">Rules package</h3><div class="msc-controls"><label>Spell Role<select id="msc-role"><option value="random">Random</option>${options(M.ROLES)}</select></label><label>Delivery Shape<select id="msc-shape"><option value="random">Random</option>${options(M.SHAPES)}</select></label><label>Damage / Energy Type<select id="msc-damage"><option value="random">Random</option>${simpleOptions(M.DAMAGE_TYPES)}</select></label><label>Save / Attack<select id="msc-save"><option value="random">Random</option>${simpleOptions(M.SAVES)}</select></label><label>Condition<select id="msc-condition"><option value="random">Random</option>${simpleOptions(M.CONDITIONS)}</select></label><label>Concentration<select id="msc-concentration"><option value="auto">Auto</option><option value="yes">Yes</option><option value="no">No</option></select></label><label>Ritual<select id="msc-ritual"><option value="auto">Auto</option><option value="yes">Yes</option><option value="no">No</option></select></label><label>Component Burden<select id="msc-component">${options(M.COMPONENT_BURDENS)}</select></label><label>Nominal Range (ft)<input id="msc-range-feet" type="number" min="0" max="5000" step="5" value="60"></label></div><div class="msc-actions"><button id="msc-generate" type="button">Generate Spells</button><button id="msc-copy" type="button">Copy Text</button><button id="msc-export" type="button">Export JSON</button><button id="msc-audit-toggle" type="button">Show Vocabulary Audit</button></div><p id="msc-status" class="msc-status">Ready.</p><pre id="msc-audit" class="msc-audit" hidden></pre><div id="msc-output"></div>`;
    host.appendChild(root);
    root.querySelector('#msc-generate').onclick=()=>generate(root,V,M);
    root.querySelector('#msc-copy').onclick=()=>copy(root,V);
    root.querySelector('#msc-export').onclick=()=>exportJson(root);
    root.querySelector('#msc-audit-toggle').onclick=()=>toggleAudit(root,V);
    generate(root,V,M);
  }

  function readMechanicalOptions(root,level){
    return {level,role:root.querySelector('#msc-role').value,shape:root.querySelector('#msc-shape').value,damageType:root.querySelector('#msc-damage').value,save:root.querySelector('#msc-save').value,condition:root.querySelector('#msc-condition').value,concentration:root.querySelector('#msc-concentration').value,ritual:root.querySelector('#msc-ritual').value,componentBurden:root.querySelector('#msc-component').value,rangeFeet:Number(root.querySelector('#msc-range-feet').value)||60};
  }

  function makeSpell(V,M,themeId,level,alignment,classId,requested,competenceId,moralityId,mechanicalOptions){
    const t=V.THEMES[themeId],c=V.CLASSES[classId],comp=V.COMPETENCE[competenceId],moral=V.MORALITY[moralityId];
    const school=requested==='Auto'?pick(c.schools):requested;
    const mechanics=M.buildMechanics(mechanicalOptions);
    const name=`${pick(moral.names)}: ${pick(comp.names)} of ${pick(t.names)}`;
    const effect=`${mechanics.rulesText} ${pick(comp.effects)} ${pick(moral.purposesExpanded)}`;
    const origin=`Origin: ${pick(t.origins)} ${pick(c.wording)}`;
    const description=`Description: ${pick(t.visuals)} ${pick(moral.flavorsExpanded)}`;
    const details=`Procedure: ${pick(comp.casting)} ${pick(V.GLOBAL.components)} ${pick(comp.sideEffects)} Component burden: ${M.COMPONENT_BURDENS[mechanics.componentBurden].text}.`;
    return {
      id:`spell-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name,theme:themeId,level,alignment,class:classId,school,competence:competenceId,morality:moralityId,
      castingTime:pick(V.GLOBAL.castingTimes),range:mechanics.rangeFeet===0?'Self':`${mechanics.rangeFeet} feet`,duration:mechanics.duration,components:'V, S, M',
      role:mechanics.role,shape:mechanics.shape,damageType:mechanics.damageType,save:mechanics.save,condition:mechanics.condition,concentration:mechanics.concentration,ritual:mechanics.ritual,componentBurden:mechanics.componentBurden,dice:mechanics.dice,
      effect,origin,description,details,higherLevels:pick(V.GLOBAL.higherLevels),balance:mechanics.balance
    };
  }

  function generate(root,V,M){
    const theme=root.querySelector('#msc-theme').value,level=Number(root.querySelector('#msc-level').value),alignment=root.querySelector('#msc-alignment').value,classId=root.querySelector('#msc-class').value,requested=root.querySelector('#msc-school').value,competence=root.querySelector('#msc-competence').value,morality=root.querySelector('#msc-morality').value,quantity=Math.max(1,Math.min(20,Number(root.querySelector('#msc-quantity').value)||1));
    const mechanics=readMechanicalOptions(root,level);
    results=Array.from({length:quantity},()=>makeSpell(V,M,theme,level,alignment,classId,requested,competence,morality,mechanics));
    render(root,V,M);
    root.querySelector('#msc-status').textContent=`Generated ${quantity} mechanically structured spell${quantity===1?'':'s'} using 70-plus-entry modulation pools.`;
  }

  function render(root,V,M){
    root.querySelector('#msc-output').innerHTML=results.map(s=>`<article class="msc-card"><h3>${esc(s.name)}</h3><span class="msc-tag">${esc(V.THEMES[s.theme].label)}</span><span class="msc-tag">${s.level?'Level '+s.level:'Cantrip'}</span><span class="msc-tag">${esc(V.CLASSES[s.class].label)}</span><span class="msc-tag">${esc(V.COMPETENCE[s.competence].label)}</span><span class="msc-tag">${esc(V.MORALITY[s.morality].label)}</span><span class="msc-tag">${esc(M.ROLES[s.role].label)}</span><span class="msc-tag">${esc(M.SHAPES[s.shape].label)}</span><div class="msc-stat-grid"><div class="msc-stat"><strong>Casting Time</strong><br>${esc(s.castingTime)}</div><div class="msc-stat"><strong>Range</strong><br>${esc(s.range)}</div><div class="msc-stat"><strong>Duration</strong><br>${esc(s.duration)}</div><div class="msc-stat"><strong>School</strong><br>${esc(s.school)}</div><div class="msc-stat"><strong>Save / Attack</strong><br>${esc(s.save)}</div><div class="msc-stat"><strong>Magnitude</strong><br>${esc(s.dice)} ${esc(s.damageType)}</div><div class="msc-stat"><strong>Condition</strong><br>${esc(s.condition)}</div><div class="msc-stat"><strong>Concentration</strong><br>${s.concentration?'Yes':'No'}</div><div class="msc-stat"><strong>Ritual</strong><br>${s.ritual?'Yes':'No'}</div></div><p><strong>Effect:</strong> ${esc(s.effect)}</p><p>${esc(s.origin)}</p><p>${esc(s.description)}</p><p>${esc(s.details)}</p><p><strong>Higher Levels:</strong> ${esc(s.higherLevels)}</p><div class="msc-balance"><strong>Balance estimate: ${esc(s.balance.band)}</strong> · score ${s.balance.score} / expected ${s.balance.expected}${s.balance.warnings.length?`<ul>${s.balance.warnings.map(w=>`<li class="msc-warning">${esc(w)}</li>`).join('')}</ul>`:''}</div></article>`).join('');
  }

  function spellText(s,V){return `${s.name}\n${s.level?'Level '+s.level:'Cantrip'} ${s.school}\n${V.CLASSES[s.class].label}; ${V.COMPETENCE[s.competence].label}; ${V.MORALITY[s.morality].label}\nRole: ${s.role}\nShape: ${s.shape}\nCasting Time: ${s.castingTime}\nRange: ${s.range}\nDuration: ${s.duration}\nComponents: ${s.components}\nSave / Attack: ${s.save}\nDamage Type: ${s.damageType}\nMagnitude: ${s.dice}\nCondition: ${s.condition}\nConcentration: ${s.concentration?'Yes':'No'}\nRitual: ${s.ritual?'Yes':'No'}\n\n${s.effect}\n\n${s.origin}\n${s.description}\n${s.details}\nHigher Levels: ${s.higherLevels}\n\nBalance: ${s.balance.band} (${s.balance.score}/${s.balance.expected})${s.balance.warnings.length?'\nWarnings: '+s.balance.warnings.join(' | '):''}`}
  async function copy(root,V){try{await navigator.clipboard.writeText(results.map(s=>spellText(s,V)).join('\n\n---\n\n'));root.querySelector('#msc-status').textContent='Spell text copied.'}catch(e){root.querySelector('#msc-status').textContent='Clipboard unavailable.'}}
  function exportJson(root){const blob=new Blob([JSON.stringify({schemaVersion:'0.4.0',generator:'module-spell-creator',spells:results},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='generated-spells.json';a.click();URL.revokeObjectURL(a.href);root.querySelector('#msc-status').textContent='Spell JSON exported.'}
  function toggleAudit(root,V){const box=root.querySelector('#msc-audit');box.hidden=!box.hidden;if(!box.hidden){const failures=Object.entries(V.counts).filter(([,count])=>count<70);box.textContent=`Vocabulary pools: ${Object.keys(V.counts).length}\nMinimum required per pool: 70\nPools below minimum: ${failures.length}\n\n${Object.entries(V.counts).sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>`${name}: ${count}`).join('\n')}`}}

  window.initStandaloneSpellCreator=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
