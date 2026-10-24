#!/usr/bin/env python3
"""Owner-authorized NUTBUSTER voice batch. Private inputs stay on the trusted runner."""
import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
import wave
from pathlib import Path

BASE = "http://127.0.0.1:17493"
NAME = "NUTBUSTER Original - Owner Voice"
PREVIEW = ("start-first", "new-nut", "match-five", "last-move", "elemental-trigger", "fish-legendary")

def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def api(path, data=None, timeout=60):
    payload = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(BASE + path, data=payload, headers=({"Content-Type":"application/json"} if payload else {}))
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read())

def form(path, audio, fields):
    boundary = "vb" + uuid.uuid4().hex
    body = b""
    for key, value in fields.items():
        body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="' + key + '"\r\n\r\n' + value + '\r\n').encode()
    body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + audio.name + '"\r\nContent-Type: audio/wav\r\n\r\n').encode() + audio.read_bytes() + ('\r\n--' + boundary + '--\r\n').encode()
    req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type":"multipart/form-data; boundary="+boundary})
    with urllib.request.urlopen(req, timeout=300) as response:
        return json.loads(response.read())

def transcription(audio):
    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        try:
            result = form("/transcribe", audio, {"language":"en", "model":"small"})
            text = result.get("text", "").strip()
            if len(text) < 5:
                raise ValueError("Empty or invalid transcript for " + audio.name)
            return text
        except urllib.error.HTTPError as err:
            if err.code != 202:
                raise RuntimeError(f"Whisper HTTP {err.code}: {err.read()[:400]!r}") from err
            print("Whisper model downloading; retrying...", flush=True)
            time.sleep(12)
    raise TimeoutError("Whisper small could not transcribe within 15 minutes")

def original_lines(repo):
    path = repo/"docs/wiki/Announcer-Expansion-Script.md"
    lines = {}
    for row in path.read_text(encoding="utf-8").splitlines():
        if not row.startswith("|"):
            continue
        cols = [c.strip() for c in row.split("|")[1:-1]]
        if len(cols)!=5 or not cols[0].startswith(chr(96)) or not cols[0].endswith(chr(96)):
            continue
        key = cols[0][1:-1]
        if not re.fullmatch("[a-z0-9-]+",key):
            continue
        phrase = cols[3]
        if not phrase.startswith("“") or not phrase.endswith("”"):
            continue
        if key in lines:
            raise ValueError("Duplicate original event: " + key)
        lines[key] = phrase[1:-1].strip()
    if len(lines)!=74 or not all(key in lines for key in PREVIEW):
        raise ValueError(f"Original script mismatch: expected 74, found {len(lines)}")
    return lines

def original_clips(repo):
    catalog=json.loads((repo/"assets/audio/catalog.json").read_text(encoding="utf-8"))
    clips=[]
    for info in catalog["files"]:
        if info["kind"]!="announcer":
            continue
        clip=repo/"web/audio"/info["filename"]
        if not clip.is_file() or sha(clip)!=info["sha256"]:
            raise ValueError("Original clip missing or hash mismatch: "+str(clip))
        clips.append(clip)
    if len(clips)!=19:
        raise ValueError(f"Expected 19 original announcer clips, found {len(clips)}")
    return clips

def duration(path):
    with wave.open(str(path),"rb") as f:
        return f.getnframes()/f.getframerate()

