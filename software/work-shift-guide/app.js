const DEFAULT_GUIDE_NAME = "Work Shift Guide";
const DEFAULT_ROUTE = [];
const ROUTE_SCHEMA_VERSION = 1;

let routeData = structuredClone(DEFAULT_ROUTE);

const DB_NAME = "WorkShiftGuideBlank-v1";
const DB_VERSION = 1;
const STORE_SHIFTS = "shifts";
const STORE_SETTINGS = "settings";

const els = {};
let currentShift = null;
let timerHandle = null;

document.addEventListener("DOMContentLoaded", async () => {
  Object.assign(els, {
    today: document.querySelector("#today"),
    guideTitle: document.querySelector("#guideTitle"),
    status: document.querySelector("#shiftStatus"),
    shiftTime: document.querySelector("#shiftTime"),
    startedAt: document.querySelector("#startedAt"),
    startBtn: document.querySelector("#startBtn"),
    editWorkBtn: document.querySelector("#editWorkBtn"),
    addIssueBtn: document.querySelector("#addIssueBtn"),
    finishBtn: document.querySelector("#finishBtn"),
    routeList: document.querySelector("#routeList"),
    issuesList: document.querySelector("#issuesList"),
    issueDialog: document.querySelector("#issueDialog"),
    issueForm: document.querySelector("#issueForm"),
    issueArea: document.querySelector("#issueArea"),
    issueType: document.querySelector("#issueType"),
    issueNote: document.querySelector("#issueNote"),
    issueContact: document.querySelector("#issueContact"),
    issueManagement: document.querySelector("#issueManagement"),
    issueImmediateAction: document.querySelector("#issueImmediateAction"),
    closeIssue: document.querySelector("#closeIssue"),
    reviewDialog: document.querySelector("#reviewDialog"),
    reviewText: document.querySelector("#reviewText"),
    signoffName: document.querySelector("#signoffName"),
    siteName: document.querySelector("#siteName"),
    closeReview: document.querySelector("#closeReview"),
    completeShift: document.querySelector("#completeShift"),
    historyBtn: document.querySelector("#historyBtn"),
    plannerBtn: document.querySelector("#plannerBtn"),
    plannerDialog: document.querySelector("#plannerDialog"),
    closePlanner: document.querySelector("#closePlanner"),
    plannerMonth: document.querySelector("#plannerMonth"),
    plannerTimeZone: document.querySelector("#plannerTimeZone"),
    plannerPrevMonth: document.querySelector("#plannerPrevMonth"),
    plannerThisMonth: document.querySelector("#plannerThisMonth"),
    plannerNextMonth: document.querySelector("#plannerNextMonth"),
    plannerSummary: document.querySelector("#plannerSummary"),
    plannerCalendar: document.querySelector("#plannerCalendar"),
    plannerEntryForm: document.querySelector("#plannerEntryForm"),
    plannerEntryId: document.querySelector("#plannerEntryId"),
    plannerDate: document.querySelector("#plannerDate"),
    plannerStatus: document.querySelector("#plannerStatus"),
    plannerStartHour: document.querySelector("#plannerStartHour"),
    plannerStartMinute: document.querySelector("#plannerStartMinute"),
    plannerStartAmPm: document.querySelector("#plannerStartAmPm"),
    plannerEndHour: document.querySelector("#plannerEndHour"),
    plannerEndMinute: document.querySelector("#plannerEndMinute"),
    plannerEndAmPm: document.querySelector("#plannerEndAmPm"),
    plannerBreakMinutes: document.querySelector("#plannerBreakMinutes"),
    plannerNotes: document.querySelector("#plannerNotes"),
    plannerDurationPreview: document.querySelector("#plannerDurationPreview"),
    plannerClearEntry: document.querySelector("#plannerClearEntry"),
    plannerDeleteEntry: document.querySelector("#plannerDeleteEntry"),
    plannerEntryList: document.querySelector("#plannerEntryList"),
    plannerEntryCount: document.querySelector("#plannerEntryCount"),
    historyDialog: document.querySelector("#historyDialog"),
    historyList: document.querySelector("#historyList"),
    closeHistory: document.querySelector("#closeHistory"),
    settingsBtn: document.querySelector("#settingsBtn"),
    settingsDialog: document.querySelector("#settingsDialog"),
    settingsForm: document.querySelector("#settingsForm"),
    settingsGuideName: document.querySelector("#settingsGuideName"),
    settingsName: document.querySelector("#settingsName"),
    settingsSite: document.querySelector("#settingsSite"),
    settingsTimeZone: document.querySelector("#settingsTimeZone"),
    settingsSiteRequirements: document.querySelector("#settingsSiteRequirements"),
    settingsShelterPlan: document.querySelector("#settingsShelterPlan"),
    closeSettings: document.querySelector("#closeSettings"),
    workEditorDialog: document.querySelector("#workEditorDialog"),
    workEditorList: document.querySelector("#workEditorList"),
    addWorkArea: document.querySelector("#addWorkArea"),
    resetWorkRoute: document.querySelector("#resetWorkRoute"),
    closeWorkEditor: document.querySelector("#closeWorkEditor"),
    saveWorkRoute: document.querySelector("#saveWorkRoute")
  });

  els.today.textContent = formatFullDate(new Date());

  const savedRouteConfig = await getRouteConfig();
  if (Array.isArray(savedRouteConfig?.route)) {
    routeData = normalizeRoute(savedRouteConfig.route);
  }
  renderRoute();
  populateAreaOptions();
  setupShiftPlannerUI();

  const saved = await loadActiveShift();
  if (saved) currentShift = saved;

  const settings = await getSettings();
  const guideName = applyGuideName(settings.guideName);
  if (els.settingsGuideName) els.settingsGuideName.value = guideName;
  if (settings.name) {
    els.signoffName.value = settings.name;
    els.settingsName.value = settings.name;
  }
  if (settings.site) {
    els.siteName.value = settings.site;
    els.settingsSite.value = settings.site;
  }
  const timeZone = normalizeTimeZone(settings.timeZone);
  setPlannerTimeZone(timeZone);
  if (els.settingsTimeZone) els.settingsTimeZone.value = timeZone;
  if (els.settingsSiteRequirements) els.settingsSiteRequirements.value = settings.siteRequirements || "";
  renderSiteRequirements(settings.siteRequirements);
  if (els.settingsShelterPlan) els.settingsShelterPlan.value = settings.shelterPlan || "";
  renderShelterPlan(settings.shelterPlan);

  wireEvents();
  await setupPosition();
  refreshUI();
  document.documentElement.dataset.ready = "true";

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    if (!document.documentElement.dataset.standalone && !window.WORK_SHIFT_GUIDE_STANDALONE) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
});


