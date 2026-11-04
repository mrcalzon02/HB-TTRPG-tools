"""Capture genuine SPR menu screens from the live local reader interface.

Windows CI installs optional British models first. A Playwright browser drives
SPR's real loopback HTTP handler and JavaScript, not static mock HTML. Images
contain only a synthetic demonstration document and installed public voice IDs.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from http.server import ThreadingHTTPServer
import json
import os
from pathlib import Path
import struct
import threading

from playwright.sync_api import sync_playwright

from spr_app import ROOT, ReaderState, make_handler
from spr_core import Archive, WindowsSapiEngine
from spr_local_voices import LocalVoiceEngine, LocalVoiceSetup
from spr_luxtts_engine import SprLuxEngine
from spr_neural_setup import NeuralSetup


DEMO = (
    "The evening light settled over the quiet countryside. "
    "Beyond the distant hills, a new adventure was beginning. "
    "The old lighthouse rose above the cliffs, and the harbor lamps "
    "flickered against the deepening blue of the sea.\n\n"
    "At the edge of town, a traveler opened an old book and began to read. "
    "Every chapter held a different voice; each voice belonged to a new story. "
    "The reader could return tomorrow and find the exact same page, "
    "with every completed narration safely stored on the local computer.\n\n"
    "A light rain fell against the windows, while the narrator continued "
    "at an easy, natural pace. No connection to a remote service was needed."
)


def verify_png(path: Path, width: int, height: int) -> dict:
    content = path.read_bytes()
    if len(content) < 18000 or content[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"Screen capture was not a substantive PNG: {path.name}")
    actual = struct.unpack(">II", content[16:24])
    if actual != (width, height):
        raise RuntimeError(f"Screenshot dimensions invalid: {path.name} {actual}")
    return {"file": path.name, "width": actual[0], "height": actual[1],
            "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}


def capture(out_dir: Path, data_dir: Path):
    archive = Archive(data_dir)
    record = archive.import_document("SPR Showroom - Demo Passage.txt", DEMO.encode("utf-8"))
    local = {name: LocalVoiceEngine(archive.root, name)
             for name in ("kokoro", "piper")}
    for family, expected in (("kokoro", "bm_george"),
                             ("piper", "en_GB-alan-medium")):
        engine = local[family]
        if not engine.available() or expected not in {x["id"] for x in engine.profiles()}:
            raise RuntimeError(f"Cannot capture a verified {family} menu: model missing")

    sapi = WindowsSapiEngine() if os.name == "nt" else None
    state = ReaderState(archive, engine=sapi, additional_engines=local)
    state.local_voice_setup = LocalVoiceSetup(
        archive.root, ROOT / "install-local-voices-windows.ps1", local)
    lux = SprLuxEngine(archive.root)
    state.neural_setup = NeuralSetup(
        archive.root, ROOT / "install-neural-windows.ps1", lux)
    server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(state))
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    width, height = 1440, 900
    files = []
    errors = []
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": width, "height": height},
                                    device_scale_factor=1,
                                    reduced_motion="reduce")
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on("console", lambda msg: print("Browser console:", msg.type, msg.text)
                    if msg.type in ("error", "warning") else None)
            def ui_state():
                return page.evaluate("""() => ({
                    title: document.querySelector('#documentTitle')?.textContent,
                    status: document.querySelector('#status')?.textContent,
                    engines: Array.from(document.querySelector('#engineSelect')?.options || []).map(o=>o.value),
                    choices: document.querySelector('#localVoiceChoice')?.options.length,
                    libraryButtons: document.querySelectorAll('#library button').length,
                    passageButtons: document.querySelectorAll('#documentText .segment').length
                })""")
            try:
                page.goto(f"http://127.0.0.1:{server.server_port}/",
                          wait_until="domcontentloaded", timeout=30000)
                try:
                    page.wait_for_function(
                        "() => document.querySelector('#documentTitle')?.textContent"
                        ".includes('SPR Showroom') && "
                        "document.querySelector('#engineSelect')?.options.length >= 3 && "
                        "document.querySelector('#localVoiceChoice')?.options.length >= 12",
                        timeout=30000)
                except Exception:
                    print("SPR readiness failure, real browser state:",
                          json.dumps(ui_state(), indent=2), flush=True)
                    print("Browser script errors:", errors, flush=True)
                    raise
                print("SPR ready:", json.dumps(ui_state()), flush=True)
                page.locator("#documentText .segment").first.wait_for(timeout=15000)
                page.evaluate("document.fonts.ready")
                if errors:
                    raise RuntimeError("SPR JavaScript errors: " + "; ".join(errors))
                page.locator("aside").evaluate("(el) => { el.scrollTop = 0; }")
                page.wait_for_timeout(250)
                path = out_dir / "reader-overview.png"
                page.screenshot(path=str(path), animations="disabled")
                files.append(verify_png(path, width, height))

                # The real installed local voice appears in the actual app
                # engine and voice selector, not a test-supplied fake response.
                page.locator("#engineSelect").select_option("kokoro")
                print("Kokoro engine and voice selector:",
                      json.dumps(page.evaluate("""() => ({
                          engine: document.querySelector('#engineSelect')?.value,
                          voice: document.querySelector('#voice')?.value,
                          choices: Array.from(document.querySelector('#voice')?.options || []).map(o=>o.value),
                          errors: document.querySelector('#status')?.textContent
                      })""")), flush=True)
                if page.locator("#voice option[value='bm_george']").count() != 1:
                    raise RuntimeError("Live SPR Kokoro voice list did not expose bm_george")
                page.locator("#voice").select_option("bm_george")
                if page.locator("#voice").input_value() != "bm_george":
                    raise RuntimeError("SPR did not retain the explicitly chosen Kokoro voice")
                page.locator("#localVoiceChoice").select_option("kokoro-british")
                page.wait_for_function(
                    "() => document.querySelector('#localVoiceStatus')?.textContent"
                    ".includes('Installed and ready')")
                page.locator("aside").evaluate(
                    "(el) => { const section = document.querySelector('#localVoiceChoice')"
                    ".closest('section'); el.scrollTop = section.offsetTop - el.offsetTop - 20; }")
                page.wait_for_timeout(250)
                path = out_dir / "voice-library-kokoro.png"
                page.screenshot(path=str(path), animations="disabled")
                files.append(verify_png(path, width, height))

                page.locator("#engineSelect").select_option("piper")
                page.locator("#voice").select_option("en_GB-alan-medium")
                page.locator("#localVoiceChoice").select_option("en_GB-alan-medium")
                page.wait_for_function(
                    "() => document.querySelector('#voice')?.value === "
                    "'en_GB-alan-medium' && document.querySelector('#localVoiceStatus')"
                    "?.textContent.includes('Installed and ready')")
                page.wait_for_timeout(250)
                path = out_dir / "voice-library-piper.png"
                page.screenshot(path=str(path), animations="disabled")
                files.append(verify_png(path, width, height))
                if errors:
                    raise RuntimeError("SPR JavaScript errors: " + "; ".join(errors))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        for engine in local.values():
            engine.close()

    payload = {
        "capture": "real SPR loopback application UI; browser screenshot, not a WebView2 screenshot",
        "platform": "Windows GitHub Actions",
        "renderer": "Playwright Chromium",
        "document": record["title"] + " (synthetic non-private sample)",
        "installed_engines": ["kokoro", "piper"],
        "source_commit": os.getenv("GITHUB_SHA", "local"),
        "workflow_run": ("https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/"
                         + os.getenv("GITHUB_RUN_ID", "unknown")),
        "captured_utc": datetime.now(timezone.utc).isoformat(),
        "images": files
    }
    (out_dir / "capture.json").write_text(json.dumps(payload, indent=2) + "\n",
                                           encoding="utf-8")
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--data-dir", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(capture(args.output, args.data_dir), indent=2))
