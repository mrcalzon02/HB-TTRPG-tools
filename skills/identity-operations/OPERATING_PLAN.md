# Digital Identity Stewardship — Durable Progressive Service Plan

**Owner:** Home Brew Tabletop / mrcalzon02. **Revision:** DIS-2026-11-04-R1. **Status:** PHASE 0 OWNER-ONLY GOOGLE DRIVE WORKFLOW ACTIVE (registers created and six already-public professional assets inventoried); private case intake, opt-out submissions and external publication remain unstarted. Client-side evidence encryption is not yet configured. **Scope:** one authorized subject first; a reusable multi-client service only after verified consent, security and operational controls.

## Mission

Job P protects private life: discover, confirm, triage and suppress unwanted personal details at data brokers, people search engines and eligible search result listings.

Job B promotes an approved professional creator identity and portfolio: website, code projects, original games, software, writing, releases and owned social/professional channels.

**Conflict rule:** Never feed private identity selectors or case evidence into promotional copy or SEO metadata. Never remove a legitimate owned professional page solely because it shares a name with a broker record. A page combining private and public content is **MIXED**, requiring a field-level redaction plan and owner review.

For the verified native Google Sheets storage layout and security caveats, see [Google Drive Storage Adapter](GOOGLE_DRIVE_OPERATIONS.md). **Google Drive's standard owner-only access is not independently controlled client-side encryption.**

## Non-negotiable safeguards

1. **Authority:** Record informed consent for subject, search scope, stored identifiers, jurisdictions, operations, destinations, reviewer and expiry/revocation. No research about unrelated people or relatives as independent targets.
2. **Trust:** A coincident name, age or region is not proof. Set confidence and require human match adjudication. False positives are excluded, not contacted.
3. **Data minimization:** Copy only what is required to establish and remove exposure. Avoid collecting more personal data just to improve hit counts. Do not transmit extra identifiers to a data broker merely because a form offers fields.
4. **Storage:** Public repository contains methods and empty templates only. Full source URLs, private screenshots, signatures, verification codes, emails, requests, and evidence live in a separate encrypted vault with access control, logging, retention and deletion policy; use opaque subject/case IDs.
5. **Execution:** Navigate only permitted official forms, respect rate limits and site terms. No CAPTCHA bypass, impersonation, mass unsolicited contact, identity fabrication, paid sign-up without approval, or asserting rights without checking eligibility.
6. **Approvals:** One specific subject approval per third-party opt-out submission and per external publication; show exact destination, fields/content and new personal data being disclosed. Browsing/drafting is not permission to submit.
7. **Truthful outcomes:** Separate discovery, draft, submitted, pending, source removed, search delisted, denied, unverified and relisted. A successful POST or a hidden snippet is not proof of deletion.
8. **Rights:** Confirm copyright, ownership and accurate current project status before publishing any professional claim; no fake profiles, testimonials, partner claims, ranking claims or link farms.
9. **Privacy by design:** Never put broker case data in GitHub issues, PRs, actions artifacts, skill packages, public pages, chat-facing broad summaries or structured metadata.
10. **Failure behavior:** Stop an unsafe operation, preserve private diagnostic record, report the block without revealing sensitive information; retry only within approved bounded limits.

## Work phases and gates

| Phase | Privacy P | Brand B | Acceptance / exit criteria |
| --- | --- | --- | --- |
| 0: Authorize & isolate | Define subject, categories, lawful basis, vault, recovery, retention, opt-out contact | Approve public brand/aliases, owned profiles, publishing rights and forbidden fields | Scope and security design approved; never start live case storage without vault |
| 1: Baseline | Discover candidate data brokers/directories and relevant search results; note date and official URL privately | Inventory and verify ownership of website, repositories, profiles, portfolio, releases and stories | Dated baseline, each item has source, evidence and confidence |
| 2: Classify | Check actual identity match, false positives, private/mixed/professional; assign risk | Separate canonical/duplicate/stale/unclear material | No action on unverified or mixed content without owner review |
| 3: Prepare | Verify official opt-out link; document minimal required fields, timing and possible personal info re-disclosure | Draft biographies, project pages, release cards, metadata, navigation, structured data only if warranted | Exact changes and destinations queued for approval |
| 4: Authorize & execute | Request site-specific approval, submit through supported browser/email workflow, record response privately | Approve destination and contents; publish controlled changes | Explicit approval record + observed submission/publication response |
| 5: Verify at source | Reopen original page after appropriate delay; distinguish removed/suppressed/denied/not accessible | Live page and links readback; inspect accessibility, canonical URLs, metadata | No claim of completion without source evidence |
| 6: Search layer | Separate eligible Google/Bing search delisting and snippet refresh from source deletion | Sitemap/crawl/indexing checks, measure impressions if access is authorized | Source state and indexing state recorded separately |
| 7: Maintain | Recheck roughly 7/30/90/180 days or as site policy dictates; capture re-listing | Refresh after releases and monthly; monitor broken links & stale descriptions | Dated audit with deltas and assigned next actions |
| 8: Scale service | Reusable intake, consent, subject partitioning, incident process, escalation and portability | Reusable publishing checklists and release-based cadence | Successful isolated pilot first; security/legal review before multi-tenant use |

Two lanes may progress in parallel after Phase 0 but share **only approved public identifiers and sanitized progress**.

## Job P — exposure investigation and removal

