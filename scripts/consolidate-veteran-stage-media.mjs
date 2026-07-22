import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererPath = path.join(root, 'blacklight-veteran-reintroduction.js');
const cssPath = path.join(root, 'blacklight-veteran-reintroduction.css');
const htmlPath = path.join(root, 'blacklight-veteran-reintroduction.html');
const postprocessorPath = path.join(root, 'blacklight-veteran-stage-illustrations.js');

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');

if (!fs.existsSync(postprocessorPath)) throw new Error('Stage media postprocessor is missing.');

let renderer = read(rendererPath);
const constantsAnchor = "  const SHEET_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';\n";
if (!renderer.includes(constantsAnchor)) throw new Error('Renderer constants anchor was not found.');
if (renderer.includes('const STAGE_ILLUSTRATIONS = Object.freeze')) throw new Error('Stage media is already consolidated.');

const mediaConstants = `
  const STAGE_ILLUSTRATION_BASE = 'assets/blacklight/veteran-scenes/blacklight_reorientation_generated_images/';
  const STAGE_ILLUSTRATIONS = Object.freeze({
    'returning-operative': \`\${STAGE_ILLUSTRATION_BASE}surveillance_in_a_neon_lit_room.png\`,
    'accelerating-missions': \`\${STAGE_ILLUSTRATION_BASE}urban_espionage_at_nightfall.png\`,
    'warehouse-convergence': \`\${STAGE_ILLUSTRATION_BASE}unusual_gathering_in_a_dim_industrial_hall.png\`,
    'charles-embodied': \`\${STAGE_ILLUSTRATION_BASE}metallic_figure_in_a_shadowed_assembly.png\`,
    'containment-cube': \`\${STAGE_ILLUSTRATION_BASE}floating_refuge_in_a_stormy_city.png\`,
    'leaving-earth': \`\${STAGE_ILLUSTRATION_BASE}watching_the_world_from_afar.png\`,
    'lunar-convocation': \`\${STAGE_ILLUSTRATION_BASE}ceremonial_gathering_under_cosmic_sky.png\`,
    'look-repentant': \`\${STAGE_ILLUSTRATION_BASE}a_solemn_assembly_in_golden_light.png\`,
    'five-blocs': \`\${STAGE_ILLUSTRATION_BASE}grand_council_in_a_luminous_arena.png\`,
    'charges-against-charles': \`\${STAGE_ILLUSTRATION_BASE}ceremonial_tribunal_in_a_cosmic_hall.png\`,
    'return-and-silence': \`\${STAGE_ILLUSTRATION_BASE}refugees_in_the_industrial_shelter.png\`,
    'interim-days': \`\${STAGE_ILLUSTRATION_BASE}a_bustling_aid_hub_in_a_warehouse.png\`,
    'company-introduction': \`\${STAGE_ILLUSTRATION_BASE}industrial_administration_hall_in_dystopian_future.png\`,
    'company-status': \`\${STAGE_ILLUSTRATION_BASE}strategic_briefing_in_industrial_warehouse.png\`,
    'chain-of-command': \`\${STAGE_ILLUSTRATION_BASE}tactical_briefing_in_an_industrial_war_room.png\`,
    'mission-consent': \`\${STAGE_ILLUSTRATION_BASE}tense_strategy_briefing_in_a_glowing_war_room.png\`,
    'information-rights': \`\${STAGE_ILLUSTRATION_BASE}high_security_debrief_in_dim_archives.png\`,
    'personhood-property': \`\${STAGE_ILLUSTRATION_BASE}futuristic_briefing_room_under_dim_lights.png\`,
    'support-obligations': \`\${STAGE_ILLUSTRATION_BASE}humanitarian_aid_and_ethereal_presence.png\`,
    'confidentiality-accountability': \`\${STAGE_ILLUSTRATION_BASE}industrial_tribunal_in_a_dim_chamber.png\`,
    'watcher-oversight': \`\${STAGE_ILLUSTRATION_BASE}futuristic_tribunal_in_a_high_tech_chamber.png\`,
    'continuity-conversion': \`\${STAGE_ILLUSTRATION_BASE}dim_lit_industrial_command_center_meeting.png\`,
    'charles-reckoning': \`\${STAGE_ILLUSTRATION_BASE}relief_hub_in_industrial_command_center.png\`,
    'new-arrangement': \`\${STAGE_ILLUSTRATION_BASE}squad_briefing_in_a_futuristic_hangar.png\`
  });
  const FINAL_SPEECH_AUDIO = 'assets/blacklight/The_speech.mp3';
  const FINAL_SPEECH_ICON = 'assets/blacklight/sliced_web_asset_icons_25/05_02_speech_bubble.png';
`;
renderer = renderer.replace(constantsAnchor, constantsAnchor + mediaConstants);

