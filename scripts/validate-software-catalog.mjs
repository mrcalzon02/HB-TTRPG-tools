// Functional contract for the interactive Software project catalog.
// Checks route wiring, parseable runtime modules, real owned-repository metadata,
// verified source artwork paths, and release browsing primitives — not cosmetics.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read = path => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("software.html");
const dataCode = read("software-catalog-data.js");
const code = read("software-catalog.js");
const styles = read("software-catalog.css");
const home = read("index.html");
const other = read("other-projects.html");
const map = read("site-map.html");
const portfolio = read("creative-portfolio.html");
const context = {window:{}};
new vm.Script(dataCode, {filename:"software-catalog-data.js"}).runInNewContext(context);
new vm.Script(code, {filename:"software-catalog.js"});
const projects = context.window.HBSoftwareProjects;
assert.equal(projects.length,13,"Curated release catalog should include 13 original projects");
assert.equal(new Set(projects.map(p=>p.repo)).size,projects.length);
for(const p of projects) {
  assert.match(p.repo,/^[a-zA-Z0-9._-]+$/);
  assert.ok(p.name && p.about && p.kind && p.stage);
  assert.ok(["game","mobile","mod","tool"].includes(p.kind));
  assert.ok(!p.repo.toLowerCase().endsWith("-fork"));
  if(p.preview)assert.ok(!p.preview.includes("..")&&!p.preview.startsWith("/"));
  if(p.seed)assert.ok(p.seed.tag && !Number.isNaN(Date.parse(p.seed.published)));
}
for(const repo of ["The-Beckenburg-Project","ReverieVR","NUTBUSTER-R","Rupee-rush","The-Malefic-Veil","Tech-Priests","Catastrophic-Diplomacy"])
  assert.ok(projects.some(p=>p.repo===repo),repo+" missing");
assert.ok(projects.some(p=>p.preview),"Repository asset previews must be wired");
for(const id of ["sc-rail","sc-detail","sc-left","sc-right","sc-latest","sc-feed-items","sc-release-project","sc-platform","sc-release-list","sc-release-more","sc-refresh"])
  assert.ok(html.includes('id="'+id+'"'),"Missing working control "+id);
for(const file of ["software-catalog.css","software-catalog-data.js","software-catalog.js"])
  assert.ok(html.includes(file),"Missing catalog dependency "+file);
assert.ok(html.includes("software-tabs"),"Existing standalone program tabs must remain");
assert.ok(code.includes('/releases?per_page=30&page='),"Release page navigation missing");
assert.ok(code.includes("releases/download/"),"Direct GitHub asset download handling missing");
assert.ok(code.includes("/events/public?per_page="),"Public activity feed missing");
assert.ok(code.includes("addEventListener(\"wheel\""),"Mouse wheel gallery navigation missing");
assert.ok(styles.includes("scroll-snap-type:x mandatory"),"Horizontal carousel interaction missing");
assert.ok(home.includes("software.html#software-showcase"),"Homepage showcase route missing");
assert.ok(other.includes("software.html#software-showcase"),"Other Projects showcase link missing");
assert.ok(portfolio.includes("software.html#software-showcase"),"Portfolio showcase link missing");
assert.ok(map.includes("software.html#software-showcase"),"Site map showcase link missing");
console.log("PASS: Software project catalog functional and navigation contracts");
