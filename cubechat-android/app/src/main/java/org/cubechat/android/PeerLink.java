package org.cubechat.android;

import android.content.Context;
import android.net.Uri;
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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.WeakHashMap;
import java.util.function.Consumer;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/** Stores independent conversations and services the selected conversation on its chosen route. */
public final class PeerLink {
    public static final String PURGE_NOTICE = "PURGE protocol activated by this user.";
    // Total allowance for the local socket write. Successful writes release reset immediately.
    private static final long PURGE_WRITE_MILLIS = 150;
    private static final ScheduledThreadPoolExecutor PURGE_TIMER = new ScheduledThreadPoolExecutor(1, work -> {
        Thread thread = new Thread(work, "CubeChat purge timeout");
        thread.setDaemon(true);
        return thread;
    });
    static { PURGE_TIMER.setRemoveOnCancelPolicy(true); }
    private static final Set<PeerLink> mailboxes = Collections.newSetFromMap(new WeakHashMap<>());
    private static final List<Runnable> purgeWaiters = new ArrayList<>();

    public interface Codec {
        JSONObject seal(String keyHex, String channel, long sequence, String text) throws Exception;
        String open(String keyHex, String channel, JSONObject envelope) throws Exception;
    }
    public interface Listener {
        void changed();
        void problem(String problem);
        default void queued(long contactId, String text) { }
        default void fileSaved(long contactId, String transferId) { }
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
        public final String status, role, peer, invite, relay, route, ping, draft;
        public final List<Message> messages;
        public final List<AttachmentStore.Transfer> files;
        public final boolean fileCapable;
        public final AttachmentStore.Space space;
        public final List<AttachmentStore.Completed> completedFiles;
        public final List<AttachmentStore.Completed> transferOverview;
        public final List<ChatStore.Contact> contacts;
        public final long activeId, pingTime;
        public final boolean connected, forwarding, pinging, loaded;
        private static Snapshot empty(String status, String route) {
            return new Snapshot(status, "", "", "", Collections.emptyList(), false, "", 0,
                    Collections.emptyList(), route, "", 0, false, "", false,
                    Collections.emptyList(), false, null, Collections.emptyList(), Collections.emptyList());
        }
        Snapshot(String status, String role, String peer, String invite, List<Message> messages, boolean connected,
                 String relay, long activeId, List<ChatStore.Contact> contacts, String route,
                 String ping, long pingTime, boolean pinging, String draft, boolean loaded,
                 List<AttachmentStore.Transfer> files, boolean fileCapable, AttachmentStore.Space space,
                 List<AttachmentStore.Completed> completedFiles,
                 List<AttachmentStore.Completed> transferOverview) {
            this.status = status; this.role = role; this.peer = peer; this.invite = invite;
            this.messages = messages; this.connected = connected; this.relay = relay; this.forwarding = !relay.isEmpty();
            this.activeId = activeId; this.contacts = contacts; this.route = route;
            this.ping = ping; this.pingTime = pingTime; this.pinging = pinging; this.draft = draft; this.loaded = loaded; this.files = files; this.fileCapable = fileCapable; this.space = space; this.completedFiles = completedFiles; this.transferOverview = transferOverview;
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
    private enum Route {
        LAN("Local Wi-Fi / hotspot"), WIFI_DIRECT("Wi-Fi Direct"), BLUETOOTH("Bluetooth"), RELAY("Local relay");
        final String label;
        Route(String label) { this.label = label; }
    }
    private RelayForwarder forwarder;
    private String relayStatus = "";
    private Route route = Route.LAN;
    private String wifiEndpoint = "";
    private Closeable bluetoothCandidate;
    private boolean needsDiscovery;
    private long lastReceived;
    private final Listener listener;
    private final Context app;
    private final ChatStore store;
    private final AttachmentStore attachments;
    private final ExecutorService fileIo = Executors.newSingleThreadExecutor();
    private List<AttachmentStore.Transfer> files = Collections.emptyList();
    private AttachmentStore.Space attachmentSpace;
    private List<AttachmentStore.Completed> completedFiles = Collections.emptyList();
    private List<AttachmentStore.Completed> transferOverview = Collections.emptyList();
    private AttachmentExchange exchange;
    private long lastFileUpdate, seenImports;
    private static final AtomicLong completedImports = new AtomicLong();
    private final Codec codec;
    private volatile Snapshot snapshot = Snapshot.empty("Opening mailbox…", Route.LAN.label);
    private long activeId, challenge, pingDeadline, pingSentAt, pingTime;
    private String ping = "", draft = "";
    private List<ChatStore.Contact> contacts = Collections.emptyList();
    private static final long PING_WINDOW = TimeUnit.SECONDS.toNanos(10);
    private volatile boolean closed;
    private boolean started, loaded, connecting;
    private long generation, sentSeq = -1, sentAt;
    private String status = "", invitation = "";
    private List<Message> history = Collections.emptyList();
    private Pairing pair;
    private volatile DirectProtocol session;
    private volatile boolean concealed, purging;
    private long visibilityRevision;
    private boolean parked, recordedPurge, parkedFileSupport;
    private volatile DirectProtocol purgeCapableSession;
    private long nextWireSequence, legacyNoticeSeq = -1;
    private String legacyNotice;
    private final ArrayDeque<DirectProtocol.Record> parkedRecords = new ArrayDeque<>();
    private int parkedBytes;
    private final AtomicBoolean purgeFinished = new AtomicBoolean();
    private ScheduledFuture<?> purgeTimeout;
    private volatile Runnable purgeCallback;
    private static final Snapshot LOCKED = Snapshot.empty("Locked", "");
    private ServerSocket server;

    public PeerLink(Context context, Codec codec, Listener listener) {
        app = context.getApplicationContext();
        wifi = (android.net.wifi.WifiManager)app.getSystemService(Context.WIFI_SERVICE);
        store = new ChatStore(app); attachments = new AttachmentStore(app, store);
        this.codec = codec; this.listener = listener;
        synchronized (mailboxes) { mailboxes.add(this); }
    }
    public Snapshot snapshot() { return snapshot; }

    /** Revoke existing peer transports as soon as the firewall policy changes. */
    static void enforceRadioPolicyForAll() {
        List<PeerLink> existing;
        synchronized (mailboxes) { existing = new ArrayList<>(mailboxes); }
        for (PeerLink mailbox : existing) mailbox.enforceRadioPolicy();
    }

    private void enforceRadioPolicy() {
        command(() -> {
            if (!LockdownFirewall.armed(app)) return;
            if ((route == Route.BLUETOOTH && !LockdownRadioPolicy.bluetoothAllowed(app))
                    || (route == Route.WIFI_DIRECT && !LockdownRadioPolicy.wifiDirectAllowed(app))) {
                shutdownNetwork();
                status = "Radio blocked by lockdown. Select a transport explicitly in CubeChat.";
                publish();
            }
        });
    }
    private static String detail(Exception error) {
        return error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
    }
    private synchronized void command(Task task) {
        if (closed || concealed) return;
        lane.execute(() -> {
            try { task.run(); } catch (Exception e) { report(detail(e)); }
        });
    }
    private void report(String message) { main.post(() -> { if (!closed && !concealed) listener.problem(message); }); }
    private void publish() {
        if (concealed) { snapshot = LOCKED; return; }
        String peer = "";
        if (pair != null && pair.remote != null) {
            try { peer = DirectProtocol.fingerprint(pair.remote); } catch (Exception e) { report(detail(e)); }
        }
        Snapshot updated = new Snapshot(status, pair == null ? "" : pair.host ? "host" : "guest", peer, invitation, history, session != null,
                relayStatus, activeId, contacts, route.label, ping, pingTime, challenge != 0, draft, loaded, files, exchange != null, attachmentSpace, completedFiles, transferOverview);
        synchronized (this) { snapshot = concealed ? LOCKED : updated; }
        main.post(() -> { if (!closed && !concealed) listener.changed(); });
    }

    public void start() {
        command(() -> {
            if (started) return;
            loadSelection();
            loaded = true; started = true;
            lane.scheduleWithFixedDelay(() -> {
                if (closed || purging) return;
                try {
                    if (parked) {
                        if (session != null) session.write(DirectProtocol.HEARTBEAT, 0, "");
                        return;
                    }
                    long revision = completedImports.get();
                    if (revision != seenImports && activeId != 0) { filesChanged(null); seenImports = revision; }
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

    private void clearAttachmentViews() {
        files = Collections.emptyList();
        completedFiles = Collections.emptyList();
        transferOverview = Collections.emptyList();
        attachmentSpace = null;
    }

    private void loadSelection() throws Exception { loadSelection(false); }
    private void loadSelection(boolean retainTransport) throws Exception {
        if (!retainTransport) shutdownNetwork();
        pair = null; activeId = 0; invitation = ""; draft = ""; history = Collections.emptyList();
        contacts = Collections.emptyList(); clearAttachmentViews(); route = Route.LAN;
        if (!retainTransport) wifiEndpoint = "";
        status = "Ready to pair";
        ping = ""; pingTime = 0;
        try {
            contacts = store.contacts();
            long selected = store.activeId();
            if (selected == 0) return;
            Pairing saved = Pairing.restore(store.pairing(selected));
            String[] preference = store.route(selected);
            List<Message> savedHistory = store.history();
            String savedDraft = store.draft(selected);
            files = attachments.list(selected);
            route = Route.valueOf(preference[0]);
            // A Wi-Fi Direct group address is valid only after Android confirms the live group.
            if (route == Route.RELAY) wifiEndpoint = preference[1];
            pair = saved; activeId = selected; history = savedHistory; draft = savedDraft;
            status = route == Route.BLUETOOTH ? "Open Connection to reconnect Bluetooth" :
                    route == Route.WIFI_DIRECT ? "Open Connection to reconnect Wi-Fi Direct" : "Waiting for paired phone";
        } finally { publish(); }
    }
    public void selectContact(long id) {
        command(() -> {
            ready();
            if (activeId == id) return;
            store.select(id); loadSelection(); reconnect();
        });
    }
    public void renameContact(long id, String name) {
        command(() -> { ready(); store.rename(id, name); contacts = store.contacts(); publish(); });
    }
    public void saveDraft(long id, String text) {
        command(() -> {
            ready();
            if (id == 0) return;
            store.saveDraft(id, text);
            if (id == activeId) draft = text;
        });
    }
    public void createInvite() { requestInvite(null, false); }
    public void createInvite(String bundleJson) { requestInvite(bundleJson, bundleJson != null); }
    public void createNewInvite() { requestInvite(null, true); }
    private void requestInvite(String bundleJson, boolean fresh) {
        command(() -> {
            ready();
            if (!fresh && pair != null && !pair.host) throw new IOException("Choose New conversation to make another invite");
            String address;
            try { address = Pairing.lanAddress(); } catch (java.net.SocketException ignored) { address = "0.0.0.0"; }
            Pairing next = fresh || pair == null ? Pairing.host(bundleJson) : pair;
            String code = next.invite(address);
            next.address = address;
            if (fresh || pair == null) {
                store.createPair(next.json()); loadSelection();
            } else store.savePair(next.json());
            invitation = code;
            try { reconnect(); } finally { publish(); }
        });
    }
    public void join(String raw) {
        command(() -> {
            ready();
            Pairing scanned = Pairing.join(raw);
            long id = store.findCard(scanned);
            if (id == 0) {
                store.createPair(scanned.json()); loadSelection();
            } else {
                if (activeId != id) { store.select(id); loadSelection(); }
                if (!pair.host && (!pair.address.equals(scanned.address) || pair.port != scanned.port)) {
                    store.savePair(pair.json().put("address", scanned.address).put("port", scanned.port));
                    pair.address = scanned.address; pair.port = scanned.port;
                    if (session == null) shutdownNetwork();
                }
            }
            reconnect(); publish();
        });
    }
    // Older callers can still pass the replacement flag. Importing a different key creates a contact.
    public void join(String raw, boolean replace) { join(raw); }
    public void reset() { reset(snapshot.activeId); }
    public void reset(long target) {
        command(() -> {
            ready(); requireContact(target);
            store.resetPair(); loadSelection(); reconnect();
        });
    }
    private void requireContact(long id) throws IOException {
        if (pair == null || id == 0 || activeId != id) throw new IOException("Conversation changed. Open the contact and try again.");
    }
    public void useRelay(String firstHop) {
        final long target = snapshot.activeId;
        command(() -> {
            ready(); requireContact(target);
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
        final long target = snapshot.activeId;
        command(() -> { ready(); requireContact(target); switchRouteNow(requested, endpoint); });
    }
    private void switchRouteNow(Route requested, String endpoint) throws Exception {
            if (!endpoint.isEmpty() && !(endpoint.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}") && java.net.InetAddress.getByName(endpoint) instanceof java.net.Inet4Address))
                throw new IOException("Invalid Wi-Fi Direct address");
            if (route == requested && wifiEndpoint.equals(endpoint)) return;
            store.saveRoute(requested.name(), requested == Route.RELAY ? endpoint : "");
            shutdownNetwork(); route = requested; wifiEndpoint = endpoint;
            ping = ""; pingTime = 0;
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
    public synchronized void attachBluetooth(InputStream in, OutputStream out, Closeable transport, String label) {
        if (closed || concealed) { close(transport); return; }
        command(() -> {
            if (concealed || route != Route.BLUETOOTH || pair == null || session != null || bluetoothCandidate != null) {
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
    private void refreshFiles(boolean now) throws Exception {
        long tick = System.nanoTime();
        if (!now && tick - lastFileUpdate < TimeUnit.MILLISECONDS.toNanos(200)) return;
        lastFileUpdate = tick;
        files = attachments.list(activeId);
        attachmentSpace = attachments.space();
        publish();
    }
    public void refreshTransferOverview() {
        command(() -> {
            ready();
            transferOverview = attachments.allTransfers();
            publish();
        });
    }

    public void refreshCompletedFiles() {
        command(() -> {
            ready();
            completedFiles = attachments.completed();
            attachmentSpace = attachments.space();
            publish();
        });
    }

    public void removeCompletedFromContact(long target, String id) {
        command(() -> {
            ready();
            // Do not switch the active conversation, reset transport or disturb pending transfers.
            attachments.removeCompleted(target, id);
            completedFiles = attachments.completed();
            if (target == activeId) files = attachments.list(activeId);
            attachmentSpace = attachments.space();
            publish();
        });
    }

    public void refreshAttachmentSpace() {
        command(() -> {
            ready();
            attachmentSpace = attachments.space();
            publish();
        });
    }

    private void filesChanged(String id) throws Exception {
        refreshFiles(true);
        if (exchange != null) {
            try { if (id == null) exchange.sync(); else exchange.localChange(id); }
            catch (Exception e) { disconnect(session); throw e; }
        }
    }
    public void offerFile(long target, Uri source) {
        command(() -> {
            ready(); requireContact(target);
            fileIo.execute(() -> {
                if (closed || concealed) return;
                try (ChatStore worker = new ChatStore(app)) {
                    new AttachmentStore(app, worker).importFile(target, source);
                    completedImports.incrementAndGet();
                    command(() -> { if (target == activeId) filesChanged(null); });
                } catch (Exception e) { report("Could not attach file: " + detail(e)); }
            });
        });
    }
    public void exportFile(long target, String id, Uri destination) {
        command(() -> {
            ready(); requireContact(target);
            fileIo.execute(() -> {
                if (closed || concealed) return;
                try (ChatStore worker = new ChatStore(app)) {
                    new AttachmentStore(app, worker).exportFile(target, id, destination);
                    main.post(() -> { if (!closed && !concealed) listener.fileSaved(target, id); });
                } catch (Exception e) { report("Could not save file: " + detail(e)); }
            });
        });
    }
    public void acceptFile(long target, String id) {
        command(() -> { ready(); requireContact(target); attachments.accept(target, id); filesChanged(id); });
    }
    public void declineFile(long target, String id) { stopFile(target, id, AttachmentStore.DECLINED); }
    public void cancelFile(long target, String id) { stopFile(target, id, AttachmentStore.CANCELED); }
    private void stopFile(long target, String id, String result) {
        command(() -> { ready(); requireContact(target); attachments.terminate(target, id, result, true); filesChanged(id); });
    }
    public void deleteAttachment(long target, String id) {
        command(() -> { ready(); requireContact(target); attachments.removeCompleted(target, id); refreshFiles(true); });
    }
    public void pauseFile(long target, String id) { setFilePaused(target, id, true); }
    public void resumeFile(long target, String id) { setFilePaused(target, id, false); }
    private void setFilePaused(long target, String id, boolean pause) {
        command(() -> { ready(); requireContact(target); attachments.pause(target, id, pause); filesChanged(id); });
    }
    public void retryFile(long target, String id) {
        command(() -> {
            ready(); requireContact(target); filesChanged(id);
            if (session == null) reconnect();
        });
    }
    public void ping() {
        final long target = snapshot.activeId;
        command(() -> {
            ready(); requireContact(target);
            final long request = DirectProtocol.pingChallenge();
            challenge = request;
            pingSentAt = 0; pingDeadline = System.nanoTime() + PING_WINDOW;
            pingTime = System.currentTimeMillis(); ping = "Checking " + route.label + "…"; publish();
            lane.schedule(() -> {
                if (!closed && challenge == request) noPingReply();
            }, PING_WINDOW, TimeUnit.NANOSECONDS);
            if (session == null) reconnect();
            else sendPing();
        });
    }
    private void sendPing() throws Exception {
        if (challenge == 0 || pingSentAt != 0) return;
        pingSentAt = System.nanoTime();
        if (pingSentAt - pingDeadline >= 0) { noPingReply(); return; }
        try { session.write(DirectProtocol.HEARTBEAT, challenge, ""); }
        catch (Exception e) { disconnect(session); throw e; }
    }
    private void noPingReply() {
        challenge = 0; pingSentAt = 0; pingTime = System.currentTimeMillis();
        ping = "No reply on " + route.label; publish();
    }

    public void retry() {
        command(() -> {
            ready();
            if (session != null) { pump(); return; }
            if (pair == null) throw new IOException("Pair these phones first");
            shutdownNetwork(); reconnect(); publish();
        });
    }
    public void send(String text) { send(snapshot.activeId, text); }
    public void send(long target, String text) {
        send(target, text, error -> {
            if (error == null) listener.queued(target, text);
            else listener.problem(error);
        });
    }

    // Complete this request on the UI thread at the local SQLite commit boundary.
    // A later refresh or transport error cannot turn a committed message into a failed send.
    void send(long target, String text, Consumer<String> result) {
        command(() -> {
            try {
                ready(); requireContact(target);
                if (text == null || text.trim().isEmpty()) throw new IOException("Enter a message");
                if (text.getBytes(StandardCharsets.UTF_8).length > 4096) throw new IOException("Messages are limited to 4096 UTF-8 bytes");
                long seq = store.next(true);
                JSONObject envelope = codec.seal(pair.host ? pair.ab : pair.ba, pair.host ? "AB" : "BA", seq, text);
                String encoded = envelope.toString();
                if (encoded.getBytes(StandardCharsets.UTF_8).length > DirectProtocol.MAX_BODY) throw new IOException("Encrypted message exceeds transport limit");
                store.save(true, seq, text, encoded);
            } catch (Exception e) {
                finishSend(result, detail(e));
                return;
            }
            finishSend(result, null);
            if (draft.equals(text)) draft = "";
            history = store.history(); contacts = store.contacts(); publish();
            try { pump(); } catch (Exception e) { disconnect(session); }
        });
    }

    private void finishSend(Consumer<String> result, String error) {
        main.post(() -> { if (!closed && !concealed) result.accept(error); });
    }

    private void ready() throws IOException { if (!loaded) throw new IOException("Mailbox could not be opened"); }

    private void reconnect() throws Exception {
        if (!started || closed || concealed || pair == null || session != null || route == Route.BLUETOOTH) return;
        if (route == Route.WIFI_DIRECT && wifiEndpoint.isEmpty()) return;
        if (pair.host) {
            if (server == null) {
                ServerSocket listening = new ServerSocket();
                try {
                    listening.setReuseAddress(true);
                    listening.bind(route == Route.WIFI_DIRECT ? new InetSocketAddress(wifiEndpoint, pair.port) : new InetSocketAddress(pair.port));
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
                    // Only an authenticated CubeChat peer connection may leave the local
                    // drop-all VPN. Protect it before connecting; never fall back.
                    LockdownFirewall.protectChatSocket(app, socket);
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
        if (closed || concealed || epoch != generation) throw new IOException("Pairing changed");
    }

    private void open(DirectProtocol link) throws Exception {
        long pending = store.pending();
        long expected = pending >= 0 ? pending : store.next(true);
        store.preparePeerPurgeNotice(activeId);
        close(session); session = link; exchange = null; sentSeq = -1; connecting = false;
        nextWireSequence = expected;
        purgeCapableSession = null; recordedPurge = false;
        lastReceived = System.nanoTime();
        status = connectedStatus();
        publish();
        io.execute(() -> {
            try {
                for (;;) {
                    DirectProtocol.Record record = link.readRecord();
                    await(() -> { if (session != link) throw new IOException("Session replaced"); receive(link, record); return null; });
                }
            } catch (Exception e) { socketLost(link); }
        });
        try { link.write(DirectProtocol.HEARTBEAT, DirectProtocol.PURGE_HELLO, "");
            link.write(DirectProtocol.HEARTBEAT, DirectProtocol.FILE_HELLO, ""); sendPing(); pump(); }
        catch (Exception e) { disconnect(link); throw e; }
    }
    private void receive(DirectProtocol link, DirectProtocol.Record record) throws Exception {
        lastReceived = System.nanoTime();
        if (record.type == DirectProtocol.HEARTBEAT && record.sequence == DirectProtocol.PURGE_HELLO) {
            purgeCapableSession = link;
            return;
        }
        if (purging) return;
        if (record.type == DirectProtocol.HEARTBEAT && record.sequence == DirectProtocol.PURGE_NOTICE) {
            if (purgeCapableSession != link) throw new IOException("Unexpected PURGE announcement");
            if (!recordedPurge) {
                store.recordPeerPurgeNotice(activeId);
                recordedPurge = true;
            }
            if (!parked) { history = store.history(); publish(); }
            return;
        }
        if (parked) {
            if (record.type == DirectProtocol.HEARTBEAT) {
                if (record.sequence == DirectProtocol.FILE_HELLO) parkedFileSupport = true;
            } else {
                // The Cube envelope and file manifest/chunk stay encrypted until normal unlock.
                if (parkedRecords.size() >= 96 || record.body.length() > 4 * 1024 * 1024 - parkedBytes)
                    throw new IOException("Locked mailbox will resume after unlock");
                parkedRecords.add(record); parkedBytes += record.body.length();
            }
            return;
        }
        if (record.type == DirectProtocol.FILE) {
            if (exchange == null) throw new IOException("File support was not negotiated");
            refreshFiles(exchange.receive(record.body));
        } else if (record.type == DirectProtocol.MESSAGE) {
            commitIncoming(record);
            // A replica of a committed record, e.g. after a lost receipt, receives the same acknowledgement.
            link.write(DirectProtocol.RECEIPT, record.sequence, "");
        } else if (record.type == DirectProtocol.RECEIPT && sentSeq >= 0 && sentSeq == record.sequence) {
            store.delivered(sentSeq); sentSeq = -1; history = store.history(); contacts = store.contacts(); publish(); pump();
        } else if (record.type == DirectProtocol.HEARTBEAT) {
            if (record.sequence == DirectProtocol.FILE_HELLO) {
                if (exchange == null) {
                    exchange = new AttachmentExchange(attachments, codec, activeId, pair, link);
                    refreshFiles(true); exchange.sync();
                }
            } else if (DirectProtocol.pingRequest(record.sequence)) {
                link.write(DirectProtocol.HEARTBEAT, record.sequence + 1, "");
            } else if (challenge != 0 && pingSentAt != 0 && record.sequence == challenge + 1) {
                long now = System.nanoTime();
                if (now - pingDeadline >= 0) { noPingReply(); return; }
                long millis = Math.max(1, TimeUnit.NANOSECONDS.toMillis(now - pingSentAt));
                challenge = 0; pingSentAt = 0; pingTime = System.currentTimeMillis();
                ping = "Peer replied over " + route.label + " · " + millis + " ms"; publish();
            }
        }
    }
    private void commitIncoming(DirectProtocol.Record record) throws Exception {
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
    }
    private void pump() throws Exception {
        if (concealed || session == null || sentSeq >= 0) return;
        long seq = store.pending();
        if (seq >= 0) {
            session.write(DirectProtocol.MESSAGE, seq, store.packet(seq));
            sentSeq = seq; nextWireSequence = seq + 1; sentAt = System.nanoTime();
        }
    }
    private synchronized void socketLost(DirectProtocol link) {
        if (!closed) lane.execute(() -> disconnect(link));
    }
    private void disconnect(DirectProtocol link) {
        if (link == null || session != link) return;
        close(link); session = null; purgeCapableSession = null; exchange = null; sentSeq = -1;
        if (purging) { finishPurge(); return; }
        if (parked || pair == null) return;
        if (challenge != 0 && pingSentAt != 0) noPingReply();
        status = route == Route.BLUETOOTH ? "Waiting for Bluetooth reconnection" : pair.host ? "Waiting for paired phone" : "Disconnected. Retrying…"; publish();
    }
    private static void close(java.io.Closeable object) { if (object != null) try { object.close(); } catch (IOException ignored) {} }
    private void shutdownNetwork() {
        closeListeners();
        exchange = null; purgeCapableSession = null; legacyNotice = null; legacyNoticeSeq = -1;
        close(session); session = null; sentSeq = -1;
    }
    private void closeListeners() {
        generation++;
        if (challenge != 0) { challenge = 0; pingSentAt = 0; ping = ""; pingTime = 0; }
        close(bluetoothCandidate); bluetoothCandidate = null;
        close(advertiser); advertiser = null;
        if (multicast != null) { if (multicast.isHeld()) multicast.release(); multicast = null; }
        close(server); server = null; connecting = false; needsDiscovery = false;
    }
    /** Immediately conceal the snapshot, then shed vault-backed state on its owning worker. */
    public void lockVault(Runnable onParked) { parkVault(onParked, true); }
    public void pauseForEnrollment(Runnable onParked) { parkVault(onParked, false); }

    private synchronized void parkVault(Runnable onParked, boolean bounded) {
        concealed = true;
        visibilityRevision++;
        snapshot = LOCKED;
        if (closed) { main.post(onParked); return; }
        // A pending file/transport operation must not keep the password gate disabled.
        AtomicBoolean signaled = new AtomicBoolean();
        Runnable notifyParked = () -> {
            if (signaled.compareAndSet(false, true)) main.post(onParked);
        };
        ScheduledFuture<?> gateTimeout = bounded ? PURGE_TIMER.schedule(notifyParked, 1500, TimeUnit.MILLISECONDS) : null;
        lane.execute(() -> {
            try {
                if (parked) return;
                closeListeners();
                if (session != null && purgeCapableSession != session) prepareLegacyNotice();
            } catch (Exception ignored) {
                // A failing legacy codec cannot prevent local lock or reset.
            } finally {
                parked = true;
                parkedFileSupport |= exchange != null;
                exchange = null; pair = null; invitation = ""; draft = ""; history = Collections.emptyList();
                clearAttachmentViews(); contacts = Collections.emptyList();
                status = ""; ping = ""; pingTime = 0; loaded = false;
                if (gateTimeout != null) gateTimeout.cancel(false);
                notifyParked.run();
            }
        });
    }

    /** Called only after the normal password has opened the local vault. */
    public synchronized void unlockVault() {
        if (closed || purging) return;
        long revision = ++visibilityRevision;
        lane.execute(() -> {
            try {
                loadSelection(true);
                parked = false;
                DirectProtocol live = session;
                if (live != null && parkedFileSupport) {
                    exchange = new AttachmentExchange(attachments, codec, activeId, pair, live);
                    exchange.sync();
                }
                while (!parkedRecords.isEmpty()) {
                    DirectProtocol.Record record = parkedRecords.remove();
                    if (live != null) receive(live, record);
                    else if (record.type == DirectProtocol.MESSAGE) commitIncoming(record);
                }
                if (live != null) status = connectedStatus();
                loaded = true;
            } catch (Exception e) {
                if (session != null) disconnect(session);
                status = "Could not resume conversation: " + detail(e);
            } finally {
                parkedRecords.clear(); parkedBytes = 0; parkedFileSupport = false;
                legacyNotice = null; legacyNoticeSeq = -1;
                synchronized (this) {
                    if (revision == visibilityRevision && !purging && !closed) concealed = false;
                }
                publish();
            }
            if (!concealed) {
                try { if (session != null) pump(); else reconnect(); }
                catch (Exception e) { report(detail(e)); }
            }
        });
    }

    private void prepareLegacyNotice() throws Exception {
        if (pair == null || session == null || legacyNotice != null) return;
        legacyNoticeSeq = nextWireSequence;
        legacyNotice = codec.seal(pair.host ? pair.ab : pair.ba, pair.host ? "AB" : "BA",
                legacyNoticeSeq, PURGE_NOTICE).toString();
    }

    /** A recovered activation can join a broadcast already running in another Activity. */
    public static void announcePurgeToAll(Runnable onFinished) {
        List<PeerLink> connected;
        synchronized (mailboxes) {
            purgeWaiters.add(onFinished);
            if (purgeWaiters.size() > 1) return;
            connected = new ArrayList<>();
            for (PeerLink box : mailboxes) {
                if (!box.closed && !box.purging && box.session != null) connected.add(box);
            }
        }
        Handler main = new Handler(Looper.getMainLooper());
        AtomicBoolean finished = new AtomicBoolean();
        Runnable finish = () -> {
            if (!finished.compareAndSet(false, true)) return;
            main.post(() -> {
                List<Runnable> callbacks;
                synchronized (mailboxes) {
                    callbacks = new ArrayList<>(purgeWaiters);
                    purgeWaiters.clear();
                }
                for (Runnable callback : callbacks) callback.run();
            });
        };
        if (connected.isEmpty()) { finish.run(); return; }
        AtomicInteger remaining = new AtomicInteger(connected.size());
        ScheduledFuture<?> hardDeadline = PURGE_TIMER.schedule(finish, PURGE_WRITE_MILLIS, TimeUnit.MILLISECONDS);
        Runnable peerDone = () -> {
            if (remaining.decrementAndGet() == 0) {
                hardDeadline.cancel(false);
                finish.run();
            }
        };
        for (PeerLink box : connected) box.announcePurge(peerDone);
    }

    /** Announce within this mailbox's one already authenticated conversation, without reconnecting. */
    synchronized void announcePurge(Runnable onFinished) {
        if (purging) return;
        purging = true; concealed = true; snapshot = LOCKED;
        purgeCallback = onFinished;
        if (closed || session == null) { finishPurge(); return; }
        // Cut off a blocked local writer even when its mailbox lane is already occupied.
        purgeTimeout = PURGE_TIMER.schedule(this::finishPurge, PURGE_WRITE_MILLIS, TimeUnit.MILLISECONDS);
        DirectProtocol target = session;
        if (target == null) { finishPurge(); return; }
        if (purgeCapableSession == target) {
            io.execute(() -> {
                if (purgeFinished.get()) return;
                try { target.write(DirectProtocol.HEARTBEAT, DirectProtocol.PURGE_NOTICE, ""); }
                catch (Exception closedTransport) { /* Best-effort on live links. */ }
                finally { finishPurge(); }
            });
        } else {
            lane.execute(() -> {
                try {
                    if (purgeFinished.get()) return;
                    prepareLegacyNotice();
                    if (legacyNotice != null && session == target && !purgeFinished.get())
                        target.write(DirectProtocol.MESSAGE, legacyNoticeSeq, legacyNotice);
                } catch (Exception failed) { /* A legacy peer may already be gone. */ }
                finally { finishPurge(); }
            });
        }
    }

    private void finishPurge() {
        if (!purgeFinished.compareAndSet(false, true)) return;
        ScheduledFuture<?> deadline = purgeTimeout;
        if (deadline != null) deadline.cancel(false);
        Runnable done = purgeCallback;
        if (done != null) main.post(done);
        DirectProtocol link = session;
        if (link != null) {
            Thread closer = new Thread(() -> close(link), "CubeChat closing purge session");
            closer.setDaemon(true);
            closer.start();
        }
    }

    private String connectedStatus() {
        return route == Route.BLUETOOTH ? "Connected over Bluetooth" : route == Route.WIFI_DIRECT
                ? "Connected over Wi-Fi Direct" : route == Route.RELAY ? "Connected through relay" : "Connected";
    }
    public synchronized void stop() {
        if (closed) return;
        closed = true;
        synchronized (mailboxes) { mailboxes.remove(this); }
        if (purging) finishPurge();
        lane.execute(() -> { shutdownNetwork(); close(forwarder); forwarder = null; store.close(); fileIo.shutdown(); io.shutdownNow(); lane.shutdownNow(); });
    }
}
