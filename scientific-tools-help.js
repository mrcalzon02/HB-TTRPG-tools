(function installScientificToolsHelp(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ScientificToolsHelp = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createScientificToolsHelp(root) {
  'use strict';

  const VERSION = '0.1.0';
  const GUIDE_CLASS = 'sth-tool-guide';
  let tooltipCounter = 0;
  let observer = null;
  let scanQueued = false;

  const TOOL_GUIDES = Object.freeze({
    'shadowrun-binary-cube-lab': Object.freeze({
      title: 'Binary Cube Encryption Laboratory',
      category: 'Cryptography · canonical encoder/decryptor',
      summary: 'Creates, imports, validates, encrypts, and decrypts canonical Binary Cube material. The laboratory is the operational interface above the authoritative Binary Cube engine: the UI does not define a second cipher. Keys specify cube size, three axis permutations, payload mask, input/output faces, rotations, deterministic padding behavior, and identity metadata.',
      workflow: Object.freeze([
        'Choose or generate a key and preserve its seed/configuration if reproducibility matters.',
        'Load plaintext as text, bytes, or binary data and inspect the payload capacity before encrypting.',
        'Encrypt to a canonical package or secure transport form; preserve the package metadata with the ciphertext.',
        'Use the supplied-key decrypt path as a correctness control before attempting cryptanalysis.',
        'Use the visualizer, Cryptanalytic Test Lab, or Cubic Decryptor when studying structure or resistance to attack.'
      ]),
      outputs: Object.freeze([
        ['Key identity', 'Legacy FNV keyId plus the stronger SHA-256 digest of canonical key material when available.'],
        ['Payload capacity', 'How many plaintext bits each cube block carries after the mask is applied.'],
        ['Ciphertext package', 'Ciphertext plus the geometry/framing metadata needed for deterministic interpretation.'],
        ['Round-trip result', 'Exact decrypt/encrypt agreement is an implementation check, not evidence that the construction is secure.']
      ]),
      boundary: 'The Binary Cube is explicitly experimental research/obfuscation technology. Correct round trips, large key spaces, or visually complex output do not establish modern cryptographic security.'
    }),
    'shadowrun-binary-cube-visualizer': Object.freeze({
      title: 'Binary Cube Encoder Visualizer',
      category: 'Cryptography · transformation visualizer',
      summary: 'Displays the actual canonical cube traversal rather than an illustrative substitute. Playback follows source framing, payload-mask placement, input-face staging, keyed point assignment, three-dimensional point occupancy, output-face projection, and encrypted block emission.',
      workflow: Object.freeze([
        'Select the key/grid and source material you want to inspect.',
        'Choose exact, sampled, or aggregate rendering according to cube size.',
        'Play the trace at a useful scope: selected bit, row, block, all blocks, or overview.',
        'Use face/rotation controls to see how projection geometry changes the emitted ordering.',
        'Compare the visual trace with cryptanalytic measurements; visual complexity by itself is not a security metric.'
      ]),
      outputs: Object.freeze([
        ['Point mapping', 'Which stable keyed cube point receives each staged input cell.'],
        ['Projection order', 'The exact order in which keyed points are read from the output face.'],
        ['Trace phase', 'The canonical transformation phase currently displayed by playback.'],
        ['Render quality', 'Whether every cell/point is shown or the display is sampled/aggregated for scale.']
      ]),
      boundary: 'The viewport explains geometry and traversal. It cannot prove randomness, diffusion, avalanche quality, or resistance to chosen-plaintext/key-recovery attacks.'
    }),
    'binary-cube-key-generation-visualizer': Object.freeze({
      title: 'Key Generation Structure Visualizer',
      category: 'Cryptography · key-generation research',
      summary: 'Compares deterministic Binary Cube key-generation families above the canonical engine. It measures permutation cycles, fixed points, displacement, adjacency preservation, regional predictability, axis leakage, point-surface roughness, and the resulting three-dimensional point field so candidate generators can be compared instead of judged by appearance alone.',
      workflow: Object.freeze([
        'Select one or more generator profiles and a common seed/grid configuration.',
        'Generate a comparison snapshot so every profile is evaluated on the same domain.',
        'Inspect structural metrics before interpreting the 3D view.',
        'Use the adjacency-ignore switch only when deliberately testing whether that criterion should be excluded.',
        'Treat rejected/research profiles as counterexamples unless later evidence changes their disposition.'
      ]),
      outputs: Object.freeze([
        ['Regional predictability', 'How much coarse source-region information predicts destination regions. Lower is generally less structurally revealing.'],
        ['Cycle structure', 'Permutation decomposition into cycles, including fixed points and longest-cycle fraction.'],
        ['Surface roughness', 'How irregular the derived Latin-cube point surface is over neighboring coordinates.'],
        ['Axis leakage', 'How strongly one coordinate axis remains predictive of the mapped point field.']
      ]),
      boundary: 'These measurements diagnose structure in a generator. A generator that looks chaotic or scores well on these metrics is not thereby a secure key-derivation function.'
    }),
    'binary-cube-decryption-dashboard': Object.freeze({
      title: 'Decryption Dashboard',
      category: 'Cryptanalysis · structural triage',
      summary: 'Performs fast offline triage on ciphertext and unknown byte streams. It combines source parsing, package metadata, entropy, bit density, index of coincidence, run length, autocorrelation, candidate cube divisors, reversible bit/byte transforms, square-block transforms, XOR hypotheses, differential comparison, and known-key controls.',
      workflow: Object.freeze([
        'Load the original artifact without preprocessing when possible.',
        'Inspect structural diagnostics and candidate cube sizes before launching transforms.',
        'Supply a crib only when you have a defensible known-plaintext hypothesis.',
        'Run reversible transforms/XOR as hypothesis generation, then inspect ranked candidates.',
        'Escalate promising Binary Cube material into the Cubic Decryptor or controlled Cryptanalytic Test Lab.'
      ]),
      outputs: Object.freeze([
        ['Entropy / coincidence', 'Descriptive statistics that help distinguish highly structured data from flatter distributions.'],
        ['Autocorrelation', 'Repeated relationships at bit lags that may expose framing or periodic structure.'],
        ['Candidate score', 'A ranking aid based on readability/structure/signatures, not a probability of successful decryption.'],
        ['Differential probe', 'Hamming and XOR relationships between two supplied samples.']
      ]),
      boundary: 'High-scoring plaintext-like output can occur by chance, especially in large transform searches. Confirm candidates with file structure, independent evidence, known plaintext, or exact key identity.'
    }),
    'binary-cube-cryptanalytic-test-lab': Object.freeze({
      title: 'Cryptanalytic Test Lab',
      category: 'Cryptanalysis · controlled experiments',
      summary: 'Runs controlled attacks against a known Binary Cube key/configuration to characterize the transformation itself. The suite measures avalanche, one-hot influence, cross-block diffusion, affine equivalence, chosen-plaintext basis/codebook recovery, deterministic repeats, repeated-block leakage, length leakage, key sensitivity, equivalent-key geometry, permutation cycles, and optional known-plaintext agreement.',
      workflow: Object.freeze([
        'Load a validated canonical key and choose representative plaintext.',
        'Select enough probes to cover the message when exact basis recovery is the goal.',
        'Run the controlled suite and first inspect avalanche, affine identity, and one-hot influence.',
        'Review basis recovery, equivalent-key geometry, repeated blocks, and length leakage together.',
        'Repeat across many seeds, masks, grid sizes, message lengths, and adversarial inputs before generalizing.'
      ]),
      outputs: Object.freeze([
        ['Avalanche', 'Fraction/count of output bits changed after a one-bit plaintext perturbation.'],
        ['Affine identity', 'Whether tested vectors satisfy a simple affine relation under the fixed configuration.'],
        ['Basis recovery', 'Whether chosen one-hot plaintext vectors can reconstruct ciphertext behavior.'],
        ['Equivalent geometry', 'Whether distinct key material produces the same projection mapping.']
      ]),
      boundary: 'A controlled probe demonstrates behavior for the tested key, mask, length, and inputs. It should not be generalized to every key or every future generator without a broader experiment.'
    }),
    'binary-cube-information-analysis-suite': Object.freeze({
      title: 'Information & Deobfuscation Analysis Suite',
      category: 'Cryptanalysis · information structure and deobfuscation',
      summary: 'Analyzes unknown bytes for statistical structure, text/language affinity, file signatures, compression behavior, randomness indicators, simple encodings, and reversible obfuscation hypotheses. It is also the Stage B corroboration authority for retained Cubic Decryptor candidates.',
      workflow: Object.freeze([
        'Load the least-modified byte stream available.',
        'Inspect entropy, min-entropy, coincidence, runs, serial correlation, and signature evidence.',
        'Compare compression/language affinity only as statistical evidence, not semantic proof.',
        'Run deobfuscation candidates when the evidence suggests reversible encoding rather than encryption.',
        'Hand recognized media/container candidates to the specialist Media Forensics or Steganalysis tools.'
      ]),
      outputs: Object.freeze([
        ['Candidate score', 'A structure/readability ranking used to prioritize follow-up analysis.'],
        ['Compression ratio/affinity', 'How repetitive/compressible the sample is and how it relates to reference corpora.'],
        ['Randomness statistics', 'Independent descriptive tests such as runs, serial correlation, and Maurer-style measurements.'],
        ['File signatures', 'Recognized magic bytes that can independently corroborate a candidate transformation.']
      ]),
      boundary: 'Compression affinity and language scores are heuristic evidence. They do not identify authorship, meaning, encryption strength, or a unique plaintext on their own.'
    }),
    'binary-cube-communication-capacity-analyzer': Object.freeze({
      title: 'Communication Capacity Analyzer',
      category: 'Information theory · symbol/sequence analysis',
      summary: 'Measures symbol repertoires and sequence structure using frequency, Zipf-like rank relationships, entropy, conditional entropy, redundancy, and shuffled controls. It is useful for determining whether a stream carries structured communication-like organization without assuming a particular language or cipher.',
      workflow: Object.freeze([
        'Choose a tokenization/symbol interpretation that matches the data source.',
        'Inspect repertoire size and frequency distribution before higher-order sequence metrics.',
        'Compare entropy orders to see how much context reduces uncertainty.',
        'Use shuffled controls to distinguish sequence dependence from simple symbol-frequency effects.',
        'Treat human/dolphin/random reference slopes as contextual comparisons, not classification thresholds.'
      ]),
      outputs: Object.freeze([
        ['Zipf slope', 'Slope of rank-frequency behavior over the fitted range.'],
        ['Entropy order', 'Uncertainty at increasing sequence/context lengths.'],
        ['Redundancy', 'How much observed sequence structure reduces uncertainty relative to a freer symbol model.'],
        ['Shuffle comparison', 'A null control that preserves much of the symbol inventory while disrupting sequence order.']
      ]),
      boundary: 'Statistical resemblance to a communication system does not prove intent, intelligence, language, or encryption. Tokenization choices can materially change the measurements.'
    }),
    'binary-cube-media-forensics-suite': Object.freeze({
      title: 'Steganography / Signal / Media Forensics Suite',
      category: 'Steganography · extraction and carrier forensics',
      summary: 'Examines raw files, raster images, and audio carriers for hidden or structured data. It supports bit-plane extraction, LSB diagnostics, convolution/correlation, image-channel inspection, PCM sample/delta extraction, waveform statistics, FFT/Goertzel analysis, DTMF, binary FSK/AFSK, OOK, container parsing, and appended-payload carving.',
      workflow: Object.freeze([
        'Load the original carrier file rather than a recompressed or resaved copy when possible.',
        'Start with container structure and raw bit-plane diagnostics before choosing a specialized decoder.',
        'For images, compare channels/bit planes and use convolution/residual views to localize structure.',
        'For audio, inspect waveform/spectrum first, then test modulation decoders with defensible frequencies/baud.',
        'Send extracted candidate bytes to Information & Deobfuscation or Advanced Steganalysis for corroboration.'
      ]),
      outputs: Object.freeze([
        ['Bit-plane extraction', 'Reconstructs bytes from selected low/high-order bits; extraction itself does not prove intentional embedding.'],
        ['Convolution/correlation', 'Spatial or sequential filters that expose edges, periodic structure, or similarity at offsets.'],
        ['Signal decoder confidence', 'Relative evidence that configured tones/symbols fit the tested modulation model.'],
        ['Container carving', 'Finds recognized structures, metadata, or data appended beyond the nominal end of a carrier.']
      ]),
      boundary: 'A detector anomaly or recoverable bitstream is evidence to investigate, not proof of steganographic intent. Lossy transcoding can destroy or create apparent low-level structure.'
    }),
    'binary-cube-steganalysis-lab': Object.freeze({
      title: 'Advanced Steganalysis Laboratory',
      category: 'Steganography · quantitative detection and evaluation',
      summary: 'Provides quantitative steganalysis for raster, JPEG, Unicode/text, known-cover, and batch/evaluation workflows. Raster analysis combines RS estimation, Sample Pair Analysis, LSB pair statistics, localized tiles, residual roughness, and residual co-occurrence. Known-cover mode measures exact changed samples/bit planes plus MSE, PSNR, and SSIM. JPEG mode inspects supported quantized DCT coefficients; text mode detects hidden Unicode formatting.',
      workflow: Object.freeze([
        'Load a suspect carrier and choose the appropriate workflow rather than applying every detector indiscriminately.',
        'For raster LSB hypotheses, compare RS and SPA with localized heatmaps and residual evidence.',
        'When an original cover exists, use known-cover comparison because exact differences are much stronger than blind inference.',
        'Use JPEG coefficient mode only when the JPEG encoding mode is supported; unsupported modes are explicitly refused.',
        'Use Batch / Evaluation with ground truth to measure detector behavior rather than trusting one threshold.'
      ]),
      outputs: Object.freeze([
        ['RS payload estimate', 'An estimator derived from regular/singular group behavior under LSB flipping.'],
        ['SPA payload estimate', 'Sample Pair Analysis estimate derived from trace-pair count relationships.'],
        ['Localized heatmap', 'Tile-by-tile detector measurements for locating spatially concentrated anomalies.'],
        ['Known-cover metrics', 'Exact changed samples/LSBs plus image-distortion metrics when both cover and suspect are available.'],
        ['ROC/MCC/error metrics', 'Evaluation measures for detector classification, payload estimation, and extraction quality.']
      ]),
      boundary: 'The laboratory intentionally keeps detector outputs separate. RS, SPA, residuals, LSB balance, PSNR/SSIM, and other measurements are evidence channels—not a single calibrated “steganography probability.”'
    }),
    'binary-cube-diagnostic-pipeline-panel': Object.freeze({
      title: 'Scientific Diagnostic Evaluation Pipeline',
      category: 'Cryptanalysis / steganalysis · routed orchestration',
      summary: 'Classifies an input and routes it through applicable specialist detectors using Triage, Thorough, or Exhaustive profiles. It aggregates evidence while preserving detector identity, calibration provenance, coverage, unresolved evidence, and miss-risk. Recognized Binary Cube artifacts can be handed to the bounded Cubic Decryptor search rather than silently starting an unlimited brute-force job.',
      workflow: Object.freeze([
        'Begin with Triage when the asset type is unknown or time is limited.',
        'Use Thorough for specialist media/steganography analysis when the carrier type is known.',
        'Use Exhaustive when deeper deobfuscation and bounded Cubic key-search planning are justified.',
        'Inspect detector-level findings and calibration provenance before the aggregate indices.',
        'Follow specialist handoffs for any positive, contradictory, or unresolved evidence.'
      ]),
      outputs: Object.freeze([
        ['Asset Presence Index', 'Aggregated evidence that a targeted structure/artifact class is present.'],
        ['Certainty Index', 'Strength/consistency of positive evidence after calibration weighting.'],
        ['Coverage Index', 'How much of the applicable detector surface actually ran successfully.'],
        ['Undetected / Miss-Risk Index', 'Evidence that important possibilities remain unresolved despite weak/negative findings.'],
        ['Calibration provenance', 'Which measured or prior reliability assumptions influenced detector weighting.']
      ]),
      boundary: 'Absence of positive evidence is not evidence of absence. Aggregate indices summarize a routed evidence ledger; they are not posterior probabilities and should not hide individual detector failures or blind spots.'
    }),
    'binary-cube-cubic-decryptor': Object.freeze({
      title: 'Cubic Decryptor Tool',
      category: 'Cryptanalysis · deterministic staged key search',
      summary: 'Enumerates Binary Cube key-generation families in a reproducible staged order, beginning with smaller compatible domains and expanding through direct, iterative, walk, and nested generators. Canonical packages use recorded geometry/capacity and SHA-256 key identity when available. Raw ciphertext uses explicit framing, optional known-plaintext cribs, lightweight Stage A ranking, and Stage B specialist corroboration.',
      workflow: Object.freeze([
        'Load a canonical package whenever possible; metadata can collapse a much larger raw search space.',
        'Build the plan before running so the Plan ID, candidate count, stages, and estimated cost are visible.',
        'Use a known-plaintext crib only when the byte value and offset are defensible; crib assumptions are part of the Plan ID.',
        'Use the worker benchmark to choose CPU pool width, then run within an explicit attempt budget and rely on deterministic checkpoint/resume.',
        'Corroborate retained raw candidates and recover full plaintext only after a candidate survives the inexpensive inner-loop filter.'
      ]),
      outputs: Object.freeze([
        ['Plan ID', 'Deterministic identity of the search semantics. Worker count/session budget are excluded; crib assumptions are included.'],
        ['Global cursor', 'The next unsearched deterministic candidate ordinal, safe for restart/resume.'],
        ['Exact key identity', 'SHA-256 canonical-key digest match when present; legacy packages can fall back to the older FNV keyId.'],
        ['Stage A / Stage B', 'Cheap inner-loop ranking followed by specialist information analysis only for retained candidates.'],
        ['WebGPU acceleration', 'Optional acceleration must pass CPU/GPU parity and may fall back to CPU without changing the Plan ID or searched ordinals.']
      ]),
      boundary: 'Brute-force completion proves only that the configured search domain was exhausted. Raw candidate scores are ranking evidence; an exact SHA-256 key identity or independent plaintext structure is much stronger evidence.'
    }),
    'signals-laboratory': Object.freeze({
      title: 'Signals Laboratory',
      category: 'Signal analysis · carrier/context support',
      summary: 'Models and inspects signal propagation, detection, interference, material loss, reflections, phase relationships, and spatial receive conditions. It supports the steganographic/signal-forensics toolset by helping distinguish carrier behavior from encoding behavior.',
      workflow: Object.freeze([
        'Choose physically meaningful source frequency, power, geometry, and material assumptions.',
        'Inspect path loss and detection margins before interpreting interference or multipath structure.',
        'Use phase/reflection controls to test how environment changes the received signal.',
        'Compare model predictions with forensic observations rather than treating the simulation as measured ground truth.',
        'Keep signal-propagation conclusions separate from claims that a carrier contains hidden information.'
      ]),
      outputs: Object.freeze([
        ['Received power', 'Predicted signal level after modeled propagation and losses.'],
        ['Detection margin', 'Difference between predicted received power and the selected receiver threshold.'],
        ['Interference/phase', 'How multiple paths or sources combine under the modeled phase relationships.'],
        ['Spatial map', 'Predicted receive conditions across the sampled environment.']
      ]),
      boundary: 'This is a bounded physical/signal model. It supports forensic interpretation but does not itself detect steganography or prove that a modeled propagation condition occurred.'
    })
  });

  const SECTION_HELP = Object.freeze([
    [/acquire|input|source/, 'Input acquisition establishes exactly what bytes/bits are being analyzed. Prefer the original artifact; transcoding, copying through text fields, or resaving media can change low-level evidence.'],
    [/generator|profile|key generation/, 'Generator controls choose how candidate permutations/key material are derived. Changing a generator changes the candidate key family, not merely the display.'],
    [/seed/, 'The seed is deterministic input to key generation. The same seed/profile/grid/configuration should reproduce the same candidate key; a different seed explores a different point in the search domain.'],
    [/framing|geometry|face|rotation/, 'Framing describes how ciphertext blocks are interpreted: cube size, input/output faces, quarter turns, payload capacity, and original length. Wrong framing can make the correct key appear wrong.'],
    [/known plaintext|crib/, 'A crib is an asserted plaintext byte sequence at a known offset. It is powerful for pruning candidates, but every conclusion is conditional on the crib being correct.'],
    [/retention|stopping|search/, 'Search controls govern how much deterministic work is done in one session and which candidates are retained. Session budgets and worker count should not change the logical candidate order.'],
    [/checkpoint|resume|autosave/, 'Checkpoints record the deterministic Plan ID and next safe cursor. Resume is valid only when the rebuilt plan matches; local autosave must not substitute a checkpoint onto different ciphertext.'],
    [/candidate|result|recovered/, 'Candidate output is prioritized evidence. Prefer exact key identity, file-format validation, known plaintext, and independent specialist analysis over readability alone.'],
    [/structural|diagnostic/, 'Structural diagnostics describe measurable regularities such as entropy, coincidence, runs, block divisors, or autocorrelation. They help choose attacks but do not identify a cipher by themselves.'],
    [/comparison|differential|known-cover/, 'Comparison mode is strongest when two samples have a known relationship. Hamming/XOR or cover/stego differences can expose exactly where data changed, but do not by themselves explain why.'],
    [/known-key|control/, 'Known-key operation is a calibration/control path. Successful decryption verifies implementation compatibility; it is not evidence that the key could be recovered by an attacker.'],
    [/avalanche|traversal|basis|affine|controlled/, 'Controlled cryptanalysis intentionally changes one variable at a time under a known key. It measures diffusion, linear/affine behavior, mapping recovery, and leakage for the tested configuration.'],
    [/raster|image|pixel/, 'Raster analysis operates on decoded pixel/channel values. LSB and residual detectors are sensitive to channel choice, prior processing, resampling, and lossy compression.'],
    [/jpeg|dct|coefficient/, 'JPEG coefficient analysis works in the quantized transform domain. Encoding mode matters: unsupported progressive/restart cases should be refused rather than approximated silently.'],
    [/text|unicode/, 'Text steganalysis looks for nonprinting or visually subtle Unicode controls, variation selectors, unusual spaces, normalization changes, and trailing whitespace. Presence can be legitimate, so context matters.'],
    [/batch|evaluation|roc|calibration/, 'Evaluation mode needs labeled ground truth. ROC/AUC, MCC, error rates, and payload-estimation error describe detector behavior on the tested corpus—not universal reliability.'],
    [/bit.?plane|lsb|raw bits/, 'Bit-plane tools isolate selected bit positions from bytes/samples/channels. Low-order structure can contain payloads, sensor noise, quantization artifacts, or ordinary file behavior.'],
    [/convolution|correlation|filter/, 'Convolution applies a kernel to emphasize local spatial/sequential structure; correlation measures similarity across offsets. Kernel choice changes what patterns become visible.'],
    [/audio|wave|pcm|signal/, 'Audio analysis should begin with sample format and spectrum, then move to modulation-specific hypotheses. Incorrect sample rate, baud, mark/space frequencies, or channel selection can invalidate a decoder result.'],
    [/container|metadata|carv/, 'Container analysis parses known structural markers and searches for appended/embedded data. A valid signature is stronger evidence than a generic statistical anomaly, but embedded content may still be legitimate.'],
    [/information|entropy|random/, 'Information metrics quantify statistical structure. High entropy is compatible with encryption, compression, or naturally noisy data; low entropy is compatible with many structured formats.'],
    [/communication|symbol|zipf/, 'Communication metrics depend on how raw data is tokenized into symbols. Always interpret entropy and rank-frequency results relative to that chosen symbolization.'],
    [/diagnostic|triage|thorough|exhaustive/, 'Diagnostic profiles trade runtime for detector coverage. Triage is fast, Thorough adds specialist analysis, and Exhaustive adds the most expensive deobfuscation/key-search stages.'],
    [/evidence|certainty|coverage|miss-risk/, 'Evidence indices summarize different questions and should remain separate. Coverage asks what ran; certainty asks how strong findings were; miss-risk asks what important possibilities remain unresolved.'],
    [/playback|trace|visual/, 'Playback is a representation of the canonical transformation trace. Exact mode shows all relevant elements; sampled/aggregate modes preserve overview at large cube sizes but omit visual detail.']
  ]);

  const CONTROL_HELP = Object.freeze([
    [/webgpu|gpu acceleration/, 'Optional WebGPU acceleration uses the GPU only for operations with a proven CPU-equivalent path. It must pass parity checks and must fall back to the deterministic CPU path on unsupported hardware, device loss, or mismatch. Acceleration must never change the Plan ID, key space, candidate ordinal order, or correctness result.'],
    [/parallel workers|worker count|workers/, 'Number of CPU Web Workers used to divide one deterministic ordinal interval into non-overlapping shards. More workers may improve throughput, but worker count does not change the Plan ID or candidate space.'],
    [/benchmark attempts|benchmark .*worker/, 'Runs a bounded performance test over the same type of deterministic work to measure attempts per second, speedup, and parallel efficiency for this browser/hardware.'],
    [/attempt budget/, 'Maximum candidate attempts for this run. A bounded run stops at a deterministic checkpoint; setting the budget to 0 means no session-level limit.'],
    [/maximum cube|grid size|cube grid/, 'Sets the cube side length or the largest side length included in a search. Work generally grows sharply with grid size because each face contains gridSize² cells.'],
    [/seed templates?/, 'Defines how numeric counters are converted into deterministic seed strings. Template order is part of the candidate enumeration order.'],
    [/seed start|start seed/, 'First numeric counter included in deterministic seed enumeration.'],
    [/seed end|end seed/, 'Last numeric counter included in deterministic seed enumeration. Large ranges can dominate total search cost.'],
    [/fixed.*seed|known.*seed/, 'Tests known/default seed strings before the numeric seed-template range. This is a fast compatibility probe, not a claim that these seeds are likely in unrelated data.'],
    [/input face/, 'Cube face on which framed payload/mask cells are staged before keyed point assignment.'],
    [/output face/, 'Cube face whose canonical projection order is used to emit/read the transformed block.'],
    [/input turns?/, 'Quarter-turn rotation applied to input-face indexing. Rotation changes which face cell corresponds to each logical payload position.'],
    [/output turns?/, 'Quarter-turn rotation applied to output-face projection indexing.'],
    [/payload capacity/, 'Number of active payload cells/bits carried per cube block. It is determined by the mask and must agree with framing for exact recovery.'],
    [/mask density/, 'Fraction of face cells enabled for payload rather than deterministic filler. Density changes payload capacity and therefore block framing.'],
    [/original bit length/, 'Exact plaintext length before deterministic block padding. It is needed to remove padded tail bits after decryption.'],
    [/orientation search/, 'Chooses whether to trust/manual-set cube geometry or enumerate valid face/rotation combinations. Exhaustive orientation search multiplies the key-search domain.'],
    [/capacity search/, 'Chooses whether to use a specified/common payload capacity or enumerate every legal mask-capacity hypothesis. Exhaustive capacity search can be very expensive.'],
    [/crib mode/, 'Selects the representation of a known-plaintext hypothesis: text, exact hexadecimal bytes, a known file signature, or disabled.'],
    [/byte offset|crib offset/, 'Exact byte position where the crib is expected in recovered plaintext. Incorrect offsets prune otherwise-correct raw candidates.'],
    [/known signature/, 'Uses the magic bytes of a recognized file type as a plaintext crib, usually at byte offset 0 unless the format is embedded.'],
    [/score threshold|raw score/, 'Minimum cheap Stage A candidate score retained for further analysis. Lower thresholds keep more false positives; higher thresholds risk discarding unusual/non-text plaintext unless other evidence overrides the score.'],
    [/top candidates|maximum ranked|result limit/, 'Maximum number of ranked candidates retained. This controls memory/UI volume, not the number of keys tested.'],
    [/sample blocks/, 'Number of initial ciphertext blocks decrypted for cheap candidate triage. A required crib may automatically increase the sample depth enough to reach its offset.'],
    [/stop.*key|stop.*identity|stop.*fingerprint/, 'Stops once the earliest exact package key identity in the searched prefix is proven. Disable it when intentionally benchmarking or exhaustively measuring a bounded interval.'],
    [/autosave/, 'Stores search controls/checkpoint/candidate samples locally in IndexedDB for interrupted-session recovery. The source ciphertext itself is intentionally not stored by this feature.'],
    [/entropy order/, 'Context/order used for entropy estimation. Higher orders measure uncertainty after conditioning on longer symbol histories but require much more data.'],
    [/tile size/, 'Spatial dimensions used for localized raster analysis. Smaller tiles improve localization but provide fewer samples per detector estimate.'],
    [/channel/, 'Selects which raster or audio channel is analyzed. Hidden structure can be channel-specific, while legitimate processing can create different statistics in each channel.'],
    [/heatmap/, 'Chooses which localized detector measurement is visualized across the raster. Heatmap intensity is a measurement scale, not a calibrated probability.'],
    [/rs\b/, 'RS steganalysis estimates LSB replacement behavior from changes in regular/singular sample groups under controlled bit flipping. It works best under its statistical assumptions and can fail on atypical imagery.'],
    [/spa|sample pair/, 'Sample Pair Analysis estimates LSB embedding rate from relationships among neighboring sample-pair trace classes. Agreement with RS is stronger evidence than either estimator alone.'],
    [/cover/, 'Known-cover input is the presumed original carrier before embedding. Exact cover/suspect comparison is generally stronger than blind steganalysis when provenance is reliable.'],
    [/jpeg|dct/, 'Runs JPEG transform-domain inspection on supported baseline sequential coefficient streams. Progressive/restart-coded cases may be unsupported and should be reported as such.'],
    [/bit order/, 'Controls whether extracted bits are assembled most-significant-bit first or least-significant-bit first within reconstructed bytes. Wrong bit order can make a valid hidden stream look random.'],
    [/bit plane|bit index/, 'Selects the numerical bit position extracted from each byte/sample/channel. Bit 0 is the least significant bit.'],
    [/kernel|convolution/, 'Selects the convolution matrix/filter. Edge/high-pass kernels emphasize local changes; blur kernels suppress fine detail; custom kernels test a specific hypothesis.'],
    [/lag|correlation/, 'Offset over which similarity/correlation is measured. Peaks at specific lags can indicate periodic structure, symbol timing, or repeated framing.'],
    [/sample rate/, 'Number of audio samples per second. Frequency/baud interpretation is wrong if the sample rate is wrong.'],
    [/baud|symbol rate/, 'Symbols transmitted per second for the modulation hypothesis. Decoder windows are derived from this rate.'],
    [/mark frequency/, 'Frequency representing one binary symbol in FSK/AFSK hypotheses.'],
    [/space frequency/, 'Frequency representing the other binary symbol in FSK/AFSK hypotheses.'],
    [/carrier frequency/, 'Expected tone frequency for carrier-present states such as OOK.'],
    [/probe/, 'Number of controlled perturbations/basis vectors sampled. More probes improve coverage but increase cryptanalytic runtime.'],
    [/plaintext mode/, 'How the supplied plaintext field is interpreted before controlled encryption: text, exact bits, or hexadecimal bytes.'],
    [/observed ciphertext/, 'Optional independent ciphertext used to test whether the known plaintext/key configuration reproduces an observed sample exactly.'],
    [/profile.*triage|triage/, 'Fast diagnostic profile that prioritizes low/medium-cost acquisition, information, and broadly applicable detectors.'],
    [/thorough/, 'Diagnostic profile that adds higher-cost specialist analysis such as raster/audio/JPEG steganalysis when applicable.'],
    [/exhaustive/, 'Diagnostic profile that adds the most expensive deobfuscation and bounded cryptanalytic key-search stages.'],
    [/file|upload/, 'Loads a local artifact into the browser for analysis. Prefer the original file; resaving/recompressing can destroy or alter forensic evidence.'],
    [/paste mode|input mode|format/, 'Tells the parser how to interpret pasted material. Auto mode tries recognized structured/binary encodings before falling back to literal text.']
  ]);

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }

  function normalizedText(value) {
    return String(value || '').replace(/\s+/g, ' ').replace(/\?/g, '').trim().toLowerCase();
  }

  function helpForText(value, fallback = '') {
    const text = normalizedText(value);
    if (!text) return fallback;
    const match = CONTROL_HELP.find(([pattern]) => pattern.test(text));
    return match ? match[1] : fallback;
  }

  function sectionHelpFor(value) {
    const text = normalizedText(value);
    const match = SECTION_HELP.find(([pattern]) => pattern.test(text));
    return match ? match[1] : 'This section controls one stage of the tool. Change one assumption at a time when possible, then interpret its outputs together with the tool-level evidence boundary above.';
  }

  function fallbackControlHelp(control, labelText) {
    const type = String(control?.type || control?.tagName || '').toLowerCase();
    if (type === 'file') return 'Selects a local input artifact for this analysis stage. The file is processed in the browser unless the surrounding tool explicitly states otherwise.';
    if (type === 'checkbox') return `Enables or disables ${labelText || 'this option'}. Toggling it can change the analysis/search configuration, so rebuild any deterministic plan when the tool requires it.`;
    if (control?.tagName === 'SELECT') return `Selects the interpretation or method used for ${labelText || 'this control'}. Different choices can change what the tool measures or which hypotheses are tested.`;
    if (type === 'number' || type === 'range') return `Numerical parameter for ${labelText || 'this stage'}. Very small/large values can trade statistical reliability, coverage, and runtime.`;
    if (control?.tagName === 'TEXTAREA' || type === 'text') return `Provides ${labelText || 'input'} to this analysis. Enter exact source material/assumptions where possible because parsing and known-plaintext tests are sensitive to representation.`;
    return `Controls ${labelText || 'this analysis option'}. Use the section help and tool guide to understand how it affects the evidence or search domain.`;
  }

  function createTooltip(text, className = 'sth-inline-tip') {
    const trigger = root.document.createElement('span');
    const tooltipId = `sth-tooltip-${++tooltipCounter}`;
    trigger.className = className;
    trigger.tabIndex = 0;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', 'Explain this control');
    trigger.setAttribute('aria-describedby', tooltipId);
    trigger.textContent = '?';
    const bubble = root.document.createElement('span');
    bubble.id = tooltipId;
    bubble.className = 'sth-tooltip-bubble';
    bubble.setAttribute('role', 'tooltip');
    bubble.textContent = text;
    trigger.appendChild(bubble);
    const toggle = event => {
      event.preventDefault();
      event.stopPropagation();
      trigger.classList.toggle('is-open');
    };
    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') toggle(event);
      if (event.key === 'Escape') trigger.classList.remove('is-open');
    });
    trigger.addEventListener('blur', () => trigger.classList.remove('is-open'));
    return { trigger, tooltipId };
  }

  function renderGuide(guide) {
    const details = root.document.createElement('details');
    details.className = GUIDE_CLASS;
    details.dataset.sthGuide = 'true';
    details.innerHTML = `
      <summary><span><strong>Help · How this tool works</strong><small>${esc(guide.category)}</small></span><span class="sth-chevron" aria-hidden="true">▾</span></summary>
      <div class="sth-guide-body">
        <p class="sth-guide-summary">${esc(guide.summary)}</p>
        <div class="sth-guide-grid">
          <section><h4>Recommended workflow</h4><ol>${guide.workflow.map(row => `<li>${esc(row)}</li>`).join('')}</ol></section>
          <section><h4>What the outputs mean</h4><dl>${guide.outputs.map(([term, description]) => `<div><dt>${esc(term)}</dt><dd>${esc(description)}</dd></div>`).join('')}</dl></section>
        </div>
        <aside class="sth-boundary"><strong>Evidence boundary</strong><p>${esc(guide.boundary)}</p></aside>
        <p class="sth-help-legend"><span class="sth-inline-tip sth-static">?</span> Hover or focus the question-mark markers beside controls and section headings for local explanations. Click a marker to pin it open temporarily.</p>
      </div>`;
    return details;
  }

  function guideInsertionPoint(panel) {
    const dialog = panel.querySelector('[role="dialog"]') || panel;
    const header = dialog.querySelector(':scope > header, :scope > .bdd-header, :scope > .bcatl-header, :scope > .bcsl-header, :scope > .bccd-header');
    if (header) return { parent: header.parentElement, before: header.nextSibling };
    const heading = dialog.querySelector('h1,h2');
    if (heading?.parentElement) return { parent: heading.parentElement, before: heading.nextSibling };
    return { parent: dialog, before: dialog.firstChild };
  }

  function decorateGuide(panel, guide) {
    if (panel.querySelector(`.${GUIDE_CLASS}[data-sth-guide="true"]`)) return;
    const details = renderGuide(guide);
    const point = guideInsertionPoint(panel);
    point.parent.insertBefore(details, point.before);
  }

  function decorateSections(panel) {
    panel.querySelectorAll('h3,h4').forEach(heading => {
      if (heading.closest(`.${GUIDE_CLASS}`) || heading.dataset.sthHelpDecorated === 'true') return;
      const text = heading.textContent.trim();
      if (!text) return;
      const explanation = sectionHelpFor(text);
      const { trigger } = createTooltip(explanation, 'sth-section-tip');
      heading.appendChild(trigger);
      const callout = root.document.createElement('div');
      callout.className = 'sth-section-callout';
      callout.hidden = true;
      callout.textContent = explanation;
      heading.insertAdjacentElement('afterend', callout);
      trigger.addEventListener('click', () => { callout.hidden = !callout.hidden; });
      heading.dataset.sthHelpDecorated = 'true';
    });
  }

  function controlLabelText(label, control) {
    const clone = label.cloneNode(true);
    clone.querySelectorAll('input,select,textarea,button,.sth-inline-tip,.sth-section-tip,.sth-tooltip-bubble').forEach(node => node.remove());
    const text = clone.textContent.replace(/\s+/g, ' ').trim();
    if (text) return text;
    return control?.getAttribute('aria-label') || control?.name || control?.id || 'this control';
  }

  function decorateControls(panel) {
    panel.querySelectorAll('label').forEach(label => {
      if (label.closest(`.${GUIDE_CLASS}`) || label.dataset.sthHelpDecorated === 'true') return;
      const control = label.querySelector('input,select,textarea');
      if (!control) return;
      const labelText = controlLabelText(label, control);
      const explanation = helpForText(labelText, fallbackControlHelp(control, labelText));
      const { trigger, tooltipId } = createTooltip(explanation);
      label.appendChild(trigger);
      control.title = explanation;
      const current = String(control.getAttribute('aria-describedby') || '').trim();
      control.setAttribute('aria-describedby', [current, tooltipId].filter(Boolean).join(' '));
      label.dataset.sthHelpDecorated = 'true';
    });

    panel.querySelectorAll('button').forEach(button => {
      if (button.closest(`.${GUIDE_CLASS}`) || button.closest('.sth-inline-tip,.sth-section-tip') || button.dataset.sthHelpDecorated === 'true') return;
      const text = button.textContent.replace(/\s+/g, ' ').trim() || button.getAttribute('aria-label') || 'this action';
      const explanation = helpForText(text, `Runs “${text}”. The action uses the current controls/assumptions in this section; review the surrounding help and evidence boundary before treating its output as a conclusion.`);
      if (!button.title) button.title = explanation;
      button.dataset.sthHelp = explanation;
      button.dataset.sthHelpDecorated = 'true';
    });
  }

  function decoratePanel(panel, guide) {
    if (!panel || !guide) return false;
    decorateGuide(panel, guide);
    decorateSections(panel);
    decorateControls(panel);
    panel.dataset.scientificToolsHelp = VERSION;
    return true;
  }

  function scan() {
    scanQueued = false;
    if (!root?.document) return 0;
    let decorated = 0;
    for (const [panelId, guide] of Object.entries(TOOL_GUIDES)) {
      const panel = root.document.getElementById(panelId);
      if (panel && decoratePanel(panel, guide)) decorated += 1;
    }
    return decorated;
  }

  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    const schedule = typeof root.queueMicrotask === 'function' ? root.queueMicrotask.bind(root) : callback => Promise.resolve().then(callback);
    schedule(scan);
  }

  function start() {
    if (!root?.document) return false;
    scan();
    if (!observer && typeof root.MutationObserver === 'function') {
      observer = new root.MutationObserver(records => {
        if (records.some(record => record.addedNodes?.length)) scheduleScan();
      });
      observer.observe(root.document.body || root.document.documentElement, { childList: true, subtree: true });
    }
    return true;
  }

  function stop() {
    observer?.disconnect?.();
    observer = null;
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }

  return Object.freeze({
    version: VERSION,
    guides: TOOL_GUIDES,
    start,
    stop,
    scan,
    decoratePanel,
    helpForText,
    sectionHelpFor
  });
});
