(() => {
  const THEMES = {
    mixed: { label:'Mixed Dungeon', materials:['rough masonry','cracked flagstone','old timber','black iron','green-stained bronze'], moods:['abandoned','watchful','uneasy','dust-choked','strangely preserved'], smells:['cold stone','lamp oil','old dust','wet mortar','stale air'], details:['faded heraldry','tool marks','old bloodstains','scratched warnings','discarded equipment'], occupants:['scavengers','cultists','restless dead','territorial beasts','desperate squatters'] },
    crypt: { label:'Undead Crypt', materials:['mortared tombstone','black marble','bone-inlaid stone','aged oak','tarnished silver'], moods:['deathly silent','funereal','oppressive','cold beyond reason','heavy with old grief'], smells:['grave soil','funeral incense','mildew','old linen','sweet decay'], details:['shattered funerary masks','niches of wrapped bones','extinguished votive candles','chiseled epitaphs','chains for sealing coffins'], occupants:['skeleton guards','hungry ghouls','mourning spirits','grave robbers','a patient necromancer'] },
    fortress: { label:'Ruined Fortress', materials:['dressed granite','iron-bound oak','arrow-scarred timber','riveted iron','limewashed stone'], moods:['militarily austere','recently abandoned','under siege','wind-scoured','grimly functional'], smells:['rust','wet wool','cold ash','horse sweat','old leather'], details:['broken weapon racks','rotting banners','collapsed barricades','scattered ration tins','murder holes'], occupants:['deserters','mercenaries','goblinoid troops','animated armor','a wounded commander'] },
    arcane: { label:'Arcane Laboratory', materials:['etched stone','brass framework','crystal panels','polished slate','silvered glass'], moods:['electrically tense','unnaturally orderly','reality-warped','humming softly','frozen mid-experiment'], smells:['ozone','hot metal','alchemical solvent','burned hair','sharp herbs'], details:['chalked formulae','floating instruments','shattered retorts','copper coils','sealed specimen jars'], occupants:['homunculi','escaped experiments','animated tools','apprentice ghosts','a paranoid mage'] },
    cavern: { label:'Natural Cavern', materials:['wet limestone','basalt','crystal-veined rock','packed clay','mineral crust'], moods:['echoing','claustrophobic','wind-carved','dripping constantly','alive with distant movement'], smells:['wet stone','fungus','guano','sulfur','underground water'], details:['stalactite curtains','pale fungus beds','animal scratches','mineral pools','collapsed side passages'], occupants:['cave predators','fungal creatures','burrowing vermin','lost explorers','subterranean hunters'] },
    temple: { label:'Desecrated Temple', materials:['carved limestone','gilded wood','mosaic tile','incense-darkened stone','ceremonial bronze'], moods:['solemn','violated','expectant','ritually ordered','charged with faith'], smells:['incense','old wax','sacrificial smoke','rosewater','dusty cloth'], details:['defaced icons','cracked offering bowls','prayer ribbons','ritual circles','rows of kneeling benches'], occupants:['fanatics','penitent ghosts','temple guardians','pilgrims in hiding','a fallen priest'] },
    sewer: { label:'Sewer / Underworks', materials:['slime-coated brick','corroded iron','rotting timber','algae-slick stone','patched masonry'], moods:['close and humid','filthy','maze-like','mechanically noisy','flood-prone'], smells:['sewage','stagnant water','chemical runoff','mold','rotting food'], details:['blocked culverts','maintenance hooks','rat nests','chalk route marks','overflow grates'], occupants:['rat swarms','smugglers','oozes','escaped prisoners','mutated scavengers'] },
    infernal: { label:'Infernal Ruin', materials:['black basalt','brass','charred bone','red iron','obsidian'], moods:['feverishly hot','legally oppressive','whispering','smoke-shrouded','agonizingly orderly'], smells:['sulfur','hot metal','burned blood','bitter smoke','scorched parchment'], details:['contract fragments','barbed chains','screaming faces in the walls','ember-filled braziers','infernal tally marks'], occupants:['imps','bound petitioners','hellish guards','cult negotiators','a contract devil'] },
    frozen: { label:'Frozen Vault', materials:['blue ice','frost-rimed stone','frozen timber','silver-white metal','glacial crystal'], moods:['muffled','bitterly cold','perfectly preserved','wind-haunted','fracture-prone'], smells:['clean ice','old fur','cold iron','pine resin','preserved meat'], details:['frozen footprints','ice-locked doors','rime-coated murals','buried equipment','cracks glowing blue'], occupants:['icebound dead','winter beasts','frost cultists','trapped explorers','a cold elemental'] },
    overgrown: { label:'Overgrown Ruin', materials:['root-split stone','mossy brick','living wood','vine-wrapped iron','mud-covered tile'], moods:['humid','green-shadowed','slowly collapsing','alive with insects','reclaimed by nature'], smells:['wet leaves','flowers','rich soil','rotting wood','herbal sap'], details:['roots through the ceiling','animal nests','poisonous blooms','fallen statuary','pools of rainwater'], occupants:['plant creatures','territorial animals','druids','bandits','spore-infected explorers'] }
  };

  const DIFFICULTIES = {
    trivial:{label:'Trivial',dc:10,attack:'+2',damage:'1d4',save:10,lock:10,break:10,stakes:'minor inconvenience'},
    easy:{label:'Easy',dc:12,attack:'+5',damage:'1d6',save:12,lock:15,break:15,stakes:'noticeable setback'},
    moderate:{label:'Moderate',dc:15,attack:'+8',damage:'2d6',save:15,lock:20,break:20,stakes:'serious obstacle'},
    hard:{label:'Hard',dc:18,attack:'+12',damage:'4d6',save:18,lock:25,break:25,stakes:'dangerous encounter'},
    deadly:{label:'Deadly',dc:22,attack:'+16',damage:'8d6',save:22,lock:30,break:30,stakes:'potentially lethal threat'}
  };

  const css = `
    .module-filler-card{margin-top:18px;border:1px solid var(--line);border-radius:22px;padding:16px;background:rgba(255,255,255,.045);box-shadow:var(--shadow)}
    .module-filler-layout{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start}.module-filler-controls{display:grid;gap:10px;border:1px solid var(--line);border-radius:14px;padding:12px;background:rgba(0,0,0,.16)}.module-filler-controls input,.module-filler-controls select{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 10px}.module-filler-checks{display:grid;grid-template-columns:1fr 1fr;gap:6px}.module-filler-checks label{font-size:.82rem;color:var(--muted)}.module-filler-checks input{width:auto;margin-right:6px}.module-filler-actions{display:flex;flex-wrap:wrap;gap:8px}.module-filler-actions button{border:1px solid var(--line);background:rgba(0,0,0,.2);color:var(--ink);border-radius:10px;padding:8px 10px;cursor:pointer}.module-filler-actions button:hover{border-color:var(--accent)}.module-filler-results{display:grid;gap:10px}.module-filler-result{border:1px solid var(--line);border-radius:14px;padding:12px;background:rgba(0,0,0,.17)}.module-filler-result h3{margin:0 0 6px;color:var(--accent)}.module-filler-result p{margin:5px 0;color:var(--muted);line-height:1.5}.module-filler-result strong{color:var(--ink)}.module-filler-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.module-filler-tag{border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--muted);font-size:.74rem}.module-filler-empty{border:1px dashed var(--line);border-radius:14px;padding:18px;color:var(--muted)}@media(max-width:900px){.module-filler-layout{grid-template-columns:1fr}}
  `;

  let results=[];
  let rng=Math.random;

  function pick(arr){return arr[Math.floor(rng()*arr.length)]}
  function chance(p){return rng()<p}
  function seedRandom(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function currentTheme(id){if(id==='random')return pick(Object.values(THEMES));return THEMES[id]||THEMES.mixed}

  function room(theme,diff,density,index){
    const shapes=['rectangular chamber','long gallery','square guardroom','irregular chamber','vaulted hall','low-ceilinged side room'];
    const purposes=['barracks','archive','storeroom','shrine','workshop','meeting hall','watch post','burial room'];
    const condition=density==='sparse'?'mostly bare':density==='dense'?'crowded with debris and usable cover':'partially cluttered';
    const complication=pick(['a concealed cache behind loose stonework','an unstable ceiling section','signs that something returns here regularly','a secondary exit hidden by debris','a territorial occupant observing from concealment','a useful object placed in a suspiciously obvious position']);
    return {type:'room',title:`Room ${index+1}: ${cap(pick(purposes))}`,description:`A ${pick(shapes)} built from ${pick(theme.materials)}. It feels ${pick(theme.moods)} and smells of ${pick(theme.smells)}. The room is ${condition}; ${pick(theme.details)} remain visible.`,mechanics:`Primary interaction DC ${diff.dc}. ${cap(complication)}.`,occupant:chance(density==='dense'?.65:density==='sparse'?.25:.45)?`Possible occupants: ${pick(theme.occupants)}.`:'No immediate occupant is apparent.',tags:[theme.label,diff.label,'Room']};
  }
  function door(theme,diff,index){
    const forms=['plain wooden door','iron-bound door','stone slab door','bronze double door','portcullis','sliding wall panel'];
    const states=['locked','stuck','barred from the far side','unlocked but swollen in its frame','partially broken','sealed with an old mechanism'];
    const secrets=['concealed behind matching masonry','hidden by a hanging or growth','opened by pressing a worn carving','released by shifting a nearby fixture'];
    const secret=chance(.28);
    const trapped=chance(.32);
    return {type:'door',title:`Door ${index+1}: ${cap(pick(forms))}`,description:`A ${pick(forms)} of ${pick(theme.materials)}, currently ${pick(states)}.${secret?' It is '+pick(secrets)+'.':''}`,mechanics:`Open Lock DC ${diff.lock}; Break DC ${diff.break}.${secret?` Search DC ${diff.dc} to locate the mechanism.`:''}${trapped?` Trap: attack ${diff.attack}, ${diff.damage} damage, save DC ${diff.save}.`:''}`,occupant:'',tags:[theme.label,diff.label,'Door',secret?'Secret':'Visible',trapped?'Trapped':'Untrapped']};
  }
  function trap(theme,diff,index){
    const triggers=['pressure plate','tripwire','disturbed seal','false handle','weighted floor tile','magical proximity rune'];
    const effects=['falling stone block','poisoned darts','burst of flame','locking walls','summoned guardian','blinding dust','flooding chamber','necrotic pulse'];
    const clues=['fresh scratches near the trigger','a break in the dust','small holes in the stonework','discolored floor tiles','a faint magical hum','bones lying in a suspicious pattern'];
    return {type:'trap',title:`Trap ${index+1}: ${cap(pick(effects))}`,description:`A ${pick(triggers)} activates a ${pick(effects)}. A careful observer may notice ${pick(clues)}.`,mechanics:`Detection DC ${diff.dc}; Disable DC ${diff.dc+2}; attack ${diff.attack} or save DC ${diff.save}; ${diff.damage} damage or equivalent ${diff.stakes}.`,occupant:'',tags:[theme.label,diff.label,'Trap']};
  }
  function feature(theme,diff,index){
    const objects=['statue','dry fountain','ritual basin','collapsed balcony','wall relief','mechanical lift','sarcophagus','sealed well','crystal formation','mosaic floor'];
    const uses=['reveals a hidden compartment','provides temporary cover','contains a clue to another room','can be repaired into a useful mechanism','reacts to magic or blood','marks a safe route through the area','conceals an environmental hazard','can be used to bypass a nearby obstacle'];
    return {type:'feature',title:`Feature ${index+1}: ${cap(pick(objects))}`,description:`A ${pick(objects)} made from ${pick(theme.materials)} dominates the area. It is ${pick(theme.moods)} in character, with ${pick(theme.details)} nearby.`,mechanics:`Interaction or interpretation DC ${diff.dc}. On success it ${pick(uses)}.`,occupant:'',tags:[theme.label,diff.label,'Feature']};
  }
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

  function init(){
    if(document.getElementById('module-content-filler-root'))return;
    const anchor=document.getElementById('module-map-editor-root')||document.getElementById('module-viewer-root');
    if(!anchor)return;
    if(!document.getElementById('module-content-filler-style')){const s=document.createElement('style');s.id='module-content-filler-style';s.textContent=css;document.head.appendChild(s)}
    const root=document.createElement('section');root.id='module-content-filler-root';root.className='module-filler-card no-print';
    root.innerHTML=`<div class="section-heading"><p class="eyebrow">Module generator</p><h2>Random Room / Door / Trap / Feature Filler</h2><p>Generate themed module content with controlled difficulty, density, content types, quantity, and repeatable seeds.</p></div><div class="module-filler-layout"><aside class="module-filler-controls"><label>Theme<select id="mcf-theme"><option value="random">Random theme per result</option>${Object.entries(THEMES).map(([id,t])=>`<option value="${id}">${esc(t.label)}</option>`).join('')}</select></label><label>Difficulty<select id="mcf-difficulty">${Object.entries(DIFFICULTIES).map(([id,d])=>`<option value="${id}" ${id==='moderate'?'selected':''}>${d.label}</option>`).join('')}</select></label><label>Content density<select id="mcf-density"><option value="sparse">Sparse</option><option value="standard" selected>Standard</option><option value="dense">Dense</option></select></label><label>Number of results<input id="mcf-count" type="number" min="1" max="30" value="6"></label><label>Seed (optional)<input id="mcf-seed" type="text" placeholder="same seed = repeatable output"></label><div class="module-filler-checks"><label><input type="checkbox" data-kind="room" checked>Rooms</label><label><input type="checkbox" data-kind="door" checked>Doors</label><label><input type="checkbox" data-kind="trap" checked>Traps</label><label><input type="checkbox" data-kind="feature" checked>Features</label></div><div class="module-filler-actions"><button id="mcf-generate" type="button">Generate Content</button><button id="mcf-copy" type="button">Copy Text</button><button id="mcf-copy-json" type="button">Copy JSON</button><button id="mcf-download" type="button">Download JSON</button></div><p id="mcf-status" class="module-inspector-help">Ready.</p></aside><div id="mcf-results" class="module-filler-results"><div class="module-filler-empty">Choose controls and generate filler content.</div></div></div>`;
    anchor.insertAdjacentElement('afterend',root);
    bind(root);
  }

  function bind(root){
    root.querySelector('#mcf-generate').onclick=()=>generate(root);
    root.querySelector('#mcf-copy').onclick=()=>copy(root,toText(),'Text copied.');
    root.querySelector('#mcf-copy-json').onclick=()=>copy(root,JSON.stringify(results,null,2),'JSON copied.');
    root.querySelector('#mcf-download').onclick=()=>downloadJson();
  }
  function generate(root){
    const selected=[...root.querySelectorAll('[data-kind]:checked')].map(x=>x.dataset.kind);
    if(!selected.length){status(root,'Select at least one content type.');return}
    const count=Math.max(1,Math.min(30,parseInt(root.querySelector('#mcf-count').value,10)||1));
    const seed=root.querySelector('#mcf-seed').value.trim();rng=seed?seedRandom(seed):Math.random;
    const diff=DIFFICULTIES[root.querySelector('#mcf-difficulty').value]||DIFFICULTIES.moderate;
    const density=root.querySelector('#mcf-density').value;
    const themeId=root.querySelector('#mcf-theme').value;
    results=[];
    for(let i=0;i<count;i++){const kind=selected[i%selected.length];const theme=currentTheme(themeId);results.push(({room,door,trap,feature}[kind])(theme,diff,density,i));}
    render(root);status(root,`Generated ${results.length} entries.`);
    document.dispatchEvent(new CustomEvent('module-content-filler-generated',{detail:{results,seed,theme:themeId,difficulty:diff.label,density}}));
  }
  function render(root){root.querySelector('#mcf-results').innerHTML=results.map(r=>`<article class="module-filler-result"><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><p><strong>Mechanics:</strong> ${esc(r.mechanics)}</p>${r.occupant?`<p><strong>Occupancy:</strong> ${esc(r.occupant)}</p>`:''}<div class="module-filler-tags">${r.tags.map(t=>`<span class="module-filler-tag">${esc(t)}</span>`).join('')}</div></article>`).join('')}
  function toText(){return results.map(r=>`${r.title}\n${r.description}\nMechanics: ${r.mechanics}${r.occupant?`\nOccupancy: ${r.occupant}`:''}\nTags: ${r.tags.join(', ')}`).join('\n\n')}
  async function copy(root,text,msg){if(!results.length){status(root,'Generate content first.');return}try{await navigator.clipboard.writeText(text);status(root,msg)}catch(e){status(root,'Clipboard access failed.') }}
  function downloadJson(){if(!results.length)return;const blob=new Blob([JSON.stringify({schemaVersion:'0.1.0',generator:'module-content-filler',results},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='module-content-filler.json';a.click();URL.revokeObjectURL(a.href)}
  function status(root,msg){root.querySelector('#mcf-status').textContent=msg}

  const observer=new MutationObserver(init);observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
