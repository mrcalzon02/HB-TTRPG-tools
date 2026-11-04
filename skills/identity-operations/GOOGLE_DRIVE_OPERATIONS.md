# Digital Identity Stewardship — Google Drive Storage Adapter

**Revision:** DIS-DRIVE-2026-11-04-R1
**Backend:** connected Google Drive / native Google Sheets
**Authority:** [Durable operating plan](OPERATING_PLAN.md)
**Status:** Working register structures created and access checked; full encrypted evidence vault remains **NOT READY**.

## Security boundaries (three distinct storage classes)

| Class | Permitted data | Destination | Rule |
| --- | --- | --- | --- |
| PUBLIC | Empty templates, skill logic, sanitized aggregate counts, *explicitly approved* professional content | Public GitHub and site | No personal case records, household/phone/address, exact broker listings, screenshots or secrets |
| OWNER-ONLY WORKFLOW | Opaque IDs, stages, deadlines, generalized exposure class, approved public URLs, human-action references without private evidence | Owner-only Google Drive native Sheets | Verify folder/file sharing; **not client-side end-to-end encryption**. Never assume permission metadata remains unchanged. |
| HIGH-RISK EVIDENCE | Source URLs with identifiers, copies of listings, home/contact/household details, ID evidence, email confirmations and correspondence | Client-side encrypted files in a separately defined vault; cloud sync optional only of ciphertext | **Do not ingest or upload until encryption, key management, backup/restore and retention rules are documented and tested.** |

Drive encrypts data in transit and at rest under its normal service model; this is not the same as independently controlled client-side encryption. An owner-only folder does not make a native Sheet an E2EE vault. A folder's private label is not a technical permission boundary. Never put encryption keys in Drive with their encrypted evidence, in GitHub or in automation logs.

## Actual folder layout created 2026-11-04 (no private IDs published)

Root: `Digital Identity Stewardship — PRIVATE`, owned in Google Drive, with the following direct children:

- `00 — Governance and Approval`: `Identity Stewardship — Approval Register` — native Sheet tabs `START HERE`, `Approvals`, `Scope Gates`, `Summary`.
- `01 — Private Exposure Cases (Sensitive)`: `Identity Stewardship — Privacy Case Register` — `START HERE`, `Cases`, `Summary`.
- `02 — Removal Requests and Verification (Sensitive)`: reserved, no plain sensitive submissions saved.
- `03 — Professional Presence and Drafts`: `Identity Stewardship — Professional Asset Register` — `START HERE`, `Assets`, `Summary`.
- `04 — Sanitized Progress Reports`: reserved for summaries that have passed the disclosure review.

At initial creation and register readback, Drive reported `shared=false` and only an owner permission for the root, folders and registers. This is a point-in-time access observation, not a continuing guarantee or an encryption claim. Check permissions again before each upload or share.

## Native Sheet contracts

### Approval Register — Approvals
Required columns:
`Approval ID`, `Lane`, `Opaque Case or Asset ID`, `Proposed Action`, `Destination Hostname`, `Disclosure Classes`, `Requested At`, `Review State`, `Decision At`, `Execution State`, `Executed At`, `Observed Result`, `Verified At`, `Next Review`, `Operator Note (No PII)`, `Record Version`.

`Review State` is PENDING / APPROVED / REJECTED / WITHDRAWN. `Execution State` is a separate field. **A stored APPROVED value alone is not authority to submit**: the subject must review exact real destination, disclosed fields and request/publishing content in an authorized human interaction before each external action. Store full confidential request and signatures only in the encrypted tier.

### Approval Register — Scope Gates
Ten controls start `NOT SET`, with states `NOT SET`, `IN REVIEW`, `APPROVED`, `BLOCKED`. Prior to private case intake, confirm subject authorization, selector categories, professional preserve list, exposure categories, communication channel, jurisdiction, encryption and key recovery, retention/revocation, per-action approvals, and baseline test.

### Privacy Register — Cases
Fields: opaque case ID, observed date, safe hostname, source class, privacy/mixed/professional/false-positive classification, matching confidence, generalized exposure category, P0–P3 priority, case state, generic official opt-out homepage if safe, approval reference, request date, due date, separate source/search outcomes, next action and private-free notes. No sensitive full listing URL, identities or case screenshots in the Sheet.

`Cases` starts empty. Summary uses formulas on case ID, confidence, stage and verification columns. **P0/high-risk means more human attention, not more plaintext logging.**

### Professional Register — Assets
Fields: public asset ID, approved public creator handle and URL, channel, type, ownership confidence, project, stage, privacy review, editorial approval, proposed changes, live verification and indexing states. Only intentionally public links belong here.

The register started with six *already-public* inventoried assets: GitHub creator profile, Home Brew Tabletop GitHub repository, associated GitHub Pages home, Patreon creator page, CurseForge author projects and Agent Skills page. **All are INVENTORIED; no new publication or profile edit is implied.** Verified repository control and third-party account-control verification are different.

## Execution protocol for each session

1. Read this file, latest GitHub issue #21 and the current two SKILL.md files; preserve the separate P and B lanes.
2. In Google Drive, ground the correct workbook by saved ID in a **private host configuration**, recheck the parent folder and permission metadata, then read exact tab metadata. Never place private IDs in a public issue.
3. Read bounded rows and live validation constraints before writing. Use opaque IDs and never insert personal case selectors in native Sheets.
4. Check `Scope Gates`. If encryption is `NOT SET`, pause capture of high-risk evidence, screenshots, full listing URLs, identity documents, email or broker response contents.
5. Stage one actionable row at a time, with review status and a private reference. Human authorization is required for each external submission/publication; separate it from research and drafting.
6. Execute only with tools that are actually available. Do not assume ordinary web search can operate CAPTCHA, fill forms, login or confirm email.
7. Verify provider outcome and status independently; record the observed state, timestamps and the next check. No speculative "removed" or "published" statuses.
8. Report only aggregate counts and approved public facts to GitHub issue #21. Never include identifying file/folder IDs, case links or confirmation contents in that public thread.

## Failure response and security tests

- Any public GitHub/Drive permission leak, unexpected `anyone`/`domain` sharing, or mistaken subject classification: stop private intake and report an incident without repeating the sensitive data.
- Import failures: document the attempted route and use authorized native Sheet tools; verify that a failed import created no untracked duplicate.
- No encrypted-vault deployment is authorized merely because a user chose Google Drive. Confirm the chosen client-side cryptosystem, owner-controlled keys, offline recovery, device security, access logging and restore test first.
- A successful native Sheet creation is not proof that separate Google Pages/GitHub Pages, external broker processes or public professional channels were changed.
- Review external links and API behavior at execution time; avoid hardcoded reliance on current site navigation.

## Backlog and maturity

- [x] Owner-only Google Drive folder tree created.
- [x] Three native, operational registers authored and read back.
- [x] Permissions read back as owner only, no sharing, at setup time.
- [x] Six public professional assets inventoried (no publication).
- [ ] Subject authorization and selection scope recorded privately.
- [ ] Client-side encryption and key recovery test completed.
- [ ] First supervised privacy match and opt-out request approval.
- [ ] First approved professional copy revision and live readback.
- [ ] Source-/search-layer follow-up verification.
- [ ] Multi-client segregation, retention and incident response review.

**Do not interpret a checked box as proof of a broker removal, public profile publication or protected encrypted evidence.**
