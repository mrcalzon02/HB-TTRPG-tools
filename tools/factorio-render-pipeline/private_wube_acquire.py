"""PRIVATE, ephemeral discovery/download of official Wube Printables STL samples.

Uses Printables' public web download flow with strict source attribution.
Never bypass sign-in, CAPTCHA, billing or authorization; fail closed.
No downloaded model bytes or import .blend may be committed or uploaded.
The public GraphQL schema is undocumented and may stop working without warning.
"""
import argparse
import hashlib
import json
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

from official_reference_library import CATALOG
from audit_official_stl_references import inspect_stl

ENDPOINT = "https://api.printables.com/graphql/"
HEADERS = {"User-Agent": "Factorio-reference-private-research/1.0 (noncommercial)"}
SEARCH = """
query SearchModels($query:String!, $limit:Int, $ordering:SearchChoicesEnum) {
  result:searchPrints2(query:$query,printType:print,limit:$limit,ordering:$ordering) {
    items {id name user {handle publicUsername}}
  }
}
"""
DETAIL = """
query ModelFiles($id:ID!) {
  model:print(id:$id) {
    id name license {name} user {handle publicUsername}
    stls {id name fileSize}
  }
}
"""
LINK = """
mutation GetDownloadLink($id:ID!, $modelId:ID!,
                         $fileType:DownloadFileTypeEnum!,
                         $source:DownloadSourceEnum!) {
  getDownloadLink(id:$id, printId:$modelId, fileType:$fileType, source:$source) {
    ok output {link ttl}
  }
}
"""
LABELS = {x: "Factorio " + " ".join(y.capitalize() for y in x.split("-")) for x in CATALOG}
MAX_STL_BYTES = 48 * 1024 * 1024


def graphql(query, vars, operation):
    payload=json.dumps({"operationName":operation,"query":query,"variables":vars}).encode()
    req=urllib.request.Request(ENDPOINT, data=payload,
                               headers={**HEADERS,"Content-Type":"application/json"},
                               method="POST")
    with urllib.request.urlopen(req,timeout=35) as response:
        data=json.load(response)
    if data.get("errors") or "data" not in data:
        raise ValueError("Printables GraphQL refused query " + operation + " (no bypass)")
    return data["data"]


def check_wube(model):
    owner=model.get("user") or {}
    return str(owner.get("handle") or "").casefold()=="wubesoftware"


def choose_model(slug):
    label=LABELS[slug]
    data=graphql(SEARCH, {"query":label,"limit":35,"ordering":"best_match"}, "SearchModels")
    matches=[m for m in (data.get("result") or {}).get("items",[]) if
             check_wube(m) and str(m.get("name","")).casefold()==label.casefold()]
    if len(matches)!=1:
        raise ValueError("Cannot uniquely authenticate published Wube set: " + label)
    return matches[0]


def choose_stl(model_id):
    data=graphql(DETAIL, {"id":str(model_id)}, "ModelFiles")
    model=data.get("model")
    if not model or not check_wube(model):
        raise ValueError("Wube provenance unavailable or changed")
    license_text=(model.get("license") or {}).get("name")
    if not license_text:
        raise ValueError("License unavailable; refusing model")
    candidates=[f for f in (model.get("stls") or []) if
                str(f.get("name","")).lower().endswith(".stl")
                and 1000 <= int(f.get("fileSize") or 0) <= MAX_STL_BYTES]
    if not candidates:
        raise ValueError("No public bounded-size STL file for "+str(model_id))
    # Largest below safety cap tends to retain complex machine surfaces, but
    # may still be a printer part. The importer keeps it explicitly unassembled.
    candidate=max(candidates,key=lambda f:int(f["fileSize"]))
    return candidate, license_text, len(model.get("stls") or [])


def acquire_one(slug, root):
    model=choose_model(slug)
    fid,lic,count=choose_stl(model["id"])
    response=graphql(LINK, {"id":str(fid["id"]),"modelId":str(model["id"]),
                          "fileType":"stl","source":"model_detail"}, "GetDownloadLink")
    result=response.get("getDownloadLink") or {}
    if not result.get("ok") or not (result.get("output") or {}).get("link"):
        raise ValueError("Printables requires authorization or denied file link")
    url=result["output"]["link"]
    parsed=urlsplit(url)
    if parsed.scheme!="https" or parsed.hostname not in {
        "files.printables.com","media.printables.com"}:
        raise ValueError("Untrusted official download host; refusing")
    relative=Path(slug)/("wube-model-%s-file-%s.stl"%(model["id"],fid["id"]))
    dest=root/relative
    dest.parent.mkdir(parents=True,exist_ok=True)
    req=urllib.request.Request(url,headers=HEADERS)
    digest=hashlib.sha256()
    size=0
    with urllib.request.urlopen(req,timeout=90) as inp, dest.open("wb") as out:
        while True:
            part=inp.read(1024*1024)
            if not part:break
            size+=len(part)
            if size>MAX_STL_BYTES:
                raise ValueError("Wube STL exceeded download safety limit")
            digest.update(part)
            out.write(part)
    if size!=int(fid["fileSize"]):
        dest.unlink(missing_ok=True)
        raise ValueError("Download size differed from publisher listing")
    inspection=inspect_stl(dest)
    return {
        "set":slug,"model_name":model["name"],"model_id":str(model["id"]),
        "model_page":"https://www.printables.com/model/"+str(model["id"]),
        "publisher_handle":"WubeSoftware",
        "license_title":lic,
        "file_id":str(fid["id"]),"original_file_name":fid["name"],
        "source_stl_variants_in_set":count,
        "sample_only_not_full_catalogue":True,
        "relative_local_path":relative.as_posix(),
        "downloaded_bytes":size,"sha256":digest.hexdigest(),
        "triangles":inspection["triangle_count"],
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root",type=Path,required=True)
    p.add_argument("--report",type=Path,required=True)
    p.add_argument("--only-set",action="append",choices=CATALOG)
    args=p.parse_args()
    root=args.root.resolve()
    report=args.report.resolve()
    if report.is_relative_to(root):
        raise SystemExit("Metadata report must live outside private STL root")
    slots=args.only_set or list(CATALOG)
    items=[]
    try:
        for slug in slots:
            item=acquire_one(slug,root)
            items.append(item)
            print("PRIVATE_OFFICIAL_STL_INSPECTED",slug,"triangles",item["triangles"],flush=True)
            time.sleep(.25)
    except Exception:
        # Never let a partial manifest masquerade as a complete 15-set library.
        report.parent.mkdir(parents=True,exist_ok=True)
        report.write_text(json.dumps({"status":"INCOMPLETE_FAIL_CLOSED",
                          "expected_sets":slots,"obtained":items},indent=2)+"\n")
        raise
    result={"status":"PUBLISHER_IDENTITY_AND_FILE_BYTES_CHECKED",
            "intended_use":"temporary private visual comparison only",
            "catalogue_sample_count":len(items),
            "samples_are_not_247_stl_variants":True,
            "all_fifteen_sets_sampled":set(slots)==set(CATALOG) and len(items)==15,
            "source":"Public Printables web download flow; individual source links are ephemeral",
            "files":items}
    report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps(result,indent=2)+"\n")
    print("OFFICIAL_WUBE_PRIVATE_STL_SAMPLES",len(items),flush=True)


if __name__=="__main__":main()
