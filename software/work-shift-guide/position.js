/* Work Shift Guide — blank position setup, reviewed intake and local backups. */
const POSITION_FORMAT = "work-shift-guide.position";
const BACKUP_FORMAT = "work-shift-guide.backup";
const POSITION_FIELDS = ["jobTitle", "department", "guideName", "site", "timeZone", "siteRequirements", "shelterPlan"];
let positionMaterial = {references: [], knowledgeCheck: [], intakeNotes: ""};
let pendingPositionImport = null;
let pendingBackup = null;
const byId = id => document.getElementById(id);

function blankPositionPackage(){
  return {format: POSITION_FORMAT, schemaVersion: 1,
    position: Object.fromEntries(POSITION_FIELDS.map(key => [key, ""])),
    route: [], references: [], knowledgeCheck: [], intakeNotes: ""};
}

function objectValue(value, label){
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}
function textValue(value, label, limit = 100000){
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  if (value.length > limit) throw new Error(`${label} is too long (maximum ${limit} characters).`);
  return value.trim();
}
function arrayValue(value, label, limit = 500){
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  if (value.length > limit) throw new Error(`${label} has too many entries (maximum ${limit}).`);
  return value;
}
function textList(value, label){
  return arrayValue(value, label).map((item, i) => textValue(item, `${label} ${i+1}`)).filter(Boolean);
}

function validatePositionPackage(input){
  const data = objectValue(input, "Position package");
  if (data.format !== POSITION_FORMAT || data.schemaVersion !== 1) {
    throw new Error("Choose a Work Shift Guide position package with schemaVersion 1. Use Restore Backup for a full backup.");
  }
  const allowed = new Set(["format", "schemaVersion", "position", "route", "references", "knowledgeCheck", "intakeNotes"]);
  for (const key of Object.keys(data)) if (!allowed.has(key)) throw new Error(`Unsupported position field: ${key}.`);
  const source = objectValue(data.position, "Position");
  for (const key of Object.keys(source)) if (!POSITION_FIELDS.includes(key)) throw new Error(`Unsupported position setting: ${key}.`);
  const position = Object.fromEntries(POSITION_FIELDS.map(key => [key, textValue(source[key], key, key === "siteRequirements" || key === "shelterPlan" ? 100000 : 200)]));
  if (position.timeZone) {
    try { new Intl.DateTimeFormat("en", {timeZone: position.timeZone}).format(); }
    catch { throw new Error("Enter a valid time zone, or leave it blank to use this device’s time zone."); }
  }
  const ids = new Set();
  const route = arrayValue(data.route, "Route").map((item, i) => {
    const area = objectValue(item, `Area ${i+1}`);
    const name = textValue(area.name, `Area ${i+1} name`, 200);
    const summary = textList(area.summary, `Area ${i+1} tasks`);
    if (!name || !summary.length) throw new Error(`Area ${i+1} needs a name and at least one task. An empty route is allowed.`);
    let id = textValue(area.id, `Area ${i+1} ID`, 200) || `area-${i+1}`;
    if (ids.has(id)) throw new Error(`Duplicate area ID: ${id}.`);
    ids.add(id);
    return {id, name, summary, details: textList(area.details || [], `Area ${i+1} notes`)};
  });
  const references = arrayValue(data.references || [], "References").map((item, i) => {
    const reference = objectValue(item, `Reference ${i+1}`);
    const title = textValue(reference.title, `Reference ${i+1} title`, 300);
    const body = textValue(reference.body, `Reference ${i+1} content`);
    if (!title || !body) throw new Error(`Reference ${i+1} needs a title and content.`);
    return {title, body, source: textValue(reference.source, `Reference ${i+1} source`, 2000)};
  });
  const knowledgeCheck = arrayValue(data.knowledgeCheck || [], "Knowledge check").map((item, i) => {
    const question = objectValue(item, `Question ${i+1}`);
    const prompt = textValue(question.question, `Question ${i+1}`, 5000);
    const options = textList(question.options, `Question ${i+1} answers`);
    if (!prompt || options.length < 2 || options.length > 8) throw new Error(`Question ${i+1} needs a prompt and 2–8 answers.`);
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= options.length) throw new Error(`Question ${i+1} has an invalid correct-answer index.`);
    return {question: prompt, options, answer: question.answer, explanation: textValue(question.explanation, `Question ${i+1} explanation`, 10000)};
  });
  return {format: POSITION_FORMAT, schemaVersion: 1, position, route, references, knowledgeCheck,
    intakeNotes: textValue(data.intakeNotes, "Intake notes", 1000000)};
}

