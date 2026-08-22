#!/usr/bin/env python3
from pathlib import Path

engine_path = Path('semantic-spatial-engine.js')
test_path = Path('tests/spatial-connector-normalization.test.js')
engine = engine_path.read_text()
test = test_path.read_text()

old_version = "  const VERSION = '1.1.0';"
new_version = "  const VERSION = '1.1.1';"
if engine.count(old_version) != 1:
    raise SystemExit(f'expected one engine version marker, found {engine.count(old_version)}')

old = """    const byDeck = completeInferredConnectivity(graph, spec, rng, deckCount);\n    if (deckCount > 1) {\n      const nodeById = new Map(nodes.map(node => [node.id, node]));\n      for (let deck = 0; deck < deckCount - 1; deck += 1) {\n        if (!byDeck[deck].length || !byDeck[deck + 1].length) continue;\n        const alreadyLinked = graph.edges.some(edge => {\n          const a = nodeById.get(edge.a), b = nodeById.get(edge.b);\n          if (!a || !b) return false;\n          return (a.deck === deck && b.deck === deck + 1) || (a.deck === deck + 1 && b.deck === deck);\n        });\n        if (alreadyLinked) continue;\n        const a = rng.pick(byDeck[deck]);\n        const b = rng.pick(byDeck[deck + 1]);\n        addEdge(graph.edges, a.id, b.id, 'interdeck', true, { connectorRequired: true, fromDeck: deck, toDeck: deck + 1 });\n      }\n    }\n"""
new = """    const byDeck = completeInferredConnectivity(graph, spec, rng, deckCount);\n    if (deckCount > 1) {\n      const nodeById = new Map(nodes.map(node => [node.id, node]));\n      const occupiedDecks = byDeck.map((deckNodes, deck) => deckNodes.length ? deck : null).filter(deck => deck != null);\n      for (let index = 0; index < occupiedDecks.length - 1; index += 1) {\n        const fromDeck = occupiedDecks[index], toDeck = occupiedDecks[index + 1];\n        const alreadyLinked = graph.edges.some(edge => {\n          const a = nodeById.get(edge.a), b = nodeById.get(edge.b);\n          if (!a || !b) return false;\n          return (a.deck === fromDeck && b.deck === toDeck) || (a.deck === toDeck && b.deck === fromDeck);\n        });\n        if (alreadyLinked) continue;\n        const a = rng.pick(byDeck[fromDeck]);\n        const b = rng.pick(byDeck[toDeck]);\n        addEdge(graph.edges, a.id, b.id, 'interdeck', true, { connectorRequired: true, fromDeck, toDeck, skippedEmptyDecks: toDeck - fromDeck > 1 });\n      }\n    }\n"""
if engine.count(old) != 1:
    raise SystemExit(f'expected one occupied-deck target block, found {engine.count(old)}')
engine = engine.replace(old_version, new_version, 1).replace(old, new, 1)

anchor = "assert.strictEqual(dense.connectors.length,4,'connector endpoints should be two per intentional pair, not random cross-deck edge inflation');\n"
insertion = """assert.strictEqual(dense.connectors.length,4,'connector endpoints should be two per intentional pair, not random cross-deck edge inflation');\n\nconst sparseDecks = engine.generate({\n  seed:'connector-normalization-empty-intermediate-deck',\n  decks:4,\n  roles:[\n    {id:'deck-zero',role:'deck-zero',deck:0},\n    {id:'deck-one',role:'deck-one',deck:1},\n    {id:'deck-three-a',role:'deck-three-a',deck:3},\n    {id:'deck-three-b',role:'deck-three-b',deck:3}\n  ],\n  adjacency:[['deck-zero','deck-one'],['deck-three-a','deck-three-b']],\n  extraEdgeChance:0,\n  layout:{gridWidth:58,gridHeight:42}\n});\nassert.strictEqual(sparseDecks.validation.ok,true,sparseDecks.validation.errors.join('\\n'));\nassert.strictEqual(connectorPairs(sparseDecks).size,2,'consecutive occupied decks must remain connected across an intentionally empty intermediate deck');\nassert.strictEqual(sparseDecks.connectors.length,4,'empty numeric decks must not disconnect upper occupied decks or create connector inflation');\nassert.ok(sparseDecks.edges.some(edge=>edge.kind==='interdeck'&&edge.metadata.skippedEmptyDecks===true),'bridge across empty intermediate deck must retain explicit provenance');\n"""
if test.count(anchor) != 1:
    raise SystemExit(f'expected one connector regression insertion anchor, found {test.count(anchor)}')
test = test.replace(anchor, insertion, 1)

engine_path.write_text(engine)
test_path.write_text(test)
print('occupied-deck connectivity patch applied')
