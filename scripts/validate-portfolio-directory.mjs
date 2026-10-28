// Source-only directory contracts. No third-party test packages required.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const directory=read("other-projects.html");
const portfolio=read("creative-portfolio.html");
const home=read("index.html");
const site=read("site-map.html");
const sitemap=read("sitemap.xml");
assert.match(home,/href="other-projects\.html">Other Projects<\/a>/);
assert.match(directory,/href="creative-portfolio\.html"/);
assert.match(site,/href="creative-portfolio\.html"/);
assert.match(sitemap,/creative-portfolio\.html/);
assert.match(portfolio,/26-page.*Christopher Vardeman Creative Portfolio 2026/);
const list=[...directory.matchAll(/<article class="project" data-project="([^"]+)"/g)].map(m=>m[1]);
assert.equal(list.length,19,"Expected 19 original-project cards in the saved public snapshot");
assert.equal(new Set(list).size,list.length);
assert.doesNotMatch(directory + portfolio,/github\.com\/mrcalzon02\/Rupee-rush/,"Obsolete Jewel Brook repository link");
assert.match(directory,/Jewel Brook: Heroes of Embryon/);
for(const name of ["The-Beckenburg-Project","Catastrophic-Diplomacy","Jewel_Brook","NUTBUSTER-R","The-Malefic-Veil","Tech-Priests","Continuity-Works"]){
 assert.ok(list.includes(name),"Missing original project: "+name);
}
for(const name of ["HB-TTRPG-tools","sam-3d-objects-fork","ImperiumOfMan","open_llama","TerraGov-Marine-Corps","Tanks-for-bob-Fork"]){
 assert.ok(!list.includes(name),"Excluded repository in public project listing: "+name);
}
for(const path of [directory,portfolio]){
 const scripts=[...path.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const m of scripts)new vm.Script(m[1],{filename:"inline-page-script"});
}
for(const link of ["https://github.com/mrcalzon02","https://www.linkedin.com/in/christopher-vardeman-907a4085/","https://www.youtube.com/@mrcalzon02","https://www.twitch.tv/mrcalzon02"]){
 assert.ok(portfolio.includes(link),"Portfolio missing outgoing source link "+link);
}
console.log("PASS: Other Projects and Creative Portfolio navigation, curated projects, exclusions and script syntax");
