# Binary Cube damage-aware survivability scoring

Status: implemented experimental research surface; runtime evidence still required.

The survivability scorer consumes the authoritative five-strategy structural-failure campaign. Version 2 adds recovered-damage amplification as an explicit engineering cost instead of treating every non-critical recovery failure as equivalent.

For every decode case that returns plaintext, the scorer totals injected encoded-representation bit flips and recovered plaintext bit differences. `recoveredDamageAmplification = totalRecoveredBitDamage / totalEncodedBitDamage`. Exact recoveries therefore contribute zero recovered damage; a damaged representation that returns many incorrect plaintext bits exposes propagation directly.

The raw survivability policy remains `exactRecoveryRate + 0.35 * detectedFailureRate - 10 * criticalUndetectedWrongRecoveryRate`. The damage/cost-adjusted score is `survivabilityScore / (meanExpansionRatio * (1 + recoveredDamageAmplification))`. These weights and the resulting ordering are transparent engineering heuristics, not cryptographic security measurements.

Human, conventional API, and AI surfaces call the same `binary-cube-strengthening-survivability-score.js` authority. The human laboratory displays amplification and the adjusted score; the AI projection documents both output meanings.

Runtime timing remains a separate unfinished requirement. Repository presence and descriptive scoring do not establish runtime acceptance, cryptographic security, or promotion into ordinary encryption workflows.