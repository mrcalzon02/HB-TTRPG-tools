#!/usr/bin/env python3
"""Detached, offline Ed25519 attestation for engram-bound Agent Skill ZIPs.

The public key is NOT trusted just because it is shipped with a ZIP. Verifiers
must obtain a public-key SHA-256 fingerprint independently. Private keys never
belong in this repository. Requires OpenSSL 3.x on the local host.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "hb-engram-skill-release/1"
OWNER = "mrcalzon02/HB-TTRPG-tools"
HEX64 = re.compile(r"[a-f0-9]{64}\Z")
COMMIT40 = re.compile(r"[a-f0-9]{40}\Z")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run_openssl(openssl: str, *args: str) -> bytes:
    proc = subprocess.run([openssl, *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          check=False, timeout=30)
    if proc.returncode:
        # Do not echo private key material, environment variables, or arbitrary external output.
        raise ValueError(f"OpenSSL operation {args[0]} failed (exit {proc.returncode})")
    return proc.stdout


def public_der(openssl: str, pem: Path) -> bytes:
    return run_openssl(openssl, "pkey", "-pubin", "-in", str(pem), "-pubout", "-outform", "DER")


def private_public_der(openssl: str, private: Path) -> bytes:
    return run_openssl(openssl, "pkey", "-in", str(private), "-pubout", "-outform", "DER")


def read_bundle_pins(bundle: Path) -> dict[str, str]:
    try:
        with ZipFile(bundle) as archive:
            lock = json.loads(archive.read("bundle-lock.json"))
            registry_raw = archive.read("skills/index.json")
            engram_raw = archive.read("docs/blacklight/charles-personality-engram.json")
        registry = json.loads(registry_raw)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ValueError("Could not inspect required engram-bound bundle files") from exc
    if (lock.get("bundleFormat") != "hb-engram-bound-skill-bundle/1"
        or lock.get("engramSha256") != sha256(engram_raw)
        or registry.get("defaultPersonality", {}).get("integrity", {}).get("digest") != sha256(engram_raw)):
        raise ValueError("Archive does not contain a coherent canonical engram binding")
    return {"bundleSha256": sha256(bundle.read_bytes()),
            "registrySha256": sha256(registry_raw),
            "engramSha256": sha256(engram_raw)}


def check_package(bundle: Path, pins: dict[str, str]) -> None:
    path = ROOT / "scripts" / "agent-skill-bundle.py"
    if not path.is_file():
        raise ValueError("Canonical skill bundle verifier not available")
    spec = importlib.util.spec_from_file_location("hb_bundle_verifier", path)
    if spec is None or spec.loader is None:
        raise ValueError("Cannot load canonical skill bundle verifier")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.verify(bundle, pins["engramSha256"],
                  trusted_registry_sha=pins["registrySha256"],
                  trusted_bundle_sha=pins["bundleSha256"])


def ensure_parent_new(path: Path) -> None:
    if path.exists() or path.is_symlink():
        raise ValueError(f"Refusing to overwrite existing output: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)


def sign(args: argparse.Namespace) -> None:
    if not COMMIT40.fullmatch(args.source_commit):
        raise ValueError("--source-commit must be a full 40-digit Git commit SHA")
    if args.private_key.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Refusing to sign using a private key stored inside the repository checkout")
    pins = read_bundle_pins(args.bundle)
    check_package(args.bundle, pins)
    key_id = sha256(public_der(args.openssl, args.public_key))
    if private_public_der(args.openssl, args.private_key) != public_der(args.openssl, args.public_key):
        raise ValueError("Private key and expected public key do not match")
    attestation = {
        "format": SCHEMA,
        "repository": OWNER,
        "sourceCommit": args.source_commit,
        "keyFingerprintSha256": key_id,
        **pins,
    }
    raw = (json.dumps(attestation, sort_keys=True, indent=2) + "\n").encode("utf-8")
    att_file = Path(str(args.out_prefix) + ".attestation.json")
    sig_file = Path(str(args.out_prefix) + ".attestation.sig")
    ensure_parent_new(att_file)
    ensure_parent_new(sig_file)
    # Detached signatures bind canonical attestation bytes, not a model prompt.
    try:
        att_file.write_bytes(raw)
        run_openssl(args.openssl, "pkeyutl", "-sign", "-rawin", "-inkey", str(args.private_key),
                    "-in", str(att_file), "-out", str(sig_file))
        if len(sig_file.read_bytes()) != 64:
            raise ValueError("Invalid Ed25519 signature length")
    except Exception:
        att_file.unlink(missing_ok=True)
        sig_file.unlink(missing_ok=True)
        raise
    print(f"SIGNED {args.bundle} fingerprint={key_id} bundle_sha256={pins['bundleSha256']}")
    print(f"ATTESTATION {att_file} SIGNATURE {sig_file}")


def verify(args: argparse.Namespace) -> None:
    if not HEX64.fullmatch(args.trusted_key_sha256):
        raise ValueError("--trusted-key-sha256 must be a 64-character lowercase SHA-256 fingerprint")
    key_id = sha256(public_der(args.openssl, args.public_key))
    if key_id != args.trusted_key_sha256:
        raise ValueError("Publisher public key does not match independently trusted fingerprint")
    if key_id in args.revoked_key or sha256(args.bundle.read_bytes()) in args.revoked_bundle:
        raise ValueError("Publisher key or exact bundle digest has been revoked by host policy")
    for block in [*args.revoked_key, *args.revoked_bundle]:
        if not HEX64.fullmatch(block):
            raise ValueError("Revocation entries must be lowercase SHA-256 digests")
    if args.attestation.stat().st_size > 16 * 1024:
        raise ValueError("Attestation exceeds 16 KiB limit")
    raw = args.attestation.read_bytes()
    try:
        att = json.loads(raw)
    except ValueError as exc:
        raise ValueError("Attestation is invalid JSON") from exc
    if not isinstance(att, dict) or set(att) != {
        "format", "repository", "sourceCommit", "keyFingerprintSha256",
        "bundleSha256", "registrySha256", "engramSha256"
    }:
        raise ValueError("Attestation fields missing or unexpected")
    canonical = (json.dumps(att, sort_keys=True, indent=2) + "\n").encode("utf-8")
    if raw != canonical:
        raise ValueError("Attestation must use the canonical signed JSON encoding")
    if (att["format"] != SCHEMA or att["repository"] != OWNER
        or att["keyFingerprintSha256"] != key_id
        or not isinstance(att["sourceCommit"], str)
        or not COMMIT40.fullmatch(att["sourceCommit"])):
        raise ValueError("Attestation identity or Git reference is invalid")
    if args.expected_source_commit is not None and att["sourceCommit"] != args.expected_source_commit:
        raise ValueError("Signed source commit differs from independently expected commit")
    if len(args.signature.read_bytes()) != 64:
        raise ValueError("Ed25519 signature must contain exactly 64 bytes")
    run_openssl(args.openssl, "pkeyutl", "-verify", "-rawin", "-pubin", "-inkey",
                str(args.public_key), "-sigfile", str(args.signature), "-in", str(args.attestation))
    pins = read_bundle_pins(args.bundle)
    for field, expected in pins.items():
        if att[field] != expected:
            raise ValueError(f"Signed {field} differs from the supplied bundle")
    check_package(args.bundle, pins)
    print(f"VERIFIED SIGNATURE fingerprint={key_id} source_commit={att['sourceCommit']}")
    print(f"VERIFIED ARCHIVE sha256={pins['bundleSha256']} engram_sha256={pins['engramSha256']}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--openssl", default=shutil.which("openssl") or "openssl")
    sub = parser.add_subparsers(dest="command", required=True)
    finger = sub.add_parser("fingerprint", help="Compute a SHA-256 pin for a trusted publisher public key")
    finger.add_argument("--public-key", type=Path, required=True)
    sign_p = sub.add_parser("sign", help="Sign an existing validated bundle, never overwriting files")
    sign_p.add_argument("--bundle", type=Path, required=True)
    sign_p.add_argument("--private-key", type=Path, required=True)
    sign_p.add_argument("--public-key", type=Path, required=True)
    sign_p.add_argument("--source-commit", required=True)
    sign_p.add_argument("--out-prefix", type=Path, required=True)
    verify_p = sub.add_parser("verify", help="Verify detached signature, trusted publisher identity, and all archive hashes")
    verify_p.add_argument("--bundle", type=Path, required=True)
    verify_p.add_argument("--attestation", type=Path, required=True)
    verify_p.add_argument("--signature", type=Path, required=True)
    verify_p.add_argument("--public-key", type=Path, required=True)
    verify_p.add_argument("--trusted-key-sha256", required=True)
    verify_p.add_argument("--expected-source-commit", help="Optional externally pinned full Git commit SHA")
    verify_p.add_argument("--revoked-key", action="append", default=[], help="Independent deny-list fingerprint")
    verify_p.add_argument("--revoked-bundle", action="append", default=[], help="Independent deny-list archive SHA-256")
    args = parser.parse_args()
    try:
        if args.command == "fingerprint":
            print(sha256(public_der(args.openssl, args.public_key)))
        elif args.command == "sign":
            sign(args)
        else:
            verify(args)
    except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, f"FAIL CLOSED: {exc}\n")


if __name__ == "__main__":
    main()
