# Donjon Markov Name Generator — Upstream Reference

This package records the provenance of Donjon's JavaScript Markov name generator:

- Source/documentation page: https://donjon.bin.sh/code/name/
- Generator source: https://donjon.bin.sh/code/name/name_generator.js
- Example dataset: https://donjon.bin.sh/code/name/egyptian_set.js

Donjon explains that the generator builds frequency tables from sample names, including name length and letter-pair relationships, then produces new names in the style of the supplied sample set.

Donjon states that **the name generator itself is released to the public domain**. The example Egyptian data is separately described as drawn from **Kate Monk's Onomastikon, © 1997 Kate Monk**. Those are different rights boundaries and must not be conflated.

## Project use

The reusable opportunity is the Markov-style generator engine and its dataset interface. HB-TTRPG should feed that engine from our own canonical race, culture, faction, language, region, ship-class, corporation, and technology naming corpora rather than importing the example dataset as project-native content.

See `NAME-ADAPTATION.md` and `UPSTREAM-MANIFEST.json`.