async function getPositionMaterial(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get("positionMaterial");
    req.onsuccess = () => resolve(req.result || {references: [], knowledgeCheck: [], intakeNotes: ""});
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function currentPositionPackage(){
  const settings = await getSettings();
  return {format: POSITION_FORMAT, schemaVersion: 1,
    position: Object.fromEntries(POSITION_FIELDS.map(key => [key, settings[key] || ""])),
    route: structuredClone(routeData), references: structuredClone(positionMaterial.references || []),
    knowledgeCheck: structuredClone(positionMaterial.knowledgeCheck || []), intakeNotes: positionMaterial.intakeNotes || ""};
}

async function applyPositionPackage(input){
  if (currentShift) throw new Error("Finish the active shift before changing the position.");
  const data = validatePositionPackage(input);
  const settings = await getSettings();
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    const store = tx.objectStore(STORE_SETTINGS);
    store.put({...settings, ...data.position, key: "profile"});
    store.put({key: "route", version: ROUTE_SCHEMA_VERSION, route: data.route});
    store.put({key: "positionMaterial", references: data.references, knowledgeCheck: data.knowledgeCheck, intakeNotes: data.intakeNotes});
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error("Position could not be saved.")); };
  });
  routeData = data.route;
  positionMaterial = {references: data.references, knowledgeCheck: data.knowledgeCheck, intakeNotes: data.intakeNotes};
  applyGuideName(data.position.guideName);
  els.settingsGuideName.value = normalizeGuideName(data.position.guideName);
  els.settingsSite.value = els.siteName.value = data.position.site;
  els.settingsSiteRequirements.value = data.position.siteRequirements;
  els.settingsShelterPlan.value = data.position.shelterPlan;
  setPlannerTimeZone(data.position.timeZone);
  renderSiteRequirements(data.position.siteRequirements);
  renderShelterPlan(data.position.shelterPlan);
  renderRoute(); populateAreaOptions(); renderPositionReferences(); refreshUI();
  await refreshPositionSummary();
  return data;
}

function showAppMessage(message, error = false){
  const node = byId("appMessage");
  node.hidden = false;
  node.textContent = message;
  node.classList.toggle("error-message", error);
}

async function refreshPositionSummary(){
  const settings = await getSettings();
  const tasks = routeData.reduce((total, area) => total + area.summary.length, 0);
  byId("positionHeading").textContent = settings.jobTitle || "Ready for a new position";
  byId("positionIdentity").textContent = [settings.department, settings.site].filter(Boolean).join(" · ") || "Add a job title and your own work instructions to begin.";
  byId("positionCounts").textContent = `${routeData.length} areas · ${tasks} tasks · ${(positionMaterial.references || []).length} references`;
  byId("positionState").textContent = tasks ? "Position configured" : "Blank edition";
}

const positionFieldIds = {jobTitle: "positionJobTitle", department: "positionDepartment", guideName: "positionGuideName",
  site: "positionSite", timeZone: "positionTimeZone", siteRequirements: "positionRequirements", shelterPlan: "positionShelterPlan"};

function editorField(label, className, value, multiline = false){
  const wrapper = document.createElement("label");
  wrapper.append(document.createTextNode(label));
  const field = document.createElement(multiline ? "textarea" : "input");
  field.className = className;
  field.value = value || "";
  wrapper.append(field);
  return wrapper;
}

function addReferenceEditor(value = {}){
  const card = document.createElement("div"); card.className = "position-editor-card reference-editor-card";
  card.append(editorField("Title", "reference-title", value.title), editorField("Reference / procedure text", "reference-body", value.body, true), editorField("Source or web address (optional)", "reference-source", value.source));
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn ghost"; remove.textContent = "Remove Reference";
  remove.addEventListener("click", () => card.remove()); card.append(remove); byId("referenceEditor").append(card);
}

