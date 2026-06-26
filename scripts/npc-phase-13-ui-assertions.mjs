import { read,fixture } from './npc-phase-13-validation-fixture.mjs';

export function assertGroupUiContracts(fail){
  const ui=read('npc-profile-generator-group-ui.js');
  const bootstrap=read('npc-profile-generator-group-bootstrap.js');
  const restore=read('npc-profile-generator-persistence-restore.js');
  const css=read('npc-profile-generator-group.css');

  for(const id of fixture.requiredUiControls||[])if(!ui.includes(id))fail(`Group UI control ${id} is missing.`);
  for(const script of fixture.requiredBootstrapModules||[])if(!bootstrap.includes(script))fail(`Group bootstrap does not load ${script}.`);
  for(const flag of['depthDataLoaded','householdDataLoaded','operationDataLoaded','mechanicsDataLoaded','customPackBootstrapApplied','packUiInstalled','installedCustomPacks'])if(!bootstrap.includes(flag))fail(`Group bootstrap readiness check is missing ${flag}.`);
  if(!bootstrap.includes('NpcProfileGeneratorGroupUI.enrich(workspace)'))fail('Group bootstrap does not apply the group UI.');
  if(!restore.includes('npc-profile-generator-group-bootstrap.js')||!restore.includes('loadGroupBootstrap'))fail('NPC workspace does not launch the group bootstrap.');
  if(!css.includes('.npc-group-controls')||!css.includes('.npc-group-roster')||!css.includes('@media print'))fail('Group UI styles or print rules are incomplete.');
}
