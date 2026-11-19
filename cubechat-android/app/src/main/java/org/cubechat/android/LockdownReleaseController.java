package org.cubechat.android;

import android.content.Context;

/**
 * Ordinary best-effort teardown of CubeChat-owned lockdown controls.
 *
 * The report records command attempts, not independent readback.
 * The future trusted system-priority handoff is not implemented here;
 * this class never consumes calling or emergency protocol state.
 */
final class LockdownReleaseController {
    static final class Result {
        final boolean requestsCompleted;
        final String detail;
        final String stepSummary;

        Result(boolean requestsCompleted, String detail, String stepSummary) {
            this.requestsCompleted = requestsCompleted;
            this.detail = detail;
            this.stepSummary = stepSummary;
        }
    }

    private LockdownReleaseController() { }

    static Result releaseAllOwnedControls(Context context) {
        Context app = context.getApplicationContext();
        LockdownReleaseReport.Result attempted = LockdownReleaseReport.attempt(
                () -> ManagedLockdownController.release(app),
                () -> LockdownFirewall.setArmed(app, false),
                () -> LockdownFirewall.stop(app));
        return new Result(attempted.requestsCompleted, attempted.detail, attempted.steps);
    }
}