function addQuestionEditor(value = {}){
  const card = document.createElement("div"); card.className = "position-editor-card question-editor-card";
  card.append(editorField("Question", "question-prompt", value.question), editorField("Answers — one per line", "question-options", (value.options || []).join("\n"), true));
  const answer = editorField("Correct answer number (starting at 1)", "question-answer", value.answer === undefined ? "" : String(value.answer + 1));
  const input = answer.querySelector("input"); input.type = "number"; input.min = "1"; input.max = "8";
  card.append(answer, editorField("Explanation (optional)", "question-explanation", value.explanation, true));
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn ghost"; remove.textContent = "Remove Question";
  remove.addEventListener("click", () => card.remove()); card.append(remove); byId("questionEditor").append(card);
}

function fillPositionForm(data){
  for (const [key, id] of Object.entries(positionFieldIds)) byId(id).value = data.position[key] || "";
  byId("positionIntakeNotes").value = data.intakeNotes || "";
  byId("referenceEditor").replaceChildren(); data.references.forEach(addReferenceEditor);
  byId("questionEditor").replaceChildren(); data.knowledgeCheck.forEach(addQuestionEditor);
}

async function openPositionSetup(){
  if (currentShift) { alert("Finish the active shift before changing the position."); return; }
  fillPositionForm(await currentPositionPackage());
  pendingPositionImport = null; byId("applyImport").disabled = true;
  byId("importPreview").textContent = "No import staged.";
  byId("importText").value = ""; byId("importFile").value = "";
  byId("positionDialog").showModal();
}

async function savePositionForm(){
  const data = await currentPositionPackage();
  data.position = Object.fromEntries(Object.entries(positionFieldIds).map(([key, id]) => [key, byId(id).value]));
  data.intakeNotes = byId("positionIntakeNotes").value;
  data.references = [...byId("referenceEditor").children].map(card => ({title: card.querySelector(".reference-title").value,
    body: card.querySelector(".reference-body").value, source: card.querySelector(".reference-source").value}));
  data.knowledgeCheck = [...byId("questionEditor").children].map(card => ({question: card.querySelector(".question-prompt").value,
    options: card.querySelector(".question-options").value.split(/\r?\n/).map(text => text.trim()).filter(Boolean),
    answer: Number(card.querySelector(".question-answer").value) - 1, explanation: card.querySelector(".question-explanation").value}));
  await applyPositionPackage(data); byId("positionDialog").close(); showAppMessage("Position saved on this device. Use Edit Work to add or change duties.");
}

