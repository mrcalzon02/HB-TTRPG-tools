#!/usr/bin/env python3
"""Local real-crypto integration tests for signed Agent Skill ZIP releases.

No network, no permanent signing keys, no production artifacts. Real OpenSSL
Ed25519, real skill packager/ZIP verifier, and a temporary private key.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
BUNDLER = ROOT / "scripts/agent-skill-bundle.py"
SIGNER = ROOT / "scripts/agent-skill-release-signature.py"
PYTHON = sys.executable


def command(*args, good=True) -> subprocess.CompletedProcess[str]:
    call = subprocess.run([str(x) for x in args], cwd=ROOT, capture_output=True,
                          text=True, timeout=45, check=False)
    if (call.returncode == 0) != good:
        raise AssertionError(f"Incorrect command status ({call.returncode}): {call.stderr[:350]}")
    return call


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main() -> None:
    openssl = shutil.which("openssl")
    if not openssl:
        raise SystemExit("FAIL [engram-signature] OpenSSL is required for security tests")
    if not BUNDLER.is_file() or not SIGNER.is_file():
        raise SystemExit("FAIL [engram-signature] required production signing tools missing")
    with TemporaryDirectory(prefix="hb-agent-skill-signature-") as directory:
        root = Path(directory)
        private = root / "private.pem"
        public = root / "public.pem"
        command(openssl, "genpkey", "-algorithm", "Ed25519", "-out", private)
        command(openssl, "pkey", "-in", private, "-pubout", "-out", public)
        fingerprint = command(PYTHON, SIGNER, "fingerprint", "--public-key", public).stdout.strip()
        assert len(fingerprint) == 64
        bundle = root / "foundry.zip"
        command(PYTHON, BUNDLER, "pack", "--skill", "foundry-discovery", "--output", bundle)
        commit = "0123456789abcdef" * 2 + "01234567"
        prefix = root / "signed-foundry"
        sign_args = (PYTHON, SIGNER, "sign", "--bundle", bundle,
                     "--private-key", private, "--public-key", public,
                     "--source-commit", commit, "--out-prefix", prefix)
        command(*sign_args)
        attest = Path(str(prefix) + ".attestation.json")
        signature = Path(str(prefix) + ".attestation.sig")
        assert len(signature.read_bytes()) == 64
        args = (PYTHON, SIGNER, "verify", "--bundle", bundle, "--public-key", public,
                "--attestation", attest, "--signature", signature,
                "--trusted-key-sha256", fingerprint, "--expected-source-commit", commit)
        command(*args)
        print("PASS [engram-signature] signed verified ZIP + Ed25519 + independent key/commit pins")

        def rejects(reason: str, *changes: str) -> None:
            command(*args, *changes, good=False)
            print("PASS [engram-signature] rejected " + reason)

        rejects("wrong commit pin", "--expected-source-commit", "0" * 40)
        rejects("revoked signing key", "--revoked-key", fingerprint)
        rejects("revoked archive", "--revoked-bundle", sha(bundle.read_bytes()))
        command(*(args[:-4] + ("--trusted-key-sha256", "0" * 64)), good=False)
        print("PASS [engram-signature] rejected untrusted publisher key")
        command(*sign_args, good=False)
        print("PASS [engram-signature] rejected output overwrite")
        orig_sig = signature.read_bytes()
        signature.write_bytes(b"\x00" * 64)
        command(*args, good=False)
        signature.write_bytes(orig_sig)
        print("PASS [engram-signature] rejected forged Ed25519 signature")
        orig_att = attest.read_bytes()
        attest.write_bytes(orig_att + b" ")
        command(*args, good=False)
        attest.write_bytes(orig_att)
        print("PASS [engram-signature] rejected modified attestation")
        orig_bundle = bundle.read_bytes()
        bundle.write_bytes(orig_bundle + b" ")
        command(*args, good=False)
        bundle.write_bytes(orig_bundle)
        print("PASS [engram-signature] rejected modified archive")
        other = root / "other-private.pem"
        command(openssl, "genpkey", "-algorithm", "Ed25519", "-out", other)
        command(PYTHON, SIGNER, "sign", "--bundle", bundle, "--private-key", other,
                "--public-key", public, "--source-commit", commit,
                "--out-prefix", root / "wrong-key", good=False)
        print("PASS [engram-signature] rejected mismatched public/private keys")
        command(PYTHON, SIGNER, "sign", "--bundle", bundle, "--private-key", private,
                "--public-key", public, "--source-commit", "invalid",
                "--out-prefix", root / "wrong-commit", good=False)
        print("PASS [engram-signature] rejected invalid source commit")
        command(*args)
        print("PASS [engram-signature] original signed release remains verifiable")
    print("[engram-signature] offline signing tests passed; ephemeral keys destroyed")


if __name__ == "__main__":
    main()
