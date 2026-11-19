package org.cubechat.android;

import android.content.Context;
import java.util.ArrayList;
import java.util.List;

/**
 * Unconditional best-effort teardown of CubeChat-owned lockdown controls.
 *
 * Shared by the ordinary user-selected OFF action and reserved for an eventual
 * privileged, authenticated system-priority handoff. No emergency-call signal
 * is currently consumed by this class; a normal APK cannot promise one.
 *
 * No exported broadcast, network listener, or app-callable request-to-unlock
 * is provided. Unsupported root/kernel/modem adapters are NOT present.
 */
final class LockdownReleaseController {
    static final class Result {
        final boolean requestsCompleted;
        final String detail;
        Result(boolean requestsCompleted, String detail) {
            this.requestsCompleted = requestsCompleted;
            this.detail = detail;
        }
    }

    private LockdownReleaseController() { }

    static Result releaseAllOwnedControls(Context context) {
        Context app = context.getApplicationContext();
        List<String> failures = new ArrayList<>();
        // A failure to release one managed restriction must not prevent us from
        // dropping the local packet-discarder or attempting the other controls.
        try { ManagedLockdownController.release(app); }
        catch (Exception e) { failures.add("managed policies: " + safeName(e)); }
        try { LockdownFirewall.setArmed(app, false); }
        catch (Exception e) { failures.add("local deny preference: " + safeName(e)); }
        try { LockdownFirewall.stop(app); }
        catch (Exception e) { failures.add("VPN shutdown request: " + safeName(e)); }

        // These are REQUEST outcomes, NOT independent readbacks or proof of
        // the absence of platform-owned always-on VPN or privileged policies.
        if (failures.isEmpty())
            return new Result(true, "CubeChat release commands sent. Android-owned VPN "
                    + "settings and any future privileged helper require separate verification.");
        return new Result(false, "CubeChat release incomplete: " + String.join("; ", failures)
                + ". Check Android VPN settings; do not claim lockdown is gone.");
    }

    private static String safeName(Exception error) {
        return error.getClass().getSimpleName();
    }
}
