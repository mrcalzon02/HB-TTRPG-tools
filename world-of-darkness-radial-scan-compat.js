(() => {
  'use strict';

  const state = {
    startedAt: '',
    center: null,
    total: 0,
    records: []
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function viewport() {
    return window.WODLightweightSpatialCore?.getViewport?.()
      || window.WODNamedLocationBridge?.getViewport?.()
      || null;
  }

  function publish(records) {
    const latestScan = {
      scannedAt: new Date().toISOString(),
      viewport: viewport(),
      meta: {
        received: records.length,
        limit: state.total || records.length,
        capped: (state.total || records.length) >= 90,
        hydrationMode: 'radial-sequential',
        hydrationConcurrency: 1,
        centerFirst: true
      },
      locations: records.map(record => ({
        osmType: record.osmType,
        osmId: record.osmId,
        name: record.name,
        lat: record.lat,
        lng: record.lng,
        featureLabel: record.featureLabel,
        sourceTags: clone(record.sourceTags || {}),
        address: record.address,
        category: record.category,
        locationKey: record.entryKey,
        inventoryStatus: record.inventoryStatus
      }))
    };
    window.WODNamedLocationLatestScan = latestScan;
    window.WODLightweightSpatialCore?.setLatestScan?.(latestScan);
    document.dispatchEvent(new CustomEvent('wod:named-location-scan-complete', {
      detail: latestScan
    }));
    return latestScan;
  }

  function updateCount(completed, total) {
    const target = document.getElementById('wod-visible-business-count');
    if (target) target.textContent = `${completed}/${total} Chronicle records loaded radially`;
  }

  document.addEventListener('wod:radial-load-started', event => {
    state.startedAt = new Date().toISOString();
    state.center = clone(event.detail?.center || null);
    state.total = Number(event.detail?.total || 0);
    state.records = [];
    updateCount(0, state.total);
  });

  document.addEventListener('wod:radial-location-ready', event => {
    const record = event.detail?.record;
    if (record) state.records.push(clone(record));
    updateCount(Number(event.detail?.completed || state.records.length), Number(event.detail?.total || state.total));
  });

  document.addEventListener('wod:radial-load-complete', event => {
    const records = Array.isArray(event.detail?.records) ? event.detail.records : state.records;
    state.records = clone(records);
    state.total = Number(event.detail?.total || records.length);
    updateCount(records.length, state.total);
    publish(records);
  });

  document.addEventListener('wod:radial-load-cancelled', () => {
    state.records = [];
    updateCount(0, state.total);
  });

  async function generateManualRecord() {
    const name = document.getElementById('wod-business-name')?.value.trim() || '';
    const address = document.getElementById('wod-business-address')?.value.trim() || '';
    const lat = Number(document.getElementById('wod-business-lat')?.value);
    const lng = Number(document.getElementById('wod-business-lng')?.value);
    const category = document.getElementById('wod-business-type')?.value || 'other';
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      const status = document.getElementById('wod-visible-business-status');
      if (status) {
        status.textContent = 'Manual records require a name, latitude, and longitude.';
        status.classList.add('error');
      }
      return;
    }
    const id = Math.abs(Array.from(`${name}|${lat}|${lng}`).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0));
    await window.WODRadialLocationLoader?.beginFromElements?.([{
      type: 'manual',
      id,
      lat,
      lon: lng,
      tags: {
        name,
        'addr:full': address,
        wod_named_feature_label: 'Manual Named Location',
        amenity: category
      }
    }]);
  }

  function bindManualButton() {
    const button = document.getElementById('wod-resolve-business');
    if (!button || button.dataset.wodRadialManualBound === 'true') return false;
    button.dataset.wodRadialManualBound = 'true';
    button.addEventListener('click', () => void generateManualRecord());
    return true;
  }

  let attempts = 0;
  const seek = () => {
    attempts += 1;
    if (!bindManualButton() && attempts < 160) window.setTimeout(seek, 50);
  };
  seek();

  window.WODRadialScanCompatibility = Object.freeze({
    publish,
    getState: () => clone(state)
  });
})();
