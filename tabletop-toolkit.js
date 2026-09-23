(() => {
  'use strict';

  const VERSION = '1.0.0';
  const STORAGE_KEY = 'hb-ttrpg-tabletop-toolkit-v1';
  const HISTORY_LIMIT = 60;
  const state = loadState();
  let uidCounter = 0;
  let dragContext = null;
  let timerInterval = null;

  function freshState() {
    return {
      diceHistory: [],
      initiative: { round: 1, index: 0, entries: [] },
      roster: [],
      counters: [],
      clocks: [],
      random: { tableText: '', bagText: '', bagRemaining: [] },
      deck: { remaining: [], discard: [] },
      timer: { totalSec: 300, remainingSec: 300, running: false, endAt: null },
      notes: ''
    };
  }

  function loadState() {
    const fallback = freshState();
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const merged = Object.assign(fallback, parsed);
      merged.initiative = Object.assign({ round: 1, index: 0, entries: [] }, parsed.initiative || {});
      merged.random = Object.assign({ tableText: '', bagText: '', bagRemaining: [] }, parsed.random || {});
      merged.deck = Object.assign({ remaining: [], discard: [] }, parsed.deck || {});
      merged.timer = Object.assign({ totalSec: 300, remainingSec: 300, running: false, endAt: null }, parsed.timer || {});
      merged.timer.running = false;
      merged.timer.endAt = null;
      merged.roster = Array.isArray(parsed.roster) ? parsed.roster : [];
      merged.counters = Array.isArray(parsed.counters) ? parsed.counters : [];
      merged.clocks = Array.isArray(parsed.clocks) ? parsed.clocks : [];
      merged.diceHistory = Array.isArray(parsed.diceHistory) ? parsed.diceHistory.slice(0, HISTORY_LIMIT) : [];
      merged.initiative.entries = Array.isArray(merged.initiative.entries) ? merged.initiative.entries : [];
      merged.random.bagRemaining = Array.isArray(merged.random.bagRemaining) ? merged.random.bagRemaining : [];
      merged.deck.remaining = Array.isArray(merged.deck.remaining) ? merged.deck.remaining : [];
      merged.deck.discard = Array.isArray(merged.deck.discard) ? merged.deck.discard : [];
      return merged;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      setStatus('Browser storage is unavailable. The tools still work for this tab, but state cannot be autosaved.');
    }
  }

  function uid(prefix) {
    uidCounter += 1;
    return String(prefix || 'item') + '-' + Date.now().toString(36) + '-' + uidCounter.toString(36);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function randomInt(max) {
    const bounded = Math.max(1, Math.floor(max));
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      const limit = Math.floor(0x100000000 / bounded) * bounded;
      const buffer = new Uint32Array(1);
      do globalThis.crypto.getRandomValues(buffer); while (buffer[0] >= limit);
      return buffer[0] % bounded;
    }
    return Math.floor(Math.random() * bounded);
  }

  function setStatus(message) {
    const target = document.getElementById('ttk-status');
    if (target) target.textContent = message;
  }

  function parseDiceToken(rawToken) {
    let token = rawToken;
    let sign = 1;
    if (token[0] === '+') token = token.slice(1);
    else if (token[0] === '-') {
      sign = -1;
      token = token.slice(1);
    }

    if (/^\d+(?:\.\d+)?$/.test(token)) {
      return { type: 'constant', sign: sign, value: Number(token), raw: rawToken };
    }

    const fate = token.match(/^(\d*)d[fF]$/);
    if (fate) {
      const count = clampNumber(fate[1] || 1, 1, 200, 1);
      return { type: 'fate', sign: sign, count: count, raw: rawToken };
    }

    const match = token.match(/^(\d*)d(\d+)(?:(kh|kl)(\d+))?(!)?$/i);
    if (!match) throw new Error('Unsupported dice term: ' + rawToken);

    const count = clampNumber(match[1] || 1, 1, 200, 1);
    const sides = clampNumber(match[2], 2, 100000, 20);
    const keepMode = match[3] ? match[3].toLowerCase() : null;
    const keepCount = keepMode ? clampNumber(match[4], 1, count, count) : count;
    const explode = Boolean(match[5]);

    return {
      type: 'dice',
      sign: sign,
      count: count,
      sides: sides,
      keepMode: keepMode,
      keepCount: keepCount,
      explode: explode,
      raw: rawToken
    };
  }

  function rollExpression(expression) {
    const normalized = String(expression || '').replace(/\s+/g, '');
    if (!normalized) throw new Error('Enter a dice expression first.');
    const rawTerms = normalized.match(/[+-]?[^+-]+/g);
    if (!rawTerms || rawTerms.join('') !== normalized) throw new Error('Dice expression could not be parsed.');

    let total = 0;
    const details = rawTerms.map(function(rawToken) {
      const term = parseDiceToken(rawToken);

      if (term.type === 'constant') {
        total += term.sign * term.value;
        return { raw: rawToken, subtotal: term.sign * term.value, rolls: [], kept: [] };
      }

      if (term.type === 'fate') {
        const rolls = [];
        for (let i = 0; i < term.count; i += 1) rolls.push(randomInt(3) - 1);
        const subtotal = term.sign * rolls.reduce(function(sum, value) { return sum + value; }, 0);
        total += subtotal;
        return { raw: rawToken, subtotal: subtotal, rolls: rolls, kept: rolls.slice(), fate: true };
      }

      const rolls = [];
      let safety = 0;
      for (let i = 0; i < term.count; i += 1) {
        let roll = randomInt(term.sides) + 1;
        rolls.push(roll);
        if (term.explode) {
          while (roll === term.sides && safety < 500) {
            safety += 1;
            roll = randomInt(term.sides) + 1;
            rolls.push(roll);
          }
        }
      }

      let kept = rolls.slice();
      if (term.keepMode) {
        const sorted = rolls.slice().sort(function(a, b) { return a - b; });
        kept = term.keepMode === 'kh'
          ? sorted.slice(Math.max(0, sorted.length - term.keepCount))
          : sorted.slice(0, term.keepCount);
      }

      const subtotal = term.sign * kept.reduce(function(sum, value) { return sum + value; }, 0);
      total += subtotal;
      return { raw: rawToken, subtotal: subtotal, rolls: rolls, kept: kept, explode: term.explode, keepMode: term.keepMode };
    });

    return { expression: normalized, total: total, details: details, rolledAt: new Date().toISOString() };
  }

  function detailText(result) {
    return result.details.map(function(detail) {
      if (!detail.rolls.length) return detail.raw;
      const kept = detail.kept.join(', ');
      const all = detail.rolls.join(', ');
      if (kept === all) return detail.raw + ' [' + all + ']';
      return detail.raw + ' [' + all + '] kept [' + kept + ']';
    }).join('  ');
  }

  function performRoll(expression, label) {
    try {
      const result = rollExpression(expression);
      result.id = uid('roll');
      result.label = label || '';
      state.diceHistory.unshift(result);
      state.diceHistory = state.diceHistory.slice(0, HISTORY_LIMIT);
      saveState();
      renderDiceHistory();
      const total = document.getElementById('ttk-dice-total');
      const detail = document.getElementById('ttk-dice-detail');
      if (total) total.textContent = String(result.total);
      if (detail) detail.textContent = detailText(result);
      setStatus('Rolled ' + result.expression + ' → ' + result.total + '.');
      return result;
    } catch (error) {
      setStatus(error.message);
      return null;
    }
  }

  function renderDiceHistory() {
    const target = document.getElementById('ttk-dice-history');
    if (!target) return;
    if (!state.diceHistory.length) {
      target.innerHTML = '<li class="ttk-empty">No rolls yet.</li>';
      return;
    }
    target.innerHTML = state.diceHistory.map(function(item) {
      return '<li><div><strong>' + esc(item.label || item.expression) + '</strong><span>' + esc(item.expression) + '</span></div><b>' + esc(item.total) + '</b><small>' + esc(detailText(item)) + '</small></li>';
    }).join('');
  }

  function addInitiativeEntry() {
    const name = document.getElementById('ttk-init-name');
    const initiative = document.getElementById('ttk-init-value');
    if (!name || !name.value.trim()) return setStatus('Give the combatant a name first.');
    state.initiative.entries.push({
      id: uid('combatant'),
      name: name.value.trim(),
      initiative: clampNumber(initiative && initiative.value, -999, 999, 0),
      hp: 10,
      maxHp: 10,
      defense: '',
      conditions: ''
    });
    name.value = '';
    if (initiative) initiative.value = '';
    sortInitiative();
  }

  function sortInitiative() {
    const currentId = state.initiative.entries[state.initiative.index] && state.initiative.entries[state.initiative.index].id;
    state.initiative.entries.sort(function(a, b) {
      return Number(b.initiative || 0) - Number(a.initiative || 0) || String(a.name || '').localeCompare(String(b.name || ''));
    });
    state.initiative.index = Math.max(0, state.initiative.entries.findIndex(function(entry) { return entry.id === currentId; }));
    if (state.initiative.index < 0) state.initiative.index = 0;
    saveState();
    renderInitiative();
  }

  function nextTurn() {
    if (!state.initiative.entries.length) return setStatus('Add combatants before advancing the turn.');
    state.initiative.index += 1;
    if (state.initiative.index >= state.initiative.entries.length) {
      state.initiative.index = 0;
      state.initiative.round += 1;
    }
    saveState();
    renderInitiative();
  }

  function resetCombat() {
    state.initiative.round = 1;
    state.initiative.index = 0;
    saveState();
    renderInitiative();
  }

  function renderInitiative() {
    const target = document.getElementById('ttk-initiative-list');
    const round = document.getElementById('ttk-round');
    if (round) round.textContent = String(state.initiative.round);
    if (!target) return;
    if (!state.initiative.entries.length) {
      target.innerHTML = '<div class="ttk-empty">No combatants yet.</div>';
      return;
    }
    target.innerHTML = state.initiative.entries.map(function(entry, index) {
      const active = index === state.initiative.index;
      return '<article class="ttk-combatant' + (active ? ' is-active' : '') + '" draggable="true" data-kind="initiative" data-id="' + esc(entry.id) + '">' +
        '<div class="ttk-drag" title="Drag to reorder" aria-hidden="true">⋮⋮</div>' +
        '<div class="ttk-combatant-main"><input class="ttk-inline-name" data-init-field="name" value="' + esc(entry.name) + '" aria-label="Combatant name">' +
        '<label>Init<input type="number" data-init-field="initiative" value="' + esc(entry.initiative) + '"></label>' +
        '<label>HP<input type="number" data-init-field="hp" value="' + esc(entry.hp) + '"></label>' +
        '<span>/</span><input class="ttk-mini-number" type="number" data-init-field="maxHp" value="' + esc(entry.maxHp) + '" aria-label="Maximum HP">' +
        '<label>Def<input data-init-field="defense" value="' + esc(entry.defense) + '"></label></div>' +
        '<div class="ttk-condition-row"><input data-init-field="conditions" value="' + esc(entry.conditions) + '" placeholder="Conditions, concentration, status…"></div>' +
        '<div class="ttk-row-actions"><button type="button" data-init-hp="-1">−1 HP</button><button type="button" data-init-hp="1">+1 HP</button><button type="button" data-move="-1">↑</button><button type="button" data-move="1">↓</button><button type="button" data-remove-init>Remove</button></div>' +
        '</article>';
    }).join('');
  }

  function addRosterCard() {
    state.roster.push({
      id: uid('character'),
      name: 'New Character',
      role: '',
      system: '',
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      defense: '',
      speed: '',
      resourceName: 'Resource',
      resource: 0,
      resourceMax: 0,
      notes: ''
    });
    saveState();
    renderRoster();
  }

  function renderRoster() {
    const target = document.getElementById('ttk-roster');
    if (!target) return;
    if (!state.roster.length) {
      target.innerHTML = '<div class="ttk-empty">Add a character card. Cards can be dragged into marching order, spotlight order, watch order, or whatever other trouble the party invents.</div>';
      return;
    }
    target.innerHTML = state.roster.map(function(character) {
      return '<article class="ttk-character-card" draggable="true" data-kind="roster" data-id="' + esc(character.id) + '">' +
        '<header><span class="ttk-drag" title="Drag to reorder" aria-hidden="true">⋮⋮</span><input data-roster-field="name" value="' + esc(character.name) + '" aria-label="Character name"><button type="button" data-remove-roster>×</button></header>' +
        '<div class="ttk-card-grid"><label>Role<input data-roster-field="role" value="' + esc(character.role) + '"></label><label>System<input data-roster-field="system" value="' + esc(character.system) + '"></label>' +
        '<label>HP<input type="number" data-roster-field="hp" value="' + esc(character.hp) + '"></label><label>Max HP<input type="number" data-roster-field="maxHp" value="' + esc(character.maxHp) + '"></label>' +
        '<label>Temp<input type="number" data-roster-field="tempHp" value="' + esc(character.tempHp) + '"></label><label>Defense<input data-roster-field="defense" value="' + esc(character.defense) + '"></label>' +
        '<label>Speed<input data-roster-field="speed" value="' + esc(character.speed) + '"></label><label>Resource Name<input data-roster-field="resourceName" value="' + esc(character.resourceName) + '"></label>' +
        '<label>Resource<input type="number" data-roster-field="resource" value="' + esc(character.resource) + '"></label><label>Resource Max<input type="number" data-roster-field="resourceMax" value="' + esc(character.resourceMax) + '"></label></div>' +
        '<label class="ttk-wide">Quick Notes<textarea rows="2" data-roster-field="notes">' + esc(character.notes) + '</textarea></label>' +
        '<div class="ttk-row-actions"><button type="button" data-roster-hp="-1">−1 HP</button><button type="button" data-roster-hp="1">+1 HP</button><button type="button" data-roster-resource="-1">− Resource</button><button type="button" data-roster-resource="1">+ Resource</button><button type="button" data-move="-1">↑</button><button type="button" data-move="1">↓</button></div>' +
        '</article>';
    }).join('');
  }

  function addCounter() {
    const name = document.getElementById('ttk-counter-name');
    const max = document.getElementById('ttk-counter-max');
    const step = document.getElementById('ttk-counter-step');
    const counterName = name && name.value.trim() ? name.value.trim() : 'Counter';
    const maximum = clampNumber(max && max.value, 0, 999999, 10);
    state.counters.push({ id: uid('counter'), name: counterName, value: 0, max: maximum, step: clampNumber(step && step.value, 1, 999999, 1) });
    if (name) name.value = '';
    saveState();
    renderTrackers();
  }

  function addClock() {
    const name = document.getElementById('ttk-clock-name');
    const segments = document.getElementById('ttk-clock-segments');
    state.clocks.push({
      id: uid('clock'),
      name: name && name.value.trim() ? name.value.trim() : 'Clock',
      segments: clampNumber(segments && segments.value, 2, 12, 6),
      filled: 0
    });
    if (name) name.value = '';
    saveState();
    renderTrackers();
  }

  function renderTrackers() {
    const counters = document.getElementById('ttk-counters');
    const clocks = document.getElementById('ttk-clocks');
    if (counters) {
      counters.innerHTML = state.counters.length ? state.counters.map(function(counter) {
        return '<article class="ttk-counter" data-id="' + esc(counter.id) + '"><input data-counter-field="name" value="' + esc(counter.name) + '" aria-label="Counter name"><div><button type="button" data-counter-delta="' + esc(-Number(counter.step || 1)) + '">−</button><strong>' + esc(counter.value) + (Number(counter.max) > 0 ? ' / ' + esc(counter.max) : '') + '</strong><button type="button" data-counter-delta="' + esc(Number(counter.step || 1)) + '">+</button><button type="button" data-remove-counter>×</button></div></article>';
      }).join('') : '<div class="ttk-empty">No counters yet.</div>';
    }
    if (clocks) {
      clocks.innerHTML = state.clocks.length ? state.clocks.map(function(clock) {
        const segmentButtons = Array.from({ length: Number(clock.segments) || 6 }, function(_, index) {
          return '<button type="button" class="' + (index < Number(clock.filled || 0) ? 'is-filled' : '') + '" data-clock-fill="' + (index + 1) + '" aria-label="Set clock to ' + (index + 1) + ' of ' + clock.segments + '">' + (index + 1) + '</button>';
        }).join('');
        return '<article class="ttk-clock" data-id="' + esc(clock.id) + '"><header><input data-clock-field="name" value="' + esc(clock.name) + '" aria-label="Clock name"><span>' + esc(clock.filled) + '/' + esc(clock.segments) + '</span><button type="button" data-remove-clock>×</button></header><div class="ttk-clock-segments">' + segmentButtons + '</div></article>';
      }).join('') : '<div class="ttk-empty">No clocks yet.</div>';
    }
  }

  function parseWeightedTable(text) {
    return String(text || '').split(/\r?\n/).map(function(line) { return line.trim(); }).filter(Boolean).map(function(line) {
      const match = line.match(/^(\d+(?:\.\d+)?)\s*\|\s*(.+)$/);
      if (match) return { weight: Math.max(0, Number(match[1])), value: match[2].trim() };
      return { weight: 1, value: line };
    }).filter(function(item) { return item.value && item.weight > 0; });
  }

  function drawWeighted() {
    const entries = parseWeightedTable(state.random.tableText);
    if (!entries.length) return setStatus('Add at least one random-table entry.');
    const totalWeight = entries.reduce(function(sum, item) { return sum + item.weight; }, 0);
    let cursor = (randomInt(1000000) / 1000000) * totalWeight;
    let chosen = entries[entries.length - 1];
    for (const item of entries) {
      cursor -= item.weight;
      if (cursor < 0) {
        chosen = item;
        break;
      }
    }
    const output = document.getElementById('ttk-random-result');
    if (output) output.textContent = chosen.value;
    setStatus('Random table selected: ' + chosen.value);
  }

  function bagItems() {
    return String(state.random.bagText || '').split(/\r?\n/).map(function(item) { return item.trim(); }).filter(Boolean);
  }

  function resetBag() {
    state.random.bagRemaining = bagItems();
    saveState();
    renderBagStatus();
    setStatus('Token bag reset with ' + state.random.bagRemaining.length + ' entries.');
  }

  function drawBag() {
    if (!state.random.bagRemaining.length) state.random.bagRemaining = bagItems();
    if (!state.random.bagRemaining.length) return setStatus('Add entries to the token bag first.');
    const index = randomInt(state.random.bagRemaining.length);
    const chosen = state.random.bagRemaining.splice(index, 1)[0];
    saveState();
    const output = document.getElementById('ttk-bag-result');
    if (output) output.textContent = chosen;
    renderBagStatus();
    setStatus('Drew "' + chosen + '" without replacement.');
  }

  function renderBagStatus() {
    const status = document.getElementById('ttk-bag-status');
    if (status) status.textContent = state.random.bagRemaining.length + ' token(s) remain in the current bag.';
  }

  function makeDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const cards = [];
    suits.forEach(function(suit) {
      ranks.forEach(function(rank) {
        cards.push(rank + suit);
      });
    });
    return cards;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function resetDeck(report) {
    state.deck.remaining = shuffle(makeDeck());
    state.deck.discard = [];
    saveState();
    renderDeck();
    if (report !== false) setStatus('Standard 52-card deck shuffled.');
  }

  function drawCard() {
    if (!state.deck.remaining.length) resetDeck(false);
    const card = state.deck.remaining.pop();
    if (card) state.deck.discard.unshift(card);
    saveState();
    renderDeck();
    setStatus(card ? 'Drew ' + card + '.' : 'The deck is empty.');
  }

  function renderDeck() {
    const top = document.getElementById('ttk-card-drawn');
    const count = document.getElementById('ttk-card-count');
    const discard = document.getElementById('ttk-card-discard');
    if (top) top.textContent = state.deck.discard[0] || '—';
    if (count) count.textContent = String(state.deck.remaining.length);
    if (discard) discard.textContent = state.deck.discard.slice(0, 12).join('  ') || 'No cards drawn.';
  }

  function formatTimer(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function updateTimerDisplay() {
    const display = document.getElementById('ttk-timer-display');
    if (display) display.textContent = formatTimer(state.timer.remainingSec);
  }

  function timerTick() {
    if (!state.timer.running || !state.timer.endAt) return;
    const remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
    state.timer.remainingSec = remaining;
    updateTimerDisplay();
    if (remaining <= 0) {
      state.timer.running = false;
      state.timer.endAt = null;
      stopTimerLoop();
      saveState();
      setStatus('Turn timer expired.');
    }
  }

  function startTimer() {
    if (!state.timer.running) {
      if (state.timer.remainingSec <= 0) state.timer.remainingSec = state.timer.totalSec;
      state.timer.endAt = Date.now() + (state.timer.remainingSec * 1000);
      state.timer.running = true;
      startTimerLoop();
      saveState();
      setStatus('Turn timer started.');
    }
  }

  function pauseTimer() {
    timerTick();
    state.timer.running = false;
    state.timer.endAt = null;
    stopTimerLoop();
    saveState();
    setStatus('Turn timer paused.');
  }

  function resetTimer() {
    state.timer.running = false;
    state.timer.endAt = null;
    state.timer.remainingSec = state.timer.totalSec;
    stopTimerLoop();
    saveState();
    updateTimerDisplay();
    setStatus('Turn timer reset.');
  }

  function startTimerLoop() {
    stopTimerLoop();
    timerInterval = setInterval(timerTick, 250);
  }

  function stopTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function moveItem(list, id, direction) {
    const index = list.findIndex(function(item) { return item.id === id; });
    if (index < 0) return;
    const target = Math.min(list.length - 1, Math.max(0, index + direction));
    if (target === index) return;
    const moved = list.splice(index, 1)[0];
    list.splice(target, 0, moved);
  }

  function moveBefore(list, sourceId, targetId) {
    const sourceIndex = list.findIndex(function(item) { return item.id === sourceId; });
    const targetIndex = list.findIndex(function(item) { return item.id === targetId; });
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const moved = list.splice(sourceIndex, 1)[0];
    const adjustedTarget = list.findIndex(function(item) { return item.id === targetId; });
    list.splice(adjustedTarget, 0, moved);
  }

  function bindDrag(containerId, listName, render) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('dragstart', function(event) {
      const card = event.target.closest('[draggable="true"][data-id]');
      if (!card) return;
      dragContext = { listName: listName, id: card.dataset.id };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.dataset.id);
      }
      card.classList.add('is-dragging');
    });
    container.addEventListener('dragend', function(event) {
      const card = event.target.closest('[draggable="true"][data-id]');
      if (card) card.classList.remove('is-dragging');
      dragContext = null;
    });
    container.addEventListener('dragover', function(event) {
      if (!dragContext || dragContext.listName !== listName) return;
      const target = event.target.closest('[draggable="true"][data-id]');
      if (!target || target.dataset.id === dragContext.id) return;
      event.preventDefault();
    });
    container.addEventListener('drop', function(event) {
      if (!dragContext || dragContext.listName !== listName) return;
      const target = event.target.closest('[draggable="true"][data-id]');
      if (!target || target.dataset.id === dragContext.id) return;
      event.preventDefault();
      const list = listName === 'initiative' ? state.initiative.entries : state.roster;
      moveBefore(list, dragContext.id, target.dataset.id);
      if (listName === 'initiative') state.initiative.index = 0;
      saveState();
      render();
      dragContext = null;
    });
  }

  function activateTab(tabName) {
    document.querySelectorAll('#tabletop-toolkit-mount [data-tool-tab]').forEach(function(button) {
      const active = button.dataset.toolTab === tabName;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#tabletop-toolkit-mount [data-tool-panel]').forEach(function(panel) {
      panel.hidden = panel.dataset.toolPanel !== tabName;
    });
  }

  function bindStaticEvents() {
    const root = document.getElementById('tabletop-toolkit-mount');
    if (!root) return;

    root.addEventListener('click', function(event) {
      const tab = event.target.closest('[data-tool-tab]');
      if (tab) return activateTab(tab.dataset.toolTab);

      const quick = event.target.closest('[data-quick-roll]');
      if (quick) return performRoll(quick.dataset.quickRoll, quick.textContent.trim());

      if (event.target.closest('#ttk-roll')) {
        const expression = document.getElementById('ttk-dice-expression');
        const label = document.getElementById('ttk-dice-label');
        return performRoll(expression && expression.value, label && label.value.trim());
      }
      if (event.target.closest('#ttk-clear-rolls')) {
        state.diceHistory = [];
        saveState();
        renderDiceHistory();
        return setStatus('Dice history cleared.');
      }

      if (event.target.closest('#ttk-add-init')) return addInitiativeEntry();
      if (event.target.closest('#ttk-sort-init')) return sortInitiative();
      if (event.target.closest('#ttk-next-turn')) return nextTurn();
      if (event.target.closest('#ttk-reset-combat')) return resetCombat();

      const initCard = event.target.closest('.ttk-combatant[data-id]');
      if (initCard) {
        const entry = state.initiative.entries.find(function(item) { return item.id === initCard.dataset.id; });
        if (!entry) return;
        const hpButton = event.target.closest('[data-init-hp]');
        if (hpButton) {
          entry.hp = Number(entry.hp || 0) + Number(hpButton.dataset.initHp || 0);
          saveState();
          return renderInitiative();
        }
        const move = event.target.closest('[data-move]');
        if (move) {
          moveItem(state.initiative.entries, entry.id, Number(move.dataset.move));
          state.initiative.index = Math.max(0, state.initiative.entries.findIndex(function(item) { return item.id === entry.id; }));
          saveState();
          return renderInitiative();
        }
        if (event.target.closest('[data-remove-init]')) {
          const index = state.initiative.entries.findIndex(function(item) { return item.id === entry.id; });
          state.initiative.entries.splice(index, 1);
          state.initiative.index = Math.min(state.initiative.index, Math.max(0, state.initiative.entries.length - 1));
          saveState();
          return renderInitiative();
        }
      }

      if (event.target.closest('#ttk-add-roster')) return addRosterCard();
      const rosterCard = event.target.closest('.ttk-character-card[data-id]');
      if (rosterCard) {
        const character = state.roster.find(function(item) { return item.id === rosterCard.dataset.id; });
        if (!character) return;
        const hpButton = event.target.closest('[data-roster-hp]');
        if (hpButton) {
          character.hp = Number(character.hp || 0) + Number(hpButton.dataset.rosterHp || 0);
          saveState();
          return renderRoster();
        }
        const resourceButton = event.target.closest('[data-roster-resource]');
        if (resourceButton) {
          character.resource = Number(character.resource || 0) + Number(resourceButton.dataset.rosterResource || 0);
          saveState();
          return renderRoster();
        }
        const move = event.target.closest('[data-move]');
        if (move) {
          moveItem(state.roster, character.id, Number(move.dataset.move));
          saveState();
          return renderRoster();
        }
        if (event.target.closest('[data-remove-roster]')) {
          state.roster = state.roster.filter(function(item) { return item.id !== character.id; });
          saveState();
          return renderRoster();
        }
      }

      if (event.target.closest('#ttk-add-counter')) return addCounter();
      const counter = event.target.closest('.ttk-counter[data-id]');
      if (counter) {
        const item = state.counters.find(function(entry) { return entry.id === counter.dataset.id; });
        if (!item) return;
        const delta = event.target.closest('[data-counter-delta]');
        if (delta) {
          item.value = Number(item.value || 0) + Number(delta.dataset.counterDelta || 0);
          if (Number(item.max) > 0) item.value = Math.min(Number(item.max), item.value);
          saveState();
          return renderTrackers();
        }
        if (event.target.closest('[data-remove-counter]')) {
          state.counters = state.counters.filter(function(entry) { return entry.id !== item.id; });
          saveState();
          return renderTrackers();
        }
      }

      if (event.target.closest('#ttk-add-clock')) return addClock();
      const clock = event.target.closest('.ttk-clock[data-id]');
      if (clock) {
        const item = state.clocks.find(function(entry) { return entry.id === clock.dataset.id; });
        if (!item) return;
        const fill = event.target.closest('[data-clock-fill]');
        if (fill) {
          item.filled = Number(fill.dataset.clockFill) === Number(item.filled) ? Math.max(0, Number(item.filled) - 1) : Number(fill.dataset.clockFill);
          saveState();
          return renderTrackers();
        }
        if (event.target.closest('[data-remove-clock]')) {
          state.clocks = state.clocks.filter(function(entry) { return entry.id !== item.id; });
          saveState();
          return renderTrackers();
        }
      }

      if (event.target.closest('#ttk-random-draw')) return drawWeighted();
      if (event.target.closest('#ttk-bag-reset')) return resetBag();
      if (event.target.closest('#ttk-bag-draw')) return drawBag();
      if (event.target.closest('#ttk-deck-draw')) return drawCard();
      if (event.target.closest('#ttk-deck-reset')) return resetDeck(true);
      if (event.target.closest('#ttk-timer-start')) return startTimer();
      if (event.target.closest('#ttk-timer-pause')) return pauseTimer();
      if (event.target.closest('#ttk-timer-reset')) return resetTimer();
    });

    root.addEventListener('input', function(event) {
      const initCard = event.target.closest('.ttk-combatant[data-id]');
      if (initCard && event.target.dataset.initField) {
        const entry = state.initiative.entries.find(function(item) { return item.id === initCard.dataset.id; });
        if (entry) {
          const field = event.target.dataset.initField;
          entry[field] = event.target.type === 'number' ? Number(event.target.value || 0) : event.target.value;
          saveState();
        }
        return;
      }

      const rosterCard = event.target.closest('.ttk-character-card[data-id]');
      if (rosterCard && event.target.dataset.rosterField) {
        const character = state.roster.find(function(item) { return item.id === rosterCard.dataset.id; });
        if (character) {
          const field = event.target.dataset.rosterField;
          character[field] = event.target.type === 'number' ? Number(event.target.value || 0) : event.target.value;
          saveState();
        }
        return;
      }

      const counter = event.target.closest('.ttk-counter[data-id]');
      if (counter && event.target.dataset.counterField) {
        const item = state.counters.find(function(entry) { return entry.id === counter.dataset.id; });
        if (item) {
          item[event.target.dataset.counterField] = event.target.value;
          saveState();
        }
        return;
      }

      const clock = event.target.closest('.ttk-clock[data-id]');
      if (clock && event.target.dataset.clockField) {
        const item = state.clocks.find(function(entry) { return entry.id === clock.dataset.id; });
        if (item) {
          item[event.target.dataset.clockField] = event.target.value;
          saveState();
        }
        return;
      }

      if (event.target.id === 'ttk-random-table') {
        state.random.tableText = event.target.value;
        saveState();
      } else if (event.target.id === 'ttk-bag-text') {
        state.random.bagText = event.target.value;
        saveState();
      } else if (event.target.id === 'ttk-notes') {
        state.notes = event.target.value;
        saveState();
      } else if (event.target.id === 'ttk-timer-minutes' || event.target.id === 'ttk-timer-seconds') {
        const minutes = clampNumber(document.getElementById('ttk-timer-minutes').value, 0, 999, 0);
        const seconds = clampNumber(document.getElementById('ttk-timer-seconds').value, 0, 59, 0);
        state.timer.totalSec = (minutes * 60) + seconds;
        if (!state.timer.running) state.timer.remainingSec = state.timer.totalSec;
        saveState();
        updateTimerDisplay();
      }
    });

    const diceInput = document.getElementById('ttk-dice-expression');
    if (diceInput) diceInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        performRoll(diceInput.value, document.getElementById('ttk-dice-label').value.trim());
      }
    });

    bindDrag('ttk-initiative-list', 'initiative', renderInitiative);
    bindDrag('ttk-roster', 'roster', renderRoster);
  }

  function renderAll() {
    renderDiceHistory();
    renderInitiative();
    renderRoster();
    renderTrackers();
    renderBagStatus();
    if (!state.deck.remaining.length && !state.deck.discard.length) resetDeck(false);
    else renderDeck();
    document.getElementById('ttk-random-table').value = state.random.tableText || '';
    document.getElementById('ttk-bag-text').value = state.random.bagText || '';
    document.getElementById('ttk-notes').value = state.notes || '';
    const timerMinutes = Math.floor(Number(state.timer.totalSec || 0) / 60);
    const timerSeconds = Number(state.timer.totalSec || 0) % 60;
    document.getElementById('ttk-timer-minutes').value = timerMinutes;
    document.getElementById('ttk-timer-seconds').value = timerSeconds;
    updateTimerDisplay();
  }

  function mount() {
    const mountNode = document.getElementById('tabletop-toolkit-mount');
    if (!mountNode || mountNode.dataset.built === 'true') return;
    mountNode.dataset.built = 'true';
    mountNode.innerHTML = [
      '<section class="ttk-shell" aria-labelledby="ttk-title">',
        '<header class="ttk-header">',
          '<div><p class="eyebrow">Live table console · local autosave</p><h2 id="ttk-title">Tabletop Session Toolkit</h2><p>System-neutral session machinery for dice, combat, party resources, clocks, randomizers, cards, timing, and notes. Everything stays in this browser.</p></div>',
          '<div class="ttk-version">v' + VERSION + '</div>',
        '</header>',
        '<nav class="ttk-tabs" role="tablist" aria-label="Tabletop utility categories">',
          '<button type="button" class="active" role="tab" aria-selected="true" data-tool-tab="dice">Dice</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="combat">Combat</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="party">Party</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="trackers">Trackers</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="random">Random</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="cards">Cards</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="session">Session</button>',
        '</nav>',
        '<p id="ttk-status" class="ttk-status" role="status" aria-live="polite">Toolkit ready. State autosaves locally after changes.</p>',

        '<section class="ttk-panel" data-tool-panel="dice">',
          '<div class="ttk-section-head"><div><p class="eyebrow">RNG and roll history</p><h3>Advanced Dice Roller</h3></div><button type="button" id="ttk-clear-rolls">Clear History</button></div>',
          '<div class="ttk-dice-layout"><div class="ttk-dice-controls">',
            '<label>Expression<input id="ttk-dice-expression" value="1d20" inputmode="text" placeholder="2d20kh1+5"></label>',
            '<label>Optional Label<input id="ttk-dice-label" placeholder="Perception, dragon fire, initiative…"></label>',
            '<button type="button" class="ttk-primary" id="ttk-roll">Roll</button>',
            '<div class="ttk-quick-rolls" aria-label="Quick dice"><button type="button" data-quick-roll="1d4">d4</button><button type="button" data-quick-roll="1d6">d6</button><button type="button" data-quick-roll="1d8">d8</button><button type="button" data-quick-roll="1d10">d10</button><button type="button" data-quick-roll="1d12">d12</button><button type="button" data-quick-roll="1d20">d20</button><button type="button" data-quick-roll="1d100">d100</button><button type="button" data-quick-roll="2d20kh1">Advantage</button><button type="button" data-quick-roll="2d20kl1">Disadvantage</button><button type="button" data-quick-roll="4dF">4dF</button></div>',
            '<p class="ttk-help">Supports additive dice, constants, keep-high/keep-low, exploding dice, and Fate/Fudge dice: <code>2d6+3</code>, <code>4d6kh3</code>, <code>2d10!</code>, <code>4dF</code>.</p>',
          '</div><div class="ttk-roll-result"><span>Result</span><strong id="ttk-dice-total">—</strong><p id="ttk-dice-detail">Roll something unreasonable.</p></div></div>',
          '<ol id="ttk-dice-history" class="ttk-history"></ol>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="combat" hidden>',
          '<div class="ttk-section-head"><div><p class="eyebrow">Turn order and live conditions</p><h3>Initiative & Combat Tracker</h3></div><div class="ttk-round-box">Round <strong id="ttk-round">1</strong></div></div>',
          '<div class="ttk-add-row"><input id="ttk-init-name" placeholder="Combatant name"><input id="ttk-init-value" type="number" placeholder="Initiative"><button type="button" class="ttk-primary" id="ttk-add-init">Add</button><button type="button" id="ttk-sort-init">Sort High → Low</button><button type="button" id="ttk-next-turn">Next Turn</button><button type="button" id="ttk-reset-combat">Reset Round</button></div>',
          '<p class="ttk-help">Drag combatants to reorder them manually, or use ↑/↓. HP, defense, and conditions remain editable in place.</p>',
          '<div id="ttk-initiative-list" class="ttk-initiative-list"></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="party" hidden>',
          '<div class="ttk-section-head"><div><p class="eyebrow">Drag-and-drop table records</p><h3>Party / Crew Character Cards</h3></div><button type="button" class="ttk-primary" id="ttk-add-roster">Add Character Card</button></div>',
          '<p class="ttk-help">These are fast table trackers rather than replacements for the full sheet below. Drag them into marching order, watch order, spotlight order, vehicle stations, or any other useful arrangement.</p>',
          '<div id="ttk-roster" class="ttk-roster"></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="trackers" hidden>',
          '<div class="ttk-tracker-columns"><section><div class="ttk-section-head"><div><p class="eyebrow">Ammo · supplies · reputation · spell slots</p><h3>Counters</h3></div></div><div class="ttk-add-row"><input id="ttk-counter-name" placeholder="Counter name"><input id="ttk-counter-max" type="number" min="0" value="10" aria-label="Maximum"><input id="ttk-counter-step" type="number" min="1" value="1" aria-label="Step"><button type="button" id="ttk-add-counter">Add</button></div><div id="ttk-counters" class="ttk-counter-list"></div></section>',
          '<section><div class="ttk-section-head"><div><p class="eyebrow">Threat · progress · rituals · alarms</p><h3>Segment Clocks</h3></div></div><div class="ttk-add-row"><input id="ttk-clock-name" placeholder="Clock name"><select id="ttk-clock-segments" aria-label="Clock segments"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select><button type="button" id="ttk-add-clock">Add</button></div><div id="ttk-clocks" class="ttk-clock-list"></div></section></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="random" hidden>',
          '<div class="ttk-random-grid"><section><p class="eyebrow">Weighted or unweighted</p><h3>Random Table Roller</h3><p class="ttk-help">One result per line. Optional weights use <code>weight | result</code>.</p><textarea id="ttk-random-table" rows="9" placeholder="1 | Quiet corridor&#10;3 | Suspicious noise&#10;1 | Extremely ill-advised door"></textarea><button type="button" class="ttk-primary" id="ttk-random-draw">Roll Table</button><output id="ttk-random-result" class="ttk-output">—</output></section>',
          '<section><p class="eyebrow">Without replacement</p><h3>Token / Chit Bag</h3><p class="ttk-help">Useful for wandering monsters, weather, initiative chits, rumor pools, loot, or randomized scene beats.</p><textarea id="ttk-bag-text" rows="9" placeholder="Goblin patrol&#10;Cold rain&#10;Merchant caravan&#10;Nothing. Suspiciously nothing."></textarea><div class="ttk-row-actions"><button type="button" id="ttk-bag-reset">Reset Bag</button><button type="button" class="ttk-primary" id="ttk-bag-draw">Draw Token</button></div><output id="ttk-bag-result" class="ttk-output">—</output><p id="ttk-bag-status" class="ttk-help"></p></section></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="cards" hidden>',
          '<div class="ttk-card-deck"><div><p class="eyebrow">Standard 52-card deck</p><h3>Card Draw</h3><p>Useful for games with card initiative, encounter pacing, fortune, or ordinary card mechanics.</p><div class="ttk-row-actions"><button type="button" class="ttk-primary" id="ttk-deck-draw">Draw Card</button><button type="button" id="ttk-deck-reset">Shuffle / Reset</button></div></div><div class="ttk-playing-card" id="ttk-card-drawn">—</div><div class="ttk-deck-meta"><span>Cards remaining</span><strong id="ttk-card-count">52</strong><span>Recent discard</span><p id="ttk-card-discard">No cards drawn.</p></div></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="session" hidden>',
          '<div class="ttk-session-grid"><section><p class="eyebrow">Pacing aid</p><h3>Turn / Scene Timer</h3><div class="ttk-timer-setup"><label>Minutes<input id="ttk-timer-minutes" type="number" min="0" max="999" value="5"></label><label>Seconds<input id="ttk-timer-seconds" type="number" min="0" max="59" value="0"></label></div><div id="ttk-timer-display" class="ttk-timer-display">05:00</div><div class="ttk-row-actions"><button type="button" class="ttk-primary" id="ttk-timer-start">Start</button><button type="button" id="ttk-timer-pause">Pause</button><button type="button" id="ttk-timer-reset">Reset</button></div></section>',
          '<section><p class="eyebrow">Autosaved scratchpad</p><h3>Session Notes</h3><textarea id="ttk-notes" rows="12" placeholder="NPC names, clues, damage to the furniture, increasingly implausible promises made to local nobility…"></textarea><p class="ttk-help">Saved locally with the rest of the tabletop console.</p></section></div>',
        '</section>',
      '</section>'
    ].join('');

    bindStaticEvents();
    renderAll();
    activateTab('dice');
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function resetAll() {
    const replacement = freshState();
    Object.keys(state).forEach(function(key) { delete state[key]; });
    Object.assign(state, replacement);
    saveState();
    stopTimerLoop();
    renderAll();
    activateTab('dice');
  }

  window.HBTabletopToolkit = Object.freeze({
    version: VERSION,
    mount: mount,
    rollExpression: rollExpression,
    getState: getState,
    resetAll: resetAll
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();