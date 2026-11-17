package org.cubechat.android;

import org.json.JSONObject;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** One active, authenticated transport. Durable positions and decisions live in the per-contact vault. */
final class AttachmentExchange {
    private final AttachmentStore store;
    private final PeerLink.Codec codec;
    private final long contact;
    private final Pairing pair;
    private final DirectProtocol wire;
    private final Set<String> offered = new HashSet<>(), ready = new HashSet<>(), notified = new HashSet<>();
    private final Map<String, Long> outstanding = new HashMap<>();

    AttachmentExchange(AttachmentStore store, PeerLink.Codec codec, long contact, Pairing pair, DirectProtocol wire) {
        this.store = store; this.codec = codec; this.contact = contact; this.pair = pair; this.wire = wire;
    }

    private static JSONObject frame(String operation, String id) throws Exception {
        return new JSONObject().put("op", operation).put("id", id);
    }
    private void write(JSONObject packet) throws Exception { wire.write(DirectProtocol.FILE, 0, packet.toString()); }

    private static boolean finished(String state) {
        return state.equals(AttachmentStore.COMPLETE) || state.equals(AttachmentStore.REMOVED);
    }
    private static boolean stopped(String state) {
        return state.equals(AttachmentStore.DECLINED) || state.equals(AttachmentStore.CANCELED);
    }

    void sync() throws Exception {
        for (AttachmentStore.Transfer file : store.list(contact)) {
            if (file.notifyPeer && stopped(file.status)) {
                if (notified.add(file.id)) write(frame("stop", file.id).put("status", file.status));
            } else if (file.outgoing && !finished(file.status) && !stopped(file.status)) {
                if (offered.add(file.id)) {
                    JSONObject info = new JSONObject().put("id", file.id).put("name", file.name).put("mime", file.mime)
                            .put("size", file.size).put("sha256", file.sha256);
                    String key = DirectProtocol.hex(AttachmentWire.key(pair, true, file.id, "manifest"));
                    JSONObject manifest = codec.seal(key, AttachmentWire.channel(pair, true), 0, info.toString());
                    write(frame("offer", file.id).put("manifest", manifest).put("paused", file.paused));
                } else sendChunk(file);
            }
        }
    }

    private void sendChunk(AttachmentStore.Transfer file) throws Exception {
        if (!ready.contains(file.id) || !AttachmentStore.ACCEPTED.equals(file.status) || file.paused || file.peerPaused
                || file.progress >= file.size || outstanding.containsKey(file.id)) return;
        byte[] bytes = store.readChunk(contact, file.id, file.progress);
        if (bytes.length != Math.min(AttachmentStore.CHUNK, file.size - file.progress)) throw new IOException("Invalid stored chunk length");
        byte[] key = AttachmentWire.key(pair, true, file.id, "chunks");
        String body = AttachmentWire.sealChunk(key, file.id, file.size, file.progress, file.sha256, bytes);
        outstanding.put(file.id, file.progress);
        write(frame("chunk", file.id).put("offset", file.progress).put("data", body));
    }

    private void reply(AttachmentStore.Transfer file) throws Exception {
        String state = finished(file.status) ? AttachmentStore.COMPLETE : file.status;
        write(frame("state", file.id).put("status", state).put("at", finished(file.status) ? file.size : file.progress).put("paused", file.paused));
    }

    void localChange(String id) throws Exception {
        AttachmentStore.Transfer file = store.get(contact, id);
        if (file == null) return;
        if (file.outgoing) {
            offered.remove(id); ready.remove(id); outstanding.remove(id);
        } else if (!stopped(file.status)) reply(file);
        sync();
    }

