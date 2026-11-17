"""Two AOSP guests exercise the published release on a shared virtual Wi-Fi network or a labeled ADB fallback."""
import os
import re
import time
import sys
from pathlib import Path

import cubechat_android_qa as ui

HOST = "emulator-5554"
GUEST = "emulator-5556"
HELLO = "HelloFromGuest"
REPLY = "HelloFromHost"
OFFLINE = "QueuedBeforeRestart"
APP_PORT = "47743"
BRIDGE_PORT = "48743"


def select(serial):
    os.environ["ANDROID_SERIAL"] = serial


def stop():
    ui.shell("am", "force-stop", "--user", "0", ui.APP, label="Stop the current app")


def send(text):
    field = ui.wait_for(lambda n: n.get("class") == "android.widget.EditText", "Message input")
    ui.tap(field)
    ui.shell("input", "text", text)
    ui.tap(ui.named("Send"))
    ime = ui.shell("dumpsys", "input_method")
    if "mInputShown=true" in ime or "isInputViewShown=true" in ime:
        ui.shell("input", "keyevent", "KEYCODE_BACK")


def receipt(text, status):
    def matching_row(node):
        parts = [c.get("text", "") for c in node]
        return text in parts and any(p.startswith("You ·") and p.endswith(" · " + status) for p in parts)
    ui.wait_for(matching_row, "Message-specific " + status + " receipt", timeout=100)


def choose_network():
    # Modern emulator builds share a virtual AP. On pre-shared-network images the
    # two wlan0 addresses are often identical. Only then use the explicit ADB bridge.
    addresses = []
    for serial in (HOST, GUEST):
        select(serial)
        ui.shell("svc", "wifi", "enable")
        addr = None
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            result = ui.shell("ip", "-4", "-o", "addr", "show", "dev", "wlan0", required=False)
            addr = re.search(r"\binet (\d+\.\d+\.\d+\.\d+)/", result)
            if addr:
                break
            time.sleep(1)
        addresses.append(addr.group(1) if addr else None)
    if all(addresses) and addresses[0] != addresses[1]:
        ui.report("Testing shared virtual Wi-Fi directly, with distinct wlan0 IPv4 addresses " +
                  addresses[0] + " and " + addresses[1] + ". No port forwarding is installed.")
        return "direct virtual Wi-Fi"
    select(GUEST)
    ui.run(["adb", "root"], "Enable network configuration on the test guest")
    ui.run(["adb", "wait-for-device"], "Reconnect test guest after network configuration")
    if ui.shell("id", "-u") != "0":
        raise ui.CheckFailed("Emulator fallback network configuration unavailable")
    bridge()
    ui.report("The AVDs lack distinct wlan0 IPv4 addresses. The fallback routes only the guest app's TCP connection through ADB.")
    return "the ADB software TCP bridge"


def bridge():
    # NAT islands may assign identical guest IPs. Redirect only the app UID's outgoing
    # connection to its advertised TCP port. Neither the app nor its invitation changes.
    select(HOST)
    port = ui.run(["adb", "forward", "tcp:0", "tcp:" + APP_PORT], "Forward to host TCP socket").decode().strip()
    if not port.isdecimal():
        raise ui.CheckFailed("ADB did not assign a host forward")
    select(GUEST)
    ui.run(["adb", "reverse", "tcp:" + BRIDGE_PORT, "tcp:" + port], "Bridge TCP between the emulators")
    package_line = ui.shell("pm", "list", "packages", "-U", ui.APP)
    uid = re.search(r"\buid:(\d+)\b", package_line)
    if not uid:
        raise ui.CheckFailed("Guest app UID unavailable")
    ui.shell("iptables", "-w", "-t", "nat", "-I", "OUTPUT", "1", "-p", "tcp", "--dport", APP_PORT,
             "-m", "owner", "--uid-owner", uid.group(1), "-j", "REDIRECT", "--to-ports", BRIDGE_PORT,
             label="Route isolated guest app socket to the other emulator")


def proof():
    nodes = ui.tree()
    messages = [n.get("text", "") for n in nodes]
    if not {HELLO, REPLY, OFFLINE}.issubset(messages) or messages.count(OFFLINE) != 1:
        raise ui.CheckFailed("Complete synthetic conversation or single delivery missing")
    if any("CUBECHAT2." in str(n.attrib) or "pairing QR code" in n.get("content-desc", "")
           or n.get("text", "").lower() == "pairing invite" for n in nodes):
        raise ui.CheckFailed("Conversation screen contains an invite")
    image = ui.run(["adb", "exec-out", "screencap", "-p"], "Capture final synthetic conversation")
    if not image.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ui.CheckFailed("Invalid final conversation screenshot")
    Path(os.environ["RUNNER_TEMP"], "CubeChat-conversation.png").write_bytes(image)


def check():
    identities = []
    for serial in (HOST, GUEST):
        select(serial)
        identities.append(ui.shell("settings", "get", "secure", "android_id"))
        ui.launch("0")
        ui.named("Pair two phones")
    if len(set(identities)) != 2 or "" in identities or "null" in identities:
        raise ui.CheckFailed("Distinct Android device identities unavailable")
    ui.report("Two distinct Android 11 emulators installed and launched the hash-verified signed release.")
    transport = choose_network()
    select(HOST)
    ui.tap(ui.named("Show my invite"))
    ui.named("Pairing invite")
    qr = ui.wait_for(lambda n: n.get("content-desc") == "CubeChat pairing QR code", "Host pairing QR")
    card = ui.decode_card(qr)
    ui.tap(ui.named("Close"))
    stop()
    select(GUEST)
    stop()
    ui.shell("am", "start", "--user", "0", "-W", "-a", "android.intent.action.VIEW", "-c",
             "android.intent.category.BROWSABLE", "-d", card, "-p", ui.APP, label="Open original scanned HTTPS card")
    del card
    ui.wait_for(lambda n: n.get("text", "").startswith("Peer "), "Imported host fingerprint")
    send(HELLO)
    receipt(HELLO, "Queued")
    ui.report("The guest cold-opened the unmodified HTTPS card decoded from the host screen, and queued its message while the host was stopped.")
    select(HOST)
    ui.launch("0")
    ui.named(HELLO)
    select(GUEST)
    receipt(HELLO, "Delivered")
    select(HOST)
    send(REPLY)
    select(GUEST)
    ui.named(REPLY)
    select(HOST)
    receipt(REPLY, "Delivered")
    ui.report("Both emulators displayed the other app's message and each sender recorded its message-specific acknowledgement over " + transport + ".")
    select(GUEST)
    stop()
    select(HOST)
    send(OFFLINE)
    receipt(OFFLINE, "Queued")
    stop()
    ui.launch("0")
    receipt(OFFLINE, "Queued")
    ui.report("The pending message survived a force-stop and sender restart while the recipient remained stopped.")
    select(GUEST)
    ui.launch("0")
    ui.named(OFFLINE)
    select(HOST)
    receipt(OFFLINE, "Delivered")
    select(GUEST)
    proof()
    ui.report("The restarted recipient displayed exactly one copy of the queued message and the sender recorded its acknowledgement. The artifact shows only the resulting synthetic chat.")


if __name__ == "__main__":
    try:
        check()
    except ui.CheckFailed as exc:
        print("Device acceptance failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print("Device acceptance failed: " + type(exc).__name__, file=sys.stderr)
        sys.exit(1)
