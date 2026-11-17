package org.cubechat.android;

import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Arrays;
import java.util.Base64;
import java.util.Enumeration;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.zip.CRC32;

/** Private invite material is transferred out-of-band, e.g. by scanning the hosting phone. */
final class Pairing {
    static final String PREFIX = "CUBECHAT2.";
    static final String HTTPS_PREFIX = "https://cubechat-android.lankytangerine2.chatgpt.site/#";
    static final String APP_PREFIX = "cubechat://pair/";
    final boolean host;
    final KeyPair identity;
    final byte[] token;
    final String ab, ba;
    byte[] remote;
    String address;
    int port;
    boolean confirmed;

    private Pairing(boolean host, KeyPair identity, byte[] token, String ab, String ba) {
        this.host = host; this.identity = identity; this.token = token; this.ab = ab; this.ba = ba;
        port = DirectProtocol.PORT;
    }
    static Pairing host(String json) throws Exception {
        String ab, ba;
        if (json == null || json.isEmpty()) {
            ab = DirectProtocol.hex(DirectProtocol.random(32)); ba = DirectProtocol.hex(DirectProtocol.random(32));
        } else {
            if (json.trim().startsWith("CCLK2")) throw new IOException("CCLK2 consumable key files are unsupported on Android");
            JSONObject bundle = new JSONObject(json);
            requireSupportedMode(bundle);
            if ("cubechat-provision-v1".equals(bundle.optString("format"))) {
                if (!"A".equals(bundle.optString("role")))
                    throw new IOException("This is a guest export. Import the host export on the hosting phone, then scan its invitation here.");
                if (!bundle.optString("profileId").matches("[0-9a-f]{24}")) throw new IOException("Invalid host provisioning ID");
                // The original relay endpoint is irrelevant to a locally paired conversation.
                bundle = bundle.getJSONObject("bundle");
                requireSupportedMode(bundle);
            }
            if (!"cubechat-secret-bundle-v1".equals(bundle.optString("format")))
                throw new IOException("Select a CubeChat host provisioning package or directional secret bundle");
            ab = bundle.getString("AB"); ba = bundle.getString("BA");
            if (!ab.matches("[0-9a-f]{64}") || !ba.matches("[0-9a-f]{64}") || ab.equals(ba))
                throw new IOException("Invalid directional keys");
        }
        return new Pairing(true, DirectProtocol.newIdentity(), DirectProtocol.random(32), ab, ba);
    }

    private static void requireSupportedMode(JSONObject profile) throws IOException {
        if (!"deterministic".equals(profile.optString("mode", "deterministic"))
                || !"latin-cube-64".equals(profile.optString("profile", "latin-cube-64")))
            throw new IOException("This Android client supports the deterministic latin-cube-64 profile. CCLK2 consumable keys are unsupported.");
    }

    static String encode(byte[] value) { return Base64.getUrlEncoder().withoutPadding().encodeToString(value); }
    static byte[] decode(String text) { return Base64.getUrlDecoder().decode(text); }
    // This card IS the key. The recipient can install both directions without contacting the host.
    // The checksum catches copying errors; the user's out-of-band handoff establishes trust.
    String invite(String ip) throws Exception {
        ByteArrayOutputStream payload = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(payload);
        out.writeByte(2); out.write(InetAddress.getByName(ip).getAddress()); out.writeShort(port);
        byte[] pub = identity.getPublic().getEncoded();
        out.writeByte(pub.length); out.write(pub);
        out.write(token); out.write(DirectProtocol.unhex(ab)); out.write(DirectProtocol.unhex(ba));
        byte[] body = payload.toByteArray();
        CRC32 crc = new CRC32(); crc.update(body);
        out.writeInt((int)crc.getValue()); out.close();
        return PREFIX + encode(payload.toByteArray());
    }

