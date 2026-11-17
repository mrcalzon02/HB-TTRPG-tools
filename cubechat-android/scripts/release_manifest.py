"""Generate or verify CubeChat's public manifest from the signed distribution APK."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "org.cubechat.android"
CERTIFICATE = "7d8ad886143d7c8e951cd28af2bb143011d498b03bc48ec90a9d876d9ee17877"
RELEASES = "https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download"


def release_manifest(build_tools):
    apk = ROOT / "downloads" / "CubeChat.apk"
    badging = subprocess.check_output([build_tools / "aapt", "dump", "badging", apk], text=True)
    fields = dict(re.findall(r"([A-Za-z]+)='([^']*)'", badging.splitlines()[0]))
    version = fields["versionName"]
    code = int(fields["versionCode"])
    if fields.get("name") != PACKAGE or not 0 < code <= 2100000000:
        raise SystemExit("Unexpected Android package or version code")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?", version):
        raise SystemExit("Unsupported CubeChat version name")
    gradle = (ROOT / "app/build.gradle").read_text(encoding="utf-8")
    if not re.search(r"^\s*versionName\s+'" + re.escape(version) + r"'\s*$", gradle, re.M):
        raise SystemExit("APK version name differs from app/build.gradle")
    if not re.search(r"^\s*versionCode\s+" + str(code) + r"\s*$", gradle, re.M):
        raise SystemExit("APK version code differs from app/build.gradle")

    report = subprocess.check_output([build_tools / "apksigner", "verify", "--print-certs", apk], text=True)
    signers = re.findall(r"^Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F]+)$", report, re.M)
    if [item.lower() for item in signers] != [CERTIFICATE]:
        raise SystemExit("APK must have CubeChat's original release signature")

    tag = f"cubechat-android-v{version}"
    return {
        "applicationId": PACKAGE,
        "versionName": version,
        "versionCode": code,
        "tag": tag,
        "apk": apk.name,
        "size": apk.stat().st_size,
        "sha256": hashlib.sha256(apk.read_bytes()).hexdigest(),
        "signerSha256": CERTIFICATE,
        "url": f"{RELEASES}/{quote(tag, safe='')}/{apk.name}",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-tools", type=Path, help="Android SDK build-tools directory")
    parser.add_argument("--write", action="store_true", help="Write release.json after all checks pass")
    args = parser.parse_args()
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if not args.build_tools and not sdk:
        parser.error("Provide --build-tools or set ANDROID_HOME")
    tools = args.build_tools or Path(sdk) / "build-tools/35.0.0"
    serialized = json.dumps(release_manifest(tools), indent=2) + "\n"
    target = ROOT / "release.json"
    if args.write:
        target.write_text(serialized, encoding="utf-8")
    elif not target.exists() or target.read_text(encoding="utf-8") != serialized:
        raise SystemExit("release.json differs from the signed APK. Regenerate it with --write.")
