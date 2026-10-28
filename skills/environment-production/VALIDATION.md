# Package validation, 28 October 2026

## Executed locally

- Python 3.12: 15 helper tests ran; 14 passed and 1 symlink test was skipped because Windows did not permit symlink creation. Coverage includes honest open packets, complete synthetic records, tampering, stale revisions, missing evidence kinds, human-review separation, gate completeness and prerequisites, path traversal, malformed JSON, defects and preservation of an existing initialization directory.
- The first restricted-sandbox invocation failed on temporary-directory permissions. Running the same suite with ordinary authorized file access passed; no engine or project policy was relaxed.
- Foundry skill registry validator: all 45 registered skills and their capability/resource/laboratory references validated using a process-local CRLF-normalized text reader. The unmodified validator assumes LF and fails on pre-existing CRLF skill files in this Windows checkout.
- The repository-wide HTML projection check exposes pre-existing drift in other skill pages and a pre-existing missing directory entry. This package does not claim that whole-site check passes or modify those unrelated skill projections. Its new skill projection is generated with the repository's canonical generator and checked separately.

## Reproduction commands

```sh
python -m unittest discover -s skills/environment-production/tests -v
python skills/environment-production/scripts/build_package.py --check
python skills/environment-production/scripts/verify_distribution.py
```

The CI workflow runs these commands on Linux, where the symlink test can also run. A workflow file's presence is not a completed remote run; consult GitHub Actions for the actual commit result.

Distribution checks include HTML local-link existence, exact new-skill HTML projection/metadata, archive CRC/required files, bundled historical report hashes and execution of helper tests from the extracted standalone ZIP. Regenerating the ZIP uses fixed timestamps, stable path ordering, normalized text and stored entries to avoid compression-library differences.

## Limits

All complete packet data used in tests is explicitly synthetic. Passing those tests proves validator behavior, not successful map creation. No game was launched, map rebuilt, human acceptance supplied, performance measured or multiplayer session conducted for this packaging task. Historical case-study records are labeled and pinned separately.

The packet's full-completion profile includes network, hardware and human gates. For a different project, author and preserve an adapted manifest with appropriate required gates; do not quietly remove a failed gate to declare a milestone complete. The helper accepts review attestations but does not authenticate their authors.
