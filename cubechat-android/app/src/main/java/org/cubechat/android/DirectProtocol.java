package org.cubechat.android;

import java.io.Closeable;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Duplex LAN session. A trusted invite pins the host, and the host pins the first accepted guest. */
final class DirectProtocol implements Closeable {
    static final int PORT = 47743;
    static final int MAX_BODY = 2 * 1024 * 1024;
    static final int MESSAGE = 1, RECEIPT = 2, HEARTBEAT = 3, FILE = 4;
    static final int MAX_FILE_FRAME = 72 * 1024;
    // Reserved odd heartbeat understood only by attachment-capable endpoints. A legacy ping never solicits it.
    static final long FILE_HELLO = 0x434346494c453031L;
    // Odd controls are ignored by older clients. Each is authenticated by the live record layer.
    static final long PURGE_HELLO = 0x4343505247000001L;
    static final long PURGE_NOTICE = 0x4343505247000003L;
    static final int MAGIC = 0x43554232; // CUB2
    private static final SecureRandom RANDOM = new SecureRandom();
    // SO_TIMEOUT covers only reads. A stalled socket write must also release the mailbox worker.
    private static final ScheduledThreadPoolExecutor WRITE_TIMEOUT = new ScheduledThreadPoolExecutor(1, task -> {
        Thread thread = new Thread(task, "CubeChat socket write timeout");
        thread.setDaemon(true);
        return thread;
    });
    static { WRITE_TIMEOUT.setRemoveOnCancelPolicy(true); }

    interface AcceptPeer { void accept(byte[] guest) throws Exception; }

