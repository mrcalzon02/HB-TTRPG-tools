package org.cubechat.android;

/**
 * Pure, host-testable accounting for ordinary user-requested release commands.
 *
 * Attempts every CubeChat-owned step even when an earlier step fails. A
 * successful command is NOT proof that Android, a VPN provider, or hardware
 * has actually relinquished a restriction.
 *
 * Does not inspect or trigger any telephony/calling or radio procedures.
 */
final class LockdownReleaseReport {
    interface Step { void run() throws Exception; }

    static final class Result {
        final boolean requestsCompleted;
        final String steps;
        final String detail;
        Result(boolean requestsCompleted, String steps, String detail) {
            this.requestsCompleted = requestsCompleted;
            this.steps = steps;
            this.detail = detail;
        }
    }

    private LockdownReleaseReport() { }

    static Result attempt(Step managed, Step disarm, Step stopVpn) {
        StringBuilder report = new StringBuilder();
        int failures = 0;
        failures += run("Managed-device release", managed, report);
        failures += run("CubeChat IP policy disarm", disarm, report);
        failures += run("CubeChat VPN stop request", stopVpn, report);
        boolean complete = failures == 0;
        String detail = complete
                ? "CubeChat cleanup commands completed. This is NOT independent proof "
                    + "that all Android-owned VPN settings or radio restrictions were removed."
                : failures + " CubeChat cleanup command(s) FAILED. All cleanup steps were "
                    + "attempted; check Recovery and Android VPN settings.";
        return new Result(complete, report.toString(), detail);
    }

    private static int run(String label, Step step, StringBuilder report) {
        if (report.length() > 0) report.append('\n');
        try {
            step.run();
            report.append(label).append(": REQUEST_COMPLETED (not independently verified)");
            return 0;
        } catch (Exception error) {
            report.append(label).append(": FAILED (")
                    .append(error.getClass().getSimpleName()).append(')');
            return 1;
        }
    }
}