def montages(clips,tmp):
    # Transform every original announcer clip into contiguous 24kHz mono PCM.
    # Join up to 25 seconds per profile sample. No effects, music, or grunts.
    samples=[]
    group=[]
    count=0
    for index,src in enumerate(clips):
        converted=tmp/(str(index)+".wav")
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(src),"-ac","1","-ar","24000","-c:a","pcm_s16le",str(converted)],check=True)
        with wave.open(str(converted),"rb") as f:
            pcm=f.readframes(f.getnframes())
        if group and (count+len(pcm)+5760)/48000>25:
            samples.append(group)
            group=[]
            count=0
        group.append(pcm+b"\0"*5760)
        count+=len(pcm)+5760
    if group:
        samples.append(group)
    paths=[]
    for idx,parts in enumerate(samples,1):
        out=tmp/("nutbuster-secondary-%02d.wav"%idx)
        with wave.open(str(out),"wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(24000)
            f.writeframes(b"".join(parts))
        if duration(out)>=5:
            paths.append(out)
    return paths

def server_ready():
    try:
        return isinstance(api("/profiles",timeout=5),list)
    except (OSError,ValueError,urllib.error.URLError):
        return False

def server_start(source, log):
    if server_ready():
        print("Reusing local Voicebox service")
        return None,None
    interpreter=source/("backend/venv/Scripts/python.exe" if os.name == "nt" else "backend/venv/bin/python")
    if not interpreter.is_file():
        raise RuntimeError("Voicebox backend venv absent; run just setup: "+str(interpreter))
    handle=log.open("ab")
    proc=subprocess.Popen([str(interpreter),"-m","backend.main","--host","127.0.0.1","--port","17493"],cwd=source,stdout=handle,stderr=subprocess.STDOUT)
    for _ in range(90):
        if server_ready():
            return proc,handle
        if proc.poll() is not None:
            handle.close()
            raise RuntimeError("Voicebox backend exited; see "+str(log))
        time.sleep(2)
    proc.terminate()
    handle.close()
    raise TimeoutError("Voicebox backend failed startup: "+str(log))

def profile():
    profiles=[p for p in api("/profiles") if p.get("name")==NAME]
    if len(profiles)>1:
        raise ValueError("Multiple ambiguous owner voice profiles")
    if profiles:
        return profiles[0]["id"], profiles[0].get("sample_count",0)>0
    entry=api("/profiles",{"name":NAME,"language":"en","voice_type":"cloned","default_engine":"luxtts","description":"Owner-authorized narration reference and original NUTBUSTER voice"})
    return entry["id"],False

def synthesize(profile_id,engine,text,out):
    body=json.dumps({"model":engine,"voice":profile_id,"input":text,"response_format":"mp3"}).encode()
    req=urllib.request.Request(BASE+"/v1/audio/speech",data=body,headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=900) as r:
            if "audio/" not in r.headers.get("Content-Type","audio/mpeg"):
                raise ValueError("Voicebox returned non-audio content")
            out.write_bytes(r.read())
    except urllib.error.HTTPError as err:
        raise RuntimeError(f"Voicebox generate HTTP {err.code}: {err.read()[:500]!r}") from err
    if out.stat().st_size<512:
        raise RuntimeError("Empty synthetic audio: "+str(out))
    subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nk=1:nw=1",str(out)],check=True,stdout=subprocess.DEVNULL)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--nutbuster",type=Path,required=True)
    p.add_argument("--references",type=Path,required=True)
    p.add_argument("--voicebox-source",type=Path)
    p.add_argument("--output",type=Path,default=Path("voicebox-output"))
    p.add_argument("--scope",choices=["preview","all"],default="preview")
    p.add_argument("--engine",choices=["luxtts","qwen","chatterbox_turbo"],default="luxtts")
    p.add_argument("--dry-run",action="store_true")
    a=p.parse_args()
    texts=original_lines(a.nutbuster)
    clips=original_clips(a.nutbuster)
    refs=sorted(a.references.glob("owner-primary-*.wav"))
    if len(refs)!=3:
        raise ValueError("Require exactly three private owner-primary-NN.wav references")
    for ref in refs:
        seconds=duration(ref)
        if not 10<=seconds<=30:
            raise ValueError(f"Reference {ref.name} duration invalid: {seconds}")
    print(f"Validated {len(refs)} private samples, {len(clips)} NUTBUSTER MP3s, {len(texts)} scripts")
    if a.dry_run:
        return
    if a.voicebox_source is None:
        raise ValueError("Missing --voicebox-source")
    a.output.mkdir(parents=True,exist_ok=True)
    proc,handle=server_start(a.voicebox_source,a.output/"backend.log")
    try:
        with tempfile.TemporaryDirectory(prefix="voicebox-owner-") as t:
            secondary=montages(clips,Path(t))
            ident,existing=profile()
            if not existing:
                for sample in [*refs,*secondary]:
                    spoken=transcription(sample)
                    form("/profiles/"+ident+"/samples",sample,{"reference_text":spoken})
                    print("Imported reference:",sample.name,flush=True)
            chosen=texts if a.scope=="all" else {k:texts[k] for k in PREVIEW}
            results=[]
            for i,(key,line) in enumerate(chosen.items(),1):
                output=a.output/(key+".mp3")
                print(f"Generating {i}/{len(chosen)}: {key}",flush=True)
                synthesize(ident,a.engine,line,output)
                results.append({"key":key,"text":line,"file":output.name,"sha256":sha(output),"bytes":output.stat().st_size})
            data={"schema":1,"source_project":"mrcalzon02/NUTBUSTER-R","engine":a.engine,"scope":a.scope,"owner_consent":True,"profile":"owner-authorized-original","files":results,"reference_audio_uploaded":False}
            (a.output/"manifest.json").write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
            print("Generated files saved privately in "+str(a.output),flush=True)
    finally:
        if proc:
            proc.terminate()
            try: proc.wait(timeout=15)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
        if handle: handle.close()

if __name__=="__main__":
    main()