async function previewPositionImport(){
  pendingPositionImport = null; byId("applyImport").disabled = true;
  const raw = byId("importText").value.trim();
  if (!raw) throw new Error("Choose a position JSON file or paste text to preview.");
  if (raw.length > 2000000) throw new Error("Position imports are limited to 2 MB.");
  const fileName = byId("importFile").files[0]?.name || "";
  let data;
  if (/^[{\[]/.test(raw) || /\.json$/i.test(fileName)) {
    try { data = JSON.parse(raw); } catch { throw new Error("The JSON is incomplete or invalid. Nothing was changed."); }
    data = validatePositionPackage(data);
  } else {
    data = await currentPositionPackage();
    data.intakeNotes = [data.intakeNotes, raw].filter(Boolean).join("\n\n");
    data = validatePositionPackage(data);
  }
  pendingPositionImport = data;
  const count = data.route.reduce((total, area) => total + area.summary.length, 0);
  byId("importPreview").textContent = `${data.position.jobTitle || "Untitled position"}\n${data.route.length} areas · ${count} tasks · ${data.references.length} references · ${data.knowledgeCheck.length} questions\n\n${JSON.stringify(data, null, 2)}`;
  byId("applyImport").disabled = false;
}

async function applyReviewedImport(){
  if (!pendingPositionImport) throw new Error("Preview and review the import first.");
  const data = await applyPositionPackage(pendingPositionImport);
  fillPositionForm(data); pendingPositionImport = null; byId("applyImport").disabled = true;
  byId("importPreview").textContent = "Import applied and saved on this device.";
  showAppMessage("Reviewed position import saved. Existing work records remain in History.");
}

function renderPositionReferences(){
  const container = byId("positionReferences"); container.replaceChildren();
  for (const reference of positionMaterial.references || []) {
    const card = document.createElement("details"); card.className = "route-card";
    const heading = document.createElement("summary"); heading.textContent = reference.title;
    const body = document.createElement("div"); body.className = "route-body";
    const text = document.createElement("div"); text.className = "plain-text"; text.textContent = reference.body; body.append(text);
    if (reference.source) {
      const source = document.createElement("p"); source.className = "subtle";
      let url; try { url = new URL(reference.source); } catch {}
      if (url && ["https:", "http:"].includes(url.protocol)) {
        const link = document.createElement("a"); link.textContent = reference.source; link.href = url.href;
        link.target = "_blank"; link.rel = "noopener noreferrer"; source.append(link);
      } else source.textContent = reference.source;
      body.append(source);
    }
    card.append(heading, body); container.append(card);
  }
  if (!container.children.length) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "No reference material loaded. Add approved notes or procedures in Position Setup."; container.append(empty); }
  const notes = byId("intakeNotesView"); notes.textContent = positionMaterial.intakeNotes || "No source notes loaded.";
  const words = (positionMaterial.references || []).map(item => item.body).join(" ").trim().split(/\s+/).filter(Boolean).length;
  byId("readingEstimate").textContent = words ? `${words.toLocaleString()} words · approximately ${Math.ceil(words / 175)} minutes to read` : "No reading assigned";
  const quiz = byId("positionQuiz"); quiz.replaceChildren();
  (positionMaterial.knowledgeCheck || []).forEach((question, i) => {
    const fieldset = document.createElement("fieldset"); fieldset.className = "position-quiz-question";
    const legend = document.createElement("legend"); legend.textContent = `${i+1}. ${question.question}`; fieldset.append(legend);
    question.options.forEach((option, j) => {
      const label = document.createElement("label"); label.className = "checkline";
      const radio = document.createElement("input"); radio.type = "radio"; radio.name = `position-question-${i}`; radio.value = String(j);
      label.append(radio, document.createTextNode(option)); fieldset.append(label);
    });
    quiz.append(fieldset);
  });
  byId("checkAnswers").disabled = !quiz.children.length;
  byId("quizResult").textContent = quiz.children.length ? "Answer all questions, then check your answers." : "No knowledge check loaded.";
}

function checkPositionAnswers(){
  const questions = positionMaterial.knowledgeCheck || []; let score = 0;
  const result = [];
  questions.forEach((question, i) => {
    const selected = document.querySelector(`input[name="position-question-${i}"]:checked`);
    const correct = !!selected && Number(selected.value) === question.answer; if (correct) score++;
    result.push(`${i+1}. ${correct ? "Correct" : selected ? "Review" : "Not answered"}${correct ? "" : ` — ${question.options[question.answer]}`}${question.explanation ? `\n${question.explanation}` : ""}`);
  });
  byId("quizResult").textContent = `${score}/${questions.length} correct\n\n${result.join("\n\n")}`;
}

function downloadJSON(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {type: "application/json"});
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readBackup(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SETTINGS, STORE_SHIFTS], "readonly");
    const settings = tx.objectStore(STORE_SETTINGS).getAll();
    const shifts = tx.objectStore(STORE_SHIFTS).getAll();
    tx.oncomplete = () => { db.close(); resolve({format: BACKUP_FORMAT, schemaVersion: 1, exportedAt: new Date().toISOString(), settings: settings.result, shifts: shifts.result}); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function validateBackup(input){
  const data = objectValue(input, "Backup");
  if (data.format !== BACKUP_FORMAT || data.schemaVersion !== 1) throw new Error("Choose a Work Shift Guide backup, not a position template.");
  const rows = arrayValue(data.settings, "Backup settings", 4); const keys = new Set();
  for (const row of rows) {
    objectValue(row, "Backup setting");
    if (!["profile", "route", "positionMaterial", "plannerEntries"].includes(row.key) || keys.has(row.key)) throw new Error("Backup has an unknown or duplicate settings record.");
    keys.add(row.key);
  }
  const profile = rows.find(row => row.key === "profile") || {};
  const material = rows.find(row => row.key === "positionMaterial") || {};
  validatePositionPackage({format: POSITION_FORMAT, schemaVersion: 1,
    position: Object.fromEntries(POSITION_FIELDS.map(key => [key, profile[key] || ""])),
    route: rows.find(row => row.key === "route")?.route || [], references: material.references || [], knowledgeCheck: material.knowledgeCheck || [], intakeNotes: material.intakeNotes || ""});
  textValue(profile.name, "Sign-off name", 300);
  const shifts = arrayValue(data.shifts, "Shift records", 20000); const ids = new Set(); let activeCount = 0;
  for (const shift of shifts) {
    objectValue(shift, "Shift record");
    if (typeof shift.id !== "string" || !shift.id || ids.has(shift.id)) throw new Error("Backup has a missing or duplicate shift ID.");
    ids.add(shift.id);
    if (!["active", "complete"].includes(shift.status) || !Number.isFinite(Date.parse(shift.startedAt))) throw new Error("Backup has an invalid shift status or date.");
    if (shift.status === "active") activeCount++;
    if (shift.status === "complete" && (!Number.isFinite(Date.parse(shift.finishedAt)) || Date.parse(shift.finishedAt) < Date.parse(shift.startedAt))) throw new Error("Backup has an invalid completed-shift date.");
    for (const field of ["guideName", "jobTitle", "department", "completedBy", "site", "recordText"]) if (shift[field] !== null) textValue(shift[field], `Shift ${field}`, 1000000);
    for (const issue of arrayValue(shift.issues, "Shift exceptions")) {
      objectValue(issue, "Exception");
      for (const field of ["id", "area", "type", "note", "immediateAction"]) textValue(issue[field], `Exception ${field}`);
      if (!Number.isFinite(Date.parse(issue.createdAt))) throw new Error("Backup has an invalid exception date.");
    }
    validatePositionPackage({...blankPositionPackage(), route: shift.routeSnapshot});
  }
  if (activeCount > 1) throw new Error("Backup contains more than one active shift.");
  const planner = rows.find(row => row.key === "plannerEntries")?.entries || [];
  const plannerIds = new Set();
  for (const entry of arrayValue(planner, "Planner entries", 20000)) {
    objectValue(entry, "Planner entry");
    if (typeof entry.id !== "string" || !entry.id || plannerIds.has(entry.id)) throw new Error("Backup has a missing or duplicate planner ID.");
    plannerIds.add(entry.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0,10) !== entry.date) throw new Error("Backup has an invalid planner date.");
    if (![entry.startMinutes, entry.endMinutes].every(value => Number.isInteger(value) && value >= 0 && value < 1440)) throw new Error("Backup has an invalid planner time.");
    if (!["scheduled", "worked", "training", "leave"].includes(entry.status)) throw new Error("Backup has an invalid planner status.");
    if (!Number.isFinite(entry.breakMinutes) || entry.breakMinutes < 0 || entry.breakMinutes > 1440) throw new Error("Backup has an invalid break duration.");
    if (entry.durationMinutesOverride !== undefined && (!Number.isFinite(entry.durationMinutesOverride) || entry.durationMinutesOverride < 0)) throw new Error("Backup has an invalid duration.");
    textValue(entry.notes, "Planner notes");
  }
  return structuredClone(data);
}

