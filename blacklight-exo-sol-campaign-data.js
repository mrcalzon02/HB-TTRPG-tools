(() => {
  'use strict';

  const SOL_SEED = 'EXAMPLE:system:1';
  const radians = degrees => Number(degrees || 0) * Math.PI / 180;
  const clone = value => JSON.parse(JSON.stringify(value));
  const daysForAu = au => Number((Math.sqrt(Math.pow(Number(au), 3)) * 365.256).toFixed(3));

  const facilities = Object.freeze([
    Object.freeze({
      id:'facility-iss', kind:'facility', anchorType:'body-orbit',
      parentId:'planet-3', parentName:'Earth', orbit:'F1',
      name:'International Space Station', shortName:'ISS',
      type:'Crewed low-Earth-orbit research station',
      orbitalDistanceKm:6791, altitudeKm:420, periodDays:0.0625,
      eccentricity:0.0003, inclination:51.64, ascendingNode:148.2,
      argumentOfPeriapsis:0, phase:radians(32), color:'#e8edf2',
      operator:'International partnership of NASA, Roscosmos, ESA, JAXA, and CSA',
      control:'International civil orbital partnership', status:'Operational',
      campaignClassification:'Published infrastructure · Blacklight campaign continuity',
      provenance:'published-campaign', habitability:100,
      resources:['crewed microgravity laboratory','Earth observation platform','orbital docking infrastructure','international communications and logistics node'],
      hazards:['low-Earth-orbit debris environment','atmospheric drag','radiation exposure','continuous station-keeping requirement'],
      summary:'The International Space Station is the continuously crewed international research station in low Earth orbit. Its approximately 90-minute orbit and international operating partnership are retained as published reference data in the Blacklight campaign model.'
    }),
    Object.freeze({
      id:'facility-lunar-l2-refueling', kind:'facility', anchorType:'body-orbit',
      parentId:'planet-3', parentName:'Earth', orbit:'F2',
      name:'Lunar Orbital Refueling Facility', shortName:'LORF',
      type:'Earth–Moon L2 propellant depot and transfer station',
      orbitalDistanceKm:445000, altitudeKm:null, periodDays:27.3217,
      eccentricity:0.02, inclination:5.15, ascendingNode:125.1,
      argumentOfPeriapsis:180, phase:radians(212), color:'#61d8d0',
      operator:'Charles', control:'Charles-controlled Black Light Company asset', status:'Operational',
      campaignClassification:'Blacklight campaign fixed infrastructure',
      location:'Earth–Moon L2 halo-orbit operating volume', provenance:'campaign-fixed', habitability:100,
      resources:['cryogenic propellant storage','orbital refueling berths','lunar transfer logistics','deep-space vehicle servicing','automated traffic coordination'],
      hazards:['three-body orbital instability','cryogenic propellant handling','lunar farside communications geometry','high-consequence docking operations'],
      summary:'A Charles-controlled refueling and transfer complex maintained in the Earth–Moon L2 operating volume. It supports lunar, cislunar, and outbound Black Light Company traffic.'
    }),
    Object.freeze({
      id:'facility-asteroid-reprocessing', kind:'facility', anchorType:'heliocentric',
      orbit:'F3', name:'Charles Asteroid Reprocessing Facility', shortName:'CARF',
      type:'Asteroid capture, refining, and materials reprocessing complex',
      distance:2.82, periodDays:daysForAu(2.82), eccentricity:0.08, inclination:7.4,
      ascendingNode:80.3, argumentOfPeriapsis:73.1, phase:radians(146), color:'#d79a4d',
      operator:'Charles', control:'Charles-controlled Black Light Company asset', status:'Operational',
      campaignClassification:'Blacklight campaign fixed infrastructure',
      location:'Main Asteroid Belt industrial operating zone', provenance:'campaign-fixed', habitability:100,
      resources:['asteroid feedstock processing','iron-nickel refining','platinum-group metal recovery','silicate and carbonaceous separation','construction-mass production'],
      hazards:['high-velocity debris','captured-body handling','industrial thermal loads','autonomous tug traffic'],
      summary:'A Charles-controlled main-belt industrial facility that captures, sorts, and reprocesses asteroid material into refined feedstock and construction mass.'
    }),
    Object.freeze({
      id:'facility-zeus-station', kind:'facility', anchorType:'heliocentric',
      orbit:'F4', name:'Zeus Station', aliases:['Zues Station'], shortName:'ZEUS',
      type:'Deep-system station and construction complex',
      distance:2000, periodDays:daysForAu(2000), eccentricity:0.18, inclination:31,
      ascendingNode:286, argumentOfPeriapsis:42, phase:radians(304), color:'#a881ff',
      operator:'Charles', control:'Charles-controlled Black Light Company project', status:'Under construction',
      constructionProgress:'Primary structural and logistics phase',
      campaignClassification:'Blacklight campaign fixed infrastructure',
      location:'Inner Oort Cloud construction volume', provenance:'campaign-fixed', habitability:0,
      resources:['deep-system construction yard','cometary volatile intake','long-duration logistics reserve','outer-system sensor and communications architecture'],
      hazards:['multi-year conventional transit','weak solar binding','extreme thermal environment','sparse navigation references','construction isolation'],
      summary:'Zeus Station is a Charles-controlled deep-system project under construction in the inner Oort Cloud. Its displayed 2,000 AU reference radius represents the campaign construction volume rather than a precision ephemeris.'
    })
  ]);

  const source = Object.freeze({
    id:'blacklight-sol-campaign',
    version:'2026.07.14-sol-campaign-facilities-1',
    campaign:'Blacklight Intelligence · The Charles Intervention',
    facilities
  });

  function install() {
    const fixed = globalThis.BlacklightExoFixedSystems;
    if (!fixed || fixed.__blacklightCampaignInstalled) return false;
    const originalResolve = fixed.resolve.bind(fixed);
    const originalHas = fixed.has.bind(fixed);
    const enhanced = Object.freeze({
      ...fixed,
      __blacklightCampaignInstalled:true,
      campaignSource:source,
      has:originalHas,
      resolve(seed) {
        const system = originalResolve(seed);
        if (!system || String(seed || '').trim().toUpperCase() !== SOL_SEED.toUpperCase()) return system;
        system.facilities = clone(facilities);
        system.campaign = {
          id:source.id,
          title:source.campaign,
          version:source.version,
          facilityCount:facilities.length
        };
        system.features = [
          ...(system.features || []),
          `${facilities.length} Blacklight campaign infrastructure records are stored as selectable Sol-system objects.`,
          'Campaign facilities are resolved into the fixed Sol model before rendering and are included in JSON export.'
        ];
        system.resourceTotals = {...(system.resourceTotals || {}), industrial:(system.resourceTotals?.industrial || 0) + facilities.length};
        return system;
      }
    });
    globalThis.BlacklightExoFixedSystems = enhanced;
    globalThis.BlacklightExoSolCampaignSource = source;
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const retry = () => {
      if (install() || attempts++ > 240) return;
      requestAnimationFrame(retry);
    };
    requestAnimationFrame(retry);
  }
})();
