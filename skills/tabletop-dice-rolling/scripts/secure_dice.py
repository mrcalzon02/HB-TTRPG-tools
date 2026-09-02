#!/usr/bin/env python3
"""Secure tabletop dice roller for HB-TTRPG-tools Agent Skills.

Uses Python's secrets module. Supports 1-10 dice, d2-d100, optional integer
modifier, and presentation modes:
- cumulative: present one summed total
- individual total: present each die in roll order

Cryptographic host randomness is not a physical TRNG claim.
"""
from __future__ import annotations

import argparse
import json
import re
import secrets
from datetime import datetime, timezone

ROLL_RE = re.compile(
    r"^\s*(?:(?:/)?roll\s+|r\s+|dice\s+)?"
    r"(?P<count>\d*)\s*[dD]\s*(?P<sides>\d+)\s*"
    r"(?P<modifier>[+-]\s*\d+)?\s*"
    r"(?P<mode>cumulative|individual(?:\s+total)?|each|per\s+die)?\s*$",
    re.IGNORECASE,
)

MODE_ALIASES = {
    "cumulative": "cumulative",
    "individual": "individual total",
    "individual total": "individual total",
    "each": "individual total",
    "per die": "individual total",
}


def parse_command(command: str, default_mode: str = "cumulative") -> dict:
    match = ROLL_RE.match(command or "")
    if not match:
        raise ValueError("Unsupported dice command or notation.")
    count = int(match.group("count") or 1)
    sides = int(match.group("sides"))
    modifier = int((match.group("modifier") or "0").replace(" ", ""))
    if not 1 <= count <= 10:
        raise ValueError("Dice count must be between 1 and 10.")
    if not 2 <= sides <= 100:
        raise ValueError("Die sides must be between 2 and 100.")
    raw_mode = (match.group("mode") or default_mode).strip().lower()
    mode = MODE_ALIASES.get(raw_mode)
    if mode is None:
        raise ValueError("Mode must be cumulative or individual total.")
    notation = f"{count}d{sides}" + (f"{modifier:+d}" if modifier else "")
    return {
        "original_command": command,
        "notation": notation,
        "count": count,
        "sides": sides,
        "modifier": modifier,
        "mode": mode,
    }


def roll_command(command: str, default_mode: str = "cumulative") -> dict:
    parsed = parse_command(command, default_mode=default_mode)
    rolls = [secrets.randbelow(parsed["sides"]) + 1 for _ in range(parsed["count"])]
    subtotal = sum(rolls)
    total = subtotal + parsed["modifier"]
    if parsed["mode"] == "cumulative":
        presentation = {"mode": "cumulative", "total": total}
        spoken = f"{parsed['notation']} cumulative: {total}"
    else:
        presentation = {"mode": "individual total", "results": rolls}
        if parsed["modifier"]:
            presentation["modifier"] = parsed["modifier"]
        spoken = f"{parsed['notation']} individual total: " + ", ".join(map(str, rolls))
        if parsed["modifier"]:
            spoken += f"; aggregate modifier {parsed['modifier']:+d} retained separately"
    return {
        **parsed,
        "rolls": rolls,
        "subtotal": subtotal,
        "total": total,
        "presentation": presentation,
        "spoken": spoken,
        "entropy_source": "python-secrets-os-cryptographic-rng",
        "physical_trng_attested": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", nargs="+", help='Dice command, e.g. "roll 6d10 individual total"')
    parser.add_argument("--default-mode", choices=["cumulative", "individual total"], default="cumulative")
    args = parser.parse_args()
    print(json.dumps(roll_command(" ".join(args.command), args.default_mode), indent=2))


if __name__ == "__main__":
    main()
