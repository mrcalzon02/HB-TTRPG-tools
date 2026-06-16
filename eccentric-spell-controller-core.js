(() => {
  function fill(select,object,random){
    select.replaceChildren();
    if(random) select.add(new Option('Random','random'));
    Object.entries(object).forEach(([id,value])=>select.add(new Option(value.label,id)));
  }
  function read(root){
    return {
      themeId:root.querySelector('#esc-theme').value,
      classId:root.querySelector('#esc-class').value,
      competenceId:root.querySelector('#esc-competence').value,
      moralityId:root.querySelector('#esc-morality').value,
      oddityId:root.querySelector('#esc-oddity').value,
      biasId:root.querySelector('#esc-bias').value,
      quantity:Math.max(1,Math.min(20,Number(root.querySelector('#esc-quantity').value)||1))
    };
  }
  window.HBEccentricSpellControllerCore={fill,read};
})();
