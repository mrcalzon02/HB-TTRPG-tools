#!/usr/bin/env python3
"""Bounded, checkpointed Qwen-guided refinement of EXISTING MH7 Water Purifier.

Trusted Python owns Blender execution; Qwen only provides schema-validated geometry.
This is geometry candidate production, not visual/human/Factorio acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import traceback
import urllib.request

GOALS = (
    ("load_path", "Make the pressure vessel, its upper restraint and four red support pillars plausibly load-bearing; add only supports connecting existing surfaces."),
    ("filter_pump_path", "Connect two existing vertical filter cartridges, lower pump and central vessel by short physically supported supply/return runs. Keep cartridges removable and no extra ports."),
    ("pipe_interfaces", "Improve the existing raw-water inlet and purified-water outlet manifolds, preserve the two exact outward mouth planes X=-1.5 and X=+1.5 at Z=.36, and do not invent native Factorio connection cells."),
    ("controls_service", "Connect the existing low green CRT control module and cable relief to frame supports; preserve service clearance and forbid printed text."),
)
ALLOWED_MATERIALS = {"iron", "gunmetal", "steel", "red", "brass", "copper", "dark", "green", "cyan", "amber"}
FORBIDDEN = ("sign", "label", "text", "letter", "plaque", "arrow", "logo", "glyph", "decal", "window")
KINDS = {"box", "cylinder", "beam", "tube", "torus"}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def atomic(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, path)


def number(value, minimum, maximum):
    return type(value) in (int, float) and math.isfinite(value) and minimum <= value <= maximum


def position(v, width=3., height=3., margin=0.):
    return (isinstance(v, list) and len(v) == 3 and
            number(v[0], -width / 2 + margin, width / 2 - margin) and
            number(v[1], -height / 2 + margin, height / 2 - margin) and
            number(v[2], 0.1, 4.2))


def safe_actions(data, goal, limit=8):
    if not isinstance(data, dict) or not isinstance(data.get("additions"), list):
        raise ValueError("No Qwen additions list in response")
    result = []
    for proposed in data["additions"][:limit]:
        if not isinstance(proposed, dict):
            continue
        kind = proposed.get("type")
        mat = proposed.get("material", "steel")
        purpose = proposed.get("purpose", "")
        if kind not in KINDS or mat not in ALLOWED_MATERIALS or not isinstance(purpose, str):
            continue
        if not purpose.strip() or any(x in purpose.lower() for x in FORBIDDEN):
            continue
        p = {"type": kind, "material": mat, "purpose": purpose.strip()[:55], "goal": goal}
        if kind == "box":
            at, size = proposed.get("position"), proposed.get("size")
            if not position(at) or not isinstance(size, list) or len(size) != 3 or not all(number(v, .03, 1.65) for v in size):
                continue
            if abs(at[0]) + size[0]/2 > 1.47 or abs(at[1]) + size[1]/2 > 1.47:
                continue
            p.update(position=at, size=size)
        elif kind == "cylinder":
            at = proposed.get("position")
            radius, depth, axis = proposed.get("radius"), proposed.get("depth"), proposed.get("axis", "Z")
            if not position(at) or not number(radius, .025, .35) or not number(depth, .04, 1.5) or axis not in ("X", "Y", "Z"):
                continue
            if abs(at[0]) + radius > 1.47 or abs(at[1]) + radius > 1.47:
                continue
            p.update(position=at, radius=radius, depth=depth, axis=axis)
        elif kind == "torus":
            at=proposed.get("position")
            radius, thickness, axis=proposed.get("major_radius"), proposed.get("minor_radius"), proposed.get("axis", "Z")
            if not position(at) or not number(radius, .08, .7) or not number(thickness, .02, .08) or axis not in ("X", "Y", "Z"):
                continue
            if abs(at[0])+radius+thickness>1.47 or abs(at[1])+radius+thickness>1.47:
                continue
            p.update(position=at, major_radius=radius, minor_radius=thickness, axis=axis)
        else:
            start, end = proposed.get("start"), proposed.get("end")
            radius=proposed.get("radius", .08)
            if not position(start) or not position(end) or not number(radius, .025, .34 if kind == "tube" else .24):
                continue
            distance=math.dist(start,end)
            if not .10 <= distance <= 1.6:
                continue
            if kind == "tube" and not (.12 <= radius <= .32):
                continue
            p.update(start=start, end=end, radius=radius)
        if kind in ("beam","tube"):
            v=[end[j]-start[j] for j in range(3)]
            length=math.sqrt(sum(q*q for q in v))
            spread=[radius*math.sqrt(max(0.,1-(v[j]/length)**2)) for j in range(3)]
            lo=[min(start[j],end[j])-spread[j] for j in range(3)]
            hi=[max(start[j],end[j])+spread[j] for j in range(3)]
        elif kind=="box":
            lo=[at[j]-size[j]/2 for j in range(3)]
            hi=[at[j]+size[j]/2 for j in range(3)]
        elif kind=="cylinder":
            half=[radius]*3;half[{"X":0,"Y":1,"Z":2}[axis]]=depth/2
            lo=[at[j]-half[j] for j in range(3)]
            hi=[at[j]+half[j] for j in range(3)]
        else:
            half=[radius+thickness]*3
            half[{"X":0,"Y":1,"Z":2}[axis]]=thickness
            lo=[at[j]-half[j] for j in range(3)]
            hi=[at[j]+half[j] for j in range(3)]
        if (min(lo[:2]) < -1.505 or max(hi[:2]) > 1.505 or
                lo[2] < .085 or hi[2] > 4.595):
            continue
        result.append(p)
    return result


def qwen(endpoint, model, prompt, output_path, predict=1200):
    """One bounded local API call; no shell/file tools supplied to model."""
    data = {"model": model, "prompt": prompt, "format": "json", "stream": False,
            "keep_alive": "30s", "options": {"temperature": .12, "num_ctx": 4096,
                                               "num_predict": predict, "num_thread": 8}}
    request=urllib.request.Request(endpoint.rstrip("/")+"/api/generate",
                    data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    start=time.monotonic()
    with urllib.request.urlopen(request, timeout=360) as response:
        body=json.loads(response.read().decode("utf-8"))
    if body.get("done") is not True:
        raise RuntimeError("Qwen did not complete its structured inference")
    raw=body.get("response", "")
    try:
        output=json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError("Qwen output is not valid JSON") from e
    if not isinstance(output,dict):
        raise RuntimeError("Qwen returned a non-object JSON value")
    atomic(output_path,{"model":model,"endpoint":"localhost-only","prompt_sha256":hashlib.sha256(prompt.encode()).hexdigest(),
                  "response":output,"response_sha256":hashlib.sha256(raw.encode()).hexdigest(),
                  "latency_seconds":round(time.monotonic()-start,2),"eval_count":body.get("eval_count"),"done":True})
    return output


def planning_prompt():
    allowed=", ".join(g[0] for g in GOALS)
    detail="\n".join(f"{g[0]}: {g[1]}" for g in GOALS)
    return ("You are a practical Blender machinery construction planner for Factorio. The existing "
            "Water Purifier model already has real editable meshes and a render. Do not replace it. "
            "Produce an execution plan in JSON. Exactly one subgoal for each known goal ID in this order: " + allowed +
            ". Per subgoal include id, intent (max 130 chars) and acceptance_check (max 130 chars). "
            "Do not add goals or suggest modifying prototypes.\nGoals:\n"+detail+
            "\nReturn only {\"subgoals\":[{\"id\":\"...\",\"intent\":\"...\",\"acceptance_check\":\"...\"},...]}")


def validate_plan(doc):
    stages=doc.get("subgoals") if isinstance(doc,dict) else None
    if not isinstance(stages,list) or [x.get("id") for x in stages if isinstance(x,dict)] != [g[0] for g in GOALS]:
        raise ValueError("Qwen did not honor the four required construction goals")
    out=[]
    for stage in stages:
        desc=stage.get("intent"); check=stage.get("acceptance_check")
        if not all(isinstance(v,str) and 4 <= len(v) <= 180 for v in (desc,check)):
            raise ValueError("Incomplete or unbounded Qwen goal")
        out.append({"id":stage["id"],"intent":desc,"acceptance_check":check})
    return out


def action_prompt(task, stage, previous, audit):
    anchors = {
        "load_path": ("vessel", "pillar", "frame", "support", "roof"),
        "filter_pump_path": ("filter", "cartridge", "pump", "motor", "vessel"),
        "pipe_interfaces": ("water", "inlet", "outlet", "mouth", "neck", "receiver", "pipe"),
        "controls_service": ("control", "crt", "cable", "screen", "button", "service"),
    }.get(stage["id"], ())
    component_hints = [
        {"name": x["name"], "center": x["center_xyz"], "bounds": x["bounds_xyz"]}
        for x in audit.get("components", [])
        if any(k in x["name"].lower() for k in anchors)
    ][:14]
    return ("You are refining a PRE-EXISTING editable 3x3-tile Factorio Water Purifier Blender machine. "
            "The original model already has vessel, filters, motor, pipe mouths and green CRT. "
            "Do not delete or replace any original part. Preserve the camera and the mouth planes "
            "raw_water_input at X=-1.5 Y=-.78 Z=.36; purified_water_output at X=+1.5 Y=-.62 Z=.36. "
            "Native Factorio prototype connection coordinates remain unknown: NEVER INVENT them. "
            "Choose 3 to 6 justified, physically joined functional geometry components for ONE subgoal. "
            "No labels, signs, etched text, spare floating rings, arbitrary bolts or unsupported piping. "
            "Do not change outer footprint. Current machine anchor Z=0. The primary vessel is centered near X=0 Y=.1. "
            f"Goal ID {stage['id']}: {task}\nSpecific plan: {stage['intent']}. Acceptance: {stage['acceptance_check']}. "
            f"Prior additions count {len(previous)}. Exact measured source object coordinates for this goal: {json.dumps(component_hints, separators=(',',':'))[:1500]}. "
            f"Most recent verified Blender summary: {json.dumps({k:v for k,v in audit.items() if k!='components'}, separators=(',',':'))[:500]}. "
            "Only offer operations box(position[x,y,z],size[dx,dy,dz]), "
            "cylinder(position,radius,depth,axis X/Y/Z), beam(start,end,radius), "
            "tube(start,end,radius) where tube is a real hollow straight section, "
            "torus(position,major_radius,minor_radius,axis X/Y/Z). Units are tiles. "
            "All X,Y centers between -1.5 and +1.5; Z .1 to 4.2, each piece inside footprint. "
            "Materials iron,gunmetal,steel,red,brass,copper,dark,green,cyan,amber. "
            "Write JSON only {\"additions\":[{\"type\":\"beam\",\"start\":[0,0,1],\"end\":[.4,0,1],\"radius\":.08,\"material\":\"red\",\"purpose\":\"supported upper vessel tie\"}]}. "
            "Never output Python, executable commands, paths, YAML or explanations.")


def execute(cmd, log, timeout):
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("w",encoding="utf-8",errors="replace") as f:
        f.write(json.dumps([str(x) for x in cmd])+"\n"); f.flush()
        r=subprocess.run([str(x) for x in cmd],stdout=f,stderr=subprocess.STDOUT,timeout=timeout,check=False)
        f.write(f"\nReturn code {r.returncode}\n")
    if r.returncode:
        excerpt=log.read_text(encoding="utf-8",errors="replace")[-6500:]
        raise RuntimeError(f"Blender step returned {r.returncode}: {log}\\n{excerpt}")


def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--baseline",required=True)
    p.add_argument("--baseline-checkpoint",required=True)
    p.add_argument("--repo",required=True)
    p.add_argument("--out",required=True)
    p.add_argument("--report",required=True)
    p.add_argument("--blender",required=True)
    p.add_argument("--endpoint",required=True)
    p.add_argument("--model",required=True)
    p.add_argument("--source-sha",required=True)
    a=p.parse_args(argv)
    root=Path(__file__).resolve().parent;out=Path(a.out).resolve();report=Path(a.report).resolve()
    out.mkdir(parents=True,exist_ok=True);report.mkdir(parents=True,exist_ok=True)
    base=Path(a.baseline).resolve();original_sha=digest(base)
    cp=json.loads(Path(a.baseline_checkpoint).read_text(encoding="utf-8"))
    if cp.get("state")!="model_verified" or cp.get("blend_sha256")!=original_sha:
        raise RuntimeError("Original saved Water Purifier Blender source is not checkpoint-verified")
    repo=Path(a.repo).resolve();packet=repo/"docs/art/metallic-hydrogen-chain"
    spec=json.loads((packet/"JOB_SPEC.json").read_text(encoding="utf-8"))
    if [t["id"] for t in spec["tasks"]][:1]!=["water-purifier"]:
        raise RuntimeError("Wrong build packet")
    if digest(repo/spec["reference"]["path"]) != spec["reference"]["sha256"]:
        raise RuntimeError("Authoritative artwork hash mismatch")
    if not a.endpoint.startswith("http://127.0.0.1:") or not ("qwen" in a.model.lower()):
        raise RuntimeError("An actual localhost Qwen endpoint is mandatory; no scripted fallback")
    checkpoint=out/"GOAL_CHECKPOINT.json"
    state={"schema":1,"source_sha":a.source_sha,"baseline_sha256":original_sha,
           "machine":"water-purifier","model":a.model,"stage":"planning","completed_goals":[],
           "state":"running","human_visual_review":"pending","native_factorio_ports_verified":False}
    accumulated=[]
    # Never rebuild or overwrite verified earlier stages. The OLD-CORE30 runner
    # preserves these original per-goal Blender sources between workflow attempts.
    if checkpoint.exists():
        old=json.loads(checkpoint.read_text(encoding="utf-8"))
        if old.get("source_sha")!=a.source_sha or old.get("baseline_sha256")!=original_sha:
            raise RuntimeError("Existing saved goal checkpoint is from different authoritative source; refusing overwrite")
        completed=old.get("completed_goals",[])
        if completed != [code for code,_ in GOALS][:len(completed)]:
            raise RuntimeError("Prior completed-goal order is not a known verified prefix")
        for idx,code in enumerate(completed,1):
            slug=f"goal-{idx:02d}-{code}"
            dest=out/slug
            candidate=dest/"water-purifier-pilot.blend"
            glb=dest/"water-purifier-pilot.glb"
            view=dest/"inspection_3quarter.png"
            audit=json.loads((dest/"geometry_audit.json").read_text(encoding="utf-8"))
            verification=json.loads((dest/"verify.json").read_text(encoding="utf-8"))
            geometry=json.loads((dest/"geometry.json").read_text(encoding="utf-8"))
            if not (audit.get("pass") and verification.get("pass") and
                    audit.get("baseline_sha256")==original_sha and
                    audit.get("blend_sha256")==digest(candidate) and
                    audit.get("glb_sha256")==digest(glb) and
                    audit.get("preview_sha256")==digest(view) and
                    verification.get("blend_sha256")==digest(candidate) and
                    verification.get("glb_sha256")==digest(glb) and
                    geometry.get("baseline_sha256")==original_sha and
                    audit.get("inferred_part_count")==len(geometry.get("additions",[]))):
                raise RuntimeError("Prior stage checkpoint no longer matches native saved Blender/GLB/render: "+slug)
            accumulated=geometry["additions"]
            visible=report/"water-purifier-goal-pilot"/slug
            visible.mkdir(parents=True,exist_ok=True)
            for filename in ("water-purifier-pilot.blend","water-purifier-pilot.glb",
                             "inspection_3quarter.png","geometry_audit.json","verify.json",
                             "inference.json","geometry.json","blender-build.log"):
                f=dest/filename
                if f.exists():shutil.copy2(f,visible/f.name)
            print("MH7_GOAL_RESUMED "+slug+" native artifacts rechecked",flush=True)
        state.update({k:v for k,v in old.items() if k.startswith("last_")})
        state["completed_goals"]=list(completed)
    atomic(checkpoint,state)
    atomic(report/"pilot-progress.json",state)
    plan_path=out/"GOAL_PLAN.json"
    if plan_path.exists() and state["completed_goals"]:
        saved_plan=json.loads(plan_path.read_text(encoding="utf-8"))
        plan=validate_plan({"subgoals": saved_plan["goals"]})
        print("MH7_GOAL_PLAN_REUSED source=local-qwen previous_verified="+str(len(state["completed_goals"])),flush=True)
    else:
        plan=validate_plan(qwen(a.endpoint,a.model,planning_prompt(),out/"plan-inference.json",1100))
        atomic(plan_path,{"goals":plan,"source":"local-qwen","required_goal_count":4})
    inspection_path=out/"baseline-inspection.json"
    if not inspection_path.exists() or not state["completed_goals"]:
        execute([a.blender,"--background","--threads","4","--python-exit-code","1",
                 "--python",root/"inspect_baseline.py","--","--blend",base,
                 "--out",inspection_path],out/"baseline-inspection.log",300)
    measured=json.loads(inspection_path.read_text(encoding="utf-8"))
    if measured.get("baseline_sha256") != original_sha or len(measured.get("components",[]))<20:
        raise RuntimeError("Independent baseline inspection failed; component anchors unavailable")
    metrics={"baseline_verified":True,"prototype_ports_verified":False,"visual_review":"pending",
             "components":measured["components"]}
    if state["completed_goals"]:
        last=out/("goal-%02d-%s" % (len(state["completed_goals"]),state["completed_goals"][-1]))/"verify.json"
        verified=json.loads(last.read_text(encoding="utf-8"))
        metrics.update(object_count=verified["source_meshes"],bbox=verified["source_world_bounds"],
                       new_parts=len(accumulated),native_pipe_alignment_verified=False)
    for i,(code,description) in enumerate(GOALS,1):
        goal=plan[i-1];slug=f"goal-{i:02d}-{code}"
        if code in state["completed_goals"]:
            continue
        dest=out/slug;dest.mkdir(parents=True,exist_ok=True)
        state.update(stage=slug,active_goal=code)
        atomic(checkpoint,state);atomic(report/"pilot-progress.json",state)
        actions=[]
        for generation_attempt in (1,2):
            extra=("" if generation_attempt==1 else " The previous candidate failed the safe geometry schema; use centers inside +/-1.2, legal radii, no unsupported projections.")
            reply=qwen(a.endpoint,a.model,
                       action_prompt(description,goal,accumulated,metrics)+extra,
                       dest/("inference-attempt-%d.json" % generation_attempt),1450)
            actions=safe_actions(reply,code)
            if len(actions)>=2:
                shutil.copy2(dest/("inference-attempt-%d.json" % generation_attempt),dest/"inference.json")
                break
        if len(actions)<2:
            state.update(state="blocked",blocker=f"Qwen supplied fewer than 2 valid geometry operations for {code}; see recorded attempts")
            atomic(checkpoint,state);atomic(report/"pilot-progress.json",state)
            raise RuntimeError(state["blocker"])
        accumulated+=actions
        atomic(dest/"geometry.json",{"schema":1,"baseline_sha256":original_sha,"stage":code,
                                    "source":"Qwen Coder constrained operations","additions":accumulated})
        execute([a.blender,"--background","--factory-startup","--threads","6","--python-exit-code","1",
                 "--python",root/"refine_existing_purifier.py","--","--baseline",base,"--geometry",dest/"geometry.json",
                 "--out",dest],dest/"blender-build.log",1500)
        candidate=dest/"water-purifier-pilot.blend";glb=dest/"water-purifier-pilot.glb"
        execute([a.blender,"--background","--threads","4","--python-exit-code","1","--python",
                 root/"verify_machine.py","--","--blend",candidate,"--glb",glb,"--out",dest/"verify.json"],
                 dest/"blender-verify.log",400)
        actual=json.loads((dest/"geometry_audit.json").read_text(encoding="utf-8"))
        verify=json.loads((dest/"verify.json").read_text(encoding="utf-8"))
        if not verify.get("pass") or not actual.get("pass") or actual.get("inferred_part_count")!=len(accumulated):
            raise RuntimeError(f"Geometric readback failed for {code}")
        metrics={"object_count":verify["source_meshes"], "new_parts":actual["inferred_part_count"],
                 "bbox":verify["source_world_bounds"],"frozen_base_sha":original_sha,
                 "native_pipe_alignment_verified":False,"human_visual_review":"pending",
                 "components":measured["components"]}
        state["completed_goals"].append(code)
        state["last_saved_blend_sha256"]=digest(candidate)
        state["last_render_sha256"]=digest(dest/"inspection_3quarter.png")
        state["last_glb_sha256"]=digest(glb)
        state["last_audit_sha256"]=digest(dest/"geometry_audit.json")
        state["last_stage_dir"]=slug
        atomic(checkpoint,state);atomic(report/"pilot-progress.json",state)
        # Always surface candidate and verified receipts as a proper Actions artifact.
        visible=report/"water-purifier-goal-pilot"/slug;visible.mkdir(parents=True,exist_ok=True)
        for file in (candidate,glb,dest/"inspection_3quarter.png",dest/"geometry_audit.json",
                     dest/"verify.json",dest/"inference.json",dest/"geometry.json",dest/"blender-build.log"):
            shutil.copy2(file,visible/file.name)
        print(f"MH7_GOAL_COMPLETED {i}/4 {code} blend={state['last_saved_blend_sha256']}",flush=True)
    final={"machine":"water-purifier","state":"candidate_goal_pilot","model":a.model,
           "qwen_goals_completed":len(state["completed_goals"]),"goal_ids":state["completed_goals"],
           "baseline_sha256":original_sha,"candidate_sha256":state["last_saved_blend_sha256"],
           "render_sha256":state["last_render_sha256"],"native_ports_verified":False,
           "human_visual_approval":False,"game_integrated":False,
           "known_limitations":["Qwen evaluated structured geometry readback, not image pixels",
               "Generated additions need human visual inspection", "No native Factorio pipe attachment verified"]}
    atomic(out/"GOAL_RESULTS.json",final)
    atomic(report/"GOAL_RESULTS.json",final)
    shutil.copy2(out/"GOAL_PLAN.json",report/"GOAL_PLAN.json")
    state.update(state="candidate_goal_pilot",stage="done")
    atomic(checkpoint,state);atomic(report/"pilot-progress.json",state)
    print("MH7_GOAL_PILOT_CANDIDATE_SAVED",flush=True)

if __name__=="__main__":
    try:
        main()
    except Exception as exc:
        details=traceback.format_exc()
        print("MH7_GOAL_PILOT_FATAL "+str(exc),flush=True)
        print(details,flush=True)  # stdout: Windows PowerShell must not truncate stderr ErrorRecord
        try:
            args=sys.argv
            report_dir=Path(args[args.index("--report")+1])
            atomic(report_dir/"pilot-error.json",{"error":str(exc),"traceback":details,
                   "phase":"failed","last_progress_file":"pilot-progress.json"})
        except Exception:
            pass
        raise SystemExit(1)
