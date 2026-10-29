#!/usr/bin/env python3
"""Launch the actual checked-out game frontend and capture its live menus."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "hb-game-menu-checkouts"
OUT = ROOT / "captures"
PROJECTS = [
    ("NUTBUSTER-R", "nut", "web"),
    ("Jewel_Brook", "jewel", "web"),
    ("Fleet-designer", "fleet", "vite"),
]
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
summary = {}

def run(cmd, cwd=None, timeout=600):
    subprocess.run(cmd, cwd=cwd, check=True, timeout=timeout)

def start(cmd, cwd, logname):
    log = (OUT / logname).open("w", encoding="utf-8")
    process = subprocess.Popen(cmd, cwd=cwd, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    return process, log

for i, (repo, mode, kind) in enumerate(PROJECTS):
    folder = WORK / repo
    server = None
    stream = None
    try:
        if not folder.exists():
            run(["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
                 "https://github.com/mrcalzon02/" + repo + ".git", str(folder)], timeout=900)
        if kind == "web":
            run(["git", "sparse-checkout", "set", "web"], cwd=folder, timeout=900)
        else:
            run(["git", "sparse-checkout", "set", "src", "electron"], cwd=folder, timeout=900)
        revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=folder, text=True).strip()
        port = 8910 + i
        if kind == "web":
            server, stream = start([sys.executable, "-m", "http.server", str(port),
                                    "--bind", "127.0.0.1"], folder / "web", repo + ".log")
        else:
            run(["npm", "install", "--no-audit", "--no-fund"], cwd=folder, timeout=540)
            server, stream = start(["npm", "run", "dev", "--", "--host", "127.0.0.1",
                                    "--port", str(port), "--strictPort"], folder, repo + ".log")
        url = "http://127.0.0.1:" + str(port) + "/"
        for _ in range(80):
            if server.poll() is not None:
                raise RuntimeError("Game server exited before startup; see log")
            try:
                with urllib.request.urlopen(url, timeout=2) as response:
                    if response.status == 200:
                        break
            except Exception:
                pass
            time.sleep(1)
        else:
            raise RuntimeError("Game server never became reachable")
        run(["node", str(ROOT / "tools/game-menu-capture/capture-browser.mjs"),
             url, str(OUT / repo), mode, revision], cwd=ROOT, timeout=150)
        summary[repo] = {"status":"captured","revision":revision}
    except Exception as exc:
        summary[repo] = {"status":"failed","reason":str(exc)}
        print("::warning::" + repo + " menu capture failed: " + str(exc),flush=True)
    finally:
        if server:
            server.terminate()
            try:
                server.wait(timeout=7)
            except subprocess.TimeoutExpired:
                server.kill()
        if stream:
            stream.close()

(OUT / "browser-summary.json").write_text(json.dumps(summary, indent=2)+"\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
if not any(item["status"] == "captured" for item in summary.values()):
    sys.exit("No browser game could produce a verified menu image")