async function previewBackupFile(){
  pendingBackup = null; byId("applyBackup").disabled = true;
  const file = byId("restoreBackupFile").files[0]; if (!file) return;
  if (file.size > 10000000) throw new Error("Backup imports are limited to 10 MB.");
  let data; try { data = JSON.parse(await file.text()); } catch { throw new Error("The backup is not valid JSON."); }
  pendingBackup = validateBackup(data);
  const profile = data.settings.find(row => row.key === "profile") || {};
  byId("backupPreview").textContent = `${profile.jobTitle || "Untitled position"}\n${data.shifts.length} shift records · ${data.settings.find(row => row.key === "plannerEntries")?.entries?.length || 0} planner entries\nRestoring replaces this edition’s saved configuration, records and planner. Export your current backup first.`;
  byId("applyBackup").disabled = !!currentShift;
}

async function applyBackup(){
  if (currentShift) throw new Error("Finish the active shift before restoring a backup.");
  if (!pendingBackup) throw new Error("Choose and review a valid backup first.");
  if (!confirm("Replace this edition’s local position, shifts and planner with the reviewed backup? Export the current backup first if you need to keep it.")) return;
  const data = validateBackup(pendingBackup); const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SETTINGS, STORE_SHIFTS], "readwrite");
    const settings = tx.objectStore(STORE_SETTINGS); const shifts = tx.objectStore(STORE_SHIFTS);
    settings.clear(); shifts.clear(); data.settings.forEach(row => settings.put(row)); data.shifts.forEach(row => shifts.put(row));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error("Backup could not be restored.")); };
  });
  location.reload();
}

