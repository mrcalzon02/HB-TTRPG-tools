(() => {
  'use strict';
  const C=globalThis.BlacklightExoFTLCertificationAudit,base=globalThis.BlacklightExoFTL;
  if(!C||!C.routeAudit||!C.reliabilityAudit||!base||base.certificationAuditVersion)return;
  function build(result){
    const route=C.routeAudit(result),reliability=C.reliabilityAudit(result),status=C.worstStatus(route.status,reliability.status);
    const reason=status==='refused'?'One or more modeled conditions fail the current authorization policy.':status==='restricted'?'The machine may proceed only under test, reduced-occupancy, route-specific, or special-command authority.':status==='conditionally authorized'?'The architecture is suitable for planning, but activation still requires current route, traffic, mass-map, calibration, and infrastructure clearance.':'The model supports routine authorization subject to ordinary live clearance.';
    return{version:1,author:'Charles',status,statusLabel:`${status.replace(/\b\w/g,c=>c.toUpperCase())}`,reason,standingLimit:'This is an in-universe engineering authorization model. A generated dossier cannot replace current sensors, maintenance records, destination occupancy checks, traffic control, or command authority.',route,reliability,preservationRecord:{routeEnvelopeRetained:true,navigationRecordRetained:true,reliabilityRecordRetained:true,engineeringMaturityRetained:true,method:'The certification audit appends interpretation, repeated-use calculations, and refusal policy without altering the generated route or reliability values.'}};
  }
  function generate(seed,input={},source=null){const result=base.generate(seed,input,source);result.version=8;result.certificationAudit=build(result);result.summary+=` Charles classifies the present authorization as ${result.certificationAudit.status}: ${result.certificationAudit.reason}`;result.sourceImpact.push('Charles added a route and reliability authorization ledger with live-clearance requirements, repeated-mission risk, calibration burden, traffic limits, and explicit refusal conditions.');return result;}
  globalThis.BlacklightExoFTL=Object.freeze({...base,version:8,certificationAuditVersion:1,generate});
})();
