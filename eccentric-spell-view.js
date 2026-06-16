(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const section=(title,value)=>`<h4>${title}</h4><p>${esc(value)}</p>`;
  const stat=(title,value)=>`<div class="esc-stat"><strong>${title}</strong><br>${esc(value)}</div>`;

  function render(root,spells){
    root.querySelector('#esc-output').innerHTML=spells.map(s=>{
      const tags=[s.theme.label,s.castingTradition.label,s.competence.label,s.moralTone.label,s.odditySeverity.label,s.conceptBias.label].map(v=>`<span class="esc-tag">${esc(v)}</span>`).join('');
      return `<article class="esc-card"><h3>${esc(s.name)}</h3><div>${tags}</div><div class="esc-stat-grid">${stat('Suggested Spell Level',s.suggestedLevel.label)}${stat('Competence / Complexity',s.competence.label)}${stat('Moral Tone',s.moralTone.label)}${stat('Oddity Severity',s.odditySeverity.label)}${stat('Subject',s.subject)}${stat('Phenomenon',s.phenomenon)}</div>${section('Manifestation',s.manifestation)}${section('Casting Procedure',s.casting)}${section('Primary Thematic Effect',s.primaryEffect)}${section('Secondary Effect',s.secondaryEffect)}${section('Knock-On Effect',s.knockOnEffect)}${section('Aftereffect',s.afterEffect)}${section('Suggested-Level Rationale',s.suggestedLevel.rationale)}${section('Rumored Origin',s.origin)}${section('GM Use',s.gmUse)}<div class="esc-thematic-note"><strong>${esc(s.mechanicalStatus)}</strong></div></article>`;
    }).join('');
  }

  window.HBEccentricSpellView={render};
})();
