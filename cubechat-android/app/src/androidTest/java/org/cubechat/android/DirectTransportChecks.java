package org.cubechat.android;

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

/** Exercise the shipping CUB3 implementation with Android crypto and loopback TCP. */
final class DirectTransportChecks {
    private static final String MESSAGE = "emulator test ✓";

    static void run() throws Exception {
        Pairing host = Pairing.host(null);
        Pairing guest = Pairing.join(host.invite("127.0.0.1"));
        byte[] guestPublic = guest.identity.getPublic().getEncoded();
        InetAddress loopback = InetAddress.getByAddress(new byte[]{127, 0, 0, 1});
        ExecutorService listenerThread = Executors.newSingleThreadExecutor();
        try (ServerSocket listener = new ServerSocket(0, 2, loopback)) {
            listener.setSoTimeout(5_000);
            InetSocketAddress address = new InetSocketAddress(loopback, listener.getLocalPort());
            exchange(listenerThread, listener, address, host, guest, guestPublic, null);
            exchange(listenerThread, listener, address, host, guest, guestPublic, guestPublic);

            Future<Boolean> refused = listenerThread.submit(() -> {
                try (Socket socket = listener.accept();
                     DirectProtocol ignored = DirectProtocol.handshake(socket, true, host.identity, guestPublic,
                             host.token, peer -> { throw new AssertionError("Unauthenticated peer admitted"); })) {
                    return false;
                } catch (IOException rejected) {
                    return true;
                }
            });
            byte[] wrongToken = guest.token.clone();
            wrongToken[0] ^= 1;
            try (Socket socket = new Socket()) {
                socket.connect(address, 5_000);
                try (DirectProtocol ignored = DirectProtocol.handshake(socket, false, guest.identity, guest.remote,
                        wrongToken, null)) {
                    throw new AssertionError("CUB3 accepted a wrong pairing secret");
                } catch (IOException expected) {
                    // The actual Android provider rejected key confirmation.
                }
            }
            check(refused.get(10, TimeUnit.SECONDS), "Host accepted an unauthenticated peer");
        } finally {
            listenerThread.shutdownNow();
        }
    }

    private static void exchange(ExecutorService worker, ServerSocket listener, InetSocketAddress address,
                                 Pairing host, Pairing guest, byte[] guestPublic, byte[] pinned) throws Exception {
        Future<?> accepted = worker.submit(() -> {
            try (Socket socket = listener.accept();
                 DirectProtocol peer = DirectProtocol.handshake(socket, true, host.identity, pinned, host.token,
                         key -> check(Arrays.equals(key, guestPublic), "Incorrect guest identity"))) {
                DirectProtocol.Record request = peer.readRecord();
                check(request.type == DirectProtocol.MESSAGE && request.sequence == 1 && MESSAGE.equals(request.body),
                        "CUB3 changed the Android TCP message");
                peer.write(DirectProtocol.RECEIPT, request.sequence, "");
            }
            return null;
        });
        try (Socket socket = new Socket()) {
            socket.connect(address, 5_000);
            try (DirectProtocol peer = DirectProtocol.handshake(socket, false, guest.identity, guest.remote,
                    guest.token, null)) {
                peer.write(DirectProtocol.MESSAGE, 1, MESSAGE);
                DirectProtocol.Record receipt = peer.readRecord();
                check(receipt.type == DirectProtocol.RECEIPT && receipt.sequence == 1,
                        "CUB3 did not acknowledge the Android TCP message");
            }
        }
        accepted.get(10, TimeUnit.SECONDS);
    }

    private static void check(boolean condition, String detail) {
        if (!condition) throw new AssertionError(detail);
    }
}
