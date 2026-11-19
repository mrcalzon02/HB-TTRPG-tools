package org.cubechat.android;

import java.util.Set;
import org.cubechat.android.GuardianTrafficPolicy.*;

public final class GuardianTrafficPolicyTest {
    private static int assertions;

    private static void expect(boolean ok, String why) {
        assertions++;
        if (!ok) throw new AssertionError(why);
    }

    private static void rejects(Runnable call, String why) {
        assertions++;
        try {
            call.run();
            throw new AssertionError("Expected refusal: " + why);
        } catch (IllegalArgumentException expected) {
            // Reject invalid or unintended grants rather than weakening the rule.
        }
    }

    private static Flow flow(int uid, long cookie, Layer layer, Direction direction,
                             Protocol protocol, String ip, int port, String iface, long generation) {
        return new Flow(uid, cookie, layer, direction, protocol, ip, port, iface, generation);
    }

    public static void main(String[] args) {
        long generation = 22L;
        Flow chat = flow(10234, 41, Layer.IPV4, Direction.EGRESS,
                Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation);
        GuardianTrafficPolicy empty = GuardianTrafficPolicy.defaultDeny(generation);
        expect(GuardianTrafficPolicy.SCHEMA_VERSION == 1, "contract version");
        expect(empty.generation() == generation, "default policy generation");
        expect(!Flow.class.isRecord() && !Permit.class.isRecord(),
                "Android 8 compatibility: no Java record superclass");
        Flow duplicateChat = flow(10234, 41, Layer.IPV4, Direction.EGRESS,
                Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation);
        expect(chat.equals(duplicateChat), "immutable flow preserves record-like equality");
        expect(chat.hashCode() == duplicateChat.hashCode(), "equal flows hash identically");
        expect(chat.uid() == 10234 && chat.socketCookie() == 41
                && chat.policyGeneration() == generation, "original accessor contract retained");
        expect(empty.evaluate(chat, 100) == Verdict.DROP, "default deny CubeChat too");

        Flow[] unauthorized = {
                flow(10300, 50, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "1.1.1.1", 443, "rmnet0", generation),
                flow(10300, 51, Layer.IPV6, Direction.EGRESS, Protocol.TCP, "2606:4700::1111", 443, "rmnet0", generation),
                flow(10300, 52, Layer.IPV4, Direction.EGRESS, Protocol.UDP, "8.8.8.8", 53, "wlan0", generation),
                flow(10300, 53, Layer.IPV6, Direction.EGRESS, Protocol.UDP, "2001:4860::8888", 53, "wlan0", generation),
                flow(10300, 54, Layer.IPV4, Direction.EGRESS, Protocol.UDP, "203.0.113.9", 443, "wlan0", generation),
                flow(10300, 55, Layer.IPV4, Direction.INGRESS, Protocol.TCP, "198.51.100.5", 8888, "wlan0", generation),
                flow(1000, 56, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "8.8.4.4", 443, "rmnet0", generation),
                flow(0, 57, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "8.8.4.4", 443, "rmnet0", generation)
        };
        for (Flow request : unauthorized)
            expect(empty.evaluate(request, 1) == Verdict.DROP,
                    "no implicit IP exemption for DNS, QUIC, incoming, root or system");

        Permit shortChat = new Permit(chat, Purpose.CUBECHAT_PEER, 1000);
        Permit sameGrant = new Permit(duplicateChat, Purpose.CUBECHAT_PEER, 1000);
        expect(shortChat.equals(sameGrant), "immutable permit preserves exact-match equality");
        expect(shortChat.hashCode() == sameGrant.hashCode(), "equal permits hash identically");
        expect(shortChat.expiresAtElapsedNanos() == 1000,
                "legacy permit expiration accessor retained");
        GuardianTrafficPolicy active = new GuardianTrafficPolicy(generation, Set.of(shortChat));
        expect(active.evaluate(chat, 1) == Verdict.ALLOW, "precisely authorized peer allowed");
        expect(active.evaluate(chat, 999) == Verdict.ALLOW, "permit valid before expiry");
        expect(active.evaluate(chat, 1000) == Verdict.DROP, "permit expired at bound");
        expect(active.evaluate(chat, 2000) == Verdict.DROP, "expired permit stays denied");
        expect(active.evaluate(chat, -1) == Verdict.DROP, "no unknown monotonic clock");

        Flow[] bypass = {
                flow(10300, 41, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation),
                flow(10234, 99, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation),
                flow(10234, 41, Layer.IPV4, Direction.EGRESS, Protocol.UDP, "192.168.88.2", 47743, "wlan0", generation),
                flow(10234, 41, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "192.168.88.2", 444, "wlan0", generation),
                flow(10234, 41, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "192.168.88.3", 47743, "wlan0", generation),
                flow(10234, 41, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "192.168.88.2", 47743, "rmnet0", generation),
                flow(10234, 41, Layer.IPV4, Direction.INGRESS, Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation),
                flow(10234, 41, Layer.IPV6, Direction.EGRESS, Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation),
                flow(10234, 41, Layer.IPV4, Direction.EGRESS, Protocol.TCP, "192.168.88.2", 47743, "wlan0", generation + 1)
        };
        for (Flow request : bypass)
            expect(active.evaluate(request, 50) == Verdict.DROP,
                    "mismatch must not inherit authorization");

        for (Layer radio : new Layer[]{Layer.CELLULAR_SIGNALING, Layer.WIFI_MANAGEMENT,
                Layer.BLUETOOTH, Layer.UNKNOWN}) {
            Flow nonIp = flow(10300, 777, radio, Direction.EGRESS,
                    Protocol.OTHER, "radio", 0, "radio0", generation);
            expect(active.evaluate(nonIp, 10) == Verdict.OUTSIDE_IP_ENFORCEMENT,
                    "IP policy must not claim to block non-IP signaling");
            rejects(() -> new Permit(nonIp, Purpose.CRITICAL_SERVICE, 50),
                    "cannot masquerade modem permission as an IP permit");
        }

        Flow critical = flow(1001, 71, Layer.IPV6, Direction.EGRESS, Protocol.UDP,
                "2001:db8::10", 4500, "rmnet0", generation);
        expect(active.evaluate(critical, 1) == Verdict.DROP, "no broad system survival exemption");
        Permit criticalGrant = new Permit(critical, Purpose.CRITICAL_SERVICE, 500);
        GuardianTrafficPolicy criticalPolicy = new GuardianTrafficPolicy(generation, Set.of(criticalGrant));
        expect(criticalPolicy.evaluate(critical, 50) == Verdict.ALLOW,
                "specific narrowly granted survival flow");
        expect(criticalPolicy.evaluate(chat, 50) == Verdict.DROP,
                "critical grant cannot authorize chat implicitly");
        rejects(() -> new GuardianTrafficPolicy(generation + 1, Set.of(shortChat)),
                "policy generation pinning");
        rejects(() -> new GuardianTrafficPolicy(0, Set.of()), "generation zero");
        rejects(() -> new Permit(chat, Purpose.CUBECHAT_PEER, 0), "permit no lifetime");
        rejects(() -> flow(-1, 42, Layer.IPV4, Direction.EGRESS, Protocol.TCP,
                "192.0.2.1", 80, "wlan0", generation), "invalid uid");
        rejects(() -> flow(42, 0, Layer.IPV4, Direction.EGRESS, Protocol.TCP,
                "192.0.2.1", 80, "wlan0", generation), "no socket identity");

        System.out.println("GuardianTrafficPolicy: " + assertions
                + " offline model assertions passed (NOT a live firewall test)");
    }
}
