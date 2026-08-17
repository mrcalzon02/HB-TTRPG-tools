(() => {
  'use strict';

  const TAB_ID = 'network-investigator';
  const LOCAL_URL = 'http://127.0.0.1:8765/';
  const SOURCE_URL = 'https://github.com/mrcalzon02/HB-TTRPG-tools/tree/main/network-investigator-agent';

  function initialize() {
    const view = document.getElementById('scientific-tools');
    const tabs = view?.querySelector('.scientific-tools-tabs');
    if (!view || !tabs) return false;

    let tab = tabs.querySelector(`[data-scientific-tools-tab="${TAB_ID}"]`);
    if (!tab) {
      tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'scientific-tools-tab';
      tab.dataset.scientificToolsTab = TAB_ID;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      tab.textContent = 'Network Investigator';
      tabs.appendChild(tab);
      tab.addEventListener('click', () => window.ScientificToolsWorkspace?.selectTab?.(TAB_ID));
    }

    let panel = view.querySelector(`[data-scientific-tools-panel="${TAB_ID}"]`);
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'scientific-tools-panel no-print';
      panel.dataset.scientificToolsPanel = TAB_ID;
      panel.hidden = true;
      panel.innerHTML = `
        <p class="eyebrow">Local Windows network diagnostics and forensic recording</p>
        <h3>Network Investigator</h3>
        <p>Inspect what this computer is talking to, preserve a rolling ten-minute pre-record history, and diagnose local-network, DNS, and Internet failures from a local Windows companion. Live monitoring and permanent recording are separate: the investigator watches while open, and RECORD means <strong>keep what you saw</strong>.</p>
        <div class="scientific-tools-actions">
          <a class="link-button primary-action" href="${LOCAL_URL}" target="_blank" rel="noopener">Open Local Network Investigator</a>
          <a class="link-button secondary-action" href="${SOURCE_URL}" target="_blank" rel="noopener">Windows Agent / Source</a>
        </div>
        <div class="scientific-tools-runtime">
          <span><strong>Passive pre-roll:</strong> the newest ten minutes are retained in a disk-backed rolling buffer while the local agent is running</span>
          <span><strong>Recording:</strong> pressing RECORD preserves the preceding buffer and continuously appends new evidence until STOP</span>
          <span><strong>Current evidence:</strong> process lifecycle and ancestry, Windows TCP/UDP ownership, default-route/gateway evidence, configured DNS-resolver probes, direct Internet-by-IP probes, health classification, and manual event markers</span>
          <span><strong>Failure classification:</strong> separates local-route failure, direct Internet reachability, and DNS resolver failure instead of treating every outage as “Internet down”</span>
          <span><strong>Data boundary:</strong> connection/process metadata and diagnostic evidence are recorded; application payload contents are not captured</span>
        </div>
        <div class="scientific-tools-boundary"><strong>Local security boundary:</strong> this hosted HTTPS page cannot and should not inspect privileged Windows networking state. The companion binds only to <code>127.0.0.1</code>; this tab merely gives you a deliberate doorway to the dashboard. If the local agent is not running, the Open button will lead to a normal localhost connection error rather than silently weakening the agent with cross-origin remote control.</div>
      `;
      view.appendChild(panel);
    }

    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (String(requestedTab || '').toLowerCase() === TAB_ID) {
      window.ScientificToolsWorkspace?.selectTab?.(TAB_ID);
    }
    return true;
  }

  window.NetworkInvestigatorSiteEntry = Object.freeze({ initialize });
  initialize();
})();
