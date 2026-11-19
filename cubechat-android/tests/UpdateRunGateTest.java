package org.cubechat.android;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** Offline update-cancellation tests: fake connections never touch a network. */
public final class UpdateRunGateTest {
    private static int checks;

    private static void check(boolean yes, String why) {
        checks++;
        if (!yes) throw new AssertionError(why);
    }

    private static void rejects(UpdateRunGate.Permit permit, String why) {
        try {
            permit.verify();
            throw new AssertionError("Unexpectedly authorized: " + why);
        } catch (IOException expected) {
            check(expected.getMessage().contains("cancelled"), why + " cancellation reason");
        }
    }

    private static final class FakeConnection extends HttpURLConnection {
        final AtomicInteger disconnects = new AtomicInteger();
        boolean failDisconnect;
        FakeConnection() throws Exception { super(new URL("https://example.invalid/")); }
        @Override public void disconnect() {
            disconnects.incrementAndGet();
            if (failDisconnect) throw new IllegalStateException("fake disconnect failure");
        }
        @Override public boolean usingProxy() { return false; }
        @Override public void connect() { throw new AssertionError("No network allowed in fixture"); }
    }

    public static void main(String[] args) throws Exception {
        AtomicBoolean permitted = new AtomicBoolean(true);
        UpdateRunGate.Permit first = UpdateRunGate.enter(permitted::get);
        check(first.allowed(), "fresh request permitted");
        first.verify();
        FakeConnection firstSocket = new FakeConnection();
        first.track(firstSocket);
        check(firstSocket.disconnects.get() == 0, "permitted active request stays connected");

        UpdateRunGate.invalidate();
        check(firstSocket.disconnects.get() == 1, "lockdown actively disconnects in-flight HTTP");
        check(!first.allowed(), "revoked permit unusable");
        rejects(first, "lockdown invalidate");
        permitted.set(false);
        permitted.set(true);
        check(!first.allowed(), "rapid on-off never resurrects a request");
        first.close();
        check(firstSocket.disconnects.get() == 1, "closing cancelled permit does not disconnect twice");

        UpdateRunGate.Permit next = UpdateRunGate.enter(permitted::get);
        FakeConnection other = new FakeConnection();
        next.track(other);
        next.untrack(other);
        next.close();
        check(other.disconnects.get() == 0, "closed response is not disconnected a second time");
        check(!next.allowed(), "closed permit must never be reusable");
        rejects(next, "closed permit");

        UpdateRunGate.Permit denied = UpdateRunGate.enter(() -> false);
        FakeConnection deniedSocket = new FakeConnection();
        denied.track(deniedSocket);
        check(deniedSocket.disconnects.get() == 1, "late connection registration is rejected");
        rejects(denied, "never granted");
        denied.close();

        UpdateRunGate.Permit replaced = UpdateRunGate.enter(() -> true);
        FakeConnection old = new FakeConnection();
        FakeConnection latest = new FakeConnection();
        replaced.track(old);
        replaced.track(latest);
        check(old.disconnects.get() == 1, "replaced connection closed");
        replaced.close();
        check(latest.disconnects.get() == 1, "active connection closed on shutdown");

        UpdateRunGate.Permit interrupted = UpdateRunGate.enter(() -> true);
        Thread.currentThread().interrupt();
        try { check(!interrupted.allowed(), "interrupted worker revoked"); }
        finally { Thread.interrupted(); }
        check(!interrupted.allowed(), "interrupted worker cannot recover on main thread");
        interrupted.close();

        UpdateRunGate.Permit acrossThread = UpdateRunGate.enter(() -> true);
        AtomicBoolean rejectedOnWorker = new AtomicBoolean();
        Thread thread = new Thread(() -> {
            Thread.currentThread().interrupt();
            try { acrossThread.verify(); }
            catch (IOException expected) { rejectedOnWorker.set(true); }
        });
        thread.start();
        thread.join();
        check(rejectedOnWorker.get(), "worker interruption cancels permit");
        check(!acrossThread.allowed(), "main thread cannot revive worker's permit");
        acrossThread.close();

        UpdateRunGate.Permit active = UpdateRunGate.enter(() -> true);
        FakeConnection activeHttp = new FakeConnection();
        active.track(activeHttp);
        AtomicBoolean didRevoke = new AtomicBoolean();
        Thread concurrentLock = new Thread(() -> {
            UpdateRunGate.invalidate();
            didRevoke.set(true);
        });
        concurrentLock.start();
        concurrentLock.join();
        check(didRevoke.get(), "lock thread ran");
        check(activeHttp.disconnects.get() == 1, "cross-thread activation disconnects HTTP");
        check(!active.allowed(), "cross-thread activation revokes gate");
        active.close();

        UpdateRunGate.Permit fragile = UpdateRunGate.enter(() -> true);
        FakeConnection broken = new FakeConnection();
        broken.failDisconnect = true;
        fragile.track(broken);
        UpdateRunGate.Permit healthy = UpdateRunGate.enter(() -> true);
        FakeConnection healthyConn = new FakeConnection();
        healthy.track(healthyConn);
        UpdateRunGate.invalidate();
        check(broken.disconnects.get() == 1, "broken HTTP implementation still attempted release");
        check(healthyConn.disconnects.get() == 1, "broken connection never blocks other releases");
        check(!fragile.allowed() && !healthy.allowed(), "both permits remain revoked");
        fragile.close();
        healthy.close();

        UpdateRunGate.Permit fresh = UpdateRunGate.enter(() -> true);
        check(fresh.allowed(), "new permit allowed after explicit unlock");
        fresh.close();
        System.out.println("UpdateRunGate: " + checks + " offline assertions passed; zero HTTP connections attempted");
    }
}
