(() => {
  "use strict";

  if (window.EXO_STATION_KEY_CURSOR) return;

  const CURSOR_SIZE = 64;
  const cache = new Map();
  let currentStation = null;
  let syncQueued = false;
  let observer = null;

  // The key in the execution cylinder and the key used as the player pointer are
  // the same physical object viewed from different positions. The station loadout
  // remains authoritative for cap finish + charm; this profile only supplies the
  // hidden blade geometry and the held-key camera projection.
  const STATION_KEY_PERSPECTIVE = Object.freeze({
    helm: Object.freeze({ rotation: -34, roll: -5, skewX: -7, scaleX: .98, scaleY: .88, offsetX: 2, offsetY: 5, hotspotX: 13, hotspotY: 6, bitting: [2, 5, 1, 4, 2, 6] }),
    navigation: Object.freeze({ rotation: -31, roll: -8, skewX: -3, scaleX: .93, scaleY: .91, offsetX: 4, offsetY: 4, hotspotX: 13, hotspotY: 6, bitting: [5, 1, 4, 6, 2, 3] }),
    gunnery: Object.freeze({ rotation: -37, roll: -2, skewX: -10, scaleX: 1.01, scaleY: .84, offsetX: 1, offsetY: 7, hotspotX: 12, hotspotY: 6, bitting: [6, 3, 5, 1, 4, 2] }),
    engineering: Object.freeze({ rotation: -29, roll: -10, skewX: -5, scaleX: .96, scaleY: .94, offsetX: 5, offsetY: 3, hotspotX: 14, hotspotY: 6, bitting: [3, 6, 2, 5, 1, 4] }),
    science: Object.freeze({ rotation: -35, roll: 1, skewX: -8, scaleX: .91, scaleY: .87, offsetX: 3, offsetY: 6, hotspotX: 12, hotspotY: 7, bitting: [1, 4, 6, 2, 5, 3] }),
    comms: Object.freeze({ rotation: -32, roll: -6, skewX: -2, scaleX: .95, scaleY: .90, offsetX: 4, offsetY: 5, hotspotX: 13, hotspotY: 6, bitting: [4, 2, 6, 3, 5, 1] })
  });

  function perspectiveFor(station) {
    return STATION_KEY_PERSPECTIVE[station] || STATION_KEY_PERSPECTIVE.helm;
  }

  function capPath(profile, cx, top) {
    const w = profile.width;
    const h = profile.height;
    const x = cx - w / 2;
    const y = top;
    const b = x + w;
    switch (profile.shape) {
      case "chamfer": return `M${x + 4} ${y} H${b - 4} L${b} ${y + 4} V${y + h - 4} L${b - 4} ${y + h} H${x + 4} L${x} ${y + h - 4} V${y + 4}Z`;
      case "hex": return `M${x + 5} ${y} H${b - 5} L${b} ${y + 8} V${y + h - 8} L${b - 5} ${y + h} H${x + 5} L${x} ${y + h - 8} V${y + 8}Z`;
      case "taper": return `M${x + 3} ${y} H${b - 3} L${b} ${y + h - 8} L${b - 4} ${y + h} H${x + 4} L${x} ${y + h - 8}Z`;
      case "notch": return `M${x} ${y} H${b} V${y + 12} L${b - 4} ${y + 16} L${b} ${y + 20} V${y + h} H${x} V${y + 20} L${x + 4} ${y + 16} L${x} ${y + 12}Z`;
      case "shield": return `M${x + 3} ${y} H${b - 3} L${b} ${y + 5} V${y + h - 14} Q${cx} ${y + h} ${cx} ${y + h} Q${x} ${y + h - 14} ${x} ${y + h - 14} V${y + 5}Z`;
      case "dogtag": return `M${x + 4} ${y} H${b - 4} Q${b} ${y} ${b} ${y + 4} V${y + h - 4} Q${b} ${y + h} ${b - 4} ${y + h} H${x + 4} Q${x} ${y + h} ${x} ${y + h - 4} V${y + 4} Q${x} ${y} ${x + 4} ${y}Z`;
      case "waist": return `M${x} ${y} H${b} L${b - 3} ${y + 12} L${b} ${y + 24} V${y + h} H${x} V${y + 24} L${x + 3} ${y + 12}Z`;
      default: return `M${x + profile.radius} ${y} H${b - profile.radius} Q${b} ${y} ${b} ${y + profile.radius} V${y + h - profile.radius} Q${b} ${y + h} ${b - profile.radius} ${y + h} H${x + profile.radius} Q${x} ${y + h} ${x} ${y + h - profile.radius} V${y + profile.radius} Q${x} ${y} ${x + profile.radius} ${y}Z`;
    }
  }

  function keyCapMarkup(profile, rotation = -34) {
    const cx = 60;
    const top = 22;
    const w = profile.width;
    const h = profile.height;
    const x = cx - w / 2;
    return `<g data-key-cap data-key-base-rotation="${rotation}" transform="rotate(${rotation} ${cx} ${top + h / 2})"><path d="${capPath(profile, cx, top)}" fill="${profile.edge}"/><path d="${capPath({ ...profile, width: Math.max(10, w - 5), height: h - 6, radius: Math.max(1, profile.radius - 1) }, cx, top + 3)}" fill="${profile.face}" stroke="${profile.highlight}" stroke-width="1.5"/><path d="M${cx - 4} ${top + 9} H${cx + 4} M${cx - 4} ${top + 14} H${cx + 3}" stroke="${profile.highlight}" stroke-width="1.4" opacity=".7"/>${profile.shape === "ribbed" ? `<path d="M${x + 4} ${top + 20} H${x + w - 4} M${x + 4} ${top + 25} H${x + w - 4} M${x + 4} ${top + 30} H${x + w - 4}" stroke="${profile.highlight}" opacity=".55"/>` : ""}<circle cx="${cx}" cy="${top + h - 5}" r="3.4" fill="${profile.edge}" stroke="${profile.highlight}" stroke-width="1.3"/></g>`;
  }

  function bladeMarkup(perspective) {
    const cx = 60;
    const shoulderY = 25;
    const tipY = -34;
    const half = 5.4;
    const bits = perspective.bitting;
    const left = [];
    const right = [];
    const step = (shoulderY - tipY - 16) / Math.max(1, bits.length - 1);
    bits.forEach((depth, index) => {
      const y = tipY + 11 + index * step;
      const inset = 1.1 + depth * .48;
      left.push(`${(cx - half + inset).toFixed(2)},${y.toFixed(2)}`);
      right.unshift(`${(cx + half - inset * .58).toFixed(2)},${(y + 2.8).toFixed(2)}`);
    });
    const path = `M${cx - 2.2},${tipY} L${cx - half},${tipY + 8} L${left.join(" L")} L${cx - half},${shoulderY - 5} L${cx - 8.8},${shoulderY} L${cx + 8.8},${shoulderY} L${cx + half},${shoulderY - 5} L${right.join(" L")} L${cx + half},${tipY + 8} L${cx + 2.2},${tipY} Z`;
    return `<g class="exo-cursor-key-blade" transform="rotate(${perspective.rotation} 60 47)"><path d="${path}" fill="url(#bladeMetal)" stroke="#242729" stroke-width="1.25"/><path d="M55.7 ${tipY + 12} L55.7 ${shoulderY - 7} M59.2 ${tipY + 6} L59.2 ${shoulderY - 4}" stroke="#f1eee3" stroke-width=".8" opacity=".62"/><path d="M63.5 ${tipY + 10} L63.5 ${shoulderY - 7}" stroke="#555b5d" stroke-width="1" opacity=".8"/></g>`;
  }

  function charmShapeMarkup(charm) {
    const fill = charm.fill;
    const accent = charm.accent;
    const stroke = "#28231d";
    const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"`;
    switch (charm.shape) {
      case "clover": return `<g ${common}><circle cx="-6" cy="7" r="7"/><circle cx="6" cy="7" r="7"/><circle cx="-6" cy="18" r="7"/><circle cx="6" cy="18" r="7"/><path d="M0 20 C-2 27 -5 31 -9 35" fill="none"/></g>`;
      case "dice": return `<g ${common}><rect x="-15" y="3" width="22" height="22" rx="4"/><rect x="6" y="11" width="22" height="22" rx="4"/><g fill="${accent}" stroke="none"><circle cx="-9" cy="9" r="2"/><circle cx="1" cy="19" r="2"/><circle cx="12" cy="17" r="2"/><circle cx="22" cy="27" r="2"/><circle cx="22" cy="17" r="2"/></g></g>`;
      case "cat": return `<g ${common}><path d="M-12 11 L-9 1 L-2 7 Q0 5 2 7 L9 1 L12 11 Q15 18 10 24 Q5 30 0 30 Q-7 30 -11 24 Q-16 18 -12 11Z"/><path d="M10 25 Q22 28 18 37" fill="none"/><circle cx="-5" cy="16" r="1.5" fill="${accent}"/><circle cx="5" cy="16" r="1.5" fill="${accent}"/></g>`;
      case "dog": return `<g ${common}><path d="M-10 8 Q0 2 10 8 Q15 14 12 23 Q7 31 0 31 Q-8 31 -12 23 Q-15 14 -10 8Z"/><path d="M-10 10 Q-19 10 -17 22 Q-14 28 -9 23 M10 10 Q19 10 17 22 Q14 28 9 23"/><ellipse cx="0" cy="22" rx="5" ry="4" fill="${accent}"/></g>`;
      case "anchor": return `<g ${common}><circle cx="0" cy="5" r="4"/><path d="M0 9 V31 M-10 14 H10 M-16 24 Q-12 34 0 35 Q12 34 16 24 M-16 24 L-11 20 M16 24 L11 20" fill="none" stroke-width="3"/></g>`;
      case "horseshoe": return `<path ${common} d="M-13 4 Q-20 17 -14 29 Q-8 39 0 39 Q8 39 14 29 Q20 17 13 4 L7 8 Q12 18 8 27 Q5 33 0 33 Q-5 33 -8 27 Q-12 18 -7 8Z"/>`;
      case "skull": return `<g ${common}><path d="M-13 13 Q-13 2 0 1 Q13 2 13 13 Q13 23 7 27 L7 34 H-7 V27 Q-13 23 -13 13Z"/><circle cx="-5" cy="14" r="3.5" fill="${stroke}"/><circle cx="5" cy="14" r="3.5" fill="${stroke}"/><path d="M-5 29 H5 M-2 26 V34 M2 26 V34" fill="none"/></g>`;
      case "wrench": return `<path ${common} d="M-12 2 Q-4 0 0 6 L-5 11 L0 16 L5 11 L17 27 Q20 31 16 35 Q12 38 8 34 L-5 18 Q-12 20 -16 14 Q-20 7 -12 2Z"/>`;
      case "rocket": return `<g ${common}><path d="M0 1 Q10 10 8 24 L4 31 H-4 L-8 24 Q-10 10 0 1Z"/><circle cx="0" cy="15" r="4" fill="none"/><path d="M-5 29 L-10 38 L-2 34 M5 29 L10 38 L2 34"/></g>`;
      case "star": return `<path ${common} d="M0 1 L5 12 L17 13 L8 21 L11 34 L0 27 L-11 34 L-8 21 L-17 13 L-5 12Z"/>`;
      case "moon": return `<path ${common} d="M8 1 Q-7 7 -7 20 Q-7 32 8 38 Q-1 29 2 19 Q4 10 8 1Z"/>`;
      case "heart": return `<path ${common} d="M0 36 L-14 20 Q-21 11 -14 5 Q-6 -2 0 7 Q6 -2 14 5 Q21 11 14 20Z"/>`;
      case "fish": return `<g ${common}><ellipse cx="-2" cy="18" rx="14" ry="9"/><path d="M12 18 L24 8 V28Z"/><circle cx="-8" cy="16" r="1.7" fill="${accent}" stroke="none"/></g>`;
      case "bell": return `<g ${common}><path d="M-13 28 H13 Q8 23 8 14 Q8 5 0 4 Q-8 5 -8 14 Q-8 23 -13 28Z"/><circle cx="0" cy="32" r="4"/><path d="M-4 3 Q0 -2 4 3" fill="none"/></g>`;
      case "feather": return `<g ${common}><path d="M-4 34 Q-1 12 15 2 Q18 17 6 27 Q1 31 -4 34Z"/><path d="M-10 39 L9 13 M0 26 L-8 22 M4 21 L12 20 M-2 31 L-11 28" fill="none"/></g>`;
      case "compass": return `<g ${common}><circle cx="0" cy="19" r="16"/><path d="M0 4 L5 19 L0 34 L-5 19Z" fill="${accent}"/><path d="M-15 19 H15 M0 4 V34" fill="none"/></g>`;
      case "gear": return `<g ${common}><path d="M-4 2 H4 L6 8 L12 5 L17 11 L13 16 L19 19 L17 27 L11 27 L10 34 H2 L0 29 L-6 33 L-12 27 L-9 22 L-16 19 L-14 11 L-8 12Z"/><circle cx="1" cy="19" r="7" fill="none"/></g>`;
      case "knight": return `<path ${common} d="M-11 35 H13 L10 28 Q7 22 4 18 Q11 11 6 4 Q1 0 -8 2 Q-4 7 -7 12 Q-12 17 -11 24 Q-9 29 -5 31Z"/>`;
      case "boot": return `<path ${common} d="M-8 2 H5 V22 Q8 27 19 28 V35 H-13 Q-17 31 -12 26 L-8 22Z"/>`;
      case "mushroom": return `<g ${common}><path d="M-17 16 Q-10 1 0 1 Q10 1 17 16Z"/><path d="M-5 16 H5 L8 35 H-8Z"/></g>`;
      case "planet": return `<g ${common}><circle cx="0" cy="19" r="11"/><ellipse cx="0" cy="19" rx="22" ry="7" transform="rotate(-14 0 19)" fill="none"/></g>`;
      case "cassette": return `<g ${common}><rect x="-18" y="6" width="36" height="27" rx="2"/><circle cx="-8" cy="18" r="5" fill="none"/><circle cx="8" cy="18" r="5" fill="none"/><path d="M-9 31 L-5 24 H5 L9 31Z"/></g>`;
      case "helmet": return `<g ${common}><path d="M-16 27 Q-14 5 0 3 Q15 6 16 27 H7 L4 20 H-5 L-8 27Z"/><path d="M-5 14 H12" fill="none"/></g>`;
      case "spider": return `<g ${common}><circle cx="0" cy="18" r="7"/><circle cx="0" cy="8" r="5"/><path d="M-5 12 L-16 5 M-6 16 L-18 13 M-6 22 L-18 28 M5 12 L16 5 M6 16 L18 13 M6 22 L18 28 M-4 26 L-12 36 M4 26 L12 36" fill="none"/></g>`;
      case "frog": return `<g ${common}><ellipse cx="0" cy="21" rx="14" ry="11"/><circle cx="-8" cy="8" r="6"/><circle cx="8" cy="8" r="6"/><circle cx="-8" cy="8" r="1.5" fill="${accent}"/><circle cx="8" cy="8" r="1.5" fill="${accent}"/><path d="M-10 29 L-17 36 M10 29 L17 36" fill="none"/></g>`;
      case "owl": return `<g ${common}><path d="M-13 7 L-8 1 L-2 6 Q0 4 2 6 L8 1 L13 7 V25 Q7 35 0 36 Q-7 35 -13 25Z"/><circle cx="-6" cy="14" r="5" fill="none"/><circle cx="6" cy="14" r="5" fill="none"/><path d="M0 17 L-3 22 H3Z"/></g>`;
      case "shell": return `<g ${common}><path d="M-15 30 Q-17 15 -9 7 Q0 -1 9 7 Q17 15 15 30Z"/><path d="M0 5 V30 M-7 8 L-5 30 M7 8 L5 30 M-13 16 L-9 31 M13 16 L9 31" fill="none"/></g>`;
      case "lightning": return `<path ${common} d="M4 1 L-12 20 H-2 L-7 38 L14 15 H4Z"/>`;
      case "mug": return `<g ${common}><rect x="-14" y="8" width="24" height="25" rx="3"/><path d="M10 13 H17 Q23 14 21 22 Q19 28 10 26" fill="none"/><path d="M-7 5 Q-10 1 -7 -2 M0 5 Q-3 1 0 -2" fill="none"/></g>`;
      case "book": return `<g ${common}><path d="M0 7 Q-8 3 -17 6 V31 Q-8 28 0 33Z"/><path d="M0 7 Q8 3 17 6 V31 Q8 28 0 33Z"/><path d="M0 7 V33" fill="none"/></g>`;
      case "octopus": return `<g ${common}><path d="M-12 16 Q-12 2 0 2 Q12 2 12 16 V23 H-12Z"/><path d="M-10 22 Q-16 29 -10 36 M-5 22 Q-8 31 -3 37 M0 22 V38 M5 22 Q8 31 3 37 M10 22 Q16 29 10 36" fill="none"/></g>`;
      case "tooth": return `<path ${common} d="M-14 3 Q0 -1 14 3 Q9 15 5 35 L0 27 L-5 35 Q-9 15 -14 3Z"/>`;
      case "acorn": return `<g ${common}><ellipse cx="0" cy="20" rx="11" ry="14"/><path d="M-13 11 Q0 2 13 11 L10 16 H-10Z"/><path d="M0 5 Q2 0 6 -2" fill="none"/></g>`;
      case "robot": return `<g ${common}><rect x="-13" y="8" width="26" height="22" rx="3"/><path d="M0 8 V2 M-18 14 H-13 M13 14 H18 M-8 30 V37 M8 30 V37" fill="none"/><circle cx="-6" cy="17" r="2" fill="${accent}"/><circle cx="6" cy="17" r="2" fill="${accent}"/><path d="M-6 24 H6" fill="none"/></g>`;
      case "ladybug": return `<g ${common}><ellipse cx="0" cy="20" rx="13" ry="16"/><circle cx="0" cy="4" r="6"/><path d="M0 8 V35" fill="none"/><g fill="${accent}" stroke="none"><circle cx="-6" cy="16" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="-6" cy="25" r="2"/><circle cx="6" cy="25" r="2"/></g></g>`;
      case "dragon": return `<path ${common} d="M-15 31 Q-10 20 -6 15 Q-12 11 -9 4 Q-2 10 2 7 Q8 2 14 7 Q8 8 7 14 Q13 17 17 26 Q9 23 5 26 Q2 31 5 37 Q-3 34 -5 27 Q-9 34 -15 31Z"/>`;
      case "sun": return `<g ${common}><circle cx="0" cy="19" r="10"/><path d="M0 1 V6 M0 32 V38 M-18 19 H-12 M12 19 H18 M-13 6 L-9 10 M13 6 L9 10 M-13 32 L-9 28 M13 32 L9 28" fill="none" stroke-width="3"/></g>`;
      case "tag": return `<g ${common}><path d="M-11 3 H11 L14 8 V35 H-14 V8Z"/><circle cx="0" cy="8" r="3" fill="none"/><path d="M-6 21 H6 M-6 27 H3" fill="none"/></g>`;
      case "pinecone": return `<g ${common}><path d="M0 1 Q12 8 11 22 Q10 35 0 39 Q-10 35 -11 22 Q-12 8 0 1Z"/><path d="M-6 9 L6 15 L-6 21 L6 27 L-5 33 M6 9 L-6 15 L6 21 L-6 27 L5 33" fill="none"/></g>`;
      default: return `<path ${common} d="M0 0 C9 5 12 14 8 24 C4 34 -4 39 -12 34 C-20 29 -19 19 -12 12 C-7 7 -5 2 0 0Z"/>`;
    }
  }

  function charmMarkup(station, charm) {
    return `<g data-key-charm="${station}" transform="rotate(0 60 76)"><path d="M60 75 C64 79 68 82 72 87" fill="none" stroke="#8c7a55" stroke-width="1.8" stroke-linecap="round"/><circle cx="63" cy="79" r="1.4" fill="#ad965f"/><circle cx="67" cy="83" r="1.4" fill="#ad965f"/><circle cx="71" cy="87" r="1.4" fill="#ad965f"/><g transform="translate(75 88) scale(.72)">${charmShapeMarkup(charm)}</g></g>`;
  }

  function cursorSvg(station) {
    const loadout = window.EXO_KEY_LOADOUT?.[station];
    if (!loadout?.cap || !loadout?.charm) return null;
    const perspective = perspectiveFor(station);
    const outer = `translate(${perspective.offsetX} ${perspective.offsetY}) rotate(${perspective.roll} 60 48) skewX(${perspective.skewX}) scale(${perspective.scaleX} ${perspective.scaleY})`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="-8 -42 145 178" overflow="visible"><defs><linearGradient id="bladeMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#41484b"/><stop offset=".23" stop-color="#d7d9d4"/><stop offset=".48" stop-color="#7d8586"/><stop offset=".72" stop-color="#ece8dc"/><stop offset="1" stop-color="#474d4f"/></linearGradient><filter id="shadow" x="-45%" y="-45%" width="190%" height="190%"><feDropShadow dx="1" dy="4" stdDeviation="2.5" flood-color="#000" flood-opacity=".84"/></filter></defs><g filter="url(#shadow)" transform="${outer}">${bladeMarkup(perspective)}${keyCapMarkup(loadout.cap, perspective.rotation)}${charmMarkup(station, loadout.charm)}</g></svg>`;
  }

  function stationFromDom() {
    const selected = document.querySelector("#station-tabs [data-station][aria-selected='true']");
    if (selected?.dataset.station) return selected.dataset.station;
    const controls = document.querySelector("#station-panel .exo-physical-controls");
    const stationClass = controls ? [...controls.classList].find(name => name.startsWith("station-")) : null;
    return stationClass ? stationClass.slice("station-".length) : null;
  }

  function cursorForStation(station) {
    if (cache.has(station)) return cache.get(station);
    const svg = cursorSvg(station);
    if (!svg) return null;
    const perspective = perspectiveFor(station);
    const value = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${perspective.hotspotX} ${perspective.hotspotY}, auto`;
    cache.set(station, value);
    return value;
  }

  function syncCursor() {
    syncQueued = false;
    const station = stationFromDom();
    if (!station || station === currentStation) return;
    const cursor = cursorForStation(station);
    if (!cursor) return;
    currentStation = station;
    document.documentElement.style.setProperty("--exo-station-key-cursor", cursor);
    if (document.body) document.body.dataset.exoKeyCursorStation = station;
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(syncCursor);
  }

  function install() {
    const tabs = document.getElementById("station-tabs");
    const panel = document.getElementById("station-panel");
    if (!tabs || !panel || !window.EXO_KEY_LOADOUT) return;
    observer = new MutationObserver(queueSync);
    observer.observe(tabs, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    observer.observe(panel, { childList: true, subtree: true });
    document.addEventListener("click", event => {
      if (event.target.closest?.("#station-tabs [data-station], #crew-scenario-reset")) queueSync();
    }, true);
    queueSync();
  }

  window.EXO_STATION_KEY_CURSOR = Object.freeze({
    perspectives: STATION_KEY_PERSPECTIVE,
    sync: queueSync,
    get station() { return currentStation; }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();