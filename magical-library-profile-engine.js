(() => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const randint = (min,max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomFloat = (min,max,decimals = 2) => Number((min + Math.random() * (max - min)).toFixed(decimals));
  const chance = probability => Math.random() < probability;
  const clamp = value => Math.max(0,Math.min(100,Math.round(value)));

  function rating(score) {
    const value = clamp(score);
    const label = value >= 90 ? 'Exceptional' : value >= 75 ? 'High' : value >= 60 ? 'Good' : value >= 45 ? 'Mixed' : value >= 30 ? 'Low' : 'Very Low';
    return { score:value, label };
  }

  function authorProfile(raw) {
    if (typeof raw === 'string') return { name:raw, origin:'No reliable biographical note accompanies this edition.', specialty:'general magical scholarship', reputation:'unassessed' };
    return { name:raw.name, origin:raw.origin, specialty:raw.specialty, reputation:raw.reputation };
  }

  function rarityFor(V,format,shelfId) {
    const maximum = Math.min(V.RARITIES.length - 1,format.detailDepth + 2 + (shelfId === 'malefic' ? 1 : 0));
    const minimum = Math.max(0,format.detailDepth - 1);
    const index = randint(minimum,maximum);
    return { index, label:V.RARITIES[index] };
  }

  function priceDisplay(cp) {
    if (cp >= 100) {
      const gp = cp / 100;
      return `${Number.isInteger(gp) ? gp : gp.toFixed(gp >= 10 ? 1 : 2)} gp`;
    }
    if (cp >= 10) {
      const sp = cp / 10;
      return `${Number.isInteger(sp) ? sp : sp.toFixed(1)} sp`;
    }
    return `${cp} cp`;
  }

  function priceFor(V,format,rarity,shelfId,condition) {
    const [minimum,maximum] = format.priceCp;
    const base = randint(minimum,maximum);
    const rarityMultiplier = 1 + rarity.index * 0.55;
    const shelfMultiplier = shelfId === 'malefic' ? 1.35 : shelfId === 'dubious' ? 0.85 : shelfId === 'luminous' ? 1.05 : 1;
    const conditionMultiplier = condition.includes('newly') || condition.includes('excellent') ? 1.15 : condition.includes('missing') || condition.includes('water') ? 0.7 : 1;
    const copper = Math.max(1,Math.round(base * rarityMultiplier * shelfMultiplier * conditionMultiplier));
    return { copper, display:priceDisplay(copper), acquisition:pick(V.ACQUISITION_NOTES), valuation:`${rarity.label}; ${condition}` };
  }

  function compositionFor(V,formatId) {
    const format = V.FORMATS[formatId];
    const materials = V.FORMAT_MATERIALS[formatId];
    return {
      substrate:pick(materials.substrates),
      ink:pick(materials.inks),
      binding:format.bindingMode === 'none' ? null : pick(materials.bindings),
      cover:pick(materials.covers),
      dimensions:pick(materials.dimensions),
      illustrations:pick(materials.illustrations),
      weightKg:randomFloat(format.weight[0],format.weight[1]),
      leafArrangement:format.bindingMode === 'none' ? 'loose or folded leaves without a permanent spine' : format.bindingMode === 'packet' ? 'loose leaves held as a temporary packet' : 'sewn and gathered sections'
    };
  }

  function originFor(V,materials,author,publisher,format) {
    return {
      production:pick(materials.origins),
      authorBackground:author.origin,
      institutionalOrigin:publisher,
      provenance:chance(format.historyChance) ? pick(V.PROVENANCE) : null,
      age:format.scale === 'brief' ? pick(['current semester','one to five academic years old','a recent undated printing']) : format.detailDepth >= 4 ? pick(['several decades old','between one and three centuries old','copied from a much older exemplar','of disputed First Age derivation']) : pick(['a recent scholarly edition','between five and forty years old','revised within the last generation'])
    };
  }

  function sensoryFor(V,format,shelfId) {
    return {
      scent:chance(format.sensoryChance) ? pick(V.SCENTS[shelfId]) : null,
      aura:chance(format.auraChance) ? pick(V.AURAS[shelfId]) : null,
      handling:format.detailDepth <= 1 ? pick(['light, flexible, and easily misplaced','creased from repeated classroom use','plain and unremarkable in the hand']) : format.detailDepth >= 4 ? pick(['too heavy for comfortable lap reading','cold at the clasps and warm at the spine','physically imposing even before it is opened']) : pick(['solidly made for repeated study','balanced for desk reading','heavier than its modest dimensions suggest'])
    };
  }

  function ratingsFor(format,source,shelfId,author) {
    const depth = format.detailDepth;
    const sourceAdjustment = source === 'malefic' ? -8 : 3;
    const shelfAdjustment = shelfId === 'malefic' ? -10 : shelfId === 'dubious' ? -6 : shelfId === 'luminous' ? 7 : 0;
    return {
      confidence:rating(54 + depth * 7 + sourceAdjustment + shelfAdjustment + randint(-15,15)),
      usefulness:rating(48 + depth * 9 + randint(-12,18)),
      readability:rating(88 - depth * 10 + (format.scale === 'brief' ? 8 : 0) + randint(-14,12)),
      practicalUtility:rating(52 + (format.id === 'ritualManual' || format.id === 'fieldGuide' ? 22 : 0) + randint(-16,16)),
      scholarlyValue:rating(40 + depth * 13 + (format.id === 'monograph' || format.id === 'concordance' ? 12 : 0) + randint(-12,12)),
      authenticity:rating(58 + depth * 8 + (author.name.includes('Anonymous') ? -10 : 0) + randint(-14,14)),
      safety:rating(74 - depth * 5 + (source === 'malefic' ? -24 : 6) + randint(-12,12))
    };
  }

  function optionalTraits(V,format) {
    const traits = {};
    if (chance(Math.min(0.85,0.16 + format.detailDepth * 0.14))) traits.marginalia = pick(V.MARGINALIA);
    if (chance(format.historyChance)) traits.provenanceNote = pick(V.PROVENANCE);
    if (chance(Math.min(0.75,0.05 + format.detailDepth * 0.13))) traits.magicalQuirk = pick(V.QUIRKS);
    return traits;
  }

  function descriptionFor(format,composition,condition,sensory) {
    const binding = composition.binding ? `It is bound in ${composition.binding}, with ${composition.cover}.` : `It has ${composition.cover} and no permanent binding.`;
    const scent = sensory.scent ? ` It smells of ${sensory.scent}.` : '';
    const aura = sensory.aura ? ` Its detectable aura presents as ${sensory.aura}.` : '';
    return `A ${condition} ${format.label.toLowerCase()} made from ${composition.substrate} in ${composition.leafArrangement}, written or printed in ${composition.ink}. ${binding} It is ${composition.dimensions}, weighs approximately ${composition.weightKg} kg, and contains ${composition.illustrations}.${scent}${aura}`;
  }

  function summaryFor(V,book) {
    return `Written for ${book.intendedAudience}, this work supports ${book.courseAssociation} by examining ${book.subject.topic}, demonstrating ${book.subject.exercise}, and explaining how to recognize or document ${book.subject.hazard}. It includes ${pick(V.CONTENT_FEATURES)}.`;
  }

  function enrichBook(book,V) {
    const format = { id:book.format.id, ...V.FORMATS[book.format.id] };
    const materials = V.FORMAT_MATERIALS[format.id];
    const author = authorProfile(book.author);
    const condition = pick(V.CONDITIONS);
    const rarity = rarityFor(V,format,book.shelf.id);
    const composition = compositionFor(V,format.id);
    const sensory = sensoryFor(V,format,book.shelf.id);
    const origin = originFor(V,materials,author,book.publisher,format);
    const summary = summaryFor(V,book);

    book.description = descriptionFor(format,composition,condition,sensory);
    book.summary = summary;
    book.contents = summary;
    book.author = author;
    book.origin = origin;
    book.condition = condition;
    book.rarity = rarity;
    book.price = priceFor(V,format,rarity,book.shelf.id,condition);
    book.composition = composition;
    book.sensory = sensory;
    book.ratings = ratingsFor(format,book.source,book.shelf.id,author);
    book.optional = optionalTraits(V,format);
    book.format = { id:format.id, label:format.label, scale:format.scale, physicalClass:format.physicalClass, detailDepth:format.detailDepth };
    return book;
  }

  function install() {
    const Engine = window.HBMagicalLibraryEngine;
    if (!Engine || Engine.__profilesInstalled) return;
    const original = Engine.buildCatalog;
    Engine.buildCatalog = function(arcane,malefic,V,controls) {
      const catalog = original(arcane,malefic,V,controls);
      for (const discipline of catalog.disciplines) {
        for (const book of discipline.books) enrichBook(book,V);
      }
      catalog.notice = 'All titles, descriptions, authors, origins, prices, materials, ratings, sensory traits, publishers, courses, and cataloguing systems are fictional worldbuilding material.';
      return catalog;
    };
    Engine.__profilesInstalled = true;
  }

  install();
  window.HBMagicalLibraryProfileEngine = { enrichBook, install };
})();
