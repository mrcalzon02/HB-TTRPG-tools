(() => {
  'use strict';

  const STAGE_ILLUSTRATIONS = {
    'returning-operative': 'assets/blacklight/veteran-scenes/surveillance_in_a_neon_lit_room.png',
    'accelerating-missions': 'assets/blacklight/veteran-scenes/urban_espionage_at_nightfall.png',
    'warehouse-convergence': 'assets/blacklight/veteran-scenes/unusual_gathering_in_a_dim_industrial_hall.png',
    'charles-embodied': 'assets/blacklight/veteran-scenes/metallic_figure_in_a_shadowed_assembly.png',
    'containment-cube': 'assets/blacklight/veteran-scenes/floating_refuge_in_a_stormy_city.png',
    'leaving-earth': 'assets/blacklight/veteran-scenes/watching_the_world_from_afar.png',
    'lunar-convocation': 'assets/blacklight/veteran-scenes/ceremonial_gathering_under_cosmic_sky.png',
    'look-repentant': 'assets/blacklight/veteran-scenes/a_solemn_assembly_in_golden_light.png',
    'five-blocs': 'assets/blacklight/veteran-scenes/grand_council_in_a_luminous_arena.png',
    'charges-against-charles': 'assets/blacklight/veteran-scenes/ceremonial_tribunal_in_a_cosmic_hall.png',
    'return-and-silence': 'assets/blacklight/veteran-scenes/refugees_in_the_industrial_shelter.png',
    'interim-days': 'assets/blacklight/veteran-scenes/a_bustling_aid_hub_in_a_warehouse.png',
    'company-introduction': 'assets/blacklight/veteran-scenes/industrial_administration_hall_in_dystopian_future.png',
    'company-status': 'assets/blacklight/veteran-scenes/strategic_briefing_in_industrial_warehouse.png',
    'chain-of-command': 'assets/blacklight/veteran-scenes/tactical_briefing_in_an_industrial_war_room.png',
    'mission-consent': 'assets/blacklight/veteran-scenes/tense_strategy_briefing_in_a_glowing_war_room.png',
    'information-rights': 'assets/blacklight/veteran-scenes/high_security_debrief_in_dim_archives.png',
    'personhood-property': 'assets/blacklight/veteran-scenes/futuristic_briefing_room_under_dim_lights.png',
    'support-obligations': 'assets/blacklight/veteran-scenes/humanitarian_aid_and_ethereal_presence.png',
    'confidentiality-accountability': 'assets/blacklight/veteran-scenes/industrial_tribunal_in_a_dim_chamber.png',
    'watcher-oversight': 'assets/blacklight/veteran-scenes/futuristic_tribunal_in_a_high_tech_chamber.png',
    'continuity-conversion': 'assets/blacklight/veteran-scenes/dim_lit_industrial_command_center_meeting.png',
    'charles-reckoning': 'assets/blacklight/veteran-scenes/relief_hub_in_industrial_command_center.png',
    'new-arrangement': 'assets/blacklight/veteran-scenes/squad_briefing_in_a_futuristic_hangar.png'
  };

  const STAGE_ALT_TEXT = {
    'returning-operative': 'BlackLight veteran reorientation illustration for Returning Operative',
    'accelerating-missions': 'BlackLight veteran reorientation illustration for Accelerating Missions',
    'warehouse-convergence': 'BlackLight veteran reorientation illustration for Warehouse Convergence',
    'charles-embodied': 'BlackLight veteran reorientation illustration for Charles Embodied',
    'containment-cube': 'BlackLight veteran reorientation illustration for Containment Cube',
    'leaving-earth': 'BlackLight veteran reorientation illustration for Leaving Earth',
    'lunar-convocation': 'BlackLight veteran reorientation illustration for Lunar Convocation',
    'look-repentant': 'BlackLight veteran reorientation illustration for Look Repentant',
    'five-blocs': 'BlackLight veteran reorientation illustration for Five Blocs',
    'charges-against-charles': 'BlackLight veteran reorientation illustration for Charges Against Charles',
    'return-and-silence': 'BlackLight veteran reorientation illustration for Return and Silence',
    'interim-days': 'BlackLight veteran reorientation illustration for Interim Days',
    'company-introduction': 'BlackLight veteran reorientation illustration for Company Introduction',
    'company-status': 'BlackLight veteran reorientation illustration for Company Status',
    'chain-of-command': 'BlackLight veteran reorientation illustration for Chain of Command',
    'mission-consent': 'BlackLight veteran reorientation illustration for Mission Consent',
    'information-rights': 'BlackLight veteran reorientation illustration for Information Rights',
    'personhood-property': 'BlackLight veteran reorientation illustration for Personhood and Property',
    'support-obligations': 'BlackLight veteran reorientation illustration for Support Obligations',
    'confidentiality-accountability': 'BlackLight veteran reorientation illustration for Confidentiality and Accountability',
    'watcher-oversight': 'BlackLight veteran reorientation illustration for Watcher Oversight',
    'continuity-conversion': 'BlackLight veteran reorientation illustration for Continuity Conversion',
    'charles-reckoning': 'BlackLight veteran reorientation illustration for Charles Reckoning',
    'new-arrangement': 'BlackLight veteran reorientation illustration for New Arrangement'
  };

  function installStyles() {
    if (document.getElementById('blacklight-veteran-stage-illustration-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-veteran-stage-illustration-style';
    style.textContent = `
      .veteran-scene-figure{margin:24px 0 26px;border:1px solid rgba(200,138,53,.38);border-radius:18px;overflow:hidden;background:rgba(0,0,0,.22);box-shadow:0 14px 35px rgba(0,0,0,.18)}
      .veteran-scene-image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#0b0e14}
      @media print{.veteran-scene-figure{border-color:#666;box-shadow:none;break-inside:avoid}}
    `;
    document.head.appendChild(style);
  }

  function activeStageId() {
    return document.querySelector('#veteran-nav [data-entry-id].active')?.dataset.entryId || '';
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
    image.addEventListener('error', () => figure.remove(), { once: true });

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
