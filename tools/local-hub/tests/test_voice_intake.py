"""Synthetic-only tests for one-click local voice + document intake."""
import io
import json
import os
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import wave
import zipfile
from pathlib import Path
from unittest import mock
from http.server import ThreadingHTTPServer

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import voice_intake as intake
import server as hub

def make_wav(seconds=3,rate=24000):
    buff=io.BytesIO()
    with wave.open(buff,"wb") as file:
        file.setnchannels(1);file.setsampwidth(2);file.setframerate(rate)
        file.writeframes(b"\x02\x00"*int(seconds*rate))
    return buff.getvalue()

def form_parts(parts):
    boundary="testlocalvoiceintake"
    chunks=[]
    for name,value in parts:
        if isinstance(value,tuple):
            filename,payload=value
            chunks.extend([(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
                            "Content-Type: application/octet-stream\r\n\r\n").encode(),payload,b"\r\n"])
        else:
            chunks.extend([(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n").encode(),
                            value.encode(),b"\r\n"])
    chunks.append((f"--{boundary}--\r\n").encode())
    return "multipart/form-data; boundary="+boundary,b"".join(chunks)

class IntakeTests(unittest.TestCase):
    def test_multipart_audio_and_document_are_private(self):
        header,body=form_parts([("project","campaign"),("consent","yes"),
            ("audio",("voice.wav",make_wav())),("document",("lines.txt",b"intro | Welcome home"))])
        fields,files=intake.multipart(header,body)
        self.assertEqual(fields["project"],"campaign")
        self.assertEqual(files["audio"][1],make_wav())
        self.assertEqual(intake.lines(intake.document(*files["document"]))[0],
                         {"id":"intro","text":"Welcome home"})
    def test_docx_and_csv_import(self):
        xml=('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
             '<w:body><w:p><w:r><w:t>hello | Welcome aboard.</w:t></w:r></w:p></w:body></w:document>')
        result=io.BytesIO()
        with zipfile.ZipFile(result,"w") as archive:
            archive.writestr("word/document.xml",xml)
        self.assertEqual(intake.lines(intake.document("lines.docx",result.getvalue()))[0]["id"],"hello")
        csv_bytes=b"id,text\r\nstart,Begin here\r\n"
        self.assertEqual(intake.lines(intake.document("lines.csv",csv_bytes))[0]["id"],"start")
    def test_duplicate_line_keys_and_unsupported_document(self):
        with self.assertRaisesRegex(ValueError,"Duplicate"):
            intake.lines("intro | Hello\nintro | Again")
        with self.assertRaisesRegex(ValueError,"TXT"):
            intake.document("file.exe",b"bad")
    def test_profile_reuse_without_duplicate_samples(self):
        with mock.patch.object(intake,"api",return_value=[{"id":"abc","name":"My Voice","sample_count":1}]):
            with mock.patch.object(intake,"sample") as upload:
                self.assertEqual(intake.profile("My Voice",[]),"abc")
                upload.assert_not_called()
    def test_profile_creates_and_attaches_audio(self):
        with mock.patch.object(intake,"api",side_effect=[[],{"id":"abc","name":"My Voice","sample_count":0}]):
            with mock.patch.object(intake,"sample") as upload:
                self.assertEqual(intake.profile("My Voice",[Path("owner.wav")]),"abc")
                self.assertEqual(upload.call_count,1)
                self.assertIn("transcribes reference",upload.call_args.args[2])

class HttpIntakeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        p=Path(self.tmp.name);(p/"site").mkdir()
        (p/"site"/"index.html").write_text("<title>Local site</title>")
        self.state=hub.HubState(p/"site",p/"private")
        self.http=ThreadingHTTPServer(("127.0.0.1",0),hub.handler_factory(self.state))
        self.port=self.http.server_port
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.addCleanup(self.shutdown)
    def shutdown(self):
        self.http.shutdown();self.http.server_close();self.thread.join(timeout=3);self.state.close()
    def post(self,fields,files=None):
        allparts=list(fields.items())+list((files or {}).items())
        content_type,body=form_parts(allparts)
        request=urllib.request.Request(f"http://127.0.0.1:{self.port}/__local/api/intake",
            method="POST",data=body,headers={"Content-Type":content_type,
                "Origin":f"http://127.0.0.1:{self.port}"})
        try:
            with urllib.request.urlopen(request,timeout=5) as response:
                return response.status,json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code,json.loads(error.read())
    def test_rejects_missing_consent_and_no_reference(self):
        fields={"project":"campaign","profile_name":"My Voice","lines":"intro | Hi"}
        code,body=self.post(fields)
        self.assertEqual(code,400)
        self.assertIn("authorized",body["error"])
        fields["consent"]="yes"
        code,body=self.post(fields)
        self.assertEqual(code,400)
        self.assertIn("voice sample",body["error"])
    def test_drop_audio_script_generate_review_pack(self):
        fields={"project":"campaign","profile_name":"My Voice","lines":"","consent":"yes"}
        raw=make_wav()
        with mock.patch.object(hub,"convert_sample",side_effect=lambda name,audio,p:(p/"voice.wav")) as converted:
            with mock.patch.object(hub,"register_voice_profile",return_value="profile-123") as created:
                with mock.patch.object(hub,"load_luxtts",return_value={"message":"loaded"}) as loaded:
                    def fake_render(src,target,progress):
                        target.mkdir(parents=True)
                        (target/"review-pack.zip").write_bytes(b"fake zip")
                        progress(1,1)
                        return {"lineCount":1,"engine":"luxtts"}
                    with mock.patch.object(hub,"render",side_effect=fake_render) as renderer:
                        code,result=self.post(fields,{"audio":("owner.wav",raw),
                                                       "document":("lines.txt",b"intro | Hello")})
                        self.assertEqual(code,202,result)
                        key=result["id"]
                        for _ in range(100):
                            item=self.state.job(key)
                            if item["status"] in ("completed","failed"):break
                            time.sleep(.02)
                        self.assertEqual(item["status"],"completed",item.get("error"))
                        self.assertTrue(created.called and loaded.called and renderer.called)
                        self.assertEqual(renderer.call_args.args[0]["lines"][0]["text"],"Hello")
                        self.assertEqual(item["finished"],1)
