"use strict";
const BASE = "/__local";
const el = id => document.getElementById(id);
let pages = [];
function tab(active) {
  for (const name of ["library","voice","jobs"]) {
    const selected = active === name;
    el("panel-" + name).classList.toggle("hidden", !selected);
    el("tab-" + name).classList.toggle("active", selected);
    el("tab-" + name).setAttribute("aria-selected", String(selected));
  }
  if (active === "voice") void loadProfiles();
  if (active === "jobs") void loadJobs();
}
for (const name of ["library","voice","jobs"])
  el("tab-" + name).addEventListener("click", () => tab(name));
function renderPages() {
  const query = el("find-pages").value.trim().toLowerCase();
  const onlyMain = el("only-root").checked;
  const matching = pages.filter(p => (!onlyMain || p.section === "Main archive") &&
    (!query || (p.name + " " + p.path).toLowerCase().includes(query))).slice(0,360);
  const box = el("archive-results");
  box.replaceChildren();
  for (const page of matching) {
    const link = document.createElement("a");
    link.className = "tool-card";
    link.href = page.path;
    const name = document.createElement("strong");
    name.textContent = page.name;
    const subtitle = document.createElement("span");
    subtitle.textContent = page.section + " · " + page.path;
    link.append(name, subtitle);
    box.append(link);
  }
  if (!matching.length) box.textContent = "No matching archive pages.";
  el("page-count").textContent = String(pages.length) + " HTML pages";
}
el("find-pages").addEventListener("input", renderPages);
el("only-root").addEventListener("change", renderPages);
fetch(BASE + "/api/catalog")
  .then(r => { if (!r.ok) throw Error(String(r.status)); return r.json(); })
  .then(data => { pages = data.pages || []; renderPages(); })
  .catch(error => { el("archive-results").textContent = "Cannot load local archive: " + error.message; });

let selectedAudio = null, selectedDocument = null, savedCount = 0;
function setupDropzone(zoneId, inputId, labelId, kind) {
  const zone = el(zoneId), input = el(inputId), label = el(labelId);
  function accept(file) {
    if (!file) return;
    if (kind === "audio") {
      selectedAudio = file;
      el("saved-voice").checked = false;
    } else selectedDocument = file;
    label.textContent = file.name + " (" + (file.size / (1024 * 1024)).toFixed(2) + " MB)";
    zone.classList.add("loaded");
  }
  input.addEventListener("change", () => accept(input.files[0]));
  zone.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); input.click(); }
  });
  zone.addEventListener("dragover", event => { event.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", event => {
    event.preventDefault(); zone.classList.remove("dragover");
    accept(event.dataTransfer?.files?.[0]);
  });
}
setupDropzone("audio-zone", "audio-file", "audio-label", "audio");
setupDropzone("script-zone", "script-file", "script-label", "document");
el("saved-voice").addEventListener("change", () => {
  if (el("saved-voice").checked) {
    selectedAudio = null;
    el("audio-file").value = "";
    el("audio-label").textContent = "Using existing private reference recordings";
    el("audio-zone").classList.remove("loaded");
  }
});
async function loadSavedStatus() {
  try {
    const response = await fetch(BASE + "/api/reference-status");
    const data = await response.json();
    savedCount = data.savedSamples || 0;
    el("saved-voice").disabled = savedCount === 0;
    el("saved-reference-note").textContent = savedCount
      ? savedCount + " saved reference recordings available on this PC"
      : "No prepared private recordings detected. Drop a voice sample above.";
  } catch { el("saved-reference-note").textContent = "Saved reference detection unavailable."; }
}
async function loadProfiles() {
  const select = el("profile"), previous = select.value;
  select.replaceChildren(new Option("Create new voice from sample", ""));
  try {
    const response = await fetch(BASE + "/api/profiles");
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Voicebox is unavailable");
    for (const p of data.profiles)
      if (p.samples > 0) select.add(new Option(p.name + " (" + p.samples + " samples)", p.id));
    if ([...select.options].some(p => p.value === previous)) select.value = previous;
    el("engine-status").textContent = data.profiles.length
      ? "Voicebox is connected. Select an existing profile or create another from a sample."
      : "Voicebox is connected. Drop your sample to create the first voice profile.";
  } catch (error) {
    el("engine-status").textContent = error.message + ". The archive remains available.";
  }
  void loadSavedStatus();
}
el("refresh-profiles").addEventListener("click", loadProfiles);
el("generate").addEventListener("click", async () => {
  const button = el("generate"), status = el("submit-status");
  button.disabled = true;
  try {
    const profile = el("profile").value;
    const saved = el("saved-voice").checked;
    if (!el("voice-consent").checked) throw Error("Confirm you own or have permission to clone this voice.");
    if (!selectedDocument && !el("lines").value.trim()) throw Error("Drop a document or paste the narration lines.");
    if (!profile && !selectedAudio && !saved) throw Error("Drop a voice sample, choose saved references, or select an existing profile.");
    if (saved && !savedCount) throw Error("No previously saved voice samples were found.");
    const data = new FormData();
    data.set("project", el("project").value.trim());
    data.set("profile_name", el("profile-name").value.trim());
    data.set("voice", profile);
    data.set("lines", el("lines").value);
    data.set("reference_text", el("reference-text").value.trim());
    data.set("source", saved ? "saved" : "upload");
    data.set("consent", "yes");
    if (selectedDocument) data.set("document", selectedDocument, selectedDocument.name);
    if (selectedAudio && !profile && !saved) data.set("audio", selectedAudio, selectedAudio.name);
    status.textContent = "Preparing local voice job…";
    const response = await fetch(BASE + "/api/intake", {method: "POST", body: data});
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "Could not start local generation.");
    status.textContent = "Queued local narration.";
    tab("jobs");
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
async function loadJobs() {
  try {
    const response = await fetch(BASE + "/api/jobs");
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Cannot read jobs");
    const box = el("job-list");
    box.replaceChildren();
    const jobs = (data.jobs || []).reverse();
    if (!jobs.length) { box.textContent = "No narration batches this session."; return; }
    for (const job of jobs) {
      const container = document.createElement("div"); container.className = "job";
      const heading = document.createElement("strong");
      heading.textContent = job.project + " · " + job.status;
      const status = document.createElement("p");
      status.textContent = job.finished + "/" + job.total + " completed" + (job.error ? " · " + job.error : "");
      container.append(heading, status);
      if (job.download) {
        const link = document.createElement("a");
        link.href = job.download;
        link.textContent = "Download review ZIP (manual export)";
        link.download = "review-pack.zip";
        container.append(link);
        const path = document.createElement("p");
        path.textContent = "Private output: " + job.output;
        container.append(path);
      }
      box.append(container);
    }
  } catch (error) { el("job-list").textContent = "Cannot read jobs: " + error.message; }
}
el("refresh-jobs").addEventListener("click", loadJobs);
setInterval(() => {
  if (!el("panel-jobs").classList.contains("hidden")) void loadJobs();
}, 2500);
