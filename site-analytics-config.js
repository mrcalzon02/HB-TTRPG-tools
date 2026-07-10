(() => {
  'use strict';

  window.HB_ANALYTICS_CONFIG = Object.freeze({
    siteId: 'hb-ttrpg-tools',

    // GitHub Pages cannot collect sitewide analytics by itself. Set these to a
    // first-party collector and aggregate dashboard API when one is deployed.
    collectorUrl: '',
    dashboardUrl: '',

    enabled: true,
    localPreview: true,
    respectDoNotTrack: true,
    respectGlobalPrivacyControl: true,
    heartbeatSeconds: 30,
    localEventLimit: 1500,
    retentionDays: 90,

    // Collection boundaries. The collector should hash a source IP with a
    // rotating salt and immediately discard the raw address.
    storeRawIp: false,
    publishRawIp: false,
    locationGranularity: 'country',
    collectSearchText: false,
    collectFormValues: false,
    collectUserGeneratedContent: false
  });
})();