function clearClockControls(prefix){
  for (const part of ["Hour", "Minute", "AmPm"]) {
    const select = els[`planner${prefix}${part}`];
    if (![...select.options].some(option => option.value === "")) {
      const option = document.createElement("option"); option.value = ""; option.textContent = "—"; select.prepend(option);
    }
    select.value = ""; select.required = true;
  }
}

function bindAsync(id, callback, event = "click"){
  byId(id).addEventListener(event, async () => {
    try { await callback(); }
    catch (error) {
      if (["previewImport", "importFile", "applyImport"].includes(id)) byId("importPreview").textContent = error.message;
      if (["restoreBackupFile", "applyBackup"].includes(id)) byId("backupPreview").textContent = error.message;
      showAppMessage(error.message || String(error), true);
      if (id === "savePosition") alert(error.message || String(error));
    }
  });
}

async function setupPosition(){
  positionMaterial = await getPositionMaterial();
  bindAsync("positionSetupBtn", openPositionSetup);
  byId("closePosition").addEventListener("click", () => byId("positionDialog").close());
  bindAsync("savePosition", savePositionForm);
  byId("addReference").addEventListener("click", () => addReferenceEditor());
  byId("addQuestion").addEventListener("click", () => addQuestionEditor());
  bindAsync("previewImport", previewPositionImport);
  bindAsync("applyImport", applyReviewedImport);
  byId("importText").addEventListener("input", () => { byId("importFile").value = ""; pendingPositionImport = null; byId("applyImport").disabled = true; byId("importPreview").textContent = "Input changed. Preview again before applying."; });
  bindAsync("importFile", async () => {
    pendingPositionImport = null; byId("applyImport").disabled = true;
    const file = byId("importFile").files[0]; if (!file) return;
    if (!/\.(json|txt|md)$/i.test(file.name)) throw new Error("Choose a JSON, TXT or Markdown file.");
    if (file.size > 2000000) throw new Error("Position imports are limited to 2 MB.");
    byId("importText").value = await file.text(); byId("importPreview").textContent = "File loaded. Preview and review before applying.";
  }, "change");
  bindAsync("exportPosition", async () => downloadJSON(await currentPositionPackage(), "Work-Shift-Guide-Position.json"));
  bindAsync("exportBlankTemplate", () => downloadJSON(blankPositionPackage(), "position-template.json"));
  bindAsync("exportBackup", async () => downloadJSON(await readBackup(), "Work-Shift-Guide-Backup.json"));
  bindAsync("restoreBackupFile", previewBackupFile, "change");
  bindAsync("applyBackup", applyBackup);
  byId("checkAnswers").addEventListener("click", checkPositionAnswers);
  renderPositionReferences(); await refreshPositionSummary();
}

window.addEventListener("unhandledrejection", event => showAppMessage(`Could not save or load local data: ${event.reason?.message || event.reason}. Keep this page open and export a backup if available.`, true));
