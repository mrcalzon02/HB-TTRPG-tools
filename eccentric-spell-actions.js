(() => {
  let results=[];
  function generate(root,d){
    const c=d.Core.read(root);
    results=Array.from({length:c.quantity},()=>d.Engine.build(d.V,d.C,d.M,d.E,c));
    d.View.render(root,results);
    root.querySelector('#esc-status').textContent=`Generated ${c.quantity} purely thematic eccentric spell${c.quantity===1?'':'s'}.`;
  }
  function preset(root,d,data){
    results=[d.Engine.build(d.V,d.C,d.M,d.E,d.Core.read(root),data)];
    d.View.render(root,results);
    root.querySelector('#esc-status').textContent=`Generated signature example: ${data.label}.`;
  }
  async function copy(root,d){
    try{
      await navigator.clipboard.writeText(results.map(d.Text.spell).join('\n\n====================\n\n'));
      root.querySelector('#esc-status').textContent='Eccentric spell text copied.';
    }catch(_){root.querySelector('#esc-status').textContent='Clipboard unavailable.';}
  }
  function exportJson(root){
    const blob=new Blob([JSON.stringify({schemaVersion:'1.0.0',generator:'eccentric-spell-creator',thematicOnly:true,spells:results},null,2)],{type:'application/json'});
    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    link.download='generated-eccentric-spells.json';
    link.click();
    URL.revokeObjectURL(link.href);
    root.querySelector('#esc-status').textContent='Eccentric spell concepts exported.';
  }
  window.HBEccentricSpellActions={generate,preset,copy,exportJson};
})();
