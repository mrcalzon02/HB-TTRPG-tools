# Micro-Qwen Hierarchical Fusion — Project Record

**Established:** 2026-10-27  
**Status:** Repository research record; concept and experiment design only. No prototype or benchmark results yet.  
**Purpose:** A living source-of-truth document for the user's plans, propositions, and proposed programming layout.  
**Scope:** Research and develop one independently controlled, locally operated assistant whose capabilities can be improved through a hierarchical network of continuously active small pretrained language models. GPT-6-equivalent capability is a long-term aspiration, *not* an achieved or presently demonstrated result.

## 1. Decisions and constraints already established

1. **One project, two requirements:** Aim for the strongest practical assistant capabilities and full local operational control in the *same* system. They should not be treated as two unrelated projects.
2. **The actual prototype/deployment target is `old-core30`.** This designated machine has an Intel Core i7-10700, 32 GB system RAM, and an NVIDIA GTX 1660 SUPER with 6 GB VRAM (from the user-provided machine photograph). The RTX 5070 desktop is *not* the target operating environment; it may be used only as optional auxiliary development hardware. Earlier assessment also ruled out an obsolete-machine inference swarm.
3. **Core proposed architecture: hierarchical fusion of micro-models.** Two small pretrained Qwen models (A and B) operate in parallel. A third, continuously active model (C), receives a learned fusion of their computed representations. A completed fusion node may feed a subsequent stage.
4. **Terminology:** Call this **fusion**, not conventional knowledge distillation. Models A and B remain available and run as part of the inference graph; they do not merely teach a student and disappear.
5. **Signal path under investigation:** Prefer exploring *internal hidden-state / vector representation exchange* through learned adapters over plain-text chaining. This is a hypothesis and proposed design, not a validated solution.
6. **GitHub Actions boundary:** Use Actions for repository development, validation, short tests and reproducible bounded experiments. Do **not** build a continuous inference service, sustained training platform, or runner-restarting compute chain atop GitHub-hosted temporary runners. Run substantial GPU benchmarks/training locally or with appropriate paid infrastructure.
7. **Scientific standard:** The system must show repeatable improvements against cost-matched baselines before any claims of net capability gains. More small models do not inherently equal one larger or more capable model.
8. **Optimization order: completion and correctness before speed.** The user explicitly prefers slow, capable, thorough operation to rapid but incomplete answers. A complex job consuming an hour must yield finished work or a substantive, verifiable partial deliverable—not merely a promise to begin thinking.
9. **Continuous participation, not required simultaneous GPU residency.** A/B/C must remain part of each fusion inference graph, but on `old-core30` they may execute sequentially with checkpoint loading/offloading, bounded activation transfers, and caching as supported by testing. This does not permit a one-time teacher–student distillation or pretending the entire graph fits in 6 GB.

## 1a. Deployment hardware and acceptance constraints (user-set, 2026-10-27)

**Designated target:** `old-core30`, Intel Core i7-10700, 32 GB RAM, GeForce GTX 1660 SUPER 6 GB VRAM. Treat these as the user-supplied hardware description; no live inventory, CUDA/PyTorch compatibility check, or measured memory profile has yet been run. Do not silently re-target the RTX 5070.

**Runtime priority:** correctness > useful task completion > factual and artifact verification > repeatability > latency. A long answer is not intrinsically better: the program should *do the requested work*, record evidence, and report the resulting artifact or concrete limitation.

**Memory-first implementation proposition:** start with tiny frozen pretrained checkpoints, low batch sizes, limited sequence and fusion-token lengths, optional low-bit quantization where supported, sequential A/B encoding and C generation, GPU/CPU offloading as needed, and bounded KV caches. Copy intermediate A/B tensors to a controlled CPU buffer when necessary, rather than assuming three complete unquantized models plus activations reside simultaneously in 6 GB. This design is unverified until a measured GPU smoke test; 32 GB system RAM does not make CPU-offloaded inference fast.

**Fusion fidelity:** A and B must compute from the live input for each relevant request. Their learned fusion representations must reach C and influence its output; absence of contribution must be detectable by ablation. Scheduling model stages sequentially is allowed, whereas replacing the intended fused graph with mere prompt-chaining or static distillation silently is not.

