package org.cubechat.android;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.KeyPair;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Run with javac + java; uses two independent device identities and real duplex TCP sessions. */
public final class DirectProtocolTest {
    private static void assertTrue(boolean ok) { if (!ok) throw new AssertionError(); }
    public static void main(String[] args) throws Exception {
        KeyPair host = DirectProtocol.newIdentity(), guest = DirectProtocol.newIdentity();
        byte[] token = DirectProtocol.random(32), hostPublic = host.getPublic().getEncoded(), guestPublic = guest.getPublic().getEncoded();
        ExecutorService io = Executors.newSingleThreadExecutor();
        try (ServerSocket listener = new ServerSocket(0, 4, InetAddress.getLoopbackAddress())) {
            for (int pass = 0; pass < 2; pass++) {
                byte[] pinned = pass == 0 ? null : guestPublic;
                Future<?> served = io.submit(() -> {
                    try (Socket s = listener.accept(); DirectProtocol a = DirectProtocol.handshake(s, true, host, pinned, token,
                            peer -> assertTrue(Arrays.equals(peer, guestPublic)))) {
                        DirectProtocol.Record idle = a.readRecord(), probe = a.readRecord();
                        assertTrue(idle.type == DirectProtocol.HEARTBEAT && !DirectProtocol.pingRequest(idle.sequence));
                        assertTrue(probe.type == DirectProtocol.HEARTBEAT && DirectProtocol.pingRequest(probe.sequence));
                        a.write(DirectProtocol.HEARTBEAT, probe.sequence + 1, "");
                        DirectProtocol.Record inbound = a.readRecord();
                        assertTrue(inbound.type == DirectProtocol.MESSAGE && inbound.sequence == 1 && inbound.body.equals("North pier / 21:00 🌊"));
                        a.write(DirectProtocol.RECEIPT, inbound.sequence, "");
                        a.write(DirectProtocol.MESSAGE, 2, "SYNC OK");
                        DirectProtocol.Record receipt = a.readRecord();
                        assertTrue(receipt.type == DirectProtocol.RECEIPT && receipt.sequence == 2);
                    }
                    return null;
                });
                try (Socket s = new Socket(listener.getInetAddress(), listener.getLocalPort());
                     DirectProtocol b = DirectProtocol.handshake(s, false, guest, hostPublic, token, null)) {
                    long challenge = DirectProtocol.pingChallenge();
                    b.write(DirectProtocol.HEARTBEAT, 0, "");
                    b.write(DirectProtocol.HEARTBEAT, challenge, "");
                    DirectProtocol.Record pong = b.readRecord();
                    assertTrue(pong.type == DirectProtocol.HEARTBEAT && pong.sequence == challenge + 1 && !DirectProtocol.pingRequest(pong.sequence));
                    b.write(DirectProtocol.MESSAGE, 1, "North pier / 21:00 🌊");
                    DirectProtocol.Record receipt = b.readRecord(), reply = b.readRecord();
                    assertTrue(receipt.type == DirectProtocol.RECEIPT && receipt.sequence == 1);
                    assertTrue(reply.type == DirectProtocol.MESSAGE && reply.sequence == 2 && reply.body.equals("SYNC OK"));
                    b.write(DirectProtocol.RECEIPT, reply.sequence, "");
                }
                served.get(10, TimeUnit.SECONDS);
            }
            Future<Boolean> refused = io.submit(() -> {
                try (Socket s = listener.accept()) {
                    DirectProtocol.handshake(s, true, host, guestPublic, token, peer -> { throw new AssertionError(); });
                    return false;
                } catch (java.io.IOException expected) { return true; }
            });
            try (Socket s = new Socket(listener.getInetAddress(), listener.getLocalPort())) {
                try {
                    DirectProtocol.handshake(s, false, DirectProtocol.newIdentity(), hostPublic, token, null);
                    throw new AssertionError("Replaced pinned identity");
                } catch (java.io.IOException expected) { /* Server closed this unpaired connection. */ }
            }
            assertTrue(refused.get(10, TimeUnit.SECONDS));
            System.out.println("PASS fresh pairing, duplex messages, authenticated receipts and correlated ping replies, reconnect, and pinned identity enforcement");
        } finally { io.shutdownNow(); }
    }
}
