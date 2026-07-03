(() => {
  'use strict';

  const groups = Array.isArray(window.BlacklightKnownNameGroups) ? window.BlacklightKnownNameGroups : [];
  const index = new Map();
  let canonicalCount = 0;

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function addAlias(alias, record) {
    const key = normalize(alias);
    if (!key) return;
    const existing = index.get(key) || [];
    if (!existing.some(item => item.canonical === record.canonical && item.source === record.source)) {
      existing.push(record);
      index.set(key, existing);
    }
  }

  groups.forEach(group => {
    (group.entries || []).forEach(specification => {
      const [canonicalPart, aliasPart = ''] = String(specification).split('::');
      const canonical = canonicalPart.trim();
      if (!canonical) return;
      const record = Object.freeze({
        canonical,
        kind: group.kind || 'known-name',
        source: group.source || 'the public cultural record',
        descriptor: group.descriptor || 'recognized name'
      });
      canonicalCount += 1;
      addAlias(canonical, record);
      aliasPart.split(',').map(alias => alias.trim()).filter(Boolean).forEach(alias => addAlias(alias, record));
    });
  });

  function referenceSummary(record) {
    if (record.kind === 'public-figure') return `${record.canonical}, ${record.descriptor} associated with ${record.source}`;
    return `${record.canonical} from ${record.source}`;
  }

  function ambiguousResponse(input, field, cycle, matches) {
    const summaries = matches.slice(0, 4).map(referenceSummary);
    const remainder = matches.length > 4 ? `, plus ${matches.length - 4} additional indexed references` : '';
    const joined = `${summaries.join('; ')}${remainder}`;
    const playerTemplates = [
      `I recognize “${input},” unfortunately in several directions at once: ${joined}. I will treat this as a player handle or coincidence and will not guess which identity you intended.`,
      `That exact name collides with multiple entries in my cultural index: ${joined}. You remain the player completing the form; the references remain references.`,
      `“${input}” resolves to more than one famous identity: ${joined}. I am recording the ambiguity rather than inventing certainty, which remains an unpopular but useful habit.`,
      `Several public or fictional records answer to “${input}”: ${joined}. I will not promote a text-field collision into an identity claim.`
    ];
    const characterTemplates = [
      `You have named the operative “${input},” which maps to several existing references: ${joined}. I recognize all of them and will assume the ambiguity is intentional until the character demonstrates otherwise.`,
      `That character name is culturally overdetermined: ${joined}. Homage, alias, or coincidence are all admissible; subtlety is not among the available explanations.`,
      `“${input}” matches multiple indexed figures: ${joined}. I will record the operative exactly as entered and decline to choose the joke for you.`,
      `Several famous identities already occupy “${input}”: ${joined}. Your operative may keep it, though introductions are now statistically more complicated.`
    ];
    const templates = field === 'playerName' ? playerTemplates : characterTemplates;
    return templates[Math.abs(Number(cycle) || 0) % templates.length];
  }

  function publicFigureResponse(input, field, cycle, record, usedAlias) {
    const aliasNote = usedAlias ? ` The entered alias resolves to ${record.canonical}.` : '';
    const playerTemplates = [
      `Yes, I recognize the name. It is shared with ${record.canonical}, ${record.descriptor} associated with ${record.source}.${aliasNote} I am not assuming you are that public figure; I am recording an obvious name collision.`,
      `${record.canonical} is already a well-known name in ${record.source}.${aliasNote} You are still the player at this terminal, not a biography assembled from a text box.`,
      `That name appears in the public record as ${record.canonical}, ${record.descriptor}.${aliasNote} I will classify yours as a shared name, handle, or deliberate reference unless stronger evidence appears.`,
      `Recognized: ${record.canonical}, associated with ${record.source}.${aliasNote} No, this does not mean I have mistaken you for them. It means my cultural index is functioning.`
    ];
    const characterTemplates = [
      `You have named the operative ${input}, a name strongly associated with ${record.canonical}, ${record.descriptor} in ${record.source}.${aliasNote} Homage, cover identity, and coincidence remain available explanations.`,
      `Recognized. ${record.canonical} already occupies substantial cultural territory in ${record.source}.${aliasNote} Your character may use the name; subtle introductions may require additional planning.`,
      `That operative name matches ${record.canonical}, ${record.descriptor}.${aliasNote} I will record it without claiming the character is the public figure, because even Blacklight maintains some standards of evidence.`,
      `${input} is not culturally anonymous. It points directly toward ${record.canonical} and ${record.source}.${aliasNote} If this is a cover identity, it has chosen visibility over concealment.`
    ];
    const templates = field === 'playerName' ? playerTemplates : characterTemplates;
    return templates[Math.abs(Number(cycle) || 0) % templates.length];
  }

  function fictionalResponse(input, field, cycle, record, usedAlias) {
    const aliasNote = usedAlias ? ` The entered alias resolves to ${record.canonical}.` : '';
    const playerTemplates = [
      `I recognize that name as ${record.canonical} from ${record.source}.${aliasNote} As a player name, I will treat it as a handle, homage, or coincidence rather than evidence that fiction has reported for duty.`,
      `${record.canonical}. ${record.source}.${aliasNote} Yes, I know the reference. No, I am not assigning you the character's biography, liabilities, or merchandising agreements.`,
      `That player name matches ${record.canonical} from ${record.source}.${aliasNote} The reference is recorded; your actual identity remains your own problem and, more importantly, your own right.`,
      `Recognized: ${record.canonical}, ${record.descriptor}.${aliasNote} I will assume deliberate reference before assuming a breach between fictional and operational personnel files.`
    ];
    const characterTemplates = [
      `You have named the operative ${record.canonical} from ${record.source}.${aliasNote} I recognize it. If subtlety was intended, it has failed cleanly.`,
      `${record.canonical}. Yes, from ${record.source}.${aliasNote} The name is valid, the reference is obvious, and the consequences for first impressions are now part of the character.`,
      `That character name resolves to ${record.canonical}, ${record.descriptor}.${aliasNote} I will record it as an alias, homage, or extraordinary coincidence—not as borrowed mechanics.`,
      `Recognized. ${record.canonical} already has a substantial fictional record in ${record.source}.${aliasNote} Your operative receives the name and none of the capabilities unless those are purchased separately.`
    ];
    const templates = field === 'playerName' ? playerTemplates : characterTemplates;
    return templates[Math.abs(Number(cycle) || 0) % templates.length];
  }

  function recognize(value, field = 'characterName', cycle = 0) {
    const input = String(value || '').trim();
    const key = normalize(input);
    if (!key) return null;
    const matches = index.get(key);
    if (!matches?.length) return null;

    if (matches.length > 1) {
      return Object.freeze({
        input,
        normalized: key,
        matches: [...matches],
        ambiguous: true,
        response: ambiguousResponse(input, field, cycle, matches)
      });
    }

    const record = matches[0];
    const usedAlias = normalize(record.canonical) !== key;
    const response = record.kind === 'public-figure'
      ? publicFigureResponse(input, field, cycle, record, usedAlias)
      : fictionalResponse(input, field, cycle, record, usedAlias);

    return Object.freeze({
      input,
      normalized: key,
      matches: [record],
      ambiguous: false,
      usedAlias,
      ...record,
      response
    });
  }

  window.BlacklightNameRecognition = Object.freeze({
    recognize,
    normalize,
    canonicalCount,
    aliasCount: index.size
  });
})();
