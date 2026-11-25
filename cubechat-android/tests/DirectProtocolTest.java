package org.cubechat.android;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.KeyPair;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Run with javac + java; uses two independent device identities and real duplex TCP sessions. */
public final class DirectProtocolTest {
    private static void assertTrue(boolean ok) { if (!ok) throw new AssertionError(); }

    private static void checkBounds() throws Exception {
        try (InboundHandshakePool pool = new InboundHandshakePool(2);
             Socket slow = new Socket(); Socket authenticated = new Socket(); Socket excess = new Socket()) {
            CountDownLatch blocked = new CountDownLatch(1), admitted = new CountDownLatch(1);
            CountDownLatch release = new CountDownLatch(1), finished = new CountDownLatch(1);
            try {
                assertTrue(pool.submit(slow, socket -> { blocked.countDown(); await(release); }));
                assertTrue(blocked.await(5, TimeUnit.SECONDS));
                assertTrue(pool.submit(authenticated, socket -> {
                    admitted.countDown();
                    await(release);
                    finished.countDown();
                }));
                assertTrue(admitted.await(5, TimeUnit.SECONDS));
                assertTrue(!pool.submit(excess, socket -> { throw new AssertionError("A full pool admitted another socket"); }));
                assertTrue(excess.isClosed() && !authenticated.isClosed());
                assertTrue(pool.promote(authenticated));
                pool.cancelPending();
                assertTrue(slow.isClosed() && !authenticated.isClosed());
            } finally { release.countDown(); }
            assertTrue(finished.await(5, TimeUnit.SECONDS));
        }
    }

    private static void await(CountDownLatch latch) {
        try { assertTrue(latch.await(5, TimeUnit.SECONDS)); }
        catch (InterruptedException stopped) { Thread.currentThread().interrupt(); }
    }

    private static byte[] readShare(byte[] transcript, byte[] identity) throws Exception {
        try (DataInputStream in = new DataInputStream(new ByteArrayInputStream(transcript))) {
            assertTrue(in.readInt() == DirectProtocol.MAGIC);
            assertTrue(Arrays.equals(DirectProtocol.readKey(in), identity));
            byte[] share = DirectProtocol.readKey(in);
            assertTrue(!Arrays.equals(share, identity));
            return share;
        }
    }

    private static OutputStream record(OutputStream target, ByteArrayOutputStream transcript) {
        return new OutputStream() {
            @Override public void write(int value) throws IOException { target.write(value); transcript.write(value); }
            @Override public void write(byte[] data, int offset, int length) throws IOException {
                target.write(data, offset, length);
                transcript.write(data, offset, length);
            }
            @Override public void flush() throws IOException { target.flush(); }
        };
    }

    public static void main(String[] args) throws Exception {
        checkBounds();
        KeyPair host = DirectProtocol.newIdentity(), guest = DirectProtocol.newIdentity();
        byte[] token = DirectProtocol.random(32), hostPublic = host.getPublic().getEncoded(), guestPublic = guest.getPublic().getEncoded();
        ExecutorService io = Executors.newSingleThreadExecutor();
        try (ServerSocket listener = new ServerSocket(0, 4, InetAddress.getLoopbackAddress())) {
            byte[] previousShare = null;
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
                ByteArrayOutputStream transcript = new ByteArrayOutputStream();
                try (Socket s = new Socket(listener.getInetAddress(), listener.getLocalPort());
                     DirectProtocol b = DirectProtocol.handshake(s.getInputStream(), record(s.getOutputStream(), transcript),
                             s, false, guest, hostPublic, token, null)) {
                    byte[] share = readShare(transcript.toByteArray(), guestPublic);
                    assertTrue(!Arrays.equals(share, previousShare));
                    previousShare = share;
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
            Future<Boolean> legacy = io.submit(() -> {
                try (Socket s = listener.accept()) {
                    DirectProtocol.handshake(s, true, host, guestPublic, token, peer -> { throw new AssertionError(); });
                    return false;
                } catch (IOException expected) { return expected.getMessage().contains("version"); }
            });
            try (Socket s = new Socket(listener.getInetAddress(), listener.getLocalPort())) {
                s.getOutputStream().write(new byte[]{'C','U','B','2'});
                s.getOutputStream().flush();
                assertTrue(legacy.get(10, TimeUnit.SECONDS));
            }
            System.out.println("PASS bounded handshakes, fresh ephemeral shares, duplex messages, authenticated receipts, ping, reconnect, pinned identity and legacy-version rejection");
        } finally { io.shutdownNow(); }
    }
}
