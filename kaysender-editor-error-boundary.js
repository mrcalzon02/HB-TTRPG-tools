(() => {
  'use strict';

  function diagnosticsTarget() {
    const shell = document.getElementById('kaysender-mainline-editor-shell');
    if (!shell || shell.hidden) return null;
    return shell.querySelector('#mainline-editor-diagnostics');
  }

  function report(error, context = 'editor-runtime') {
    const target = diagnosticsTarget();
    if (!target) return false;
    const message = error instanceof Error ? error.message : String(error || 'Unknown editor error.');
    const item = document.createElement('li');
    item.className = 'editor-diagnostic-error';
    const label = document.createElement('strong');
    label.textContent = context;
    item.append(label, document.createTextNode(`: ${message}`));
    target.prepend(item);
    return true;
  }

  window.addEventListener('error', event => {
    report(event.error || event.message, 'uncaught-editor-error');
  });

  window.addEventListener('unhandledrejection', event => {
    report(event.reason, 'unhandled-editor-rejection');
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('#kaysender-mainline-editor-shell button');
    if (!button) return;
    const activeEditorId = window.KaysenderMainlineEditorProduction?.getActiveEditorId?.();
    if (activeEditorId) button.dataset.lastEditorAction = activeEditorId;
  }, true);

  window.reportKaysenderEditorError = report;
})();
