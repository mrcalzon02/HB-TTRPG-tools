package org.cubechat.android;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import java.io.IOException;
import java.io.Closeable;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/** One paired conversation. The host listens; the guest reconnects. Both directions share that socket. */
public final class PeerLink {
    public interface Codec {
        JSONObject seal(String keyHex, String channel, long sequence, String text) throws Exception;
        String open(String keyHex, String channel, JSONObject envelope) throws Exception;
    }
    public interface Listener {
        void changed();
        void problem(String problem);
        default void replaceRequested(String card) { problem("Forget the current key before importing this one"); }
    }
    public static final class Message {
        public final String text;
        public final boolean outgoing, delivered;
        public final long time;
        Message(String text, boolean outgoing, boolean delivered, long time) {
            this.text = text; this.outgoing = outgoing; this.delivered = delivered; this.time = time;
        }
    }
    public static final class Snapshot {
        public final String status, role, peer, invite;
        public final List<Message> messages;
        public final boolean connected, forwarding;
        public final String relay;
        Snapshot(String status, String role, String peer, String invite, List<Message> messages, boolean connected, String relay) {
            this.status = status; this.role = role; this.peer = peer; this.invite = invite;
            this.messages = messages; this.connected = connected; this.relay = relay; this.forwarding = !relay.isEmpty();
        }
    }

    private interface Task { void run() throws Exception; }
    private final Handler main = new Handler(Looper.getMainLooper());
    // All persistent state, delivery decisions and message codec calls are serialized here.
    private final ScheduledExecutorService lane = Executors.newSingleThreadScheduledExecutor();
    private final ExecutorService io = Executors.newCachedThreadPool();
    private final android.net.wifi.WifiManager wifi;
    private android.net.wifi.WifiManager.MulticastLock multicast;
    private LanDiscovery.Host advertiser;
    private enum Route { LAN, WIFI_DIRECT, BLUETOOTH, RELAY }
    private RelayForwarder forwarder;
    private String relayStatus = "";
    private Route route = Route.LAN;
    private String wifiEndpoint = "";
    private Closeable bluetoothCandidate;
    private boolean needsDiscovery;
    private long lastReceived;
    private final Listener listener;
    private final ChatStore store;
    private final Codec codec;
    private volatile Snapshot snapshot = new Snapshot("Opening mailbox…", "", "", "", Collections.emptyList(), false, "");
    private volatile boolean closed;
    private boolean started, loaded, connecting;
    private long generation, sentSeq = -1, sentAt;
    private String status = "", invitation = "";
    private List<Message> history = Collections.emptyList();
    private Pairing pair;
    private DirectProtocol session;
    private ServerSocket server;

    public PeerLink(Context context, Codec codec, Listener listener) {
        wifi = (android.net.wifi.WifiManager)context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        store = new ChatStore(context.getApplicationContext()); this.codec = codec; this.listener = listener;
    }
    public Snapshot snapshot() { return snapshot; }
    private static String detail(Exception error) {
        return error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
    }
    private void command(Task task) {
        if (closed) return;
        lane.execute(() -> {
            if (closed) return;
            try { task.run(); } catch (Exception e) { report(detail(e)); }
        });
    }
    private void report(String message) { main.post(() -> { if (!closed) listener.problem(message); }); }
    private void publish() {
        String peer = "";
        if (pair != null && pair.remote != null) {
            try { peer = DirectProtocol.fingerprint(pair.remote); } catch (Exception e) { report(detail(e)); }
        }
        snapshot = new Snapshot(status, pair == null ? "" : pair.host ? "host" : "guest", peer, invitation, history, session != null, relayStatus);
        main.post(() -> { if (!closed) listener.changed(); });
    }

