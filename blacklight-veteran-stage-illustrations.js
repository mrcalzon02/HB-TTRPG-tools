(() => {
  'use strict';

  const ASSET_BASE = 'assets/blacklight/veteran-scenes/blacklight_reorientation_generated_images/';

  const STAGE_ILLUSTRATIONS = {
    'returning-operative': `${ASSET_BASE}surveillance_in_a_neon_lit_room.png`,
    'accelerating-missions': `${ASSET_BASE}urban_espionage_at_nightfall.png`,
    'warehouse-convergence': `${ASSET_BASE}unusual_gathering_in_a_dim_industrial_hall.png`,
    'charles-embodied': `${ASSET_BASE}metallic_figure_in_a_shadowed_assembly.png`,
    'containment-cube': `${ASSET_BASE}floating_refuge_in_a_stormy_city.png`,
    'leaving-earth': `${ASSET_BASE}watching_the_world_from_afar.png`,
    'lunar-convocation': `${ASSET_BASE}ceremonial_gathering_under_cosmic_sky.png`,
    'look-repentant': `${ASSET_BASE}a_solemn_assembly_in_golden_light.png`,
    'five-blocs': `${ASSET_BASE}grand_council_in_a_luminous_arena.png`,
    'charges-against-charles': `${ASSET_BASE}ceremonial_tribunal_in_a_cosmic_hall.png`,
    'return-and-silence': `${ASSET_BASE}refugees_in_the_industrial_shelter.png`,
    'interim-days': `${ASSET_BASE}a_bustling_aid_hub_in_a_warehouse.png`,
    'company-introduction': `${ASSET_BASE}industrial_administration_hall_in_dystopian_future.png`,
    'company-status': `${ASSET_BASE}strategic_briefing_in_industrial_warehouse.png`,
    'chain-of-command': `${ASSET_BASE}tactical_briefing_in_an_industrial_war_room.png`,
    'mission-consent': `${ASSET_BASE}tense_strategy_briefing_in_a_glowing_war_room.png`,
    'information-rights': `${ASSET_BASE}high_security_debrief_in_dim_archives.png`,
    'personhood-property': `${ASSET_BASE}futuristic_briefing_room_under_dim_lights.png`,
    'support-obligations': `${ASSET_BASE}humanitarian_aid_and_ethereal_presence.png`,
    'confidentiality-accountability': `${ASSET_BASE}industrial_tribunal_in_a_dim_chamber.png`,
    'watcher-oversight': `${ASSET_BASE}futuristic_tribunal_in_a_high_tech_chamber.png`,
    'continuity-conversion': `${ASSET_BASE}dim_lit_industrial_command_center_meeting.png`,
    'charles-reckoning': `${ASSET_BASE}relief_hub_in_industrial_command_center.png`,
    'new-arrangement': `${ASSET_BASE}squad_briefing_in_a_futuristic_hangar.png`
  };

  const STAGE_LABELS = {
    'returning-operative': 'Returning Operative',
    'accelerating-missions': 'Accelerating Missions',
    'warehouse-convergence': 'Warehouse Convergence',
    'charles-embodied': 'Charles Embodied',
    'containment-cube': 'Containment Cube',
    'leaving-earth': 'Leaving Earth',
    'lunar-convocation': 'Lunar Convocation',
    'look-repentant': 'Look Repentant',
    'five-blocs': 'Five Blocs',
    'charges-against-charles': 'Charges Against Charles',
    'return-and-silence': 'Return and Silence',
    'interim-days': 'Interim Days',
    'company-introduction': 'Company Introduction',
    'company-status': 'Company Status',
    'chain-of-command': 'Chain of Command',
    'mission-consent': 'Mission Consent',
    'information-rights': 'Information Rights',
    'personhood-property': 'Personhood and Property',
    'support-obligations': 'Support Obligations',
    'confidentiality-accountability': 'Confidentiality and Accountability',
    'watcher-oversight': 'Watcher Oversight',
    'continuity-conversion': 'Continuity Conversion',
    'charles-reckoning': 'Charles Reckoning',
    'new-arrangement': 'New Arrangement'
  };

  let lastPlacedStage = '';

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

  function readDraftActiveId() {
    try {
      const saved = JSON.parse(localStorage.getItem('hb-ttrpg-tools-blacklight-veteran-reorientation-v1') || '{}');
      return saved.activeId || '';
    } catch (_) {
      return '';
    }
  }

  function activeStageId() {
    return document.querySelector('#veteran-nav [data-entry-id].active')?.dataset.entryId || readDraftActiveId() || 'returning-operative';
  }

  function placeIllustration() {
    const entry = document.getElementById('veteran-entry');
    const builder = entry?.querySelector('.veteran-builder');
    if (!entry || !builder) return;

    const stageId = activeStageId();
    const src = STAGE_ILLUSTRATIONS[stageId];
    const current = entry.querySelector('[data-veteran-stage-illustration]');
    if (current?.dataset.veteranStageIllustration === stageId) return;

    current?.remove();
    lastPlacedStage = stageId;
    if (!src) return;

    const figure = document.createElement('figure');
    figure.className = 'veteran-scene-figure';
    figure.dataset.veteranStageIllustration = stageId;

    const image = document.createElement('img');
    image.className = 'veteran-scene-image';
    image.src = src;
    image.alt = `BlackLight veteran reorientation illustration for ${STAGE_LABELS[stageId] || stageId}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      figure.innerHTML = `<div class="veteran-scene-fallback">Scene illustration missing: ${src}</div>`;
    }, { once: true });

    figure.appendChild(image);
    builder.insertAdjacentElement('beforebegin', figure);
  }

  function initialize() {
    installStyles();
    placeIllustration();
    document.addEventListener('click', event => {
      if (event.target.closest('#veteran-nav [data-entry-id], #veteran-previous, #veteran-next')) {
        window.setTimeout(placeIllustration, 0);
      }
    });
    document.addEventListener('change', event => {
      if (event.target.closest('#veteran-entry input, #veteran-entry textarea')) {
        window.setTimeout(placeIllustration, 0);
      }
    });
    window.setInterval(() => {
      if (activeStageId() !== lastPlacedStage || !document.querySelector('#veteran-entry [data-veteran-stage-illustration]')) {
        placeIllustration();
      }
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
