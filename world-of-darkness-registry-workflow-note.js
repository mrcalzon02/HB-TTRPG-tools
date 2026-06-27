(() => {
  'use strict';

  const NOTE = 'Submitting opens a prefilled issue in this repository. After submitting it, run the manual Ingest World of Darkness POI Registry Submission workflow with that issue number. The workflow validates the JSON and commits the entry into poi_registry.json on main. No Google API key or browser-exposed GitHub token is required.';
  const STATUS = 'A prefilled GitHub registry issue was opened. Submit it while signed into the repository-owner account, then manually run the Ingest World of Darkness POI Registry Submission workflow with the new issue number. The JSON patch was also copied when browser permissions allowed.';

  function patchWorkflowText() {
    document.querySelectorAll('#wod-spatial-engine .wod-note').forEach(note => {
      if (note.textContent.includes('Submitting opens a prefilled issue')) note.textContent = NOTE;
    });

    const button = document.getElementById('wod-submit-central-registry');
    if (button && button.dataset.manualWorkflowNote !== 'true') {
      button.dataset.manualWorkflowNote = 'true';
      button.addEventListener('click', () => {
        window.setTimeout(() => {
          const status = document.getElementById('wod-spatial-status');
          if (status) status.textContent = STATUS;
        }, 0);
      });
    }
  }

  const observer = new MutationObserver(patchWorkflowText);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  patchWorkflowText();
  document.addEventListener('DOMContentLoaded', patchWorkflowText);
})();
