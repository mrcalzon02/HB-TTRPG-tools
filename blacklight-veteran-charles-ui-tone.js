(() => {
  'use strict';

  const replacements = [
    ['Continuity Record Progress', 'Charles Reorientation Progress'],
    ['Returning operative record', 'Charles is asking you directly'],
    ['Select What Remains True', 'Tell Charles What Still Matters'],
    [
      'Use the bubbles to record emotions, judgments, boundaries, loyalties, roles, and preferences. Select several whenever the character holds conflicting or overlapping positions. Charles records one response per field; changing the selection replaces that response rather than creating a duplicate.',
      'Use the bubbles as the answer you are giving Charles. Contradictory answers are allowed because people are inconvenient that way. Charles responds once per field; change the selection and he changes the reply.'
    ],
    ['One current response per field · changed selections replace prior responses', 'Charles answers the selections you make · change the answer and he answers again'],
    ['Review current continuity transcript', 'Review what Charles has already said'],
    ['No committed responses yet.', 'Charles has not answered anything here yet. Try clicking something provocative.'],
    ['Charles will respond after a bubble selection is changed or one of the two preserved character-sheet statements is committed.', 'Charles will answer after you choose a bubble or commit one of the two preserved character-sheet statements. Yes, he is waiting. Try not to enjoy that.']
  ];

  function replaceTextNode(node) {
    let next = node.nodeValue;
    replacements.forEach(([from, to]) => {
      if (next.includes(from)) next = next.replace(from, to);
    });
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function walk(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(replaceTextNode);
  }

  function tune() {
    walk(document.body);
  }

  document.addEventListener('DOMContentLoaded', () => {
    tune();
    const observer = new MutationObserver(() => tune());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
