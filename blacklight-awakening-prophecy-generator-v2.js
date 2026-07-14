(()=>{
  'use strict';

  const CORE_URL='blacklight-awakening-prophecy-generator.js?v=20260711-consolidated-core';
  const normalizeEventName=name=>name==='Gifts of Conquered Houses'?'The Gifts of Conquered Houses':name;
  const REPLACEMENT=`  function interpretations(record,stage,event,kind,seed){
    const archive=globalThis.BlacklightAwakeningInterpretations;
    if(!archive||typeof archive.resolve!=='function')throw new Error('The bespoke prophecy interpretation archive is unavailable.');
    const archiveEvent=event.name==='Gifts of Conquered Houses'?{...event,name:'The Gifts of Conquered Houses'}:event;
    const readings=archive.resolve({record,stage,event:archiveEvent,kind,seed,prophecy:event.composedProphecy||event.poem||''});
    if(!Array.isArray(readings)||readings.length!==5||new Set(readings).size!==5)throw new Error(\`Invalid bespoke interpretations for \${event.name}.\`);
    return readings;
  }`;

  function fail(error){
    console.error('[Blacklight Prophecy Archive]',error);
    const status=document.getElementById('prophecy-status');
    const output=document.getElementById('prophecy-output');
    if(status)status.textContent='The prophecy generator could not initialize its event-specific interpretation archive.';
    if(output)output.innerHTML='<div class="empty-prophecy"><strong>ARCHIVE ERROR:</strong> Bespoke prophecy interpretations failed validation. No generic fallback was permitted.</div>';
  }

  function verifyCoreCoverage(source,archive){
    const eventNames=[...source.matchAll(/(?:minor|major):\{name:'([^']+)'/g)].map(match=>match[1]);
    if(eventNames.length!==72)throw new Error(`Expected 72 prophecy events in the core; located ${eventNames.length}.`);
    const unique=new Set(eventNames);
    if(unique.size!==72)throw new Error(`The prophecy core contains only ${unique.size} unique event names.`);
    for(const name of eventNames){
      const readings=archive.resolve({event:{name:normalizeEventName(name),poem:''},prophecy:''});
      if(!Array.isArray(readings)||readings.length!==5||new Set(readings).size!==5)throw new Error(`Bespoke coverage failed for ${name}.`);
    }
  }

  async function start(){
    try{
      const archive=globalThis.BlacklightAwakeningInterpretations;
      if(!archive||archive.count!==72)throw new Error(`Expected 72 bespoke event records; received ${archive?.count||0}.`);
      const response=await fetch(CORE_URL,{cache:'no-store'});
      if(!response.ok)throw new Error(`Unable to retrieve prophecy core (${response.status}).`);
      let source=await response.text();
      verifyCoreCoverage(source,archive);

      const functionStart=source.indexOf('  function interpretations(');
      const functionEnd=source.indexOf('\n\n  function buildRecord',functionStart);
      if(functionStart<0||functionEnd<0)throw new Error('The interpretation function boundary could not be located in the prophecy core.');
      source=source.slice(0,functionStart)+REPLACEMENT+source.slice(functionEnd);

      const minorNeedle="minor.interpretations=interpretations(record,stage,stage.minor,'Minor',";
      const majorNeedle="major.interpretations=interpretations(record,stage,stage.major,'Major',";
      if(!source.includes(minorNeedle)||!source.includes(majorNeedle))throw new Error('The prophecy event interpretation calls could not be located.');
      source=source.replace(minorNeedle,"minor.interpretations=interpretations(record,stage,{...stage.minor,composedProphecy:minor.prophecy},'Minor',");
      source=source.replace(majorNeedle,"major.interpretations=interpretations(record,stage,{...stage.major,composedProphecy:major.prophecy},'Major',");

      if(/Literal reading:|Symbolic reading:|Temporal reading:|Counterintelligence reading:/.test(source))throw new Error('Generic interpretation templates remain in the executable prophecy source.');
      Function(`${source}\n//# sourceURL=blacklight-awakening-prophecy-generator-runtime.js`)();
    }catch(error){fail(error);}
  }

  start();
})();
