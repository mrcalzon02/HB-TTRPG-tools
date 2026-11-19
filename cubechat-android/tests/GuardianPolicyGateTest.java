package org.cubechat.android;

import java.util.Map;

/** Synthetic policy/readback tests; a green result here is NOT hardware validation. */
public final class GuardianPolicyGateTest {
    private static int assertions;
    private static void check(boolean value, String msg) {
        assertions++;
        if (!value) throw new AssertionError(msg);
    }
    public static void main(String[] ignored) {
        Map<GuardianPolicyGate.Surface, GuardianPolicyGate.Proof> proofs = GuardianPolicyGate.empty();
        check(proofs.size() == 8, "all security surfaces represented");
        check(GuardianPolicyGate.assess(false, null).outcome == GuardianPolicyGate.Outcome.OFF, "off state");
        check(GuardianPolicyGate.assess(true, null).outcome == GuardianPolicyGate.Outcome.PARTIAL, "missing proofs");
        check(GuardianPolicyGate.assess(true, proofs).outcome == GuardianPolicyGate.Outcome.PARTIAL, "all unknown");
        for (GuardianPolicyGate.Surface s : GuardianPolicyGate.Surface.values()) {
            proofs.put(s, GuardianPolicyGate.Proof.REQUESTED);
            check(GuardianPolicyGate.assess(true, proofs).outcome == GuardianPolicyGate.Outcome.PARTIAL,
                    "requested cannot impersonate verified for " + s);
        }
        for (GuardianPolicyGate.Surface s : GuardianPolicyGate.Surface.values()) {
            proofs.put(s, GuardianPolicyGate.Proof.VERIFIED_READBACK);
        }
        check(GuardianPolicyGate.assess(true, proofs).outcome == GuardianPolicyGate.Outcome.VERIFIED,
                "all independent readbacks");
        for (GuardianPolicyGate.Surface s : GuardianPolicyGate.Surface.values()) {
            for (GuardianPolicyGate.Proof unsafe : new GuardianPolicyGate.Proof[]{
                    GuardianPolicyGate.Proof.UNKNOWN, GuardianPolicyGate.Proof.REQUESTED,
                    GuardianPolicyGate.Proof.UNSUPPORTED}) {
                proofs.put(s, unsafe);
                check(GuardianPolicyGate.assess(true, proofs).outcome == GuardianPolicyGate.Outcome.PARTIAL,
                        "unsafe/unsupported must not elevate " + s + " / " + unsafe);
            }
            proofs.put(s, GuardianPolicyGate.Proof.FAILED);
            check(GuardianPolicyGate.assess(true, proofs).outcome == GuardianPolicyGate.Outcome.FAILED,
                    "failure must be reported for " + s);
            proofs.put(s, GuardianPolicyGate.Proof.VERIFIED_READBACK);
        }
        check(GuardianPolicyGate.assess(true, proofs).outcome == GuardianPolicyGate.Outcome.VERIFIED,
                "restored after reset");
        System.out.println("PASS GuardianPolicyGateTest: " + assertions + " assertions; no privileged actions");
    }
}
