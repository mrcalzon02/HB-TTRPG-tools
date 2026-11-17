package org.cubechat.android;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Random;
import java.util.UUID;

/** Runs inside ContactStorageChecks against disposable databases on the device. */
final class AttachmentStorageChecks {
    private interface Operation { void run() throws Exception; }
    private static void check(boolean ok, String message) { if (!ok) throw new AssertionError(message); }
    private static void refused(Operation op) throws Exception {
        try { op.run(); } catch (IOException expected) { return; }
        throw new AssertionError("Invalid attachment operation was accepted");
    }
    private static long count(ChatStore db, String sql, String... args) {
        try (Cursor c = db.getReadableDatabase().rawQuery(sql,args)) { c.moveToFirst(); return c.getLong(0); }
    }
    static void run(Context context) throws Exception {
        // Capacity checks run without filling the device. They cover headroom,
        // simultaneous accepted transfers and exact-fit boundary conditions.
        long mb = 1024L * 1024;
        check(!AttachmentStore.hasIncomingCapacity(4 * mb, 0, 1), "No safety margin");
        check(!AttachmentStore.hasIncomingCapacity(3 * mb, 0, 0), "Unreliable low-space reading");
        check(AttachmentStore.hasIncomingCapacity(20 * mb, 0, 8 * mb), "Valid eight MiB file refused");
        check(AttachmentStore.hasIncomingCapacity(20 * mb, 4 * mb, 4 * mb), "Valid shared capacity refused");
        check(!AttachmentStore.hasIncomingCapacity(20 * mb, 4 * mb, 5 * mb), "Overcommitted concurrent files");
        check(!AttachmentStore.hasIncomingCapacity(20 * mb, 9 * mb, 0), "Existing transfers exceed budget");
        check(!AttachmentStore.hasIncomingCapacity(Long.MAX_VALUE, 0, -1), "Negative offer accepted");
        AttachmentStore.Space initial = new AttachmentStore.Space(20 * mb, 4 * mb, 2 * mb);
        check(initial.deviceFree == 20 * mb && initial.quotaUsed == 4 * mb,
                "Storage summary changed device or quota counters");
        check(initial.acceptableBytes == 6 * mb, "Storage summary and admission check disagree");
        AttachmentStore.Space limited = new AttachmentStore.Space(100 * mb, 63 * mb, 0);
        check(limited.acceptableBytes == mb, "Storage summary ignored vault quota");
        AttachmentStore.Space exhausted = new AttachmentStore.Space(2 * mb, 0, 0);
        check(exhausted.acceptableBytes == 0, "Storage summary promised room without disk margin");

        String name = "cubechat-files-test-" + UUID.randomUUID() + ".db";
        try {
            Pairing original = Pairing.host(null);
            try (ChatStore store = new ChatStore(context,name)) {
                store.createPair(original.json());
                store.save(true,0,"original queued text","original queued packet");
                // Reproduce the released v2 schema including its actual encrypted contact and queue.
                SQLiteDatabase db = store.getWritableDatabase();
                db.execSQL("DROP TABLE vault_profile");
                db.execSQL("DROP TRIGGER forget_peer_notice");
                db.execSQL("DROP TABLE peer_notice_templates");
                db.execSQL("DROP TRIGGER forget_attachments");
                db.execSQL("DROP TRIGGER erase_attachment_chunks");
                db.execSQL("DROP TABLE attachments");
                db.execSQL("DROP TABLE attachment_chunks");
                db.setVersion(2);
            }
            try (ChatStore store = new ChatStore(context,name)) {
                check(store.pairing().getString("private").equals(original.json().getString("private")), "Migration lost pairing");
                check(store.packet(0).equals("original queued packet") && store.pending() == 0, "Migration lost text queue");
                exercise(context,store);
            }
        } finally { context.deleteDatabase(name); }
    }

