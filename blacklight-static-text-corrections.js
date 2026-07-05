(() => {
  'use strict';
  const replacements = [
    ['Helena Marrow', 'Eva Frost'],
    ['Open Blacklight Continuum Wiki', 'Open Internal Archive'],
    ['Internal Wiki', 'Internal Archive'],
    ['Brand Assets', 'Corporate Standards']
  ];
  function replaceText(value) {
    let text = value;
    replacements.forEach(([from, to]) => { text = text.split(from).join(to); });
    return text;
  }
  function walk(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      node.nodeValue = replaceText(node.nodeValue);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    node.childNodes.forEach(walk);
  }
  document.addEventListener('DOMContentLoaded', () => walk(document.body));
})();
