package org.cubechat.android;

import java.io.Closeable;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/** An operator chooses one local CubeChat next hop. No destination, port or key comes from the caller. */
final class RelayForwarder implements Closeable {
    static final int PORT = DirectProtocol.PORT + 2;
    // Hook for Android VpnService.protect(); remains a no-op in plain JVM tests.
    interface SocketProtector { void protect(Socket socket) throws IOException; }
    private static volatile SocketProtector socketProtector = socket -> {};
    static void setSocketProtector(SocketProtector protector) {
        socketProtector = protector == null ? socket -> {} : protector;
    }
    static final int MAX_HOPS = 4;
    private static final int MAGIC = 0x43435232; // CCR2
    private static final int MAX_SESSIONS = 4;
    private static final long MAX_SESSION_BYTES_PER_DIRECTION = 64L * 1024 * 1024;
    private final ServerSocket listener;
    private final InetAddress local, next;
    private final boolean nextIsRelay;
    private final Semaphore slots = new Semaphore(MAX_SESSIONS);
    private final ExecutorService workers = Executors.newFixedThreadPool(MAX_SESSIONS * 2);
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor();
    private final Set<Socket> sockets = new HashSet<>();
    private boolean closed;

    static InetAddress localIpv4(String input) throws IOException {
        if (input == null || !input.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}")) throw new IOException("Enter the next phone’s local IPv4 address");
        InetAddress addr = InetAddress.getByName(input);
        if (!(addr instanceof Inet4Address) || !(addr.isSiteLocalAddress() || addr.isLinkLocalAddress() || addr.isLoopbackAddress()))
            throw new IOException("Relays use local IPv4 addresses only");
        return addr;
    }

    RelayForwarder(InetAddress local, InetAddress next, boolean nextIsRelay) throws Exception {
        this.local = local;
        this.next = localIpv4(next.getHostAddress()); this.nextIsRelay = nextIsRelay;
        listener = new ServerSocket();
        try { listener.setReuseAddress(true); listener.bind(new InetSocketAddress(local, PORT), MAX_SESSIONS); }
        catch (IOException e) { listener.close(); throw e; }
    }
    static void request(Socket socket, int hops) throws IOException {
        DataOutputStream out = new DataOutputStream(socket.getOutputStream());
        out.writeInt(MAGIC); out.writeByte(hops); out.flush();
    }
    private synchronized boolean track(Socket s) {
        if (closed) { closeSocket(s); return false; }
        sockets.add(s); return true;
    }
    private static void closeSocket(Closeable s) { try { s.close(); } catch (IOException ignored) {} }
    private synchronized void end(Socket a, Socket b) {
        sockets.remove(a); sockets.remove(b); closeSocket(a); closeSocket(b);
    }
    void serve() {
        try {
            while (!listener.isClosed()) {
                Socket incoming = listener.accept();
                if (!track(incoming)) break;
                if (!slots.tryAcquire()) { end(incoming,incoming); continue; }
                try { workers.execute(() -> forward(incoming)); }
                catch (java.util.concurrent.RejectedExecutionException e) { end(incoming,incoming); slots.release(); }
            }
        } catch (IOException ignored) { /* Lifecycle stop closes accept. */ }
        finally { close(); }
    }
    private void forward(Socket incoming) {
        Socket outgoing = new Socket();
        ScheduledFuture<?> deadline = null;
        try {
            if (!track(outgoing)) return;
            // A hung handshake, including stalled writes, must relinquish the bounded slot.
            deadline = timer.schedule(() -> end(incoming, outgoing), 12, TimeUnit.SECONDS);
            incoming.setSoTimeout(9000);
            DataInputStream fromClient = new DataInputStream(incoming.getInputStream());
            if (fromClient.readInt() != MAGIC) return;
            int hops = fromClient.readUnsignedByte();
            if (hops < 1 || hops > MAX_HOPS || (nextIsRelay && hops == 1)) return;
            if (fromClient.readInt() != DirectProtocol.MAGIC) return;
            int size = fromClient.readUnsignedByte();
            if (size < 64 || size > 128) return;
            byte[] guestKey = new byte[size], challenge = new byte[32];
            fromClient.readFully(guestKey); DirectProtocol.publicKey(guestKey);
            fromClient.readFully(challenge);
            // Prepare before bind/connect. No unprotected retry on VPN failure.
            socketProtector.protect(outgoing);
            if (local != null) outgoing.bind(new InetSocketAddress(local, 0));
            outgoing.connect(new InetSocketAddress(next, nextIsRelay ? PORT : DirectProtocol.PORT), 3500);
            outgoing.setSoTimeout(9000);
            if (nextIsRelay) request(outgoing, hops - 1);
            DataOutputStream toHost = new DataOutputStream(outgoing.getOutputStream());
            DataInputStream fromHost = new DataInputStream(outgoing.getInputStream());
            DataOutputStream toClient = new DataOutputStream(incoming.getOutputStream());
            toHost.writeInt(DirectProtocol.MAGIC); toHost.writeByte(size); toHost.write(guestKey); toHost.write(challenge); toHost.flush();
            copy(fromHost, toClient, 64, new byte[64]); // Host challenge + proof
            copy(fromClient, toHost, 32, new byte[32]); // Guest proof
            copy(fromHost, toClient, 32, new byte[32]); // Host acceptance
            incoming.setSoTimeout(45000); outgoing.setSoTimeout(45000);
            deadline.cancel(false);
            deadline = timer.schedule(() -> end(incoming, outgoing), 1, TimeUnit.HOURS);
            workers.execute(() -> {
                try { frames(fromHost, toClient); } catch (IOException ignored) {}
                finally { end(incoming, outgoing); }
            });
            frames(fromClient, toHost);
        } catch (Exception ignored) { /* Endpoints retain queued ciphertext until the recipient acknowledges over the authenticated session. */ }
        finally {
            if (deadline != null) deadline.cancel(false);
            end(incoming, outgoing); slots.release();
        }
    }
    private static void copy(DataInputStream in, DataOutputStream out, int count, byte[] buffer) throws IOException {
        for (int left = count; left > 0;) {
            int n = Math.min(left, buffer.length);
            in.readFully(buffer, 0, n); out.write(buffer, 0, n); left -= n;
        }
        out.flush();
    }
    private static void frames(DataInputStream in, DataOutputStream out) throws IOException {
        byte[] buffer = new byte[8192];
        long bytes = 0;
        while (bytes < MAX_SESSION_BYTES_PER_DIRECTION) {
            int n = in.readInt();
            if (n < 25 || n > DirectProtocol.MAX_BODY + 25) throw new IOException("Invalid CubeChat frame length");
            bytes += n;
            if (bytes > MAX_SESSION_BYTES_PER_DIRECTION) return;
            out.writeInt(n); copy(in, out, n, buffer);
        }
    }
    @Override public synchronized void close() {
        if (closed) return;
        closed = true; closeSocket(listener);
        for (Socket socket : sockets) closeSocket(socket);
        sockets.clear(); workers.shutdownNow(); timer.shutdownNow();
    }
}
