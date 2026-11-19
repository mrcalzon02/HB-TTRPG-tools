package org.cubechat.android;

import java.util.concurrent.atomic.AtomicInteger;

/** Ordinary manual-off accounting only; no networking, radios or calling. */
public final class LockdownReleaseReportTest {
    private static int assertions;

    private static void check(boolean ok, String reason) {
        assertions++;
        if (!ok) throw new AssertionError(reason);
    }

    private static void boom() {
        throw new IllegalStateException("secret service message must not be logged");
    }

    public static void main(String[] args) {
        AtomicInteger count = new AtomicInteger();
        LockdownReleaseReport.Result good = LockdownReleaseReport.attempt(
                () -> count.incrementAndGet(),
                () -> count.incrementAndGet(),
                () -> count.incrementAndGet());
        check(count.get() == 3, "all release commands executed");
        check(good.requestsCompleted, "all commands returned");
        check(good.steps.contains("Managed-device release: REQUEST_COMPLETED"), "managed step");
        check(good.steps.contains("CubeChat IP policy disarm: REQUEST_COMPLETED"), "local disarm");
        check(good.steps.contains("CubeChat VPN stop request: REQUEST_COMPLETED"), "VPN stop");
        check(good.detail.contains("NOT independent proof"), "do not claim actual removal");

        AtomicInteger second = new AtomicInteger();
        LockdownReleaseReport.Result partial = LockdownReleaseReport.attempt(
                () -> { second.incrementAndGet(); boom(); },
                () -> second.incrementAndGet(),
                () -> second.incrementAndGet());
        check(second.get() == 3, "later steps still attempted after first failure");
        check(!partial.requestsCompleted, "partial failure reported");
        check(partial.steps.contains("Managed-device release: FAILED"), "specific failing stage");
        check(partial.steps.contains("CubeChat IP policy disarm: REQUEST_COMPLETED"),
                "disarm attempted despite policy failure");
        check(partial.steps.contains("CubeChat VPN stop request: REQUEST_COMPLETED"),
                "VPN stop attempted despite policy failure");
        check(!partial.steps.contains("secret service"), "sensitive exception text excluded");

        AtomicInteger third = new AtomicInteger();
        LockdownReleaseReport.Result failed = LockdownReleaseReport.attempt(
                () -> { third.incrementAndGet(); boom(); },
                () -> { third.incrementAndGet(); boom(); },
                () -> { third.incrementAndGet(); boom(); });
        check(third.get() == 3, "all actions attempted despite all failures");
        check(!failed.requestsCompleted, "multiple failures cannot report success");
        check(failed.detail.contains("3 CubeChat cleanup"), "accurate failure count");

        LockdownReleaseReport.Result repeat = LockdownReleaseReport.attempt(
                () -> {}, () -> {}, () -> {});
        check(repeat.requestsCompleted, "ordinary manual repeat is safe at report level");
        check(repeat.steps.split("\n").length == 3, "three stable stage records");

        System.out.println("LockdownReleaseReport: " + assertions
                + " host-only assertions passed; no device actions");
    }
}
