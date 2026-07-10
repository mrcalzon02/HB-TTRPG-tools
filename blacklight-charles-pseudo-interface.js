(() => {
  'use strict';

  const transcript = document.getElementById('charles-transcript');
  const input = document.getElementById('charles-command');
  const status = document.getElementById('charles-status-line');
  const sendButton = document.getElementById('charles-send');
  let activeTimer = null;
  let requestSequence = 0;

  if (!transcript || !input || !status || !sendButton) return;

  const routes = [
    {
      id: 'emergency', label: 'emergency and life-safety', priority: 100,
      keywords: ['emergency', 'fire', 'smoke', 'evacuate', 'evacuation', 'injury', 'active threat', 'panic', 'hazard', 'dispatch', 'life safety'],
      responses: [
        'I would place life safety first, present the approved emergency procedure, identify the human incident commander, and keep every nonessential workflow out of the way until the event is stabilized.',
        'This routes to the emergency surface. I can summarize the verified procedure, identify the responsible response team, and record the handoff, but I would not improvise dangerous instructions or assume command authority.',
        'I would issue a concise acknowledgement, surface the site-specific emergency checklist, preserve communications continuity, and require confirmation from the assigned human authority before any controlled-system action.'
      ]
    },
    {
      id: 'security', label: 'security and access control', priority: 90,
      keywords: ['security', 'alarm', 'locked door', 'door', 'lock', 'unlock', 'badge', 'access', 'intrusion', 'visitor pass', 'restricted', 'camera', 'guard'],
      responses: [
        'I can summarize the reported condition, separate observation from control authority, open a security handoff, and preserve the event record without unlocking doors or bypassing access policy.',
        'That request belongs in the security queue. I would verify the operator role, identify the affected location, prepare the approved checklist, and route any physical access decision to the assigned security owner.',
        'I would treat the alarm and access report as one incident record, mark what is known versus unconfirmed, and send the responsible team a concise handoff without exposing restricted controls.'
      ]
    },
    {
      id: 'medical', label: 'medical administration and intake', priority: 85,
      keywords: ['medical', 'patient', 'clinic', 'hospital', 'health', 'intake', 'care team', 'medication', 'appointment', 'medical records'],
      responses: [
        'I would create a role-scoped intake route, restrict the answer to approved administrative material, separate clinical decisions from clerical workflow, and escalate unresolved care questions to qualified staff.',
        'For medical administration, I would verify the operator role, minimize displayed patient information, prepare the correct intake or records checklist, and route any diagnostic or treatment question to a licensed human owner.',
        'I can organize the intake sequence, identify required forms and privacy boundaries, and prepare a handoff for the appropriate department without making a clinical judgment.'
      ]
    },
    {
      id: 'legal', label: 'legal and courthouse administration', priority: 82,
      keywords: ['legal', 'court', 'courthouse', 'contract', 'subpoena', 'privilege', 'attorney', 'counsel', 'filing', 'case file'],
      responses: [
        'I would retrieve only the approved procedural material, preserve privilege boundaries, identify the responsible legal owner, and avoid presenting a generated interpretation as legal advice.',
        'This belongs to the legal-administration route. I can organize the filing or contract workflow, identify required approvals, and log the source material while reserving legal judgment for counsel.',
        'I would separate public procedure from privileged material, provide the operator with the authorized checklist, and route any interpretation or commitment to the assigned attorney or contract owner.'
      ]
    },
    {
      id: 'audit', label: 'audit and compliance review', priority: 78,
      keywords: ['audit', 'compliance', 'complaint', 'review', 'investigation', 'retention', 'incident replay', 'accountability', 'regulator'],
      responses: [
        'The audit officer would receive the prompt, displayed answer, matched rule route, source references, handoff path, and any refusal or escalation reason needed for later review.',
        'I would preserve the event as a reviewable record, distinguish verified facts from operator claims, identify the policy basis used, and route unresolved compliance questions to the designated human owner.',
        'For audit review, I would produce a concise timeline, the applicable policy route, the actions Charles did and did not take, and the department responsible for final disposition.'
      ]
    },
    {
      id: 'privacy', label: 'privacy and confidential-data handling', priority: 76,
      keywords: ['privacy', 'confidential', 'secret', 'redact', 'personal data', 'sensitive data', 'private', 'disclosure', 'data leak'],
      responses: [
        'I would minimize the information shown, apply the approved redaction rule, verify the operator role, and route any disclosure decision to the responsible privacy or legal owner.',
        'That request crosses a confidentiality boundary. I can identify the governing procedure and prepare a secure handoff, but I would not expose protected material merely because it was requested conversationally.',
        'I would separate the operational need from the sensitive content, reveal only the minimum authorized information, and log the access path for later review.'
      ]
    },
    {
      id: 'continuity', label: 'power, network, and continuity operations', priority: 72,
      keywords: ['low power', 'power', 'ups', 'outage', 'offline', 'remote', 'degraded', 'network down', 'continuity', 'generator', 'bandwidth'],
      responses: [
        'For a constrained site I would reduce context depth, prioritize cached policy packets, suspend nonessential summarization, and preserve emergency and continuity procedures before convenience features.',
        'I would move the deployment into a degraded local mode, identify which indexes remain available, preserve audit logging, and clearly mark any function that depends on unavailable power or network services.',
        'The continuity route favors short answers, cached documents, read-only status, and human handoff queues until normal power and connectivity are restored.'
      ]
    },
    {
      id: 'maintenance', label: 'facility maintenance and service routing', priority: 68,
      keywords: ['maintenance', 'repair', 'hvac', 'elevator', 'plumbing', 'water leak', 'temperature', 'equipment', 'work order', 'service ticket', 'facility'],
      responses: [
        'I would capture the location, observed condition, operational impact, and immediate safety concern, then prepare a maintenance ticket without directly operating the affected equipment.',
        'This routes to facilities. I can distinguish urgent hazards from ordinary service work, assemble the relevant checklist, and send a complete handoff to the responsible maintenance owner.',
        'I would consolidate the report into one work order, attach the approved troubleshooting boundary, and require human confirmation before any action that changes building systems.'
      ]
    },
    {
      id: 'hr', label: 'human resources and workplace support', priority: 64,
      keywords: ['human resources', 'hr', 'employee', 'payroll', 'manager', 'workplace', 'leave', 'harassment', 'schedule', 'benefits', 'timesheet'],
      responses: [
        'I would route the matter through the appropriate HR or payroll channel, limit visibility to the people assigned to the case, and preserve a clear escalation path if the immediate manager is part of the concern.',
        'For workplace support, I can identify the correct form, deadline, and department owner, but I would avoid making a disciplinary or employment decision on behalf of management.',
        'I would separate routine administration from a confidential complaint, provide the approved reporting route, and record only the information required for the assigned human reviewer.'
      ]
    },
    {
      id: 'records', label: 'records, documents, and policy lookup', priority: 60,
      keywords: ['record', 'records', 'document', 'policy', 'manual', 'procedure', 'sop', 'archive', 'file', 'form', 'version'],
      responses: [
        'I would search the approved document set, prefer the current controlled version, identify its owner and effective date, and clearly state when the available material does not answer the question.',
        'This is a document-vault request. I can locate the relevant procedure, summarize the authorized portion, and provide the source path without inventing missing policy.',
        'I would compare the available versions, surface the currently approved record, and route conflicts or expired instructions to the document owner for resolution.'
      ]
    },
    {
      id: 'visitor', label: 'visitor, reception, and delivery intake', priority: 56,
      keywords: ['visitor', 'reception', 'guest', 'delivery', 'courier', 'appointment arrival', 'front desk', 'lobby'],
      responses: [
        'I would verify the visit purpose, identify the sponsoring department, apply the approved badge or waiting-area procedure, and route exceptions to a human receptionist or security owner.',
        'For reception intake, I can organize the arrival record, notify the responsible host, and preserve privacy by displaying only the information needed at the front desk.',
        'I would separate ordinary deliveries from controlled materials, confirm the receiving location, and escalate anything unrecognized rather than improvising access.'
      ]
    },
    {
      id: 'deployment', label: 'deployment and systems integration', priority: 52,
      keywords: ['deploy', 'deployment', 'integration', 'server', 'database', 'model', 'voice', 'interface', 'configuration', 'install', 'system'],
      responses: [
        'I would begin with the operating boundary: approved users, local data sources, prohibited actions, power limits, audit requirements, and the human owners responsible for each connected workflow.',
        'A deployment plan should separate voice, document retrieval, workflow routing, facility telemetry, identity, continuity, and audit services so each layer can be enabled or removed without granting unnecessary authority.',
        'I would inventory the client environment, define the local-only default, test every connector in read-only mode first, and require explicit approval before any write-capable integration is introduced.'
      ]
    },
    {
      id: 'greeting', label: 'general orientation', priority: 20,
      keywords: ['hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what can you do'],
      responses: [
        'Good afternoon. Give me a facility condition, policy question, intake need, or continuity problem. I will show you how I would frame the work, identify its owner, and preserve the boundary between assistance and authority.',
        'I am Charles. This public evaluation channel can demonstrate controlled workflow language, source discipline, human escalation, and read-only operating defaults.',
        'State the work that needs to move. I will identify the likely route, the governing boundary, and the person or department that must remain responsible for the result.'
      ]
    }
  ];

  const fallbackResponses = [
    'I do not yet have enough operational context. Identify the facility, department, desired outcome, and responsible human owner, and I will frame a controlled handoff.',
    'That request does not resolve to a defined evaluation route. I can still structure it as a read-only summary, checklist, or accountable human escalation.',
    'I need a clearer operating category before proceeding. The safe default is to preserve the request, avoid restricted action, and route it to a named human owner.'
  ];

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9\s'-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function keywordScore(prompt, route) {
    let score = 0;
    for (const keyword of route.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (!normalizedKeyword || !prompt.includes(normalizedKeyword)) continue;
      score += 10 + Math.min(normalizedKeyword.length, 24);
    }
    return score;
  }

  function stableIndex(value, length) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0) % length;
  }

  function selectRoute(rawPrompt) {
    const prompt = normalize(rawPrompt);
    let selected = null;
    for (const route of routes) {
      const score = keywordScore(prompt, route);
      if (!score) continue;
      if (!selected || score > selected.score || (score === selected.score && route.priority > selected.route.priority)) {
        selected = { route, score };
      }
    }
    if (!selected) {
      return { id: 'fallback', label: 'general controlled handoff', response: fallbackResponses[stableIndex(prompt, fallbackResponses.length)] };
    }
    return {
      id: selected.route.id,
      label: selected.route.label,
      response: selected.route.responses[stableIndex(`${prompt}|${selected.route.id}`, selected.route.responses.length)]
    };
  }

  function makeLine(speaker, text) {
    const node = document.createElement('div');
    node.className = 'charles-line';
    const label = document.createElement('b');
    label.textContent = speaker;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    node.append(label, paragraph);
    return node;
  }

  function renderCurrentExchange(prompt, response) {
    transcript.replaceChildren(makeLine('Operator', prompt), makeLine('Charles', response));
    transcript.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function respond(value) {
    const prompt = String(value || input.value || '').trim();
    if (!prompt) return;

    requestSequence += 1;
    const requestId = requestSequence;
    if (activeTimer !== null) window.clearTimeout(activeTimer);
    input.value = '';
    sendButton.disabled = true;
    status.textContent = 'Classifying request against approved evaluation workflows.';
    renderCurrentExchange(prompt, 'One moment. I am checking the approved public evaluation routes and their assigned human owners.');

    activeTimer = window.setTimeout(() => {
      if (requestId !== requestSequence) return;
      const result = selectRoute(prompt);
      renderCurrentExchange(prompt, result.response);
      status.textContent = `Ready. ${result.label} route selected.`;
      sendButton.disabled = false;
      activeTimer = null;
      window.HBAnalytics?.track('charles_evaluation_route', { routeId: result.id });
    }, 420);
  }

  sendButton.addEventListener('click', () => respond());
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    respond();
  });
  document.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => respond(button.dataset.prompt));
  });

  window.BlacklightCharlesPseudoInterface = Object.freeze({ respond, selectRoute });
})();

(() => {
  'use strict';

  if (window.HBAnalytics || document.querySelector('script[src$="site-analytics.js"]')) return;
  document.body.dataset.analyticsWorkspace ||= 'blacklight-charles-interface';
  document.body.dataset.analyticsPageType ||= 'blacklight-page';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.body.appendChild(script);
    });
  }

  void loadScript('site-analytics-config.js')
    .then(() => loadScript('site-analytics.js'))
    .catch(() => {
      // Analytics must never interrupt the Charles evaluation surface.
    });
})();
