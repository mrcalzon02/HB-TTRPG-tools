"""Exercise the signed production update plus a disposable older client with unchanged upstream updater code."""
import base64
import os
from pathlib import Path
import sys

import cubechat_android_qa as ui

VERSION = "0.1.1"
APP = ui.APP
QUEUED = "KeepMyOfflineMessage"


def wait_text(needle, description, seconds=60):
    return ui.wait_for(lambda n: needle.casefold() in n.get("text", "").casefold(), description, seconds)


def key_identity(first):
    if not first:
        ui.tap(ui.named("Pairing"))
    ui.tap(ui.named("Show my invite"))
    ui.named("Pairing invite")
    ui.tap(ui.named("Show invite text"))
    for attempt in range(3):
        card = next((n.get("text", "") for n in ui.tree()
                     if n.get("text", "").startswith(ui.PREFIX)), None)
        if card:
            break
        ui.shell("input", "swipe", "360", "880", "360", "440", "350")
    if not card:
        raise ui.CheckFailed("The host could not display its persisted invite")
    encoded = card[len(ui.PREFIX):]
    raw = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    ui.tap(ui.named("Close"))
    # Exclude the local address/port and the CRC of the card from the identity comparison.
    return raw[7:-4]


def downloads():
    return ui.shell("ls", "-1", "/sdcard/Download", required=False)


def no_browser_transfer(before):
    count = ui.shell("run-as", "org.cubechat.qacapture", "ls", "shared_prefs/received.xml", required=False)
    if downloads() != before or "shared_prefs/received.xml" == count:
        raise ui.CheckFailed("Transfer or external download activity appeared without consent")


def verify_installed_release(tmp):
    ui.launch("0")
    ui.named("Pair two phones")
    old_identity = key_identity(first=True)
    field = ui.wait_for(lambda n: n.get("class") == "android.widget.EditText", "Message composer")
    ui.tap(field)
    ui.shell("input", "text", QUEUED)
    ui.tap(ui.named("Send"))
    wait_text("Queued", "Offline queue receipt")
    ui.shell("am", "force-stop", APP)
    ui.run(["adb", "install", "-r", str(tmp / "CubeChat.apk")], "Install the published signed release over 0.1.0")
    package = ui.shell("dumpsys", "package", APP)
    if "versionCode=2 " not in package or "versionName=0.1.1" not in package:
        raise ui.CheckFailed("Android did not upgrade the existing package to 0.1.1")
    perms = package.split("requested permissions:", 1)[-1].split("install permissions:", 1)[0]
    if any(p in perms for p in ("REQUEST_INSTALL_PACKAGES", "INSTALL_PACKAGES", "WRITE_EXTERNAL_STORAGE", "MANAGE_EXTERNAL_STORAGE")):
        raise ui.CheckFailed("Package requested an installation or storage permission")
    ui.launch("0")
    ui.named(QUEUED)
    wait_text("Queued", "Persisted queue receipt")
    if key_identity(first=False) != old_identity:
        raise ui.CheckFailed("The existing host identity or directional keys changed")
    ui.report("Android upgraded the signed 0.1.0 APK in place to the published 0.1.1 APK. Its exact identity, both QR chat keys and queued message survived.")
    ui.tap(ui.named("Pairing"))
    ui.tap(ui.named("Check for updates"))
    ui.named("CubeChat is up to date")
    wait_text("0.1.1 (build 2)", "Installed version and Android build")
    ui.tap(ui.named("Close"))
    ui.report("The real release checked GitHub through its normal menu and showed the installed version as current.")


def verify_offer(tmp):
    # This public-source debug rehearsal only changes Gradle's version metadata. Its disposable
    # debug key is unique to the hosted runner. User-facing artifacts always remain release-signed.
    ui.run(["adb", "uninstall", APP], "Clear the disposable emulator before the isolated older-client test")
    ui.run(["adb", "install", str(tmp / "CubeChat-updater-rehearsal.apk")], "Install rehearsal APK")
    ui.run(["adb", "install", str(tmp / "consent-probe.apk")], "Install networkless browser-intent observer")
    ui.shell("cmd", "role", "add-role-holder", "--user", "0", "android.app.role.BROWSER", "org.cubechat.qacapture")
    resolver = ui.shell("cmd", "package", "resolve-activity", "--brief", "-a", "android.intent.action.VIEW",
                        "-c", "android.intent.category.BROWSABLE", "-d", "https://example.org/")
    if "org.cubechat.qacapture" not in resolver:
        raise ui.CheckFailed("Android did not assign the test browser role")
    before = downloads()
    ui.launch("0")
    banner = ui.wait_for(lambda n: "update available" in n.get("text", "").casefold()
                        and VERSION in n.get("text", ""), "Automatic update offer on app opening", timeout=110)
    no_browser_transfer(before)
    ui.tap(banner)
    ui.named("CubeChat update available")
    wait_text("Available 0.1.1 (build 2)", "Offered build and version number")
    ui.tap(ui.named("Not now"))
    no_browser_transfer(before)
    ui.report("A fresh lower-version rehearsal automatically found the actual published update. Opening the offer and choosing Not now left Downloads unchanged and never dispatched a browser.")
    banner = wait_text("Update available", "Cached update banner")
    ui.tap(banner)
    ui.tap(ui.named("Open download"))
    ui.named("Observed exact CubeChat release download")
    ui.report("After Open download, Android dispatched the exact official GitHub Release APK URL to its default HTTPS handler. A networkless test browser recorded the intent; the signed app requested no installer or filesystem permission.")


def main():
    tmp = Path(os.environ["RUNNER_TEMP"])
    verify_installed_release(tmp)
    verify_offer(tmp)


if __name__ == "__main__":
    try:
        main()
    except ui.CheckFailed as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print("Upgrade check failed: " + type(e).__name__, file=sys.stderr)
        sys.exit(1)
