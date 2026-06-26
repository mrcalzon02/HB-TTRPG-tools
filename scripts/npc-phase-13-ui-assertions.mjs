import vm from 'node:vm';
import { read,fixture } from './npc-phase-13-validation-fixture.mjs';

export function assertGroupUiContracts(fail){
  const sources={
    'npc-profile-generator-group-ui.js':read('npc-profile-generator-group-ui.js'),
    'npc-profile-generator-group-bootstrap.js':read('npc-profile-generator-group-bootstrap.js'),
    'npc-profile-generator-persistence-restore.js':read('npc-profile-generator-persistence-restore.js')
  };
  const ui=sources['npc-profile-generator-group-ui.js'];
  const bootstrap=sources['npc-profile-generator-group-bootstrap.js'];
  const restore=sources['npc-profile-generator-persistence-restore.js'];
  const css=read('npc-profile-generator-group.css');

  for(const[file,source]of Object.entries(sources)){
    try{new vm.Script(source,{filename:file});}
    catch(error){fail(`${file} does not parse: ${error.message}`);}
  }
  for(const id of fixture.requiredUiControls||[])if(!ui.includes(id))fail(`Group UI control ${id} is missing.`);
  for(const script of fixture.requiredBootstrapModules||[])if(!bootstrap.includes(script))fail(`Group bootstrap does not load ${script}.`);
  for(const flag of['depthDataLoaded','householdDataLoaded','operationDataLoaded','mechanicsDataLoaded','customPackBootstrapApplied','packUiInstalled','installedCustomPacks'])if(!bootstrap.includes(flag))fail(`Group bootstrap readiness check is missing ${flag}.`);
  if(!bootstrap.includes('NpcProfileGeneratorGroupUI.enrich(workspace)'))fail('Group bootstrap does not apply the group UI.');
  if(!restore.includes('npc-profile-generator-group-bootstrap.js')||!restore.includes('loadGroupBootstrap'))fail('NPC workspace does not launch the group bootstrap.');
  if(!css.includes('.npc-group-controls')||!css.includes('.npc-group-roster')||!css.includes('@media print'))fail('Group UI styles or print rules are incomplete.');
}
