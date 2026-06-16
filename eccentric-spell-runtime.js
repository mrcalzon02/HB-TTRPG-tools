(() => {
  function init(){
    const root=document.getElementById('eccentric-spell-creator-root');
    const V=window.HBSpellVocabulary,C=window.HBEccentricCompetence,M=window.HBEccentricMorality,E=window.HBEccentricSpellVocabulary;
    const Engine=window.HBEccentricSpellEngine,View=window.HBEccentricSpellView,Text=window.HBEccentricSpellText,Core=window.HBEccentricSpellControllerCore,Actions=window.HBEccentricSpellActions;
    if(!root||!V||!C||!M||!E||!Engine||!View||!Text||!Core||!Actions)return;
    const d={V,C,M,E,Engine,View,Text,Core,Actions};
    Core.fill(root.querySelector('#esc-theme'),V.THEMES,true);
    Core.fill(root.querySelector('#esc-class'),V.CLASSES,true);
    Core.fill(root.querySelector('#esc-competence'),C,false);
    Core.fill(root.querySelector('#esc-morality'),M,false);
    Core.fill(root.querySelector('#esc-oddity'),E.ODDITY,false);
    Core.fill(root.querySelector('#esc-bias'),E.CONCEPT_BIASES,false);
    root.querySelector('#esc-generate').addEventListener('click',()=>Actions.generate(root,d));
    root.querySelector('#esc-milk').addEventListener('click',()=>Actions.preset(root,d,E.SIGNATURE_PRESETS.milkStorm));
    root.querySelector('#esc-yarn').addEventListener('click',()=>Actions.preset(root,d,E.SIGNATURE_PRESETS.yarnGiant));
    root.querySelector('#esc-copy').addEventListener('click',()=>Actions.copy(root,d));
    root.querySelector('#esc-export').addEventListener('click',()=>Actions.exportJson(root));
    Actions.generate(root,d);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
