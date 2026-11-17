package org.cubechat.android;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.provider.OpenableColumns;
import org.json.JSONObject;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Encrypted attachment manifests and fixed-size chunks in the same SQLite vault as their contact. */
final class AttachmentStore {
    static final int CHUNK = 32 * 1024, MAX_BYTES = 8 * 1024 * 1024;
    private static final long VAULT_BYTES = 64L * 1024 * 1024;
    private static final int CONTACT_PENDING = 16, GLOBAL_PENDING = 64, RECORD_LIMIT = 4096;
    static final String OFFERED = "OFFERED", ACCEPTED = "ACCEPTED", COMPLETE = "COMPLETE",
            DECLINED = "DECLINED", CANCELED = "CANCELED", REMOVED = "REMOVED";
    private static final String[] FIELDS = {"id", "outgoing", "size", "progress", "status", "notify", "paused", "peer_paused", "manifest"};
    private static final String COLUMNS = String.join(",", FIELDS);
    private static final String MATCH = "contact=? AND id=?";
    private final Context context;
    private final ChatStore store;

    static final class Transfer {
        final String id, name, mime, sha256, status;
        final long size, progress;
        final boolean outgoing, notifyPeer, paused, peerPaused;
        Transfer(Cursor row, JSONObject manifest) throws Exception {
            id = row.getString(0); outgoing = row.getInt(1) != 0; size = row.getLong(2);
            progress = row.getLong(3); status = row.getString(4); notifyPeer = row.getInt(5) != 0;
            paused = row.getInt(6) != 0; peerPaused = row.getInt(7) != 0;
            if (size != manifest.getLong("size")) throw new IOException("Damaged attachment size");
            name = manifest.getString("name"); mime = manifest.getString("mime"); sha256 = manifest.getString("sha256");
        }
    }

    AttachmentStore(Context context, ChatStore store) {
        this.context = context.getApplicationContext();
        this.store = store;
    }

    static void createTables(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE attachments(contact INTEGER NOT NULL, id TEXT NOT NULL, outgoing INTEGER NOT NULL, "
                + "size INTEGER NOT NULL, progress INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, "
                + "notify INTEGER NOT NULL DEFAULT 0, paused INTEGER NOT NULL DEFAULT 0, peer_paused INTEGER NOT NULL DEFAULT 0, "
                + "manifest BLOB NOT NULL, PRIMARY KEY(contact,id))");
        db.execSQL("CREATE TABLE attachment_chunks(contact INTEGER NOT NULL, id TEXT NOT NULL, offset INTEGER NOT NULL, "
                + "body BLOB NOT NULL, PRIMARY KEY(contact,id,offset))");
        db.execSQL("CREATE TRIGGER forget_attachments AFTER DELETE ON contacts BEGIN "
                + "DELETE FROM attachments WHERE contact=OLD.id; END");
        db.execSQL("CREATE TRIGGER erase_attachment_chunks AFTER DELETE ON attachments BEGIN "
                + "DELETE FROM attachment_chunks WHERE contact=OLD.contact AND id=OLD.id; END");
    }

