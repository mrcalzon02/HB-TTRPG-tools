import {
  PackStorage,basePack,baseArchetypes,MemoryStorage,clone,same,validPack
} from './npc-phase-11-validation-fixture.mjs';

const describe=items=>(items||[]).map(item=>`${item.code}@${item.path||'/'}`).join(', ');

function supportPack(){
  return{
    packType:'npcCustomPack',schemaVersion:'1.0.0',packId:'frostmarch-support',version:'1.0.0',
    title:'Frostmarch Support',description:'Adds names while depending on the Frostmarch campaign pack.',
    compatibility:{generatorMinVersion:'0.1.0',generatorMaxMajor:0,profileSchemaVersion:'1.0.0',basePackId:'generic-fantasy-core'},
    dependencies:[{packId:'frostmarch-campaign',minimumVersion:'1.0.0',optional:false}],
    names:{givenNames:['Ylva']}
  };
}

export function runStorageUpgradeChecks(){
  const failures=[];
  let checks=0;
  const fail=message=>failures.push(message);
  const storage=new MemoryStorage();
  const support=supportPack();

  const installed=PackStorage.installPack(storage,basePack,baseArchetypes,validPack,{timestamp:'2026-06-26T13:10:00.000Z'});
  const installedSupport=PackStorage.installPack(storage,basePack,baseArchetypes,support,{timestamp:'2026-06-26T13:11:00.000Z'});
  if(!installed.ok||!installedSupport.ok)fail(`Upgrade fixture installation failed: ${describe([...installed.diagnostics,...installedSupport.diagnostics])}.`);
  else checks+=1;

  const upgraded=clone(validPack);
  upgraded.version='1.1.0';
  upgraded.notes=[...(upgraded.notes||[]),'Transactional upgrade fixture.'];
  const upgradeResult=PackStorage.installPack(storage,basePack,baseArchetypes,upgraded,{timestamp:'2026-06-26T13:12:00.000Z'});
  const afterUpgrade=PackStorage.listPacks(storage).packs;
  const upgradedStored=afterUpgrade.find(pack=>pack.packId===validPack.packId);
  if(!upgradeResult.ok||afterUpgrade.length!==2||upgradedStored?.version!=='1.1.0'||!afterUpgrade.some(pack=>pack.packId===support.packId))fail(`Depended-on pack upgrade failed: ${describe(upgradeResult.diagnostics)}.`);
  else checks+=1;

  const beforeDowngrade=clone(afterUpgrade);
  const downgraded=clone(validPack);
  downgraded.version='0.9.0';
  const downgradeResult=PackStorage.installPack(storage,basePack,baseArchetypes,downgraded,{timestamp:'2026-06-26T13:13:00.000Z'});
  const afterDowngrade=PackStorage.listPacks(storage).packs;
  if(downgradeResult.ok||!downgradeResult.diagnostics.some(item=>item.code==='CUSTOM_PACK_DEPENDENCY_VERSION')||!same(beforeDowngrade,afterDowngrade))fail('Incompatible pack downgrade was not rejected transactionally.');
  else checks+=1;

  const nonObject=PackStorage.installPack(storage,basePack,baseArchetypes,null);
  if(nonObject.ok||!nonObject.diagnostics.some(item=>item.code==='CUSTOM_PACK_NOT_OBJECT'))fail('Non-object custom pack input was not rejected.');
  else checks+=1;

  return{failures,checks};
}
