package org.cubechat.android;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Per-file subkeys separate Cube manifests and binary chunks from text and from one another. */
final class AttachmentWire {
    private AttachmentWire() { }

    static void requireId(String id) throws IOException {
        try {
            if (id.length() == 36 && UUID.fromString(id).toString().equals(id)) return;
        } catch (IllegalArgumentException ignored) { }
        throw new IOException("Invalid attachment ID");
    }

    static String channel(Pairing pair, boolean outgoing) { return pair.host == outgoing ? "AB" : "BA"; }

    static byte[] key(Pairing pair, boolean outgoing, String id, String purpose) throws Exception {
        requireId(id);
        String direction = channel(pair, outgoing);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(DirectProtocol.unhex("AB".equals(direction) ? pair.ab : pair.ba), "HmacSHA256"));
        mac.update(("CubeChat attachment v1/" + purpose + "/" + direction + "/").getBytes(StandardCharsets.US_ASCII));
        mac.update(pair.token);
        return mac.doFinal(id.getBytes(StandardCharsets.US_ASCII));
    }

    private static Cipher cipher(int mode, byte[] key, byte[] iv, String id, long size, long offset,
                                 String sha256) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        cipher.updateAAD(id.getBytes(StandardCharsets.US_ASCII));
        cipher.updateAAD(ByteBuffer.allocate(16).putLong(size).putLong(offset).array());
        cipher.updateAAD(sha256.getBytes(StandardCharsets.US_ASCII));
        return cipher;
    }

    static String sealChunk(byte[] key, String id, long size, long offset, String sha256, byte[] plaintext) throws Exception {
        byte[] iv = DirectProtocol.random(12);
        byte[] ciphertext = cipher(Cipher.ENCRYPT_MODE, key, iv, id, size, offset, sha256).doFinal(plaintext);
        return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array());
    }

    static byte[] openChunk(byte[] key, String id, long size, long offset, String sha256, String payload) throws Exception {
        if (offset < 0 || offset >= size || offset % AttachmentStore.CHUNK != 0) throw new IOException("Invalid file offset");
        int length = (int)Math.min(AttachmentStore.CHUNK, size - offset) + 28;
        if (payload.length() != ((length + 2) / 3) * 4) throw new IOException("Invalid encrypted chunk size");
        byte[] data = Base64.getDecoder().decode(payload);
        if (data.length != length) throw new IOException("Invalid encrypted chunk length");
        return cipher(Cipher.DECRYPT_MODE, key, Arrays.copyOf(data, 12), id, size, offset, sha256).doFinal(data, 12, data.length - 12);
    }
}
