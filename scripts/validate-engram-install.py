#!/usr/bin/env python3
"""Real OpenSSL, ZIP and atomic install/rollback checks with disposable signing keys."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "scripts" / "agent-skill-bundle.py"
SIGN = ROOT / "scripts" / "agent-skill-release-signature.py"
INSTALL = ROOT / "scripts" / "agent-skill-install.py"
PY = sys.executable


def call(*args, ok=True):
    proc = subprocess.run([str(s) for s in args], cwd=ROOT, text=True,
                          capture_output=True, check=False, timeout=60)
    if (proc.returncode == 0) != ok:
        raise AssertionError(
            "Unexpected command result: " + " ".join(str(x) for x in args[0:3])
            + "\nstdout:\n" + proc.stdout[-1200:] + "\nstderr:\n" + proc.stderr[-1500:])
    return proc


def fingerprint(public: Path) -> str:
    return call(PY, SIGN, "fingerprint", "--public-key", public).stdout.strip()


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def policy_file(path: Path, public: Path, commits, *, status="active", revoked_key=(), revoked_bundle=()):
    data = {
        "format": "hb-engram-host-trust/1",
        "repository": "mrcalzon02/HB-TTRPG-tools",
        "publishers": [{
            "fingerprintSha256": fingerprint(public),
            "publicKeyPath": str(public.resolve()),
            "status": status,
        }],
        "revokedKeys": list(revoked_key),
        "revokedBundles": list(revoked_bundle),
        "allowedSourceCommits": list(commits),
    }
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def state(root: Path):
    return json.loads(call(PY, INSTALL, "status", "--install-root", root).stdout)


def confirm_failure(label, args, root, expected):
    previous = state(root)
    call(*args, ok=False)
    assert state(root) == previous, label + " unexpectedly changed current/previous release"
    print("PASS [install] " + label + " failed closed without changing activation")


def main():
    openssl = shutil.which("openssl")
    if not openssl:
        raise SystemExit("OpenSSL required for actual Ed25519 installer tests")
    with TemporaryDirectory(prefix="hb-engram-installer-test-") as tmp:
        home = Path(tmp)
        priv, public = home / "private.pem", home / "public.pem"
        call(openssl, "genpkey", "-algorithm", "Ed25519", "-out", priv)
        call(openssl, "pkey", "-in", priv, "-pubout", "-out", public)
        root, trusted = home / "installed", home / "trusted-policy.json"
        a_commit, b_commit = "1" * 40, "2" * 40
        a = home / "foundry.zip"
        b = home / "fmpl.zip"
        call(PY, BUNDLE, "pack", "--skill", "foundry-discovery", "--output", a)
        call(PY, BUNDLE, "pack", "--skill", "fmpl-asset-production", "--output", b)
        for zipfile, commit, prefix in ((a, a_commit, "foundry"), (b, b_commit, "fmpl")):
            call(PY, SIGN, "sign", "--bundle", zipfile,
                 "--private-key", priv, "--public-key", public,
                 "--source-commit", commit, "--out-prefix", home / prefix)
        init_args = [PY, INSTALL, "init-trust", "--public-key", public,
                     "--trusted-key-sha256", fingerprint(public),
                     "--trust-policy", trusted, "--install-root", root,
                     "--allowed-source-commit", a_commit,
                     "--allowed-source-commit", b_commit]
        call(*init_args)
        assert trusted.is_file() and json.loads(trusted.read_text())["allowedSourceCommits"] == [a_commit, b_commit]
        call(*init_args, ok=False)
        invalid = home / "bad-policy.json"
        call(PY, INSTALL, "init-trust", "--public-key", public,
             "--trusted-key-sha256", "0" * 64, "--trust-policy", invalid,
             "--install-root", root, ok=False)
        assert not invalid.exists(), "Unknown public key was unexpectedly trusted"
        print("PASS [install] pinned trust bootstrap, no-clobber, forged pin denied")

        def installer_args(zipfile, prefix, *, active=False, dry_run=False):
            return [PY, INSTALL, "install", "--bundle", zipfile,
                    "--attestation", home / (prefix + ".attestation.json"),
                    "--signature", home / (prefix + ".attestation.sig"),
                    "--trust-policy", trusted, "--install-root", root] + (
                        ["--activate"] if active else []) + (["--dry-run"] if dry_run else [])

        assert not root.exists()
        call(*installer_args(a, "foundry", dry_run=True))
        assert not root.exists(), "Dry run unexpectedly created install directory"
        print("PASS [install] authenticated dry run has no filesystem writes")

        a_id, b_id = sha(a), sha(b)
        call(*installer_args(a, "foundry"))
        assert state(root)["active"] is None, "Staging silently activated a release"
        confirm_failure("verify-active with no selected release",
                        [PY, INSTALL, "verify-active", "--install-root", root,
                         "--trust-policy", trusted], root, "not active")
        print("PASS [install] staging never auto-activates a release")
        call(PY, INSTALL, "activate", "--release-id", a_id, "--install-root", root,
             "--trust-policy", trusted)
        assert state(root) == {"format": "hb-engram-install-state/1",
                               "active": a_id, "previous": None}
        resolved = json.loads(call(
            PY, INSTALL, "resolve", "--skill", "foundry-discovery",
            "--install-root", root, "--trust-policy", trusted).stdout)
        assert resolved["personality"]["engram_id"] == "blacklight.charles"
        assert resolved["selectedSkills"][0]["name"] == "foundry-discovery"
        assert len(resolved["skillRegistry"]) == 49
        assert "required-personality-engram: blacklight.charles" in resolved["selectedSkills"][0]["skillText"]
        listed = json.loads(call(PY, INSTALL, "resolve", "--list",
                                 "--install-root", root, "--trust-policy", trusted).stdout)
        assert listed["selectedSkills"] == [] and len(listed["skillRegistry"]) == 49
        confirm_failure("resolve a registered skill not included in active archive",
                        [PY, INSTALL, "resolve", "--skill", "fmpl-asset-production",
                         "--install-root", root, "--trust-policy", trusted], root, "unpackaged skill")
        confirm_failure("resolve path traversal skill",
                        [PY, INSTALL, "resolve", "--skill", "../rogue",
                         "--install-root", root, "--trust-policy", trusted], root, "traversal")
        print("PASS [install] supported host resolve returns bound engram and only selected skills")
        confirm_failure("rollback without a prior release",
                        [PY, INSTALL, "rollback", "--install-root", root, "--trust-policy", trusted],
                        root, "previous")

        call(*installer_args(b, "fmpl", active=True))
        assert state(root)["active"] == b_id and state(root)["previous"] == a_id
        verify_active_args = [PY, INSTALL, "verify-active", "--install-root", root,
                              "--trust-policy", trusted]
        call(*verify_active_args)
        print("PASS [install] second verified release activated atomically, retained previous")
        b_content = root / "releases" / b_id / "content" / "skills/fmpl-asset-production/SKILL.md"
        b_original = b_content.read_bytes()
        b_content.write_bytes(b_original + b"\\nLOCAL TAMPER\\n")
        confirm_failure("active release content changed after activation",
                        verify_active_args, root, "tampered active content")
        confirm_failure("resolve changed active skill after activation",
                        [PY, INSTALL, "resolve", "--skill", "fmpl-asset-production",
                         "--install-root", root, "--trust-policy", trusted],
                        root, "modified selected skill")
        b_content.write_bytes(b_original)
        call(*verify_active_args)
        selected = json.loads(call(PY, INSTALL, "resolve", "--skill", "fmpl-asset-production",
                                  "--install-root", root, "--trust-policy", trusted).stdout)
        assert selected["selectedSkills"][0]["name"] == "fmpl-asset-production"
        policy_file(trusted, public, [a_commit, b_commit],
                    revoked_key=[fingerprint(public)])
        confirm_failure("active release publisher key revoked",
                        verify_active_args, root, "revoked active key")
        confirm_failure("resolve blocked by revoked key",
                        [PY, INSTALL, "resolve", "--skill", "fmpl-asset-production",
                         "--install-root", root, "--trust-policy", trusted],
                        root, "revoked resolved context")
        policy_file(trusted, public, [a_commit, b_commit])
        call(*verify_active_args)
        print("PASS [install] verify-active refuses altered content and revoked keys")

        # Local corruption is detected before activating an installed release.
        p = root / "releases" / a_id / "content" / "skills/foundry-discovery/SKILL.md"
        original = p.read_bytes()
        p.write_bytes(original + b"\nCORRUPTED\n")
        confirm_failure("modified installed content",
                        [PY, INSTALL, "activate", "--release-id", a_id,
                         "--install-root", root, "--trust-policy", trusted],
                        root, "hashes")
        p.write_bytes(original)

        # Retired signatures remain valid for explicit rollback, not new activation.
        policy_file(trusted, public, [a_commit, b_commit], status="retired")
        confirm_failure("normal activation with retired publisher key",
                        [PY, INSTALL, "activate", "--release-id", a_id,
                         "--install-root", root, "--trust-policy", trusted],
                        root, "retired")
        call(PY, INSTALL, "rollback", "--install-root", root, "--trust-policy", trusted)
        assert state(root)["active"] == a_id and state(root)["previous"] == b_id
        call(*verify_active_args)
        print("PASS [install] explicit rollback and startup verification with retired, nonrevoked key")

        policy_file(trusted, public, [a_commit, b_commit], status="active",
                    revoked_key=[fingerprint(public)])
        confirm_failure("rollback with revoked publisher",
                        [PY, INSTALL, "rollback", "--install-root", root, "--trust-policy", trusted],
                        root, "revocation")

        policy_file(trusted, public, [a_commit, b_commit], revoked_bundle=[b_id])
        confirm_failure("rollback with revoked archive",
                        [PY, INSTALL, "rollback", "--install-root", root, "--trust-policy", trusted],
                        root, "revocation")

        policy_file(trusted, public, [a_commit])
        confirm_failure("rollback with source commit no longer allowlisted",
                        [PY, INSTALL, "rollback", "--install-root", root, "--trust-policy", trusted],
                        root, "commit policy")

        policy_file(trusted, public, [a_commit, b_commit])
        call(PY, INSTALL, "rollback", "--install-root", root, "--trust-policy", trusted)
        assert state(root)["active"] == b_id and state(root)["previous"] == a_id
        print("PASS [install] repeated rollback toggles verified release pointers")

        if __import__("os").name != "nt":
            trusted.chmod(0o666)
            confirm_failure("group/world-writable host policy",
                            [PY, INSTALL, "activate", "--release-id", a_id,
                             "--install-root", root, "--trust-policy", trusted],
                            root, "unsafe host policy")
            trusted.chmod(0o600)
            root.chmod(0o777)
            confirm_failure("world-writable install root",
                            [PY, INSTALL, "activate", "--release-id", a_id,
                             "--install-root", root, "--trust-policy", trusted],
                            root, "unsafe install root")
            root.chmod(0o700)

        # Tampering with the original signed ZIP fails before any install-root writes.
        attacked = home / "modified.zip"
        attacked.write_bytes(a.read_bytes() + b" ")
        confirm_failure("modified ZIP",
                        installer_args(attacked, "foundry", active=True),
                        root, "signed archive")
        assert sorted(x.name for x in (root / "releases").iterdir()) == sorted([a_id, b_id])
        print("PASS [install] no unexpected release or staging debris after failure")
    print("[install] signed, host-policy-controlled installation checks passed; temporary keypair destroyed")


if __name__ == "__main__":
    main()
