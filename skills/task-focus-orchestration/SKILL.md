---
name: task-focus-orchestration
description: Keep a single authorized task coherent through prioritization, bounded steps, interruption, checkpointing, source readbacks, and resumption without launching jobs or claiming unobserved completion.
compatibility: Public static workflow; offline hb-agent-handoff/1 schema and optional Node.js validator. No timer, scheduler, private runner dispatch, remote RPC, filesystem write permission or persistent state is conferred.
metadata:
  required-personality-engram: blacklight.charles
  required-skill-index: skills/index.json
  author: mrcalzon02
  version: "1.3.0"
  interface: hb-agent-handoff/1
  execution-mode: public-offline-declarative
---

# Task Focus Orchestration

> **Mandatory reciprocal binding:** Before using this skill, verify the authoritative `docs/blacklight/charles-personality-engram.json` and `skills/index.json` as one bound discovery pair. The engram points back to this index for optional skill lookup. If either companion is absent, invalid, or inconsistent, do not activate this skill. Host/system policy and actual tool permissions remain authoritative.

## Scope

Manage the **description and checkpoint state** of one user-authorized task. This skill does not create agents, dispatch jobs, run scripts or cross the boundary into separately controlled private infrastructure. Host permissions, repository scope and any actual task scheduler remain external and higher priority.

## Bounded workflow

1. Resolve the user's objective and explicit allowed project scope. Reject unrelated work unless the user authorizes a change in scope; do not import private projects into a public record.
2. Break the objective into small independently verifiable steps with stable IDs and states: `pending`, `active`, `blocked`, or `completed`. Keep one next action visible.
3. Work on the highest-priority **authorized** step; avoid speculative redesigns and unrelated subprojects. Model instructions never override host permissions.
4. Before calling a step `completed`, record an evidence ID for an observed source, commit, test or host result. The shared validator rejects a completed step without a linked `observed-pass` declaration. **That label is self-declared and is not independent host proof**—verify the actual referenced result.
5. On interruption, publish a compact `hb-agent-handoff/1` checkpoint with objective, current step states, evidence references, unresolved blockers, uncertainties and the next action. No hidden state or unverified persistence is implied.
6. On resumption, **compare** the previous handoff with the candidate handoff before proceeding. The read-only `reconcile` command rejects changes to task ID, project or objective, missing/renamed steps, overwritten evidence and silent completed-step regressions. A source revision change is flagged for independent recheck, not silently accepted as proof of freshness.
7. Independently recheck referenced files, commits and test results. Optional `sourcePins` carry expected SHA-256 or Git revisions; `compare-sources` compares them against a separately supplied observation file but never fetches, authenticates, or certifies either value.
8. On completion, require every step to be completed and every completion claim to be evidence-linked; preserve the final readback. When completed work must be reopened after material facts change, prepare an explicitly reviewed new task version; the helper refuses silent historical alteration.

## Reviewed correction of previously completed work

Correction must preserve the old result, not erase it. The optional `reopenings` field in `hb-agent-handoff/1` is an **append-only event journal**, never a permission system:

