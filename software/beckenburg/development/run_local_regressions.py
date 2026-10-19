"""Execute the actual build-script test list; collect every failure and bound hangs."""
import argparse, json, os, pathlib, re, subprocess, time

ap=argparse.ArgumentParser()
ap.add_argument('--java',required=True)
ap.add_argument('--project',type=pathlib.Path,required=True)
ap.add_argument('--output',type=pathlib.Path,required=True)
ap.add_argument('--start-after',default='')
args=ap.parse_args()
names=list(dict.fromkeys(re.findall(r'org\.beckenburg\.([A-Za-z0-9]+Test)',(args.project/'build.cmd').read_text())))
if args.start_after:names=names[names.index(args.start_after)+1:]
results=[]
for name in names:
    if name=='SmokeTest' and not (args.project/'src/test/java/org/beckenburg/SmokeTest.java').exists():continue
    before=time.monotonic()
    try:
        run=subprocess.run([args.java,'-Djava.awt.headless=true','-ea','-cp',os.pathsep.join(('build/classes','build/test')),f'org.beckenburg.{name}'],cwd=args.project,capture_output=True,text=True,timeout=45)
        code,output=run.returncode,run.stdout+run.stderr
    except subprocess.TimeoutExpired as error:
        code=124
        def decoded(value): return value.decode(errors='replace') if isinstance(value,bytes) else (value or '')
        output=decoded(error.stdout)+decoded(error.stderr)+'\nTIMEOUT after 45 seconds; process stopped.'
    result=dict(test=name,exit_code=code,seconds=round(time.monotonic()-before,2),output=output)
    results.append(result)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(results,indent=2)+'\n')
    print(('PASS' if code==0 else 'FAIL')+' '+name,flush=True)
    if code: print(output[:1800],flush=True)
print(f'{len(results)} tests; {sum(r["exit_code"]!=0 for r in results)} failed',flush=True)
raise SystemExit(1 if any(r['exit_code'] for r in results) else 0)