    static KeyPair newIdentity() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"), RANDOM);
        return generator.generateKeyPair();
    }

    static byte[] random(int size) {
        byte[] value = new byte[size];
        RANDOM.nextBytes(value);
        return value;
    }

    // Legacy clients accept all nonnegative heartbeat sequences and silently ignore them.
    // Zero stays the keepalive. An even nonzero challenge requests its adjacent odd response.
    static long pingChallenge() {
        long value;
        do { value = RANDOM.nextLong() & 0x7ffffffffffffffeL; } while (value == 0 || value == FILE_HELLO - 1 || value == PURGE_HELLO - 1
                || value == PURGE_NOTICE - 1);
        return value;
    }

    static boolean pingRequest(long sequence) { return sequence > 0 && (sequence & 1) == 0; }

    static String hex(byte[] input) {
        char[] alphabet = "0123456789abcdef".toCharArray(), out = new char[input.length * 2];
        for (int i = 0; i < input.length; i++) {
            out[i * 2] = alphabet[(input[i] & 255) >>> 4];
            out[i * 2 + 1] = alphabet[input[i] & 15];
        }
        return new String(out);
    }

    static String fingerprint(byte[] key) throws Exception {
        return hex(Arrays.copyOf(MessageDigest.getInstance("SHA-256").digest(key), 8));
    }

    private static byte[] mac(byte[] key, byte[]... fields) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        for (byte[] field : fields) mac.update(field);
        return mac.doFinal();
    }

    private static byte[] label(String value) { return value.getBytes(StandardCharsets.US_ASCII); }

    private static byte[] read(DataInputStream stream, int bytes) throws IOException {
        byte[] result = new byte[bytes];
        stream.readFully(result);
        return result;
    }

    static PublicKey publicKey(byte[] value) throws Exception {
        PublicKey key = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(value));
        if (!(key instanceof ECPublicKey) || ((ECPublicKey) key).getParams().getCurve().getField().getFieldSize() != 256)
            throw new IOException("Unsupported pairing key");
        return key;
    }

    private static byte[] sessionSeed(PrivateKey privateKey, byte[] remote, byte[] token,
                                      byte[] client, byte[] host, byte[] cnonce, byte[] snonce) throws Exception {
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(privateKey);
        agreement.doPhase(publicKey(remote), true);
        // The QR secret is the HMAC extract salt; both public identities and challenges bind this connection.
        return mac(mac(token, agreement.generateSecret()), label("CubeChat direct session v2"), client, host, cnonce, snonce);
    }

    private final Closeable transport;
    private final DataInputStream in;
    private final DataOutputStream out;
    private final byte[] inboundKey, outboundKey;
    private long sent, received;

    private DirectProtocol(Closeable transport, DataInputStream in, DataOutputStream out,
                           byte[] seed, boolean host) throws Exception {
        this.transport = transport;
        this.in = in;
        this.out = out;
        byte[] ab = mac(seed, label("records AB")), ba = mac(seed, label("records BA"));
        this.inboundKey = host ? ba : ab;
        this.outboundKey = host ? ab : ba;
    }

    static DirectProtocol handshake(Socket socket, boolean host, KeyPair identity, byte[] expectedPeer,
                                    byte[] token, AcceptPeer acceptPeer) throws Exception {
        socket.setSoTimeout(7000);
        socket.setTcpNoDelay(true);
        DirectProtocol result = handshake(socket.getInputStream(), socket.getOutputStream(), socket, host, identity, expectedPeer, token, acceptPeer);
        socket.setSoTimeout(35000);
        return result;
    }

    static DirectProtocol handshake(InputStream source, OutputStream sink, Closeable transport, boolean host, KeyPair identity,
                                    byte[] expectedPeer, byte[] token, AcceptPeer acceptPeer) throws Exception {
        ScheduledFuture<?> deadline = closeAfter(transport, 12);
        try {
            return exchange(new DataInputStream(source), new DataOutputStream(sink), transport, host, identity, expectedPeer, token, acceptPeer);
        } finally { deadline.cancel(false); }
    }

    private static ScheduledFuture<?> closeAfter(Closeable transport, int seconds) {
        return WRITE_TIMEOUT.schedule(() -> {
            try { transport.close(); } catch (IOException ignored) {}
        }, seconds, TimeUnit.SECONDS);
    }

    private static DirectProtocol exchange(DataInputStream in, DataOutputStream out, Closeable transport, boolean host,
                                     KeyPair identity, byte[] expectedPeer, byte[] token, AcceptPeer acceptPeer) throws Exception {
        byte[] local = identity.getPublic().getEncoded(), remote;
        byte[] cnonce, snonce, seed;
        if (host) {
            if (in.readInt() != MAGIC) throw new IOException("Unknown handshake");
            int keyLength = in.readUnsignedByte();
            if (keyLength < 64 || keyLength > 128) throw new IOException("Invalid pairing key size");
            remote = read(in, keyLength);
            if (expectedPeer != null && !MessageDigest.isEqual(expectedPeer, remote)) throw new IOException("Unknown peer");
            cnonce = read(in, 32);
            snonce = random(32);
            seed = sessionSeed(identity.getPrivate(), remote, token, remote, local, cnonce, snonce);
            out.write(snonce);
            out.write(mac(seed, label("host challenge")));
            out.flush();
            verify(in, mac(seed, label("guest response")));
            acceptPeer.accept(remote);
            out.write(mac(seed, label("accepted")));
            out.flush();
        } else {
            remote = expectedPeer;
            cnonce = random(32);
            out.writeInt(MAGIC);
            out.writeByte(local.length);
            out.write(local);
            out.write(cnonce);
            out.flush();
            snonce = read(in, 32);
            seed = sessionSeed(identity.getPrivate(), remote, token, local, remote, cnonce, snonce);
            verify(in, mac(seed, label("host challenge")));
            out.write(mac(seed, label("guest response")));
            out.flush();
            verify(in, mac(seed, label("accepted")));
        }
        return new DirectProtocol(transport, in, out, seed, host);
    }

    static byte[] unhex(String hex) throws IOException {
        if (!hex.matches("[0-9a-f]{64}")) throw new IOException("Invalid key length");
        byte[] bytes = new byte[32];
        for (int i=0;i<bytes.length;i++) bytes[i]=(byte)Integer.parseInt(hex.substring(2*i,2*i+2),16);
        return bytes;
    }

    private static void verify(DataInputStream in, byte[] expected) throws IOException {
        if (!MessageDigest.isEqual(expected, read(in, expected.length))) throw new IOException("Pairing authentication failed");
    }

    static final class Record {
        final int type;
        final long sequence;
        final String body;
        Record(int type, long sequence, String body) { this.type = type; this.sequence = sequence; this.body = body; }
    }

    private byte[] crypt(int mode, byte[] key, long counter, byte[] value) throws Exception {
        if (counter < 0) throw new IOException("Session exhausted");
        byte[] iv = ByteBuffer.allocate(12).putInt(MAGIC).putLong(counter).array();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        return cipher.doFinal(value);
    }

    synchronized void write(int type, long sequence, String body) throws Exception {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BODY || (type == FILE && (sequence != 0 || bytes.length > MAX_FILE_FRAME))) throw new IOException("Message envelope is too large");
        byte[] record = ByteBuffer.allocate(bytes.length + 9).put((byte)type).putLong(sequence).put(bytes).array();
        byte[] ciphertext = crypt(Cipher.ENCRYPT_MODE, outboundKey, sent++, record);
        ScheduledFuture<?> deadline = closeAfter(transport, 15);
        try {
            out.writeInt(ciphertext.length);
            out.write(ciphertext);
            out.flush();
        } finally {
            deadline.cancel(false);
        }
    }

    Record readRecord() throws Exception {
        int size = in.readInt();
        if (size < 25 || size > MAX_BODY + 25) throw new IOException("Invalid record size");
        ByteBuffer plain = ByteBuffer.wrap(crypt(Cipher.DECRYPT_MODE, inboundKey, received++, read(in, size)));
        int type = plain.get() & 255;
        long seq = plain.getLong();
        if (seq < 0 || type < MESSAGE || type > FILE || (type == FILE && (seq != 0 || plain.remaining() > MAX_FILE_FRAME))
                || ((type == HEARTBEAT || type == RECEIPT) && plain.remaining() != 0)) throw new IOException("Invalid record");
        return new Record(type, seq, new String(plain.array(), plain.position(), plain.remaining(), StandardCharsets.UTF_8));
    }

    @Override public void close() throws IOException { transport.close(); }
}