## 2. First experiment: 2 → 1 fusion cell

### Intended information flow

```text
                       Shared task input
                         /          \
                        v            v
                Qwen micro-model A  Qwen micro-model B
                 (active encoder)    (active encoder)
                        |                 |
                Hidden-state A      Hidden-state B
                        \                 /
                         \               /
                     [trainable projections]
                                |
                    [fusion / attention module]
                                |
                       Conditional vectors
                                |
                      Qwen micro-model C
                    (active response generator)
                                |
                           Response
```

**Starting candidates:** Three compact Qwen checkpoints, such as Qwen3 0.6B if compatibility and local memory tests allow. Exact checkpoints, licenses, tokenization settings, and versions are **not yet frozen**.

### Minimal engineering formulation (proposed)

- A and B process only the prompt or separately assigned prompt views, **never the reference answer**.
- Extract selected hidden states from A and B in inference/training-forward mode; first freeze their pretrained weights.
- Use trainable attention-pooling or resampling to convert each sequence into a fixed number `K` of latent vectors; separately project into model C's embedding dimension. An optional gating/cross-attention block combines these vectors.
- Inject the fused representation into C as **learned prefix embeddings** (a comparatively simple first implementation using `inputs_embeds` and a carefully constructed causal attention/label mask). A cross-attention modification of C is a later, more invasive option.
- C receives the same original user prompt plus the fused prefix and generates the answer. For training, compute next-token loss on target-answer tokens only, excluding input/prefix/prompt positions.
- Initially train only the resampler, projections, and fusion adapter. If a completely frozen C cannot learn to use injected vectors effectively, explicitly evaluate a **small LoRA adapter on C** as a separate configuration; preserve the distinction in results.
- Ensure A/B's computations remain in the run-time graph rather than collapsing them into a one-time offline teacher-student distillation.

### Explicit open questions

- Should A and B use identical checkpoint weights with different views, or complementary small model variants/tasks?
- At which layer(s) should hidden states be captured? How many vectors per source (`K`)?
- How should the graph handle autoregressive generation and KV caching without recomputing A and B for every output token?
- How much adapter/LoRA training is necessary before C learns to exploit the prefix?
- Should future hierarchy nodes propagate vector signals, text, or a hybrid of both?
- Does a nested architecture improve quality after controlling for inference compute, memory, context length, and training examples?

## 3. Proposed repository / programming layout

*Proposed implementation layout, not yet implemented. This planning record is housed in the existing HB-TTRPG-tools repository; no experimental code is claimed.*

```text
micro-qwen-fusion/
├── README.md                         # goals, limitations, reproduction steps
├── LICENSE                           # selected after checking dependencies/checkpoints
├── pyproject.toml                    # pinned Python dependencies and CLI entry points
├── configs/
│   ├── fusion_2to1.yaml              # models A, B, C; pooling, dimensions, precision
│   ├── baselines.yaml                # A-only, B-only, C-only, same-budget comparators
│   ├── old_core30.yaml               # target 6 GB GPU / 32 GB RAM; serial/offload limits
│   └── local_5070_optional.yaml      # optional auxiliary development system; not target
├── docs/
│   ├── project_record.md             # this evolving master record
│   ├── architecture.md               # interfaces, tensor shapes, caching, masks
│   ├── decisions.md                  # timestamped accepted/rejected/undecided decisions
│   ├── risks_and_policy.md           # GPU limits, GitHub Actions acceptable-use boundary
│   └── experiments/
│       └── EXP-001-two-to-one.md     # preregistered comparison + test results
├── src/fusion/
│   ├── models.py                     # model loading, checkpoint compatibility
│   ├── encoders.py                   # A/B prompt views and hidden-state capture
│   ├── resampler.py                  # hidden-state pooling to K vectors
│   ├── adapters.py                   # trainable dimension projections
│   ├── merger.py                     # gating / attention-based signal fusion
│   ├── generator.py                  # C conditioning, attention mask, output decoding
│   ├── graph.py                      # future composable multi-stage routing
│   ├── train.py                      # bounded adapter training loop
│   ├── evaluate.py                   # common benchmark harness and output schema
│   └── cli.py                        # explicit train/evaluate/smoke commands
├── tests/
│   ├── test_tensor_shapes.py         # CPU-only synthetic tensor interface tests
│   ├── test_causal_masking.py        # leakage / alignment tests
│   ├── test_generation.py            # decoding + prefix correctness tests
│   └── test_reproducibility.py       # deterministic/config validation checks
├── scripts/
│   └── local_gpu_smoke.sh            # owned-GPU quick functional check
├── results/                           # reports only; no copyrighted model weights
└── .github/workflows/
    └── ci.yml                        # bounded lint/unit/CPU smoke tests, timeouts
```

