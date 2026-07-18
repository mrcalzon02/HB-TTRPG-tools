package io.github.mrcalzon02.barotrauma.desktop.session;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.SwingUtilities;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Process-wide desktop-world selection shared by the primary shell and its child windows.
 *
 * <p>The session does not hold the SQLite writer lock. Each transaction continues to acquire the
 * existing short-lived exclusive lock, while read-only views open their own query-only connection.</p>
 */
public final class DesktopWorldSession {

    private static final DesktopWorldSession GLOBAL = new DesktopWorldSession();

    private final CopyOnWriteArrayList<Consumer<WorldPaths>> listeners = new CopyOnWriteArrayList<>();
    private volatile WorldPaths currentWorld;

    private DesktopWorldSession() {
    }

    public static DesktopWorldSession global() {
        return GLOBAL;
    }

    public Optional<WorldPaths> currentWorld() {
        return Optional.ofNullable(currentWorld);
    }

    public WorldPaths requireWorld() {
        WorldPaths world = currentWorld;
        if (world == null) throw new IllegalStateException("No desktop world is open in this application session.");
        return world;
    }

    public void activate(WorldPaths world) {
        WorldPaths normalized = Objects.requireNonNull(world, "world");
        currentWorld = normalized;
        publish(normalized);
    }

    public void clear() {
        currentWorld = null;
        publish(null);
    }

    public AutoCloseable addListener(Consumer<WorldPaths> listener, boolean notifyImmediately) {
        Objects.requireNonNull(listener, "listener");
        listeners.add(listener);
        if (notifyImmediately) dispatch(listener, currentWorld);
        return () -> listeners.remove(listener);
    }

    private void publish(WorldPaths world) {
        for (Consumer<WorldPaths> listener : listeners) dispatch(listener, world);
    }

    private static void dispatch(Consumer<WorldPaths> listener, WorldPaths world) {
        if (SwingUtilities.isEventDispatchThread()) listener.accept(world);
        else SwingUtilities.invokeLater(() -> listener.accept(world));
    }

    public static void verifyContract() throws Exception {
        DesktopWorldSession session = new DesktopWorldSession();
        java.nio.file.Path root = java.nio.file.Path.of(".").toAbsolutePath().normalize();
        WorldPaths first = new WorldPaths(root, root.resolve("world.db"), root.resolve("world.properties"),
                root.resolve("world.lock"), root.resolve("imports"), root.resolve("attachments"),
                root.resolve("backups"), root.resolve("exports"), root.resolve("logs"));
        java.util.concurrent.atomic.AtomicReference<WorldPaths> observed = new java.util.concurrent.atomic.AtomicReference<>();
        try (AutoCloseable ignored = session.addListener(observed::set, false)) {
            session.activate(first);
            if (!session.requireWorld().equals(first)) throw new IllegalStateException("Session activation failed.");
        }
        session.clear();
        if (session.currentWorld().isPresent()) throw new IllegalStateException("Session clear failed.");
    }
}