    boolean receive(String body) throws Exception {
        JSONObject msg = new JSONObject(body);
        String id = msg.getString("id"), op = msg.getString("op");
        AttachmentWire.requireId(id);
        if ("offer".equals(op)) {
            String key = DirectProtocol.hex(AttachmentWire.key(pair, false, id, "manifest"));
            JSONObject manifest = msg.getJSONObject("manifest");
            if (manifest.getLong("sequence") != 0) throw new IOException("Invalid attachment manifest sequence");
            JSONObject info = new JSONObject(codec.open(key, AttachmentWire.channel(pair, false), manifest));
            if (!id.equals(info.getString("id"))) throw new IOException("Mismatched attachment manifest");
            AttachmentStore.Transfer existing = store.get(contact, id);
            if (existing != null && existing.outgoing) throw new IOException("Ambiguous file direction");
            AttachmentStore.Transfer file;
            try {
                file = store.offer(contact, id, info.getString("name"), info.getString("mime"),
                        integer(info, "size"), info.getString("sha256"));
            } catch (IOException refused) {
                write(frame("state", id).put("status", AttachmentStore.DECLINED).put("at", 0).put("paused", false));
                return false;
            }
            if (file.peerPaused != msg.getBoolean("paused")) file = store.peerPause(contact, id, msg.getBoolean("paused"));
            reply(file);
            return true;
        }
        AttachmentStore.Transfer file = store.get(contact, id);
        if ("stop".equals(op)) {
            String status = msg.getString("status");
            if (!stopped(status)) throw new IOException("Invalid stop status");
            if (file != null && finished(file.status)) {
                // An already verified delivery cannot be retroactively canceled after its final receipt was lost.
                if (!file.outgoing) reply(file);
            } else if (file != null && !stopped(file.status)) {
                if (AttachmentStore.DECLINED.equals(status) && !file.outgoing) throw new IOException("Invalid transfer direction");
                store.terminate(contact, id, status, false);
            }
            release(id); write(frame("stopAck", id)); return true;
        }
        if (file == null) return false;
        if ("stopAck".equals(op)) {
            if (file.notifyPeer && notified.remove(id)) store.markNotified(contact, id);
            return false;
        }
        if ("state".equals(op)) {
            if (!file.outgoing) throw new IOException("Invalid attachment state direction");
            if (finished(file.status) || stopped(file.status) || !offered.contains(id)) return false;
            String status = msg.getString("status");
            long offset = integer(msg, "at");
            if (offset < 0 || offset > file.size || (offset < file.size && offset % AttachmentStore.CHUNK != 0))
                throw new IOException("Invalid transfer position");
            boolean pauseChanged = msg.getBoolean("paused") != file.peerPaused;
            if (pauseChanged) file = store.peerPause(contact, id, msg.getBoolean("paused"));
            if (AttachmentStore.COMPLETE.equals(status)) {
                if (offset != file.size) throw new IOException("Invalid completion receipt");
                store.finishOutgoing(contact, id); release(id); return true;
            }
            if (stopped(status)) {
                store.terminate(contact, id, status, false); write(frame("stopAck", id)); release(id); return true;
            }
            if (AttachmentStore.OFFERED.equals(status)) { ready.remove(id); return true; }
            if (!AttachmentStore.ACCEPTED.equals(status)) throw new IOException("Unknown transfer state");
            boolean newlyAccepted = ready.add(id);
            Long pendingOffset = outstanding.get(id);
            if (!newlyAccepted && offset < file.progress) return false;
            if (pendingOffset != null && (file.peerPaused || offset > pendingOffset)) outstanding.remove(id);
            file = store.acknowledged(contact, id, offset);
            sendChunk(file); return newlyAccepted || pauseChanged;
        }
        if ("chunk".equals(op)) {
            if (file.outgoing) throw new IOException("Invalid attachment chunk direction");
            if (!AttachmentStore.ACCEPTED.equals(file.status) || file.paused) { reply(file); return false; }
            long offset = integer(msg, "offset");
            if (offset != file.progress) { reply(file); return false; }
            byte[] key = AttachmentWire.key(pair, false, id, "chunks");
            try {
                byte[] bytes = AttachmentWire.openChunk(key, id, file.size, offset, file.sha256, msg.getString("data"));
                file = store.append(contact, id, offset, bytes);
            } catch (GeneralSecurityException | IllegalArgumentException | IOException e) {
                file = store.terminate(contact, id, AttachmentStore.CANCELED, true);
            }
            if (stopped(file.status)) { localChange(id); return true; }
            reply(file); return finished(file.status);
        }
        throw new IOException("Unknown attachment operation");
    }

    private static long integer(JSONObject msg, String name) throws Exception {
        Object value = msg.get(name);
        if (!(value instanceof Number) || ((Number)value).doubleValue() != ((Number)value).longValue())
            throw new IOException("Invalid attachment number");
        return ((Number)value).longValue();
    }

    private void release(String id) { offered.remove(id); ready.remove(id); outstanding.remove(id); notified.remove(id); }
}
