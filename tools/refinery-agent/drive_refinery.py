#!/usr/bin/env python3
"""Resumable, single-process controller for the seven-mesh refinery Blender pilot.

Language model output is a bounded JSON *suggestion*, not arbitrary executable code.
This launcher needs only Python stdlib, Blender, and a job-owned local Ollama API.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.error

ORDER=('water-purifier','electrolyzer','hydrogen-compressor','metallization-crucible','pelletization-forge','pressure-vessel-fabricator','canister-assembler')
MAT={'iron','gunmetal','steel','red','brass','copper','dark','cyan','green','amber'}
TYPES={'box','cylinder','beam','torus'}

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def put(path,thing):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
    tmp=p.with_suffix(p.suffix+'.tmp')
    tmp.write_text(json.dumps(thing,indent=2,sort_keys=True),encoding='utf-8')
    os.replace(tmp,p)
def run(cmd,log,timeout=1300):
    p=Path(log);p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('w',encoding='utf-8',errors='replace') as f:
        f.write('Command: '+repr([str(c) for c in cmd])+'\n');f.flush()
        proc=subprocess.run([str(c) for c in cmd],stdout=f,stderr=subprocess.STDOUT,timeout=timeout,check=False)
        f.write('\nExit code: '+str(proc.returncode)+'\n')
    if proc.returncode!=0:raise RuntimeError('Process failed ('+str(proc.returncode)+'): '+str(log))
def bad(reason):raise ValueError(reason)

def vec(x,lim=7):
    if not isinstance(x,list) or len(x)!=3 or any(type(v) not in (int,float) or not(-lim<=v<=lim) for v in x): bad('Invalid 3D vector')
    return [float(v) for v in x]
def bounded_additions(data,footprint):
    if not isinstance(data,dict) or not isinstance(data.get('additions'),list):bad('Qwen response lacks additions list')
    w,h=footprint;safe=[]
    for p in data['additions'][:18]:
        if not isinstance(p,dict) or p.get('type') not in TYPES:continue
        typ=p['type'];col=p.get('material','steel')
        if col not in MAT:continue
        try:
            if typ in ('box','cylinder','torus'):
                pos=vec(p.get('position'))
                if abs(pos[0])>w*.5+.025 or abs(pos[1])>h*.5+.025 or not .1<=pos[2]<=5.5:continue
            if typ=='box':
                size=vec(p.get('size'))
                if any(not(.025<=v<=2) for v in size):continue
                if abs(pos[0])+size[0]*.5>w*.5 or abs(pos[1])+size[1]*.5>h*.5:continue
                v={'type':typ,'position':pos,'size':size,'material':col}
            elif typ=='cylinder':
                r,d=p.get('radius'),p.get('depth')
                if type(r) not in (float,int) or type(d) not in (float,int) or not(.025<=r<=.45 and .025<=d<=2):continue
                v={'type':typ,'position':pos,'radius':float(r),'depth':float(d),'axis':p.get('axis') if p.get('axis') in 'XYZ' else 'Z','material':col}
            elif typ=='torus':
                r,d=p.get('major_radius'),p.get('minor_radius')
                if type(r) not in (float,int) or type(d) not in (float,int) or not(.06<=r<=1.2 and .012<=d<=.12):continue
                v={'type':typ,'position':pos,'major_radius':float(r),'minor_radius':float(d),'axis':p.get('axis') if p.get('axis') in 'XYZ' else 'Z','material':col}
            else:
                a,b=vec(p.get('start')),vec(p.get('end'))
                if any(abs(q[0])>w*.5 or abs(q[1])>h*.5 or not(0<=q[2]<=5.5) for q in (a,b)):continue
                r=p.get('radius',.08)
                if type(r) not in (float,int) or not(.025<=r<=.18):continue
                v={'type':typ,'start':a,'end':b,'radius':float(r),'material':col}
            purpose=str(p.get('purpose','functional reinforcement')).lower().strip()[:45]
            if any(b in purpose for b in ('sign','label','word','text','glyph','letter','logo','arrow')):continue
            v['purpose']=purpose;safe.append(v)
        except (ValueError,TypeError):continue
    return safe

def qwen_refine(endpoint,model,task,registry,inventory,output):
    if endpoint == 'none' or model.startswith('none-'):
        put(Path(output)/'inference_receipt.json',{'state':'unavailable','model':model,'reason':'No accessible Qwen inference runtime on self-hosted Windows runner; scripted Blender geometry only.'})
        return [],'unavailable'
    controls='small physically recessed green monochrome CRT and real buttons, no signs or writing'
    usr=(f"You are an industrial machinery designer augmenting an EXISTING editable Blender model.\n"
         f"Machine: {task['name']}, id={task['id']}, size={task['planned_footprint_tiles']} Factorio tiles.\n"
         f"Required visible mechanisms: {', '.join(task['must_have_visible_assemblies'])}.\n"
         f"Avoid: {'; '.join(task['specific_design_hazards'])}.\n"
         f"Reference: red oxide steel cast load frames, dark iron machine bodies, brass process collars, {controls}.\n"
         f"The machine ALREADY has its vessel, base and supports built by a trusted parametric seed."
         f" Suggest 5-12 additional REAL structural visible parts ONLY to help support or route those mechanisms."
         f" Do NOT add new fluid ports, stray bolts, decorative rings, canisters, signage or unsupported tubing."
         f" Footprint +/-X <= {task['planned_footprint_tiles'][0]/2}, +/-Y <= {task['planned_footprint_tiles'][1]/2}, Z 0..5.5."
         f" Existing verified kit: {[x.get('part_id') for x in registry.get('parts',[]) if x.get('status')=='verified'][:7]}."
         f" Related source files: {inventory[:7]}."
         f" Reply with JSON object ONLY, key additions: array of objects,"
         f" each one of type box(position [x,y,z], size [dx,dy,dz]),"
         f" cylinder(position, radius, depth, axis X/Y/Z), beam(start [xyz],end [xyz],radius),"
         f" torus(position,major_radius,minor_radius,axis X/Y/Z)."
         f" Material in iron,gunmetal,steel,red,brass,copper,dark,cyan,green,amber."
         f" Add a short purpose property for each. Do not put code or comments in JSON.")
    output=Path(output)
    for attempt in (1,2):
        req={'model':model,'prompt':usr,'format':'json','stream':False,'keep_alive':'30s',
             'options':{'temperature':.17,'num_ctx':4096,'num_predict':1300,'num_thread':8}}
        try:
            raw=json.dumps(req).encode()
            request=urllib.request.Request(endpoint.rstrip('/')+'/api/generate',data=raw,headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(request,timeout=900) as resp:reply=json.loads(resp.read().decode())
            data=json.loads(reply.get('response',''))
            safe=bounded_additions(data,task['planned_footprint_tiles'])
            put(output/'inference_receipt.json',{'state':'success','model':model,'attempt':attempt,'generated':len(data.get('additions',[])),'accepted':len(safe),'done':reply.get('done',False),'prompt_sha256':hashlib.sha256(usr.encode()).hexdigest()})
            return safe,'success'
        except Exception as exc:
            put(output/'inference_receipt.json',{'state':'failed','attempt':attempt,'model':model,'exception':str(exc)[:450]})
            if attempt==1: time.sleep(3)
    return [],'failed'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--repo',required=True);parser.add_argument('--out',required=True);parser.add_argument('--report',required=True)
    parser.add_argument('--blender',required=True);parser.add_argument('--endpoint',required=True);parser.add_argument('--model',required=True)
    parser.add_argument('--source-sha',required=True);parser.add_argument('--max-machines',type=int,default=7)
    a=parser.parse_args();repo=Path(a.repo).resolve();out=Path(a.out).resolve();report=Path(a.report).resolve()
    out.mkdir(parents=True,exist_ok=True);report.mkdir(parents=True,exist_ok=True)
    packet=repo/'docs/art/metallic-hydrogen-chain';spec=json.loads((packet/'JOB_SPEC.json').read_text(encoding='utf-8'))
    if len(spec['tasks'])!=7 or [t['id'] for t in spec['tasks']]!=list(ORDER):bad('Incorrect construction packet order')
    # The authoritative user-approved artwork is pinned, not inferred from an Internet stand-in.
    board=repo/spec['reference']['path'];assert sha(board)==spec['reference']['sha256']
    scripts=Path(__file__).resolve().parent
    registry_path=out/'shared-parts/metallic-hydrogen/registry.json'
    if registry_path.exists():registry=json.loads(registry_path.read_text(encoding='utf-8'))
    else:
        registry=json.loads((packet/'PARTS_REGISTRY_TEMPLATE.json').read_text(encoding='utf-8'))
        put(registry_path,registry)
    inventory=[]
    for base in [repo/'art/source-to-3d/condenser-v19',repo/'art/source-to-3d/condenser-v21',repo/'art/source-to-3d/boiler-v08',repo/'art/source-to-3d/emergency-miner']:
        if base.exists(): inventory.extend(str(p.relative_to(repo)) for p in base.rglob('*.blend'))
    put(report/'source_census.json',{'repo_head':a.source_sha,'found_blender_files':inventory[:60],
       'legacy_upstream_native_status':'unlocated_unless_independently_recovered','board_sha256':sha(board)})
    progress_path=report/'progress.json';completed=[];blocked=[];inference_outcomes={}
    for i,task in enumerate(spec['tasks'][:min(7,a.max_machines)],1):
        ident=task['id'];stage=out/'machines'/ident;stage.mkdir(parents=True,exist_ok=True)
        dest=report/'machines'/ident;dest.mkdir(parents=True,exist_ok=True)
        checkpoint=stage/'CHECKPOINT.json'
        previous=json.loads(checkpoint.read_text(encoding='utf-8')) if checkpoint.exists() else {}
        # A Qwen run must not silently accept a previously saved scripted-only pilot.
        compatible_inference=(previous.get('inference_state')=='success' if not a.model.startswith('none-')
                              else previous.get('inference_state')=='unavailable')
        if previous.get('state')=='model_verified' and compatible_inference and all((stage/name).exists() for name in (ident+'.blend',ident+'.glb','inspection_3quarter.png','verified_model.json')):
            try:
                if sha(stage/'inspection_3quarter.png')==previous['preview_sha256']:
                    # The previous model exists on persistent D: but not necessarily
                    # in this new run's artifact folder. Copy its saved evidence
                    # instead of rerendering or dropping its files on resume.
                    for old_file in (ident+'.blend',ident+'.glb','inspection_3quarter.png',
                                     'build_receipt.json','verified_model.json','CHECKPOINT.json',
                                     'inference_receipt.json','parts_extracted.json'):
                        src=stage/old_file
                        if src.is_file():shutil.copy2(src,dest/src.name)
                    completed.append(ident);inference_outcomes[ident]=previous.get('inference_state');print('MH7_RESUME_SKIP '+ident,flush=True)
                    put(progress_path,{'machine':ident,'index':i,'total':7,'state':'resume_skip','completed':completed,'blocked':blocked})
                    continue
            except KeyError:pass
        print('MH7_MACHINE_START '+str(i)+'/7 '+ident,flush=True)
        put(progress_path,{'machine':ident,'index':i,'total':7,'state':'building','completed':completed,'blocked':blocked})
        put(checkpoint,{'machine':ident,'state':'inference_pending','source_sha':a.source_sha,'registry_sha256':sha(registry_path)})
        try:
            additions,infer_status=qwen_refine(a.endpoint,a.model,task,registry,inventory,stage)
            inference_outcomes[ident]=infer_status
            if infer_status!='success':
                print('MH7_WARNING inference failed for '+ident+'; deterministic physical seed only',flush=True)
            mods={'registry':registry,'additions':additions,'inference_state':infer_status}
            put(stage/'inference_design.json',mods)
            put(checkpoint,{'machine':ident,'state':'inference_recorded','inference_state':infer_status,'accepted_additions':len(additions),'source_sha':a.source_sha})
            run([a.blender,'--background','--factory-startup','--threads','6','--python-exit-code','1','--python',scripts/'build_machine.py',
                '--','--spec',packet/'JOB_SPEC.json','--machine',ident,'--out',stage,'--modifications',stage/'inference_design.json'],stage/'build.log',timeout=1400)
            put(checkpoint,{'machine':ident,'state':'native_saved','blend_sha256':sha(stage/(ident+'.blend')),'source_sha':a.source_sha})
            run([a.blender,'--background','--threads','4','--python-exit-code','1','--python',scripts/'verify_machine.py',
                '--','--blend',stage/(ident+'.blend'),'--glb',stage/(ident+'.glb'),'--out',stage/'verified_model.json'],stage/'verify.log',timeout=700)
            # Harvest actual meshed parts from native scene, then independently GLB-import them.
            temp=stage/'parts_extracted.json'
            run([a.blender,'--background','--threads','4','--python-exit-code','1','--python',scripts/'extract_parts.py',
                '--','--blend',stage/(ident+'.blend'),'--out',out/'shared-parts/metallic-hydrogen/components','--report',temp],stage/'parts.log',timeout=700)
            harvested=json.loads(temp.read_text(encoding='utf-8')).get('extracted',[])
            for part in harvested[:5]:
                test=Path(part['file']).with_name('reimport.json')
                try:
                    run([a.blender,'--background','--threads','3','--python-exit-code','1','--python',scripts/'verify_part.py',
                         '--','--glb',part['file'],'--out',test],stage/(part['part_id']+'.verify.log'),timeout=500)
                    part['status']='verified';part['reimport_sha256']=sha(test)
                except Exception as exc:
                    part['status']='candidate';part['blocker']=str(exc)
                if not any(x.get('part_id')==part['part_id'] for x in registry['parts']): registry['parts'].append(part)
            registry['instances_by_machine'][ident]={'part_ids':sorted(set(json.loads((stage/'build_receipt.json').read_text()).get('registered_parts_used',[]))),
                                                     'source_blend_sha256':sha(stage/(ident+'.blend'))}
            put(registry_path,registry)
            cp={'machine':ident,'state':'model_verified','inference_state':infer_status,'source_sha':a.source_sha,
                'blend_sha256':sha(stage/(ident+'.blend')),'glb_sha256':sha(stage/(ident+'.glb')),
                'preview_sha256':sha(stage/'inspection_3quarter.png'),'registry_sha256':sha(registry_path),
                'parts_added':[p['part_id'] for p in harvested],'parts_reused':registry['instances_by_machine'][ident]['part_ids'],
                'native_Factorio_placement_verified':False,'review_status':'candidate_only'}
            put(checkpoint,cp)
            for file in (stage/('inspection_3quarter.png'),stage/(ident+'.blend'),stage/(ident+'.glb'),stage/'build_receipt.json',stage/'verified_model.json',stage/'CHECKPOINT.json',stage/'inference_receipt.json',stage/'parts_extracted.json'):
                if file.exists():shutil.copy2(file,dest/file.name)
            completed.append(ident)
            put(progress_path,{'machine':ident,'index':i,'total':7,'state':'model_verified','completed':completed,'blocked':blocked,
                               'registry_sha256':sha(registry_path)})
            print('MH7_MACHINE_VERIFIED '+ident+' '+cp['preview_sha256'],flush=True)
        except Exception as exc:
            reason=str(exc);blocked.append({'machine':ident,'error':reason[:500]})
            put(checkpoint,{'machine':ident,'state':'blocked','error':reason,'source_sha':a.source_sha})
            put(progress_path,{'machine':ident,'index':i,'total':7,'state':'blocked','completed':completed,'blocked':blocked})
            print('MH7_MACHINE_BLOCKED '+ident+': '+reason,flush=True)
            # Keep independent stages progressing while preserving this exact failure.
    # Provide durable shared-library and review evidence even if not all machines pass.
    shared=report/'shared-parts';shared.mkdir(parents=True,exist_ok=True)
    shutil.copy2(registry_path,shared/'registry.json')
    for p in (out/'shared-parts/metallic-hydrogen/components').rglob('*') if (out/'shared-parts/metallic-hydrogen/components').exists() else []:
        if p.is_file() and p.suffix in ('.glb','.json'):
            dest=shared/'components'/p.relative_to(out/'shared-parts/metallic-hydrogen/components')
            dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
    all_qwen=(len(completed)==7 and all(inference_outcomes.get(x)=='success' for x in completed))
    final={'order':'TP-MH7-2026-11-09','model':a.model,'completed':completed,'blocked':blocked,
           'inference_outcomes':inference_outcomes,
           'parts_library_sha256':sha(registry_path),'source_sha':a.source_sha,
           'models_built':len(completed),'full_completion':len(completed)==7 and not blocked and all_qwen,
           'scripted_baseline_only':a.model.startswith('none-'),
           'game_integrated':False,'human_art_approved':False}
    put(report/'RESULTS.json',final)
    (report/'RESULTS.md').write_text('# MH7 real Blender execution result\n\nCompleted: '+', '.join(completed)+'\n\nBlocked: '+json.dumps(blocked)+'\n\nOnly candidate visuals, not native Factorio integrated.\n',encoding='utf-8')
    print('MH7_RUN_FINAL '+json.dumps(final),flush=True)
    if blocked:sys.exit(2)
    if not completed:sys.exit(3)

if __name__=='__main__':main()
