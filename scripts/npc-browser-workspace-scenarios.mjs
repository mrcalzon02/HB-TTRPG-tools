import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireValue,same,stableProfile } from './npc-browser-test-helpers.mjs';

const GENERATORS_NAV='.top-nav .nav-button[data-view="generators"]';

async function clickAndWaitForProfile(page,selector){
  const event=page.evaluate(()=>new Promise(resolve=>{
    document.getElementById('npc-profile-generator-root')?.addEventListener('npc-profile-generated',entry=>resolve({reason:entry.detail?.reason,profileId:entry.detail?.profile?.profileId}),{once:true});
  }));
  await page.click(selector);
  return event;
}

async function installDownloadCapture(page){
  await page.evaluate(()=>{
    if(globalThis.__npcDownloadCaptureInstalled)return;
    const blobs=new Map(),captures=[];
    const create=URL.createObjectURL.bind(URL);
    const click=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};
    HTMLAnchorElement.prototype.click=function(){
      const blob=blobs.get(this.href);
      if(this.download&&blob)blob.text().then(content=>captures.push({name:this.download,type:blob.type,content}));
      return click.call(this);
    };
    globalThis.__npcCapturedDownloads=captures;
    globalThis.__npcDownloadCaptureInstalled=true;
  });
}

async function captureDownload(page,selector,timeout){
  const before=await page.evaluate(()=>globalThis.__npcCapturedDownloads?.length||0);
  await page.click(selector);
  await page.waitForFunction(count=>(globalThis.__npcCapturedDownloads?.length||0)>count,before,{timeout});
  return page.evaluate(index=>globalThis.__npcCapturedDownloads[index],before);
}

