#!/usr/bin/env bash
# Host-only integration test of actual release controller source.
# The Android Context and policy providers are inert stubs; no device actions.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/src/android/content" "$tmp/src/org/cubechat/android" "$tmp/classes"

cat > "$tmp/src/android/content/Context.java" <<'STUB'
package android.content;
public class Context {
    public Context getApplicationContext() { return this; }
}
STUB

cat > "$tmp/src/org/cubechat/android/ManagedLockdownController.java" <<'STUB'
package org.cubechat.android;
import android.content.Context;
final class ManagedLockdownController {
    static int calls;
    static boolean fail;
    static void release(Context context) {
        calls++;
        if (fail) throw new IllegalStateException("sensitive managed failure detail");
    }
}
STUB

cat > "$tmp/src/org/cubechat/android/LockdownFirewall.java" <<'STUB'
package org.cubechat.android;
import android.content.Context;
final class LockdownFirewall {
    static int disarmCalls, stopCalls;
    static boolean failDisarm, failStop;
    static void setArmed(Context context, boolean value) {
        if (value) throw new AssertionError("Unrelated arming must not occur");
        disarmCalls++;
        if (failDisarm) throw new IllegalStateException("sensitive preference detail");
    }
    static void stop(Context context) {
        stopCalls++;
        if (failStop) throw new IllegalStateException("sensitive VPN detail");
    }
}
STUB

cat > "$tmp/src/org/cubechat/android/LockdownReleaseControllerHostTest.java" <<'TEST'
package org.cubechat.android;
import android.content.Context;
public final class LockdownReleaseControllerHostTest {
    private static int checks;
    private static void check(boolean condition, String explanation) {
        checks++;
        if (!condition) throw new AssertionError(explanation);
    }
    public static void main(String[] args) {
        Context context = new Context();
        LockdownReleaseController.Result normal =
                LockdownReleaseController.releaseAllOwnedControls(context);
        check(normal.requestsCompleted, "normal commands complete");
        check(ManagedLockdownController.calls == 1, "managed release invoked");
        check(LockdownFirewall.disarmCalls == 1, "disarm invoked");
        check(LockdownFirewall.stopCalls == 1, "VPN stop invoked");
        check(normal.stepSummary.contains("Managed-device release: REQUEST_COMPLETED"), "receipt kept");

        ManagedLockdownController.fail = true;
        LockdownReleaseController.Result managedFailure =
                LockdownReleaseController.releaseAllOwnedControls(context);
        check(!managedFailure.requestsCompleted, "managed failure visible");
        check(LockdownFirewall.disarmCalls == 2, "preference disarm continues");
        check(LockdownFirewall.stopCalls == 2, "VPN stop continues");
        check(!managedFailure.stepSummary.contains("sensitive"), "no exception message leakage");

        LockdownFirewall.failDisarm = true;
        LockdownFirewall.failStop = true;
        LockdownReleaseController.Result allFailures =
                LockdownReleaseController.releaseAllOwnedControls(context);
        check(!allFailures.requestsCompleted, "multiple failures reported");
        check(ManagedLockdownController.calls == 3, "managed step not skipped");
        check(LockdownFirewall.disarmCalls == 3, "disarm still attempted");
        check(LockdownFirewall.stopCalls == 3, "VPN stop still attempted");
        check(allFailures.detail.contains("3 CubeChat cleanup"), "accurate failure count");
        System.out.println("LockdownReleaseController: " + checks
                + " host-only integration assertions passed; all providers stubbed");
    }
}
TEST

javac --release 17 -encoding UTF-8 -d "$tmp/classes" \
    "$tmp/src/android/content/Context.java" \
    "$tmp/src/org/cubechat/android/ManagedLockdownController.java" \
    "$tmp/src/org/cubechat/android/LockdownFirewall.java" \
    "$here/app/src/main/java/org/cubechat/android/LockdownReleaseReport.java" \
    "$here/app/src/main/java/org/cubechat/android/LockdownReleaseController.java" \
    "$tmp/src/org/cubechat/android/LockdownReleaseControllerHostTest.java"
java -cp "$tmp/classes" org.cubechat.android.LockdownReleaseControllerHostTest