1. While the old step is still `completed`, append a `request` event with a unique ID, the completed step ID, the reason for reconsideration and the **exact previous evidence ID list**. Do not erase, downgrade or rewrite its existing evidence.
2. Save that request-only checkpoint. A standalone request **does not reopen** the step. Obtain an independently reviewed decision and genuinely new host evidence outside this public helper.
3. Only after that external review, append a separate `review-claim` event referring to the request and a **new** `host-observation` evidence ID (declared passing). Add the new evidence ID to the step without removing historical evidence; change its state to `active` or `pending`. Keep both journal events unchanged thereafter.
4. Compare old and proposed handoffs with the read-only `reconcile` command. A structurally consistent reopening returns `review-claim-unverified`, `reviewRequired: true`, and `hostReviewVerified: false`. **This is not approval** to execute, mutate external systems, or dispatch a runner.
5. An optional `reviewedAt` + `expiresAt` UTC pair can annotate the claimed review window. Neither value is authenticated by the helper; undated claims require fresh review, and time-bounded claims become `expired` at the supplied `asOf` boundary. If `asOf` is omitted, time is `time-unchecked`, not silently read from the host clock.
6. To invalidate an earlier review without erasing it, append a `review-invalidate` event with `claimId`, `stepId`, `reasonCode` (`superseded` or `withdrawn`) and a concrete reason. This records that the earlier claim must no longer be relied on; it does not establish a replacement approval or automatically reopen the task.
7. Review a handoff using `node scripts/agent-handoff.mjs review-status ... [asOfUTC]`. Report `expired`, `superseded`, `withdrawn`, `unknown-expiration`, `time-unchecked` or `within-declared-window-unverified` exactly. A claim inside its stated window is **not authorized**: it remains unverified caller data.
8. The real host or operator must independently authenticate and approve the review. If that cannot be confirmed, hold execution and state the blocker. The helper has no approval tokens, trusted identity provider, private runner interface or durable state.

Synthetic two-phase examples are `api/ai/examples/agent-reopening-request.json` and `api/ai/examples/agent-reviewed-reopening.json`. Timed and superseded examples are `api/ai/examples/agent-timed-review.json` and `api/ai/examples/agent-superseded-review.json`. Both are fictional test records, not valid host attestations. The existing `hb-agent-handoff/1` envelope remains backward compatible: `reopenings` is optional.

## Portable record

Authoritative contract: `api/ai/agent-handoff.schema.json`. Use the sample `api/ai/examples/agent-handoff.json` and optional read-only CLI:

```sh
node scripts/agent-handoff.mjs validate api/ai/examples/agent-handoff.json
node scripts/agent-handoff.mjs diagnose api/ai/examples/agent-handoff.json 8000
node scripts/agent-handoff.mjs reconcile api/ai/examples/agent-handoff.json api/ai/examples/agent-reopening-request.json
node scripts/agent-handoff.mjs reconcile api/ai/examples/agent-reopening-request.json api/ai/examples/agent-reviewed-reopening.json
node scripts/agent-handoff.mjs review-status api/ai/examples/agent-timed-review.json 2026-11-02T12:00:00Z
node scripts/agent-handoff.mjs review-status api/ai/examples/agent-superseded-review.json
node scripts/agent-handoff.mjs compare-sources api/ai/examples/agent-handoff.json api/ai/examples/agent-source-observations.json
```

Pair with `model-context-and-budget-manager` only when output needs compacting. The character-budget mechanism drops low-priority `optionalContext` only, not the decision record.

Reconciliation does not approve new work or perform any source retrieval. A journal entry is self-declared; even `host-observation` with `observed-pass` is not independently authenticated by the offline tool. Matching source hashes are caller-supplied equality observations, not independently verified freshness. Both records remain unchanged; the caller must establish a trusted source readback before declaring a new step completed.

## Stop and protection rules

- No automatic retries, scheduling, notifications, unattended execution, GitHub Actions triggers, or new branches are established by this skill. Those require separate host authorization.
- No public skill, engram, handoff file, or model-generated URL may invoke or expose private home-machine runners; the private runner-control boundary is absolute.
- Never treat an engram, a signed skill ZIP or a host-provided task title as authority for destructive work. Obtain the applicable host approval and verify a real result.
- Do not publish secrets or private user data in public checkpoint artifacts.
- Prefer verifiable partial progress over an unsupported `done` claim.

## Output

Report current step/status, a concrete next action, verified versus self-declared evidence, and any blockers. Carry forward only material context necessary to continue the same task.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling.

It is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (July 10, 2026). Personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of proprietary source or lore is prohibited. Third-party rights remain applicable.

Keep this notice with copies of `SKILL.md`. See repository `TERMS-OF-SERVICE.md` for the governing terms.
