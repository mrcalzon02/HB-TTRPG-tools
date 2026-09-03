# Binary Cube strengthening survivability scoring

Status: experimental; runtime evidence required; not production cryptography.

`binary-cube-strengthening-survivability-score.js` converts the authoritative five-way structural-failure campaign into an explicit engineering comparison without changing any encryption or recovery behavior.

The score rewards exact recovery at 1.0 per case, gives detected failure (decoder rejection or integrity-detected wrong recovery) 0.35 credit, applies a -10 penalty to undetected wrong recovery, and divides the resulting survivability score by mean representation expansion for a cost-adjusted score. These weights are visible policy choices so users and integrations can understand the ranking instead of receiving an opaque recommendation.

A strategy is eligible for descriptive ordering only when every completed family reports no critical undetected wrong recovery. Ordering then uses eligibility, cost-adjusted score, raw survivability score, and lower expansion. The score is not a cryptographic strength measurement, security proof, or promotion decision.

Human surface: `binary-cube-strengthening-survivability-laboratory.html`. API operations: `describe()` and `scoreCampaign(request)`. AI projection: `skills/binary-cube-laboratory/survivability-tool-projection.json`. All three surfaces converge on the same scoring authority.

Next acceptance work should add runtime timing and recovered-damage-amplification aggregates to the failure campaign so cost adjustment can account for computational cost and propagation severity as well as representation expansion.