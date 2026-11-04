"""Content-based admission gate for neural speech output.

LuxTTS can truncate the start of a waveform. A sacrificial spoken lead-in is
generated, the exact start of the wanted speech is identified by independent
speech recognition, and the lead-in is trimmed at a *measured* boundary.
Silence padding alone cannot restore lost spoken phonemes.
"""
from __future__ import annotations

from difflib import SequenceMatcher
import re

GUARD_WORDS = {"okay", "ok", "well"}
FRONT_WORDS_TO_VERIFY = 3


def words(text: str) -> list[str]:
    text = text.lower().replace("’", "'").replace("'", "")
    return re.findall(r"[a-z0-9]+", text)


def recognition_words(recognition: dict) -> list[str]:
    if not isinstance(recognition, dict):
        return []
    return words(str(recognition.get("text", "")))


def _guard_end_index(actual: list[str], target: list[str], guard_phrase: str | None):
    """Return the LAST guard word index followed by the intended opening."""
    n = min(FRONT_WORDS_TO_VERIFY, len(target))
    if guard_phrase:
        anchor = words(guard_phrase)[-1]
        return next((i for i, token in enumerate(actual[:20])
                     if token == anchor and actual[i + 1:i + 1 + n] == target[:n]), None)
    count = 0
    while count < len(actual) and count < 3 and actual[count] in GUARD_WORDS:
        count += 1
    if count and actual[count:count + n] == target[:n]:
        return count - 1
    return None


def is_complete(expected: str, heard: str, guarded: bool = False,
                guard_phrase: str | None = None) -> tuple[bool, float]:
    target = words(expected)
    actual = words(heard)
    if guarded:
        anchor = _guard_end_index(actual, target, guard_phrase)
        if anchor is None:
            return False, 0.0
        actual = actual[anchor + 1:]
    if not target or not actual:
        return False, 0.0
    # Missing, merged or invented FIRST words is a functional defect.
    n = min(FRONT_WORDS_TO_VERIFY, len(target))
    if len(actual) < n or actual[:n] != target[:n]:
        return False, 0.0
    # Ensure the rest of the utterance and the final word were also generated.
    overall = SequenceMatcher(None, target, actual, autojunk=False).ratio()
    ending = (actual[-1] == target[-1] or
              max(SequenceMatcher(None, target[-1], w).ratio() for w in actual[-2:]) >= .78)
    return overall >= .76 and ending, round(overall, 3)


def timed_words(recognition: dict) -> list[tuple[str, float | None, float | None]]:
    """Read word-aligned timestamps, allowing chunk text containing several tokens."""
    result = []
    for item in recognition.get("chunks", []):
        if not isinstance(item, dict):
            continue
        timestamp = item.get("timestamp")
        start = end = None
        if isinstance(timestamp, (tuple, list)) and len(timestamp) >= 2:
            if isinstance(timestamp[0], (int, float)):
                start = float(timestamp[0])
            if isinstance(timestamp[1], (int, float)):
                end = float(timestamp[1])
        for token in words(str(item.get("text", ""))):
            result.append((token, start, end))
    return result


def trim_guarded_audio(audio, sample_rate: int, expected: str, recognition: dict,
                       guard_phrase: str | None = None):
    """Strip a sacrificed intro only when an ASR-confirmed first word follows it.

    Audio and word timestamps are in the same timebase, including any leading
    padding used to help speech recognition. The start of wanted speech must
    remain at least 45 ms after the trim, not merely at the exact cut boundary.
    """
    from math import isfinite
    target = words(expected)
    heard = recognition_words(recognition)
    duration = len(audio) / sample_rate
    if len(heard) > max(18, int(duration * 6)):
        raise ValueError("ASR hallucinated more words than the audio duration permits")
    for _, start, end in timed_words(recognition):
        if (start is not None and start > duration + 0.35 or
                end is not None and end > duration + 0.35):
            raise ValueError("ASR word timestamps exceed the actual WAV duration")
    passed, score = is_complete(expected, str(recognition.get("text", "")),
                                guarded=True, guard_phrase=guard_phrase)
    if not passed:
        raise ValueError("Speech recognition could not verify the full guarded narration")
    alignment = timed_words(recognition)
    n = min(FRONT_WORDS_TO_VERIFY, len(target))
    anchor = _guard_end_index([w for w, _, _ in alignment], target, guard_phrase)
    if anchor is None or len(alignment) < anchor + n + 1:
        raise ValueError("No word-timed guard and target opening available")
    guard_end = alignment[anchor][2]
    actual_start = alignment[anchor + 1][1]
    if (guard_end is None or actual_start is None or
            not isfinite(guard_end) or not isfinite(actual_start)):
        raise ValueError("Missing finite timestamps for opening speech")
    if actual_start - guard_end < .09:
        raise ValueError("Guard and wanted opening are too close to trim safely")
    # Trim just after the guard, leaving ample natural pre-onset audio.
    # Long quiet gaps (observed up to 1.5 seconds between natural guard
    # and first story word) are shortened, but retain 600 ms for audio device
    # wake-up and enough phonetic lead-in to prevent a clipped onset.
    cut_seconds = max(guard_end + .020, actual_start - .600)
    if actual_start - cut_seconds < .06:
        raise ValueError("Unsafe word boundary: would cut the wanted opening")
    frames = round(cut_seconds * sample_rate)
    if frames < 1 or frames >= len(audio) - sample_rate // 4:
        raise ValueError("Invalid guarded speech trim location")
    tail = audio[frames:].copy()
    # Small attack fade prevents a digital pop without masking a consonant.
    fade_frames = min(int(.003 * sample_rate), len(tail) // 10)
    if fade_frames:
        for i in range(fade_frames):
            tail[i] *= i / max(1, fade_frames - 1)
    return tail, {"guard_word": alignment[anchor][0], "guard_count": anchor + 1,
                  "removed_seconds": round(cut_seconds, 3),
                  "first_word_pre_roll_ms": round((actual_start - cut_seconds) * 1000),
                  "guarded_asr_match": score,
                  "first_words_verified": target[:n]}
