package org.beckenburg;

import java.net.*;
import java.util.*;

/** Local-only address discovery and honest network failure guidance, no NAT/port promises. */
public final class LanNetworkDiagnostics {
    private LanNetworkDiagnostics() { }

    /** Candidate local addresses, not an indication that remote firewall/NAT accepts connections. */
    public static List<String> localAddresses() {
        TreeSet<String> addresses=new TreeSet<>();
        try {
            Enumeration<NetworkInterface> interfaces=NetworkInterface.getNetworkInterfaces();
            if(interfaces==null)return List.of();
            while(interfaces.hasMoreElements()){
                NetworkInterface nic=interfaces.nextElement();
                if(!nic.isUp()||nic.isLoopback())continue;
                Enumeration<InetAddress> all=nic.getInetAddresses();
                while(all.hasMoreElements()){
                    InetAddress address=all.nextElement();
                    if(address.isLoopbackAddress()||address.isAnyLocalAddress()
                            ||address.isMulticastAddress()||address.isLinkLocalAddress())continue;
                    String shown=address.getHostAddress();
                    // IPv6 zone identifiers are interface-specific, not portable hostnames.
                    if(address instanceof Inet6Address)shown="["+shown+"]";
                    addresses.add(shown+" ("+nic.getDisplayName()+")");
                    if(addresses.size()>32)break;
                }
            }
        } catch(SocketException | SecurityException ignored) {
            // Lack of interface permission is a diagnostic limit, not a reason to crash.
        }
        return List.copyOf(addresses);
    }

    public static String explain(Throwable exception) {
        if(exception instanceof BindException)return "Port already in use or local address cannot be bound. Change the port or close the other host.";
        if(exception instanceof UnknownHostException)return "Host name could not be resolved. Check the IP address or network DNS.";
        if(exception instanceof NoRouteToHostException)return "No route to the server. Check Wi-Fi/LAN/VPN membership and routing.";
        if(exception instanceof ConnectException)return "Connection refused. Confirm the host is running, listening on that port and allowed through Windows Firewall.";
        if(exception instanceof SocketTimeoutException)return "Connection timed out. Check the host address, firewall and LAN reachability.";
        String msg=exception==null?"":String.valueOf(exception.getMessage());
        if(msg.contains("incorrect room password"))return "The host rejected the room password; ask the host for the correct password.";
        if(msg.contains("lobby locked"))return "The host has locked the lobby to new players.";
        if(msg.contains("reconnect seat expired"))return "The previous host seat is no longer reserved. Start or join a new lobby.";
        if(msg.contains("match already running"))return "This match is underway; only a valid reserved seat may reconnect.";
        return "Connection failed. Verify the host's local address/port and that both PCs can reach one another.";
    }

    public static String hostInfo(LanHost host) {
        Objects.requireNonNull(host);
        StringBuilder out=new StringBuilder("Beckenburg LAN host\n");
        out.append("Gameplay TCP: ").append(host.bindAddress()).append(':').append(host.port())
            .append("  Voice UDP: ").append(host.voicePort()).append('\n')
            .append("Guests: ").append(host.connected())
            .append("  Reserved seats: ").append(host.reservedSeats())
            .append("  New joins: ").append(host.lobbyLocked()?"Locked":"Open").append('\n')
            .append("Candidate LAN addresses (not validated public Internet addresses):\n");
        List<String> choices=localAddresses();
        if(choices.isEmpty())out.append("  No non-loopback adapter detected; check network settings.\n");
        else for(String address:choices)out.append("  ").append(address).append(':').append(host.port()).append(" (TCP)").append('\n');
        out.append("Voice requires UDP ").append(host.voicePort()).append("; allow it separately in the Windows Firewall.\n");
        out.append("Share an address only with trusted LAN players. Firewalls can still block inbound connections.\n")
            .append("LAN game/password signaling and voice are NOT encrypted; do not expose this listener to the public Internet.");
        return out.toString();
    }
}
