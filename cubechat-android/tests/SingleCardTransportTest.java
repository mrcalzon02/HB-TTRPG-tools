package org.cubechat.android;

import java.io.Closeable;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Arrays;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** One offline scan supports later endpoint discovery, and the same pair can change stream carriers. */
public final class SingleCardTransportTest {
    private static void check(boolean expected) { if (!expected) throw new AssertionError(); }
    private static void serve(DirectProtocol session) throws Exception {
        try (DirectProtocol a = session) {
            DirectProtocol.Record record = a.readRecord();
            check(record.type == DirectProtocol.MESSAGE && record.body.equals("Rendezvous"));
            a.write(DirectProtocol.RECEIPT, record.sequence, "");
        }
    }
    private static void send(DirectProtocol session) throws Exception {
        try (DirectProtocol b = session) {
            b.write(DirectProtocol.MESSAGE, 7, "Rendezvous");
            DirectProtocol.Record receipt = b.readRecord();
            check(receipt.type == DirectProtocol.RECEIPT && receipt.sequence == 7);
        }
    }
    public static void main(String[] args) throws Exception {
        Pairing a = Pairing.host(null);
        Pairing b = Pairing.join(a.invite("0.0.0.0")); // No endpoint was available during the one and only scan.
        check(b.ab.equals(a.ab) && b.ba.equals(a.ba) && b.address.equals("0.0.0.0"));
        ExecutorService io = Executors.newCachedThreadPool();
        InetAddress loopback = InetAddress.getByName("127.0.0.1");
        try {
            try (ServerSocket tcp = new ServerSocket(0, 4, loopback);
                 LanDiscovery.Host advertiser = new LanDiscovery.Host(a.token, tcp.getLocalPort(), 0)) {
                io.submit(advertiser::serve);
                check(LanDiscovery.find(DirectProtocol.random(32), Collections.singleton(loopback), advertiser.port()) == null);
                InetSocketAddress address = LanDiscovery.find(b.token, Collections.singleton(loopback), advertiser.port());
                check(address != null && address.getPort() == tcp.getLocalPort());
                Future<?> served = io.submit(() -> {
                    try (Socket s = tcp.accept()) {
                        serve(DirectProtocol.handshake(s, true, a.identity, null, a.token, peer -> a.remote = peer));
                    }
                    return null;
                });
                try (Socket s = new Socket()) {
                    s.connect(address);
                    send(DirectProtocol.handshake(s, false, b.identity, b.remote, b.token, null));
                }
                served.get(5, TimeUnit.SECONDS);
            }
            // RFCOMM is a duplex stream. Exercise the stream entrypoint without either TCP or UDP.
            PipedInputStream inputA = new PipedInputStream(8192), inputB = new PipedInputStream(8192);
            PipedOutputStream outputA = new PipedOutputStream(inputB), outputB = new PipedOutputStream(inputA);
            Closeable pipeA = () -> { inputA.close(); outputA.close(); };
            Closeable pipeB = () -> { inputB.close(); outputB.close(); };
            Future<?> served = io.submit(() -> {
                serve(DirectProtocol.handshake(inputA, outputA, pipeA, true, a.identity, a.remote, a.token,
                        peer -> check(Arrays.equals(peer, b.identity.getPublic().getEncoded()))));
                return null;
            });
            send(DirectProtocol.handshake(inputB, outputB, pipeB, false, b.identity, b.remote, b.token, null));
            served.get(5, TimeUnit.SECONDS);
            System.out.println("PASS one offline scan, authenticated UDP discovery, TCP message/receipt, same keys and pin over a separate duplex stream");
        } finally { io.shutdownNow(); }
    }
}
