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
 *
 * Ordinary immutable classes avoid Java record superclass/desugaring risks
 * on the project's Android 8.0 (API 26) minimum-supported devices.
 */
public final class GuardianTrafficPolicy {
    public static final int SCHEMA_VERSION = 1;

    public enum Layer { IPV4, IPV6, WIFI_MANAGEMENT, BLUETOOTH, CELLULAR_SIGNALING, UNKNOWN }
    public enum Direction { INGRESS, EGRESS }
    public enum Protocol { TCP, UDP, ICMP, OTHER }
    public enum Purpose { CUBECHAT_PEER, CUBECHAT_DISCOVERY, CUBECHAT_RELAY, CRITICAL_SERVICE }
    public enum Verdict { ALLOW, DROP, OUTSIDE_IP_ENFORCEMENT }

    /** Kernel-observed exact flow identity; never trust app-provided values. */
    public static final class Flow {
        public final int uid, peerPort;
        public final long socketCookie, policyGeneration;
        public final Layer layer;
        public final Direction direction;
        public final Protocol protocol;
        public final String peerAddress, networkInterface;

        public Flow(int uid, long socketCookie, Layer layer, Direction direction,
                    Protocol protocol, String peerAddress, int peerPort,
                    String networkInterface, long policyGeneration) {
            if (uid < 0 || socketCookie <= 0 || policyGeneration <= 0
                    || peerPort < 0 || peerPort > 65535)
                throw new IllegalArgumentException("Invalid kernel-observed flow identity");
            this.layer = Objects.requireNonNull(layer, "layer");
            this.direction = Objects.requireNonNull(direction, "direction");
            this.protocol = Objects.requireNonNull(protocol, "protocol");
            this.peerAddress = Objects.requireNonNull(peerAddress, "peerAddress");
            this.networkInterface = Objects.requireNonNull(networkInterface, "interface");
            if (blank(peerAddress) || blank(networkInterface))
                throw new IllegalArgumentException("Unresolved peer or interface");
            this.uid = uid;
            this.socketCookie = socketCookie;
            this.peerPort = peerPort;
            this.policyGeneration = policyGeneration;
        }

        // Equivalent to String.isBlank for Unicode whitespace, but does not
        // require the newer JDK String method on Android 8.0.
        private static boolean blank(String text) {
            for (int i = 0; i < text.length(); i++)
                if (!Character.isWhitespace(text.charAt(i))) return false;
            return true;
        }

        public int uid() { return uid; }
        public long socketCookie() { return socketCookie; }
        public Layer layer() { return layer; }
        public Direction direction() { return direction; }
        public Protocol protocol() { return protocol; }
        public String peerAddress() { return peerAddress; }
        public int peerPort() { return peerPort; }
        public String networkInterface() { return networkInterface; }
        public long policyGeneration() { return policyGeneration; }

        @Override public boolean equals(Object value) {
            if (this == value) return true;
            if (!(value instanceof Flow)) return false;
            Flow other = (Flow) value;
            return uid == other.uid && socketCookie == other.socketCookie
                    && peerPort == other.peerPort && policyGeneration == other.policyGeneration
                    && layer == other.layer && direction == other.direction
                    && protocol == other.protocol && peerAddress.equals(other.peerAddress)
                    && networkInterface.equals(other.networkInterface);
        }

        @Override public int hashCode() {
            return Objects.hash(uid, socketCookie, layer, direction, protocol,
                    peerAddress, peerPort, networkInterface, policyGeneration);
        }
    }

    /**
     * Exact, short-lived authorization from a hypothetical trusted controller.
     * No UID wildcard, address subnet, any-port, or all-system-app grant exists.
     */
    public static final class Permit {
        public final Flow flow;
        public final Purpose purpose;
        public final long expiresAtElapsedNanos;

        public Permit(Flow flow, Purpose purpose, long expiresAtElapsedNanos) {
            this.flow = Objects.requireNonNull(flow, "flow");
            this.purpose = Objects.requireNonNull(purpose, "purpose");
            if (flow.layer != Layer.IPV4 && flow.layer != Layer.IPV6)
                throw new IllegalArgumentException(
                        "Cannot authorize a non-IP radio layer with an IP permit");
            if (expiresAtElapsedNanos <= 0)
                throw new IllegalArgumentException("Permit requires finite monotonic expiration");
            this.expiresAtElapsedNanos = expiresAtElapsedNanos;
        }

        public Flow flow() { return flow; }
        public Purpose purpose() { return purpose; }
        public long expiresAtElapsedNanos() { return expiresAtElapsedNanos; }

        @Override public boolean equals(Object value) {
            if (this == value) return true;
            if (!(value instanceof Permit)) return false;
            Permit other = (Permit) value;
            return expiresAtElapsedNanos == other.expiresAtElapsedNanos
                    && purpose == other.purpose && flow.equals(other.flow);
        }

        @Override public int hashCode() {
            return Objects.hash(flow, purpose, expiresAtElapsedNanos);
        }
    }

    private final long generation;
    private final Set<Permit> permits;

    public GuardianTrafficPolicy(long generation, Set<Permit> permits) {
        if (generation <= 0)
            throw new IllegalArgumentException("Policy generation must be positive");
        this.generation = generation;
        this.permits = Collections.unmodifiableSet(
                new HashSet<>(Objects.requireNonNull(permits)));
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
