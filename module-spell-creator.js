(() => {
  const THEMES = {
    arcane: { label:'Arcane', nouns:['Aegis','Lattice','Sigil','Prism','Convergence','Cipher'], verbs:['binds','fractures','reverses','distorts','anchors','duplicates'], visuals:['violet geometric light','rotating glyphs','glasslike motes','a halo of blue-white sparks'], origins:['an academy experiment','a lost imperial thesis','a duelist-mage tradition','a forbidden planar proof'] },
    divine: { label:'Divine', nouns:['Benediction','Judgment','Sanctuary','Litany','Covenant','Radiance'], verbs:['blesses','purifies','condemns','shields','reveals','restores'], visuals:['golden script','a choir-like resonance','white fire','a luminous holy seal'], origins:['a saint’s revelation','an ancient temple rite','a battlefield miracle','a covenant preserved by clergy'] },
    necromancy: { label:'Necromancy', nouns:['Grave','Ossuary','Dirge','Sepulcher','Pall','Requiem'], verbs:['drains','animates','withers','marks','summons','binds'], visuals:['green corpse-light','ashen vapor','skeletal hands beneath the floor','black funerary runes'], origins:['a tomb-king’s funerary rite','a plague-era grimoire','a bargain with the dead','a forbidden mortuary school'] },
    elemental: { label:'Elemental', nouns:['Pyre','Torrent','Tempest','Quake','Rime','Storm'], verbs:['erupts','engulfs','freezes','hurls','shatters','surges'], visuals:['spiraling elemental color','pressure ripples','burning sigils','condensing frost'], origins:['a primordial pact','a storm giant incantation','a volcanic cult formula','an elemental monastery'] },
    fey: { label:'Fey', nouns:['Glamour','Thorn','Moonveil','Revel','Briar','Midsummer'], verbs:['charms','misleads','transforms','conceals','entangles','beckons'], visuals:['silver pollen','flowering shadows','impossible moonlight','laughing motes'], origins:['a bargain at a moonlit crossing','an archfey’s courtly lesson','a stolen dryad song','a midsummer revel'] },
    infernal: { label:'Infernal', nouns:['Brand','Contract','Cinder','Chain','Edict','Damnation'], verbs:['brands','compels','burns','chains','extracts','punishes'], visuals:['red legal script','black iron chains','sulfurous flame','a seal of molten brass'], origins:['an infernal contract clause','a prison-warden rite','a devil’s legal codex','a condemned warlock’s confession'] },
    celestial: { label:'Celestial', nouns:['Starfall','Mercy','Dawn','Seraphic','Halo','Ascension'], verbs:['illuminates','heals','banishes','guides','protects','uplifts'], visuals:['starlight feathers','a radiant corona','harmonic chimes','descending beams'], origins:['a celestial visitation','an oracle’s dream','a hymn of the upper planes','a knightly revelation'] },
    shadow: { label:'Shadow', nouns:['Umbral','Eclipse','Nightglass','Shade','Gloam','Black Veil'], verbs:['conceals','silences','steals','duplicates','blinds','unmoors'], visuals:['ink-black mist','light folding inward','a second shadow moving late','cold grey afterimages'], origins:['a shadow-court secret','a thief-mage discipline','a planar eclipse','a manuscript written without light'] },
    psionic: { label:'Psionic', nouns:['Mindspike','Resonance','Ego','Thoughtform','Synapse','Will'], verbs:['overwhelms','links','suppresses','projects','rewrites','focuses'], visuals:['pressure behind the eyes','silent concentric waves','crystalline thought-shapes','a violet pulse'], origins:['a disciplined psychic order','an alien memory imprint','a mind-palace exercise','a psionic battlefield doctrine'] },
    nature: { label:'Nature', nouns:['Root','Bloom','Fang','Verdure','Wildheart','Season'], verbs:['grows','restores','ensnares','awakens','shapes','calls'], visuals:['rapid green growth','circling leaves','animal silhouettes','earth moving like breath'], origins:['a druidic seasonal rite','an elder tree memory','a beast-speaker tradition','a forgotten grove covenant'] }
  };

  const CLASSES = {
    wizard:{label:'Wizard',schools:['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'],casting:'Intelligence',flavor:'formulaic and carefully notated'},
    sorcerer:{label:'Sorcerer',schools:['Innate Arcana','Bloodline Manifestation','Elemental Expression','Wild Magic'],casting:'Charisma',flavor:'instinctive and emotionally charged'},
    cleric:{label:'Cleric',schools:['Protection','Healing','Judgment','Revelation','Communion'],casting:'Wisdom',flavor:'prayerful and doctrinal'},
    druid:{label:'Druid',schools:['Weather','Beast','Plant','Stone','Season'],casting:'Wisdom',flavor:'organic and ritualized'},
    bard:{label:'Bard',schools:['Performance','Glamour','Memory','Courage','Discord'],casting:'Charisma',flavor:'rhythmic and performative'},
    warlock:{label:'Warlock',schools:['Pact','Curse','Invocation','Patron Gift','Forbidden Knowledge'],casting:'Charisma',flavor:'contractual and dangerous'},
    paladin:{label:'Paladin',schools:['Oath','Smite','Ward','Mercy','Valor'],casting:'Charisma',flavor:'solemn and martial'},
    ranger:{label:'Ranger',schools:['Hunt','Pathfinding','Beastcraft','Ambush','Wilderness'],casting:'Wisdom',flavor:'practical and field-tested'},
    artificer:{label:'Artificer',schools:['Infusion','Construct','Alchemical','Ward Device','Arcane Mechanism'],casting:'Intelligence',flavor:'engineered and component-driven'},
    psion:{label:'Psion',schools:['Telepathy','Psychokinesis','Clairsentience','Metacreativity','Psychometabolism'],casting:'Intelligence',flavor:'precise and mentally disciplined'}
  };

  const ALIGNMENTS = ['Any','Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];
  const SCHOOLS = ['Auto','Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
  const css = `.module-spell-creator{margin-top:18px;border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}.msc-controls{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px;align-items:end}.msc-controls label{font-size:.78rem;color:var(--muted)}.msc-controls select,.msc-controls input{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 10px}.msc-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.msc-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.msc-actions button:hover{border-color:var(--accent)}.msc-output{display:grid;gap:12px}.msc-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:rgba(0,0,0,.16)}.msc-card h3{margin:0 0 8px;color:var(--accent)}.msc-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.msc-tag{border:1px solid var(--line);border-radius:999px;padding:3px 7px;color:var(--muted);font-size:.75rem}.msc-card p{color:var(--muted);line-height:1.55}.msc-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.msc-stat{border:1px solid var(--line);border-radius:10px;padding:8px;background:rgba(0,0,0,.15);color:var(--muted)}.msc-status{color:var(--muted);font-size:.82rem}@media(max-width:980px){.msc-controls{grid-template-columns:1fr 1fr}.msc-stat-grid{grid-template-columns:1fr}}`;

  let results=[];
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function styleOnce(){ if(document.getElementById('module-spell-creator-style'))return; const s=document.createElement('style'); s.id='module-spell-creator-style'; s.textContent=css; document.head.appendChild(s); }
  function themeOptions(){ return Object.entries(THEMES).map(([id,t])=>`<option value="${id}">${t.label}</option>`).join(''); }
  function classOptions(){ return Object.entries(CLASSES).map(([id,c])=>`<option value="${id}">${c.label}</option>`).join(''); }
  function alignmentOptions(){ return ALIGNMENTS.map(a=>`<option>${a}</option>`).join(''); }
  function schoolOptions(){ return SCHOOLS.map(s=>`<option>${s}</option>`).join(''); }

  function init(){
    styleOnce();
    const anchor=document.getElementById('module-random-dungeon-generator-root')||document.getElementById('module-content-filler-root')||document.getElementById('module-map-editor-root');
    if(!anchor||document.getElementById('module-spell-creator-root'))return;
    const root=document.createElement('section'); root.id='module-spell-creator-root'; root.className='module-spell-creator no-print';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">New module maker</p><h2>Spell Creator</h2><p>Create themed spells by level, alignment, and class with origin, appearance, description, mechanics, and detailed flavor filler.</p></div><div class="msc-controls"><label>Theme<select id="msc-theme">${themeOptions()}</select></label><label>Spell level<select id="msc-level">${Array.from({length:10},(_,i)=>`<option value="${i}">${i===0?'Cantrip':`Level ${i}`}</option>`).join('')}</select></label><label>Alignment<select id="msc-alignment">${alignmentOptions()}</select></label><label>Class<select id="msc-class">${classOptions()}</select></label><label>School<select id="msc-school">${schoolOptions()}</select></label><label>Quantity<input id="msc-quantity" type="number" min="1" max="20" value="1"></label></div><div class="msc-actions"><button id="msc-generate">Generate Spells</button><button id="msc-copy">Copy Text</button><button id="msc-export">Export JSON</button></div><p id="msc-status" class="msc-status">Ready.</p><div id="msc-output" class="msc-output"></div>`;
    anchor.insertAdjacentElement('afterend',root);
    root.querySelector('#msc-generate').onclick=()=>generate(root);
    root.querySelector('#msc-copy').onclick=()=>copy(root);
    root.querySelector('#msc-export').onclick=()=>exportJson(root);
    generate(root);
  }

  function generate(root){
    const themeId=root.querySelector('#msc-theme').value, level=Number(root.querySelector('#msc-level').value), alignment=root.querySelector('#msc-alignment').value, classId=root.querySelector('#msc-class').value, requested=root.querySelector('#msc-school').value, quantity=Math.max(1,Math.min(20,Number(root.querySelector('#msc-quantity').value)||1));
    results=Array.from({length:quantity},()=>makeSpell(themeId,level,alignment,classId,requested)); render(root); root.querySelector('#msc-status').textContent=`Generated ${results.length} spell${results.length===1?'':'s'}.`;
  }

  function makeSpell(themeId,level,alignment,classId,requested){
    const t=THEMES[themeId], c=CLASSES[classId], school=requested==='Auto'?pick(c.schools):requested;
    const name=`${pick(t.nouns)} ${pick(['Ward','Invocation','Burst','Veil','Edict','Step','Seal','Touch','Mantle','Ray'])}`;
    const range=level===0?'30 feet':pick(['Self','Touch','60 feet','90 feet','120 feet',`${30+level*10} feet`]);
    const duration=pick(level<2?['Instantaneous','1 round','Concentration, up to 1 minute']:['Instantaneous','1 minute','Concentration, up to 10 minutes','1 hour']);
    const casting=pick(['1 action','1 bonus action','1 reaction','1 minute']);
    const die=level===0?'1d8':`${Math.max(1,level+1)}d${level<3?6:level<6?8:10}`;
    const save=pick(['Dexterity','Constitution','Wisdom','Charisma','none']);
    const effect=`The spell ${pick(t.verbs)} a target or area within range. On a failed ${save==='none'?'appropriate check':save+' saving throw'}, it suffers ${die} ${pick(['force','radiant','necrotic','fire','cold','psychic','lightning'])} damage or an equivalent control effect appropriate to ${school}.`;
    const origin=`Origin: Developed from ${pick(t.origins)}, it spread among ${c.label.toLowerCase()} circles because its structure is ${c.flavor}.`;
    const description=`Description: ${pick(t.visuals)} gathers around the caster before the magic takes effect. Witnesses often describe the phenomenon as unmistakably ${t.label.toLowerCase()}.`;
    const details=`Details: Verbal components resemble ${pick(['a clipped command','a sustained chant','a whispered theorem','a sung refrain'])}; somatic components use ${pick(['a crossing gesture','a traced spiral','a clenched sigil','an open-handed release'])}; material focus is ${pick(['a shard of colored glass','a marked coin','a pinch of ash','a carved seed','a drop of lamp oil'])}.`;
    const alignmentFlavor=alignment==='Any'?'The spell has no fixed moral resonance.':`Its aura carries a faint ${alignment.toLowerCase()} resonance that trained diviners can recognize.`;
    return {id:`spell-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,theme:themeId,level,alignment,class:classId,school,castingTime:casting,range,duration,components:'V, S, M',effect,origin,description,details,alignmentFlavor,higherLevels:level===0?'Damage increases at standard cantrip progression.':`At Higher Levels: Increase damage, targets, or duration by one step for each slot level above ${level}.`};
  }

  function render(root){ const out=root.querySelector('#msc-output'); out.innerHTML=results.map(s=>`<article class="msc-card"><h3>${s.name}</h3><div class="msc-meta"><span class="msc-tag">${THEMES[s.theme].label}</span><span class="msc-tag">${s.level===0?'Cantrip':`Level ${s.level}`}</span><span class="msc-tag">${CLASSES[s.class].label}</span><span class="msc-tag">${s.school}</span><span class="msc-tag">${s.alignment}</span></div><div class="msc-stat-grid"><div class="msc-stat"><strong>Casting Time</strong><br>${s.castingTime}</div><div class="msc-stat"><strong>Range</strong><br>${s.range}</div><div class="msc-stat"><strong>Duration</strong><br>${s.duration}</div><div class="msc-stat"><strong>Components</strong><br>${s.components}</div></div><p><strong>Effect:</strong> ${s.effect}</p><p>${s.origin}</p><p>${s.description}</p><p>${s.details}</p><p>${s.alignmentFlavor}</p><p>${s.higherLevels}</p></article>`).join(''); }
  function toText(s){ return `${s.name}\n${s.level===0?'Cantrip':`Level ${s.level}`} ${s.school} (${CLASSES[s.class].label}; ${s.alignment})\nCasting Time: ${s.castingTime}\nRange: ${s.range}\nComponents: ${s.components}\nDuration: ${s.duration}\n\n${s.effect}\n\n${s.origin}\n${s.description}\n${s.details}\n${s.alignmentFlavor}\n${s.higherLevels}`; }
  async function copy(root){ try{ await navigator.clipboard.writeText(results.map(toText).join('\n\n---\n\n')); root.querySelector('#msc-status').textContent='Spell text copied.'; }catch(e){ root.querySelector('#msc-status').textContent='Clipboard unavailable.'; } }
  function exportJson(root){ const blob=new Blob([JSON.stringify({schemaVersion:'0.1.0',generator:'module-spell-creator',spells:results},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='generated-spells.json'; a.click(); URL.revokeObjectURL(a.href); root.querySelector('#msc-status').textContent='Spell JSON exported.'; }

  const observer=new MutationObserver(init); observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