### Interfaces to stabilize first (design sketch)

```python
# Illustrative API contracts, NOT implemented code.
encode_a(prompt_batch) -> HiddenStatesA  # [batch, tokens_a, width_a]
encode_b(prompt_batch) -> HiddenStatesB  # [batch, tokens_b, width_b]
resample_a(hidden_a) -> LatentsA          # [batch, K, width_fusion]
resample_b(hidden_b) -> LatentsB          # [batch, K, width_fusion]
fuse(latents_a, latents_b) -> PrefixC      # [batch, K_fused, width_c]
generate_c(prompt_batch, prefix_c) -> tokens
```

**Implementation warning:** Hugging Face `inputs_embeds` and different model-generation APIs require explicit tests for prefix positioning, attention masks, caching, and loss-label masking. Hidden states are not interchangeable just because all checkpoints are from one family.

## 4. Evaluation plan and decision gates

**Primary hypothesis:** With a fixed training budget and a cost-aware evaluation, the 2→1 fusion cell will improve selected task accuracy over running C alone.

**Required control groups:**

1. C alone with the same prompt and decoding configuration.
2. A or B alone, as applicable.
3. Three-model pipeline combining *text outputs*, to distinguish vector fusion from orchestration alone.
4. A/B duplicated or identical-input runs, to detect redundant representations.
5. A larger single model or another configuration operating at **comparable measured inference FLOPs / latency / GPU memory**, where practical.
6. Ablation: learned fusion versus zeroed/shuffled/random-source vectors to test whether C truly uses the information.

**Record for every experiment:** exact checkpoint revisions and licenses; seeds; hardware and precision; total parameters loaded and trainable; peak VRAM; CPU RAM; prompt and generated token counts; prefill and decode latency; training data split; task accuracy; failure examples; and costs. Record both raw and compute-normalized scores. Never report new reasoning capability from anecdotal output alone.

**First milestones:**

- **M0 — specifications:** fix model checkpoint hashes/licenses; design dataset and baselines; specify VRAM budget.
- **M1 — CPU interface tests:** tensor shapes, causal masking, synthetic adapters; no full checkpoint download required in CI.
- **M2 — local GPU proof:** A/B hidden-state extraction; vector fusion; C conditioned response on the owned GPU; instrument memory and caching.
- **M3 — bounded training:** train fusion connections, compare frozen-C and C-with-LoRA configurations.
- **M4 — benchmark/ablation:** publish reproducible results and make explicit go/no-go decision on hierarchical scaling.
- **M5 — second layer, only if justified:** compose fusion cells and measure whether gains survive additional depth/cost.

## 4a. Completion-first operating contract (user requirement)

For work requests, the resulting assistant must distinguish **thinking about work** from **performing and verifying work**. A slow run is acceptable; a long wait ending in "I'll think about how to do that" is not.

1. Define the requested deliverable, success checks, and permitted actions before lengthy processing.
2. Break complex work into durable stages: retrieve inputs, plan, execute, inspect outputs, verify against acceptance checks, and package final results.
3. At each stage, produce a checkpoint or other recoverable evidence when possible. If a later stage fails or time/resources run out, return the latest meaningful artifact or substantial partial result with explicit known limitations; do not return a progress-only message.
4. Give final responses concrete results (files, diffs, decisions backed by evidence, test receipts, or well-scoped analyses), clearly labeled as verified, unverified, or blocked.
5. Never fabricate tool execution, test passes, commits, or autonomous background processing. Persistent jobs require a genuine local scheduler/service and observed completion receipts.
6. Evaluate both quality and **task completion rate** across realistic coding, file management, research, and multi-step workflows. Measure completed deliverables, correctness tests, failure recovery, and quality per unit compute; tokens generated, elapsed time, and pleasant conversation do not count as success.