    public void start() {
        command(() -> {
            if (started) return;
            JSONObject saved = store.pairing();
            pair = saved == null ? null : Pairing.restore(saved);
            history = store.history(); loaded = true; started = true;
            status = "Ready to pair";
            lane.scheduleWithFixedDelay(() -> {
                if (closed) return;
                try {
                    if (session != null) {
                        if (System.nanoTime() - lastReceived > TimeUnit.SECONDS.toNanos(45)
                                || (sentSeq >= 0 && System.nanoTime() - sentAt > TimeUnit.SECONDS.toNanos(60))) {
                            disconnect(session); return;
                        }
                        session.write(DirectProtocol.HEARTBEAT, 0, "");
                    } else reconnect();
                } catch (Exception e) {
                    if (session != null) disconnect(session);
                    else { status = detail(e); publish(); }
                }
            }, 5, 5, TimeUnit.SECONDS);
            reconnect(); publish();
        });
    }

    public void createInvite() { createInvite(null); }
    public void createInvite(String bundleJson) {
        command(() -> {
            ready();
            if (pair != null && (!pair.host || bundleJson != null)) throw new IOException("Forget the current pairing before creating a different one");
            String address;
            try { address = Pairing.lanAddress(); } catch (java.net.SocketException ignored) { address = "0.0.0.0"; }
            Pairing next = pair == null ? Pairing.host(bundleJson) : pair;
            String code = next.invite(address);
            next.address = address;
            store.savePair(next.json()); pair = next; invitation = code;
            try { reconnect(); } finally { publish(); }
        });
    }
    public void join(String raw) { join(raw, false); }
    public void join(String raw, boolean replace) {
        command(() -> {
            ready();
            Pairing next = Pairing.join(raw);
            boolean changingKey = pair != null && !pair.matchesCard(next);
            if (changingKey) {
                if (!replace) { main.post(() -> { if (!closed) listener.replaceRequested(raw); }); return; }
                store.replacePair(next.json()); history = Collections.emptyList();
            } else {
                if (pair != null) {
                    if (pair.host) throw new IOException("This phone already hosts this key");
                    next = Pairing.restore(pair.json().put("address", next.address).put("port", next.port));
                }
                store.savePair(next.json());
            }
            shutdownNetwork(); pair = next; invitation = "";
            reconnect(); publish();
        });
    }
    public void reset() {
        command(() -> {
            ready();
            store.resetPair(); shutdownNetwork(); pair = null; invitation = ""; history = Collections.emptyList();
            status = "Ready to pair"; publish();
        });
    }
    public void useRelay(String firstHop) {
        command(() -> {
            ready();
            if (pair == null || pair.host) throw new IOException("Select Via relay on the phone that received the key card");
            String localHop = RelayForwarder.localIpv4(firstHop).getHostAddress();
            switchRouteNow(Route.RELAY, localHop);
        });
    }
    public void startRelay(String nextAddress, boolean nextIsRelay) {
        command(() -> {
            ready();
            java.net.InetAddress addr = RelayForwarder.localIpv4(nextAddress);
            if (forwarder != null) throw new IOException("Stop forwarding before changing the next phone");
            String here = Pairing.lanAddress();
            RelayForwarder newForwarder = new RelayForwarder(null, addr, nextIsRelay);
            forwarder = newForwarder; relayStatus = ("0.0.0.0".equals(here) ? "This phone" : here)
                    + " → " + nextAddress + (nextIsRelay ? " (relay)" : " (recipient)");
            publish();
            io.execute(() -> {
                newForwarder.serve();
                if (!closed) command(() -> {
                    if (forwarder == newForwarder) { forwarder = null; relayStatus = ""; publish(); }
                });
            });
        });
    }
    public void stopRelay() {
        command(() -> { close(forwarder); forwarder = null; relayStatus = ""; publish(); });
    }
    public void useLan() { switchRoute(Route.LAN, ""); }
    public void useBluetooth() { switchRoute(Route.BLUETOOTH, ""); }
    public void useWifiEndpoint(String hostAddress) { switchRoute(Route.WIFI_DIRECT, hostAddress == null ? "" : hostAddress); }
    private void switchRoute(Route requested, String endpoint) {
        command(() -> { ready(); switchRouteNow(requested, endpoint); });
    }
    private void switchRouteNow(Route requested, String endpoint) throws Exception {
            if (!endpoint.isEmpty() && !(endpoint.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}") && java.net.InetAddress.getByName(endpoint) instanceof java.net.Inet4Address))
                throw new IOException("Invalid Wi-Fi Direct address");
            if (route == requested && wifiEndpoint.equals(endpoint)) return;
            shutdownNetwork(); route = requested; wifiEndpoint = endpoint;
            status = requested == Route.BLUETOOTH ? "Waiting for Bluetooth connection" :
                    requested == Route.WIFI_DIRECT ? "Waiting for Wi-Fi Direct" :
                    requested == Route.RELAY ? "Waiting for relay" : "Waiting for local Wi-Fi";
            reconnect(); publish();
    }

    public void bluetoothStatus(String message) {
        command(() -> {
            if (route == Route.BLUETOOTH && session == null && message != null && !message.isEmpty() && !message.equals(status)) {
                status = message; publish();
            }
        });
    }

    /** Take ownership of an RFCOMM connection from the platform Bluetooth adapter. */
    public void attachBluetooth(InputStream in, OutputStream out, Closeable transport, String label) {
        if (closed) { close(transport); return; }
        command(() -> {
            if (route != Route.BLUETOOTH || pair == null || session != null || bluetoothCandidate != null) {
                close(transport); return;
            }
            final long epoch = generation;
            final Pairing p = pair;
            bluetoothCandidate = transport;
            io.execute(() -> {
                try {
                    DirectProtocol link = DirectProtocol.handshake(in, out, transport, p.host, p.identity, p.remote, p.token,
                            peer -> trustPeer(peer, epoch));
                    await(() -> {
                        generation(epoch);
                        if (!pair.host && !pair.confirmed) {
                            store.savePair(pair.json().put("confirmed", true)); pair.confirmed = true;
                        }
                        bluetoothCandidate = null; open(link); return null;
                    });
                } catch (Exception e) {
                    close(transport);
                    if (!closed) command(() -> {
                        if (generation != epoch || bluetoothCandidate != transport) return;
                        bluetoothCandidate = null; status = "Bluetooth peer authentication failed; waiting to reconnect"; publish();
                    });
                }
            });
        });
    }
    public void retry() {
        command(() -> {
            ready();
            if (session != null) { pump(); return; }
            if (pair == null) throw new IOException("Pair these phones first");
            shutdownNetwork(); reconnect(); publish();
        });
    }
    public void send(String text) {
        command(() -> {
            ready();
            if (pair == null) throw new IOException("Import or create a key card first");
            if (text == null || text.trim().isEmpty()) throw new IOException("Enter a message");
            if (text.getBytes(StandardCharsets.UTF_8).length > 4096) throw new IOException("Messages are limited to 4096 UTF-8 bytes");
            long seq = store.next(true);
            JSONObject envelope = codec.seal(pair.host ? pair.ab : pair.ba, pair.host ? "AB" : "BA", seq, text);
            String encoded = envelope.toString();
            if (encoded.getBytes(StandardCharsets.UTF_8).length > DirectProtocol.MAX_BODY) throw new IOException("Encrypted message exceeds transport limit");
            store.save(true, seq, text, encoded); history = store.history(); publish();
            try { pump(); } catch (Exception e) { disconnect(session); }
        });
    }
    private void ready() throws IOException { if (!loaded) throw new IOException("Mailbox could not be opened"); }

    private void reconnect() throws Exception {
        if (!started || closed || pair == null || session != null || route == Route.BLUETOOTH) return;
        if (pair.host) {
            if (server == null) {
                ServerSocket listening = new ServerSocket();
                try {
                    listening.setReuseAddress(true); listening.bind(new InetSocketAddress(pair.port));
                } catch (Exception e) { listening.close(); throw e; }
                server = listening;
                final long epoch = generation;
                io.execute(() -> acceptLoop(listening, epoch));
                status = pair.confirmed ? "Waiting for paired phone" : "Key ready. Waiting for the other phone";
                publish();
            }
            if (route == Route.LAN && (advertiser == null || advertiser.closed())) {
                if (wifi != null && multicast == null) {
                    multicast = wifi.createMulticastLock("cubechat:local-discovery");
                    multicast.setReferenceCounted(false); multicast.acquire();
                }
                advertiser = new LanDiscovery.Host(pair.token, pair.port, LanDiscovery.PORT);
                final LanDiscovery.Host current = advertiser;
                io.execute(current::serve);
            }
        } else if (!connecting) {
            final boolean relayed = route == Route.RELAY;
            final boolean direct = route == Route.WIFI_DIRECT || relayed;
            final String address = direct ? wifiEndpoint : pair.address;
            if (direct && address.isEmpty()) return;
            connecting = true;
            final boolean missingAddress = "0.0.0.0".equals(address);
            final boolean discover = !direct && (missingAddress || needsDiscovery);
            status = discover ? "Keys installed. Looking for the other phone on this Wi-Fi…" : "Connecting to " + address + "…";
            publish();
            final Pairing p = pair;
            final int port = relayed ? RelayForwarder.PORT : p.port; final long epoch = generation;
            io.execute(() -> {
                Socket socket = new Socket();
                try {
                    InetSocketAddress found = discover ? LanDiscovery.find(p.token, LanDiscovery.broadcastAddresses(), LanDiscovery.PORT) : null;
                    if (found == null && missingAddress) throw new IOException("Waiting for nearby phone");
                    InetSocketAddress endpoint = found == null ? new InetSocketAddress(address, port) : found;
                    socket.connect(endpoint, 4500);
                    if (relayed) RelayForwarder.request(socket, RelayForwarder.MAX_HOPS);
                    DirectProtocol link = DirectProtocol.handshake(socket, false, p.identity, p.remote, p.token, null);
                    await(() -> {
                        try {
                            generation(epoch);
                            String verifiedAddress = endpoint.getAddress().getHostAddress();
                            if (!pair.confirmed || (!direct && (!verifiedAddress.equals(pair.address) || pair.port != endpoint.getPort()))) {
                                JSONObject v = pair.json().put("confirmed", true);
                                if (!direct) v.put("address", verifiedAddress).put("port", endpoint.getPort());
                                store.savePair(v); pair.confirmed = true;
                                if (!direct) { pair.address = verifiedAddress; pair.port = endpoint.getPort(); }
                            }
                            needsDiscovery = false; open(link);
                        } catch (Exception e) { close(socket); throw e; }
                        return null;
                    });
                } catch (Exception e) {
                    close(socket);
                    if (!closed) command(() -> {
                        if (generation != epoch) return;
                        connecting = false; needsDiscovery = true;
                        status = relayed ? "Waiting for the relay path to the other phone" : direct ? "Waiting for the Wi-Fi Direct peer" : "Waiting for the other phone on the same Wi-Fi or hotspot"; publish();
                    });
                }
            });
        }
    }

    private void acceptLoop(ServerSocket listening, long epoch) {
        while (!closed && !listening.isClosed()) {
            Socket accepted = null;
            try {
                accepted = listening.accept();
                Pairing expected = await(() -> {
                    generation(epoch);
                    return pair;
                });
                DirectProtocol protocol = DirectProtocol.handshake(accepted, true, expected.identity, expected.remote, expected.token,
                        peer -> trustPeer(peer, epoch));
                await(() -> { generation(epoch); open(protocol); return null; });
            } catch (Exception e) { close(accepted); }
        }
    }
    private void trustPeer(byte[] peer, long epoch) throws Exception {
        await(() -> {
            generation(epoch);
            if (pair.confirmed && !Arrays.equals(peer, pair.remote)) throw new IOException("Phone already paired");
            if (!pair.confirmed) {
                JSONObject v = pair.json().put("peer", Pairing.encode(peer)).put("confirmed", true);
                store.savePair(v); pair.remote = peer; pair.confirmed = true; invitation = "";
            }
            return null;
        });
    }
    private <T> T await(Callable<T> action) throws Exception {
        if (closed) throw new IOException("Mailbox closed");
        Future<T> result = lane.submit(action);
        try { return result.get(); }
        catch (InterruptedException e) { result.cancel(false); Thread.currentThread().interrupt(); throw e; }
    }
    private void generation(long epoch) throws IOException {
        if (closed || epoch != generation) throw new IOException("Pairing changed");
    }

    private void open(DirectProtocol link) throws Exception {
        close(session); session = link; sentSeq = -1; connecting = false;
        lastReceived = System.nanoTime();
        status = route == Route.BLUETOOTH ? "Connected over Bluetooth" : route == Route.WIFI_DIRECT ? "Connected over Wi-Fi Direct" : route == Route.RELAY ? "Connected through relay" : "Connected";
        publish();
        io.execute(() -> {
            try {
                for (;;) {
                    DirectProtocol.Record record = link.readRecord();
                    await(() -> { if (session != link) throw new IOException("Session replaced"); receive(link, record); return null; });
                }
            } catch (Exception e) { if (!closed) command(() -> disconnect(link)); }
        });
        try { pump(); } catch (Exception e) { disconnect(link); throw e; }
    }
    private void receive(DirectProtocol link, DirectProtocol.Record record) throws Exception {
        lastReceived = System.nanoTime();
        if (record.type == DirectProtocol.MESSAGE) {
            long expected = store.next(false);
            if (record.sequence > expected) throw new IOException("Unexpected message sequence");
            if (record.sequence == expected) {
                JSONObject envelope = new JSONObject(record.body);
                if (envelope.getLong("sequence") != expected) throw new IOException("Envelope sequence mismatch");
                String text;
                try { text = codec.open(pair.host ? pair.ba : pair.ab, pair.host ? "BA" : "AB", envelope); }
                catch (Exception e) { report("Message could not be decrypted: " + detail(e)); throw e; }
                store.save(false, expected, text, null); history = store.history(); publish();
            }
            // A replica of a committed record, e.g. after a lost receipt, receives the same acknowledgement.
            link.write(DirectProtocol.RECEIPT, record.sequence, "");
        } else if (record.type == DirectProtocol.RECEIPT && sentSeq >= 0 && sentSeq == record.sequence) {
            store.delivered(sentSeq); sentSeq = -1; history = store.history(); publish(); pump();
        }
    }
    private void pump() throws Exception {
        if (session == null || sentSeq >= 0) return;
        long seq = store.pending();
        if (seq >= 0) {
            session.write(DirectProtocol.MESSAGE, seq, store.packet(seq));
            sentSeq = seq; sentAt = System.nanoTime();
        }
    }
    private void disconnect(DirectProtocol link) {
        if (link == null || session != link) return;
        close(link); session = null; sentSeq = -1;
        status = route == Route.BLUETOOTH ? "Waiting for Bluetooth reconnection" : pair.host ? "Waiting for paired phone" : "Disconnected. Retrying…"; publish();
    }
    private static void close(java.io.Closeable object) { if (object != null) try { object.close(); } catch (IOException ignored) {} }
    private void shutdownNetwork() {
        generation++;
        close(bluetoothCandidate); bluetoothCandidate = null;
        close(advertiser); advertiser = null;
        if (multicast != null) { if (multicast.isHeld()) multicast.release(); multicast = null; }
        close(server); server = null; close(session); session = null; connecting = false; needsDiscovery = false; sentSeq = -1;
    }
    public void stop() {
        if (closed) return;
        closed = true;
        lane.execute(() -> { shutdownNetwork(); close(forwarder); forwarder = null; store.close(); io.shutdownNow(); lane.shutdownNow(); });
    }
}
