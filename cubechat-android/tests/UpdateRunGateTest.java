package org.cubechat.android;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

/** Pure host regressions: no HTTP, Android services, calling, or radio actions. */
public final class UpdateRunGateTest {
    private static int checks;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) throw new AssertionError(message);
    }

    private static void rejects(UpdateRunGate.Permit permit, String reason) {
        checks++;
        try {
            permit.verify();
            throw new AssertionError("Expected denied update request: " + reason);
        } catch (IOException expected) {
            check(expected.getMessage().contains("cancelled"), reason + " has clear cancellation");
        }
    }

    public static void main(String[] args) throws Exception {
        AtomicBoolean unlocked = new AtomicBoolean(true);
        UpdateRunGate.Permit first = UpdateRunGate.enter(unlocked::get);
        check(first.allowed(), "new unblocked request allowed");
        first.verify();
        check(true, "request may proceed while policy permits");

        unlocked.set(false);
        check(!first.allowed(), "persisted block revokes access");
        rejects(first, "locked policy");

        unlocked.set(true);
        check(first.allowed(), "permission alone can become available again");
        UpdateRunGate.invalidate();
        check(!first.allowed(), "activation epoch revokes earlier request");
        rejects(first, "stale activation epoch");

        UpdateRunGate.Permit renewed = UpdateRunGate.enter(unlocked::get);
        check(renewed.allowed(), "new authorized check may start after release");
        renewed.verify();
        UpdateRunGate.invalidate();
        unlocked.set(false);
        unlocked.set(true);
        check(!renewed.allowed(), "rapid on/off must not resurrect an earlier request");
        rejects(renewed, "rapid toggle");

        UpdateRunGate.Permit blocked = UpdateRunGate.enter(() -> false);
        check(!blocked.allowed(), "new request still denied by saved policy");
        rejects(blocked, "persisted lock");

        UpdateRunGate.Permit interrupted = UpdateRunGate.enter(() -> true);
        Thread.currentThread().interrupt();
        try {
            check(!interrupted.allowed(), "interruption also revokes work");
            rejects(interrupted, "interrupted worker");
        } finally {
            Thread.interrupted();
        }
        check(UpdateRunGate.enter(() -> true).allowed(),
                "later fresh manual check can proceed when explicitly permitted");

        System.out.println("UpdateRunGate: " + checks
                + " host-only checks passed; no network connections opened");
    }
}
