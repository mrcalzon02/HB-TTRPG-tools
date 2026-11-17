package org.cubechat.android;

import java.io.DataInputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** A direct client is refused by the test recipient; only the explicitly configured final relay may enter. */
public final class RelayRouteTest {
    private static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    private static Socket connect(InetAddress target, int port) throws Exception {
        Socket s = new Socket();
        s.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0));
        s.connect(new InetSocketAddress(target, port), 2000);
        s.setSoTimeout(3000);
        return s;
    }
    public static void main(String[] args) throws Exception {
        InetAddress first = InetAddress.getByName("127.0.0.2"), second = InetAddress.getByName("127.0.0.3"), end = InetAddress.getByName("127.0.0.4");
        Pairing recipient = Pairing.host(null), sender = Pairing.join(recipient.invite("0.0.0.0"));
        ExecutorService io = Executors.newCachedThreadPool();
        try (ServerSocket host = new ServerSocket(DirectProtocol.PORT, 4, end);
             RelayForwarder r1 = new RelayForwarder(first, second, true);
             RelayForwarder r2 = new RelayForwarder(second, end, false)) {
            io.submit(r1::serve); io.submit(r2::serve);
            Future<?> incoming = io.submit(() -> {
                try (Socket rejected = host.accept()) { check(!rejected.getInetAddress().equals(second)); }
                try (Socket hop = host.accept()) {
                    if (!hop.getInetAddress().equals(second)) throw new IOException("Final hop only");
                    try (DirectProtocol link = DirectProtocol.handshake(hop, true, recipient.identity, null, recipient.token,
                            peer -> check(Arrays.equals(peer, sender.identity.getPublic().getEncoded())))) {
                        DirectProtocol.Record msg = link.readRecord();
                        check(msg.type == DirectProtocol.MESSAGE && msg.sequence == 13 && msg.body.equals("opaque encrypted CubeChat envelope"));
                        link.write(DirectProtocol.RECEIPT, msg.sequence, "");
                        link.write(DirectProtocol.MESSAGE, 4, "reply from recipient");
                        check(link.readRecord().sequence == 4);
                    }
                }
                return null;
            });
            try (Socket direct = connect(end, DirectProtocol.PORT)) {
                try {
                    DirectProtocol.handshake(direct, false, sender.identity, sender.remote, sender.token, null);
                    throw new AssertionError("Direct connection unexpectedly authenticated");
                } catch (IOException expected) { /* The recipient disallows all direct traffic. */ }
            }
            try (Socket invalid = connect(first, RelayForwarder.PORT)) {
                RelayForwarder.request(invalid, 1); // Two repeaters are necessary; this request must stop at the first.
                check(new DataInputStream(invalid.getInputStream()).read() == -1);
            }
            try (Socket s = connect(first, RelayForwarder.PORT)) {
                RelayForwarder.request(s, 4);
                try (DirectProtocol link = DirectProtocol.handshake(s, false, sender.identity, sender.remote, sender.token, null)) {
                    link.write(DirectProtocol.MESSAGE, 13, "opaque encrypted CubeChat envelope");
                    DirectProtocol.Record receipt = link.readRecord(), reply = link.readRecord();
                    check(receipt.type == DirectProtocol.RECEIPT && receipt.sequence == 13);
                    check(reply.type == DirectProtocol.MESSAGE && reply.body.equals("reply from recipient"));
                    link.write(DirectProtocol.RECEIPT, reply.sequence, "");
                }
            }
            incoming.get(5, TimeUnit.SECONDS);
            try { RelayForwarder.localIpv4("203.0.113.8"); throw new AssertionError("Non-local forwarding target"); }
            catch (IOException expected) { /* Operators can only select local next hops and fixed CubeChat ports. */ }
            System.out.println("PASS direct path denied; A → two opt-in repeaters → B; duplex encrypted frames + end-to-end receipts; hop-budget and local-address limits");
        } finally { io.shutdownNow(); }
    }
}
