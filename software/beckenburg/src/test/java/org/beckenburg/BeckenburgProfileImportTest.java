package org.beckenburg;

import java.nio.file.Files;
import java.nio.file.Path;
import java.io.IOException;

/** Local progression is importable and never replaces the private installation ID. */
public final class BeckenburgProfileImportTest {
    private static void check(boolean actual, String message) { if (!actual) throw new AssertionError(message); }
    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("beckenburg-import-test-");
        try {
            var id = BeckenburgInstallIdentity.loadOrCreate(root);
            Path activePath = root.resolve("profile.properties");
            Files.writeString(activePath, "schema=1\ncurrency=10\nexperience=4\n");
            ProfileStore active = new ProfileStore(activePath);
            active.load();
            Path imported = root.resolve("saved-game.properties");
            Files.writeString(imported, "schema=1\ncurrency=12500\nexperience=83\nequipment.UV_LAMP=true\n");
            active.importFrom(imported);
            check(active.currency() == 12500 && active.experience() == 83, "import immediately affects active progression");
            check(active.ownsEquipment(EquipmentLoadout.Item.UV_LAMP), "imported owned equipment applied");
            ProfileStore fresh = new ProfileStore(activePath);
            fresh.load();
            check(fresh.currency() == 12500 && fresh.ownsEquipment(EquipmentLoadout.Item.UV_LAMP), "imported save survives reloading");
            check(id.equals(BeckenburgInstallIdentity.loadOrCreate(root)), "install and player IDs unchanged by import");
            try(var files=Files.list(root)) {
                check(files.anyMatch(p->p.getFileName().toString().startsWith("profile-before-import-")),
                    "previous progress backed up");
            }
            Path bad = root.resolve("corrupt.properties");
            Files.writeString(bad, "schema=1\ncurrency=-7\nexperience=1\n");
            String before = Files.readString(activePath);
            try { active.importFrom(bad); throw new AssertionError("malformed save accepted"); }
            catch(IOException expected) {}
            check(Files.readString(activePath).equals(before), "bad import does not overwrite active progress");
            Files.writeString(activePath, "schema=1\ncurrency=-70\nexperience=10\n");
            try { active.load(); throw new AssertionError("corrupt active file accepted"); }
            catch(IOException expected) {}
            active.importFrom(imported);
            check(active.currency()==12500, "valid import recovers blocked save");
            active.save();
            System.out.println("PASS: import valid progression, replace atomically, preserve backup and install ID, reject bad imports, recover corrupted profile");
        } finally {
            try(var paths=Files.walk(root)) {
                paths.sorted(java.util.Comparator.reverseOrder()).forEach(p-> {
                    try { Files.delete(p); } catch(IOException e) { throw new RuntimeException(e); }
                });
            }
        }
    }
}