    static String normalize(String raw) throws IOException {
        String value = raw.trim();
        if (value.startsWith(HTTPS_PREFIX)) value = value.substring(HTTPS_PREFIX.length());
        else if (value.startsWith(APP_PREFIX)) value = value.substring(APP_PREFIX.length());
        if (value.length() > 600 || !value.startsWith(PREFIX) || !value.substring(PREFIX.length()).matches("[a-zA-Z0-9_-]+"))
            throw new IOException("Invalid CubeChat v2 invitation");
        return value;
    }

    static Pairing join(String raw) throws Exception {
        byte[] data = decode(normalize(raw).substring(PREFIX.length()));
        if (data.length < 140) throw new IOException("Truncated CubeChat key card");
        CRC32 crc = new CRC32(); crc.update(data,0,data.length-4);
        if ((int)crc.getValue() != ByteBuffer.wrap(data, data.length-4, 4).getInt())
            throw new IOException("Damaged CubeChat key card");
        try (DataInputStream in = new DataInputStream(new ByteArrayInputStream(data,0,data.length-4))) {
            if (in.readUnsignedByte() != 2) throw new IOException("Unknown key card version");
            byte[] ip = new byte[4]; in.readFully(ip);
            InetAddress address = InetAddress.getByAddress(ip);
            if (address.isMulticastAddress() || (ip[0] & 255) >= 224) throw new IOException("Invalid host address");
            int port = in.readUnsignedShort();
            if (port == 0) throw new IOException("Invalid host port");
            byte[] pub = new byte[in.readUnsignedByte()]; in.readFully(pub); DirectProtocol.publicKey(pub);
            byte[] token = new byte[32], ab = new byte[32], ba = new byte[32];
            in.readFully(token); in.readFully(ab); in.readFully(ba);
            if (in.read() != -1 || MessageDigest.isEqual(ab,ba)) throw new IOException("Invalid directional keys");
            Pairing result = new Pairing(false, DirectProtocol.newIdentity(), token, DirectProtocol.hex(ab), DirectProtocol.hex(ba));
            result.address = address.getHostAddress(); result.port = port; result.remote = pub;
            return result;
        }
    }

    boolean matchesCard(Pairing card) {
        return Arrays.equals(host ? identity.getPublic().getEncoded() : remote, card.remote)
                && Arrays.equals(token, card.token) && ab.equals(card.ab) && ba.equals(card.ba);
    }
    JSONObject json() throws Exception {
        return new JSONObject().put("host", host).put("public", encode(identity.getPublic().getEncoded()))
                .put("private", encode(identity.getPrivate().getEncoded())).put("token", encode(token))
                .put("ab", ab).put("ba", ba).put("address", address).put("port", port)
                .put("peer", remote == null ? "" : encode(remote)).put("confirmed", confirmed);
    }
    static Pairing restore(JSONObject v) throws Exception {
        KeyPair identity = new KeyPair(DirectProtocol.publicKey(decode(v.getString("public"))),
                KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(decode(v.getString("private")))));
        Pairing p = new Pairing(v.getBoolean("host"), identity, decode(v.getString("token")), v.getString("ab"), v.getString("ba"));
        p.address = v.optString("address"); p.port = v.getInt("port");
        p.remote = v.getString("peer").isEmpty() ? null : decode(v.getString("peer"));
        p.confirmed = v.getBoolean("confirmed");
        return p;
    }

    static String lanAddress() throws Exception {
        String choice = null;
        int priority = -1;
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        while (interfaces != null && interfaces.hasMoreElements()) {
            NetworkInterface net = interfaces.nextElement();
            if (!net.isUp() || net.isLoopback()) continue;
            int score = LanDiscovery.lanInterfacePriority(net.getName());
            if (score <= priority) continue;
            Enumeration<InetAddress> addresses = net.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress ip = addresses.nextElement();
                if (ip instanceof Inet4Address && !ip.isLoopbackAddress() && !ip.isLinkLocalAddress()) {
                    choice = ip.getHostAddress(); priority = score; break;
                }
            }
        }
        return choice == null ? "0.0.0.0" : choice;
    }
}
