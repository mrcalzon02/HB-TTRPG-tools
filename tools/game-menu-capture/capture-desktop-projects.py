#!/usr/bin/env python3
"""Build real native/desktop game clients and capture visible live menu windows."""
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[2]
WORK=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"hb-desktop-menu-checkouts"
OUT=ROOT/"captures"
OUT.mkdir(exist_ok=True)
WORK.mkdir(parents=True,exist_ok=True)

# All commands run in a real Xvfb desktop; never use synthetic/offscreen preview art.
GAMES=[
    ("powerpong",["src"],["mvn","-B","-q","-DskipTests","package"],
     ["java","-Djava.awt.headless=false","-jar","target/powerpong.jar"],"PowerPong"),
    ("The-Malefic-Veil",["src","assets"],["bash","-lc",
     "mkdir -p out && javac --release 17 -encoding UTF-8 -d out src/main/java/hbnet/*.java src/main/java/veil/*.java src/main/java/dev/mrcalzon/water/*.java"],
     ["java","-Djava.awt.headless=false","-cp","out","veil.MaleficVeil"],"Malefic"),
    ("The-Beckenburg-Project",["src","assets/runtime","art/menu-backgrounds","water-module","development"],
     ["bash","build.sh"],["java","-Djava.awt.headless=false","-jar","build/beckenburg-game.jar"],"Beckenburg"),
    ("TheMechanist",["src","PACKAGE_client","PACKAGE_launcher","client","config"],
     ["mvn","-B","-DskipTests","package"],
     ["java","-Djava.awt.headless=false","-jar","target/TheMechanist-all.jar"],"Mechanist"),
    ("Catastrophic-Diplomacy",["core","game","desktop","assets","asset_packs"],
     ["gradle","--no-daemon",":desktop:classes"],
     ["gradle","--no-daemon",":desktop:run"],"Diplomacy"),
]

env=os.environ.copy()
env["DISPLAY"]=":98"
env["LIBGL_ALWAYS_SOFTWARE"]="1"
env["GIT_LFS_SKIP_SMUDGE"]="1"
server=subprocess.Popen(["Xvfb",":98","-screen","0","1280x800x24","-ac"],
                        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(2)
if server.poll() is not None:
    raise SystemExit("Xvfb desktop unavailable")
manager=subprocess.Popen(["openbox","--sm-disable"],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(2)
if manager.poll() is not None:
    server.terminate()
    raise SystemExit("X11 window manager unavailable")
summary={}

def execute(command,cwd,log,timeout=750):
    with (OUT/log).open("w",encoding="utf-8") as stream:
        subprocess.run(command,cwd=cwd,env=env,stdout=stream,stderr=subprocess.STDOUT,
                       timeout=timeout,check=True)

def windows():
    p=subprocess.run(["wmctrl","-l"],env=env,capture_output=True,text=True,check=False)
    return [line.split(None,3) for line in p.stdout.splitlines() if line.strip()]

try:
    for repo,paths,build,launch,title in GAMES:
        dest=OUT/repo
        proc=None
        try:
            folder=WORK/repo
            if not folder.exists():
                execute(["git","clone","--depth","1","--filter=blob:none","--sparse",
                         "https://github.com/mrcalzon02/"+repo+".git",str(folder)],
                         WORK,repo+"-clone.log",timeout=900)
            execute(["git","sparse-checkout","set"]+paths,folder,repo+"-checkout.log",timeout=900)
            revision=subprocess.check_output(["git","rev-parse","HEAD"],cwd=folder,text=True).strip()
            execute(build,folder,repo+"-build.log",timeout=900)
            known={w[0] for w in windows()}
            with (OUT/(repo+"-runtime.log")).open("w",encoding="utf-8") as log:
                proc=subprocess.Popen(launch,cwd=folder,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
                picked=None
                for _ in range(45):
                    if proc.poll() is not None:
                        raise RuntimeError("Client exited before menu; inspect runtime log")
                    matches=[w[0] for w in windows() if w[0] not in known and
                             (len(w)>3 and title.lower() in w[3].lower())]
                    if matches:
                        picked=matches[-1]
                        break
                    time.sleep(1)
                if not picked:
                    # Name matching is deliberately strict: don't publish an unrelated desktop.
                    raise RuntimeError("No verified visible game window titled "+title)
                time.sleep(9)
                if proc.poll() is not None:
                    raise RuntimeError("Game closed before its menu was captured")
                subprocess.run(["wmctrl","-ia",picked],env=env,check=True,timeout=15)
                dest.mkdir(parents=True,exist_ok=True)
                screenshot=dest/"title.png"
                subprocess.run(["scrot","-u","-o",str(screenshot)],env=env,check=True,timeout=20)
                data=screenshot.read_bytes()
                if len(data)<12000 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
                    raise RuntimeError("Not a valid game framebuffer screenshot")
                sha=hashlib.sha256(data).hexdigest()
                evidence={"repoSha":revision,"origin":"Actual visible Java/desktop client window on Xvfb, captured with scrot",
                          "windowTitle":title,"capturedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
                          "shots":[{"name":"title","file":"title.png","sha256":sha,"bytes":len(data)}]}
                (dest/"capture.json").write_text(json.dumps(evidence,indent=2)+"\n",encoding="utf-8")
                summary[repo]={"status":"captured","revision":revision}
        except Exception as exc:
            summary[repo]={"status":"failed","reason":str(exc)}
            print("::warning::"+repo+": "+str(exc),flush=True)
        finally:
            if proc:
                try:
                    os.killpg(proc.pid,signal.SIGTERM)
                    proc.wait(timeout=5)
                except Exception:
                    try: os.killpg(proc.pid,signal.SIGKILL)
                    except Exception: pass
finally:
    manager.terminate()
    manager.wait(timeout=8)
    server.terminate()
    server.wait(timeout=8)
(OUT/"desktop-summary.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print(json.dumps(summary,indent=2))
if not any(x["status"]=="captured" for x in summary.values()):
    sys.exit("No native menu capture passed")
