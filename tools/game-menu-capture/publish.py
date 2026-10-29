#!/usr/bin/env python3
"""Publish ONLY actual verified screenshots; leave fallback art untouched otherwise."""
import hashlib
import json
from pathlib import Path
import re
import shutil
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[2]
CAPTURES = ROOT / "captures"
ARCHIVE = ROOT / "assets/game-menu-captures"
CATALOG = ROOT / "software-catalog-data.js"
ALLOWED = {"NUTBUSTER-R", "Jewel_Brook", "Fleet-designer", "powerpong",
           "The-Malefic-Veil", "The-Beckenburg-Project",
           "TheMechanist", "Catastrophic-Diplomacy", "ReverieVR"}
source = CATALOG.read_text(encoding="utf-8")
updated = []
rejected = {}

for folder in sorted(CAPTURES.iterdir() if CAPTURES.exists() else []):
    if not folder.is_dir() or folder.name not in ALLOWED:
        continue
    evidence_file = folder / "capture.json"
    primary = folder / "title.png"
    if not evidence_file.is_file() or not primary.is_file():
        continue
    try:
        evidence = json.loads(evidence_file.read_text(encoding="utf-8"))
        revision = evidence.get("repoSha", "")
        if not re.fullmatch("[0-9a-f]{40}", revision):
            raise ValueError("Missing immutable source commit")
        shots = evidence.get("shots", [])
        files = [item["file"] for item in shots]
        if "title.png" not in files:
            raise ValueError("Primary screenshot lacks evidence entry")
        dest = ARCHIVE / folder.name
        for item in shots:
            name = item["file"]
            if not re.fullmatch(r"(title|menu-[a-z0-9-]+)\.png", name):
                raise ValueError("Unexpected screenshot filename")
            picture = folder / name
            data = picture.read_bytes()
            if hashlib.sha256(data).hexdigest() != item["sha256"]:
                raise ValueError("Screenshot SHA-256 differs from capture evidence")
            with Image.open(picture) as im:
                im.verify()
            with Image.open(picture) as im:
                if im.width < 460 or im.height < 300:
                    raise ValueError("Unexpected screenshot dimensions")
                thumb = im.convert("RGB").resize((80,50))
                contrast = max(ImageStat.Stat(thumb).stddev)
                if contrast < 11:
                    raise ValueError("Blank or uniform screenshot")
        # Only promote after validating ALL files; no partial menu gallery.
        dest.mkdir(parents=True, exist_ok=True)
        for name in files:
            shutil.copy2(folder / name, dest / name)
        shutil.copy2(evidence_file, dest / "capture.json")
        # The original concept reference remains under preview and art.
        marker = '"repo": "' + folder.name + '",'
        if marker not in source:
            raise ValueError("Repository is not present in software catalog")
        if source.count(marker) != 1:
            raise ValueError("Repository duplicated in software catalog")
        local_line = '"previewLocal": "assets/game-menu-captures/' + folder.name + '/title.png",'
        evidence_line = '"captureEvidence": "assets/game-menu-captures/' + folder.name + '/capture.json",'
        section_start = source.index(marker)
        section_end = source.find('  },',section_start)
        section = source[section_start: section_end if section_end != -1 else len(source)]
        if '"previewLocal":' in section:
            section = re.sub(r'\n    "previewLocal": "[^"]*",', '', section)
            section = re.sub(r'\n    "captureEvidence": "[^"]*",', '', section)
            source = source[:section_start] + section + source[section_end if section_end != -1 else len(source):]
        source = source.replace(marker, marker + "\n    " + local_line + "\n    " + evidence_line, 1)
        updated.append({"repository":folder.name,"revision":revision,"screenshots":len(shots)})
    except Exception as exc:
        rejected[folder.name] = str(exc)
        print("REJECTED",folder.name,str(exc))

if updated:
    CATALOG.write_text(source,encoding="utf-8")
manifest = {"policy":"Verified captures only; existing concept art retained for fallback",
            "updated":updated,"rejected":rejected}
ARCHIVE.mkdir(parents=True,exist_ok=True)
(ARCHIVE / "capture-report.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps(manifest,indent=2))
if not updated:
    raise SystemExit("No actual screenshots passed verification; no archive artwork promoted")
