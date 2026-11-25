package org.cubechat.android;

import java.io.Closeable;
import java.io.IOException;
import java.net.Socket;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** Owns accepted sockets until their handshake is authenticated and the mailbox adopts them. */
final class InboundHandshakePool implements Closeable {
    private final Set<Socket> pending = new HashSet<>();
    private final ThreadPoolExecutor workers;

    InboundHandshakePool(int limit) {
        workers = new ThreadPoolExecutor(0, limit, 30, TimeUnit.SECONDS, new SynchronousQueue<>(), work -> {
            Thread thread = new Thread(work, "CubeChat inbound handshake");
            thread.setDaemon(true);
            return thread;
        });
    }

    synchronized boolean submit(Socket socket, Consumer<Socket> handshake) {
        pending.add(socket);
        try {
            workers.execute(() -> {
                try { handshake.accept(socket); }
                finally { discard(socket); }
            });
            return true;
        } catch (RejectedExecutionException unavailable) {
            discard(socket);
            return false;
        }
    }

    synchronized boolean promote(Socket socket) { return pending.remove(socket); }

    private synchronized void discard(Socket socket) {
        if (pending.remove(socket)) closeSocket(socket);
    }

    synchronized void cancelPending() {
        for (Socket socket : pending) closeSocket(socket);
        pending.clear();
    }

    @Override public synchronized void close() {
        workers.shutdownNow();
        cancelPending();
    }

    private static void closeSocket(Socket socket) {
        try { socket.close(); } catch (IOException ignored) { }
    }
}