    static void exercise(Context context, ChatStore chats) throws Exception {
        long sender = chats.activeId();
        long receiver = chats.createPair(Pairing.host(null).json());
        long unrelated = chats.createPair(Pairing.host(null).json());
        AttachmentStore files = new AttachmentStore(context,chats);
        byte[] bytes = new byte[AttachmentStore.CHUNK * 2 + 17];
        new Random(4).nextBytes(bytes);
        String expected = DirectProtocol.hex(MessageDigest.getInstance("SHA-256").digest(bytes));
        AttachmentStore.Transfer out = files.importFile(sender,"../Private-name-183.txt","TEXT/PLAIN",new ByteArrayInputStream(bytes));
        String id = out.id;
        check(out.name.equals("Private-name-183.txt") && out.mime.equals("text/plain") && out.sha256.equals(expected), "Incorrect imported manifest");
        check(files.list(unrelated).isEmpty(), "Imported attachment crossed into another chat");
        check(count(chats,"SELECT COUNT(*) FROM attachments WHERE instr(manifest, CAST(? AS BLOB))>0",out.name)==0,"Filename leaked to disk");
        check(count(chats,"SELECT COUNT(*) FROM attachments WHERE instr(manifest, CAST(? AS BLOB))>0",expected)==0,"Hash leaked to disk");
        check(count(chats,"SELECT COUNT(*) FROM attachment_chunks WHERE body=X'" + DirectProtocol.hex(Arrays.copyOf(bytes, AttachmentStore.CHUNK)) + "'")==0,"Plaintext chunk on disk");

        files.offer(receiver,id,out.name,out.mime,out.size,out.sha256);
        files.offer(receiver,id,out.name,out.mime,out.size,out.sha256);
        check(files.list(receiver).size()==1 && !files.get(receiver,id).outgoing, "Duplicate offer created a new item");
        refused(() -> files.offer(receiver,id,"other.txt",out.mime,out.size,out.sha256));
        refused(() -> files.offer(sender,id,out.name,out.mime,out.size,out.sha256));
        refused(() -> files.append(receiver,id,0,Arrays.copyOf(bytes,AttachmentStore.CHUNK)));
        ByteArrayOutputStream dest = new ByteArrayOutputStream();
        refused(() -> files.exportFile(receiver,id,dest));
        check(dest.size()==0,"Unaccepted file wrote to destination");
        files.accept(receiver,id);
        files.acknowledged(sender,id,0);
        byte[] first = files.readChunk(sender,id,0);
        files.append(receiver,id,0,first);
        check(files.append(receiver,id,0,first).progress==AttachmentStore.CHUNK,"Duplicate chunk advanced twice");
        files.pause(receiver,id,true);
        byte[] second = files.readChunk(sender,id,AttachmentStore.CHUNK);
        check(files.append(receiver,id,AttachmentStore.CHUNK,second).progress==AttachmentStore.CHUNK,"Paused transfer advanced");
        files.peerPause(sender,id,true);
        refused(() -> files.readChunk(sender,id,AttachmentStore.CHUNK));
        files.pause(receiver,id,false);
        files.peerPause(sender,id,false);
        files.acknowledged(sender,id,AttachmentStore.CHUNK);
        files.append(receiver,id,AttachmentStore.CHUNK,second);
        AttachmentStore.Transfer done = files.append(receiver,id,2L*AttachmentStore.CHUNK,files.readChunk(sender,id,2L*AttachmentStore.CHUNK));
        check(done.status.equals(AttachmentStore.COMPLETE) && done.progress==bytes.length,"Incomplete file received");
        files.finishOutgoing(sender,id);
        // Storage manager must list only finished local copies across contacts.
        java.util.List<AttachmentStore.Completed> complete = files.completed();
        check(complete.size() >= 2, "Completed file index omitted a contact");
        boolean senderFound = false, receiverFound = false;
        for (AttachmentStore.Completed item : complete) {
            if (item.contactId == sender && id.equals(item.file.id)) senderFound = true;
            if (item.contactId == receiver && id.equals(item.file.id)) receiverFound = true;
            check(AttachmentStore.COMPLETE.equals(item.file.status), "Cleanup offered an active transfer");
        }
        check(senderFound && receiverFound, "Cleanup did not include both conversation copies");
        files.exportFile(receiver,id,dest);
        check(Arrays.equals(bytes,dest.toByteArray()),"Export changed the file");
        check(files.list(unrelated).isEmpty(),"Transfer appeared on unrelated contact");

        String bad = UUID.randomUUID().toString();
        files.offer(receiver,bad,"bad.bin",out.mime,bytes.length,out.sha256);
        files.accept(receiver,bad);
        first[0]^=1;
        files.append(receiver,bad,0,first);
        files.append(receiver,bad,AttachmentStore.CHUNK,second);
        AttachmentStore.Transfer damaged = files.append(receiver,bad,2L*AttachmentStore.CHUNK,
                Arrays.copyOfRange(bytes,2*AttachmentStore.CHUNK,bytes.length));
        check(damaged.status.equals(AttachmentStore.CANCELED) && damaged.notifyPeer, "Tampered file marked complete");
        check(count(chats,"SELECT COUNT(*) FROM attachment_chunks WHERE id=?",bad)==0,"Failed integrity check retained partial chunks");
        refused(() -> files.exportFile(receiver,bad,dest));

        String rejectedId = UUID.randomUUID().toString();
        files.offer(receiver, rejectedId, "too-large-for-free-space.bin", "application/octet-stream", 128, expected);
        files.reason(receiver, rejectedId, AttachmentStore.STORAGE_REASON);
        files.terminate(receiver, rejectedId, AttachmentStore.DECLINED, true);
        AttachmentStore.Transfer rejected = files.get(receiver, rejectedId);
        check(rejected.status.equals(AttachmentStore.DECLINED)
                && rejected.notifyPeer && AttachmentStore.STORAGE_REASON.equals(rejected.reason),
                "Not-enough-storage rejection was not persisted for the sender");
        check(count(chats, "SELECT COUNT(*) FROM attachment_chunks WHERE id=?", rejectedId) == 0,
                "Rejected attachment retained chunk payload");

        files.removeCompleted(receiver,id);
        check(files.get(receiver,id).status.equals(AttachmentStore.REMOVED),"Lost replay decision for removed file");
        for (AttachmentStore.Completed item : files.completed())
            check(!(item.contactId == receiver && id.equals(item.file.id)), "Cleanup still lists deleted vault copy");
        check(files.get(sender,id).status.equals(AttachmentStore.COMPLETE),
                "Cross-conversation cleanup affected the sending copy");
        refused(() -> files.exportFile(receiver,id,dest));
        String emptyHash = DirectProtocol.hex(MessageDigest.getInstance("SHA-256").digest(new byte[0]));
        String empty = UUID.randomUUID().toString();
        files.offer(unrelated,empty,"empty","application/octet-stream",0,emptyHash);
        check(files.accept(unrelated,empty).status.equals(AttachmentStore.COMPLETE),"Empty file did not complete on acceptance");
        refused(() -> files.offer(unrelated,UUID.randomUUID().toString(),"large",out.mime,AttachmentStore.MAX_BYTES+1L,emptyHash));
        for (int index=0; index<16; index++)
            files.offer(unrelated,UUID.randomUUID().toString(),"pending",out.mime,100,expected);
        refused(() -> files.offer(unrelated,UUID.randomUUID().toString(),"over limit",out.mime,100,expected));

        chats.select(sender); chats.resetPair();
        check(count(chats,"SELECT COUNT(*) FROM attachment_chunks WHERE contact=?",Long.toString(sender))==0,"Forgotten contact left encrypted payloads");
        check(files.list(sender).isEmpty() && !files.list(unrelated).isEmpty(),"Forgetting one contact removed another contact's files");
    }
}
