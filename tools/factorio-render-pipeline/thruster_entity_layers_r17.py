#!/usr/bin/env python3
"""R17 vanilla thruster reference entity component + light sheet atlas contract.

Source wube/factorio-data tag 2.0.77, space-age/prototypes/entity/entities.lua.
Original Wube-owned bitmaps stay local; no production sprite is modified.
"""
import argparse
import json
from pathlib import Path
import zipfile
from PIL import Image, ImageDraw, ImageStat
from audit_vanilla_atlas import read_atlas

PORTS=(
    ("pipe-1","oxidizer","east",(1.5,-2.0),95),
    ("pipe-2","fuel","east",(1.5,0.0),96),
    ("pipe-3","oxidizer","west",(-1.5,0.0),96),
    ("pipe-4","fuel","west",(-1.5,-2.0),95),
)
MARKERS={25:"thruster-mechanic-stop",52:"thruster-mechanic-move"}
SOURCE="https://github.com/wube/factorio-data/blob/2.0.77/space-age/prototypes/entity/entities.lua"

def light_frame_location(frame):
    if not isinstance(frame,int) or not 0<=frame<64:
        raise ValueError("Expected one of the 64 frame indices (0..63)")
    local=frame%32
    return {"frame":frame,"page":frame//32+1,
            "file":f"thruster-light-{frame//32+1}.png",
            "row":local//8,"column":local%8}

def conditional_pipes(connections):
    names={row[0] for row in PORTS}
    requested=set(connections)
    if requested-names:
        raise ValueError("Unknown named working visualisations: "+str(requested-names))
    return [row[0] for row in PORTS if row[0] in requested]

def contract():
    return {
        "source":SOURCE,"version":"2.0.77","status":"REFERENCE_NOT_RUNTIME_APPROVED",
        "body":{"slot":"graphics_set.animation",
                "pages":["thruster-1.png","thruster-2.png"],
                "frame_count":64,"frames_per_page":32,
                "cell":[264,542],"page_grid":[8,4],
                "animation_speed":0.5,"scale":0.5,"prototype_shift":[0,3]},
        "light":{"slot":"graphics_set.working_visualisations",
                 "pages":["thruster-light-1.png","thruster-light-2.png"],
                 "frame_count":64,"frames_per_page":32,
                 "cell":[384,832],"page_grid":[8,4],
                 "animation_speed":0.5,"scale":0.5,"prototype_shift":[0,3],
                 "draw_as_glow":True,"blend_mode":"additive",
                 "fadeout":True,"synchronized_with_body":True,
                 "not_physical_machinery":True},
        "integration_patch":{"file":"thruster-bckg.png","render_layer":"floor"},
        "flame":{"file":"thruster-flame.png","separate_effect":True},
        "plumes":{"files":["thruster-smoke.png","thruster-smoke-glow.png"],
                  "separate_particle_effects":True},
        "ports":[{
            "visual":identifier,"fluid":fluid,"direction":direction,
            "factorio_xy":list(pos),"blender_xy":[pos[0],-pos[1]],
            "visual_shift_px":[0,shift],"scale":0.5,
            "render_only_when_connected":True,"enabled_by_name":True,
            "file":f"thruster-pipe-connection-{identifier[-1]}.png",
        } for identifier,fluid,direction,pos,shift in PORTS],
        "sound_cues":{str(k):v for k,v in MARKERS.items()},
        "source_alignment_warning":(
            "Body 264x542 and light 384x832 have different cells and "
            "sprite-load descriptor shifts; do not top-left-overlay RGB "
            "light frames or treat glow brightness as geometry motion."),
    }

def contact_sheet(frames,indices,destination):
    # For PRIVATE local visual auditing ONLY; not public Github.
    w,h,cols=155,268,4
    rows=(len(indices)+cols-1)//cols
    board=Image.new("RGB",(cols*w,rows*(h+24)),(29,33,37))
    draw=ImageDraw.Draw(board)
    for n,idx in enumerate(indices):
        frame=frames[idx].convert("RGB")
        frame.thumbnail((w-10,h-7),Image.Resampling.LANCZOS)
        x=(n%cols)*w+(w-frame.width)//2
        y=(n//cols)*(h+24)
        board.paste(frame,(x,y))
        draw.text(((n%cols)*w+7,y+h+2),f"frame {idx:02d} / page {idx//32+1}",
                  fill=(230,226,221))
    board.save(destination)

def inspect_source_zip(zip_path,destination,strict=True):
    destination=Path(destination)
    with zipfile.ZipFile(zip_path) as archive:
        descriptors=[s for s in archive.namelist() if s.endswith("/thruster.lua")]
        if len(descriptors)!=1: raise ValueError("Expected one thruster.lua")
        folder=descriptors[0][:-len("thruster.lua")]
        body,bframes=read_atlas(archive,folder,"thruster")
        light,lframes=read_atlas(archive,folder,"thruster-light")
        for n in range(1,5):
            if folder+f"thruster-pipe-connection-{n}.png" not in archive.namelist():
                raise ValueError(f"Missing named pipe connection {n}")
    if len(bframes)!=64 or len(lframes)!=64:
        raise ValueError("Both atlas animations must contain exactly 64 frames")
    if strict:
        if (body["cell_width"],body["cell_height"])!=(264,542):
            raise ValueError("Original body cells must be 264x542")
        if (light["cell_width"],light["cell_height"])!=(384,832):
            raise ValueError("Original light cells must be 384x832")
        for header in (body,light):
            if header["line_length"]!=8 or header["lines_per_file"]!=4:
                raise ValueError("Expected 8x4 pages of animation frames")
    destination.mkdir(parents=True,exist_ok=True)
    cues=(0,1,8,16,24,25,26,31,32,40,51,52,53,63)
    contact_sheet(lframes,cues,destination/"light-phase-cues_PRIVATE.png")
    contact_sheet(lframes,list(range(0,64,4)),destination/"light-page-contact_PRIVATE.png")
    contact_sheet(bframes,cues,destination/"body-phase-cues_PRIVATE.png")
    stats=[{"frame":n,"page":light_frame_location(n)["page"],
            "mean_light_grayscale":round(ImageStat.Stat(im.convert("L")).mean[0],3),
            "sound_cue":MARKERS.get(n)}
           for n,im in enumerate(lframes)]
    report={"body":body,"light":light,"per_frame_light":stats,
            "body_count":len(bframes),"light_count":len(lframes),
            "body_light_motion_is_not_equivalent":True,
            "private_images_must_not_be_published":True}
    (destination/"atlas_layer_inspection_PRIVATE.json").write_text(
        json.dumps(report,indent=2)+"\n")
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--contract",type=Path)
    p.add_argument("--zip",type=Path)
    p.add_argument("--private-output",type=Path)
    args=p.parse_args()
    if args.contract:
        args.contract.parent.mkdir(parents=True,exist_ok=True)
        args.contract.write_text(json.dumps(contract(),indent=2)+"\n")
        print("R17_ENTITY_CONTRACT_PASS",args.contract)
    if args.zip:
        if not args.private_output:p.error("--zip requires --private-output")
        result=inspect_source_zip(args.zip,args.private_output)
        print("R17_LIGHT_SHEETS_ANALYZED",result["light_count"])
    if not args.contract and not args.zip:print(json.dumps(contract(),indent=2))

if __name__=="__main__":
    main()
