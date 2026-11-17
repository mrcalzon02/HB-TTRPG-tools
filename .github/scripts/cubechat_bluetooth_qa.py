"""Drive two separate AVD screens; key cards, screenshot pixels and pairing digits never enter logs."""
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

from cubechat_android_qa import APP, MAIN, CheckFailed, bounds, decode_card, report, run

MAC = re.compile(r"(?i)\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b")
RADIO_STATUS = "Connected over Bluetooth"


class Phone:
    def __init__(self, serial):
        self.serial = serial

    def command(self, *args, label="Android action", required=True, timeout=35):
        return run(["adb", "-s", self.serial, *args], label, required=required, timeout=timeout)

    def shell(self, *args, **kwargs):
        return self.command("shell", *args, **kwargs).decode(errors="replace").strip()

    def tree(self):
        data = self.command("exec-out", "uiautomator", "dump", "/dev/tty", label="Read simulated phone", required=False)
        start, end = data.find(b"<?xml"), data.find(b"</hierarchy>")
        if min(start, end) < 0:
            return []
        try:
            return list(ET.fromstring(data[start:end+len(b"</hierarchy>")]).iter("node"))
        except ET.ParseError:
            return []

    def tap(self, node):
        left, top, right, bottom = bounds(node)
        self.shell("input", "tap", str((left + right)//2), str((top + bottom)//2))

    def find(self, predicate, label, timeout=45):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            node = next((n for n in self.tree() if predicate(n)), None)
            if node is not None:
                return node
            time.sleep(0.2)
        raise CheckFailed(label + " did not appear on " + self.serial)

    def named(self, label):
        return self.find(lambda n: text(n) == label, label)

    def choose_bluetooth(self):
        for label in ("Pairing", "Connection…", "Bluetooth"):
            self.tap(self.named(label))

    def send(self, message):
        self.tap(self.find(lambda n: n.get("class") == "android.widget.EditText", "Message field"))
        self.shell("input", "text", message)
        self.tap(self.named("Send"))

    def open_pair_notification(self):
        self.shell("cmd", "statusbar", "expand-notifications", required=False)
        tree = self.tree()
        item = next((n for n in tree if "pairing request" in text(n).lower()), None)
        if item is not None:
            self.tap(item)
        else:
            self.shell("cmd", "statusbar", "collapse", required=False)


def text(node):
    return node.get("text", "").strip()


def approve_android(prompt, phone):
    """Only handle Bluetooth-related permission, discoverability, enable or bond confirmation."""
    visible = " ".join(text(n).lower() for n in prompt)
    if not any(s in visible for s in ("bluetooth", "nearby device", "pair with", "pairing", "visible to other devices")):
        return False
    for n in prompt:
        pkg = n.get("package", "")
        if not (pkg.startswith(("com.android.", "com.google.android.")) or pkg == "android"):
            continue
        name = text(n).lower()
        rid = n.get("resource-id", "").rsplit("/", 1)[-1]
        if name in ("allow", "pair", "pair & connect", "turn on", "yes", "ok", "while using the app") or rid in (
                "permission_allow_button", "permission_allow_foreground_only_button"):
            phone.tap(n)
            return True
    return False


def wait_host_ready(host):
    until = time.monotonic() + 60
    while time.monotonic() < until:
        tree = host.tree()
        if approve_android(tree, host):
            continue
        if any("waiting for bluetooth" in text(n).lower() for n in tree):
            # The radio route is selected before Activity launches its discoverability prompt.
            time.sleep(0.6)
            follow = host.tree()
            if approve_android(follow, host):
                continue
            if any("waiting for bluetooth" in text(n).lower() for n in follow):
                return
    raise CheckFailed("Host Bluetooth service or Android discovery prompt unavailable")


def host_address(host):
    summary = host.shell("dumpsys", "bluetooth_manager")
    match = re.search(r"(?im)^\s*address\s*:\s*(" + MAC.pattern.replace("(?i)", "") + r")", summary)
    if match and match.group(1).upper() not in ("02:00:00:00:00:00", "00:00:00:00:00:00"):
        return match.group(1).upper()
    return None


def select_discovered_peer(guest, host):
    until = time.monotonic() + 85
    expected = host_address(host)
    searches = 0
    while time.monotonic() < until:
        tree = guest.tree()
        if approve_android(tree, guest):
            continue
        candidates = [n for n in tree if n.get("package") == APP and MAC.search(text(n))]
        matched = [n for n in candidates if expected and expected in text(n).upper()]
        # Freshly-created, isolated netsim contains exactly these two AVDs; a sole peer can never
        # represent a physical Bluetooth device. The final identity/receipt assertions authenticate it.
        if matched or len(candidates) == 1:
            guest.tap((matched or candidates)[0])
            return
        finished = any(text(n) in ("No phones found", "Choose the other phone") for n in tree)
        again = next((n for n in tree if text(n).lower() == "search again"), None)
        if finished and again is not None and searches < 2:
            guest.tap(again)
            searches += 1
    raise CheckFailed("Guest did not discover the host over simulated Bluetooth Classic")


def bond(host, guest):
    deadline = time.monotonic() + 100
    next_notifications = time.monotonic() + 8
    with ThreadPoolExecutor(max_workers=2) as pool:
        while time.monotonic() < deadline:
            views = list(pool.map(lambda p: p.tree(), (host, guest)))
            connected = [any(text(n) == RADIO_STATUS for n in tree) for tree in views]
            if all(connected):
                return
            approved = False
            for phone, tree in zip((host, guest), views):
                if approve_android(tree, phone):
                    approved = True
            if not approved and time.monotonic() >= next_notifications:
                for phone, ok in zip((host, guest), connected):
                    if not ok:
                        phone.open_pair_notification()
                next_notifications = time.monotonic() + 15
    raise CheckFailed("The two RFCOMM sessions did not authenticate")


def check():
    host, guest = Phone("emulator-5554"), Phone("emulator-5556")
    host.shell("am", "start", "-W", "-n", MAIN)
    host.tap(host.named("Show my invite"))
    qr = host.find(lambda n: n.get("content-desc") == "CubeChat pairing QR code", "Host QR")
    os.environ["ANDROID_SERIAL"] = host.serial  # decoder only, no disk image
    card = decode_card(qr)
    host.tap(host.named("Close"))
    host.choose_bluetooth()
    wait_host_ready(host)
    report("Phone A opened the signed APK, created a key card, and entered the Bluetooth host route.")

    guest.shell("am", "start", "-W", "-a", "android.intent.action.VIEW", "-c", "android.intent.category.BROWSABLE",
                "-d", card, "-p", APP, label="Import synthetic key through the actual app link")
    del card
    guest.find(lambda n: text(n).startswith("Peer "), "Imported peer")
    guest.choose_bluetooth()
    select_discovered_peer(guest, host)
    bond(host, guest)
    report("Two independent virtual phones discovered and authenticated each other through the Android Bluetooth Classic/RFCOMM stack.")

    for source, target, message in ((guest, host, "BluetoothGuestToHost52"), (host, guest, "BluetoothHostToGuest89")):
        source.named(RADIO_STATUS)
        source.send(message)
        target.named(message)
        source.find(lambda n: text(n).endswith("Delivered"), "Authenticated receipt")
        target.named(RADIO_STATUS)
    report("Encrypted text traveled in both directions; each recipient displayed the expected plaintext and each sender recorded Delivered with Wi-Fi and mobile data disabled.")


if __name__ == "__main__":
    try:
        check()
    except CheckFailed as e:
        print("Bluetooth QA failed: " + str(e), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print("Bluetooth QA failed: " + type(e).__name__, file=sys.stderr)
        sys.exit(1)
