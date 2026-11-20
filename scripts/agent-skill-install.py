#!/usr/bin/env python3
"""Host-controlled, reversible installer for Ed25519-signed engram/skill ZIPs.

Safety: an independently maintained trust policy is mandatory for installation,
activation, and rollback. Failed verification never changes the active pointer.
Packages are extracted into an isolated staging directory, then atomically
published by content digest. No network, shell execution or auto-updates.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager, redirect_stdout
from functools import lru_cache
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from types import ModuleType
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SIGNER_PATH = ROOT / "scripts" / "agent-skill-release-signature.py"
BUNDLE_PATH = ROOT / "scripts" / "agent-skill-bundle.py"
STATE_NAME = "state.json"
RELEASES_NAME = "releases"
TRUST_FORMAT = "hb-engram-host-trust/1"
STATE_FORMAT = "hb-engram-install-state/1"
HEX64 = re.compile(r"[a-f0-9]{64}\Z")
OWNER = "mrcalzon02/HB-TTRPG-tools"


@lru_cache(maxsize=8)
def module_from(path: Path, name: str):
    """Load trusted local verifier source without polluting a checkout with .pyc."""
    if not path.is_file() or path.is_symlink():
        raise ValueError("Required verifier module unavailable: " + name)
    result = ModuleType(name)
    result.__file__ = str(path)
    exec(compile(path.read_text(encoding="utf-8"), str(path), "exec"), result.__dict__)
    return result


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_object(path: Path, max_size=64 * 1024):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > max_size:
        raise ValueError("JSON file missing, a symlink, or oversized: " + str(path))
    obj = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(obj, dict):
        raise ValueError("Expected JSON object: " + str(path))
    return obj


def check_hex(value):
    return isinstance(value, str) and HEX64.fullmatch(value) is not None


def verify_trust_policy(path: Path, install_root: Path) -> dict:
    if not path.is_absolute():
        raise ValueError("Trust policy must be an absolute path controlled by the host")
    resolved_policy = path.resolve()
    if (resolved_policy.is_relative_to(ROOT.resolve())
        or resolved_policy.is_relative_to(install_root.resolve())):
        raise ValueError("Trust policy must remain outside the repo and install tree")
    if os.name != "nt" and (stat.S_IMODE(path.stat().st_mode) & 0o022):
        raise ValueError("Host trust policy must not be group- or world-writable")
    data = json_object(path)
    if set(data) != {"format", "repository", "publishers", "revokedKeys", "revokedBundles", "allowedSourceCommits"}:
        raise ValueError("Trust policy has missing or unexpected fields")
    if data["format"] != TRUST_FORMAT or data["repository"] != OWNER:
        raise ValueError("Wrong host trust-policy format or repository")
    if not isinstance(data["publishers"], list) or not data["publishers"]:
        raise ValueError("Trust policy requires at least one independently trusted public key")
    seen = set()
    for item in data["publishers"]:
        if not isinstance(item, dict) or set(item) != {"fingerprintSha256", "publicKeyPath", "status"}:
            raise ValueError("Publisher key entry malformed")
        fp, location = item["fingerprintSha256"], Path(item["publicKeyPath"])
        if not check_hex(fp) or fp in seen or item["status"] not in ("active", "retired"):
            raise ValueError("Publisher entry has invalid fingerprint, duplicate, or status")
        if not location.is_absolute() or location.is_symlink() or not location.is_file():
            raise ValueError("Trusted publisher public key must be a local absolute regular file")
        if location.resolve().is_relative_to(install_root.resolve()):
            raise ValueError("Publisher public key must remain outside installed release tree")
        seen.add(fp)
    for key in ("revokedKeys", "revokedBundles"):
        if not isinstance(data[key], list) or len(set(data[key])) != len(data[key]) or not all(map(check_hex, data[key])):
            raise ValueError("Invalid trust-policy revocation list: " + key)
    commits = data["allowedSourceCommits"]
    if (not isinstance(commits, list) or len(set(commits)) != len(commits)
        or any(not isinstance(c, str) or re.fullmatch(r"[a-f0-9]{40}", c) is None for c in commits)):
        raise ValueError("Invalid allowedSourceCommits; use full 40-character SHAs")
    return data


def signer_args(bundle: Path, attest: Path, signature: Path, public: Path,
                fingerprint: str, policy: dict):
    return argparse.Namespace(
        openssl=shutil.which("openssl") or "openssl",
        bundle=bundle, attestation=attest, signature=signature,
        public_key=public, trusted_key_sha256=fingerprint,
        expected_source_commit=None,
        revoked_key=policy["revokedKeys"],
        revoked_bundle=policy["revokedBundles"],
    )


def validate_signed_release(bundle: Path, attest: Path, sig: Path, policy: dict, *, allow_retired=False) -> dict:
    record = json_object(attest, max_size=16 * 1024)
    fingerprint = record.get("keyFingerprintSha256")
    if not check_hex(fingerprint):
        raise ValueError("Signed release has no valid publisher fingerprint")
    chosen = next((p for p in policy["publishers"]
                   if p["fingerprintSha256"] == fingerprint and (p["status"] == "active" or (allow_retired and p["status"] == "retired"))), None)
    if chosen is None:
        raise ValueError("Publisher fingerprint is not permitted by host policy for this operation")
    source_commit = record.get("sourceCommit")
    if policy["allowedSourceCommits"] and source_commit not in policy["allowedSourceCommits"]:
        raise ValueError("Release source commit is not approved in host policy")
    signer = module_from(SIGNER_PATH, "engram_release_signer")
    # Keep machine-readable resolve output strict JSON rather than interleaving
    # sub-verifier status lines on stdout. All verifier errors still propagate.
    with redirect_stdout(io.StringIO()):
        signer.verify(signer_args(bundle, attest, sig, Path(chosen["publicKeyPath"]), fingerprint, policy))
    return record


@contextmanager
def install_lock(root: Path):
    file = root / ".install.lock"
    try:
        fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as exc:
        raise ValueError("Installer already active or left a stale lock; inspect before manually clearing") from exc
    try:
        with os.fdopen(fd, "w") as stream:
            stream.write(str(os.getpid()) + "\n")
        yield
    finally:
        file.unlink(missing_ok=True)


def prepare_root(path: Path) -> Path:
    if path.is_symlink():
        raise ValueError("Install root cannot be a symlink")
    resolved = path.resolve()
    if resolved.is_relative_to(ROOT.resolve()):
        raise ValueError("Install root must be outside the source repository")
    resolved.mkdir(parents=True, exist_ok=True, mode=0o700)
    if resolved.is_symlink() or not resolved.is_dir():
        raise ValueError("Invalid install root")
    if os.name != "nt" and (stat.S_IMODE(resolved.stat().st_mode) & 0o002):
        raise ValueError("Install root must not be world-writable")
    releases = resolved / RELEASES_NAME
    if releases.is_symlink():
        raise ValueError("Release directory cannot be a symlink")
    releases.mkdir(exist_ok=True, mode=0o700)
    return resolved


def existing_root(path: Path) -> Path:
    """Open an existing installation without creating any paths on failure."""
    if path.is_symlink():
        raise ValueError("Install root cannot be a symlink")
    resolved = path.resolve()
    if not resolved.is_dir() or resolved.is_relative_to(ROOT.resolve()):
        raise ValueError("Existing installation root is missing or inside source repository")
    if os.name != "nt" and (stat.S_IMODE(resolved.stat().st_mode) & 0o002):
        raise ValueError("Install root must not be world-writable")
    release_root = resolved / RELEASES_NAME
    if release_root.is_symlink() or not release_root.is_dir():
        raise ValueError("Existing release directory is missing or symlinked")
    return resolved


def read_state(root: Path) -> dict:
    file = root / STATE_NAME
    if not file.exists() and not file.is_symlink():
        return {"format": STATE_FORMAT, "active": None, "previous": None}
    state = json_object(file)
    if set(state) != {"format", "active", "previous"} or state["format"] != STATE_FORMAT:
        raise ValueError("Installation state has unsupported format")
    if any(value is not None and not check_hex(value) for value in (state["active"], state["previous"])):
        raise ValueError("State references an invalid release identifier")
    return state


def atomic_state(root: Path, state: dict):
    descriptor, staging = tempfile.mkstemp(prefix=".state-", dir=root)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as out:
            json.dump(state, out, indent=2, sort_keys=True)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        os.chmod(staging, 0o600)
        os.replace(staging, root / STATE_NAME)
    finally:
        Path(staging).unlink(missing_ok=True)


def verify_content_tree(release: Path) -> None:
    archive = release / "bundle.zip"
    bundle = module_from(BUNDLE_PATH, "engram_bundle_verifier")
    with ZipFile(archive) as zipped:
        names = set(zipped.namelist())
        if not names or not all(name == bundle.LOCK or bundle.safe_relative(name) for name in names):
            raise ValueError("Invalid installed ZIP inventory")
        expected = names
    content = release / "content"
    found = set()
    for file in content.rglob("*"):
        if file.is_symlink():
            raise ValueError("Installed release contains a symlink")
        if file.is_file():
            found.add(file.relative_to(content).as_posix())
    if found != expected:
        raise ValueError("Installed release tree missing or contains extra files")
    with ZipFile(archive) as zipped:
        for name in expected:
            extracted = content.joinpath(*PurePosixPath(name).parts)
            with zipped.open(name) as source, extracted.open("rb") as target:
                digest_a, digest_b = hashlib.sha256(), hashlib.sha256()
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest_a.update(chunk)
                for chunk in iter(lambda: target.read(1024 * 1024), b""):
                    digest_b.update(chunk)
                if digest_a.digest() != digest_b.digest():
                    raise ValueError("Installed release file was modified: " + name)


def verify_installed_release(root: Path, release_id: str, policy: dict, *, allow_retired=False) -> dict:
    if not check_hex(release_id):
        raise ValueError("Invalid installed release identifier")
    release = root / RELEASES_NAME / release_id
    if not release.is_dir() or release.is_symlink():
        raise ValueError("Release is unavailable or is a symlink: " + release_id)
    bundle, attest, sig = (release / name for name in ("bundle.zip", "attestation.json", "attestation.sig"))
    if file_hash(bundle) != release_id:
        raise ValueError("Installed release ID disagrees with archive hash")
    record = validate_signed_release(bundle, attest, sig, policy, allow_retired=allow_retired)
    verify_content_tree(release)
    return record


def verify_active(root: Path, policy: dict) -> None:
    """Read-only preflight for a host before consuming the active skill tree."""
    current = read_state(root)["active"]
    if current is None:
        raise ValueError("No active release selected; refusing skill context loading")
    record = verify_installed_release(root, current, policy, allow_retired=True)
    print("VERIFIED ACTIVE " + current + " signed-source-commit=" + record["sourceCommit"])
    print("HOST RULE: verify content before using it; this does not grant tools or permissions")


def resolve_context(root: Path, policy: dict, chosen_skills: list[str]) -> None:
    """Return a verified engram and optional skill contents in one machine-readable record."""
    state = read_state(root)
    active = state["active"]
    if active is None:
        raise ValueError("No active signed skill release is selected")
    record = verify_installed_release(root, active, policy, allow_retired=True)
    content = root / RELEASES_NAME / active / "content"
    index_bytes = (content / "skills/index.json").read_bytes()
    engram_bytes = (content / "docs/blacklight/charles-personality-engram.json").read_bytes()
    if (hashlib.sha256(index_bytes).hexdigest() != record["registrySha256"]
        or hashlib.sha256(engram_bytes).hexdigest() != record["engramSha256"]):
        raise ValueError("Installed registry or engram changed during context resolution")
    index = json.loads(index_bytes)
    engram = json.loads(engram_bytes)
    verifier = module_from(BUNDLE_PATH, "engram_skill_resolution")
    verifier.validate_pair(index, engram_bytes, trusted_sha=record["engramSha256"])
    registered = {skill["name"]: skill for skill in index["skills"]}
    selected = []
    for name in dict.fromkeys(chosen_skills):
        if not isinstance(name, str) or re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) is None:
            raise ValueError("Requested skill name has invalid characters")
        entry = registered.get(name)
        if entry is None:
            raise ValueError("Requested skill is not in the verified registry: " + name)
        expected_path = "skills/" + name + "/SKILL.md"
        if entry.get("path") != expected_path:
            raise ValueError("Verified registry skill path is not canonical: " + name)
        path = content / expected_path
        if path.is_symlink() or not path.is_file():
            raise ValueError("Registered skill is not packaged in active release: " + name)
        raw = path.read_bytes()
        with ZipFile(root / RELEASES_NAME / active / "bundle.zip") as release_zip:
            if hashlib.sha256(raw).digest() != hashlib.sha256(release_zip.read(expected_path)).digest():
                raise ValueError("Requested installed skill changed after verified extraction: " + name)
        verifier.validate_skill(entry, raw)
        selected.append({
            "name": name, "skillText": raw.decode("utf-8"),
            "status": entry.get("status"), "capabilityIds": entry.get("capabilityIds", []),
            "resourceIds": entry.get("resourceIds", []),
        })
    print(json.dumps({
        "format": "hb-engram-host-context/1",
        "releaseId": active, "signedSourceCommit": record["sourceCommit"],
        "publisherFingerprint": record["keyFingerprintSha256"],
        "engramSha256": record["engramSha256"],
        "registrySha256": record["registrySha256"],
        "personality": engram,
        "skillRegistry": [
            {"name": item["name"], "status": item.get("status", "discoverable")}
            for item in index["skills"]
        ],
        "selectedSkills": selected,
        "rule": "The verified engram and registry are required; selected skills remain optional and grant no host tool permissions."
    }, ensure_ascii=False))


def activate(root: Path, release_id: str, policy: dict) -> None:
    record = verify_installed_release(root, release_id, policy)
    state = read_state(root)
    if state["active"] == release_id:
        print("ALREADY ACTIVE " + release_id)
        return
    atomic_state(root, {"format": STATE_FORMAT, "active": release_id, "previous": state["active"]})
    print("ACTIVATED " + release_id + " signed-source-commit=" + record["sourceCommit"])


def install(args):
    root_path = args.install_root.resolve()
    policy = verify_trust_policy(args.trust_policy, root_path)
    record = validate_signed_release(args.bundle, args.attestation, args.signature, policy)
    release_id = file_hash(args.bundle)
    with ZipFile(args.bundle) as archive:
        total_uncompressed = sum(item.file_size for item in archive.infolist())
    needed = args.bundle.stat().st_size + total_uncompressed + 4 * 1024 * 1024
    if args.dry_run:
        print("VERIFIED DRY RUN " + release_id + " files=" + str(record["sourceCommit"]))
        print("SPACE REQUIRED " + str(needed) + " bytes; no installation changes made")
        return
    root = prepare_root(args.install_root)
    if shutil.disk_usage(root).free < needed:
        raise ValueError("Not enough free disk space for verified bundle and staged extraction")
    with install_lock(root):
        target = root / RELEASES_NAME / release_id
        if target.exists() or target.is_symlink():
            verify_installed_release(root, release_id, policy)
            print("ALREADY INSTALLED " + release_id)
        else:
            staging = Path(tempfile.mkdtemp(prefix=".stage-", dir=root / RELEASES_NAME))
            try:
                (staging / "content").mkdir()
                shutil.copyfile(args.bundle, staging / "bundle.zip")
                shutil.copyfile(args.attestation, staging / "attestation.json")
                shutil.copyfile(args.signature, staging / "attestation.sig")
                # Reverify the *copied* ZIP before extraction: the download may
                # have been modified after the initial preflight (TOCTOU).
                validate_signed_release(staging / "bundle.zip", staging / "attestation.json",
                                        staging / "attestation.sig", policy)
                bundle_rules = module_from(BUNDLE_PATH, "engram_bundle_path_rules")
                with ZipFile(staging / "bundle.zip") as archive:
                    for item in archive.infolist():
                        path = item.filename
                        if not (path == "bundle-lock.json"
                                or bundle_rules.safe_relative(path)):
                            raise ValueError("Unsafe ZIP path during installation")
                        target_file = staging / "content"
                        for part in PurePosixPath(path).parts:
                            target_file = target_file / part
                        target_file.parent.mkdir(parents=True, exist_ok=True)
                        with archive.open(item) as source, target_file.open("xb") as out:
                            shutil.copyfileobj(source, out, length=1024 * 1024)
                verify_installed_stage(staging, release_id, policy)
                os.replace(staging, target)
                print("INSTALLED " + release_id + " (not active)")
            finally:
                if staging.exists():
                    shutil.rmtree(staging)
        if args.activate:
            activate(root, release_id, policy)


def verify_installed_stage(staging: Path, release_id: str, policy: dict):
    if file_hash(staging / "bundle.zip") != release_id:
        raise ValueError("Bundle changed while staging")
    validate_signed_release(staging / "bundle.zip", staging / "attestation.json",
                            staging / "attestation.sig", policy)
    verify_content_tree(staging)


def rollback(root: Path, policy: dict):
    state = read_state(root)
    previous = state["previous"]
    if not previous:
        raise ValueError("No previously activated release exists for rollback")
    # Rollback may return to a retired but not revoked publisher key.
    verify_installed_release(root, previous, policy, allow_retired=True)
    atomic_state(root, {"format": STATE_FORMAT, "active": previous, "previous": state["active"]})
    print("ROLLED BACK to verified release " + previous)


def init_trust(args):
    """Create an external host policy only when its public-key pin is already trusted."""
    if not args.trust_policy.is_absolute() or args.trust_policy.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Trust policy must be an absolute path outside the source repository")
    if args.install_root and args.trust_policy.resolve().is_relative_to(args.install_root.resolve()):
        raise ValueError("Trust policy cannot be stored beneath the installation tree")
    if args.trust_policy.exists() or args.trust_policy.is_symlink():
        raise ValueError("Trust policy already exists; refusing to overwrite host authority")
    public = args.public_key
    if not public.is_absolute() or public.is_symlink() or not public.is_file():
        raise ValueError("Public key must be an existing absolute, non-symlink file")
    if not check_hex(args.trusted_key_sha256):
        raise ValueError("Independently trusted key fingerprint must be lowercase SHA-256")
    signer = module_from(SIGNER_PATH, "engram_signer_fingerprint")
    openssl = shutil.which("openssl") or "openssl"
    actual = signer.sha256(signer.public_der(openssl, public))
    if actual != args.trusted_key_sha256:
        raise ValueError("Public key disagrees with externally trusted fingerprint")
    commits = args.allowed_source_commit
    if len(commits) != len(set(commits)) or any(re.fullmatch(r"[a-f0-9]{40}", x) is None for x in commits):
        raise ValueError("Source commit entries must be unique 40-character hashes")
    result = {
        "format": TRUST_FORMAT,
        "repository": OWNER,
        "publishers": [{
            "fingerprintSha256": actual,
            "publicKeyPath": str(public.resolve()),
            "status": "active",
        }],
        "revokedKeys": [],
        "revokedBundles": [],
        "allowedSourceCommits": commits,
    }
    args.trust_policy.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(args.trust_policy, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(result, out, indent=2)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
    except Exception:
        args.trust_policy.unlink(missing_ok=True)
        raise
    print("TRUST POLICY CREATED " + str(args.trust_policy))
    print("Publisher fingerprint independently matched " + actual)
    print("No private key, source checkout, or existing installation was modified")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    trust = sub.add_parser("init-trust", help="Create a host trust policy from an independently pinned public key")
    trust.add_argument("--public-key", type=Path, required=True)
    trust.add_argument("--trusted-key-sha256", required=True)
    trust.add_argument("--trust-policy", type=Path, required=True)
    trust.add_argument("--install-root", type=Path, help="Optional safety check against writing policy into install root")
    trust.add_argument("--allowed-source-commit", action="append", default=[], help="Explicitly allowed full commit hash")
    install_p = sub.add_parser("install", help="Verify and stage a signed bundle")
    install_p.add_argument("--bundle", type=Path, required=True)
    install_p.add_argument("--attestation", type=Path, required=True)
    install_p.add_argument("--signature", type=Path, required=True)
    install_p.add_argument("--trust-policy", type=Path, required=True)
    install_p.add_argument("--install-root", type=Path, required=True)
    install_p.add_argument("--activate", action="store_true")
    install_p.add_argument("--dry-run", action="store_true")
    for name in ("activate", "rollback", "verify-active", "resolve"):
        p = sub.add_parser(name, help="Switch to an already verified installed release")
        p.add_argument("--install-root", type=Path, required=True)
        p.add_argument("--trust-policy", type=Path, required=True)
        if name == "activate":
            p.add_argument("--release-id", required=True)
        if name == "resolve":
            p.add_argument("--skill", action="append", default=[],
                           help="Optional skill to load after verifying engram, registry and active bundle")
            p.add_argument("--list", action="store_true",
                           help="List the verified optional skill registry without selecting a skill")
    status = sub.add_parser("status", help="Read local active/previous release identifiers (not verification)")
    status.add_argument("--install-root", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.action == "init-trust":
            init_trust(args)
            return
        if args.action == "status":
            print(json.dumps(read_state(args.install_root), indent=2, sort_keys=True))
            return
        if args.action == "install":
            install(args)
            return
        root = existing_root(args.install_root)
        policy = verify_trust_policy(args.trust_policy, root)
        if args.action == "verify-active":
            verify_active(root, policy)
            return
        if args.action == "resolve":
            if not args.skill and not args.list:
                raise ValueError("Select --skill NAME or --list for verified skill discovery")
            resolve_context(root, policy, args.skill)
            return
        with install_lock(root):
            if args.action == "activate":
                activate(root, args.release_id, policy)
            else:
                rollback(root, policy)
    except (OSError, ValueError, KeyError, TypeError, subprocess.TimeoutExpired) as err:
        parser.exit(1, "FAIL CLOSED: " + str(err) + "\n")


if __name__ == "__main__":
    main()
