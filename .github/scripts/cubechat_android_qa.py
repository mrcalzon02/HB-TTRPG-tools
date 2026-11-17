"""Exercise a release APK through its Android UI. Private invite material stays in memory."""
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

APP = "org.cubechat.android"
MAIN = APP + "/.MainActivity"
PREFIX = "https://cubechat-android.lankytangerine2.chatgpt.site/#CUBECHAT2."
MESSAGE = "CubeChatQA42"


class CheckFailed(Exception):
    """Messages contain fixed descriptions safe for the Actions log."""


def run(args, label, *, data=None, timeout=50, required=True):
    try:
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=timeout, check=False)
    except subprocess.TimeoutExpired:
        raise CheckFailed(label + " timed out") from None
    if required and result.returncode:
        raise CheckFailed(label + " failed")
    return result.stdout


def shell(*args, label="Android shell", **kwargs):
    return run(["adb", "shell", *args], label, **kwargs).decode(errors="replace").strip()


def report(text):
    print(text, flush=True)
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as out:
            out.write("- " + text + "\n")


def tree():
    data = run(["adb", "exec-out", "uiautomator", "dump", "/dev/tty"], "Read Android UI")
    start = data.find(b"<?xml")
    end = data.find(b"</hierarchy>")
    if start < 0 or end < 0:
        return []
    try:
        return list(ET.fromstring(data[start:end + len(b"</hierarchy>")]).iter("node"))
    except ET.ParseError:
        return []


def wait_for(pred, label, timeout=60):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for node in tree():
            if pred(node):
                return node
        time.sleep(0.35)
    raise CheckFailed(label + " did not appear")


def named(text):
    return wait_for(lambda n: n.get("text", "").casefold() == text.casefold(), text)


def bounds(node):
    values = [int(s) for s in re.findall(r"-?\d+", node.get("bounds", ""))]
    if len(values) != 4:
        raise CheckFailed("Android view bounds unavailable")
    return values


def tap(node):
    left, top, right, bottom = bounds(node)
    shell("input", "tap", str((left + right) // 2), str((top + bottom) // 2))


def launch(user):
    shell("am", "start", "--user", user, "-W", "-n", MAIN, label="Launch CubeChat")
    named("CubeChat")


def guest_profile():
    response = shell("pm", "create-user", "--profileOf", "0", "--managed", "CubeChatQA", required=False)
    match = re.search(r"Success:.*?\bid\s+(\d+)", response)
    if not match:
        return None
    user = match.group(1)
    shell("am", "start-user", "-w", user, label="Start guest Android profile")
    shell("cmd", "package", "install-existing", "--user", user, APP, label="Enable guest APK")
    return user


def decode_card(node):
    png = run(["adb", "exec-out", "screencap", "-p"], "Capture synthetic QR framebuffer")
    tmp = Path(os.environ["RUNNER_TEMP"])
    argv = ["java", "-Djava.awt.headless=true", "-cp", f"{tmp}:{tmp / 'zxing-core.jar'}",
            "CubeChatQrReader", *map(str, bounds(node))]
    # Its stdout is consumed here. Failure details may contain the card and must stay out of CI logs.
    card = run(argv, "Decode on-screen QR", data=png).decode("ascii")
    if not card.startswith(PREFIX) or not re.fullmatch(r"[A-Za-z0-9_-]+", card[len(PREFIX):]):
        raise CheckFailed("Rendered QR did not contain the expected HTTPS key card")
    return card


def check():
    launch("0")
    named("Pair two phones")
    report("The frozen signed APK launched at its pairing screen.")
    tap(named("Show my invite"))
    named("Pairing invite")
    qr = wait_for(lambda n: n.get("content-desc") == "CubeChat pairing QR code", "Pairing QR")
    card = decode_card(qr)
    report("The host rendered a scannable HTTPS key card; an independent decoder read the screen.")
    tap(named("Close"))
    shell("am", "force-stop", "--user", "0", APP)
    guest = guest_profile()
    if guest is None:
        # This is an ephemeral QA device. Clearing the only installation creates a distinct
        # guest identity for cold-import testing on images without managed-profile support.
        shell("pm", "clear", "--user", "0", APP, label="Reset emulator installation to guest")
        guest = "0"
        report("This image lacks a managed profile; the cold-import guest uses a fresh app sandbox.")
    else:
        report("Created a second Android profile with an independent UID and keystore.")
    shell("am", "force-stop", "--user", guest, APP)
    # Explicit package avoids the OS browser chooser. No explicit Activity: Android matches
    # the real HTTPS scheme, host, path and BROWSABLE intent filter against the scanned URL.
    shell("am", "start", "--user", guest, "-W", "-a", "android.intent.action.VIEW",
          "-c", "android.intent.category.BROWSABLE", "-d", card, "-p", APP, label="Cold-open scanned HTTPS invite")
    wait_for(lambda n: n.get("text", "").startswith("Peer "), "Imported peer identity")
    field = wait_for(lambda n: n.get("class") == "android.widget.EditText", "Guest message field")
    tap(field)
    shell("input", "text", MESSAGE)
    tap(named("Send"))
    wait_for(lambda n: n.get("text", "").endswith("Queued"), "Offline queue receipt")
    report("The stopped guest opened the scanned HTTPS card, imported its keys, and queued a message with the host offline.")
    if guest == "0":
        return
    launch("0")
    wait_for(lambda n: n.get("text") == MESSAGE, "Message received by the original host", timeout=90)
    launch(guest)
    wait_for(lambda n: n.get("text", "").endswith("Delivered"), "Delivery acknowledgement", timeout=60)
    report("The original host received the guest message and the guest recorded its delivery acknowledgement.")


if __name__ == "__main__":
    try:
        check()
    except CheckFailed as exc:
        print(f"Device acceptance failed: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        # Never include traceback locals, adb arguments, XML content or QR text.
        print("Device acceptance failed: " + type(exc).__name__, file=sys.stderr)
        sys.exit(1)