function normalizeGuideName(value){
  const name = String(value || "").trim();
  return name || DEFAULT_GUIDE_NAME;
}

function applyGuideName(value){
  const name = normalizeGuideName(value);
  if (els.guideTitle) els.guideTitle.textContent = name;
  document.title = name;
  return name;
}

function currentGuideName(){
  return normalizeGuideName(els.guideTitle?.textContent || document.title);
}

function safeFilenamePart(value){
  return normalizeGuideName(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 60) || "Work-Shift-Guide";
}


function renderSiteRequirements(value){
  const target=document.getElementById("siteRequirementSummary");
  if (!target) return;
  const items=String(value||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if (!items.length){
    target.innerHTML='<span class="subtle">No site-specific requirements configured yet.</span>';
    return;
  }
  const ul=document.createElement("ul");
  ul.className="plain-list compact";
  items.forEach(item=>{
    const li=document.createElement("li");
    li.textContent=item;
    ul.appendChild(li);
  });
  target.innerHTML="";
  target.appendChild(ul);
}

function renderShelterPlan(value){
  const target=document.getElementById("siteShelterPlanSummary");
  if (!target) return;
  const lines=String(value||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if (!lines.length){target.innerHTML='<span class="subtle">No site-specific shelter/protective-action notes configured yet.</span>';return;}
  const ul=document.createElement("ul");ul.className="plain-list compact";
  lines.forEach(line=>{const li=document.createElement("li");li.textContent=line;ul.appendChild(li);});
  target.innerHTML="";target.appendChild(ul);
}

function wireEvents(){
  els.startBtn.addEventListener("click", startShift);
  els.addIssueBtn.addEventListener("click", () => {
    if (!currentShift) return;
    els.issueForm.reset();
    els.issueDialog.showModal();
  });
  els.closeIssue.addEventListener("click", () => els.issueDialog.close());
  els.issueForm.addEventListener("submit", saveIssue);
  els.finishBtn.addEventListener("click", openReview);
  els.closeReview.addEventListener("click", () => els.reviewDialog.close());
  els.completeShift.addEventListener("click", completeShift);
  els.historyBtn.addEventListener("click", openHistory);
  els.plannerBtn.addEventListener("click", openPlanner);
  els.closePlanner.addEventListener("click", () => els.plannerDialog.close());
  els.plannerMonth.addEventListener("change", () => renderPlanner());
  els.plannerTimeZone.addEventListener("change", savePlannerTimeZone);
  els.plannerPrevMonth.addEventListener("click", () => shiftPlannerMonth(-1));
  els.plannerThisMonth.addEventListener("click", () => setPlannerMonthToToday());
  els.plannerNextMonth.addEventListener("click", () => shiftPlannerMonth(1));
  els.plannerEntryForm.addEventListener("submit", savePlannerEntry);
  els.plannerClearEntry.addEventListener("click", () => resetPlannerEntryForm());
  els.plannerDeleteEntry.addEventListener("click", deletePlannerEntryFromForm);
  [
    els.plannerStartHour, els.plannerStartMinute, els.plannerStartAmPm,
    els.plannerEndHour, els.plannerEndMinute, els.plannerEndAmPm,
    els.plannerBreakMinutes
  ].forEach(el => el.addEventListener("change", updatePlannerDurationPreview));
  els.closeHistory.addEventListener("click", () => els.historyDialog.close());
  els.settingsBtn.addEventListener("click", openSettings);
  els.closeSettings.addEventListener("click", () => els.settingsDialog.close());
  els.settingsForm.addEventListener("submit", saveSettings);

  els.editWorkBtn.addEventListener("click", openWorkEditor);
  els.closeWorkEditor.addEventListener("click", () => els.workEditorDialog.close());
  els.addWorkArea.addEventListener("click", addWorkEditorArea);
  els.resetWorkRoute.addEventListener("click", resetWorkEditor);
  els.saveWorkRoute.addEventListener("click", saveWorkEditor);
}


function normalizeRoute(route){
  return route.map((area, index) => ({
    id: String(area.id || slugify(area.name || `area-${index+1}`)),
    name: String(area.name || `Area ${index+1}`).trim() || `Area ${index+1}`,
    summary: Array.isArray(area.summary) ? area.summary.map(String).map(x => x.trim()).filter(Boolean) : [],
    details: Array.isArray(area.details) ? area.details.map(String).map(x => x.trim()).filter(Boolean) : []
  }));
}

function slugify(value){
  return String(value || "area")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `area-${Date.now()}`;
}

function openWorkEditor(){
  if (currentShift && currentShift.status === "active") {
    alert("Finish the active shift before editing the work route. The current shift keeps a stable work scope.");
    return;
  }
  renderWorkEditor(structuredClone(routeData));
  els.workEditorDialog.showModal();
}

function renderWorkEditor(data){
  els.workEditorList.innerHTML = "";
  data.forEach((area, index) => {
    const card = document.createElement("div");
    card.className = "work-editor-card";
    card.dataset.areaId = area.id || "";

    const head = document.createElement("div");
    head.className = "work-editor-head";

    const title = document.createElement("h3");
    title.textContent = `Area ${index + 1}`;

    const controls = document.createElement("div");
    controls.className = "work-editor-controls";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "btn ghost compact-btn";
    up.textContent = "↑";
    up.title = "Move up";
    up.disabled = index === 0;
    up.addEventListener("click", () => moveEditorCard(card, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "btn ghost compact-btn";
    down.textContent = "↓";
    down.title = "Move down";
    down.disabled = index === data.length - 1;
    down.addEventListener("click", () => moveEditorCard(card, 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn danger compact-btn";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      card.remove();
      relabelEditorCards();
    });

    controls.append(up, down, remove);
    head.append(title, controls);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Area / section name";
    const name = document.createElement("input");
    name.className = "editor-area-name";
    name.value = area.name || "";
    nameLabel.appendChild(name);

    const tasksLabel = document.createElement("label");
    tasksLabel.textContent = "Routine tasks — one per line";
    const tasks = document.createElement("textarea");
    tasks.className = "editor-area-tasks";
    tasks.value = (area.summary || []).join("\n");
    tasksLabel.appendChild(tasks);

    const notesLabel = document.createElement("label");
    notesLabel.textContent = "Guidance / notes — one per line";
    const notes = document.createElement("textarea");
    notes.className = "editor-area-notes notes-box";
    notes.value = (area.details || []).join("\n");
    notesLabel.appendChild(notes);

    card.append(head, nameLabel, tasksLabel, notesLabel);
    els.workEditorList.appendChild(card);
  });
  relabelEditorCards();
}

function moveEditorCard(card, direction){
  if (direction < 0 && card.previousElementSibling) {
    els.workEditorList.insertBefore(card, card.previousElementSibling);
  } else if (direction > 0 && card.nextElementSibling) {
    els.workEditorList.insertBefore(card.nextElementSibling, card);
  }
  relabelEditorCards();
}

function relabelEditorCards(){
  const cards = [...els.workEditorList.querySelectorAll(".work-editor-card")];
  cards.forEach((card, index) => {
    card.querySelector("h3").textContent = `Area ${index + 1}`;
    const buttons = card.querySelectorAll(".work-editor-controls button");
    if (buttons[0]) buttons[0].disabled = index === 0;
    if (buttons[1]) buttons[1].disabled = index === cards.length - 1;
  });
}

function addWorkEditorArea(){
  const current = collectEditorRoute(false);
  current.push({
    id: `custom-${Date.now()}`,
    name: "",
    summary: [],
    details: []
  });
  renderWorkEditor(current);
  const cards = els.workEditorList.querySelectorAll(".work-editor-card");
  cards[cards.length - 1]?.scrollIntoView({behavior:"smooth", block:"center"});
}

function collectEditorRoute(validate=true){
  const cards = [...els.workEditorList.querySelectorAll(".work-editor-card")];
  const result = cards.map((card, index) => {
    const name = card.querySelector(".editor-area-name").value.trim();
    const summary = card.querySelector(".editor-area-tasks").value
      .split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const details = card.querySelector(".editor-area-notes").value
      .split(/\r?\n/).map(x => x.trim()).filter(Boolean);

    if (validate && !name) throw new Error(`Area ${index+1} needs a name.`);
    if (validate && !summary.length) throw new Error(`${name || `Area ${index+1}`} needs at least one routine task.`);

    return {
      id: card.dataset.areaId || slugify(name || `area-${index+1}`),
      name: name || `Area ${index+1}`,
      summary,
      details
    };
  });

  return normalizeRoute(result);
}

async function saveWorkEditor(){
  try {
    const nextRoute = collectEditorRoute(true);
    routeData = nextRoute;
    await setRouteConfig(routeData);
    refreshPositionSummary();
    refreshUI();
    renderRoute();
    populateAreaOptions();
    els.workEditorDialog.close();
  } catch (err) {
    alert(err.message || String(err));
  }
}

function resetWorkEditor(){
  if (!confirm("Clear all areas and tasks in this editor? Save Work Route to apply the change.")) return;
  renderWorkEditor(structuredClone(DEFAULT_ROUTE));
}

function renderRoute(){
  els.routeList.innerHTML = "";
  if (!routeData.length) els.routeList.innerHTML = '<div class="empty">No tasks configured. Use Position Setup to import duties or Edit Work to add your own.</div>';
  for (const area of routeData){
    const details = document.createElement("details");
    details.className = "route-card";
    const summary = document.createElement("summary");
    summary.textContent = area.name;
    const body = document.createElement("div");
    body.className = "route-body";
    const ul = document.createElement("ul");
    for (const task of area.summary){
      const li = document.createElement("li");
      li.textContent = task;
      ul.appendChild(li);
    }
    body.appendChild(ul);
    if (area.details?.length){
      const notes = document.createElement("div");
      notes.className = "route-notes";
      for (const note of area.details){
        const p = document.createElement("p");
        p.textContent = note;
        notes.appendChild(p);
      }
      body.appendChild(notes);
    }
    details.append(summary, body);
    els.routeList.appendChild(details);
  }
}

function populateAreaOptions(){
  els.issueArea.innerHTML = `<option value="">Choose area…</option>`;
  for (const area of routeData){
    const option = document.createElement("option");
    option.value = area.name;
    option.textContent = area.name;
    els.issueArea.appendChild(option);
  }
  const other = document.createElement("option");
  other.value = "Other / Unlisted";
  other.textContent = "Other / Unlisted";
  els.issueArea.appendChild(other);
}

async function startShift(){
  if (currentShift) return;
  if (!routeData.some(area => area.summary.length)) {
    alert("Add or import the position’s duties before starting work.");
    openWorkEditor();
    return;
  }
  const positionSettings = await getSettings();
  currentShift = {
    jobTitle: positionSettings.jobTitle || "",
    department: positionSettings.department || "",
    guideName: currentGuideName(),
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    status: "active",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    issues: [],
    routeSnapshot: structuredClone(routeData),
    recordText: null,
    completedBy: ""
  };
  await putShift(currentShift);
  refreshUI();
}

function refreshUI(){
  const active = !!currentShift && currentShift.status === "active";
  els.startBtn.disabled = active || !routeData.some(area => area.summary.length);
  const setupButton = document.getElementById("positionSetupBtn");
  if (setupButton) setupButton.disabled = active;
  els.editWorkBtn.disabled = active;
  els.addIssueBtn.disabled = !active;
  els.finishBtn.disabled = !active;
  els.status.textContent = active ? "Shift active" : "No active shift";
  els.status.classList.toggle("active", active);

  if (active){
    els.startedAt.textContent = `Started ${formatTime(new Date(currentShift.startedAt))}`;
    startTimer();
  } else {
    els.startedAt.textContent = "Start when you begin the route.";
    stopTimer();
    els.shiftTime.textContent = "00:00";
  }
  renderIssues();
}

function startTimer(){
  stopTimer();
  const update = () => {
    if (!currentShift) return;
    const ms = Date.now() - new Date(currentShift.startedAt).getTime();
    els.shiftTime.textContent = formatDuration(ms);
  };
  update();
  timerHandle = setInterval(update, 30000);
}

function stopTimer(){
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

async function saveIssue(event){
  event.preventDefault();
  if (!currentShift) return;

  const issue = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    area: els.issueArea.value || "Unspecified",
    type: els.issueType.value,
    note: els.issueNote.value.trim(),
    immediateAction: els.issueImmediateAction.value.trim(),
    contactNotified: els.issueContact.checked,
    managementNotified: els.issueManagement.checked
  };

  if (!issue.note){
    alert("Add a short description of the issue.");
    return;
  }

  currentShift.issues.push(issue);
  await putShift(currentShift);
  els.issueDialog.close();
  renderIssues();
}

function renderIssues(){
  els.issuesList.innerHTML = "";
  if (!currentShift || !currentShift.issues?.length){
    els.issuesList.innerHTML = `<div class="empty">No exceptions recorded for the active shift.</div>`;
    return;
  }

  for (const issue of currentShift.issues){
    const card = document.createElement("div");
    card.className = "issue";

    const head = document.createElement("div");
    head.className = "issue-head";
    const main = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${issue.area} — ${issue.type}`;
    const note = document.createElement("div");
    note.textContent = issue.note;
    const time = document.createElement("small");
    time.textContent = formatTime(new Date(issue.createdAt));
    main.append(title, note, time);
    head.appendChild(main);

    const actions = document.createElement("div");
    actions.className = "issue-actions";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn ghost";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeIssue(issue.id));
    actions.appendChild(remove);

    card.append(head, actions);
    els.issuesList.appendChild(card);
  }
}

async function removeIssue(id){
  if (!currentShift) return;
  currentShift.issues = currentShift.issues.filter(x => x.id !== id);
  await putShift(currentShift);
  renderIssues();
}

function openReview(){
  if (!currentShift) return;
  const settingsName = els.settingsName.value.trim();
  const settingsSite = els.settingsSite.value.trim();
  if (!els.signoffName.value.trim() && settingsName) els.signoffName.value = settingsName;
  if (!els.siteName.value.trim() && settingsSite) els.siteName.value = settingsSite;
  els.reviewText.textContent = buildRecordText({
    finishedAt: new Date().toISOString(),
    completedBy: els.signoffName.value.trim() || "(enter name before sign-off)",
    site: els.siteName.value.trim()
  });
  els.reviewDialog.showModal();
}

async function completeShift(){
  if (!currentShift) return;
  const name = els.signoffName.value.trim();
  if (!name){
    alert("Enter the name used for the sign-off record.");
    els.signoffName.focus();
    return;
  }

  const site = els.siteName.value.trim();
  const finishedAt = new Date().toISOString();
  const recordText = buildRecordText({
    finishedAt,
    completedBy: name,
    site
  });

  currentShift.status = "complete";
  currentShift.finishedAt = finishedAt;
  currentShift.completedBy = name;
  currentShift.site = site;
  currentShift.guideName = normalizeGuideName(currentShift.guideName || currentGuideName());
  currentShift.recordText = recordText;
  await putShift(currentShift);

  await setSettings({name, site});
  await recordCompletedShiftInPlanner(currentShift);
  downloadText(recordText, filenameForShift(new Date(finishedAt), currentShift.guideName));

  currentShift = null;
  els.reviewDialog.close();
  refreshUI();
}

function buildRecordText({finishedAt, completedBy, site}){
  const started = new Date(currentShift.startedAt);
  const finished = new Date(finishedAt);
  const duration = formatDurationWords(finished - started);

  let out = [];
  const recordGuideName = normalizeGuideName(currentShift.guideName || currentGuideName());
  out.push(`${recordGuideName.toUpperCase()} — DAILY WORK RECORD`);
  out.push("=".repeat(Math.max(20, recordGuideName.length + 20)));
  out.push("");
  out.push(`Date: ${formatFullDate(started)}`);
  if (currentShift.jobTitle) out.push(`Position: ${currentShift.jobTitle}`);
  if (currentShift.department) out.push(`Department: ${currentShift.department}`);
  if (site) out.push(`Site: ${site}`);
  out.push(`Started: ${formatTime(started)}`);
  out.push(`Signed off: ${formatTime(finished)}`);
  out.push(`Elapsed: ${duration}`);
  out.push(`Completed by: ${completedBy}`);
  out.push("");
  out.push("CERTIFICATION");
  out.push("Routine work described in the procedure below was completed except for the exceptions specifically recorded in this document.");
  out.push("");

  out.push("ROUTINE WORK SCOPE");
  out.push("------------------");
  const signedRoute = currentShift.routeSnapshot || routeData;
  for (const area of signedRoute){
    out.push("");
    out.push(area.name.toUpperCase());
    for (const task of area.summary){
      out.push(`- ${task}`);
    }
  }

  out.push("");
  out.push("EXCEPTIONS / IRREGULARITIES");
  out.push("---------------------------");
  if (!currentShift.issues?.length){
    out.push("None recorded.");
  } else {
    currentShift.issues.forEach((issue, i) => {
      out.push("");
      out.push(`${i + 1}. ${issue.area} — ${issue.type}`);
      out.push(`   Time: ${formatTime(new Date(issue.createdAt))}`);
      out.push(`   Observation: ${issue.note}`);
      if (issue.immediateAction) out.push(`   Immediate action: ${issue.immediateAction}`);
      out.push(`   Contact / team notified: ${issue.contactNotified ? "Yes" : "No"}`);
      out.push(`   Management notified: ${issue.managementNotified ? "Yes" : "No"}`);
    });
  }

  out.push("");
  out.push("SAFETY / REPORTING NOTE");
  out.push("-----------------------");
  out.push("Emergency conditions take priority over routine work. Do not enter or remain in a scene that cannot be approached safely. Document non-emergency irregularities and notify the appropriate site contacts according to workplace procedure.");
  out.push("");
  out.push(`Record generated: ${formatDateTime(finished)}`);
  return out.join("\n");
}

async function openHistory(){
  const rows = await getCompletedShifts();
  els.historyList.innerHTML = "";
  if (!rows.length){
    els.historyList.innerHTML = `<div class="empty">No completed shift records yet.</div>`;
  } else {
    rows.forEach(row => {
      const item = document.createElement("div");
      item.className = "history-item";
      const title = document.createElement("strong");
      title.textContent = formatFullDate(new Date(row.startedAt));
      const meta = document.createElement("div");
      meta.className = "subtle";
      meta.textContent = `${formatTime(new Date(row.startedAt))} – ${formatTime(new Date(row.finishedAt))} · ${row.issues?.length || 0} exception(s)`;

      const actions = document.createElement("div");
      actions.className = "history-actions";
      const download = document.createElement("button");
      download.type = "button";
      download.className = "btn ghost";
      download.textContent = "Download TXT";
      download.addEventListener("click", () => downloadText(row.recordText || "", filenameForShift(new Date(row.finishedAt), row.guideName)));
      actions.appendChild(download);

      item.append(title, meta, actions);
      els.historyList.appendChild(item);
    });
  }
  els.historyDialog.showModal();
}

async function openSettings(){
  const settings = await getSettings();
  els.settingsGuideName.value = normalizeGuideName(settings.guideName || currentGuideName());
  els.settingsName.value = settings.name || "";
  els.settingsSite.value = settings.site || "";
  els.settingsTimeZone.value = normalizeTimeZone(settings.timeZone);
  els.settingsSiteRequirements.value = settings.siteRequirements || "";
  els.settingsShelterPlan.value = settings.shelterPlan || "";
  els.settingsDialog.showModal();
}

async function saveSettings(event){
  event.preventDefault();
  const settings = {
    guideName: normalizeGuideName(els.settingsGuideName.value),
    name: els.settingsName.value.trim(),
    site: els.settingsSite.value.trim(),
    timeZone: normalizeTimeZone(els.settingsTimeZone.value),
    siteRequirements: els.settingsSiteRequirements.value.trim(),
    shelterPlan: els.settingsShelterPlan.value.trim()
  };
  await setSettings(settings);
  applyGuideName(settings.guideName);
  refreshPositionSummary();
  els.settingsGuideName.value = settings.guideName;
  els.signoffName.value = settings.name;
  els.siteName.value = settings.site;
  setPlannerTimeZone(settings.timeZone);
  renderSiteRequirements(settings.siteRequirements);
  renderShelterPlan(settings.shelterPlan);
  els.settingsDialog.close();
}

function filenameForShift(date, guideName = currentGuideName()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return `${safeFilenamePart(guideName)}-${y}-${m}-${d}.txt`;
}

function downloadText(text, filename){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFullDate(date){
  return new Intl.DateTimeFormat(undefined, {weekday:"long", year:"numeric", month:"long", day:"numeric"}).format(date);
}
function formatTime(date){
  return new Intl.DateTimeFormat(undefined, {hour:"numeric", minute:"2-digit"}).format(date);
}
function formatDateTime(date){
  return new Intl.DateTimeFormat(undefined, {
    year:"numeric",month:"2-digit",day:"2-digit",hour:"numeric",minute:"2-digit",second:"2-digit"
  }).format(date);
}
function formatDuration(ms){
  const mins = Math.max(0, Math.floor(ms/60000));
  const h = String(Math.floor(mins/60)).padStart(2,"0");
  const m = String(mins%60).padStart(2,"0");
  return `${h}:${m}`;
}
function formatDurationWords(ms){
  const mins = Math.max(0, Math.floor(ms/60000));
  const h = Math.floor(mins/60);
  const m = mins%60;
  return `${h}h ${m}m`;
}


let plannerEntriesCache = [];

function browserTimeZone(){
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function normalizeTimeZone(value){
  const candidate = String(value || "").trim() || browserTimeZone();
  try {
    new Intl.DateTimeFormat("en-US", {timeZone:candidate}).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function availableTimeZones(){
  let zones = [];
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      zones = Intl.supportedValuesOf("timeZone");
    }
  } catch {}
  const essentials = ["UTC", browserTimeZone()];
  return [...new Set([...essentials, ...zones])].sort((a,b)=>a.localeCompare(b));
}

function populateTimeZoneSelect(select){
  if (!select || select.options.length) return;
  const zones = availableTimeZones();
  zones.forEach(zone => {
    const opt = document.createElement("option");
    opt.value = zone;
    opt.textContent = zone.replaceAll("_"," ");
    select.appendChild(opt);
  });
}

function populateClockSelects(){
  [els.plannerStartHour, els.plannerEndHour].forEach(select => {
    if (!select || select.options.length) return;
    for (let h=1; h<=12; h++){
      const opt=document.createElement("option");
      opt.value=String(h);
      opt.textContent=String(h);
      select.appendChild(opt);
    }
  });
  [els.plannerStartMinute, els.plannerEndMinute].forEach(select => {
    if (!select || select.options.length) return;
    for (let m=0; m<60; m+=5){
      const opt=document.createElement("option");
      opt.value=String(m);
      opt.textContent=String(m).padStart(2,"0");
      select.appendChild(opt);
    }
  });
}

function setupShiftPlannerUI(){
  populateTimeZoneSelect(els.plannerTimeZone);
  populateTimeZoneSelect(els.settingsTimeZone);
  populateClockSelects();
  const tz = browserTimeZone();
  setPlannerTimeZone(tz);
  setPlannerMonthToToday();
  resetPlannerEntryForm();
}

function setPlannerTimeZone(value){
  const tz=normalizeTimeZone(value);
  if (els.plannerTimeZone) {
    if (![...els.plannerTimeZone.options].some(o=>o.value===tz)){
      const opt=document.createElement("option");
      opt.value=tz; opt.textContent=tz.replaceAll("_"," ");
      els.plannerTimeZone.appendChild(opt);
    }
    els.plannerTimeZone.value=tz;
  }
  if (els.settingsTimeZone) {
    if (![...els.settingsTimeZone.options].some(o=>o.value===tz)){
      const opt=document.createElement("option");
      opt.value=tz; opt.textContent=tz.replaceAll("_"," ");
      els.settingsTimeZone.appendChild(opt);
    }
    els.settingsTimeZone.value=tz;
  }
}

function datePartsInTimeZone(date, timeZone){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:normalizeTimeZone(timeZone),
    year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).formatToParts(date);
  const obj={};
  parts.forEach(p=>{ if (p.type!=="literal") obj[p.type]=p.value; });
  return {
    date:`${obj.year}-${obj.month}-${obj.day}`,
    hour:Number(obj.hour),
    minute:Number(obj.minute)
  };
}

function currentDateInPlannerZone(){
  return datePartsInTimeZone(new Date(), els.plannerTimeZone?.value || browserTimeZone()).date;
}

function setPlannerMonthToToday(){
  if (!els.plannerMonth) return;
  els.plannerMonth.value=currentDateInPlannerZone().slice(0,7);
  renderPlanner();
}

function shiftPlannerMonth(delta){
  const value=els.plannerMonth.value || currentDateInPlannerZone().slice(0,7);
  const [y,m]=value.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1+delta,1));
  els.plannerMonth.value=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;
  renderPlanner();
}

async function savePlannerTimeZone(){
  const tz=normalizeTimeZone(els.plannerTimeZone.value);
  setPlannerTimeZone(tz);
  await setSettings({timeZone:tz});
  renderPlanner();
}

function setClockControls(prefix, totalMinutes){
  let mins=((Number(totalMinutes)||0)%1440+1440)%1440;
  let hour24=Math.floor(mins/60);
  let minute=mins%60;
  const ampm=hour24>=12?"PM":"AM";
  let hour12=hour24%12; if (!hour12) hour12=12;
  els[`planner${prefix}Hour`].value=String(hour12);
  // snap non-5-min times to exact option when live shift completion isn't on a 5-minute mark
  const minuteSelect=els[`planner${prefix}Minute`];
  if (![...minuteSelect.options].some(o=>Number(o.value)===minute)){
    const opt=document.createElement("option");
    opt.value=String(minute);
    opt.textContent=String(minute).padStart(2,"0");
    minuteSelect.appendChild(opt);
  }
  minuteSelect.value=String(minute);
  els[`planner${prefix}AmPm`].value=ampm;
}

function clockControlsToMinutes(prefix){
  if (!["Hour","Minute","AmPm"].every(part => els[`planner${prefix}${part}`].value !== "")) return NaN;
  const hour12=Number(els[`planner${prefix}Hour`].value)||12;
  const minute=Number(els[`planner${prefix}Minute`].value)||0;
  const ampm=els[`planner${prefix}AmPm`].value;
  let hour24=hour12%12;
  if (ampm==="PM") hour24+=12;
  return hour24*60+minute;
}

function plannerDurationMinutes(entry){
  if (Number.isFinite(entry.durationMinutesOverride)) return Math.max(0, entry.durationMinutesOverride);
  const start=Number(entry.startMinutes)||0;
  const end=Number(entry.endMinutes)||0;
  let span=end-start;
  if (span<=0) span+=1440;
  return Math.max(0,span-(Number(entry.breakMinutes)||0));
}

function durationLabel(minutes){
  const total=Math.max(0,Math.round(Number(minutes)||0));
  return `${Math.floor(total/60)}h ${total%60}m`;
}

function decimalHours(minutes){
  return (Math.max(0,Number(minutes)||0)/60).toFixed(2).replace(/\.00$/,"");
}

function minutesTo12Hour(totalMinutes){
  const mins=((Number(totalMinutes)||0)%1440+1440)%1440;
  const h24=Math.floor(mins/60);
  const minute=mins%60;
  const ampm=h24>=12?"PM":"AM";
  const h12=(h24%12)||12;
  return `${h12}:${String(minute).padStart(2,"0")} ${ampm}`;
}

function updatePlannerDurationPreview(){
  const entry={
    startMinutes:clockControlsToMinutes("Start"),
    endMinutes:clockControlsToMinutes("End"),
    breakMinutes:Number(els.plannerBreakMinutes.value)||0
  };
  els.plannerDurationPreview.textContent = Number.isFinite(entry.startMinutes) && Number.isFinite(entry.endMinutes)
    ? durationLabel(plannerDurationMinutes(entry)) : "Choose start and end times";
}

function resetPlannerEntryForm(dateValue){
  if (!els.plannerEntryForm) return;
  els.plannerEntryId.value="";
  els.plannerDate.value=dateValue || currentDateInPlannerZone();
  els.plannerStatus.value="scheduled";
  clearClockControls("Start");
  clearClockControls("End");
  els.plannerBreakMinutes.value="0";
  els.plannerNotes.value="";
  els.plannerDeleteEntry.hidden=true;
  updatePlannerDurationPreview();
}

function plannerEntryDisplayDate(entry){
  return entry.date;
}

function plannerEntryLabel(entry){
  return `${minutesTo12Hour(entry.startMinutes)}–${minutesTo12Hour(entry.endMinutes)}`;
}

function statusLabel(status){
  return ({scheduled:"Scheduled",worked:"Worked",training:"Training",leave:"Leave / Other"})[status] || status;
}

function statusClass(status){
  return `planner-status-${status || "scheduled"}`;
}

async function openPlanner(){
  const settings=await getSettings();
  setPlannerTimeZone(settings.timeZone || browserTimeZone());
  plannerEntriesCache=await getPlannerEntries();
  if (!els.plannerMonth.value) setPlannerMonthToToday();
  else renderPlanner();
  resetPlannerEntryForm(currentDateInPlannerZone());
  els.plannerDialog.showModal();
}

async function savePlannerEntry(event){
  event.preventDefault();
  if (!Number.isFinite(clockControlsToMinutes("Start")) || !Number.isFinite(clockControlsToMinutes("End"))) { alert("Choose both start and end times."); return; }
  const id=els.plannerEntryId.value || (crypto.randomUUID ? crypto.randomUUID() : `plan-${Date.now()}`);
  const existing=plannerEntriesCache.find(x=>x.id===id);
  const entry={
    ...(existing||{}),
    id,
    date:els.plannerDate.value,
    startMinutes:clockControlsToMinutes("Start"),
    endMinutes:clockControlsToMinutes("End"),
    breakMinutes:Math.max(0,Number(els.plannerBreakMinutes.value)||0),
    status:els.plannerStatus.value,
    notes:els.plannerNotes.value.trim(),
    source: existing?.source || "manual",
    updatedAt:new Date().toISOString()
  };
  delete entry.durationMinutesOverride;
  const index=plannerEntriesCache.findIndex(x=>x.id===id);
  if (index>=0) plannerEntriesCache[index]=entry;
  else plannerEntriesCache.push(entry);
  await setPlannerEntries(plannerEntriesCache);
  if (entry.date) els.plannerMonth.value=entry.date.slice(0,7);
  resetPlannerEntryForm(entry.date);
  renderPlanner();
}

function editPlannerEntry(id){
  const entry=plannerEntriesCache.find(x=>x.id===id);
  if (!entry) return;
  els.plannerEntryId.value=entry.id;
  els.plannerDate.value=entry.date;
  els.plannerStatus.value=entry.status || "scheduled";
  setClockControls("Start",entry.startMinutes);
  setClockControls("End",entry.endMinutes);
  els.plannerBreakMinutes.value=String(entry.breakMinutes||0);
  els.plannerNotes.value=entry.notes||"";
  els.plannerDeleteEntry.hidden=false;
  updatePlannerDurationPreview();
  els.plannerEntryForm.scrollIntoView({behavior:"smooth",block:"nearest"});
}

async function deletePlannerEntryFromForm(){
  const id=els.plannerEntryId.value;
  if (!id) return;
  plannerEntriesCache=plannerEntriesCache.filter(x=>x.id!==id);
  await setPlannerEntries(plannerEntriesCache);
  resetPlannerEntryForm();
  renderPlanner();
}

async function deletePlannerEntry(id){
  plannerEntriesCache=plannerEntriesCache.filter(x=>x.id!==id);
  await setPlannerEntries(plannerEntriesCache);
  renderPlanner();
}

function renderPlanner(){
  if (!els.plannerCalendar || !els.plannerMonth) return;
  const monthValue=els.plannerMonth.value || currentDateInPlannerZone().slice(0,7);
  const [year,month]=monthValue.split("-").map(Number);
  if (!year || !month) return;

  const monthEntries=plannerEntriesCache
    .filter(entry=>plannerEntryDisplayDate(entry)?.startsWith(monthValue))
    .sort((a,b)=>(a.date||"").localeCompare(b.date||"") || (a.startMinutes||0)-(b.startMinutes||0));

  const totals={scheduled:0,worked:0,training:0,leave:0};
  monthEntries.forEach(entry=>{
    totals[entry.status||"scheduled"]=(totals[entry.status||"scheduled"]||0)+plannerDurationMinutes(entry);
  });
  els.plannerSummary.innerHTML=`
    <div><span>Scheduled</span><strong>${decimalHours(totals.scheduled)} h</strong></div>
    <div><span>Worked</span><strong>${decimalHours(totals.worked)} h</strong></div>
    <div><span>Training</span><strong>${decimalHours(totals.training)} h</strong></div>
    <div><span>Leave / Other</span><strong>${decimalHours(totals.leave)} h</strong></div>
  `;

  els.plannerCalendar.innerHTML="";
  const first=new Date(Date.UTC(year,month-1,1));
  const firstDow=first.getUTCDay();
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
  const prevDays=new Date(Date.UTC(year,month-1,0)).getUTCDate();
  const today=currentDateInPlannerZone();

  for (let cellIndex=0; cellIndex<42; cellIndex++){
    let cellYear=year,cellMonth=month,dayNum,other=false;
    if (cellIndex<firstDow){
      dayNum=prevDays-firstDow+cellIndex+1;
      other=true;
      cellMonth=month-1;
      if (cellMonth===0){cellMonth=12;cellYear--;}
    } else if (cellIndex>=firstDow+daysInMonth){
      dayNum=cellIndex-(firstDow+daysInMonth)+1;
      other=true;
      cellMonth=month+1;
      if (cellMonth===13){cellMonth=1;cellYear++;}
    } else {
      dayNum=cellIndex-firstDow+1;
    }
    const dateStr=`${cellYear}-${String(cellMonth).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
    const cell=document.createElement("div");
    cell.className=`planner-day${other?" other-month":""}${dateStr===today?" today":""}`;
    cell.dataset.date=dateStr;

    const dayButton=document.createElement("button");
    dayButton.type="button";
    dayButton.className="planner-day-number";
    dayButton.textContent=String(dayNum);
    dayButton.title=`Add shift on ${dateStr}`;
    dayButton.addEventListener("click",()=>{
      if (other) els.plannerMonth.value=dateStr.slice(0,7);
      resetPlannerEntryForm(dateStr);
      renderPlanner();
    });
    cell.appendChild(dayButton);

    plannerEntriesCache
      .filter(entry=>plannerEntryDisplayDate(entry)===dateStr)
      .sort((a,b)=>(a.startMinutes||0)-(b.startMinutes||0))
      .forEach(entry=>{
        const item=document.createElement("button");
        item.type="button";
        item.className=`planner-calendar-entry ${statusClass(entry.status)}`;
        item.innerHTML=`<span>${plannerEntryLabel(entry)}</span><small>${statusLabel(entry.status)} · ${durationLabel(plannerDurationMinutes(entry))}</small>`;
        item.addEventListener("click",()=>editPlannerEntry(entry.id));
        cell.appendChild(item);
      });

    els.plannerCalendar.appendChild(cell);
  }

  els.plannerEntryList.innerHTML="";
  els.plannerEntryCount.textContent=`${monthEntries.length} ${monthEntries.length===1?"entry":"entries"}`;
  if (!monthEntries.length){
    els.plannerEntryList.innerHTML='<div class="empty">No scheduled or worked shifts recorded for this month.</div>';
  } else {
    monthEntries.forEach(entry=>{
      const row=document.createElement("div");
      row.className="planner-log-row";
      const main=document.createElement("div");
      main.innerHTML=`
        <strong>${entry.date} · ${plannerEntryLabel(entry)}</strong>
        <div class="subtle">${statusLabel(entry.status)} · ${durationLabel(plannerDurationMinutes(entry))}${entry.breakMinutes?` · ${entry.breakMinutes}m unpaid break`:""}${entry.notes?` · ${escapePlannerHtml(entry.notes)}`:""}</div>
      `;
      const actions=document.createElement("div");
      actions.className="planner-log-actions";
      const edit=document.createElement("button");
      edit.type="button"; edit.className="btn ghost compact-btn"; edit.textContent="Edit";
      edit.addEventListener("click",()=>editPlannerEntry(entry.id));
      const del=document.createElement("button");
      del.type="button"; del.className="btn ghost compact-btn"; del.textContent="Delete";
      del.addEventListener("click",()=>deletePlannerEntry(entry.id));
      actions.append(edit,del);
      row.append(main,actions);
      els.plannerEntryList.appendChild(row);
    });
  }
}

function escapePlannerHtml(value){
  return String(value||"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function recordCompletedShiftInPlanner(shift){
  if (!shift?.startedAt || !shift?.finishedAt) return;
  const settings=await getSettings();
  const timeZone=normalizeTimeZone(settings.timeZone);
  const start=datePartsInTimeZone(new Date(shift.startedAt),timeZone);
  const end=datePartsInTimeZone(new Date(shift.finishedAt),timeZone);
  const entries=await getPlannerEntries();
  if (entries.some(entry=>entry.sourceShiftId===shift.id)) return;

  const startMinutes=start.hour*60+start.minute;
  const endMinutes=end.hour*60+end.minute;
  const elapsedMinutes=Math.max(0,Math.round((new Date(shift.finishedAt)-new Date(shift.startedAt))/60000));
  entries.push({
    id:crypto.randomUUID ? crypto.randomUUID() : `worked-${Date.now()}`,
    date:start.date,
    startMinutes,
    endMinutes,
    breakMinutes:0,
    durationMinutesOverride:elapsedMinutes,
    status:"worked",
    notes:shift.site ? `Live shift sign-off · ${shift.site}` : "Live shift sign-off",
    source:"live-shift",
    sourceShiftId:shift.id,
    timeZone,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
  await setPlannerEntries(entries);
  plannerEntriesCache=entries;
}

async function getPlannerEntries(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_SETTINGS,"readonly");
    const req=tx.objectStore(STORE_SETTINGS).get("plannerEntries");
    req.onsuccess=()=>resolve(Array.isArray(req.result?.entries)?req.result.entries:[]);
    req.onerror=()=>reject(req.error);
  });
}

async function setPlannerEntries(entries){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_SETTINGS,"readwrite");
    tx.objectStore(STORE_SETTINGS).put({key:"plannerEntries",entries:structuredClone(entries)});
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

// IndexedDB
function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SHIFTS)){
        const s = db.createObjectStore(STORE_SHIFTS, {keyPath:"id"});
        s.createIndex("status","status",{unique:false});
        s.createIndex("startedAt","startedAt",{unique:false});
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)){
        db.createObjectStore(STORE_SETTINGS, {keyPath:"key"});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putShift(shift){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_SHIFTS,"readwrite");
    tx.objectStore(STORE_SHIFTS).put(structuredClone(shift));
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function loadActiveShift(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_SHIFTS,"readonly");
    const idx = tx.objectStore(STORE_SHIFTS).index("status");
    const req = idx.getAll("active");
    req.onsuccess=()=>{
      const rows=req.result||[];
      rows.sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
      resolve(rows[0]||null);
    };
    req.onerror=()=>reject(req.error);
  });
}
async function getCompletedShifts(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_SHIFTS,"readonly");
    const idx = tx.objectStore(STORE_SHIFTS).index("status");
    const req = idx.getAll("complete");
    req.onsuccess=()=>{
      const rows=req.result||[];
      rows.sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
      resolve(rows);
    };
    req.onerror=()=>reject(req.error);
  });
}

async function setRouteConfig(route){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_SETTINGS,"readwrite");
    tx.objectStore(STORE_SETTINGS).put({key:"route", version: ROUTE_SCHEMA_VERSION, route: structuredClone(route)});
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

async function getRouteConfig(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_SETTINGS,"readonly");
    const req=tx.objectStore(STORE_SETTINGS).get("route");
    req.onsuccess=()=>resolve(req.result || null);
    req.onerror=()=>reject(req.error);
  });
}

async function setSettings(settings){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_SETTINGS,"readwrite");
    const store=tx.objectStore(STORE_SETTINGS);
    const req=store.get("profile");
    req.onsuccess=()=>{
      const existing=req.result||{key:"profile"};
      store.put({...existing,key:"profile",...settings});
    };
    req.onerror=()=>reject(req.error);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function getSettings(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_SETTINGS,"readonly");
    const req=tx.objectStore(STORE_SETTINGS).get("profile");
    req.onsuccess=()=>resolve(req.result||{});
    req.onerror=()=>reject(req.error);
  });
}
