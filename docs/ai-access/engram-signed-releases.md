# Signed engram-bound Agent Skill releases (Ed25519)

**Status:** publisher tooling and negative tests implemented; **no production publisher key or signed release has been created**. This is an optional distribution/verification layer, not a personality override or a source of new tool privileges.

The original `scripts/agent-skill-bundle.py` packages the canonical engram, `skills/index.json`, selected Agent Skills and a SHA-256 inventory. Its hashes establish internal consistency only. `scripts/agent-skill-release-signature.py` adds a *detached Ed25519 signature* over a canonical JSON attestation containing:

- Repository identifier `mrcalzon02/HB-TTRPG-tools` and a full source-commit SHA, supplied by the publisher.
- SHA-256 of the **exact ZIP archive**, embedded engram and embedded registry.
- SHA-256 fingerprint of the **DER SubjectPublicKeyInfo** representation of the publisher's public key.
- The versioned `hb-engram-skill-release/1` format.

Signing calls the canonical ZIP verifier **before** signing. Verification checks an independently pinned public key, optional deny lists, the detached signature, optional expected commit, all archive hashes and the canonical package validator **before** the signed package is considered usable. Signing and verification require local OpenSSL (3.x recommended); no network, API keys, GitHub Actions secrets or third-party Python library is required.

## Publisher: prepare keys outside the repository

```sh
# Run inside a secure, user-controlled directory OUTSIDE the repository.
umask 077
openssl genpkey -algorithm Ed25519 -out ./publisher-private.pem
openssl pkey -in ./publisher-private.pem -pubout -out ./publisher-public.pem

# From the HB-TTRPG-tools working checkout:
python3 scripts/agent-skill-release-signature.py fingerprint --public-key /secure/location/publisher-public.pem
```

Protect the private key and backup. **Never commit or upload it**, place it inside a skill directory or store it in a workflow artifact. The signing tool refuses to use a private key located within this repository checkout. The public key may be distributed, but receivers must pin its fingerprint from a separately trusted channel. This code does not generate or manage production keys.

## Publisher: package and sign

```sh
python3 scripts/agent-skill-bundle.py pack --all --output dist/skills-engram.zip
python3 scripts/agent-skill-release-signature.py sign \
  --bundle dist/skills-engram.zip \
  --private-key /secure/location/publisher-private.pem \
  --public-key /secure/location/publisher-public.pem \
  --source-commit "$(git rev-parse HEAD)" \
  --out-prefix dist/skills-engram
```

The outputs are `skills-engram.zip`, `skills-engram.attestation.json`, and `skills-engram.attestation.sig`. Public key distribution is separate. The signing tool refuses to overwrite existing attestation/signature files, and the packager refuses to overwrite an existing ZIP. For a new revision, choose new output names.

**Important provenance limit:** `sourceCommit` is a statement signed by the publisher. Signing it does not independently prove that every ZIP file came from that Git commit. A consumer that needs a commit-level guarantee should pin the expected commit and independently reconcile source files with the commit (or rely on a separately verified source build attestation).

## Recipient: verify before accepting

```sh
python3 scripts/agent-skill-release-signature.py verify \
  --bundle skills-engram.zip \
  --attestation skills-engram.attestation.json \
  --signature skills-engram.attestation.sig \
  --public-key trusted-publisher-public.pem \
  --trusted-key-sha256 <fingerprint-from-independent-trusted-source> \
  --expected-source-commit <independently-expected-40-character-commit>
```

On any mismatch, fail closed. Do **not** copy a supposed trusted fingerprint directly from the same untrusted archive or the same unverified download page. External-model agents and hosts must still apply their own permission controls; a verified ZIP cannot compel an untrusted model to obey instructions.

For an independently trusted revocation policy, add repeated `--revoked-key <fingerprint>` and/or `--revoked-bundle <archive-sha256>` flags. These are host-owned deny lists; there is not yet an authenticated online revocation service. During **key rotation**, generate a new key *outside* the repository, distribute its fingerprint through the trusted channel, add it to the host's allowed fingerprints, then sign subsequent releases using that key. Remove or explicitly revoke obsolete/compromised key fingerprints. No client automatically trusts a newly distributed public key.

## Offline developer tests

```sh
node scripts/validate-agent-skills.mjs
node scripts/validate-engram-loader.mjs
python3 scripts/validate-agent-skill-projections.py
python3 scripts/validate-engram-bundle.py
python3 scripts/validate-engram-release-signature.py
```

The signing regression generates a disposable Ed25519 keypair in a temporary directory, packages the actual `foundry-discovery` skill and exercises successful signature verification plus rejection of forged signatures, corrupted ZIPs, altered attestations, revoked keys and bundles, untrusted fingerprints, mismatched keypairs, wrong source commits and overwrites. The test removes the temporary keys. It does not create a trusted production signing identity or publish a release.

The existing `pages.yml` workflow includes these checks in its **manual** full-validation path. No new workflows, automatic triggers, or unconditional release/promote steps are introduced.

## Portable-skill limits

Only the canonical, mutually required engram and index are mandatory in conforming loader contexts. Individual skills remain optional and selected on demand. A verified personality or skill bundle cannot grant filesystem access, network access, privileges, arbitrary tool execution, credentials or authority over host policy. Public skill source cannot be made literally impossible for a hostile external executor to copy or disregard.
