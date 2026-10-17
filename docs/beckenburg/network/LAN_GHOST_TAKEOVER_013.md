# Beckenburg Alpha 2.0 — Human-ghost disconnect continuity

A disconnected human ghost yields control to the existing host AI without resetting ghost room, pose, resources, legal action cooldowns, active manifestations or pending attacks. Connected hunters continue the current case. The host transmits a clear takeover notice and updated AI lobby label. Hunter disconnect still terminates this experimental LAN match; reconnect and Windows LAN acceptance remain unsatisfied.

The host owns a single monotonic GhostDomain command sequence spanning both human and AI controllers. Per-peer input sequence checks remain in place, so client replay and impersonation are still rejected. This prevents post-takeover AI power rejection caused by incompatible controller-local sequence numbers.

Regression: LanGhostTakeoverIntegrationTest uses four actual TCP seats, two prior human powers, live disconnect, an AI power after a fresh hunter sound, and hunter-disconnect behavior. Previous ghost sound-state integration coverage is retained as LanGhostLegacyHearingIntegrationTest. Build scripts execute both that original test and the new directional hearing test exactly once. Full clean-source Java 17 build, Windows GUI and multi-PC tests are unverified.
