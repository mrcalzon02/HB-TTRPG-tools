package org.cubechat.android;

import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** The deterministic latin-cube-64 wire profile in cubechat-network.html. */
final class CubeEnvelope {
    interface Transform {
        String run(String operation, String seed, String data) throws Exception;
    }

    private static final String FORMAT = "cubechat-local-v1";
    private static final String PROFILE = "latin-cube-64";
    private static final long MAX_SEQUENCE = 9007199254740991L; // JS safe integer
    private final SecureRandom random = new SecureRandom();
    private final Transform transform;

    CubeEnvelope(Transform transform) { this.transform = transform; }

    JSONObject seal(String keyHex, String channel, long sequence, String text) throws Exception {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0 || bytes.length > 4096) {
            throw new IllegalArgumentException("Use 1–4096 UTF-8 bytes per message");
        }
        JSONObject header = header(channel, sequence);
        byte[] iv = new byte[12];
        random.nextBytes(iv);
        Cipher cipher = cipher(Cipher.ENCRYPT_MODE, keyHex, iv, header);
        String cube = transform.run("encode", keyHex, Base64.getEncoder().encodeToString(bytes));
        byte[] encrypted = cipher.doFinal(cube.getBytes(StandardCharsets.UTF_8));
        header.put("iv", Base64.getEncoder().encodeToString(iv));
        header.put("ciphertext", Base64.getEncoder().encodeToString(encrypted));
        return header;
    }

    String open(String keyHex, String expected, JSONObject packet) throws Exception {
        if (!FORMAT.equals(packet.opt("format")) || !PROFILE.equals(packet.opt("profile")) ||
                !expected.equals(packet.opt("channel")) ||
                !"deterministic".equals(packet.optString("mode", "deterministic")) ||
                !packet.isNull("padStart") || !packet.isNull("padLength")) {
            throw new GeneralSecurityException("Incompatible CubeChat envelope or key mode");
        }
        Object value = packet.get("sequence");
        if (!(value instanceof Number) || ((Number) value).doubleValue() != ((Number) value).longValue()) {
            throw new GeneralSecurityException("Invalid envelope sequence");
        }
        JSONObject header = header(expected, ((Number) value).longValue());
        String encoded = packet.getString("ciphertext");
        String ivText = packet.getString("iv");
        if (ivText.length() != 16 || encoded.length() > 65536) throw new GeneralSecurityException("Invalid envelope size");
        byte[] iv = Base64.getDecoder().decode(ivText);
        if (iv.length != 12) throw new GeneralSecurityException("Invalid envelope IV");
        Cipher cipher = cipher(Cipher.DECRYPT_MODE, keyHex, iv, header);
        byte[] cube = cipher.doFinal(Base64.getDecoder().decode(encoded));
        String result = transform.run("decode", keyHex, new String(cube, StandardCharsets.UTF_8));
        byte[] plain = Base64.getDecoder().decode(result);
        return StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(plain)).toString();
    }

    private static JSONObject header(String channel, long sequence) throws Exception {
        if (!("AB".equals(channel) || "BA".equals(channel)) || sequence < 0 || sequence > MAX_SEQUENCE) {
            throw new IllegalArgumentException("Invalid direction or sequence");
        }
        return new JSONObject().put("format", FORMAT).put("channel", channel).put("sequence", sequence)
                .put("profile", PROFILE).put("mode", "deterministic")
                .put("padStart", JSONObject.NULL).put("padLength", JSONObject.NULL);
    }

    private static Cipher cipher(int mode, String keyHex, byte[] iv, JSONObject header) throws Exception {
        if (keyHex == null || !keyHex.matches("[0-9a-f]{64}")) throw new GeneralSecurityException("Invalid directional key");
        byte[] key = new byte[32];
        for (int i = 0; i < key.length; i++) key[i] = (byte) Integer.parseInt(keyHex.substring(i * 2, i * 2 + 2), 16);
        // JSON property order is significant to the browser client's authenticated data.
        String aad = "{\"format\":\"" + FORMAT + "\",\"channel\":\"" + header.getString("channel")
                + "\",\"sequence\":" + header.getLong("sequence") + ",\"profile\":\"" + PROFILE
                + "\",\"mode\":\"deterministic\",\"padStart\":null,\"padLength\":null}";
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        return cipher;
    }
}
