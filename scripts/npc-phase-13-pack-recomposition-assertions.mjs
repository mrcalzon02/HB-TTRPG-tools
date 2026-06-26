import { read } from './npc-phase-13-validation-fixture.mjs';

export function assertGroupPackRecomposition(fail){
  const ui=read('npc-profile-generator-group-ui.js');
  if(!ui.includes('refreshPack(workspace)')||!ui.includes('GroupData.extendPack(workspace.pack,workspace.groupData)'))fail('Group UI does not restore group tables after campaign-pack rebuilds.');
}
