package org.cubechat.android;

import org.json.JSONObject;
import java.io.IOException;
import java.util.Arrays;

/** Key installation must work with every network interface disconnected. No socket is opened here. */
public final class OfflineKeyCardTest {
    private static void require(boolean ok) { if (!ok) throw new AssertionError(); }
    public static void main(String[] args) throws Exception {
        String ab = DirectProtocol.hex(DirectProtocol.random(32)), ba = DirectProtocol.hex(DirectProtocol.random(32));
        JSONObject bundle = new JSONObject().put("format", "cubechat-secret-bundle-v1").put("AB", ab).put("BA", ba);
        JSONObject hostProfile = new JSONObject().put("format", "cubechat-provision-v1").put("role", "A")
                .put("profileId", "000000000000000000000001").put("bundle", bundle);
        for (String profile : new String[]{null, bundle.toString(), hostProfile.toString()}) {
            Pairing host = Pairing.host(profile);
            if (profile != null) require(host.ab.equals(ab) && host.ba.equals(ba));
            String card = host.invite("0.0.0.0");
            for (String prefix : new String[]{"", Pairing.APP_PREFIX, Pairing.HTTPS_PREFIX}) {
                Pairing guest = Pairing.join(prefix + card);
                require(guest.ab.equals(host.ab) && guest.ba.equals(host.ba));
                require(guest.address.equals("0.0.0.0") && guest.matchesCard(Pairing.join(card)));
                Pairing saved = Pairing.restore(new JSONObject(guest.json().toString()));
                require(saved.matchesCard(guest) && Arrays.equals(saved.identity.getPrivate().getEncoded(), guest.identity.getPrivate().getEncoded()));
                Pairing withAddress = Pairing.join(host.invite("192.168.8.5"));
                require(saved.matchesCard(withAddress) && withAddress.address.equals("192.168.8.5"));
            }
            byte[] broken = Pairing.decode(card.substring(Pairing.PREFIX.length()));
            broken[20] ^= 1;
            try { Pairing.join(Pairing.PREFIX + Pairing.encode(broken)); throw new AssertionError("Damaged card accepted"); }
            catch (IOException expected) { /* Existing local keys remain untouched. */ }
        }
        try { Pairing.host(hostProfile.put("role", "B").toString()); throw new AssertionError("Guest provisioning accepted as host"); }
        catch (IOException expected) { /* Guest loads the host's visual card. */ }
        System.out.println("PASS network-free full AB/BA import, stable card identity, persisted state, LAN address refresh, URLs, damaged and wrong-role rejection");
    }
}
