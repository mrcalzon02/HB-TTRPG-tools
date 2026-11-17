package org.cubechat.android;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.UUID;

/** Disposable mailbox and dedicated Android Keystore aliases. Never clears the application under test. */
final class VaultStorageChecks {
    private interface Checked { void run() throws Exception; }

    private static void check(boolean ok, String why) { if (!ok) throw new AssertionError(why); }
    private static void rejects(Checked operation) throws Exception {
        try { operation.run(); } catch (Exception expected) { return; }
        throw new AssertionError("Protected operation unexpectedly succeeded");
    }
    private static byte[] firstBlob(SQLiteDatabase db,String query) {
        try (Cursor c = db.rawQuery(query,null)) {
            if (!c.moveToFirst()) throw new AssertionError("Missing test row");
            return c.getBlob(0);
        }
    }

    static void run(Context context) throws Exception {
        String name = "cubechat-vault-" + UUID.randomUUID() + ".db";
        File marker = new File(context.getNoBackupFilesDir(), name + ".purge-pending");
        LocalVault vault = new LocalVault(context,name);
        char[] normal = "scope normal 1234".toCharArray(), duress = "scope emergency 567".toCharArray();
        char[] changed = "different pass 891".toCharArray(), wrong = "incorrect pass".toCharArray();
        try (ChatStore chat = new ChatStore(context,name)) {
            check(!vault.configured() && !vault.locked() && !vault.purgePending(), "Unexpected first-launch state");
            rejects(vault::requestClear);
            long id = chat.createPair(Pairing.host(null).json());
            chat.rename(id,"existing user"); chat.save(true,0,"before migration","old envelope");
            chat.saveDraft(id,"keep draft"); chat.saveRoute("BLUETOOTH","");
            chat.preparePeerPurgeNotice(id); chat.recordPeerPurgeNotice(id);
            AttachmentStore files = new AttachmentStore(context,chat);
            byte[] data = new byte[AttachmentStore.CHUNK + 17];
            new java.util.Random(2).nextBytes(data);
            AttachmentStore.Transfer transfer = files.importFile(id,"existing.bin","application/octet-stream",new ByteArrayInputStream(data));
            SQLiteDatabase db = chat.vaultDatabase();
            byte[] before = firstBlob(db,"SELECT body FROM contacts");
            db.execSQL("CREATE TRIGGER break_enroll BEFORE INSERT ON vault_profile BEGIN SELECT RAISE(ABORT,'forced rollback'); END");
            rejects(() -> vault.enroll("Scope",normal));
            check(!vault.configured() && Arrays.equals(before,firstBlob(db,"SELECT body FROM contacts"))
                    && "before migration".equals(chat.history().get(0).text), "Incomplete enrollment altered the old vault");
            db.execSQL("DROP TRIGGER break_enroll");

            vault.enroll("Scope",normal);
            check(vault.configured() && !vault.locked() && vault.username().equals("Scope")
                    && !vault.hasDuress(), "Enrollment state mismatch");
            KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null);
            check(!keys.containsAlias(LocalVault.legacyAlias(name)) && keys.containsAlias(LocalVault.wrappingAlias(name)),
                    "Enrollment did not retire the old non-password key");
            byte[] after = firstBlob(db,"SELECT body FROM contacts");
            check(!Arrays.equals(before,after), "Pairing was not rekeyed");
            rejects(() -> ChatStore.decrypt(LocalVault.deviceKey(LocalVault.wrappingAlias(name),false),after,"pair"));
            check(chat.pairing()!=null && chat.contacts().get(0).name.equals("existing user")
                    && chat.route(id)[0].equals("BLUETOOTH") && chat.draft(id).equals("keep draft")
                    && chat.packet(0).equals("old envelope"), "Enrollment lost mailbox contents");
            files.acknowledged(id,transfer.id,0);
            check(files.get(id,transfer.id).name.equals("existing.bin")
                    && Arrays.equals(Arrays.copyOf(data,AttachmentStore.CHUNK),files.readChunk(id,transfer.id,0)), "File migration failed");
            rejects(() -> vault.setDuress(normal,normal));
            vault.setDuress(normal,duress);
            rejects(() -> vault.setDuress(duress,new char[0]));
            rejects(() -> vault.changePassword(duress,changed));
            rejects(() -> vault.changePassword(normal,duress));
            check(vault.hasDuress() && !vault.purgePending(), "Settings verification activated PURGE");
            vault.setDuress(normal,new char[0]);
            vault.lock();
            check(vault.unlock("Scope",duress)==LocalVault.Result.INVALID && !vault.purgePending(),"Disabled credential still armed");
            check(vault.unlock("other",normal)==LocalVault.Result.INVALID && vault.unlock("Scope",wrong)==LocalVault.Result.INVALID
                    && vault.locked(), "Incorrect credentials unlocked a vault");
            rejects(chat::contacts); rejects(chat::history); rejects(() -> files.get(id,transfer.id));
            try (ChatStore second = new ChatStore(context,name)) { rejects(second::pairing); }
            chat.recordPeerPurgeNotice(id);
            check(vault.unlock("Scope",normal)==LocalVault.Result.NORMAL, "Normal unlock failed");
            check(chat.next(false)==0 && chat.next(true)==1 && chat.history().size()==3
                    && chat.history().get(1).text.equals(PeerLink.PURGE_NOTICE)
                    && chat.history().get(2).text.equals(PeerLink.PURGE_NOTICE), "Locked notices damaged ordinary sequence or history");
            vault.setDuress(normal,duress); vault.changePassword(normal,changed); vault.lock();
            LocalVault reopened = new LocalVault(context,name);
            check(reopened.unlock("Scope",normal)==LocalVault.Result.INVALID
                    && reopened.unlock("Scope",changed)==LocalVault.Result.NORMAL, "Changed password did not take effect");
            check(chat.draft(id).equals("keep draft"),"Password change lost contents");
            reopened.lock();
            check(reopened.unlock("Scope",duress)==LocalVault.Result.DURESS, "Duress credential did not arm local reset");
            LocalVault recovery = new LocalVault(context,name);
            check(marker.isFile() && recovery.purgePending() && recovery.locked()
                    && recovery.unlock("Scope",changed)==LocalVault.Result.DURESS,
                    "Cold-start reset marker could be bypassed");
            rejects(chat::pairing);
        } finally {
            vault.lock();
            if (marker.exists() && !marker.delete()) throw new AssertionError("Could not remove isolated test marker");
            KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null);
            keys.deleteEntry(LocalVault.legacyAlias(name)); keys.deleteEntry(LocalVault.wrappingAlias(name));
            context.deleteDatabase(name);
        }
        checkUnavailableMarker(context);
    }

    private static void checkUnavailableMarker(Context context) throws Exception {
        String name = "cubechat-marker-failure-" + UUID.randomUUID() + ".db";
        File directory = context.getNoBackupFilesDir();
        File marker = new File(directory, name + ".purge-pending");
        File reservation = new File(directory, name + ".purge-ready");
        LocalVault vault = new LocalVault(context, name);
        char[] normal = "local password".toCharArray(), duress = "emergency password".toCharArray();
        try {
            vault.enroll("Scope", normal);
            vault.setDuress(normal, duress);
            check(reservation.isFile(), "Duress setup did not reserve the reset marker");
            // A directory at the target causes both rename and FileOutputStream.open to fail.
            // It is confined to this disposable profile and must never count as a pending reset.
            check(marker.mkdir(), "Could not obstruct the test marker");
            vault.lock();
            check(vault.unlock("Scope", "incorrect pass".toCharArray()) == LocalVault.Result.INVALID
                    && !vault.purgePending(), "A storage error armed reset with a wrong credential");
            check(vault.unlock("Scope", duress) == LocalVault.Result.DURESS && !marker.isFile(),
                    "A verified credential was lost when marker creation failed");
            LocalVault recreated = new LocalVault(context, name);
            check(recreated.purgePending() && recreated.locked()
                    && recreated.unlock("Scope", normal) == LocalVault.Result.DURESS,
                    "A replacement activity ignored the locally verified reset");
            // A disposable namespace can never clear the installed app, even when armed.
            rejects(recreated::requestClear);
        } finally {
            vault.lock();
            if (marker.exists() && !marker.delete()) throw new AssertionError("Could not remove test obstruction");
            if (reservation.exists() && !reservation.delete()) throw new AssertionError("Could not remove test reservation");
            KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null);
            keys.deleteEntry(LocalVault.legacyAlias(name)); keys.deleteEntry(LocalVault.wrappingAlias(name));
            context.deleteDatabase(name);
        }
    }
}
