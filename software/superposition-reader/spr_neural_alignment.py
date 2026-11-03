"""Content-based admission gate for neural speech output.

LuxTTS can truncate the start of a waveform. A sacrificial spoken lead-in is
generated, the exact start of the wanted speech is identified by independent
speech recognition, and the lead-in is trimmed at a *measured* boundary.
Silence padding alone cannot restore lost spoken phonemes.
"""
from __future__ import annotations

from difflib import SequenceMatcher
import re

GUARD_WORDS = {"okay", "well"}
FRONT_WORDS_TO_VERIFY = 3


def words(text: str) -> list[str]:
    text = text.lower().replace("’", "'").replace("'", "")
    return re.findall(r"[a-z0-9]+", text)


def recognition_words(recognition: dict) -> list[str]:
    if not isinstance(recognition, dict):
        return []
    return words(str(recognition.get("text", "")))


def is_complete(expected: str, heard: str, guarded: bool = False) -> tuple[bool, float]:
    target = words(expected)
    actual = words(heard)
    if guarded:
        if not actual or actual[0] not in GUARD_WORDS:
            return False, 0.0
        actual = actual[1:]
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


def trim_guarded_audio(audio, sample_rate: int, expected: str, recognition: dict):
    """Strip a sacrificed intro only when an ASR-confirmed first word follows it.

    Audio and word timestamps are in the same timebase, including any leading
    padding used to help speech recognition. The start of wanted speech must
    remain at least 45 ms after the trim, not merely at the exact cut boundary.
    """
    from math import isfinite
    target = words(expected)
    heard = recognition_words(recognition)
    passed, score = is_complete(expected, str(recognition.get("text", "")), guarded=True)
    if not passed:
        raise ValueError("Speech recognition could not verify the full guarded narration")
    alignment = timed_words(recognition)
    n = min(FRONT_WORDS_TO_VERIFY, len(target))
    if len(alignment) < n + 1 or alignment[0][0] not in GUARD_WORDS:
        raise ValueError("No word-timed guard and target opening available")
    if [token for token, _, _ in alignment[1:n + 1]] != target[:n]:
        raise ValueError("Recognized opening words cannot be aligned to audio")
    guard_end = alignment[0][2]
    actual_start = alignment[1][1]
    if (guard_end is None or actual_start is None or
            not isfinite(guard_end) or not isfinite(actual_start)):
        raise ValueError("Missing finite timestamps for opening speech")
    if actual_start - guard_end < .09:
        raise ValueError("Guard and wanted opening are too close to trim safely")
    # Trim just after the guard, leaving ample natural pre-onset audio.
    cut_seconds = guard_end + .020
    if actual_start - cut_seconds < .06:
        raise ValueError("Unsafe word boundary: would cut the wanted opening")
    frames = round(cut_seconds * sample_rate)
    if frames < 1 or frames >= len(audio) - sample_rate // 4:
        raise ValueError("Invalid guarded speech trim location")
    tail = audio[frames:].copy()
    # Small attack fade prevents a digital pop without masking a consonant.
    fade_frames = min(int(.003 * sample_rate), len(tail) // 10)
    if fade_frames:
        import numpy as np
        tail[:fade_frames] *= np.linspace(0.0, 1.0, fade_frames, endpoint=True)
    return tail, {"guard_word": alignment[0][0],
                  "removed_seconds": round(cut_seconds, 3),
                  "first_word_pre_roll_ms": round((actual_start - cut_seconds) * 1000),
                  "guarded_asr_match": score,
                  "first_words_verified": target[:n]}
