(() => {
  'use strict';

  const STAGE_ILLUSTRATIONS = {
    'returning-operative': 'assets/blacklight/veteran-scenes/surveillance_in_a_neon_lit_room.svg',
    'accelerating-missions': 'assets/blacklight/veteran-scenes/urban_espionage_at_nightfall.svg',
    'warehouse-convergence': 'assets/blacklight/veteran-scenes/unusual_gathering_in_a_dim_industrial_hall.svg',
    'charles-embodied': 'assets/blacklight/veteran-scenes/metallic_figure_in_a_shadowed_assembly.svg',
    'containment-cube': 'assets/blacklight/veteran-scenes/floating_refuge_in_a_stormy_city.svg',
    'leaving-earth': 'assets/blacklight/veteran-scenes/watching_the_world_from_afar.svg',
    'lunar-convocation': 'assets/blacklight/veteran-scenes/ceremonial_gathering_under_cosmic_sky.svg',
    'look-repentant': 'assets/blacklight/veteran-scenes/a_solemn_assembly_in_golden_light.svg',
    'five-blocs': 'assets/blacklight/veteran-scenes/grand_council_in_a_luminous_arena.svg',
    'charges-against-charles': 'assets/blacklight/veteran-scenes/ceremonial_tribunal_in_a_cosmic_hall.svg',
    'return-and-silence': 'assets/blacklight/veteran-scenes/refugees_in_the_industrial_shelter.svg',
    'interim-days': 'assets/blacklight/veteran-scenes/a_bustling_aid_hub_in_a_warehouse.svg',
    'company-introduction': 'assets/blacklight/veteran-scenes/industrial_administration_hall_in_dystopian_future.svg',
    'company-status': 'assets/blacklight/veteran-scenes/strategic_briefing_in_industrial_warehouse.svg',
    'chain-of-command': 'assets/blacklight/veteran-scenes/tactical_briefing_in_an_industrial_war_room.svg',
    'mission-consent': 'assets/blacklight/veteran-scenes/tense_strategy_briefing_in_a_glowing_war_room.svg',
    'information-rights': 'assets/blacklight/veteran-scenes/high_security_debrief_in_dim_archives.svg',
    'personhood-property': 'assets/blacklight/veteran-scenes/futuristic_briefing_room_under_dim_lights.svg',
    'support-obligations': 'assets/blacklight/veteran-scenes/humanitarian_aid_and_ethereal_presence.svg',
    'confidentiality-accountability': 'assets/blacklight/veteran-scenes/industrial_tribunal_in_a_dim_chamber.svg',
    'watcher-oversight': 'assets/blacklight/veteran-scenes/futuristic_tribunal_in_a_high_tech_chamber.svg',
    'continuity-conversion': 'assets/blacklight/veteran-scenes/dim_lit_industrial_command_center_meeting.svg',
    'charles-reckoning': 'assets/blacklight/veteran-scenes/relief_hub_in_industrial_command_center.svg',
    'new-arrangement': 'assets/blacklight/veteran-scenes/squad_briefing_in_a_futuristic_hangar.svg'
  };

  const STAGE_ALT_TEXT = Object.fromEntries(Object.keys(STAGE_ILLUSTRATIONS).map(id => [id, `BlackLight veteran reorientation illustration for ${id.replace(/-/g, ' ')}`]));

  function installStyles() {
    if (document.getElementById('blacklight-veteran-stage-illustration-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-veteran-stage-illustration-style';
    style.textContent = `
      .veteran-scene-figure{margin:24px 0 26px;border:1px solid rgba(200,138,53,.38);border-radius:18px;overflow:hidden;background:rgba(0,0,0,.22);box-shadow:0 14px 35px rgba(0,0,0,.18)}
      .veteran-scene-image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#0b0e14}
      .veteran-scene-fallback{display:grid;place-items:center;min-height:220px;padding:22px;color:var(--muted);background:linear-gradient(135deg,rgba(200,138,53,.16),rgba(29,49,78,.35));text-align:center;font-weight:800;line-height:1.4}
      @media print{.veteran-scene-figure{border-color:#666;box-shadow:none;break-inside:avoid}}
    `;
    document.head.appendChild(style);
  }

  function activeStageId() {
    const activeButton = document.querySelector('#veteran-nav [data-entry-id].active');
    if (activeButton?.dataset.entryId) return activeButton.dataset.entryId;
    try {
      const saved = JSON.parse(localStorage.getItem('hb-ttrpg-tools-blacklight-veteran-reorientation-v1') || '{}');
      if (saved.activeId) return saved.activeId;
    } catch (_) {}
    return 'returning-operative';
  }

  function placeIllustration() {
    const entry = document.getElementById('veteran-entry');
    if (!entry) return;
    const stageId = activeStageId();
    const src = STAGE_ILLUSTRATIONS[stageId];
    entry.querySelectorAll('[data-veteran-stage-illustration]').forEach(node => node.remove());
    if (!src) return;

    const builder = entry.querySelector('.veteran-builder');
    if (!builder) return;

    const figure = document.createElement('figure');
    figure.className = 'veteran-scene-figure';
    figure.dataset.veteranStageIllustration = stageId;

    const image = document.createElement('img');
    image.className = 'veteran-scene-image';
    image.src = src;
    image.alt = STAGE_ALT_TEXT[stageId] || 'BlackLight veteran reorientation stage illustration';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      figure.innerHTML = '<div class="veteran-scene-fallback">Scene illustration asset is missing from assets/blacklight/veteran-scenes/.</div>';
    }, { once: true });

    figure.appendChild(image);
    builder.insertAdjacentElement('beforebegin', figure);
  }

  function initialize() {
    installStyles();
    placeIllustration();
    const target = document.getElementById('veteran-entry');
    if (!target) return;
    const observer = new MutationObserver(() => placeIllustration());
    observer.observe(target, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
