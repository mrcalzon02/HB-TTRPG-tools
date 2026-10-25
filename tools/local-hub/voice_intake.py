"""Local-only script upload and reference preparation for LuxTTS."""
import csv,io,json,re,subprocess,urllib.request,urllib.error,urllib.parse,wave,zipfile
from email import policy
from email.parser import BytesParser
from pathlib import Path
from xml.etree import ElementTree
BASE="http://127.0.0.1:17493"
KEY=re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
AUDIO={".wav",".mp3",".m4a",".flac",".ogg"}
DOC={".txt",".md",".csv",".docx"}
def multipart(content_type,body):
    if not 0<len(body)<=52*1024*1024 or not content_type.startswith("multipart/form-data;"):
        raise ValueError("Multipart form required; max 52 MB")
    email=BytesParser(policy=policy.default).parsebytes(
        b"MIME-Version: 1.0\r\nContent-Type: "+content_type.encode("ascii")+b"\r\n\r\n"+body)
    if not email.is_multipart(): raise ValueError("Malformed multipart form")
    fields,files={},{}
    for part in email.iter_parts():
        key=part.get_param("name",header="content-disposition")
        if key not in {"lines","profile_name","voice","source","consent","reference_text","audio","document"} or key in fields or key in files:
            raise ValueError("Unknown or repeated field")
        content=part.get_payload(decode=True)
        if content is None: raise ValueError("Empty form payload")
        filename=part.get_filename()
        if filename is None: fields[key]=content.decode("utf-8")
        else:
            if len(content)>(45*1024*1024 if key=="audio" else 8*1024*1024): raise ValueError("Upload exceeds size limit")
            files[key]=(Path(filename.replace("\\","/")).name,content)
    return fields,files
def document(filename,raw):
    ext=Path(filename).suffix.lower()
    if ext not in DOC or not raw or len(raw)>8*1024*1024: raise ValueError("Use a nonempty TXT, MD, CSV or DOCX document under 8 MB")
    if ext in {".txt",".md"}: return raw.decode("utf-8-sig")
    if ext==".csv":
        rows=list(csv.reader(io.StringIO(raw.decode("utf-8-sig"))))
        if rows and len(rows[0])>1 and rows[0][0].strip().lower() in ("id","key"): rows=rows[1:]
        return "\n".join(row[0].strip()+" | "+row[1].strip() if len(row)>1 and KEY.fullmatch(row[0].strip()) else " ".join(v.strip() for v in row if v.strip()) for row in rows)
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            item=archive.getinfo("word/document.xml")
            if item.file_size>8*1024*1024: raise ValueError("DOCX expanded XML is too large")
            xml=ElementTree.fromstring(archive.read(item))
    except (KeyError,zipfile.BadZipFile,ElementTree.ParseError) as error: raise ValueError("Invalid DOCX file") from error
    ns="{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    return "\n".join("".join(t.text or "" for t in p.iter(ns+"t")) for p in xml.iter(ns+"p"))
def lines(text):
    if len(text)>100000: raise ValueError("Script is too long")
    result,used=[],set()
    for row in text.splitlines():
        row=row.strip()
        if not row or row.startswith("#") or row in ("---",chr(96)*3): continue
        if row.startswith(("- ","* ")): row=row[2:].strip()
        if row.startswith("|") and row.endswith("|"):
            cells=[x.strip().strip(chr(96)) for x in row.strip("|").split("|")]
            if len(cells)<2 or cells[0].lower() in ("key","id") or all(set(x)<={"-",":"} for x in cells[:2]): continue
            row=cells[0]+" | "+cells[1]
        parts=row.split("|",1)
        if len(parts)==2 and KEY.fullmatch(parts[0].strip()): key,text=parts[0].strip(),parts[1].strip()
        else: key,text="line-%03d"%(len(result)+1),row
        if not text or len(text)>10000 or key in used: raise ValueError("Duplicate identifier or empty line: "+key)
        result.append({"id":key,"text":text});used.add(key)
        if len(result)>300: raise ValueError("Max 300 lines per batch")
    if not result: raise ValueError("Drop a script document or type narration lines")
    return result
def api(path,body=None):
    req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type":"application/json"} if body is not None else {},method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req,timeout=45) as resp: return json.loads(resp.read())
    except urllib.error.HTTPError as e: raise RuntimeError("Voicebox profile rejected (%s): %s"%(e.code,e.read(400).decode("utf-8","replace"))) from e
def sample(profile_id,path,text):
    boundary="ownerlocalboundary"
    prefix=(f"--{boundary}\r\nContent-Disposition: form-data; name=\"reference_text\"\r\n\r\n{text}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"owner.wav\"\r\n"
            "Content-Type: audio/wav\r\n\r\n").encode()
    req=urllib.request.Request(BASE+"/profiles/"+urllib.parse.quote(profile_id,safe="")+"/samples",
        data=prefix+path.read_bytes()+f"\r\n--{boundary}--\r\n".encode(),method="POST",
        headers={"Content-Type":"multipart/form-data; boundary="+boundary})
    try:
        with urllib.request.urlopen(req,timeout=120) as resp: return json.loads(resp.read())
    except urllib.error.HTTPError as e: raise RuntimeError("Voicebox sample rejected (%s): %s"%(e.code,e.read(400).decode("utf-8","replace"))) from e
def convert_sample(filename,data,directory):
    ext=Path(filename).suffix.lower()
    if ext not in AUDIO or not data: raise ValueError("Drop a WAV, MP3, M4A, FLAC or OGG recording")
    directory.mkdir(parents=True,exist_ok=True)
    raw=directory/("source"+ext);dest=directory/"owner-reference.wav"
    raw.write_bytes(data)
    probe=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
        "-of","default=nw=1:nk=1",str(raw)],check=True,capture_output=True,text=True,timeout=30)
    duration=float(probe.stdout.strip())
    if not 2<=duration<=1800: raise ValueError("Recording must be 2 seconds to 30 minutes")
    start=5 if duration>30 else 0
    subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-y",
        "-ss",str(start),"-i",str(raw),"-t",str(min(20,duration-start)),"-ac","1","-ar","24000","-c:a","pcm_s16le",str(dest)],check=True,timeout=120)
    with wave.open(str(dest),"rb") as wav: seconds=wav.getnframes()/wav.getframerate()
    if not 2<=seconds<=30: raise ValueError("Voicebox sample conversion failed")
    raw.unlink()
    return dest
def profile(name,samples,reference_text=""):
    found=[p for p in api("/profiles") if p.get("name")==name]
    if len(found)>1: raise ValueError("Ambiguous local voice profile")
    item=found[0] if found else api("/profiles",{"name":name,"voice_type":"cloned","language":"en","default_engine":"luxtts"})
    pid=str(item["id"])
    if int(item.get("sample_count",0))==0:
        # LuxTTS transcribes internally; this is descriptive metadata, not a fabricated transcript.
        desc=reference_text.strip() or "No transcript provided; LuxTTS transcribes reference audio internally."
        for path in samples: sample(pid,path,desc)
    return pid