const stateAnchor = "  const ui = {};\n";
if (!renderer.includes(stateAnchor)) throw new Error('Renderer state anchor was not found.');
renderer = renderer.replace(stateAnchor, `${stateAnchor}\n  let finalSpeechAutoplayAttempted = false;\n`);

const mediaFunctionsAnchor = "  function renderErrors() {\n";
if (!renderer.includes(mediaFunctionsAnchor)) throw new Error('Renderer media-function anchor was not found.');
const mediaFunctions = `  function renderStageMedia(entry) {
    const src = STAGE_ILLUSTRATIONS[entry.id];
    const stageLabel = String(entry.title || entry.id).replace(/^Reorientation\\s+[^:]+:\\s*/i, '');
    const illustration = src ? \`<figure class="veteran-scene-figure" data-veteran-stage-illustration="\${escapeHtml(entry.id)}"><img class="veteran-scene-image" src="\${escapeHtml(src)}" alt="BlackLight veteran reorientation illustration for \${escapeHtml(stageLabel)}" loading="lazy" decoding="async"></figure>\` : '';
    const speech = entry.id === 'new-arrangement' ? \`<section class="veteran-speech-panel no-print" data-veteran-final-speech="true"><button class="veteran-speech-button" type="button" data-veteran-speech-toggle aria-label="Play or pause the final reorientation speech"><img src="\${escapeHtml(FINAL_SPEECH_ICON)}" alt="" loading="lazy" decoding="async"><span>Play Speech</span></button><div class="veteran-speech-copy"><strong>Final Reorientation Speech</strong><small>The speech attempts to begin when this final screen opens. Browser autoplay rules may require a click; the full player remains available.</small><audio src="\${escapeHtml(FINAL_SPEECH_AUDIO)}" controls preload="metadata"></audio></div></section>\` : '';
    return illustration + speech;
  }

  function syncSpeechButton(panel) {
    const audio = panel?.querySelector('audio');
    const label = panel?.querySelector('[data-veteran-speech-toggle] span');
    if (!audio || !label) return;
    label.textContent = audio.paused ? (audio.currentTime > 0 && !audio.ended ? 'Resume Speech' : 'Play Speech') : 'Pause Speech';
  }

  function attachStageMediaListeners() {
    const figure = ui.entry.querySelector('[data-veteran-stage-illustration]');
    const image = figure?.querySelector('img');
    image?.addEventListener('error', () => {
      figure.innerHTML = \`<div class="veteran-scene-fallback">Scene illustration missing: \${escapeHtml(image.getAttribute('src') || '')}</div>\`;
    }, { once: true });

    const panel = ui.entry.querySelector('[data-veteran-final-speech]');
    const audio = panel?.querySelector('audio');
    const button = panel?.querySelector('[data-veteran-speech-toggle]');
    if (!panel || !audio || !button) return;
    const update = () => syncSpeechButton(panel);
    audio.addEventListener('play', update);
    audio.addEventListener('pause', update);
    audio.addEventListener('ended', update);
    button.addEventListener('click', () => {
      if (audio.paused) {
        if (audio.ended) audio.currentTime = 0;
        const request = audio.play();
        if (request?.catch) request.catch(update);
      } else {
        audio.pause();
      }
      update();
    });
    if (!finalSpeechAutoplayAttempted) {
      finalSpeechAutoplayAttempted = true;
      const request = audio.play();
      if (request?.catch) request.catch(update);
    }
    update();
  }

`;
renderer = renderer.replace(mediaFunctionsAnchor, mediaFunctions + mediaFunctionsAnchor);