### Risk and matching
P0: imminent risk, ID exposures or address with threats (human-directed urgent escalation); P1: current residential/household/personal contact data; P2: historical or lower-exposure records; P3: weak matches or low-consequence remnants. Priority and verification are separate; high-risk errors require closer review, not more data copying.

Source categories: data broker, people directory, cached index snippet, social/account field, user-controlled page, third-party content, government/public record (may have limited removal rights). Never assume a government record is broker content.

### Case lifecycle
discovered → unverified → matched → classified → drafted → approved → submitted → pending → removed / suppressed / denied / no-match / blocked.

A verified reappearance produces reappeared → drafted. A false positive or unauthorized result is closed without contacting the website. Each transition needs private timestamp, actor, destination, permission identifier, private evidence pointer and next review date. Claim verified removal only after independent readback and/or authoritative confirmation. Preserve source removal and search delisting as separate booleans, not one status.

### Submission review packet
Opaque case ID; hostname; matched confidence; categories (not full contents in public); risk; official opt-out page and required fields; minimal planned disclosure; expected response; exact request text; approval state; planned verification. Full URLs and proof remain PRIVATE. Never submit ID copies without a second explicit approval. Verification emails/CAPTCHAs are human steps.

### Source vs search removal
Opting out at a broker may delete a listing but cached copies or third-party aggregators may remain. Search-engine removals only affect applicable search results. Review current search-provider policies. Never claim universal erasure.

### Jurisdiction
Confirm applicable law and resident eligibility per case; do not assume California residency. California DROP is for eligible verified California residents only, even though its broker requirements apply starting in 2026. Broker voluntary programs can be available more broadly. Current official guidance must be rechecked at execution.

## Job B — approved professional distribution

1. Establish a single official home URL, consistent authorized creator/brand name, approved aliases, and optional **dedicated professional-only** contact.
2. Inventory owned sources and project lifecycle; distinguish current games/software/stories from inactive, historical or third-party work.
3. Improve high-value existing sources first: homepage and About, project index, each active project's accurate status/features/links, developer pages, release history and high-quality media.
4. Apply technical discovery work: meaningful title/description, canonical URL, accessible navigation, valid sitemap, relevant JSON-LD where supported, and reciprocal links between approved owned profiles.
5. Privacy-gate every change: exclude home address, household, personal contact, personal identifiers, residential location and private case terms.
6. Owner reviews exact public wording and destination. Publish only with credentials/permissions actually available; verify live deployed result and link health.
7. If authorized, use search console/analytics to check crawl, indexing and query impressions. Do not equate a git commit with publication or a site launch with ranking success.
8. Sustain with release notes, changelogs, project milestones and relevant channels, not spam or fabricated publicity.

Professional lifecycle: inventoried → draft → privacy-reviewed → approved → published → live-verified → indexed-confirmed (only if observed) → refresh-needed / archived.

## Operational ledger and service topology

PUBLIC: versioned instructions, blank templates, schema and objective validation tests, intentionally approved promotional content, **aggregated** status and no identity-bearing cases.

PRIVATE: encrypted per-subject profile, legal/authority evidence, sensitive matching terms, full source URLs, screenshots, messages, opt-out and publication approvals, sent details, confirmation tokens, outcome timestamps, correspondence, reappearance and incident logs. Retention/revocation procedures required before real processing.

Operator queue fields: task ID, lane P/B, priority, anonymized case/asset ID, step, owner, approval needed, due date, blocker, next check, verification status. Keep all sensitive parts in private storage. Public status exports should contain counts only; avoid small-group or named details that reidentify the subject.

Operational preflight for every session: target + authorization; exact planned scope; source validity; match reliability; private-storage boundary; least-disclosure option; action approval; reversibility; test currency; readback method. Close with INTENT → EXECUTED → OBSERVED → VERIFIED → CLAIMED, keeping unknown as unknown.

## Metrics and scheduling

Privacy: candidates, verified, submitted-with-consent, confirmed removed at source, index suppressed, denied, pending, relisted, median time from submission to verification. Do not score probable removals as confirmed.

Professional: approved/public pages, independently verified live URLs, broken links, verifiable indexed pages and search impressions if authorized. No invented SEO rankings.

At pilot launch: weekly queue review, monthly low-impact discovery/portfolio review and quarterly deep audit, adjustable to site-specific due dates and owner capacity. Automated checks are optional, scoped and rate-limited; no unattended form submission. Do not create recurring tasks without approval.

## Scaling checkpoints

- **v0.1:** This documentation and blank skill/templates only. No vault, live case inventory, actual submissions or publications.
- **v0.2:** Choose and test encrypted vault, complete subject consent, run small supervised baseline, authorize first actions, verify initial results.
- **v0.3:** Improve repeatability: site-specific playbooks, reappearance handling, failure retries, review packet generator, sanitized reporting.
- **v0.4:** Multi-subject simulation with isolated keys, RBAC, backups, data export/deletion, audit trail, incident response, revocation and retention review.
- **v1.0:** Production readiness only after access/privacy/security review, verified tool capabilities, rights/jurisdiction review and documented manual approval process. Not conferred by registered skills.

## Official resources — verify current versions before acting

- https://consumer.ftc.gov/ — US consumer guidance
- https://support.google.com/websearch/answer/9673730 — Google private-info results removal
- https://privacy.ca.gov/drop/ — California residency-limited DROP
- https://developers.google.com/search/docs/appearance/structured-data/organization — legitimate organization search markup

These sources are references, not promises of eligibility, service availability, automatic removal, or particular search ranking.
