(() => {
  "use strict";

  if (window.EXO_OPS_MANUAL_WINDOW) return;

  const LETTER_RATIO = 8.5 / 11;
  const DEFAULT_WIDTH = 650;
  const MIN_WIDTH = 390;
  const PAGE_STEPS = 2;
  const INDEX_ITEMS = 11;
  const WINDOW_MARGIN = 12;
  const DRAG_FRICTION = 0.915;
  const EDGE_RESTITUTION = 0.28;
  const MAX_TILT = 2.8;

  let sourceOverlay = null;
  let sourceClose = null;
  let book = null;
  let model = null;
  let pages = [];
  let pageIndex = 0;
  let windowState = { x: null, y: null, width: DEFAULT_WIDTH, vx: 0, vy: 0, tilt: 0 };
  let drag = null;
  let resize = null;
  let inertiaFrame = 0;
  let pageAnimationTimer = 0;
  let observer = null;
  let audioContext = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function viewportBounds(width = windowState.width) {
    const maxWidth = Math.max(280, Math.min(window.innerWidth - WINDOW_MARGIN * 2, (window.innerHeight - WINDOW_MARGIN * 2) * LETTER_RATIO));
    const minWidth = Math.min(MIN_WIDTH, maxWidth);
    const actualWidth = clamp(width, minWidth, maxWidth);
    const height = actualWidth / LETTER_RATIO;
    return {
      minWidth,
      maxWidth,
      width: actualWidth,
      height,
      maxX: Math.max(WINDOW_MARGIN, window.innerWidth - actualWidth - WINDOW_MARGIN),
      maxY: Math.max(WINDOW_MARGIN, window.innerHeight - height - WINDOW_MARGIN)
    };
  }

  function normalizeWindowState(centerIfUnset = false) {
    const bounds = viewportBounds(windowState.width);
    windowState.width = bounds.width;
    if (centerIfUnset || !Number.isFinite(windowState.x) || !Number.isFinite(windowState.y)) {
      windowState.x = Math.max(WINDOW_MARGIN, (window.innerWidth - bounds.width) / 2);
      windowState.y = Math.max(WINDOW_MARGIN, (window.innerHeight - bounds.height) / 2);
    }
    windowState.x = clamp(windowState.x, WINDOW_MARGIN, bounds.maxX);
    windowState.y = clamp(windowState.y, WINDOW_MARGIN, bounds.maxY);
    return bounds;
  }

  function applyWindowGeometry() {
    if (!book) return;
    const bounds = normalizeWindowState(false);
    book.style.setProperty("--ops-book-width", `${bounds.width}px`);
    book.style.setProperty("--ops-book-tilt", `${windowState.tilt.toFixed(3)}deg`);
    book.style.left = `${windowState.x.toFixed(1)}px`;
    book.style.top = `${windowState.y.toFixed(1)}px`;
  }

  function stationCodeFromTitle(title) {
    const match = String(title || "").match(/^([A-Z]{3})\s*[—-]/);
    return match?.[1] || "OPS";
  }

  function extractModel(overlay) {
    const header = overlay.querySelector(".exo-manual-header");
    const title = header?.querySelector("h3")?.textContent?.trim() || "OPS — Crew Station";
    const publication = header?.querySelector("p")?.textContent?.trim() || "Publication BLV-071 · Revision 8C";
    const note = overlay.querySelector(".exo-manual-note")?.innerHTML || "";
    const entries = [...overlay.querySelectorAll(".exo-manual-entry")].map((entry, index) => {
      const entryHeader = entry.querySelector("header");
      const code = entryHeader?.querySelector(".exo-manual-procedure-code")?.textContent?.trim() || `${stationCodeFromTitle(title)}-${String(index + 1).padStart(2, "0")}`;
      const nameNode = entryHeader?.querySelector("strong");
      const meta = entryHeader?.querySelector("b")?.textContent?.trim() || "";
      const paragraphs = [...entry.querySelectorAll(":scope > p")].map(node => node.outerHTML);
      const steps = [...entry.querySelectorAll(":scope > ol > li")].map(node => node.outerHTML);
      const name = nameNode?.textContent?.replace(/\s+/g, " ").trim() || `Procedure ${index + 1}`;
      const nameHtml = nameNode?.innerHTML || esc(name);
      const search = `${entry.dataset.manualSearch || ""} ${code} ${name} ${meta}`.toLowerCase();
      return { code, name, nameHtml, meta, paragraphs, steps, search, index };
    });
    return { title, publication, note, entries, stationCode: stationCodeFromTitle(title) };
  }

  function buildPages(data) {
    const result = [
      { type: "cover", label: "Cover" },
      { type: "frontmatter", label: "About this manual" }
    ];

    for (let start = 0; start < data.entries.length; start += INDEX_ITEMS) {
      result.push({ type: "index", label: "Procedure index", start, entries: data.entries.slice(start, start + INDEX_ITEMS) });
    }

    data.entries.forEach(proc => {
      const chunks = [];
      if (!proc.steps.length) chunks.push([]);
      for (let i = 0; i < proc.steps.length; i += PAGE_STEPS) chunks.push(proc.steps.slice(i, i + PAGE_STEPS));
      chunks.forEach((steps, part) => result.push({
        type: "procedure",
        label: proc.name,
        proc,
        part,
        parts: chunks.length,
        steps,
        search: proc.search
      }));
    });
    return result;
  }

  function coverMarkup() {
    return `<section class="ops-book-page ops-book-cover">
      <div class="ops-cover-spine-label">BLV-071</div>
      <div class="ops-cover-rule"></div>
      <div class="ops-cover-mark"><span>BLACKLIGHT</span><b>EXO</b></div>
      <div class="ops-cover-title">
        <small>CREW STATION OPERATING INSTRUCTIONS</small>
        <h1>${esc(model.title)}</h1>
        <p>HUMAN STANDARD · FIELD / REPAIR GUIDE</p>
      </div>
      <div class="ops-cover-spec">
        <span>TECHNICAL MANUAL FORMAT</span>
        <b>8.5 × 11 IN</b>
        <small>LETTER FORMAT · FIXED PROPORTION</small>
      </div>
      <div class="ops-cover-footer">
        <span>${esc(model.publication)}</span>
        <span>AUTHORIZED WATCHSTATION COPY</span>
      </div>
    </section>`;
  }

  function frontMatterMarkup() {
    return `<section class="ops-book-page ops-book-paper ops-book-frontmatter">
      <header class="ops-paper-header"><b>BLV-071</b><span>${esc(model.stationCode)} · GENERAL INFORMATION</span></header>
      <div class="ops-paper-body">
        <h2>Operating Instructions</h2>
        <p class="ops-lead">This station manual is presented as a bounded technical volume. Use the page controls, keyboard arrows, or Page Up / Page Down to move through the book. The sheet is intentionally fixed to the physical proportion of an 8.5 × 11 inch repair guide.</p>
        <div class="ops-frontmatter-note">${model.note}</div>
        <div class="ops-physical-specs">
          <div><span>Page format</span><b>8.5 × 11 in</b></div>
          <div><span>Nominal volume</span><b>0.5–1.5 in thick</b></div>
          <div><span>Handling model</span><b>Weighted / inertial</b></div>
          <div><span>Navigation</span><b>Discrete pages</b></div>
        </div>
      </div>
      <footer class="ops-paper-footer"><span>BLACKLIGHT EXO · HUMAN STANDARD</span><b>FRONT MATTER</b></footer>
    </section>`;
  }

  function indexMarkup(page) {
    return `<section class="ops-book-page ops-book-paper ops-book-index-page">
      <header class="ops-paper-header"><b>BLV-071</b><span>${esc(model.stationCode)} · PROCEDURE INDEX</span></header>
      <div class="ops-paper-body">
        <h2>Procedure Index</h2>
        <div class="ops-book-index-list">${page.entries.map(proc => `<button type="button" data-ops-jump-procedure="${proc.index}"><b>${esc(proc.code)}</b><span>${esc(proc.name)}</span><small>${esc(proc.meta)}</small></button>`).join("")}</div>
      </div>
      <footer class="ops-paper-footer"><span>${page.start + 1}–${page.start + page.entries.length} OF ${model.entries.length} ENTRIES</span><b>INDEX</b></footer>
    </section>`;
  }

  function procedureMarkup(page) {
    const proc = page.proc;
    const classification = page.part === 0 ? proc.paragraphs.join("") : `<p class="ops-continuation-note"><b>CONTINUED.</b> Continue the required operating sequence from the preceding sheet.</p>`;
    return `<section class="ops-book-page ops-book-paper ops-book-procedure-page" data-procedure-index="${proc.index}">
      <header class="ops-paper-header"><b>${esc(proc.code)}</b><span>${esc(model.stationCode)} · OPERATING PROCEDURE</span></header>
      <div class="ops-paper-body">
        <div class="ops-procedure-heading"><div><small>AUTHORIZED PROCEDURE</small><h2>${proc.nameHtml}</h2></div><b>${esc(proc.meta)}</b></div>
        ${classification}
        <h3>Operating Sequence — Required Control Positions</h3>
        <ol class="ops-book-step-list" start="${page.part * PAGE_STEPS + 1}">${page.steps.join("")}</ol>
      </div>
      <footer class="ops-paper-footer"><span>${esc(proc.code)} · SHEET ${page.part + 1} OF ${page.parts}</span><b>${page.part + 1}/${page.parts}</b></footer>
    </section>`;
  }

  function pageMarkup(page) {
    if (!page) return "";
    if (page.type === "cover") return coverMarkup();
    if (page.type === "frontmatter") return frontMatterMarkup();
    if (page.type === "index") return indexMarkup(page);
    return procedureMarkup(page);
  }

  function chromeMarkup() {
    return `<div class="ops-book-titlebar" data-ops-book-drag>
      <div><b>OPS MANUAL</b><span>${esc(model.title)}</span></div>
      <div class="ops-book-title-actions">
        <button type="button" data-ops-cover title="Return to cover">COVER</button>
        <button type="button" data-ops-source-close title="Close manual" aria-label="Close operations manual">×</button>
      </div>
    </div>
    <div class="ops-book-search-row">
      <label><span>INDEX SEARCH</span><input type="search" data-ops-book-search placeholder="Procedure, control, tier, code…" autocomplete="off"></label>
      <button type="button" data-ops-book-search-go>GO</button>
      <small data-ops-search-status>${model.entries.length} procedures</small>
    </div>`;
  }

  function navigatorMarkup() {
    const page = pages[pageIndex];
    return `<div class="ops-book-nav">
      <button type="button" data-ops-prev ${pageIndex <= 0 ? "disabled" : ""} aria-label="Previous page">‹</button>
      <div><b>PAGE ${pageIndex + 1}</b><span>${pages.length} · ${esc(page?.label || "")}</span></div>
      <button type="button" data-ops-next ${pageIndex >= pages.length - 1 ? "disabled" : ""} aria-label="Next page">›</button>
    </div>`;
  }

  function renderPage(direction = 0, withSound = false) {
    if (!book || !pages.length) return;
    pageIndex = clamp(pageIndex, 0, pages.length - 1);
    const stage = book.querySelector("[data-ops-book-stage]");
    const nav = book.querySelector("[data-ops-book-nav]");
    if (!stage || !nav) return;
    clearTimeout(pageAnimationTimer);
    stage.classList.remove("turn-next", "turn-prev");
    stage.innerHTML = pageMarkup(pages[pageIndex]);
    nav.innerHTML = navigatorMarkup();
    if (direction) {
      void stage.offsetWidth;
      stage.classList.add(direction > 0 ? "turn-next" : "turn-prev");
      pageAnimationTimer = window.setTimeout(() => stage.classList.remove("turn-next", "turn-prev"), 340);
    }
    if (withSound) playPageFlip(direction);
  }

  function setPage(next, direction = 0, withSound = true) {
    const target = clamp(Number(next) || 0, 0, Math.max(0, pages.length - 1));
    if (target === pageIndex) return;
    const inferredDirection = direction || (target > pageIndex ? 1 : -1);
    pageIndex = target;
    renderPage(inferredDirection, withSound);
  }

  function pageForProcedure(procIndex) {
    return pages.findIndex(page => page.type === "procedure" && page.proc?.index === Number(procIndex));
  }

  function runSearch() {
    if (!book) return;
    const input = book.querySelector("[data-ops-book-search]");
    const status = book.querySelector("[data-ops-search-status]");
    const query = String(input?.value || "").trim().toLowerCase();
    if (!query) {
      if (status) status.textContent = `${model.entries.length} procedures`;
      const firstIndex = pages.findIndex(page => page.type === "index");
      if (firstIndex >= 0) setPage(firstIndex, firstIndex > pageIndex ? 1 : -1, true);
      return;
    }
    const match = model.entries.find(proc => proc.search.includes(query));
    if (!match) {
      if (status) status.textContent = "NO MATCH";
      book.classList.remove("search-miss");
      requestAnimationFrame(() => book?.classList.add("search-miss"));
      return;
    }
    const target = pageForProcedure(match.index);
    if (status) status.textContent = `${match.code} · ${match.name}`;
    if (target >= 0) setPage(target, target > pageIndex ? 1 : -1, true);
  }

  function pageFlipContext() {
    if (audioContext) return audioContext;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { audioContext = new Ctx(); } catch (_) { return null; }
    return audioContext;
  }

  function playPageFlip(direction = 1) {
    const ctx = pageFlipContext();
    if (!ctx) {
      window.EXO_CONTROL_AUDIO?.play?.("button-light", { seed: `manual:page:${pageIndex}`, intensity: 0.32 });
      return;
    }
    if (ctx.state === "suspended") ctx.resume?.().catch?.(() => {});
    const duration = 0.19;
    const count = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const envelope = Math.pow(Math.sin(Math.PI * t), 0.7) * (1 - t * 0.38);
      const flutter = 0.6 + 0.4 * Math.sin(t * Math.PI * (direction > 0 ? 12 : 9));
      data[i] = (Math.random() * 2 - 1) * envelope * flutter;
    }
    const source = ctx.createBufferSource();
    const high = ctx.createBiquadFilter();
    const low = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    high.type = "highpass";
    high.frequency.value = direction > 0 ? 620 : 520;
    low.type = "lowpass";
    low.frequency.value = direction > 0 ? 5400 : 4300;
    const master = Number(window.EXO_CONTROL_AUDIO?.masterVolume);
    const volume = Number.isFinite(master) ? master : 0.72;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.16 * volume), ctx.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.buffer = buffer;
    source.playbackRate.value = direction > 0 ? 1.04 : 0.95;
    source.connect(high).connect(low).connect(gain).connect(ctx.destination);
    source.start();
    window.EXO_CONTROL_AUDIO?.play?.("button-light", { seed: `manual:page-edge:${pageIndex}`, intensity: 0.18 });
  }

  function createBookWindow() {
    if (!model) return;
    if (book) book.remove();
    book = document.createElement("section");
    book.className = "exo-ops-book-window";
    book.setAttribute("role", "dialog");
    book.setAttribute("aria-label", `${model.title} operations manual`);
    book.tabIndex = 0;
    book.innerHTML = `${chromeMarkup()}<div class="ops-book-thickness" aria-hidden="true"></div><div class="ops-book-stage" data-ops-book-stage></div><div data-ops-book-nav></div><div class="ops-book-resize" data-ops-book-resize title="Resize manual" aria-label="Resize manual"></div>`;
    document.body.appendChild(book);
    normalizeWindowState(!Number.isFinite(windowState.x));
    applyWindowGeometry();
    renderPage(0, false);
    requestAnimationFrame(() => {
      book?.classList.add("is-open");
      book?.focus({ preventScroll: true });
    });
  }

  function releaseLegacyModalState() {
    const close = sourceClose;
    sourceOverlay = null;
    sourceClose = null;
    if (close?.isConnected) close.click();
  }

  function adoptOverlay(overlay) {
    if (!overlay || overlay.dataset.opsBookAdopted === "true") return;
    overlay.dataset.opsBookAdopted = "true";
    sourceOverlay = overlay;
    sourceClose = overlay.querySelector("[data-manual-close]");
    model = extractModel(overlay);
    pages = buildPages(model);
    pageIndex = 0;
    overlay.classList.add("ops-manual-source-hidden");
    createBookWindow();
    queueMicrotask(releaseLegacyModalState);
  }

  function closeBook() {
    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = 0;
    if (!book) return;
    const closingBook = book;
    closingBook.classList.add("is-closing");
    window.setTimeout(() => {
      if (book === closingBook) book = null;
      closingBook.remove();
    }, 110);
  }

  function beginDrag(event) {
    if (!book || event.button !== 0 || event.target.closest("button,input")) return;
    const handle = event.target.closest("[data-ops-book-drag]");
    if (!handle) return;
    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = 0;
    const now = performance.now();
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: windowState.x,
      originY: windowState.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now
    };
    windowState.vx = 0;
    windowState.vy = 0;
    book.focus({ preventScroll: true });
    book.classList.add("is-dragging");
    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag || drag.id !== event.pointerId || !book) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastTime);
    const bounds = viewportBounds(windowState.width);
    windowState.x = clamp(drag.originX + event.clientX - drag.startX, WINDOW_MARGIN - 20, bounds.maxX + 20);
    windowState.y = clamp(drag.originY + event.clientY - drag.startY, WINDOW_MARGIN - 20, bounds.maxY + 20);
    windowState.vx = (event.clientX - drag.lastX) / dt * 16.67;
    windowState.vy = (event.clientY - drag.lastY) / dt * 16.67;
    windowState.tilt = clamp(windowState.vx * 0.42, -MAX_TILT, MAX_TILT);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    applyWindowGeometry();
    event.preventDefault();
  }

  function endDrag(event, cancelled = false) {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    book?.classList.remove("is-dragging");
    if (cancelled) {
      windowState.vx = 0;
      windowState.vy = 0;
      windowState.tilt = 0;
      applyWindowGeometry();
      return;
    }
    startInertia();
  }

  function startInertia() {
    cancelAnimationFrame(inertiaFrame);
    let last = performance.now();
    const tick = now => {
      if (!book || drag || resize) return;
      const dt = Math.min(2, Math.max(0.45, (now - last) / 16.67));
      last = now;
      const bounds = viewportBounds(windowState.width);
      windowState.x += windowState.vx * dt;
      windowState.y += windowState.vy * dt;
      const friction = Math.pow(DRAG_FRICTION, dt);
      windowState.vx *= friction;
      windowState.vy *= friction;

      if (windowState.x < WINDOW_MARGIN) {
        windowState.x = WINDOW_MARGIN;
        windowState.vx = Math.abs(windowState.vx) * EDGE_RESTITUTION;
      } else if (windowState.x > bounds.maxX) {
        windowState.x = bounds.maxX;
        windowState.vx = -Math.abs(windowState.vx) * EDGE_RESTITUTION;
      }
      if (windowState.y < WINDOW_MARGIN) {
        windowState.y = WINDOW_MARGIN;
        windowState.vy = Math.abs(windowState.vy) * EDGE_RESTITUTION;
      } else if (windowState.y > bounds.maxY) {
        windowState.y = bounds.maxY;
        windowState.vy = -Math.abs(windowState.vy) * EDGE_RESTITUTION;
      }

      windowState.tilt += (clamp(windowState.vx * 0.38, -MAX_TILT, MAX_TILT) - windowState.tilt) * 0.18;
      if (Math.abs(windowState.vx) < 0.035 && Math.abs(windowState.vy) < 0.035) {
        windowState.vx = 0;
        windowState.vy = 0;
        windowState.tilt *= 0.72;
        if (Math.abs(windowState.tilt) < 0.03) windowState.tilt = 0;
      }
      applyWindowGeometry();
      if (windowState.vx || windowState.vy || Math.abs(windowState.tilt) >= 0.03) inertiaFrame = requestAnimationFrame(tick);
      else inertiaFrame = 0;
    };
    inertiaFrame = requestAnimationFrame(tick);
  }

  function beginResize(event) {
    const grip = event.target.closest("[data-ops-book-resize]");
    if (!grip || !book || event.button !== 0) return;
    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = 0;
    resize = { id: event.pointerId, startX: event.clientX, startWidth: windowState.width };
    book.focus({ preventScroll: true });
    book.classList.add("is-resizing");
    grip.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function moveResize(event) {
    if (!resize || resize.id !== event.pointerId || !book) return;
    const bounds = viewportBounds(resize.startWidth + event.clientX - resize.startX);
    windowState.width = bounds.width;
    windowState.x = clamp(windowState.x, WINDOW_MARGIN, bounds.maxX);
    windowState.y = clamp(windowState.y, WINDOW_MARGIN, bounds.maxY);
    windowState.tilt = 0;
    applyWindowGeometry();
    event.preventDefault();
  }

  function endResize(event) {
    if (!resize || resize.id !== event.pointerId) return;
    resize = null;
    book?.classList.remove("is-resizing");
    applyWindowGeometry();
  }

  function handleBookClick(event) {
    if (!book || !event.target.closest(".exo-ops-book-window")) return;
    book.focus({ preventScroll: true });
    if (event.target.closest("[data-ops-source-close]")) {
      event.preventDefault();
      closeBook();
      return;
    }
    if (event.target.closest("[data-ops-prev]")) {
      event.preventDefault();
      setPage(pageIndex - 1, -1, true);
      return;
    }
    if (event.target.closest("[data-ops-next]")) {
      event.preventDefault();
      setPage(pageIndex + 1, 1, true);
      return;
    }
    if (event.target.closest("[data-ops-cover]")) {
      event.preventDefault();
      setPage(0, -1, true);
      return;
    }
    const jump = event.target.closest("[data-ops-jump-procedure]");
    if (jump) {
      event.preventDefault();
      const target = pageForProcedure(jump.dataset.opsJumpProcedure);
      if (target >= 0) setPage(target, 1, true);
      return;
    }
    if (event.target.closest("[data-ops-book-search-go]")) {
      event.preventDefault();
      runSearch();
    }
  }

  function handleBookKeydown(event) {
    if (!book || !book.contains(document.activeElement)) return;
    const focused = document.activeElement;
    const inSearch = focused?.matches?.("[data-ops-book-search]");
    if (inSearch && event.key === "Enter") {
      event.preventDefault();
      runSearch();
      return;
    }
    if (inSearch && event.key !== "Escape") return;
    if (["ArrowRight", "PageDown"].includes(event.key)) {
      event.preventDefault();
      setPage(pageIndex + 1, 1, true);
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      setPage(pageIndex - 1, -1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      setPage(0, -1, true);
    } else if (event.key === "End") {
      event.preventDefault();
      setPage(pages.length - 1, 1, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeBook();
    }
  }

  function scanForOverlay() {
    const overlay = document.querySelector("#station-panel .exo-manual-overlay:not([data-ops-book-adopted='true'])");
    if (overlay) adoptOverlay(overlay);
  }

  function handleStationChange(event) {
    if (!book || !event.target.closest?.("#station-tabs [data-station]")) return;
    closeBook();
  }

  function install() {
    const panel = document.getElementById("station-panel");
    if (!panel) return;
    observer = new MutationObserver(scanForOverlay);
    observer.observe(panel, { childList: true, subtree: true });
    document.addEventListener("click", handleBookClick);
    document.addEventListener("click", handleStationChange, true);
    document.addEventListener("keydown", handleBookKeydown, true);
    document.addEventListener("pointerdown", beginDrag, true);
    document.addEventListener("pointerdown", beginResize, true);
    document.addEventListener("pointermove", event => { moveDrag(event); moveResize(event); }, { passive: false });
    document.addEventListener("pointerup", event => { endDrag(event, false); endResize(event); });
    document.addEventListener("pointercancel", event => { endDrag(event, true); endResize(event); });
    window.addEventListener("resize", () => { if (book) applyWindowGeometry(); });
    scanForOverlay();
  }

  window.EXO_OPS_MANUAL_WINDOW = Object.freeze({
    get isOpen() { return Boolean(book); },
    get page() { return pageIndex; },
    get pageCount() { return pages.length; },
    goToPage: index => setPage(index, 0, true),
    close: closeBook
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
