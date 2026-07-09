(() => {
  'use strict';

  const root = 'assets/blacklight/';
  const iconsRoot = `${root}sliced_web_asset_icons_25/`;
  const bundleRoot = `${root}blacklight_character_portrait_sets_bundle_01/blacklight_character_portrait_sets_bundle_01/`;
  const techRoot = `${root}technomancer_and_harmonic_bundle_01/technomancer_and_harmonic_bundle_01/`;
  const promoRoot = `${root}blacklight_homepage_promotional_images/blacklight_homepage_promotional_images/`;

  const range = (count, factory) => Array.from({ length: count }, (_, index) => factory(index + 1));
  const pad = value => String(value).padStart(2, '0');

  function makePortraitSet({ archetype, prefix, folder, count = 10, label }) {
    return range(count, number => ({
      id: `${prefix}-${pad(number)}`,
      prefix,
      archetype,
      label: `${label} ${pad(number)}`,
      path: `${folder}/${prefix}_${pad(number)}.png`
    }));
  }

  const placeholder = [
    {
      id: 'placeholder-character-portrait-01',
      prefix: 'placeholder_character_portrait',
      archetype: 'all',
      label: 'Placeholder Character Portrait 01',
      path: `${root}placeholder_character_portrait_set/placeholder_character_portrait_set/placeholder_character_portrait_01.png`
    }
  ];

  const portraitSets = {
    placeholder,
    'human-investigator': makePortraitSet({
      archetype: 'human-investigator',
      prefix: 'human_investigator',
      folder: `${bundleRoot}human_investigator_portrait_set_01`,
      label: 'Human Investigator Portrait'
    }),
    vampire: makePortraitSet({
      archetype: 'vampire',
      prefix: 'vampire',
      folder: `${bundleRoot}vampire_portrait_set_01`,
      label: 'Vampire Portrait'
    }),
    shapechanger: [],
    'eldritch-binder': makePortraitSet({
      archetype: 'eldritch-binder',
      prefix: 'eldritch_binder',
      folder: `${root}eldritch_binder_portrait_set_01/eldritch_binder_portrait_set_01`,
      label: 'Eldritch Binder Portrait'
    }),
    'harmonic-mutant': makePortraitSet({
      archetype: 'harmonic-mutant',
      prefix: 'harmonic_mutant',
      folder: `${techRoot}harmonic_mutant_portrait_set_01`,
      label: 'Harmonic Mutant Portrait'
    }),
    technomancer: makePortraitSet({
      archetype: 'technomancer',
      prefix: 'technomancer',
      folder: `${techRoot}technomancer_portrait_set_01`,
      label: 'Technomancer Portrait'
    })
  };

  const portraitAliases = {
    investigator: 'human-investigator',
    'human investigator': 'human-investigator',
    'human-investigator': 'human-investigator',
    human_investigator: 'human-investigator',
    vampire: 'vampire',
    shapechanger: 'shapechanger',
    'shape changer': 'shapechanger',
    'shape-changer': 'shapechanger',
    eldritch: 'eldritch-binder',
    'eldritch binder': 'eldritch-binder',
    'eldritch-binder': 'eldritch-binder',
    eldritch_binder: 'eldritch-binder',
    harmonic: 'harmonic-mutant',
    'harmonic mutant': 'harmonic-mutant',
    'harmonic-mutant': 'harmonic-mutant',
    harmonic_mutant: 'harmonic-mutant',
    technomancer: 'technomancer'
  };

  function normalizeArchetype(value) {
    const raw = String(value || '').trim().toLowerCase().replace(/_/g, ' ');
    if (!raw) return '';
    const dashed = raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (portraitSets[dashed]) return dashed;
    if (portraitAliases[raw]) return portraitAliases[raw];
    if (portraitAliases[dashed]) return portraitAliases[dashed];
    if (raw.includes('investigator')) return 'human-investigator';
    if (raw.includes('vampire')) return 'vampire';
    if (raw.includes('shape')) return 'shapechanger';
    if (raw.includes('eldritch')) return 'eldritch-binder';
    if (raw.includes('harmonic')) return 'harmonic-mutant';
    if (raw.includes('technomancer')) return 'technomancer';
    return dashed;
  }

  function portraitsFor(archetype) {
    const key = normalizeArchetype(archetype);
    return [...placeholder, ...(portraitSets[key] || [])];
  }

  function hashSeed(value) {
    let hash = 2166136261;
    for (const character of String(value || '')) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pickPortrait(archetype, seed = '') {
    const portraits = portraitsFor(archetype);
    if (!portraits.length) return null;
    return portraits[hashSeed(`${archetype}:${seed}`) % portraits.length];
  }

  const icons = {
    home: `${iconsRoot}01_01_home.png`,
    search: `${iconsRoot}01_02_search.png`,
    user: `${iconsRoot}01_03_user.png`,
    heart: `${iconsRoot}01_04_heart.png`,
    cart: `${iconsRoot}01_05_cart.png`,
    settings: `${iconsRoot}02_01_settings.png`,
    globe: `${iconsRoot}02_02_globe.png`,
    email: `${iconsRoot}02_03_email.png`,
    chat: `${iconsRoot}02_04_chat.png`,
    bell: `${iconsRoot}02_05_bell.png`,
    laptop: `${iconsRoot}03_01_laptop.png`,
    image: `${iconsRoot}03_02_image.png`,
    play: `${iconsRoot}03_03_play.png`,
    wifi: `${iconsRoot}03_04_wifi.png`,
    location: `${iconsRoot}03_05_location.png`,
    link: `${iconsRoot}04_01_link.png`,
    analytics: `${iconsRoot}04_02_analytics.png`,
    calendar: `${iconsRoot}04_03_calendar.png`,
    lock: `${iconsRoot}04_04_lock.png`,
    download: `${iconsRoot}04_05_download.png`,
    like: `${iconsRoot}05_01_like.png`,
    speech: `${iconsRoot}05_02_speech_bubble.png`,
    clock: `${iconsRoot}05_03_clock.png`,
    star: `${iconsRoot}05_04_star.png`,
    share: `${iconsRoot}05_05_share.png`
  };

  const audio = {
    keys: `${root}keys.mp3`,
    speech: `${root}The_speech.mp3`,
    corporateLandingSpeech: `${root}speech2.mp3`,
    personnelSpeech: `${root}speech_3.mp3`,
    pageSpeeches: {
      'blacklight-corporate.html': `${root}speech2.mp3`,
      'blacklight-personnel.html': `${root}speech_3.mp3`
    },
    notification: `${root}universfield-email-notification-143029.mp3`
  };

  const homepagePromotionalImages = [
    `${promoRoot}blacklight-homepage-hero-exterior.png`,
    `${promoRoot}blacklight-campus-aerial.png`,
    `${promoRoot}blacklight-main-foyer-sculpture.png`,
    `${promoRoot}blacklight-boardroom-presentation.png`
  ];

  const corporatePromos = {
    homepageCandidates: homepagePromotionalImages,
    systemsCandidates: [
      homepagePromotionalImages[1],
      homepagePromotionalImages[3],
      homepagePromotionalImages[2],
      homepagePromotionalImages[0]
    ],
    homepagePromotionalImages
  };

  window.BLACKLIGHT_ASSETS = Object.freeze({
    portraits: Object.freeze({ sets: portraitSets, aliases: portraitAliases, normalizeArchetype, portraitsFor, pickPortrait }),
    icons: Object.freeze(icons),
    audio: Object.freeze(audio),
    corporatePromos: Object.freeze(corporatePromos)
  });
})();