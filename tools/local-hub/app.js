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

async function loadProfiles() {
  const select = el("profile");
  try {
    const reply = await fetch(BASE + "/api/profiles");
    const data = await reply.json();
    if (!reply.ok) throw Error(data.error || "Voicebox is unavailable");
    select.replaceChildren();
    for (const p of data.profiles)
      select.add(new Option(p.name + " (" + p.samples + " samples)", p.id));
    if (!data.profiles.length) select.add(new Option("No local voice profiles found", ""));
    el("engine-status").textContent = data.profiles.length
      ? "Connected to local Voicebox · " + data.profiles.length + " profiles"
      : "Voicebox is running but has no profiles; create one in Voicebox first.";
  } catch (error) {
    select.replaceChildren(new Option("Local Voicebox engine unavailable", ""));
    el("engine-status").textContent = error.message + ". Complete the local engine installation and refresh voices.";
  }
}
el("refresh-profiles").addEventListener("click", loadProfiles);

function parseLines(input) {
  const rows = input.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!rows.length || rows.length > 300) throw Error("Enter between 1 and 300 lines.");
  const lines = rows.map((row, index) => {
    const match = row.match(/^([A-Za-z0-9][A-Za-z0-9_-]{0,63})\s*\|\s*(.+)$/);
    return { id: match ? match[1] : "line-" + String(index + 1).padStart(3, "0"),
      text: match ? match[2] : row };
  });
  if (new Set(lines.map(item => item.id)).size !== lines.length)
    throw Error("Line IDs must be unique.");
  return lines;
}
el("generate").addEventListener("click", async () => {
  const button = el("generate");
  button.disabled = true;
  try {
    const voice = el("profile").value;
    if (!voice) throw Error("Select a local voice profile.");
    const request = {project: el("project").value.trim(), engine: el("engine").value,
      voice, lines: parseLines(el("lines").value)};
    const response = await fetch(BASE + "/api/jobs",
      {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(request)});
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "Generation request failed");
    el("submit-status").textContent = "Queued " + request.lines.length + " local takes.";
    tab("jobs");
  } catch (error) { el("submit-status").textContent = error.message; }
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
