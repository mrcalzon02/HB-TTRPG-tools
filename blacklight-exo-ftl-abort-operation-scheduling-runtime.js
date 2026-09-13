(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/exo-vessel/ftl-abort-operation-scheduling-registry.json'));
  } else {
    root.BlacklightExoFTLAbortOperationSchedulingRuntime = factory(root.BLACKLIGHT_FTL_ABORT_OPERATION_SCHEDULING_REGISTRY || null);
  }
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const STATUS = Object.freeze({PASS:'PASS', CONDITIONAL:'CONDITIONAL', BLOCK:'BLOCK', UNRESOLVED:'UNRESOLVED', CONFLICT:'CONFLICT', SIMULATION_ONLY:'SIMULATION_ONLY'});
  const unique = (xs) => Array.from(new Set((xs || []).filter((x) => x !== null && x !== undefined && x !== '')));
  const finiteNN = (x) => Number.isFinite(Number(x)) && Number(x) >= 0;

  function worse(a,b) {
    const rank = {PASS:0, CONDITIONAL:1, SIMULATION_ONLY:2, UNRESOLVED:3, BLOCK:4, CONFLICT:5};
    return (rank[b] || 0) > (rank[a] || 0) ? b : a;
  }

  function normalizeOperations(context) {
    const source = context.operations || context.abortOperations || [];
    return source.map((op, index) => ({
      id: String(op.id || ('op-'+index)),
      durationUpperSeconds: finiteNN(op.durationUpperSeconds) ? Number(op.durationUpperSeconds) : null,
      predecessors: unique(op.predecessors || op.dependsOn || []),
      resourceDemand: Object.assign({}, op.resourceDemand || {}),
      consumableDemand: Object.assign({}, op.consumableDemand || {}),
      stage: op.stage || null,
      provenance: unique(op.provenance || [])
    }));
  }

  function applySerialization(operations, serialization) {
    const byId = new Map(operations.map((op)=>[op.id,op]));
    const errors = [];
    for (const rule of (serialization || [])) {
      const order = rule.order || rule.operationIds || [];
      for (let i=1; i<order.length; i++) {
        const prev = String(order[i-1]), next = String(order[i]);
        if (!byId.has(prev) || !byId.has(next)) {
          errors.push('SERIALIZATION_OPERATION_MISSING:'+prev+'->'+next);
          continue;
        }
        byId.get(next).predecessors = unique([...(byId.get(next).predecessors||[]), prev]);
      }
    }
    return errors;
  }

  function topologicalSchedule(operations) {
    const byId = new Map(operations.map((op)=>[op.id,op]));
    const missing = [];
    for (const op of operations) {
      for (const p of op.predecessors) if (!byId.has(p)) missing.push(op.id+':'+p);
    }
    if (missing.length) return {status:STATUS.UNRESOLVED, reason:'AOS-DEPENDENCY-MISSING', missing};

    const indegree = new Map(operations.map((op)=>[op.id,0]));
    const children = new Map(operations.map((op)=>[op.id,[]]));
    for (const op of operations) {
      for (const p of op.predecessors) {
        indegree.set(op.id, indegree.get(op.id)+1);
        children.get(p).push(op.id);
      }
    }

    const queue = operations.filter((op)=>indegree.get(op.id)===0).map((op)=>op.id).sort();
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      order.push(id);
      for (const child of children.get(id)) {
        indegree.set(child, indegree.get(child)-1);
        if (indegree.get(child)===0) {
          queue.push(child);
          queue.sort();
        }
      }
    }
    if (order.length !== operations.length) return {status:STATUS.CONFLICT, reason:'AOS-CYCLE', order};

    const start = new Map(), finish = new Map(), criticalPred = new Map();
    for (const id of order) {
      const op = byId.get(id);
      if (!finiteNN(op.durationUpperSeconds)) return {status:STATUS.UNRESOLVED, reason:'AOS-DURATION-UNKNOWN', operationId:id};
      let es = 0, cp = null;
      for (const p of op.predecessors) {
        const ef = finish.get(p);
        if (ef > es) { es = ef; cp = p; }
      }
      start.set(id,es);
      finish.set(id,es+op.durationUpperSeconds);
      criticalPred.set(id,cp);
    }

    let sink = null, makespan = 0;
    for (const id of order) {
      if (finish.get(id) >= makespan) { makespan = finish.get(id); sink = id; }
    }
    const critical = [];
    while (sink) { critical.push(sink); sink = criticalPred.get(sink); }
    critical.reverse();

    return {status:STATUS.PASS,order,start,finish,makespan,critical};
  }

  function intervals(schedule, operations) {
    return operations.map((op)=>({
      id:op.id,
      start:schedule.start.get(op.id),
      finish:schedule.finish.get(op.id),
      resourceDemand:op.resourceDemand,
      consumableDemand:op.consumableDemand
    }));
  }

  function renewableChecks(context, schedule, operations) {
    const capacities = context.resourceCapacities || {};
    const units = context.resourceUnits || {};
    const checks = [];
    const unresolved = [];
    let state = STATUS.PASS;
    const ivals = intervals(schedule,operations);
    const resources = unique(operations.flatMap((op)=>Object.keys(op.resourceDemand||{})));

    for (const resource of resources) {
      const cap = capacities[resource];
      if (!finiteNN(cap)) {
        unresolved.push('AOS-CAPACITY-MISSING:'+resource);
        state = worse(state,STATUS.UNRESOLVED);
        continue;
      }
      const events = unique(ivals.flatMap((x)=>[x.start,x.finish])).sort((a,b)=>a-b);
      let peak = 0, peakWindow = null, contributors = [];
      for (let i=0;i<events.length-1;i++) {
        const a=events[i], b=events[i+1];
        if (b<=a) continue;
        const active=ivals.filter((x)=>x.start < b && x.finish > a && finiteNN(x.resourceDemand?.[resource]));
        const demand=active.reduce((s,x)=>s+Number(x.resourceDemand[resource]),0);
        if (demand>peak) { peak=demand; peakWindow=[a,b]; contributors=active.map((x)=>x.id); }
      }
      const singleExceeds = operations.filter((op)=>finiteNN(op.resourceDemand?.[resource]) && Number(op.resourceDemand[resource])>Number(cap)).map((op)=>op.id);
      if (singleExceeds.length) {
        state = worse(state,STATUS.BLOCK);
        checks.push({resource,unit:units[resource]||null,capacity:Number(cap),peakDemand:peak,status:STATUS.BLOCK,reason:'AOS-CAPACITY-EXCEEDED',contributors:singleExceeds,peakWindowSeconds:peakWindow});
      } else if (peak > Number(cap)) {
        state = worse(state,STATUS.UNRESOLVED);
        unresolved.push('AOS-CONTENTION-UNRESOLVED:'+resource);
        checks.push({resource,unit:units[resource]||null,capacity:Number(cap),peakDemand:peak,status:STATUS.UNRESOLVED,reason:'AOS-CONTENTION-UNRESOLVED',contributors,peakWindowSeconds:peakWindow});
      } else {
        checks.push({resource,unit:units[resource]||null,capacity:Number(cap),peakDemand:peak,status:STATUS.PASS,reason:'RENEWABLE_CAPACITY_RESPECTED',contributors,peakWindowSeconds:peakWindow});
      }
    }
    return {status:state,checks,unresolved};
  }

  function consumableChecks(context, operations) {
    const reserves = context.consumableReserves || {};
    const units = context.consumableUnits || {};
    const checks = [];
    let state = STATUS.PASS;
    const unresolved = [];
    const resources = unique(operations.flatMap((op)=>Object.keys(op.consumableDemand||{})));
    for (const resource of resources) {
      if (!finiteNN(reserves[resource])) {
        state = worse(state,STATUS.UNRESOLVED);
        unresolved.push('AOS-CONSUMABLE-RESERVE-MISSING:'+resource);
        continue;
      }
      const used = operations.reduce((sum,op)=>sum+(finiteNN(op.consumableDemand?.[resource])?Number(op.consumableDemand[resource]):0),0);
      const status = used <= Number(reserves[resource]) ? STATUS.PASS : STATUS.BLOCK;
      state = worse(state,status);
      checks.push({resource,unit:units[resource]||null,reserve:Number(reserves[resource]),required:used,remaining:Number(reserves[resource])-used,status,reason:status===STATUS.PASS?'CONSUMABLE_RESERVE_SUFFICIENT':'AOS-ENERGY-RESERVE'});
    }
    return {status:state,checks,unresolved};
  }

  function resolveFTLAbortOperationSchedule(context) {
    context = context || {};
    const provenance = unique(['blacklight.ftl.abort-operation-scheduling@1.0.0',...(context.provenance||[])]);
    const operations = normalizeOperations(context);
    if (!operations.length) return {
      schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,family:context.family||null,makespanUpperSeconds:null,
      operations:[],resourceChecks:[],criticalOperationIds:[],unresolvedRequirements:['ABORT_OPERATIONS_REQUIRED'],
      warnings:['No abort operation graph was supplied.'],simulationOnly:context.simulationOnly===true,provenance
    };

    const ids = operations.map((op)=>op.id);
    if (new Set(ids).size !== ids.length) return {
      schemaVersion:'1.0.0',status:STATUS.CONFLICT,family:context.family||null,makespanUpperSeconds:null,
      operations,resourceChecks:[],criticalOperationIds:[],unresolvedRequirements:['DUPLICATE_OPERATION_ID'],
      warnings:['Abort operation ids must be unique.'],simulationOnly:context.simulationOnly===true,provenance
    };

    const serialErrors = applySerialization(operations,context.serializationRules||context.resourceSerialization||[]);
    if (serialErrors.length) return {
      schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,family:context.family||null,makespanUpperSeconds:null,
      operations,resourceChecks:[],criticalOperationIds:[],unresolvedRequirements:serialErrors,
      warnings:['Serialization authority references an unknown operation.'],simulationOnly:context.simulationOnly===true,provenance
    };

    const schedule = topologicalSchedule(operations);
    if (schedule.status !== STATUS.PASS) return {
      schemaVersion:'1.0.0',status:schedule.status,family:context.family||null,makespanUpperSeconds:null,
      operations,resourceChecks:[],criticalOperationIds:[],unresolvedRequirements:[schedule.reason,...(schedule.missing||[])],
      warnings:[schedule.reason === 'AOS-CYCLE' ? 'Abort dependency/serialization graph is cyclic.' : 'Abort schedule evidence is incomplete.'],
      simulationOnly:context.simulationOnly===true,provenance
    };

    const renewable = renewableChecks(context,schedule,operations);
    const consumable = consumableChecks(context,operations);
    let status = worse(STATUS.PASS,renewable.status);
    status = worse(status,consumable.status);
    if (context.simulationOnly===true && ![STATUS.BLOCK,STATUS.CONFLICT,STATUS.UNRESOLVED].includes(status)) status=STATUS.SIMULATION_ONLY;

    const scheduledOperations = operations.map((op)=>Object.assign({},op,{
      earliestStartSeconds:schedule.start.get(op.id),
      earliestFinishSeconds:schedule.finish.get(op.id)
    }));
    const unresolvedRequirements = unique([...(renewable.unresolved||[]),...(consumable.unresolved||[])]);
    const warnings = unique([
      unresolvedRequirements.length ? 'Shared-resource or reserve evidence is unresolved; the runtime will not invent an operation priority.' : null,
      renewable.checks.some((c)=>c.status===STATUS.UNRESOLVED) ? 'A legal precedence schedule exists, but its concurrency exceeds certified resource capacity without declared arbitration.' : null,
      'The schedule makespan describes machinery operation timing only; route geometry and family prediction horizons remain separate authorities.'
    ]);

    return {
      schemaVersion:'1.0.0',
      status,
      family:context.family||null,
      technologyBasis:context.technologyBasis||null,
      makespanUpperSeconds:schedule.makespan,
      operations:scheduledOperations,
      resourceChecks:[...renewable.checks,...consumable.checks],
      criticalOperationIds:schedule.critical,
      unresolvedRequirements,
      warnings,
      simulationOnly:context.simulationOnly===true,
      provenance
    };
  }

  return {STATUS,normalizeOperations,topologicalSchedule,resolveFTLAbortOperationSchedule,registry:registry||null};
}));