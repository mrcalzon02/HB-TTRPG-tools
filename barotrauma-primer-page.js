(() => {
  const root = document.getElementById('primer-root');

  const wikiEntryFiles = [
    'data/barotrauma/wiki/entries/001-foreword.md',
    'data/barotrauma/wiki/entries/002-regard-every-control-as-loaded.md',
    'data/barotrauma/wiki/entries/003-report-aboard-ready-to-learn.md',
    'data/barotrauma/wiki/entries/004-the-general-crewman.md',
    'data/barotrauma/wiki/entries/005-you-are-not-the-leftover-role.md',
    'data/barotrauma/wiki/entries/006-the-assistants-true-specialty.md',
    'data/barotrauma/wiki/entries/007-you-are-not-useless.md',
    'data/barotrauma/wiki/entries/008-the-multiplier-of-people-who-already-look-busy.md',
    'data/barotrauma/wiki/entries/009-the-sacred-duty-of-fetching-things.md',
    'data/barotrauma/wiki/entries/010-learn-the-boat-before-the-boat-learns-you.md',
    'data/barotrauma/wiki/entries/011-the-assistants-universal-response-kit.md',
    'data/barotrauma/wiki/entries/012-ask-what-needs-doing.md',
    'data/barotrauma/wiki/entries/013-do-not-help-so-hard-that-you-become-the-problem.md',
    'data/barotrauma/wiki/entries/014-shadowing-specialists-without-becoming-their-shadow.md',
    'data/barotrauma/wiki/entries/015-becoming-dangerously-competent.md',
    'data/barotrauma/wiki/entries/016-assistants-during-flooding.md',
    'data/barotrauma/wiki/entries/017-assistants-during-combat.md',
    'data/barotrauma/wiki/entries/018-assistants-in-medical.md',
    'data/barotrauma/wiki/entries/019-assistants-in-engineering.md',
    'data/barotrauma/wiki/entries/020-assistants-on-away-missions.md',
    'data/barotrauma/wiki/entries/021-the-assistant-and-the-clown-question.md',
    'data/barotrauma/wiki/entries/022-when-all-specialist-roles-are-taken.md',
    'data/barotrauma/wiki/entries/023-finding-your-future-specialty.md',
    'data/barotrauma/wiki/entries/024-the-veteran-assistant.md',
    'data/barotrauma/wiki/entries/025-the-assistants-private-superpower.md',
    'data/barotrauma/wiki/entries/026-final-rule-of-the-general-crewman.md',
    'data/barotrauma/wiki/entries/027-the-carrying-of-arms.md',
    'data/barotrauma/wiki/entries/028-lines-of-fire.md',
    'data/barotrauma/wiki/entries/029-the-crouching-fallacy.md',
    'data/barotrauma/wiki/entries/030-elevated-and-offset-targets.md',
    'data/barotrauma/wiki/entries/031-reposition-before-firing.md',
    'data/barotrauma/wiki/entries/032-crossing-a-firing-line.md',
    'data/barotrauma/wiki/entries/033-boarding-actions-and-assaults.md',
    'data/barotrauma/wiki/entries/034-hostile-boarders-aboard-your-own-vessel.md',
    'data/barotrauma/wiki/entries/035-automatic-fire-and-shotguns.md',
    'data/barotrauma/wiki/entries/036-harpoons-spearguns-and-heavy-weapons.md',
    'data/barotrauma/wiki/entries/037-fire-discipline.md',
    'data/barotrauma/wiki/entries/038-final-rule-of-the-firing-line.md',
    'data/barotrauma/wiki/entries/039-communication-aboard-ship.md',
    'data/barotrauma/wiki/entries/040-the-medical-officers-charge.md',
    'data/barotrauma/wiki/entries/041-the-purpose-of-medical-treatment.md',
    'data/barotrauma/wiki/entries/042-common-conditions-of-the-submariners-trade.md',
    'data/barotrauma/wiki/entries/043-gunshot-wounds.md',
    'data/barotrauma/wiki/entries/044-blood-loss.md',
    'data/barotrauma/wiki/entries/045-blunt-force-trauma.md',
    'data/barotrauma/wiki/entries/046-burns.md',
    'data/barotrauma/wiki/entries/047-oxygen-deprivation.md',
    'data/barotrauma/wiki/entries/048-pressure-and-diving-injuries.md',
    'data/barotrauma/wiki/entries/049-poisoning.md',
    'data/barotrauma/wiki/entries/050-infection-and-parasites.md',
    'data/barotrauma/wiki/entries/051-radiation-and-environmental-exposure.md',
    'data/barotrauma/wiki/entries/052-pain-shock-and-psychological-effects.md',
    'data/barotrauma/wiki/entries/053-i-hurt-is-a-symptom-not-a-diagnosis.md',
    'data/barotrauma/wiki/entries/054-narcotics-and-controlled-medication.md',
    'data/barotrauma/wiki/entries/055-overdose-is-not-an-experiment.md',
    'data/barotrauma/wiki/entries/056-poisons-venoms-and-their-antidotes.md',
    'data/barotrauma/wiki/entries/057-triage-during-mass-casualty-events.md',
    'data/barotrauma/wiki/entries/058-preparing-away-teams.md',
    'data/barotrauma/wiki/entries/059-medical-readiness-aboard-the-vessel.md',
    'data/barotrauma/wiki/entries/060-the-medical-officer-is-not-exempt-from-accountability.md',
    'data/barotrauma/wiki/entries/061-final-duty-of-the-medical-officer.md',
    'data/barotrauma/wiki/entries/062-going-ashore.md',
    'data/barotrauma/wiki/entries/063-port-is-not-wasted-time.md',
    'data/barotrauma/wiki/entries/064-the-logistical-conference.md',
    'data/barotrauma/wiki/entries/065-departmental-inventories.md',
    'data/barotrauma/wiki/entries/066-security-and-gunnery-reports.md',
    'data/barotrauma/wiki/entries/067-medical-reports.md',
    'data/barotrauma/wiki/entries/068-engineering-and-mechanical-reports.md',
    'data/barotrauma/wiki/entries/069-personal-purchases-and-shipboard-readiness.md',
    'data/barotrauma/wiki/entries/070-remain-available-for-recall.md',
    'data/barotrauma/wiki/entries/071-the-extended-voyage.md',
    'data/barotrauma/wiki/entries/072-how-to-contribute-productively-in-port.md',
    'data/barotrauma/wiki/entries/073-final-rule-of-shore-leave.md',
    'data/barotrauma/wiki/entries/074-keep-the-decks-clear.md',
    'data/barotrauma/wiki/entries/075-professional-conduct.md',
    'data/barotrauma/wiki/entries/076-departmental-responsibility.md',
    'data/barotrauma/wiki/entries/077-when-everything-goes-wrong.md',
    'data/barotrauma/wiki/entries/078-away-missions.md',
    'data/barotrauma/wiki/entries/079-the-purpose-of-an-away-mission.md',
    'data/barotrauma/wiki/entries/080-resource-spotting-during-transit.md',
    'data/barotrauma/wiki/entries/081-the-cost-of-stopping.md',
    'data/barotrauma/wiki/entries/082-equipping-the-away-team.md',
    'data/barotrauma/wiki/entries/083-team-organization.md',
    'data/barotrauma/wiki/entries/084-maintaining-a-watch.md',
    'data/barotrauma/wiki/entries/085-biological-and-chemical-hazards.md',
    'data/barotrauma/wiki/entries/086-ballast-flora-and-related-growths.md',
    'data/barotrauma/wiki/entries/087-mining-operations.md',
    'data/barotrauma/wiki/entries/088-wreck-and-salvage-operations.md',
    'data/barotrauma/wiki/entries/089-hostile-personnel-and-boarding-operations.md',
    'data/barotrauma/wiki/entries/090-alien-ruins.md',
    'data/barotrauma/wiki/entries/091-artifact-handling.md',
    'data/barotrauma/wiki/entries/092-communication-outside-the-submarine.md',
    'data/barotrauma/wiki/entries/093-oxygen-distance-and-the-return-journey.md',
    'data/barotrauma/wiki/entries/094-casualty-recovery.md',
    'data/barotrauma/wiki/entries/095-aborting-the-mission.md',
    'data/barotrauma/wiki/entries/096-returning-aboard.md',
    'data/barotrauma/wiki/entries/097-final-rule-of-the-away-team.md',
    'data/barotrauma/wiki/entries/098-the-oxygen-generator.md',
    'data/barotrauma/wiki/entries/099-the-submarines-acoustic-beacon.md',
    'data/barotrauma/wiki/entries/100-why-oxygen-production-is-so-noticeable.md',
    'data/barotrauma/wiki/entries/101-silent-running.md',
    'data/barotrauma/wiki/entries/102-the-no-oxygen-alarm.md',
    'data/barotrauma/wiki/entries/103-acoustic-noise-and-sonar-detection.md',
    'data/barotrauma/wiki/entries/104-when-to-depower-the-generator.md',
    'data/barotrauma/wiki/entries/105-when-not-to-depower-it.md',
    'data/barotrauma/wiki/entries/106-the-captains-oxygen-clock.md',
    'data/barotrauma/wiki/entries/107-crew-conduct-during-oxygen-conservation.md',
    'data/barotrauma/wiki/entries/108-engineering-responsibilities.md',
    'data/barotrauma/wiki/entries/109-medical-responsibilities.md',
    'data/barotrauma/wiki/entries/110-the-limits-of-silence.md',
    'data/barotrauma/wiki/entries/111-final-rule-of-oxygen-silence.md',
    'data/barotrauma/wiki/entries/112-the-captains-charge.md',
    'data/barotrauma/wiki/entries/113-i-the-fundamental-responsibility-of-command.md',
    'data/barotrauma/wiki/entries/114-ii-know-your-department-heads.md',
    'data/barotrauma/wiki/entries/115-iii-keep-a-roster-or-begin-collecting-ghosts.md',
    'data/barotrauma/wiki/entries/116-iv-know-who-is-outside-the-hull.md',
    'data/barotrauma/wiki/entries/117-v-forward-momentum.md',
    'data/barotrauma/wiki/entries/118-vi-navigation.md',
    'data/barotrauma/wiki/entries/119-vii-the-legend-of-the-blind-captain.md',
    'data/barotrauma/wiki/entries/120-viii-sonar-discipline.md',
    'data/barotrauma/wiki/entries/121-ix-hazard-avoidance.md',
    'data/barotrauma/wiki/entries/122-x-speed-and-the-science-of-arriving-in-one-piece.md',
    'data/barotrauma/wiki/entries/123-xi-reactor-and-fuel-awareness.md',
    'data/barotrauma/wiki/entries/124-xii-supplies-and-the-captains-broadly-informed-anxiety.md',
    'data/barotrauma/wiki/entries/125-xiii-mission-selection.md',
    'data/barotrauma/wiki/entries/126-xiv-communication-from-the-helm.md',
    'data/barotrauma/wiki/entries/127-xv-morale-and-the-maintenance-of-a-crew-that-does-not-hate-you.md',
    'data/barotrauma/wiki/entries/128-xvi-crew-discipline.md',
    'data/barotrauma/wiki/entries/129-xvii-standard-union-208.md',
    'data/barotrauma/wiki/entries/130-xviii-pay-and-compensation.md',
    'data/barotrauma/wiki/entries/131-xix-mid-mission-pay-disputes.md',
    'data/barotrauma/wiki/entries/132-xx-recruitment.md',
    'data/barotrauma/wiki/entries/133-xxi-justice-aboard-ship.md',
    'data/barotrauma/wiki/entries/134-xxii-mutiny.md',
    'data/barotrauma/wiki/entries/135-xxiii-command-succession.md',
    'data/barotrauma/wiki/entries/136-xxiv-the-captain-and-the-helm.md',
    'data/barotrauma/wiki/entries/137-xxv-the-captain-during-a-crisis.md',
    'data/barotrauma/wiki/entries/138-xxvi-when-to-retreat.md',
    'data/barotrauma/wiki/entries/139-final-duty-of-the-captain.md',
    'data/barotrauma/wiki/entries/140-conclusion.md',
    'data/barotrauma/wiki/entries/141-appendix-standard-union-208.md',
    'data/barotrauma/wiki/entries/142-foreword-2.md',
    'data/barotrauma/wiki/entries/143-i-what-standard-union-208-is.md',
    'data/barotrauma/wiki/entries/144-ii-the-conditions-that-created-the-union.md',
    'data/barotrauma/wiki/entries/145-iii-the-crampton-refusal.md',
    'data/barotrauma/wiki/entries/146-iv-the-first-charter.md',
    'data/barotrauma/wiki/entries/147-v-trials-suppression-and-the-blacklist-years.md',
    'data/barotrauma/wiki/entries/148-vi-the-union-mutual-aid-network.md',
    'data/barotrauma/wiki/entries/149-vii-the-saville-sacrifice.md',
    'data/barotrauma/wiki/entries/150-viii-the-saville-clause.md',
    'data/barotrauma/wiki/entries/151-ix-why-cartels-recognize-union-208.md',
    'data/barotrauma/wiki/entries/152-x-standard-employment-contract-law.md',
    'data/barotrauma/wiki/entries/153-xi-the-right-to-clear-terms.md',
    'data/barotrauma/wiki/entries/154-xii-the-right-to-fair-compensation.md',
    'data/barotrauma/wiki/entries/155-xiii-hazard-pay.md',
    'data/barotrauma/wiki/entries/156-xiv-the-right-to-necessary-equipment.md',
    'data/barotrauma/wiki/entries/157-xv-the-right-to-food-water-air-and-habitable-conditions.md',
    'data/barotrauma/wiki/entries/158-xvi-the-right-to-medical-care.md',
    'data/barotrauma/wiki/entries/159-xvii-the-right-to-refuse-manifestly-suicidal-orders.md',
    'data/barotrauma/wiki/entries/160-xviii-the-right-of-return.md',
    'data/barotrauma/wiki/entries/161-xix-the-right-to-rescue.md',
    'data/barotrauma/wiki/entries/162-xx-the-right-to-shore-leave-and-rest.md',
    'data/barotrauma/wiki/entries/163-xxi-the-right-to-representation.md',
    'data/barotrauma/wiki/entries/164-xxii-the-right-to-grievance.md',
    'data/barotrauma/wiki/entries/165-xxiii-discipline-and-due-process.md',
    'data/barotrauma/wiki/entries/166-xxiv-mutiny-work-stoppage-and-collective-refusal.md',
    'data/barotrauma/wiki/entries/167-xxv-salvage-rights.md',
    'data/barotrauma/wiki/entries/168-xxvi-injury-disability-and-death-benefits.md',
    'data/barotrauma/wiki/entries/169-xxvii-debt-and-forced-labor.md',
    'data/barotrauma/wiki/entries/170-xxviii-contract-extension.md',
    'data/barotrauma/wiki/entries/171-xxix-captains-rights-under-union-208.md',
    'data/barotrauma/wiki/entries/172-xxx-crew-obligations.md',
    'data/barotrauma/wiki/entries/173-xxxi-union-arbitration.md',
    'data/barotrauma/wiki/entries/174-xxxii-the-red-registry.md',
    'data/barotrauma/wiki/entries/175-xxxiii-logistical-sanctions.md',
    'data/barotrauma/wiki/entries/176-xxxiv-stations-and-the-consequences-of-isolation.md',
    'data/barotrauma/wiki/entries/177-xxxv-humanitarian-neutrality.md',
    'data/barotrauma/wiki/entries/178-xxxvi-the-saville-observance.md',
    'data/barotrauma/wiki/entries/179-xxxvii-union-halls.md',
    'data/barotrauma/wiki/entries/180-xxxviii-training-and-certification.md',
    'data/barotrauma/wiki/entries/181-xxxix-union-relations-with-governments.md',
    'data/barotrauma/wiki/entries/182-xl-union-relations-with-criminal-organizations.md',
    'data/barotrauma/wiki/entries/183-xli-the-black-ice-provision.md',
    'data/barotrauma/wiki/entries/184-xlii-the-rule-of-practical-fairness.md',
    'data/barotrauma/wiki/entries/185-xliii-advice-to-captains.md',
    'data/barotrauma/wiki/entries/186-xliv-advice-to-crew-members.md',
    'data/barotrauma/wiki/entries/187-xlv-the-union-and-the-dead.md',
    'data/barotrauma/wiki/entries/188-xlvi-the-union-motto.md',
    'data/barotrauma/wiki/entries/189-xlvii-final-declaration.md',
    'data/barotrauma/wiki/entries/190-the-mariners-pledge.md',
    'data/barotrauma/wiki/entries/191-extended-footnote-concerning-cults-clowns-parasites-and-other-consequences-of-prolonged-human-isolation.md',
    'data/barotrauma/wiki/entries/192-the-children-of-the-honkmother.md',
    'data/barotrauma/wiki/entries/193-the-church-of-the-husk.md',
    'data/barotrauma/wiki/entries/194-why-these-movements-exist.md',
    'data/barotrauma/wiki/entries/195-the-jovian-separatists.md',
    'data/barotrauma/wiki/entries/196-the-submariner-between-factions.md',
    'data/barotrauma/wiki/entries/197-a-note-to-assistants.md',
    'data/barotrauma/wiki/entries/198-final-caution.md'
  ];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const slugify = value => value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'entry';

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  }

  function parseEntry(documentText, file, usedIds) {
    const lines = documentText.replace(/\r\n?/g, '\n').split('\n');
    let title = '';
    const blocks = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        if (title) throw new Error(`${file} contains more than one wiki entry.`);
        title = heading[1].trim();
        continue;
      }
      if (!title || !line.trim()) continue;
      if (/^[-*]\s+/.test(line)) blocks.push({ type: 'listItem', text: line.replace(/^[-*]\s+/, '').trim() });
      else blocks.push({ type: 'paragraph', text: line.trim() });
    }

    if (!title) throw new Error(`${file} does not contain a wiki-entry title.`);

    const baseId = slugify(title);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return { id, title, blocks };
  }

  async function loadEntries() {
    root.innerHTML = '<div class="primer-loading">Loading 198 attached wiki entries…</div>';
    const documents = await Promise.all(wikiEntryFiles.map(fetchText));
    const usedIds = new Set();
    return documents.map((documentText, index) => parseEntry(documentText, wikiEntryFiles[index], usedIds));
  }

  function entryText(entry) {
    return [entry.title, ...entry.blocks.map(block => block.text || '')].join(' ').toLowerCase();
  }

  function appendBlocks(target, blocks) {
    let activeList = null;
    for (const block of blocks) {
      if (block.type === 'listItem') {
        if (!activeList) {
          activeList = document.createElement('ul');
          target.appendChild(activeList);
        }
        const item = document.createElement('li');
        item.textContent = block.text;
        activeList.appendChild(item);
      } else {
        activeList = null;
        const paragraph = document.createElement('p');
        paragraph.textContent = block.text;
        target.appendChild(paragraph);
      }
    }
  }

  function renderWiki(entries) {
    const total = entries.length;
    let activeId = window.location.hash.replace(/^#/, '') || entries[0].id;
    root.innerHTML = `<div class="primer-controls"><input id="primer-search" type="search" placeholder="Search attached wiki entries…" aria-label="Search Primer wiki"><span id="primer-status" class="primer-status">${total} attached entries</span></div><div class="primer-layout"><nav id="primer-nav" class="primer-nav" aria-label="Primer entries"></nav><article id="primer-article" class="primer-article"></article></div>`;

    const nav = document.getElementById('primer-nav');
    const article = document.getElementById('primer-article');
    const search = document.getElementById('primer-search');
    const status = document.getElementById('primer-status');

    function openEntry(id, updateHash = true) {
      const entry = entries.find(item => item.id === id) || entries[0];
      activeId = entry.id;
      nav.querySelectorAll('a').forEach(link => link.classList.toggle('active', link.dataset.entryId === activeId));
      const position = entries.indexOf(entry) + 1;
      article.innerHTML = `<div class="primer-meta">Wiki entry ${position} of ${total}</div><h2>${escapeHtml(entry.title)}</h2>`;
      appendBlocks(article, entry.blocks);
      if (updateHash) history.replaceState(null, '', `#${entry.id}`);
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = `${matches.length} of ${total} attached entries`;
      nav.innerHTML = '';
      for (const entry of matches) {
        const link = document.createElement('a');
        link.href = `#${entry.id}`;
        link.dataset.entryId = entry.id;
        link.className = `secondary-action${entry.id === activeId ? ' active' : ''}`;
        link.innerHTML = `<strong>${String(entries.indexOf(entry) + 1).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong>`;
        link.addEventListener('click', event => { event.preventDefault(); openEntry(entry.id); });
        nav.appendChild(link);
      }
      if (!matches.length) nav.innerHTML = '<div class="primer-error">No attached entries match this search.</div>';
      else if (!matches.some(entry => entry.id === activeId)) openEntry(matches[0].id);
    }

    search.addEventListener('input', renderList);
    window.addEventListener('hashchange', () => openEntry(window.location.hash.replace(/^#/, ''), false));
    renderList();
    openEntry(activeId, false);
  }

  async function start() {
    try {
      const entries = await loadEntries();
      if (entries.length !== 198) throw new Error(`Expected 198 wiki entries but loaded ${entries.length}.`);
      renderWiki(entries);
    } catch (error) {
      root.innerHTML = `<div class="primer-error"><strong>The Crewman's Primer could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
