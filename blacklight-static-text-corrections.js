(() => {
  'use strict';
  function apply() {
    document.body.innerHTML = document.body.innerHTML
      .replaceAll('Helena Marrow', 'Eva Frost')
      .replaceAll('Open Blacklight Continuum Wiki', 'Open Internal Archive')
      .replaceAll('Internal Wiki', 'Internal Archive')
      .replaceAll('Brand Assets', 'Corporate Standards');
  }
  document.addEventListener('DOMContentLoaded', apply);
})();