export async function runWorkspaceScenarios({page,matrix,root,origin,recorder}){
  const s=matrix.selectors,t=matrix.timeouts;

  await recorder.check('workspace-load',async()=>{
    await page.goto(`${origin}${matrix.entryPath}`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector(GENERATORS_NAV,{state:'visible',timeout:t.workspace});
    await page.click(GENERATORS_NAV);
    await page.waitForSelector(s.openNpc,{state:'visible',timeout:t.workspace});
    await page.click(s.openNpc);
    await page.waitForSelector(s.workspace,{state:'visible',timeout:t.workspace});
    await page.waitForFunction(()=>{
      const w=globalThis.NpcProfileGeneratorWorkspace;
      return Boolean(w?.currentProfile&&w?.depthDataLoaded&&w?.householdDataLoaded&&w?.operationDataLoaded&&w?.mechanicsDataLoaded&&w?.packUiInstalled&&w?.groupUiInstalled);
    },null,{timeout:t.workspace});
    const controlIds=Object.values(matrix.requiredControls).flat();
    const missing=await page.evaluate(ids=>ids.filter(id=>!document.getElementById(id)),controlIds);
    requireValue(!missing.length,`Missing controls: ${missing.join(', ')}`);
    const accessibility=await page.evaluate(config=>{
      const live=config.liveRegions.filter(selector=>{const item=document.querySelector(selector);return item&&(item.getAttribute('aria-live')||item.getAttribute('role')==='status');});
      const buttons=[...document.querySelectorAll('#npc-generator button')].filter(item=>(item.getAttribute('aria-label')||item.textContent||'').trim()).length;
      const selects=[...document.querySelectorAll('#npc-generator select')].filter(item=>item.getAttribute('aria-label')||item.closest('label')?.textContent?.trim()).length;
      return{live,buttons,selects,sections:document.querySelectorAll('.npc-profile-section').length};
    },matrix.accessibility);
    requireValue(accessibility.live.length===matrix.accessibility.liveRegions.length,'One or more required live regions are missing.');
    requireValue(accessibility.buttons>=matrix.accessibility.minimumNamedButtons,`Only ${accessibility.buttons} named buttons were found.`);
    requireValue(accessibility.selects>=matrix.accessibility.minimumNamedSelects,`Only ${accessibility.selects} named selects were found.`);
    requireValue(accessibility.sections>=10,`Only ${accessibility.sections} profile sections rendered.`);
    await installDownloadCapture(page);
    return accessibility;
  });

  await recorder.check('progressive-mechanics',async()=>{
    await page.selectOption(s.levelMode,'custom');
    await page.dispatchEvent(s.levelMode,'input');
    requireValue(await page.locator(s.customLevelGroup).evaluate(item=>!item.hidden),'Custom level control did not appear.');
    await page.fill(s.customLevel,'7');
    await page.selectOption(s.levelMode,'generated');
    await page.dispatchEvent(s.levelMode,'input');
    requireValue(await page.locator(s.customLevelGroup).evaluate(item=>item.hidden),'Custom level control did not hide.');
    return{customLevel:7};
  });

  await recorder.check('seed-determinism',async()=>{
    await page.fill(s.seed,'phase14-browser-profile');
    await page.selectOption(s.depth,'standard');
    await clickAndWaitForProfile(page,s.generate);
    const first=await stableProfile(page);
    await clickAndWaitForProfile(page,s.generate);
    const second=await stableProfile(page);
    requireValue(first&&second,'A generated profile snapshot is missing.');
    requireValue(same(first,second),'Same seed and controls did not reproduce the same canonical profile.');
    return{profileId:first.profileId,name:first.identity.fullName};
  });

  await recorder.check('lock-reroll',async()=>{
    const section='appearance',container=`.npc-profile-section[data-section-id="${section}"]`;
    const sectionLock=`${container} .npc-section-actions button[aria-pressed]`;
    const before=await page.evaluate(id=>JSON.parse(JSON.stringify(globalThis.NpcProfileGeneratorWorkspace.currentProfile.sections[id])),section);
    const priorCounter=await page.evaluate(id=>Number(globalThis.NpcProfileGeneratorWorkspace.rerollCounters[id]||0),section);
    await page.locator(sectionLock).click();
    requireValue(await page.locator(`${container} .npc-section-actions button[aria-pressed="true"]`).count()===1,'Section lock did not activate.');
    const event=page.evaluate(()=>new Promise(resolve=>document.getElementById('npc-profile-generator-root')?.addEventListener('npc-profile-generated',()=>resolve(true),{once:true})));
    await page.locator(container).getByRole('button',{name:'Reroll section'}).click();await event;
    const after=await page.evaluate(id=>JSON.parse(JSON.stringify(globalThis.NpcProfileGeneratorWorkspace.currentProfile.sections[id])),section);
    const counter=await page.evaluate(id=>Number(globalThis.NpcProfileGeneratorWorkspace.rerollCounters[id]||0),section);
    requireValue(same(before,after),'Locked section changed during reroll.');
    requireValue(counter===priorCounter+1,`Reroll counter advanced from ${priorCounter} to ${counter}.`);
    return{section,counter};
  });

  await recorder.check('save-clone',async()=>{
    const beforeId=await page.evaluate(()=>globalThis.NpcProfileGeneratorWorkspace.currentProfile.profileId);
    await page.click(s.saveProfile);
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{"records":[]}').records?.length||0,matrix.storageKeys.profiles);
    requireValue(stored>=1,'Saved profile collection is empty.');
    await page.click(s.manageProfiles);await page.waitForSelector(s.savedProfileRows,{timeout:t.action});
    const rows=await page.locator(s.savedProfileRows).count();requireValue(rows>=1,'Profile manager contains no saved row.');
    await page.keyboard.press('Escape');
    await page.click(s.cloneProfile);
    await page.waitForFunction(id=>globalThis.NpcProfileGeneratorWorkspace?.currentProfile?.profileId!==id,beforeId,{timeout:t.action});
    const clone=await page.evaluate(()=>({id:globalThis.NpcProfileGeneratorWorkspace.currentProfile.profileId,name:globalThis.NpcProfileGeneratorWorkspace.currentProfile.identity.fullName}));
    requireValue(clone.name.endsWith('— Copy'),'Clone name does not identify the copy.');
    return{savedRecords:stored,managerRows:rows,cloneId:clone.id};
  });

  await recorder.check('export-import-copy',async()=>{
    const json=await captureDownload(page,s.exportJson,t.action);
    const text=await captureDownload(page,s.exportText,t.action);
    const markdown=await captureDownload(page,s.exportMarkdown,t.action);
    const parsed=JSON.parse(json.content);
    requireValue(text.content.includes(parsed.identity.fullName),'Readable text export is missing the profile name.');
    requireValue(markdown.content.includes(parsed.identity.fullName),'Markdown export is missing the profile name.');
    const importPath=path.join(os.tmpdir(),`npc-phase14-${process.pid}.json`);
    fs.writeFileSync(importPath,json.content);
    try{
      await page.setInputFiles(s.importProfileFile,importPath);
      await page.waitForFunction(id=>globalThis.NpcProfileGeneratorWorkspace?.currentProfile?.profileId===id,parsed.profileId,{timeout:t.action});
    }finally{fs.rmSync(importPath,{force:true});}
    await page.click(s.copyText);const copiedText=await page.evaluate(()=>navigator.clipboard.readText());
    await page.click(s.copyMarkdown);const copiedMarkdown=await page.evaluate(()=>navigator.clipboard.readText());
    requireValue(copiedText.includes(parsed.identity.fullName),'Copied text is missing the profile name.');
    requireValue(copiedMarkdown.includes(parsed.identity.fullName),'Copied Markdown is missing the profile name.');
    return{jsonBytes:json.content.length,textBytes:text.content.length,markdownBytes:markdown.content.length,importedProfileId:parsed.profileId,downloads:[json.name,text.name,markdown.name]};
  });
}
