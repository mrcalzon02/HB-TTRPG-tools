# Engram-bound Agent Skills: host-owned trusted installation

**Status:** install/activate/rollback tooling implemented for manual operators. No production trust key, production signed release, automatic upgrade, or background daemon is provisioned.

The public skill registry and Charles engram are required **mutual companions** for supported skill activation. A signed bundle adds publisher provenance; it does not authorize tools, change host/system instructions, or force an untrusted external agent to obey public skill text.

## 1. Prepare an independent trust anchor

Only an operator can authorize a publisher key. Generate and secure the private key *outside the checkout* using the [signed releases guide](engram-signed-releases.md). Obtain the publisher's public-key fingerprint through an independent trusted channel. Never use the fingerprint supplied by an unverified ZIP/website as the trust anchor.

The following command writes a **new**, host-owned policy, only after matching the independent key fingerprint. It will not overwrite an existing policy and it never stores the private key:

```sh
python3 scripts/agent-skill-install.py init-trust \
  --public-key /secure/keys/publisher-public.pem \
  --trusted-key-sha256 <64-character-trusted-fingerprint> \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed
```

Optional repeated `--allowed-source-commit <full-40-character-sha>` arguments pin accepted commits at policy creation. With an empty list, any source commit authenticated by an active trusted publisher is eligible; add explicit commits for tighter release control.

Policy format:

```json
{
  "format": "hb-engram-host-trust/1",
  "repository": "mrcalzon02/HB-TTRPG-tools",
  "publishers": [
    {"fingerprintSha256": "<sha256-of-public-key-DER>", "publicKeyPath": "/secure/keys/publisher-public.pem", "status": "active"}
  ],
  "revokedKeys": [],
  "revokedBundles": [],
  "allowedSourceCommits": []
}
```

The trust policy must be an absolute regular file outside both the source checkout and installation tree. Do not copy it into a bundle, and do not treat an untrusted download of this JSON as authority. Only the host administrator may change `publishers`, revocation lists, or commit allowlists. On POSIX, the trust policy must not be group/world-writable and the installation root must not be world-writable; keys remain external to both checkout and installed packages.

## 2. Install without automatic activation

```sh
python3 scripts/agent-skill-install.py install \
  --bundle /downloads/skills-engram.zip \
  --attestation /downloads/skills-engram.attestation.json \
  --signature /downloads/skills-engram.attestation.sig \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed --dry-run

# Omit --dry-run to install after checking the verification and disk-space results.
```

The tool checks the trusted publisher, detached Ed25519 signature, revocation lists, source commit policy, exact ZIP hash and all embedded file hashes **before extraction**. It performs a storage-space preflight, creates an isolated temporary staging directory and atomically publishes under:

`<install-root>/releases/<64-character-ZIP-sha256>/`

The directory contains the signed ZIP, attestation, signature and extracted `content/` tree. An existing release is verified, not blindly overwritten. A failed signature, hash, policy, or extraction leaves the active release unchanged; temporary staging is removed where possible. Installation alone does **not** activate a release.

## 3. Explicit activation and rollback

```sh
python3 scripts/agent-skill-install.py status --install-root /secure/hb-skills/installed

# Required host/executor preflight before consuming active content:
python3 scripts/agent-skill-install.py verify-active \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed

python3 scripts/agent-skill-install.py activate \
  --release-id <64-character-bundle-sha256> \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed

python3 scripts/agent-skill-install.py rollback \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed
```

`state.json` holds `active` and `previous` release IDs; it is replaced atomically. Before switching to a release, the tool **reverifies its stored signed ZIP and all extracted content**, rather than trusting filenames or a previous successful check. `status` reports identifiers only; it does **not** claim current files have been reverified. `verify-active` is a **read-only required preflight** for a cooperating host before loading an installed skill tree. It rechecks signature, trusted key status, ZIP and extracted content, refusing unselected, tampered or revoked releases. `install --activate` is an explicit convenience option, not the default.

Rollback is deliberately a manual operation. A `retired` signing key may authorize rollback to an already installed signed release, but a `revoked` key or revoked archive **never** does. New installation or ordinary activation requires key status `active`. The source commit must remain allowlisted if `allowedSourceCommits` is nonempty.

A lock file prevents cooperating installers from running simultaneously. After a crash, a stale `.install.lock` may remain: inspect the process and state before manually clearing it. Do not make the installer silently steal locks, overwrite state, delete old releases, trust newly seen keys, or force-clean unknown files.

## 4. Host agent integration: resolve skill context after verification

A cooperating agent executor should **not** load a standalone `SKILL.md` directly from the installed tree. Use the host-resolved interface instead:

```sh
# Discover the registry, with no task skill selected.
python3 scripts/agent-skill-install.py resolve --list \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed

# Load the canonical engram plus only the selected registered task skill.
python3 scripts/agent-skill-install.py resolve --skill foundry-discovery \
  --trust-policy /secure/hb-skills/trust-policy.json \
  --install-root /secure/hb-skills/installed
```

Each call revalidates the host trust policy, signed archive, current extracted release and reciprocal registry/engram before emitting **one JSON result** with the engram, registered optional skill names, selected skill text, publisher fingerprint, source-commit claim and relevant digests. An unbundled or unregistered skill, malformed path, revoked signer, or modified file is rejected. `--list` returns discovery only; no tools are invoked.

This is an enforceable **integration gate for a cooperating host**, not remote control of arbitrary models. External executors must explicitly route skill loading through it (or an equivalently trusted implementation) and apply their own authorization checks before any machine access.

## 5. Run the local acceptance suite

```sh
python3 scripts/validate-engram-install.py
python3 scripts/validate-engram-release-signature.py
python3 scripts/validate-engram-bundle.py
node scripts/validate-engram-loader.mjs
python3 scripts/validate-agent-skill-projections.py
```

The install tests use disposable OpenSSL signing keys and temporary directories. They verify independent key bootstrap, dry-run no-write behavior, staged versus active releases, atomic activation, rollback, retired versus revoked publisher handling, altered installed content, altered ZIPs, failed trust checks and unchanged active state on denial.

**Important boundary:** A signed package proves the release was approved by a trusted signing key, not that the model's personality is immutably changed or that the runtime permits only sanctioned actions. A malicious host can ignore these tools; enforcement requires trusted integration with the host's tool/permission gate. Similarly, filesystem isolation and atomic state publication protect against ordinary failures; they are not a defense against another administrator with full access to the same files.

Future work: independently authorized release-channel/version sequencing, transparency log, signed key-rotation authority, host-side tool permission attestation and successful real runner evidence. None of those is silently advertised as complete.