    private static String[] args(long cid, String id) {
        return new String[]{Long.toString(cid), id};
    }
    private static String aad(long cid, String id, boolean outgoing, String field) {
        return "attachment/v1/" + cid + "/" + id + "/" + (outgoing ? "out/" : "in/") + field;
    }
    private Transfer decode(long cid, Cursor c) throws Exception {
        String field = aad(cid, c.getString(0), c.getInt(1) != 0, "manifest");
        return new Transfer(c, new JSONObject(new String(store.openBytes(c.getBlob(8), field), StandardCharsets.UTF_8)));
    }
    List<Transfer> list(long cid) throws Exception {
        ArrayList<Transfer> files = new ArrayList<>();
        try (Cursor c = store.getReadableDatabase().rawQuery("SELECT " + COLUMNS
                + " FROM attachments WHERE contact=? ORDER BY rowid DESC", new String[]{Long.toString(cid)})) {
            while (c.moveToNext()) files.add(decode(cid, c));
        }
        return Collections.unmodifiableList(files);
    }
    Transfer get(long cid, String id) throws Exception {
        try (Cursor c = store.getReadableDatabase().rawQuery("SELECT " + COLUMNS + " FROM attachments WHERE " + MATCH, args(cid, id))) {
            return c.moveToFirst() ? decode(cid, c) : null;
        }
    }
    private Transfer require(long cid, String id) throws Exception {
        Transfer t = get(cid, id);
        if (t == null) throw new IOException("Attachment no longer exists");
        return t;
    }
    private long count(String sql, String... args) {
        try (Cursor c = store.getReadableDatabase().rawQuery(sql, args)) {
            c.moveToFirst();
            return c.getLong(0);
        }
    }
    private void checkNew(long cid) throws IOException {
        String c = Long.toString(cid);
        if (count("SELECT COUNT(*) FROM contacts WHERE id=?", c) != 1) throw new IOException("Conversation no longer exists");
        String pending = " FROM attachments WHERE status IN ('OFFERED','ACCEPTED')";
        if (count("SELECT COUNT(*)" + pending + " AND contact=?", c) >= CONTACT_PENDING
                || count("SELECT COUNT(*)" + pending) >= GLOBAL_PENDING)
            throw new IOException("Too many pending files. Finish or decline an existing transfer.");
        if (count("SELECT COUNT(*) FROM attachments") >= RECORD_LIMIT) {
            // Aged decisions can be evicted. A replay then needs fresh consent, even for an empty file.
            store.getWritableDatabase().execSQL("DELETE FROM attachments WHERE rowid=(SELECT MIN(rowid) FROM attachments "
                    + "WHERE status IN ('REMOVED','DECLINED','CANCELED') AND notify=0)");
            if (count("SELECT COUNT(*) FROM attachments") >= RECORD_LIMIT)
                throw new IOException("The attachment history is full. Remove completed files to make room.");
        }
    }
    private void reserve(long size) throws IOException {
        long reserved = count("SELECT COALESCE(SUM(size),0) FROM attachments WHERE status IN ('ACCEPTED','COMPLETE') "
                + "OR (status='OFFERED' AND outgoing=1)");
        if (size > VAULT_BYTES - reserved) throw new IOException("Attachment storage is full. Remove a completed file or cancel a transfer.");
    }
    private static String safeName(String raw) {
        if (raw == null) return "attachment";
        int slash = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
        String tail = raw.substring(slash + 1);
        StringBuilder name = new StringBuilder();
        for (int pos = 0, chars = 0; pos < tail.length() && chars < 100; chars++) {
            int ch = tail.codePointAt(pos);
            pos += Character.charCount(ch);
            if (!Character.isISOControl(ch) && Character.getType(ch) != Character.FORMAT) name.appendCodePoint(ch);
        }
        String clean = name.toString().trim();
        return clean.isEmpty() || clean.equals(".") || clean.equals("..") ? "attachment" : clean;
    }
    private static String safeMime(String mime) {
        if (mime == null || mime.length() > 127 || !mime.matches("[A-Za-z0-9!#$&^_.+~-]+/[A-Za-z0-9!#$&^_.+~-]+"))
            return "application/octet-stream";
        return mime.toLowerCase(Locale.ROOT);
    }
    private static void checkUri(Uri uri) throws IOException {
        if (uri == null || !"content".equalsIgnoreCase(uri.getScheme())) throw new IOException("Choose a document from Android's file picker");
    }
    private static void verifySize(long size) throws IOException {
        if (size < 0 || size > MAX_BYTES) throw new IOException("Files must be 8 MiB or smaller");
    }
    private static void verifyId(String id) throws IOException {
        if (id == null || !id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))
            throw new IOException("Invalid attachment ID");
    }
    private void insert(long cid, String id, boolean outgoing, String name, String mime, long size, String hash) throws Exception {
        JSONObject manifest = new JSONObject().put("name", name).put("mime", mime).put("size", size).put("sha256", hash);
        ContentValues row = new ContentValues();
        row.put("contact", cid); row.put("id", id); row.put("outgoing", outgoing); row.put("size", size); row.put("status", OFFERED);
        row.put("manifest", store.sealBytes(manifest.toString().getBytes(StandardCharsets.UTF_8), aad(cid, id, outgoing, "manifest")));
        store.getWritableDatabase().insertOrThrow("attachments", null, row);
    }
    private void insertChunk(long cid, String id, long offset, byte[] encrypted) {
        ContentValues row = new ContentValues();
        row.put("contact", cid); row.put("id", id); row.put("offset", offset); row.put("body", encrypted);
        store.getWritableDatabase().insertOrThrow("attachment_chunks", null, row);
    }
    Transfer importFile(long cid, Uri source) throws Exception {
        checkUri(source);
        ContentResolver resolver = context.getContentResolver();
        String name = null;
        long declared = -1;
        try (Cursor c = resolver.query(source, new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int n = c.getColumnIndex(OpenableColumns.DISPLAY_NAME), s = c.getColumnIndex(OpenableColumns.SIZE);
                if (n >= 0) name = c.getString(n);
                if (s >= 0 && !c.isNull(s)) declared = c.getLong(s);
            }
        }
        if (declared > MAX_BYTES) verifySize(declared);
        String mime = resolver.getType(source);
        try (InputStream in = resolver.openInputStream(source)) {
            if (in == null) throw new IOException("Cannot open the selected file");
            return importFile(cid, name, mime, in);
        }
    }

    Transfer importFile(long cid, String rawName, String rawMime, InputStream input) throws Exception {
        String id = UUID.randomUUID().toString();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        List<byte[]> encrypted = new ArrayList<>();
        long size = 0;
        byte[] raw = new byte[CHUNK];
        // Never hold a database lock while waiting for a document provider. Only encrypted chunks are staged.
        try {
            for (;;) {
                int n = 0;
                while (n < CHUNK) {
                    int read = input.read(raw, n, CHUNK - n);
                    if (read < 0) break;
                    if (read == 0) {
                        int b = input.read();
                        if (b < 0) break;
                        raw[n++] = (byte)b;
                    } else n += read;
                }
                if (n == 0) break;
                verifySize(size + n);
                digest.update(raw, 0, n);
                byte[] part = n == CHUNK ? raw : Arrays.copyOf(raw, n);
                try { encrypted.add(store.sealBytes(part, aad(cid, id, true, "chunk/" + size))); }
                finally { if (part != raw) Arrays.fill(part, (byte)0); }
                size += n;
                if (n < CHUNK) break;
            }
        } finally { Arrays.fill(raw, (byte)0); }
        String hash = DirectProtocol.hex(digest.digest());
        SQLiteDatabase db = store.getWritableDatabase();
        db.beginTransaction();
        try {
            checkNew(cid); reserve(size);
            insert(cid, id, true, safeName(rawName), safeMime(rawMime), size, hash);
            long offset = 0;
            for (byte[] part : encrypted) {
                insertChunk(cid, id, offset, part);
                offset += CHUNK;
            }
            Transfer result = require(cid, id);
            db.setTransactionSuccessful();
            return result;
        } finally { db.endTransaction(); }
    }

    Transfer offer(long cid, String id, String rawName, String rawMime, long size, String hash) throws Exception {
        verifyId(id); verifySize(size);
        if (rawName == null || rawName.length() > 1024 || rawMime == null || rawMime.length() > 256
                || hash == null || !hash.matches("[0-9a-f]{64}")) throw new IOException("Invalid attachment offer");
        String name = safeName(rawName), mime = safeMime(rawMime);
        SQLiteDatabase db = store.getWritableDatabase();
        db.beginTransaction();
        try {
            Transfer entry = get(cid, id);
            if (entry == null) {
                checkNew(cid);
                insert(cid, id, false, name, mime, size, hash);
                entry = require(cid, id);
            } else if (entry.outgoing || entry.size != size || !entry.name.equals(name)
                    || !entry.mime.equals(mime) || !entry.sha256.equals(hash)) {
                throw new IOException("Attachment ID reused with a different manifest");
            }
            db.setTransactionSuccessful(); return entry;
        } finally { db.endTransaction(); }
    }

    private void update(long cid, String id, ContentValues values) throws IOException {
        if (store.getWritableDatabase().update("attachments", values, MATCH, args(cid, id)) != 1)
            throw new IOException("Attachment no longer exists");
    }
    private static boolean live(Transfer t) { return OFFERED.equals(t.status) || ACCEPTED.equals(t.status); }
    Transfer accept(long cid, String id) throws Exception {
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid, id);
            if (t.outgoing) throw new IOException("Only incoming files can be accepted");
            if (OFFERED.equals(t.status)) {
                reserve(t.size);
                ContentValues changes = new ContentValues();
                changes.put("status", ACCEPTED);
                update(cid, id, changes);
                if (t.size == 0) verifyIncoming(cid, t);
            }
            Transfer result = require(cid, id); db.setTransactionSuccessful(); return result;
        } finally { db.endTransaction(); }
    }
    private void purge(long cid, String id, String status, boolean notify) throws Exception {
        store.getWritableDatabase().delete("attachment_chunks", MATCH, args(cid,id));
        ContentValues values = new ContentValues();
        values.put("status", status); values.put("notify", notify); values.put("paused", false); values.put("peer_paused", false);
        values.put("progress", 0);
        update(cid,id,values);
    }
    Transfer terminate(long cid, String id, String terminal, boolean notifyPeer) throws Exception {
        if (!CANCELED.equals(terminal) && !DECLINED.equals(terminal)) throw new IOException("Invalid attachment decision");
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid,id);
            if (live(t)) purge(cid,id,terminal,notifyPeer);
            Transfer result = require(cid,id); db.setTransactionSuccessful(); return result;
        } finally { db.endTransaction(); }
    }
    Transfer removeCompleted(long cid, String id) throws Exception {
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid,id);
            if (!COMPLETE.equals(t.status) && !REMOVED.equals(t.status)) throw new IOException("File has not completed");
            purge(cid,id,REMOVED,false);
            Transfer result = require(cid,id); db.setTransactionSuccessful(); return result;
        } finally { db.endTransaction(); }
    }
    void markNotified(long cid, String id) throws Exception {
        ContentValues row = new ContentValues();
        row.put("notify", false); update(cid,id,row);
    }
    private Transfer flag(long cid, String id, String column, boolean value) throws Exception {
        ContentValues row = new ContentValues();
        row.put(column, value);
        store.getWritableDatabase().update("attachments", row, MATCH + " AND status IN ('ACCEPTED','OFFERED')", args(cid,id));
        return require(cid,id);
    }
    Transfer pause(long cid, String id, boolean paused) throws Exception { return flag(cid,id,"paused",paused); }
    Transfer peerPause(long cid, String id, boolean paused) throws Exception { return flag(cid,id,"peer_paused",paused); }

    private static void checkOffset(long offset, long size) throws IOException {
        if (offset < 0 || offset > size || (offset != size && offset % CHUNK != 0)) throw new IOException("Invalid attachment offset");
    }
    Transfer acknowledged(long cid, String id, long offset) throws Exception {
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid,id);
            if (!t.outgoing) throw new IOException("Unexpected file receipt");
            checkOffset(offset,t.size);
            if (live(t)) {
                ContentValues changes = new ContentValues(); changes.put("status", ACCEPTED); changes.put("progress", offset);
                update(cid,id,changes);
            }
            Transfer result = require(cid,id); db.setTransactionSuccessful(); return result;
        } finally { db.endTransaction(); }
    }
    Transfer finishOutgoing(long cid, String id) throws Exception {
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid,id);
            if (!t.outgoing) throw new IOException("Unexpected completion receipt");
            if (live(t)) {
                ContentValues changes = new ContentValues(); changes.put("status", COMPLETE); changes.put("progress", t.size);
                changes.put("paused", false); changes.put("peer_paused", false);
                update(cid,id,changes);
            }
            Transfer result = require(cid,id); db.setTransactionSuccessful(); return result;
        } finally { db.endTransaction(); }
    }

    private byte[] chunk(long cid, Transfer t, long offset) throws Exception {
        try (Cursor c = store.getReadableDatabase().rawQuery("SELECT body FROM attachment_chunks WHERE " + MATCH + " AND offset=?",
                new String[]{Long.toString(cid), t.id, Long.toString(offset)})) {
            if (!c.moveToFirst()) throw new IOException("Attachment chunk is missing");
            byte[] encrypted = c.getBlob(0);
            if (encrypted == null || encrypted.length < 28) throw new IOException("Damaged encrypted attachment chunk");
            byte[] bytes = store.openBytes(encrypted, aad(cid,t.id,t.outgoing,"chunk/" + offset));
            if (bytes.length != Math.min(CHUNK, t.size - offset)) throw new IOException("Attachment chunk length mismatch");
            return bytes;
        }
    }
    byte[] readChunk(long cid, String id, long offset) throws Exception {
        Transfer t = require(cid,id);
        if (!t.outgoing || !ACCEPTED.equals(t.status) || t.paused || t.peerPaused) throw new IOException("Attachment is not ready to send");
        checkOffset(offset,t.size);
        if (offset >= t.size) throw new IOException("End of attachment");
        return chunk(cid,t,offset);
    }
    private boolean verified(long cid, Transfer t, List<byte[]> keep) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (long pos = 0; pos < t.size; pos += CHUNK) {
            byte[] part = chunk(cid,t,pos);
            digest.update(part);
            if (keep != null) keep.add(part);
            else Arrays.fill(part,(byte)0);
        }
        return DirectProtocol.hex(digest.digest()).equals(t.sha256);
    }
    private void verifyIncoming(long cid, Transfer t) throws Exception {
        boolean valid;
        try { valid = verified(cid,t,null); }
        catch (javax.crypto.BadPaddingException | javax.crypto.IllegalBlockSizeException | IOException damaged) { valid = false; }
        if (!valid) { purge(cid,t.id,CANCELED,true); return; }
        ContentValues row = new ContentValues(); row.put("status", COMPLETE); row.put("progress",t.size);
        row.put("paused", false); row.put("peer_paused", false);
        update(cid,t.id,row);
    }
    Transfer append(long cid, String id, long offset, byte[] plain) throws Exception {
        if (plain == null || plain.length == 0 || plain.length > CHUNK) throw new IOException("Invalid attachment chunk");
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid,id);
            if (t.outgoing || OFFERED.equals(t.status)) throw new IOException("Attachment was not accepted");
            checkOffset(offset,t.size);
            if (offset >= t.size || plain.length != Math.min(CHUNK,t.size - offset)) throw new IOException("Incorrect attachment chunk length");
            if (ACCEPTED.equals(t.status) && !t.paused && !t.peerPaused && offset == t.progress) {
                insertChunk(cid,id,offset,store.sealBytes(plain,aad(cid,id,false,"chunk/" + offset)));
                long end = offset + plain.length;
                if (end == t.size) verifyIncoming(cid,t);
                else {
                    ContentValues changes = new ContentValues(); changes.put("progress",end);
                    update(cid,id,changes);
                }
            } else if (ACCEPTED.equals(t.status) && offset < t.progress && !Arrays.equals(plain,chunk(cid,t,offset)))
                throw new IOException("File data changed during retry");
            Transfer result = require(cid,id); db.setTransactionSuccessful(); return result;
        } finally { db.endTransaction(); }
    }

    private List<byte[]> exportSnapshot(long cid, String id) throws Exception {
        SQLiteDatabase db = store.getWritableDatabase(); db.beginTransaction();
        try {
            Transfer t = require(cid,id);
            if (!COMPLETE.equals(t.status)) throw new IOException("Only completed, verified files can be saved");
            List<byte[]> parts = new ArrayList<>();
            try {
                if (!verified(cid,t,parts)) throw new IOException("Attachment integrity check failed");
                db.setTransactionSuccessful(); return parts;
            } catch (Exception e) {
                for (byte[] part : parts) Arrays.fill(part,(byte)0);
                throw e;
            }
        } finally { db.endTransaction(); }
    }
    void exportFile(long cid, String id, Uri destination) throws Exception {
        checkUri(destination);
        // Verify the complete contents before asking the provider to open or truncate the document.
        List<byte[]> parts = exportSnapshot(cid,id);
        try (OutputStream out = context.getContentResolver().openOutputStream(destination, "wt")) {
            if (out == null) throw new IOException("Cannot open the selected destination");
            for (byte[] part : parts) out.write(part);
        } finally { for (byte[] part : parts) Arrays.fill(part,(byte)0); }
    }
    void exportFile(long cid, String id, OutputStream out) throws Exception {
        List<byte[]> parts = exportSnapshot(cid,id);
        try { for (byte[] part : parts) out.write(part); }
        finally { for (byte[] part : parts) Arrays.fill(part,(byte)0); }
    }
}
