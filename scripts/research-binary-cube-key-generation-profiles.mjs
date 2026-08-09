#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Research = require(path.join(process.cwd(), 'binary-cube-key-generation-research.js'));

const receipt = Research.runResearchMatrix({
  gridSizes: [12, 64, 128],
  seedsPerGrid: 16
});

console.log(JSON.stringify(receipt, null, 2));