const builderAnchor = "      ${renderTables(entry.tables)}\n      <section class=\"veteran-builder\">";
if (!renderer.includes(builderAnchor)) throw new Error('Renderer builder anchor was not found.');
renderer = renderer.replace(builderAnchor, "      ${renderTables(entry.tables)}\n      ${renderStageMedia(entry)}\n      <section class=\"veteran-builder\">");

const listenerAnchor = "    attachEntryListeners(entry);\n";
if (!renderer.includes(listenerAnchor)) throw new Error('Renderer listener anchor was not found.');
renderer = renderer.replace(listenerAnchor, `${listenerAnchor}    attachStageMediaListeners();\n`);
write(rendererPath, renderer);

let css = read(cssPath);
const mediaCss = `
.veteran-scene-figure{margin:24px 0 26px;border:1px solid rgba(200,138,53,.38);border-radius:18px;overflow:hidden;background:rgba(0,0,0,.22);box-shadow:0 14px 35px rgba(0,0,0,.18)}
.veteran-scene-image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#0b0e14}
.veteran-scene-fallback{display:grid;place-items:center;min-height:220px;padding:22px;color:var(--muted);background:linear-gradient(135deg,rgba(200,138,53,.16),rgba(29,49,78,.35));text-align:center;font-weight:800;line-height:1.4}
.veteran-speech-panel{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;margin:-8px 0 26px;padding:14px;border:1px solid rgba(200,138,53,.42);border-radius:18px;background:linear-gradient(135deg,rgba(200,138,53,.12),rgba(12,18,28,.58));box-shadow:0 12px 32px rgba(0,0,0,.2)}
.veteran-speech-button{display:inline-grid;place-items:center;gap:6px;width:86px;min-height:82px;border:1px solid rgba(200,138,53,.48);border-radius:50%;background:rgba(0,0,0,.34);color:inherit;font-weight:900;text-transform:uppercase;font-size:.7rem;letter-spacing:.06em;cursor:pointer}
.veteran-speech-button img{width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,.55))}.veteran-speech-button:hover{border-color:rgba(200,138,53,.78);background:rgba(200,138,53,.14)}
.veteran-speech-copy{display:grid;gap:8px}.veteran-speech-copy strong{font-size:1.05rem}.veteran-speech-copy small{color:var(--muted);line-height:1.45}.veteran-speech-copy audio{width:100%;max-width:680px}
@media(max-width:620px){.veteran-speech-panel{grid-template-columns:1fr}.veteran-speech-button{width:100%;border-radius:16px;grid-auto-flow:column;justify-content:center}}
@media print{.veteran-scene-figure{border-color:#666;box-shadow:none;break-inside:avoid}.veteran-speech-panel{display:none!important}}
`;
if (css.includes('.veteran-scene-figure{')) throw new Error('Stage media CSS is already consolidated.');
css = css.trimEnd() + '\n' + mediaCss;
write(cssPath, css);

let html = read(htmlPath);
const postprocessorTag = /\s*<script src=["']blacklight-veteran-stage-illustrations\.js["']><\/script>/g;
if (!postprocessorTag.test(html)) throw new Error('Stage media postprocessor script tag was not found.');
html = html.replace(postprocessorTag, '');
write(htmlPath, html.replace(/\n{3,}/g, '\n\n'));

fs.unlinkSync(postprocessorPath);

if (read(htmlPath).includes('blacklight-veteran-stage-illustrations.js')) throw new Error('HTML still references the removed stage media postprocessor.');
if (!read(rendererPath).includes('renderStageMedia(entry)') || !read(rendererPath).includes('attachStageMediaListeners();')) throw new Error('Stage media was not integrated into the canonical renderer.');
if (!read(cssPath).includes('.veteran-scene-figure{')) throw new Error('Stage media CSS was not integrated into the canonical stylesheet.');

console.log('Integrated stage illustrations and final speech controls into the canonical renderer.');
console.log('Removed blacklight-veteran-stage-illustrations.js and its polling DOM postprocessor.');
