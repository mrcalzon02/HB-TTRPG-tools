package org.cubechat.android;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * Host-testable, OFFLINE model of a proposed Guardian kernel IP policy.
 * This class does not filter real traffic, open sockets, load eBPF, or control
 * Android's modem. Its verdicts must NEVER be used as enforcement attestation.
 *
 * In an eventual device adapter, packet identity (UID, socket cookie, interface,
 * destination) must come from the kernel; permits must come from a separately
 * authenticated guardian, not untrusted app-provided values.
 */
public final class GuardianTrafficPolicy {
    public static final int SCHEMA_VERSION = 1;

    public enum Layer { IPV4, IPV6, WIFI_MANAGEMENT, BLUETOOTH, CELLULAR_SIGNALING, UNKNOWN }
    public enum Direction { INGRESS, EGRESS }
    public enum Protocol { TCP, UDP, ICMP, OTHER }
    public enum Purpose { CUBECHAT_PEER, CUBECHAT_DISCOVERY, CUBECHAT_RELAY, CRITICAL_SERVICE }
    public enum Verdict { ALLOW, DROP, OUTSIDE_IP_ENFORCEMENT }

    /** An independently observed flow. Identity and destination cannot be set by the requesting app. */
    public record Flow(int uid, long socketCookie, Layer layer, Direction direction,
                       Protocol protocol, String peerAddress, int peerPort,
                       String networkInterface, long policyGeneration) {
        public Flow {
            if (uid < 0 || socketCookie <= 0 || policyGeneration <= 0
                    || peerPort < 0 || peerPort > 65535)
                throw new IllegalArgumentException("Invalid kernel-observed flow identity");
            Objects.requireNonNull(layer);
            Objects.requireNonNull(direction);
            Objects.requireNonNull(protocol);
            peerAddress = Objects.requireNonNull(peerAddress);
            networkInterface = Objects.requireNonNull(networkInterface);
            if (peerAddress.isBlank() || networkInterface.isBlank())
                throw new IllegalArgumentException("Unresolved peer or interface");
        }
    }

    /**
     * Exact, short-lived authorization from the hypothetical trusted controller.
     * No UID wildcard, address subnet, any-port, or all-system-app grant exists.
     */
    public record Permit(Flow flow, Purpose purpose, long expiresAtElapsedNanos) {
        public Permit {
            Objects.requireNonNull(flow);
            Objects.requireNonNull(purpose);
            if (flow.layer != Layer.IPV4 && flow.layer != Layer.IPV6)
                throw new IllegalArgumentException("Cannot authorize a non-IP radio layer with an IP permit");
            if (expiresAtElapsedNanos <= 0)
                throw new IllegalArgumentException("Permit requires finite monotonic expiration");
        }
    }

    private final long generation;
    private final Set<Permit> permits;

    public GuardianTrafficPolicy(long generation, Set<Permit> permits) {
        if (generation <= 0) throw new IllegalArgumentException("Policy generation must be positive");
        this.generation = generation;
        this.permits = Collections.unmodifiableSet(new HashSet<>(Objects.requireNonNull(permits)));
        for (Permit permit : this.permits) {
            if (permit == null || permit.flow.policyGeneration != generation)
                throw new IllegalArgumentException("Stale, invalid or mismatched permit");
        }
    }

    public static GuardianTrafficPolicy defaultDeny(long generation) {
        return new GuardianTrafficPolicy(generation, Collections.emptySet());
    }

    public long generation() { return generation; }

    public Verdict evaluate(Flow observed, long elapsedNanos) {
        Objects.requireNonNull(observed);
        // Non-IP and modem/RF operations require OTHER, independent enforcement.
        // Reporting OUTSIDE_IP_ENFORCEMENT is not the same as allowing them.
        if (observed.layer != Layer.IPV4 && observed.layer != Layer.IPV6)
            return Verdict.OUTSIDE_IP_ENFORCEMENT;
        if (observed.policyGeneration != generation || elapsedNanos < 0)
            return Verdict.DROP;
        for (Permit permit : permits) {
            if (permit.expiresAtElapsedNanos > elapsedNanos && permit.flow.equals(observed))
                return Verdict.ALLOW;
        }
        return Verdict.DROP;
    }
}
