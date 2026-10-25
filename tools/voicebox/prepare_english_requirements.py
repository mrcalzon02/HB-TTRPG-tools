#!/usr/bin/env python3
"""Derive a *local* English-only Voicebox requirements file, leaving upstream untouched."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

# Only the narrowly identified multilingual Kokoro extras are changed.
# Do not silently edit arbitrary new Voicebox dependency versions.
MISAKI = re.compile(r"^(?P<indent>\s*)misaki\[en,ja,zh\](?P<version>\s*(?:[<>=!~].*)?)$", re.I)
UNIDIC = re.compile(r"^\s*unidic-lite(?:\s*(?:[<>=!~].*)?)$", re.I)
PYKAKASI = re.compile(r"^\s*pykakasi(?:\s*(?:[<>=!~].*)?)$", re.I)

def derive_english_only(source: str) -> str:
    if not isinstance(source, str) or not source.strip():
        raise ValueError("Voicebox requirements source is empty")
    result = []
    replaced = 0
    removed_unidic = 0
    removed_pykakasi = 0
    for line in source.splitlines(keepends=True):
        stripped = line.strip()
        match = MISAKI.fullmatch(stripped)
        if match:
            result.append("misaki[en]" + match.group("version") + "\n")
            replaced += 1
        elif UNIDIC.fullmatch(stripped):
            removed_unidic += 1
        elif PYKAKASI.fullmatch(stripped):
            removed_pykakasi += 1
        else:
            result.append(line)
    if replaced != 1:
        raise ValueError("Expected exactly one misaki[en,ja,zh] requirement; upstream changed—review rather than guessing")
    if removed_unidic != 1:
        raise ValueError("Expected exactly one unidic-lite Japanese dictionary; upstream changed—review rather than guessing")
    if removed_pykakasi != 1:
        raise ValueError("Expected exactly one pykakasi Japanese transliterator; upstream changed—review rather than guessing")
    body = "".join(result)
    if re.search(r"(?im)^\s*(?:pyopenjtalk|unidic-lite|pykakasi)\b", body):
        raise ValueError("English-only output unexpectedly still requests a Japanese dependency")
    return (
        "# English-only LOCAL derivative of upstream Voicebox requirements.\n"
        "# Source checkout is not modified. Missing languages are deliberately unsupported here.\n"
        + body
    )

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source, output = args.input.resolve(), args.output.resolve()
    if source == output:
        raise ValueError("Refusing to overwrite upstream Voicebox requirements")
    if output.exists():
        raise FileExistsError("Refusing to overwrite an existing requirements derivative: " + str(output))
    derived = derive_english_only(source.read_text(encoding="utf-8"))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(derived, encoding="utf-8")
    print("Derived English-only Voicebox requirements: " + str(output))

if __name__ == "__main__":
    main()
