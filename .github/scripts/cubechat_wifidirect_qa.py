"""Exercise CubeChat's native Wi-Fi Direct flow on two distinct Android 15 AVDs.

ADB only drives the UI and reads diagnostics. The message transport runs between
the two Android virtual Wi-Fi radios. The synthetic QR payload stays in memory.
"""
import ipaddress
import os
import re
import sys
import time
from contextlib import contextmanager

import cubechat_android_qa as qa

HOST = "emulator-5554"
GUEST = "emulator-5556"
WIFI_STATUS = "Connected over Wi-Fi Direct"


@contextmanager
def phone(serial):
    prior = os.environ.get("ANDROID_SERIAL")
    os.environ["ANDROID_SERIAL"] = serial
    try:
        yield
    finally:
        if prior is None:
            os.environ.pop("ANDROID_SERIAL", None)
        else:
            os.environ["ANDROID_SERIAL"] = prior


def txt(node):
    return node.get("text", "").strip()


def nearby_permission(nodes):
    for node in nodes:
        resource = node.get("resource-id", "")
        if "permissioncontroller" in resource and resource.endswith("/permission_allow_button"):
            qa.tap(node)
            return True
    return False


def select_direct():
    qa.tap(qa.named("Pairing"))
    qa.tap(qa.named("Connection…"))
    qa.tap(qa.named("Wi-Fi Direct"))


def host_ready():
    deadline = time.monotonic() + 80
    busy_retries = 2
    while time.monotonic() < deadline:
        nodes = qa.tree()
        if nearby_permission(nodes):
            qa.report("Host granted CubeChat Nearby devices permission through Android’s permission dialog.")
            continue
        for node in nodes:
            match = re.fullmatch(r"Wi-Fi Direct host ready\. Select (.+) on the other phone\.", txt(node))
            if match:
                return match.group(1)
            if txt(node).startswith("Create Wi-Fi Direct group failed: Wi-Fi is busy") and busy_retries > 0:
                busy_retries -= 1
                time.sleep(3)
                select_direct()
                break
            if txt(node).startswith(("Create Wi-Fi Direct group failed", "This device does not offer Wi-Fi Direct")):
                raise qa.CheckFailed("Android failed to create the host’s Wi-Fi Direct group")
    raise qa.CheckFailed("CubeChat did not report a Wi-Fi Direct group owner")


def choose_host(expected_name):
    deadline = time.monotonic() + 85
    refresh_after = time.monotonic() + 22
    while time.monotonic() < deadline:
        nodes = qa.tree()
        if nearby_permission(nodes):
            qa.report("Guest granted Nearby devices permission through Android’s permission dialog.")
            continue
        devices = [n for n in nodes if n.get("package") == qa.APP
                   and re.search(r"(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$", txt(n), re.I)]
        match = [n for n in devices if txt(n).splitlines()[0] == expected_name]
        if len(match) == 1 or len(devices) == 1:
            # The host is the only other virtual radio on this isolated runner.
            qa.tap(match[0] if len(match) == 1 else devices[0])
            return
        if time.monotonic() >= refresh_after:
            refresh = next((n for n in nodes if txt(n).casefold() == "refresh"), None)
            if refresh is not None:
                qa.tap(refresh)
                refresh_after = time.monotonic() + 22
        if any(txt(n).startswith("This device does not offer Wi-Fi Direct") for n in nodes):
            raise qa.CheckFailed("Guest Android Wi-Fi Direct capability unavailable")
    raise qa.CheckFailed("Host did not appear in CubeChat’s actual Nearby Wi-Fi Direct devices list")


def accept_system_invitation(nodes):
    system = [n for n in nodes if n.get("package") in {
        "android", "com.android.settings", "com.android.systemui", "com.android.wifi.dialog",
        "com.google.android.wifi.dialog",
    } or n.get("package", "").endswith(".wifi.dialog")]
    context = " ".join(txt(n).casefold() for n in system)
    is_wifi_dialog = (any(n.get("package", "").endswith(".wifi.dialog") for n in system)
                      or any(word in context for word in ("invitation", "wi-fi direct", "would like to connect",
                                                           "wants to connect", "wi-fi connection")))
    if not is_wifi_dialog:
        return False
    positive = next((n for n in system if txt(n).casefold() in ("accept", "connect", "allow", "join")), None)
    if positive is None:
        positive = next((n for n in system if n.get("resource-id") == "android:id/button1"), None)
    if positive is None:
        return False
    qa.tap(positive)
    return True


