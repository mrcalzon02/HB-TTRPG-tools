/* Software catalog: live public GitHub releases + a dated, clearly labeled fallback. */
(() => {
  "use strict";
  const projects = Array.isArray(window.HBSoftwareProjects) ? window.HBSoftwareProjects : [];
  const OWNER = "mrcalzon02";
  const CACHE_DATE = "October 26, 2026";
  const API = "https://api.github.com";
  const $ = id => document.getElementById(id);
  const state = new Map(projects.map(p => [p.repo, {project:p, releases:null, page:0, more:false, busy:false, pushed:null, error:null}]));
  let selected = projects[0]?.repo || "";
  let kind = "all", platform = "all", fetching = false, feedBusy = false;
  const rail = $("sc-rail");
  if (!rail || !projects.length) return;

  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = String(value);
    return el;
  };
  const repoUrl = repo => "https://github.com/" + OWNER + "/" + encodeURIComponent(repo);
  const releaseUrl = (repo, tag) => repoUrl(repo) + "/releases/tag/" + encodeURIComponent(tag);
  const artUrl = p => p.previewLocal || (p.preview ? "https://raw.githubusercontent.com/" + OWNER + "/" +
    encodeURIComponent(p.repo) + "/main/" + p.preview.split("/").map(encodeURIComponent).join("/") : null);
  const href = (name, url, css) => {
    const a = make("a", css || "", name);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  };
  const date = value => {
    if (!value) return "not confirmed";
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? "not confirmed" : d.toLocaleDateString(undefined, {year:"numeric",month:"short",day:"numeric",timeZone:"UTC"});
  };
  const bytes = size => {
    if (!Number.isFinite(size)) return "";
    return size >= 1048576 ? (size/1048576).toFixed(1) + " MB" : Math.max(1,Math.round(size/1024)) + " KB";
  };
  const platformOf = name => {
    const s = name.toLowerCase();
    if (/\.apk$/.test(s) || /fireos|android/.test(s)) return "Android";
    if (/macos|osx|darwin|\.dmg$|\.pkg$/.test(s)) return "macOS";
    if (/windows|win-x64|win64|\.exe$|\.msi$|\.msix$/.test(s)) return "Windows";
    if (/linux|appimage|\.deb$|\.rpm$/.test(s)) return "Linux";
    return "Other";
  };
  const visibleAssets = release => (release?.assets || []).filter(a =>
    a && typeof a.browser_download_url === "string" &&
    a.browser_download_url.startsWith(repoUrl(selected) + "/releases/download/") &&
    (platform === "all" || platformOf(a.name) === platform));
  const firstRelease = record => {
    const releases = record.releases;
    if (Array.isArray(releases)) return releases[0] || null;
    const s = record.project.seed;
    return s ? {tag_name:s.tag,name:s.title,published_at:s.published,prerelease:s.prerelease,assets:[],snapshot:true} : null;
  };
  const note = (id, value, status = false) => {
    const el = $(id);
    if (el) {
      el.textContent = value;
      if (status) el.classList.toggle("sc-offline", true);
      else el.classList.remove("sc-offline");
    }
  };
  const countVisible = () => projects.filter(p => kind === "all" || p.kind === kind);
  function renderCards() {
    const previousScroll = rail.scrollLeft;
    const frag = document.createDocumentFragment();
    for (const p of countVisible()) {
      const r = state.get(p.repo);
      const card = make("button", "sc-card");
      card.type = "button";
      card.dataset.repo = p.repo;
      card.setAttribute("aria-pressed", String(selected === p.repo));
      card.setAttribute("aria-label", "Inspect " + p.name + " releases and downloads");
      const art = make("div","sc-art");
      if (p.previewLocal || p.preview) {
        const im = make("img");
        im.loading = "lazy";
        im.alt = p.previewLocal ? "Captured in-game menu for " + p.name : (p.art || ("Source artwork for " + p.name));
        im.src = artUrl(p);
        im.addEventListener("error", () => {
          im.remove();
          art.prepend(make("span","sc-fallback",p.name));
        },{once:true});
        art.append(im);
        art.append(make("span","sc-art-label",p.previewLocal ? "Actual running-game menu capture" : (p.art || "Repository artwork"));
      } else {
        art.append(make("span","sc-fallback",p.name));
        art.append(make("span","sc-art-label","No screenshot claimed"));
      }
      const body = make("div","sc-card-content");
      body.append(make("span","sc-card-title",p.name));
      body.append(make("span","sc-card-status",p.stage));
      body.append(make("span","sc-card-update",r.pushed ? "Last source push: "+date(r.pushed) : p.platform));
      const release = firstRelease(r);
      body.append(make("span","sc-card-meta",release ? (release.prerelease?"Test release · ":"Release · ")+release.tag_name : "Source repository · no release verified"));
      card.append(art,body);
      card.addEventListener("click",() => select(p.repo));
      frag.append(card);
    }
    rail.replaceChildren(frag);
    rail.scrollLeft = previousScroll;
    note("sc-count",countVisible().length + " shown / " + projects.length + " projects");
  }
  function fileRows(target, release, projectRepo) {
    const assets = (release?.assets||[]).filter(a => a?.browser_download_url?.startsWith(repoUrl(projectRepo)+"/releases/download/") &&
      (platform === "all" || platformOf(a.name) === platform));
    if (!assets.length) {
      target.append(make("p","sc-muted", release?.snapshot
        ? "Checking downloadable files; the saved release is a dated fallback."
        : "No attached files match this platform. Open the GitHub release for notes and source archives."));
      return;
    }
    for (const a of assets) {
      const row = make("div","sc-file");
      row.append(href("Download " + a.name,a.browser_download_url));
      const meta = make("small",""+platformOf(a.name)+(a.size?" · "+bytes(a.size):""));
      row.append(meta);
      target.append(row);
    }
  }
  function renderDetails() {
    const r = state.get(selected);
    if (!r) return;
    const p = r.project, top = firstRelease(r);
    const detail = $("sc-detail");
    detail.replaceChildren();
    const grid = make("div","sc-detail-grid");
    const left = make("div");
    left.append(make("div","sc-eyebrow",p.stage));
    left.append(make("h3","",p.name));
    left.append(make("p","",p.about));
    left.append(make("p","sc-muted",p.language+" · "+p.platform+(r.pushed?" · Source updated "+date(r.pushed):"")));
    const actions = make("div","sc-detail-actions");
    actions.append(href("GitHub repository",repoUrl(p.repo)));
    if (top) actions.append(href("Latest release",releaseUrl(p.repo,top.tag_name)));
    else actions.append(href("All GitHub releases",repoUrl(p.repo)+"/releases"));
    const inspect = make("a","","Browse every release ↓");
    inspect.href = "#sc-release-hub";
    inspect.addEventListener("click",() => { $("sc-release-project").value = p.repo; renderReleases(); });
    actions.append(inspect);
    left.append(actions);
    const right = make("div","sc-builds");
    right.append(make("h4","",top ? (top.name || top.tag_name) : "No published release verified"));
    right.append(make("p","sc-muted",top
      ? (top.prerelease?"Prerelease / development build":"Published release")+" · "+date(top.published_at)+(top.snapshot?" · saved snapshot":" · GitHub")
      : "Browse the source while release packaging continues."));
    if (top) fileRows(right,top,p.repo);
    grid.append(left,right);
    detail.append(grid);
    note("sc-current",p.name + " selected");
  }
  function select(repo) {
    if (!state.has(repo)) return;
    selected = repo;
    renderCards();
    renderDetails();
    $("sc-release-project").value = repo;
    renderReleases();
  }
  function renderLatest() {
    const box = $("sc-latest");
    box.replaceChildren();
    const records = [...state.values()].map(r=>({r,release:firstRelease(r)}))
      .filter(x=>!!x.release).sort((a,b)=>Date.parse(b.release.published_at||0)-Date.parse(a.release.published_at||0));
    for (const {r,release} of records) {
      const line = make("div","sc-line");
      const item = make("div");
      item.append(href(r.project.name,releaseUrl(r.project.repo,release.tag_name)));
      item.append(make("div","sc-muted",release.tag_name + (release.prerelease?" · Prerelease":" · Published")));
      line.append(item,make("span","sc-muted",date(release.published_at)));
      box.append(line);
    }
    if (!records.length) box.append(make("p","sc-muted","No published releases currently verified."));
  }
  function renderReleases() {
    const projectRepo = $("sc-release-project").value;
    const r = state.get(projectRepo);
    if (!r) return;
    const box=$("sc-release-list");
    box.replaceChildren();
    const releases = r.releases;
    if (!releases) {
      const p = r.project;
      box.append(make("p","sc-muted",p.seed
        ? "Saved release: "+p.seed.tag+" ("+date(p.seed.published)+"). Live release history has not been retrieved."
        : "No release was present in the verified snapshot. Checking GitHub for published releases."));
    } else if (!releases.length) {
      box.append(make("p","sc-muted","No published GitHub releases for this project. Use its source repository for development work."));
    } else {
      const filtered = releases.filter(v=>v && !v.draft && v.tag_name);
      for (const rel of filtered) {
        const details = make("details","sc-release-item");
        const summary = make("summary");
        const title = make("strong","",rel.name||rel.tag_name);
        summary.append(title,make("span","sc-muted"," · "+date(rel.published_at)+(rel.prerelease?" · Prerelease":" · Release")));
        details.append(summary);
        const inside = make("div");
        inside.append(href("GitHub release & notes",releaseUrl(projectRepo,rel.tag_name)));
        fileRows(inside,rel,projectRepo);
        details.append(inside);
        box.append(details);
      }
      if (box.firstElementChild?.tagName === "DETAILS") box.firstElementChild.open = true;
    }
    const more=$("sc-release-more");
    more.hidden = !r.more;
    more.disabled = r.busy;
    more.textContent = r.busy ? "Loading older releases…" : "Load older releases";
    note("sc-release-progress",releases ?
      releases.length + " published releases loaded for " + r.project.name + (r.more?" · older releases available":" · no more pages") :
      "Release list is loading when GitHub is available.");
  }
  async function json(url) {
    const control = new AbortController();
    const timeout = setTimeout(()=>control.abort(),9000);
    try {
      const response=await fetch(url,{headers:{Accept:"application/vnd.github+json"},signal:control.signal,cache:"no-store"});
      if (!response.ok) throw new Error("GitHub HTTP "+response.status);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  async function page(repo, number) {
    return await json(API+"/repos/"+OWNER+"/"+encodeURIComponent(repo)+"/releases?per_page=30&page="+number);
  }
  async function hydrate(repo) {
    const r=state.get(repo);
    if (!r) return false;
    const urls=[API+"/repos/"+OWNER+"/"+encodeURIComponent(repo), API+"/repos/"+OWNER+"/"+encodeURIComponent(repo)+"/releases?per_page=30&page=1"];
    const answers=await Promise.allSettled(urls.map(json));
    let sourceOk = false, releasesOk = false;
    if (answers[0].status==="fulfilled") {
      const data=answers[0].value;
      if (data && data.name===repo && data.owner?.login?.toLowerCase()===OWNER && !data.fork) {
        r.pushed=data.pushed_at; sourceOk = true;
      }
    }
    if (answers[1].status==="fulfilled" && Array.isArray(answers[1].value)) {
      const all=answers[1].value;
      r.releases=all.filter(v=>v && !v.draft && v.published_at && v.tag_name)
        .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
      r.page=1;
      r.more=all.length===30;
      releasesOk = true;
    }
    r.error=sourceOk && releasesOk ? null : "GitHub metadata or release history temporarily unavailable";
    return {sourceOk,releasesOk};
  }
  async function hydrateAll() {
    if (fetching) return;
    fetching = true;
    $("sc-refresh").disabled = true;
    note("sc-network","Checking GitHub repositories and releases…");
    let next=0,sourceChecks=0,releaseChecks=0;
    await Promise.all(Array.from({length:3},async()=>{
      while(next<projects.length) {
        const p=projects[next++];
        try{const result=await hydrate(p.repo);if(result.sourceOk)sourceChecks++;if(result.releasesOk)releaseChecks++;}catch {state.get(p.repo).error="GitHub unavailable";}
        renderCards();renderDetails();renderLatest();renderReleases();
      }
    }));
    note("sc-network",releaseChecks===projects.length && sourceChecks===projects.length ?
      "Live GitHub source and release checks complete. Click Refresh to check again." :
      releaseChecks || sourceChecks ?
        "Live GitHub: "+sourceChecks+"/"+projects.length+" source checks; "+releaseChecks+"/"+projects.length+" release histories. Dated fallback retained for unavailable data." :
        "Live GitHub checks unavailable (network or rate limit); showing "+CACHE_DATE+" release snapshot.",
      releaseChecks!==projects.length || sourceChecks!==projects.length);
    fetching=false;
    $("sc-refresh").disabled=false;
  }
  async function loadOlder() {
    const repo=$("sc-release-project").value,r=state.get(repo);
    if (!r || r.busy || !r.more) return;
    r.busy=true;renderReleases();
    try {
      const results=await page(repo,r.page+1);
      if (!Array.isArray(results)) throw new Error("Invalid GitHub release response");
      r.releases=[...(r.releases||[]),...results.filter(v=>!v.draft&&v.published_at&&v.tag_name)];
      r.releases.sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
      r.page++;r.more=results.length===30;
    } catch {
      note("sc-release-progress","Could not load older releases. GitHub may be rate-limiting requests.",true);
    } finally {r.busy=false;renderReleases();}
  }
  async function feed() {
    if (feedBusy) return;
    feedBusy=true;
    try {
      const events=await json(API+"/users/"+OWNER+"/events/public?per_page=35");
      if (!Array.isArray(events)) throw new Error("Invalid activity response");
      const items=events.filter(e => e.repo?.name?.startsWith(OWNER+"/") &&
        (e.type==="PushEvent"||e.type==="ReleaseEvent"||e.type==="CreateEvent"))
        .slice(0,14);
      const box=$("sc-feed-items");box.replaceChildren();
      if (!items.length) box.append(make("p","sc-muted","No recent public GitHub events in this response."));
      for (const event of items) {
        const repo=event.repo.name.split("/").slice(1).join("/");
        const row=make("div","sc-feed-entry");
        const msg=event.type==="PushEvent"?"Code pushed":event.type==="ReleaseEvent"?"Release activity":"Branch or tag created";
        row.append(href(repo+" · "+msg,repoUrl(repo)));
        const commits=event.payload?.commits;
        if (Array.isArray(commits)&&commits[0]?.message)row.append(make("span","",commits[0].message.slice(0,120)));
        row.append(make("span","",date(event.created_at)+" · public GitHub event"));
        box.append(row);
      }
      note("sc-feed-status","Public GitHub activity checked at "+new Date().toLocaleTimeString(),false);
    } catch {
      note("sc-feed-status","Live feed unavailable (GitHub rate limit or network). Open GitHub for current activity.",true);
      if (!$("sc-feed-items").children.length) $("sc-feed-items").append(href("Browse public GitHub activity", "https://github.com/"+OWNER));
    } finally {feedBusy=false;}
  }

  for (const button of document.querySelectorAll("[data-sc-kind]")) {
    button.addEventListener("click",()=>{
      kind=button.dataset.scKind;
      for(const c of document.querySelectorAll("[data-sc-kind]"))c.setAttribute("aria-pressed",String(c===button));
      const shown=countVisible();
      if (!shown.some(p=>p.repo===selected) && shown.length) selected=shown[0].repo;
      rail.scrollLeft=0;renderCards();renderDetails();
    });
  }
  for(const [id,dir] of [["sc-left",-1],["sc-right",1]]) {
    $(id).addEventListener("click",()=>rail.scrollBy({left:dir*285,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));
  }
  rail.addEventListener("wheel",event=>{
    if(event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||rail.scrollWidth<=rail.clientWidth)return;
    const delta=event.deltaY;
    if((delta>0 && rail.scrollLeft>=rail.scrollWidth-rail.clientWidth-2)||(delta<0 && rail.scrollLeft<=1))return;
    event.preventDefault();rail.scrollLeft+=delta;
  },{passive:false});
  rail.addEventListener("keydown",event=>{
    if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
    const visible=countVisible();const index=visible.findIndex(p=>p.repo===selected);
    const next=Math.max(0,Math.min(visible.length-1,index+(event.key==="ArrowRight"?1:-1)));
    if(next===index)return;
    event.preventDefault();select(visible[next].repo);
    rail.querySelectorAll(".sc-card")[next]?.focus();
    rail.querySelectorAll(".sc-card")[next]?.scrollIntoView({block:"nearest",inline:"nearest"});
  });
  $("sc-release-project").addEventListener("change",()=>{select($("sc-release-project").value);});
  $("sc-platform").addEventListener("change",()=>{platform=$("sc-platform").value;renderDetails();renderReleases();});
  $("sc-release-more").addEventListener("click",loadOlder);
  $("sc-refresh").addEventListener("click",async()=>{await Promise.all([hydrateAll(),feed()]);});
  $("sc-feed-refresh").addEventListener("click",feed);

  renderCards();renderDetails();renderLatest();renderReleases();
  hydrateAll();
  feed();
  // Public event cache is allowed to refresh periodically; do not poll every
  // repository's release list every minute or exhaust anonymous API limits.
  setInterval(()=>{if(document.visibilityState==="visible")feed();},600000);
})();