**Initial acceptance test:** Give the system a bounded multi-step programming task. Allow a slow run, then require a working artifact and test report, or a usable partial implementation with reproducible failure evidence. An answer that merely promises to begin fails.

## 5. Infrastructure and GitHub operating rules

- GitHub Actions: normal development tasks only; short, finite CI runs with explicit `timeout-minutes`, concurrency control, model download/caching limits, and artifact retention limits. Start with synthetic CPU tests to avoid routine heavyweight inference on hosted runners.
- Never loop/retrigger jobs solely to extend compute beyond runner job limits, create an always-on inference service, or claim GPU availability on standard hosted runners.
- `old-core30` is the owned deployment and test baseline: i7-10700, 32 GB RAM, GTX 1660 SUPER 6 GB VRAM. Measure real peak GPU and host RAM, CPU offload, model reload time, accuracy and run completion before freezing quantization or model count. The RTX 5070, when available, is only an optional auxiliary benchmark platform.
- External compute: pay for dedicated resources if experiments outgrow owned hardware, without implying that GitHub is a free GPU cluster.
- No claim of GPT-6 functional equivalence or new emergent intelligence without a predefined benchmark and independent replication.
- Do not alter an existing GitHub repository, create a new repository, push, commit, or claim any tests ran without doing and verifying those actions.

## 6. Decision log

| Date | Topic | Decision / proposition | Status |
|---|---|---|---|
| 2026-10-27 | Project goal | Comparable strong assistant capability **and** local ownership within one project | User-directed goal |
| 2026-10-27 | Old hardware | Do not plan around obsolete-machine inference swarms | Prior practical assessment |
| 2026-10-27 | Architecture | Hierarchical 2→1 micro-Qwen fusion; original models remain active | User-directed architecture |
| 2026-10-27 | Terminology | Use “fusion,” not teacher-student “distillation” | Agreed terminology |
| 2026-10-27 | Signal integration | First investigate hidden-state/vector fusion using trainable adapters | Proposed experiment, unproven |
| 2026-10-27 | First implementation | Frozen A/B/C initially; optionally compare LoRA on C | Proposed, not yet selected |
| 2026-10-27 | CI policy | Bounded repository development/testing in GitHub Actions; ongoing inference elsewhere | Agreed working constraint |
| 2026-10-27 | Repository | Store this record in `mrcalzon02/HB-TTRPG-tools` under Machine / AI Access documentation | User-selected destination |
| 2026-10-27 | Target hardware | Target `old-core30`: i7-10700; 32 GB RAM; GTX 1660 SUPER 6 GB VRAM. RTX 5070 is not the target. | User-selected environment; unbenchmarked |
| 2026-10-27 | Runtime priority | Prefer slower, more capable, more thorough performance; quality/completion ahead of latency | User-selected requirement |
| 2026-10-27 | Long-task acceptance | An hour of work should yield finished or substantially verifiable partial work, never only an intention to think | User-selected requirement |
| 2026-10-27 | Scheduling | Explore serial/offloaded live A/B/C processing on constrained GPU while keeping all three functionally in graph | Proposed, needs measured feasibility |

## 7. Next actionable work

Specify initial checkpoint revisions and licenses, then profile tiny-model memory feasibility on `old-core30` (6 GB VRAM/32 GB RAM) before freezing an inference schedule. Design lightweight CPU tensor-interface tests, then implement a locally measured 2→1 proof of concept and its completion-first multi-step task acceptance test. Maintain and version this project record under `docs/ai-access/micro-qwen-fusion/` as decisions and experiments progress. No inference engine or training code has yet been implemented.

---
*Record version 0.2, target and completion requirements (2026-10-27). This document records the plan only; it is not evidence of implemented software, trained models, benchmark performance, or completed execution tests.*