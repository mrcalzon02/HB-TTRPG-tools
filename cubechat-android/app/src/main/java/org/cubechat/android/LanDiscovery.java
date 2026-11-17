package org.cubechat.android;

import java.io.Closeable;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.SocketTimeoutException;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collection;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Only a phone holding the scanned key card can elicit or validate a host address announcement. */
final class LanDiscovery {
    static final int PORT = DirectProtocol.PORT + 1;
    private static final int QUERY = 0x43445132, REPLY = 0x43445232;
    private static final int NONCE = 16, HEADER = 4 + NONCE + 2, SIZE = HEADER + 32;
    private static Mac mac(byte[] token) throws Exception {
        // Domain separation from the ECDH/session KDF.
        Mac extract = Mac.getInstance("HmacSHA256");
        extract.init(new SecretKeySpec(token, "HmacSHA256"));
        byte[] key = extract.doFinal("CubeChat LAN discovery v2".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        extract.init(new SecretKeySpec(key, "HmacSHA256"));
        return extract;
    }
    private static byte[] record(Mac mac, int type, byte[] nonce, int port) {
        ByteBuffer f = ByteBuffer.allocate(SIZE);
        f.putInt(type).put(nonce).putShort((short)port);
        mac.update(f.array(), 0, HEADER); f.put(mac.doFinal());
        return f.array();
    }
    private static boolean valid(Mac mac, byte[] data, int type) {
        if (ByteBuffer.wrap(data).getInt() != type) return false;
        mac.update(data, 0, HEADER);
        return MessageDigest.isEqual(mac.doFinal(), Arrays.copyOfRange(data, HEADER, SIZE));
    }

    static final class Host implements Closeable {
        private final DatagramSocket socket;
        private final Mac authenticator;
        private final int tcpPort;
        Host(byte[] token, int tcpPort, int udpPort) throws Exception {
            this.tcpPort = tcpPort;
            authenticator = mac(token);
            socket = new DatagramSocket(null);
            try { socket.setReuseAddress(true); socket.bind(new InetSocketAddress(udpPort)); }
            catch (IOException e) { socket.close(); throw e; }
        }
        int port() { return socket.getLocalPort(); }
        void serve() {
            byte[] buffer = new byte[SIZE + 1];
            DatagramPacket request = new DatagramPacket(buffer, buffer.length);
            try {
                while (!socket.isClosed()) {
                    request.setLength(buffer.length);
                    socket.receive(request);
                    if (request.getLength() != SIZE || !(request.getAddress() instanceof Inet4Address)
                            || !valid(authenticator, buffer, QUERY)) continue;
                    byte[] nonce = Arrays.copyOfRange(buffer, 4, 4 + NONCE);
                    byte[] answer = record(authenticator, REPLY, nonce, tcpPort);
                    socket.send(new DatagramPacket(answer, answer.length, request.getSocketAddress()));
                }
            } catch (IOException ignored) { /* stop() closes the socket, or the interface changed. */ }
            finally { close(); }
        }
        boolean closed() { return socket.isClosed(); }
        @Override public void close() { socket.close(); }
    }

    static InetSocketAddress find(byte[] token, Collection<InetAddress> targets, int udpPort) throws Exception {
        if (targets.isEmpty()) return null;
        Mac authenticator = mac(token);
        byte[] nonce = DirectProtocol.random(NONCE), probe = record(authenticator, QUERY, nonce, 0);
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(1100);
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setBroadcast(true);
            for (InetAddress target : targets) {
                try { socket.send(new DatagramPacket(probe, probe.length, target, udpPort)); }
                catch (IOException ignored) { /* Try the next local interface. */ }
            }
            byte[] bytes = new byte[SIZE + 1];
            DatagramPacket answer = new DatagramPacket(bytes, bytes.length);
            while (System.nanoTime() < deadline) {
                socket.setSoTimeout((int)Math.max(1, TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime())));
                answer.setLength(bytes.length); socket.receive(answer);
                if (answer.getLength() != SIZE || !(answer.getAddress() instanceof Inet4Address)
                        || !valid(authenticator, bytes, REPLY)
                        || !MessageDigest.isEqual(nonce, Arrays.copyOfRange(bytes, 4, 4 + NONCE))) continue;
                int port = ByteBuffer.wrap(bytes).getShort(4 + NONCE) & 65535;
                if (port > 0) return new InetSocketAddress(answer.getAddress(), port);
            }
        } catch (SocketTimeoutException ignored) { /* Peer is still offline. */ }
        return null;
    }

    static int lanInterfacePriority(String name) {
        String id = name.toLowerCase(Locale.ROOT);
        if (id.startsWith("wlan") || id.startsWith("ap") || id.startsWith("swlan") || id.startsWith("softap")) return 3;
        if (id.startsWith("eth") || id.startsWith("wifi") || id.startsWith("bridge")) return 2;
        return id.startsWith("rndis") || id.startsWith("en") ? 1 : -1;
    }

    static Set<InetAddress> broadcastAddresses() throws Exception {
        Set<InetAddress> addresses = new LinkedHashSet<>();
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        while (interfaces != null && interfaces.hasMoreElements()) {
            NetworkInterface net = interfaces.nextElement();
            if (!net.isUp() || net.isLoopback() || lanInterfacePriority(net.getName()) < 0) continue;
            for (InterfaceAddress ip : net.getInterfaceAddresses()) {
                if (ip.getBroadcast() != null) addresses.add(ip.getBroadcast());
                // Some Android builds omit the broadcast from InterfaceAddress.
                else if (ip.getAddress() instanceof Inet4Address && ip.getNetworkPrefixLength() >= 0 && ip.getNetworkPrefixLength() <= 30) {
                    int host = ByteBuffer.wrap(ip.getAddress().getAddress()).getInt();
                    int mask = ip.getNetworkPrefixLength() == 0 ? 0 : -1 << (32-ip.getNetworkPrefixLength());
                    addresses.add(InetAddress.getByAddress(ByteBuffer.allocate(4).putInt(host | ~mask).array()));
                }
            }
        }
        if (!addresses.isEmpty()) addresses.add(InetAddress.getByName("255.255.255.255"));
        return addresses;
    }
}
