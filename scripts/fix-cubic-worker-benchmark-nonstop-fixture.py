#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-worker-benchmark.py')
text = path.read_text()
start_marker = '// Disabling stop-on-identity must preserve the entire assigned pooled interval even when an exact key is observed.'
end_marker = '// Raw-ciphertext known-plaintext search:'
start = text.find(start_marker)
end = text.find(end_marker, start + len(start_marker))
if start < 0 or end < 0:
    raise SystemExit('Cubic non-stopping benchmark regression markers were not found.')
replacement = '''// Disabling stop-on-identity must preserve the entire assigned pooled interval even when an exact key is observed.
const nonStoppingSeed = '7';
const nonStoppingKey = Research.generateResearchKey('direct-permutation', nonStoppingSeed, 4, workerBaseOptions);
const nonStoppingPackage = Engine.encryptBinary(workerPlaintext, nonStoppingKey);
const nonStoppingOptions = { ...workerSearchOptions, profiles: ['direct-permutation'], seedStart: 0, seedEnd: 20, stopOnFingerprint: false, maxAttemptsThisRun: 20 };
const nonStoppingPlan = Cubic.buildSearchPlan(Cubic.parsePackage(nonStoppingPackage), nonStoppingOptions);
const nonStoppingPool = Pool.startSearch({
  plan: nonStoppingPlan,
  source: { kind: 'package', package: nonStoppingPackage },
  options: nonStoppingOptions,
  resumeCursor: 0,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-no-early-stop',
  workerFactory: () => createWorkerAdapter()
});
const nonStoppingPoolResult = await nonStoppingPool.promise;
assert.ok(nonStoppingPoolResult.exactMatch, 'The pool must still report an observed exact key identity when stop-on-identity is disabled.');
assert.equal(nonStoppingPoolResult.exactMatch.seed, nonStoppingSeed);
assert.equal(nonStoppingPoolResult.cursor, 20, 'stopOnFingerprint=false must complete the entire assigned interval instead of truncating at the exact key.');
assert.equal(nonStoppingPoolResult.attemptsThisRun, 20);
assert.equal(nonStoppingPoolResult.stopReason, 'attempt-budget');

'''
current = text[start:end]
if current == replacement:
    print('Cubic non-stopping pool regression already uses the compact fixture.')
else:
    path.write_text(text[:start] + replacement + text[end:])
    print('Cubic non-stopping pool regression reduced to a compact exact-match fixture.')
