package io.github.mrcalzon02.barotrauma.simulation;

import java.time.Duration;
import java.time.Instant;

/** Headless contract for bounded restart catch-up planning. */
public final class PassiveWorldCatchUpPolicyVerification {
    private PassiveWorldCatchUpPolicyVerification() { }

    public static void main(String[] args) {
        Instant now = Instant.parse("2026-08-22T00:00:00Z");

        var noHistory = PassiveWorldCatchUpPolicy.plan(null, now, Duration.ofSeconds(5), 2);
        require(!noHistory.required(), "A world with no prior cycle history requested catch-up.");

        var shortGap = PassiveWorldCatchUpPolicy.plan(now.minusSeconds(24), now, Duration.ofSeconds(5), 2);
        require(shortGap.elapsedCycles() == 4, "Short downtime produced the wrong missed-cycle count.");
        require(shortGap.requestedTicks() == 8 && shortGap.appliedTicks() == 8 && !shortGap.capped(),
                "Short downtime was not preserved exactly.");

        var subCadence = PassiveWorldCatchUpPolicy.plan(now.minusSeconds(4), now, Duration.ofSeconds(5), 3);
        require(!subCadence.required(), "Sub-cadence downtime incorrectly advanced the world.");

        var hugeGap = PassiveWorldCatchUpPolicy.plan(now.minus(Duration.ofDays(30)), now,
                Duration.ofSeconds(1), 20);
        require(hugeGap.required(), "Long downtime failed to request catch-up.");
        require(hugeGap.appliedTicks() == PassiveWorldCatchUpPolicy.MAX_RESTART_CATCH_UP_TICKS,
                "Long downtime did not stop at the hard passive transaction cap.");
        require(hugeGap.capped(), "Long downtime was not marked as bounded/capped.");

        var futureStamp = PassiveWorldCatchUpPolicy.plan(now.plusSeconds(60), now, Duration.ofSeconds(5), 1);
        require(!futureStamp.required(), "A future last-cycle timestamp requested backward catch-up.");

        System.out.println("Passive world bounded restart catch-up policy verification passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
