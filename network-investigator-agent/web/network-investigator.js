(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const state = { token: null, recorder: 'PASSIVE', connected: false };
  const recordButton = $('record-button');
  const markButton = $('mark-button');
  const markerNote = $('marker-note');
  const openDataButton = $('open-data-button');
  const stopAgentButton = $('stop-agent-button');

  function formatClock(totalSeconds, includeHours = false) {
    const value = Math.max(0, Number(totalSeconds) || 0);
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = Math.floor(value % 60);
    return includeHours
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function healthClass(value) {
    const text = String(value || '').toUpperCase();
    if (text === 'GOOD' || text === 'HEALTHY') return 'health-good';
    if (text.includes('FAIL') || text.includes('UNREACHABLE') || text.includes('NO DEFAULT') || text.includes('NO RESOLVER') || text.includes('ERROR')) return 'health-bad';
    return 'health-warn';
  }

  function setHealth(id, value) {
    const element = $(id);
    element.textContent = value || 'COLLECTING';
    element.classList.remove('health-good', 'health-warn', 'health-bad');
    element.classList.add(healthClass(value));
  }

  function latency(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? `${number} ms` : 'no response';
  }

  function applyStatus(data) {
    state.connected = true;
    state.token = data.mutationToken;
    state.recorder = data.state;
    $('agent-dot').classList.add('online');
    $('agent-label').textContent = 'Local recorder connected';
    $('recorder-state').textContent = data.state;
    $('preroll-time').textContent = `${formatClock(data.preRollSeconds)} / 10:00`;
    $('active-time').textContent = formatClock(data.activeSeconds, true);
    $('event-count').textContent = Number(data.observedEvents || 0).toLocaleString();
    $('process-count').textContent = Number(data.processCount || 0).toLocaleString();
    $('tcp-count').textContent = Number(data.tcpEndpointCount || 0).toLocaleString();
    $('udp-count').textContent = Number(data.udpEndpointCount || 0).toLocaleString();
    $('session-name').textContent = data.session || '—';
    $('data-root').textContent = data.dataRoot || '—';
    $('timeline-progress').style.width = `${Math.min(100, (Number(data.preRollSeconds) / 600) * 100)}%`;

    setHealth('lan-status', data.lanStatus);
    setHealth('dns-status', data.dnsStatus);
    setHealth('internet-status', data.internetStatus);
    const diagnosis = data.diagnosis || 'COLLECTING BASELINE';
    const diagnosisElement = $('diagnosis-status');
    diagnosisElement.textContent = diagnosis;
    diagnosisElement.classList.remove('health-good', 'health-warn', 'health-bad');
    diagnosisElement.classList.add(healthClass(diagnosis));
    const gateway = data.gateway || 'none detected';
    const gatewayEvidence = data.gatewayReachable ? 'responded' : 'no ICMP response / unconfirmed';
    $('diagnosis-evidence').textContent = `Gateway ${gateway} (${gatewayEvidence}). Direct IP targets: ${Number(data.internetTargetsReachable || 0)}/${Number(data.internetTargetsTested || 0)} reachable, best ${latency(data.bestInternetLatencyMs)}. DNS resolvers: ${Number(data.dnsResolversHealthy || 0)}/${Number(data.dnsResolversTested || 0)} healthy, best ${latency(data.bestDnsLatencyMs)}. Configured DNS: ${data.dnsServers || 'none detected'}.`;

    const recording = data.state === 'RECORDING';
    recordButton.disabled = data.state === 'FINALIZING';
    recordButton.textContent = recording ? '■ STOP RECORDING' : '● RECORD';
    recordButton.classList.toggle('recording', recording);
    markButton.disabled = !recording;
    markerNote.disabled = !recording;
    openDataButton.disabled = false;
    stopAgentButton.disabled = false;
    $('trigger-marker').hidden = !recording;
    $('record-help').textContent = recording
      ? `Recording permanently. The preceding ${formatClock(data.preRollSeconds)} of buffered evidence was attached to this session.`
      : 'Network Investigator is already keeping a rolling ten-minute pre-record buffer. RECORD means “keep what you saw.”';
    $('timeline-copy').textContent = recording
      ? 'The manual RECORD trigger is preserved as an evidence event; new observations append continuously.'
      : 'Passive history is ephemeral until RECORD is pressed.';
  }

  async function refresh() {
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error(`status ${response.status}`);
      applyStatus(await response.json());
    } catch (error) {
      state.connected = false;
      recordButton.disabled = true;
      markButton.disabled = true;
      markerNote.disabled = true;
      openDataButton.disabled = true;
      stopAgentButton.disabled = true;
      $('agent-dot').classList.remove('online');
      $('agent-label').textContent = 'Local recorder disconnected';
    }
  }

  async function post(path, body = '') {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'X-Network-Investigator-Token': state.token || '',
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `${response.status} ${response.statusText}`);
    return result;
  }

  recordButton.addEventListener('click', async () => {
    recordButton.disabled = true;
    try {
      await post(state.recorder === 'RECORDING' ? '/api/record/stop' : '/api/record/start');
    } catch (error) {
      alert(`Recorder action failed: ${error.message}`);
    } finally {
      await refresh();
    }
  });

  markButton.addEventListener('click', async () => {
    const note = markerNote.value;
    try {
      await post('/api/marker', note);
      markerNote.value = '';
      await refresh();
    } catch (error) {
      alert(`Could not mark event: ${error.message}`);
    }
  });

  openDataButton.addEventListener('click', async () => {
    try { await post('/api/data-folder/open'); }
    catch (error) { alert(`Could not open evidence folder: ${error.message}`); }
  });

  stopAgentButton.addEventListener('click', async () => {
    if (!confirm('Stop Network Investigator? The passive pre-record buffer will stop collecting until the agent is launched again.')) return;
    try {
      await post('/api/agent/stop');
      $('agent-label').textContent = 'Local recorder stopping…';
      recordButton.disabled = true;
      markButton.disabled = true;
      markerNote.disabled = true;
      openDataButton.disabled = true;
      stopAgentButton.disabled = true;
    } catch (error) {
      alert(`Could not stop local agent: ${error.message}`);
    }
  });

  refresh();
  window.setInterval(refresh, 1000);
})();
