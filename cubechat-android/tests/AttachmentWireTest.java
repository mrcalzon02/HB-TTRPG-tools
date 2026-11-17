package org.cubechat.android;

import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

/** Run alongside the production Android classes with JDK 17. */
public final class AttachmentWireTest {
    private interface Check { void run() throws Exception; }

    private static void rejected(Check operation) throws Exception {
        try { operation.run(); }
        catch (java.security.GeneralSecurityException | java.io.IOException expected) { return; }
        throw new AssertionError("Unbound or malformed file chunk accepted");
    }

    public static void main(String[] args) throws Exception {
        Pairing host = Pairing.host(null), guest = Pairing.join(host.invite("127.0.0.1"));
        String id = UUID.randomUUID().toString(), other = UUID.randomUUID().toString();
        byte[] key = AttachmentWire.key(host, true, id, "chunks");
        byte[] inbound = AttachmentWire.key(guest, false, id, "chunks");
        byte[] data = DirectProtocol.random(AttachmentStore.CHUNK);
        String hash = DirectProtocol.hex(java.security.MessageDigest.getInstance("SHA-256").digest(data));
        String packet = AttachmentWire.sealChunk(key, id, data.length, 0, hash, data);
        if (!Arrays.equals(data, AttachmentWire.openChunk(inbound, id, data.length, 0, hash, packet)))
            throw new AssertionError("Binary file did not round-trip");
        rejected(() -> AttachmentWire.openChunk(AttachmentWire.key(guest, true, id, "chunks"), id, data.length, 0, hash, packet));
        rejected(() -> AttachmentWire.openChunk(AttachmentWire.key(guest, false, id, "manifest"), id, data.length, 0, hash, packet));
        rejected(() -> AttachmentWire.openChunk(inbound, other, data.length, 0, hash, packet));
        rejected(() -> AttachmentWire.openChunk(inbound, id, data.length, 0, hash + "00", packet));
        rejected(() -> AttachmentWire.openChunk(inbound, id, data.length * 2L, data.length, hash, packet));
        rejected(() -> AttachmentWire.openChunk(inbound, id, data.length, 1, hash, packet));
        byte[] broken = Base64.getDecoder().decode(packet);
        broken[broken.length - 1] ^= 1;
        rejected(() -> AttachmentWire.openChunk(inbound, id, data.length, 0, hash, Base64.getEncoder().encodeToString(broken)));
        System.out.println("PASS binary round-trip; direction, manifest domain, UUID, length, offset, SHA and byte tampering rejected");
    }
}
