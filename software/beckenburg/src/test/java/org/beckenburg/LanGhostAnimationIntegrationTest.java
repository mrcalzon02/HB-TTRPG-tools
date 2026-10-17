package org.beckenburg;

import java.util.concurrent.*;

/** Real four-seat TCP test: phase packets require hunter LOS and never grant ghost telemetry. */
public final class LanGhostAnimationIntegrationTest {
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox = new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port, boolean ghost, String name) throws Exception {
            client = new LanClient("127.0.0.1", port, ghost, name, inbox::offer);
        }
        String await(String prefix) throws Exception {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(16);
            while (System.nanoTime() < deadline) {
                String event = inbox.poll(80, TimeUnit.MILLISECONDS);
                if (event == null) continue;
                if (client.seat().equals("GHOST") && (event.startsWith("MOTION|")
                        || event.startsWith("APPARITION|") || event.startsWith("SOUND|")
                        || event.startsWith("BODY|") || event.startsWith("TEAMMAP|")))
                    throw new AssertionError("private hunter projection leaked: " + event);
                if (event.startsWith(prefix)) return event;
            }
            throw new AssertionError("missing event " + prefix + " for " + client.seat());
        }
        @Override public void close() { client.close(); }
    }
    static void ok(boolean value, String label) { if (!value) throw new AssertionError(label); }
    public static void main(String[] args) throws Exception {
        try (LanHost host = new LanHost("127.0.0.1", 0);
             Peer a = new Peer(host.port(), false, "Cleric");
             Peer b = new Peer(host.port(), false, "Observer");
             Peer c = new Peer(host.port(), false, "Demonologist");
             Peer ghost = new Peer(host.port(), true, "Spirit")) {
            a.client.ready(); b.client.ready(); c.client.ready(); ghost.client.ready();
            a.await("LOBBY|3|HUMAN|4|WAITING"); a.client.start(); a.await("INFO|mission started");
            for (int room : new int[]{11,8,5,4}) { a.client.move(room); a.await("ACCEPT|MOVE|" + room); }
            a.client.view3D(); a.await("ACCEPT|VIEW3D"); a.await("APPARITION|HIDDEN");
            b.client.view3D(); b.await("ACCEPT|VIEW3D"); b.await("APPARITION|HIDDEN");
            ghost.client.viewGhost3D(); ghost.await("ACCEPT|GVIEW3D");
            int at=0; while (at<82) at=Integer.parseInt(ghost.await("STATE|").split("\\|")[1]);
            ghost.client.ghost(GhostDomain.Action.MANIFEST, 4);
            ghost.await("ACCEPT|GHOST|MANIFEST");
            a.await("APPARITION|VISIBLE|");
            LanGhostAnimation.Motion form = LanGhostAnimation.decode(a.await("MOTION|MATERIALIZE|"));
            ok(form.phase()==LanGhostAnimation.Phase.MATERIALIZE,"host starts materializing only when visible");
            ghost.await("STATE|"); // reject any unexpected hunter-only events on the ghost socket
            ghost.client.ghost(GhostDomain.Action.STRIKE, 4);
            ghost.await("ACCEPT|GHOST|STRIKE");
            a.await("THREAT|START|");
            LanGhostAnimation.Motion attacking=LanGhostAnimation.decode(a.await("MOTION|WINDUP|"));
            ok(attacking.phase()==LanGhostAnimation.Phase.WINDUP,"attack animation follows accepted host strike");
            a.await("THREAT|HIT|0");
            LanGhostAnimation.Motion after=LanGhostAnimation.decode(a.await("MOTION|RECOVER|"));
            ok(after.phase()==LanGhostAnimation.Phase.RECOVER,"host recovery follows impact");
            ok(host.running(),"cosmetic phase packets never alter combat outcome");
            System.out.println("PASS: four-seat host-only manifestation, windup, recovery and ghost privacy");
        }
    }
}
