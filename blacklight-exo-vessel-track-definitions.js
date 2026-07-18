(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselTrackDefinitions)return;
  const C=299792458;
  const signatureProfiles=Object.freeze({
    STEALTH:{key:'STEALTH',label:'Stealth-managed target',detectability:.42,identityClarity:.48,emissionFactor:.28},
    LOW:{key:'LOW',label:'Low-signature target',detectability:.68,identityClarity:.66,emissionFactor:.55},
    NORMAL:{key:'NORMAL',label:'Ordinary operating signature',detectability:1,identityClarity:1,emissionFactor:1},
    HIGH:{key:'HIGH',label:'High-power or maneuvering signature',detectability:1.34,identityClarity:1.18,emissionFactor:1.45},
    BEACON:{key:'BEACON',label:'Cooperative beacon or transponder',detectability:1.85,identityClarity:1.75,emissionFactor:2.2}
  });
  const targetClasses=Object.freeze({
    MISSILE:{key:'MISSILE',label:'Missile or autonomous weapon',sizeFactor:.18,maneuverFactor:2.4,identityDifficulty:1.35},
    SMALL_CRAFT:{key:'SMALL_CRAFT',label:'Small craft',sizeFactor:.42,maneuverFactor:1.65,identityDifficulty:1.18},
    VESSEL:{key:'VESSEL',label:'Ordinary vessel',sizeFactor:1,maneuverFactor:1,identityDifficulty:1},
    CAPITAL:{key:'CAPITAL',label:'Capital vessel',sizeFactor:2.2,maneuverFactor:.72,identityDifficulty:.82},
    STATION:{key:'STATION',label:'Station or fixed infrastructure',sizeFactor:4.5,maneuverFactor:.08,identityDifficulty:.62},
    UNKNOWN:{key:'UNKNOWN',label:'Unknown contact',sizeFactor:.72,maneuverFactor:1.25,identityDifficulty:1.45}
  });
  const conflictModes=Object.freeze({
    NONE:{key:'NONE',label:'Consistent observations',hypothesisCount:1,agreementPenalty:0,deceptionBase:.04},
    NOISY:{key:'NOISY',label:'Noisy or partially contradictory observations',hypothesisCount:2,agreementPenalty:.18,deceptionBase:.16},
    DECOY:{key:'DECOY',label:'Probable decoy or signature clone',hypothesisCount:3,agreementPenalty:.34,deceptionBase:.48},
    CONFLICTING:{key:'CONFLICTING',label:'Mutually conflicting tracks',hypothesisCount:3,agreementPenalty:.46,deceptionBase:.32}
  });
  const trackStatuses=Object.freeze(['NO_TRACK','DETECTION_ONLY','COARSE_TRACK','FIRM_TRACK','FIRE_CONTROL_TRACK']);
  const solutionStatuses=Object.freeze(['UNAVAILABLE','STALE','SEARCH_ONLY','TRACKING','FIRE_CONTROL_READY']);
  const validationModes=Object.freeze(['REPAIR','STRICT']);
  const repairableFaults=Object.freeze(['NEGATIVE_LIGHT_LAG','CONFIDENCE_OUT_OF_RANGE','FIRE_CONTROL_WITHOUT_CHANNELS','ZERO_UNCERTAINTY_CONFLICT','MISSING_SENSOR_SOURCE','DESTROYED_OBSERVER_TRACKING']);
  const deferredSystems=Object.freeze({weaponPerformanceAndEngagementEnvelopes:'VESSEL-07',localDamageResolution:'VESSEL-08',gameplayActions:'VESSEL-09'});
  globalThis.BlacklightExoVesselTrackDefinitions=Object.freeze({
    phase:'VESSEL-06',schemaVersion:'1.0.0',speedOfLightMps:C,signatureProfiles,targetClasses,conflictModes,trackStatuses,solutionStatuses,validationModes,repairableFaults,deferredSystems,
    defaults:Object.freeze({rangeKm:300000,targetSizeM:120,targetClass:'VESSEL',signatureProfile:'NORMAL',relativeVelocityMps:5000,lateralAccelerationMps2:1.5,targetCombatDeltaVMps:18000,observationAgeSeconds:1,projectionHorizonSeconds:30,conflictMode:'NONE',emissionControlPercent:35})
  });
})();