package org.beckenburg;

import java.net.*;

public final class LanNetworkDiagnosticsTest {
    private static void ok(boolean pass,String why){if(!pass)throw new AssertionError(why);}
    public static void main(String[] args)throws Exception{
        ok(LanNetworkDiagnostics.explain(new BindException("Address already in use")).contains("Port already in use"),
            "port bind failure classified");
        ok(LanNetworkDiagnostics.explain(new ConnectException("Connection refused")).contains("firewall")
            ||LanNetworkDiagnostics.explain(new ConnectException("Connection refused")).contains("Firewall"),
            "refused connection guidance");
        ok(LanNetworkDiagnostics.explain(new UnknownHostException()).contains("Host name"),"DNS distinction");
        ok(LanNetworkDiagnostics.explain(new SocketTimeoutException()).contains("timed out"),"timeout distinction");
        ok(LanNetworkDiagnostics.explain(new java.io.IOException("join failed: REJECT|incorrect room password"))
            .contains("password"),"join rejection classified");
        ok(LanNetworkDiagnostics.explain(new java.io.IOException("join failed: REJECT|lobby locked"))
            .contains("locked"),"lock rejection classified");
        try(LanHost host=new LanHost("127.0.0.1",0)){
            String info=LanNetworkDiagnostics.hostInfo(host);
            ok(info.contains("Gameplay TCP:")&&info.contains("Voice UDP: "+host.voicePort()),"actual TCP listener and UDP allocation reported");
            ok(info.contains(":"+host.port()),"real bound port in support view");
            ok(info.contains("NOT encrypted"),"no false public WAN security claims");
            ok(!info.contains("hardware.profile"),"no device ID leakage");
        }
        ok(LanNetworkDiagnostics.localAddresses()!=null,"local-only interface probe never returns null");
        System.out.println("PASS: LAN address reporting, error explanations, secure-boundary disclosure");
    }
}
