import path from 'node:path';
import { requireValue,same,stableGroup } from './npc-browser-test-helpers.mjs';

const GENERATORS_NAV='.top-nav .nav-button[data-view="generators"]';

export async function runExtensionScenarios({page,matrix,root,recorder}){
  const s=matrix.selectors,t=matrix.timeouts;

  await recorder.check('custom-pack-install',async()=>{
    const fixture=path.resolve(root,matrix.customPackFixture);
    await page.setInputFiles(s.importPackFile,fixture);
    await page.waitForFunction(()=>globalThis.NpcProfileGeneratorWorkspace?.installedCustomPacks?.some(pack=>pack.packId==='frostmarch-campaign'),null,{timeout:t.action});
    const installed=await page.evaluate(()=>({
      packs:globalThis.NpcProfileGeneratorWorkspace.installedCustomPacks.map(pack=>pack.packId),
      archetypes:[...document.querySelectorAll('#npc-archetype option')].map(option=>option.value),
      ancestries:[...document.querySelectorAll('#npc-ancestry option')].map(option=>option.value)
    }));
    requireValue(installed.archetypes.includes('frost-warden'),'Frost Warden archetype was not added to the controls.');
    requireValue(installed.ancestries.includes('frostborn'),'Frostborn ancestry was not added to the controls.');
    await page.click(s.managePacks);await page.waitForSelector(s.packRows,{timeout:t.action});
    const rows=await page.locator(s.packRows).count();requireValue(rows>=1,'Installed-pack manager contains no pack row.');
    await page.keyboard.press('Escape');
    return{packIds:installed.packs,managerRows:rows};
  });

  await recorder.check('group-after-pack-rebuild',async()=>{
    await page.selectOption(s.groupTemplate,'crew');
    await page.fill(s.groupSize,'6');
    await page.selectOption(s.groupDepth,'deep');
    await page.fill(s.groupSeed,'phase14-browser-group');
    await page.click(s.groupGenerate);
    await page.waitForFunction(()=>globalThis.NpcProfileGeneratorWorkspace?.currentGroup?.generator?.seed==='phase14-browser-group'&&globalThis.NpcProfileGeneratorWorkspace.currentGroup.template.id==='crew',null,{timeout:t.action});
    const first=await stableGroup(page);
    const firstState=await page.evaluate(()=>({
      members:globalThis.NpcProfileGeneratorWorkspace.currentGroup.members.length,
      relationships:globalThis.NpcProfileGeneratorWorkspace.currentGroup.relationships.length,
      packIds:globalThis.NpcProfileGeneratorWorkspace.pack.activeCustomPackIds||[],
      groupTables:Array.isArray(globalThis.NpcProfileGeneratorWorkspace.pack.tables?.crewNames),
      cards:document.querySelectorAll('.npc-group-member').length
    }));
    requireValue(firstState.members===6&&firstState.cards===6,'Crew group did not render exactly six members.');
    requireValue(firstState.relationships>=10,'Crew group does not contain enough reciprocal relationships.');
    requireValue(firstState.packIds.includes('frostmarch-campaign'),'Campaign pack provenance disappeared before group generation.');
    requireValue(firstState.groupTables,'Group tables disappeared after campaign-pack rebuilding.');
    await page.evaluate(()=>{globalThis.__phase14PreviousGroup=globalThis.NpcProfileGeneratorWorkspace.currentGroup;});
    await page.click(s.groupGenerate);
    await page.waitForFunction(()=>globalThis.NpcProfileGeneratorWorkspace?.currentGroup!==globalThis.__phase14PreviousGroup,null,{timeout:t.action});
    const second=await stableGroup(page);
    requireValue(same(first,second),'Same group seed and controls did not reproduce the same roster.');
    return firstState;
  });

  await recorder.check('legacy-kaysender',async()=>{
    await page.click('#npc-return-generators');
    await page.waitForSelector(s.legacyModule,{state:'visible',timeout:t.action});
    await page.waitForSelector(s.legacyLaunch,{state:'visible',timeout:t.action});
    await page.click(s.legacyLaunch);
    await page.waitForSelector('#kaysender-alpha-panel [data-npc="count"]',{timeout:t.action});
    await page.fill('#kaysender-alpha-panel [data-npc="count"]','2');
    await page.click(s.legacyGenerate);
    await page.waitForFunction(selector=>document.querySelectorAll(selector).length===2,s.legacyResults,{timeout:t.action});
    const result=await page.evaluate(selectors=>{
      const cards=[...document.querySelectorAll(selectors.cards)];
      return{cards:cards.length,rowCounts:cards.map(card=>card.querySelectorAll('.alpha-kv').length),titles:cards.map(card=>card.querySelector('h4')?.textContent||'')};
    },{cards:s.legacyResults});
    requireValue(result.rowCounts.every(count=>count===17),`Legacy cards contained row counts ${result.rowCounts.join(', ')} instead of 17.`);
    requireValue(result.titles.every(Boolean),'A legacy Kaysender card is missing its title.');
    return result;
  });

  await recorder.check('mobile-layout',async()=>{
    await page.click(GENERATORS_NAV);
    await page.waitForSelector(s.openNpc,{state:'visible',timeout:t.action});
    await page.click(s.openNpc);
    await page.setViewportSize(matrix.viewports.mobile);
    await page.waitForSelector(s.workspace,{state:'visible',timeout:t.action});
    const layout=await page.evaluate(()=>({
      documentWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth,
      workspaceWidth:document.getElementById('npc-generator')?.scrollWidth||0,
      groupControlsVisible:document.getElementById('npc-group-template')?.getClientRects().length>0,
      profileVisible:document.querySelector('.npc-profile-banner')?.getClientRects().length>0
    }));
    requireValue(layout.documentWidth<=layout.viewportWidth+1,`Mobile document overflows horizontally: ${layout.documentWidth}px > ${layout.viewportWidth}px.`);
    requireValue(layout.groupControlsVisible&&layout.profileVisible,'Profile or group controls are not visible at the mobile viewport.');
    return layout;
  });
}