def connected_pair():
    deadline = time.monotonic() + 95
    accepted = set()
    while time.monotonic() < deadline:
        connected = set()
        for serial in (HOST, GUEST):
            with phone(serial):
                nodes = qa.tree()
                if accept_system_invitation(nodes):
                    accepted.add(serial)
                elif any(txt(n) == WIFI_STATUS and n.get("package") == qa.APP for n in nodes):
                    connected.add(serial)
        if len(connected) == 2:
            if accepted:
                qa.report("Selected Android’s positive action on the Wi-Fi Direct connection invitation.")
            else:
                qa.report("Android formed the Wi-Fi Direct group without displaying a connection approval prompt.")
            return
    raise qa.CheckFailed("Both clients did not report an authenticated Wi-Fi Direct connection")


def p2p_addresses():
    # Prefer a live, named Wi-Fi Direct interface over a shared AndroidWifi wlan0 address.
    ips = qa.shell("ip", "-4", "-o", "addr", "show")
    direct = []
    for row in ips.splitlines():
        match = re.search(r"^\d+:\s+(\S+)\s+inet\s+(\S+)", row)
        if match and "p2p" in match.group(1).lower():
            direct.append(ipaddress.IPv4Interface(match.group(2)))
    return direct


def verify_group():
    with phone(HOST):
        owners = p2p_addresses()
    with phone(GUEST):
        clients = p2p_addresses()
    if not any(a.ip != b.ip and a.network == b.network for a in owners for b in clients):
        raise qa.CheckFailed("Android did not expose distinct IPv4 addresses on the same two P2P group interfaces")
    qa.report("Both AVDs have separate addresses on the same Android Wi-Fi Direct group subnet.")


def send(serial, text):
    with phone(serial):
        qa.named(WIFI_STATUS)
        editor = qa.wait_for(lambda n: n.get("class") == "android.widget.EditText", "Message field")
        qa.tap(editor)
        qa.shell("input", "text", text)
        qa.tap(qa.named("Send"))
        # Hide the IME only when visible; avoid navigating back out of the app.
        if "mInputShown=true" in qa.shell("dumpsys", "input_method"):
            qa.shell("input", "keyevent", "KEYCODE_BACK")


def exchange(sender, receiver, message):
    send(sender, message)
    with phone(receiver):
        qa.named(message)
        qa.named(WIFI_STATUS)
    with phone(sender):
        qa.wait_for(lambda n: txt(n).startswith("You · ") and txt(n).endswith(" · Delivered"),
                    "Outgoing delivery acknowledgement")
        qa.named(WIFI_STATUS)


def check():
    with phone(HOST):
        qa.launch("0")
        qa.tap(qa.named("Show my invite"))
        qa.named("Pairing invite")
        card = qa.decode_card(qa.wait_for(lambda n: n.get("content-desc") == "CubeChat pairing QR code",
                                         "QR image"))
        qa.tap(qa.named("Close"))
        select_direct()
        host_name = host_ready()
        qa.report("Host created a native Wi-Fi Direct group through CubeChat’s Connection menu.")
    with phone(GUEST):
        # Explicit package resolves the private HTTPS card to CubeChat's exported Android filter.
        qa.shell("am", "start", "-W", "-a", "android.intent.action.VIEW",
                 "-c", "android.intent.category.BROWSABLE", "-d", card, "-p", qa.APP,
                 label="Import synthetic host card on the other Android device")
        qa.wait_for(lambda n: txt(n).startswith("Peer "), "Imported peer identity")
        select_direct()
        choose_host(host_name)
        qa.report("Guest discovered the host radio and selected it in CubeChat’s Wi-Fi Direct peer list.")
    connected_pair()
    verify_group()
    exchange(GUEST, HOST, "GuestRadio42")
    exchange(HOST, GUEST, "HostRadio73")
    qa.report("Two independent AVDs decrypted each other’s distinct messages over native Wi-Fi Direct. "
              "Both senders displayed Delivered, with no ADB forward, reverse or IP bridges.")


if __name__ == "__main__":
    try:
        check()
    except qa.CheckFailed as exc:
        print("Wi-Fi Direct acceptance failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        # No screenshots, command arguments, arbitrary UI XML or private QR text in CI logs.
        print("Wi-Fi Direct acceptance failed: " + type(exc).__name__, file=sys.stderr)
        sys.exit(1)
