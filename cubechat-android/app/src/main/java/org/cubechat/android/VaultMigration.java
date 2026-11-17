package org.cubechat.android;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import java.util.Arrays;
import javax.crypto.SecretKey;

/** Called in the same transaction that installs the only recoverable copy of the new vault key. */
final class VaultMigration {
    private final SecretKey previous, replacement;
    private final SQLiteDatabase db;

    VaultMigration(SQLiteDatabase db, SecretKey previous, SecretKey replacement) {
        this.db = db;
        this.previous = previous;
        this.replacement = replacement;
    }

    private void convert(ContentValues values, Cursor row, String column, String aad) throws Exception {
        int index = row.getColumnIndexOrThrow(column);
        if (row.isNull(index)) return;
        byte[] clear = ChatStore.decrypt(previous, row.getBlob(index), aad);
        try { values.put(column, ChatStore.encrypt(replacement, clear, aad)); }
        finally { Arrays.fill(clear, (byte) 0); }
    }

    interface Fields { void convert(ContentValues values, Cursor row) throws Exception; }

    // Bound cursor windows and plaintext working sets even when the attachment vault is full.
    // End each SELECT before rewriting its row.
    private void rows(String table, String columns, Fields fields) throws Exception {
        long last = 0;
        String query = "SELECT rowid AS migration_id," + columns + " FROM " + table
                + " WHERE rowid>? ORDER BY rowid LIMIT 1";
        while (true) {
            ContentValues values = new ContentValues();
            try (Cursor row = db.rawQuery(query, new String[]{Long.toString(last)})) {
                if (!row.moveToFirst()) return;
                last = row.getLong(0);
                fields.convert(values, row);
            }
            if (db.update(table, values, "rowid=?", new String[]{Long.toString(last)}) != 1)
                throw new IllegalStateException("Vault row changed during enrollment");
        }
    }

    void run() throws Exception {
        rows("contacts", "body,alias,route,draft", (v, r) -> {
            long id = r.getLong(0);
            convert(v,r,"body",ChatStore.scope(id,"pair"));
            convert(v,r,"alias",ChatStore.scope(id,"alias"));
            convert(v,r,"route",ChatStore.scope(id,"route"));
            convert(v,r,"draft",ChatStore.scope(id,"draft"));
        });
        rows("peer_notice_templates","body",(v,r) ->
                convert(v,r,"body",ChatStore.scope(r.getLong(0),"peer-purge-notice")));
        rows("messages", "contact_id,outgoing,seq,body,packet", (v, r) -> {
            long contact = r.getLong(1), seq = r.getLong(3);
            int kind = r.getInt(2);
            String field = kind == 2 ? "peer-purge-notice" : "body:" + (kind == 1) + ":" + seq;
            convert(v,r,"body",ChatStore.scope(contact,field));
            convert(v,r,"packet",ChatStore.scope(contact,"packet:" + seq));
        });
        rows("attachments", "contact,id,outgoing,manifest", (v, r) ->
                convert(v,r,"manifest", AttachmentStore.aad(r.getLong(1),r.getString(2),r.getInt(3) != 0,"manifest")));
        rows("attachment_chunks", "contact,id,offset,body,(SELECT outgoing FROM attachments a "
                + "WHERE a.contact=attachment_chunks.contact AND a.id=attachment_chunks.id) AS direction", (v,r) -> {
            if (r.isNull(5)) throw new IllegalStateException("Attachment has no manifest");
            convert(v,r,"body",AttachmentStore.aad(r.getLong(1),r.getString(2),r.getInt(5) != 0,"chunk/" + r.getLong(3)));
        });
    }
}
