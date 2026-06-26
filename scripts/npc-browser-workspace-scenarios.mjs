import path from 'node:path';
import { readDownload,requireValue,same,stableProfile } from './npc-browser-test-helpers.mjs';

async function clickAndWaitForProfile(page,selector){
  const event=page.evaluate(()=>new Promise(resolve=>{
    document.getElementById('npc-profile-generator-root')?.addEventListener('npc-profile-generated',entry=>resolve({reason:entry.detail?.reason,profileId:entry.detail?.profile?.profileId}),{once:true});
  }));
  await page.click(selector);
  return event;
}

export async function runWorkspaceScenarios({page,context,matrix,root,origin,recorder}){
  const s=matrix.selectors,t=matrix.timeouts;

  await recorder.check('workspace-load',async()=>{
    await page.goto(`${origin}${matrix.entryPath}`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector(s.openNpc,{timeout:t.workspace});
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
    const before=await page.evaluate(id=>JSON.parse(JSON.stringify(globalThis.NpcProfileGeneratorWorkspace.currentProfile.sections[id])),section);
    const priorCounter=await page.evaluate(id=>Number(globalThis.NpcProfileGeneratorWorkspace.rerollCounters[id]||0),section);
    await page.locator(container).getByRole('button',{name:'Lock'}).click();
    requireValue(await page.locator(container).getByRole('button',{name:'Unlock'}).getAttribute('aria-pressed')==='true','Section lock did not activate.');
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
    const jsonDownload=page.waitForEvent('download');await page.click(s.exportJson);const json=await readDownload(await jsonDownload);
    const textDownload=page.waitForEvent('download');await page.click(s.exportText);const text=await readDownload(await textDownload);
    const markdownDownload=page.waitForEvent('download');await page.click(s.exportMarkdown);const markdown=await readDownload(await markdownDownload);
    const parsed=JSON.parse(json.content);
    requireValue(text.content.includes(parsed.identity.fullName),'Readable text export is missing the profile name.');
    requireValue(markdown.content.includes(parsed.identity.fullName),'Markdown export is missing the profile name.');
    await page.setInputFiles(s.importProfileFile,json.path);
    await page.waitForFunction(id=>globalThis.NpcProfileGeneratorWorkspace?.currentProfile?.profileId===id,parsed.profileId,{timeout:t.action});
    await page.click(s.copyText);const copiedText=await page.evaluate(()=>navigator.clipboard.readText());
    await page.click(s.copyMarkdown);const copiedMarkdown=await page.evaluate(()=>navigator.clipboard.readText());
    requireValue(copiedText.includes(parsed.identity.fullName),'Copied text is missing the profile name.');
    requireValue(copiedMarkdown.includes(parsed.identity.fullName),'Copied Markdown is missing the profile name.');
    return{jsonBytes:json.bytes,textBytes:text.bytes,markdownBytes:markdown.bytes,importedProfileId:parsed.profileId,fixture:path.relative(root,json.path)};
  });
}
