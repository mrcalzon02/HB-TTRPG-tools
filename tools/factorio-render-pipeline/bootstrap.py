#!/usr/bin/env python3
"""One-command local Factorio art workstation setup (Windows/Linux x64).

Install: python tools/factorio-render-pipeline/bootstrap.py install
Verify:  python tools/factorio-render-pipeline/bootstrap.py verify

Manages ONLY a per-user workspace. An official Blender archive is downloaded
over HTTPS, verified against Blender's official SHA-256 manifest, then extracted
without administrative access. Never claims game-art or Factorio validation.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zipfile

VERSION = "4.5.15"
ROOT = Path(__file__).resolve().parent
OFFICIAL = "https://download.blender.org/release/Blender4.5/"
STATE = (Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
         if os.name == "nt" else Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))) / "hb-ttrpg-tools" / "factorio-render-pipeline"
EXTRA = ("windows-x64.zip" if sys.platform == "win32" else "linux-x64.tar.xz")
ARCHIVE = "blender-" + VERSION + "-" + EXTRA
EXPECTED_FOLDER = ARCHIVE.replace(".tar.xz", "").replace(".zip", "")
EXPECTED_BINARY = "blender.exe" if sys.platform == "win32" else "blender"


def platform_supported():
    return (sys.platform in ("linux", "win32") and
            platform.machine().lower() in ("amd64", "x86_64"))


def command(parts, **kwargs):
    subprocess.run([str(p) for p in parts], check=True, **kwargs)


def checksum_manifest(data):
    for line in data.splitlines():
        words = line.strip().replace("*", " ").split()
        if len(words) >= 2 and words[1] == ARCHIVE and re.fullmatch(r"[a-fA-F0-9]{64}", words[0]):
            return words[0].lower()
    raise ValueError("Official SHA256 manifest lacks pinned Blender archive entry: " + ARCHIVE)


def fetch_https(url, target):
    if not url.startswith(OFFICIAL):
        raise ValueError("Unapproved download origin")
    request = urllib.request.Request(url, headers={"User-Agent": "HB-TTRPG-factorio-art-bootstrap/1"})
    with urllib.request.urlopen(request, timeout=120) as response, target.open("wb") as out:
        if not response.url.startswith(OFFICIAL):
            raise ValueError("Download redirected outside official Blender host")
        shutil.copyfileobj(response, out, length=1024 * 1024)


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def inside(parent, child):
    return child == parent or parent in child.parents


def unpack_safely(archive, destination):
    destination.mkdir(parents=True, exist_ok=True)
    base = destination.resolve()
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as z:
            for member in z.infolist():
                target = (base / member.filename).resolve()
                if not inside(base, target):
                    raise ValueError("Unsafe ZIP path " + member.filename)
                # ZIP UNIX symlinks are unsupported in deployment archives.
                if ((member.external_attr >> 16) & 0o170000) == 0o120000:
                    raise ValueError("ZIP symlink is unsupported")
            z.extractall(base)
    else:
        with tarfile.open(archive, mode="r:xz") as tar:
            for member in tar.getmembers():
                target = (base / member.name).resolve()
                if not inside(base, target):
                    raise ValueError("Unsafe TAR path " + member.name)
                if member.issym():
                    link = (target.parent / member.linkname).resolve()
                    if not inside(base, link):
                        raise ValueError("Unsafe TAR symbolic link " + member.name)
                elif member.islnk():
                    link = (base / member.linkname).resolve()
                    if not inside(base, link):
                        raise ValueError("Unsafe TAR hard link " + member.name)
                elif not (member.isfile() or member.isdir()):
                    raise ValueError("Unsupported archive entry " + member.name)
            # Filter supported in recent Python releases; static checks above protect
            # Python 3.10 as well. Do not extract privileged archive metadata.
            if hasattr(tarfile, "data_filter"):
                tar.extractall(base, filter="data")
            else:
                tar.extractall(base)


def managed_blender():
    return STATE / EXPECTED_FOLDER / EXPECTED_BINARY


def install_blender():
    binary = managed_blender()
    if binary.is_file():
        return binary
    STATE.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="blender-install-", dir=STATE) as scratch:
        scratch = Path(scratch)
        manifest = scratch / "official.sha256"
        package = scratch / ARCHIVE
        print("Fetching official-origin Blender checksum manifest ...", flush=True)
        fetch_https(OFFICIAL + "blender-" + VERSION + ".sha256", manifest)
        expected = checksum_manifest(manifest.read_text(encoding="utf-8"))
        print("Downloading official Blender " + VERSION + " archive ...", flush=True)
        fetch_https(OFFICIAL + ARCHIVE, package)
        actual = digest(package)
        if actual != expected:
            raise ValueError("Blender SHA256 mismatch; refusing extraction")
        stage = scratch / "unpack"
        unpack_safely(package, stage)
        candidate = stage / EXPECTED_FOLDER / EXPECTED_BINARY
        if not candidate.is_file():
            raise FileNotFoundError("Blender archive did not contain expected executable")
        if sys.platform != "win32":
            candidate.chmod(candidate.stat().st_mode | 0o111)
        permanent = STATE / EXPECTED_FOLDER
        if permanent.exists():
            raise FileExistsError("Refusing to overwrite pre-existing Blender directory")
        (stage / EXPECTED_FOLDER).rename(permanent)
    return binary


def external_blender():
    configured = os.environ.get("BLENDER_BIN")
    if configured:
        return Path(configured).expanduser().resolve()
    system = shutil.which("blender")
    return Path(system).resolve() if system else None


def find_blender(allow_external=True):
    binary = managed_blender()
    if binary.is_file():
        return binary
    return external_blender() if allow_external else None


def check_blender(binary):
    if binary is None or not binary.is_file():
        raise FileNotFoundError("No usable Blender binary. Run 'install' first or set BLENDER_BIN.")
    result = subprocess.run([str(binary), "--version"], capture_output=True, text=True, check=True, timeout=45)
    first_line = result.stdout.splitlines()[0] if result.stdout else ""
    if not first_line.startswith("Blender 4.5."):
        raise RuntimeError("Expected Blender 4.5 LTS; found: " + first_line)
    return first_line


def python_env():
    return STATE / "python-venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def install_python_env():
    python = python_env()
    if not python.is_file():
        command([sys.executable, "-m", "venv", str(python.parent.parent)])
    command([python, "-m", "pip", "--disable-pip-version-check", "install", "-r", ROOT / "requirements.txt"])
    return python


def check_python_env():
    python = python_env()
    if not python.is_file():
        raise FileNotFoundError("Python art venv is absent; run 'install' first")
    command([python, "-c", "from PIL import Image; import yaml; print('Pillow/PyYAML available')"])
    return python


def verify_and_smoke(binary):
    version = check_blender(binary)
    check_python_env()
    STATE.mkdir(parents=True, exist_ok=True)
    output = STATE / "smoke-frame.png"
    if output.exists():
        output.unlink()
    command([binary, "--background", "--factory-startup", "--python",
             ROOT / "blender_smoke.py", "--", "--output", output])
    if not output.is_file():
        raise RuntimeError("Blender returned success but did not render output")
    raw = output.read_bytes()
    if not raw.startswith(b"\x89PNG\r\n\x1a\n") or len(raw) < 200:
        raise RuntimeError("Invalid or empty Blender PNG output")
    return {"blender_version": version, "blender_binary": str(binary),
            "smoke_image": str(output), "smoke_sha256": digest(output),
            "smoke_bytes": len(raw)}


def write_report(status, details):
    STATE.mkdir(parents=True, exist_ok=True)
    report = {"schema_version": 1, "state": status,
              "generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "platform": sys.platform, "machine": platform.machine(),
              "python": sys.version.split()[0], "blender_target": VERSION,
              "scope": "art workstation readiness only; game render pipeline and Factorio load NOT validated"}
    report.update(details)
    path = STATE / "readiness.json"
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("Readiness report:", path)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install", "verify"))
    parser.add_argument("--no-download", action="store_true",
                        help="Fail instead of downloading Blender when missing")
    args = parser.parse_args()
    if sys.version_info < (3, 10) or not platform_supported():
        parser.error("Only Python 3.10+ on Windows x64 or Linux x64 is supported")
    info = {}
    try:
        if args.action == "install":
            install_python_env()
            binary = find_blender()
            if binary is not None:
                try:
                    print("Checking Blender version:", check_blender(binary), flush=True)
                except (OSError, RuntimeError, subprocess.CalledProcessError):
                    if os.environ.get("BLENDER_BIN"):
                        raise
                    print("System Blender is outside 4.5 LTS; installing pinned managed Blender", flush=True)
                    binary = None
            if binary is None:
                if args.no_download:
                    raise FileNotFoundError("No verified Blender 4.5 LTS; --no-download prohibits bootstrap")
                binary = install_blender()
        else:
            binary = find_blender()
        info.update(verify_and_smoke(binary))
        write_report("ready", info)
        print("READY: unified local Blender art workstation and headless smoke render verified.")
        return 0
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as exc:
        info["error"] = str(exc)
        write_report("blocked", info)
        print("BLOCKED:", exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
