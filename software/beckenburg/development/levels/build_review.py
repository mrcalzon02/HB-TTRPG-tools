"""Assemble original runtime captures into a local review gallery and contact sheets.
Requires Pillow. Does not alter the individual renders.
"""
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
CAPTURES=ROOT/'previews/runtime'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)

def sheet(paths,output,columns=3):
    width,height,label=480,300,36
    canvas=Image.new('RGB',(width*columns,(height+label)*((len(paths)+columns-1)//columns)), '#171a20')
    draw=ImageDraw.Draw(canvas)
    for i,path in enumerate(paths):
        x=(i%columns)*width;y=(i//columns)*(height+label)
        with Image.open(path) as original:
            thumbnail=original.copy();thumbnail.thumbnail((width,height),Image.Resampling.LANCZOS)
            canvas.paste(thumbnail,(x,y))
        draw.text((x+9,y+height+7),path.stem.replace('-', ' '),font=font,fill='#e2e7ef')
    canvas.save(output)

sections=[]
for site,title in [('house','Briar House'),('farmhouse','Hollowmere Farm'),('school','Ravenshade School')]:
    paths=sorted(CAPTURES.glob(site+'-*.png'))
    sheet(paths,ROOT/f'previews/{site}-runtime-overview.jpg')
    cards=[]
    for path in paths:
        relative=path.relative_to(ROOT).as_posix();label=path.stem[len(site)+1:].replace('-', ' ')
        cards.append(f'<figure><a href="{relative}"><img loading="lazy" src="{relative}" alt="{escape(label)}"></a><figcaption>{escape(label)}</figcaption></figure>')
    sections.append(f'<section id="{site}"><h2>{title}</h2><p><a href="blender/{site}-complete.blend">Editable Blender scene</a> · <a href="previews/{site}-blender-exterior.png">Blender overview</a></p><div class="grid">'+''.join(cards)+'</div></section>')

sheet([CAPTURES/name for name in ['house-06-upper-landing.png','house-07-master.png','house-10-main-stair.png','school-06-gymnasium.png']],ROOT/'previews/surface-corrections.jpg',2)
sheet([CAPTURES/name for name in ['school-13-retired-coal-boilers.png','school-14-modern-heating-plant.png','house-13-inherited-curio-display.png','house-16-cupboard-available-100.png']],ROOT/'previews/lived-in-revision.jpg',2)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beckenburg level review</title>
<style>body{font:17px/1.55 system-ui,sans-serif;background:#11151b;color:#e4e8ef;margin:0 auto;padding:30px;max-width:1560px}a{color:#b8d9ff}nav{display:flex;gap:24px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:18px}figure{margin:0;background:#202631;border:1px solid #3b4554;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:auto}figcaption{padding:8px 12px}section{margin:40px 0}p{max-width:1000px}.note{border-left:3px solid #a88f61;padding-left:18px}</style>
<h1>Beckenburg — authored level review</h1><p>Actual runtime geometry, source meshes and textures. Click a view for its full 960 × 600 capture. Screen effects are disabled in this inspection process; game preferences are preserved. Blender overviews are separate renders of the exported runtime scene.</p>
<p class="note">Revision: independent pickup/examine/throw objects with physical poltergeist impacts, plus three generations of school heating plant, supported household curios and furniture, and 18 physically enterable hiding cupboards whose presence follows difficulty. Cupboard comparison captures explicitly show 100% and 0% availability. Original CC0 assets have separate downloadable public libraries; purchased archive scenery retains its source licensing. The broader game regression gate has outstanding failures recorded in <a href="VERIFICATION.md">verification notes</a>; six other site categories remain locked development layouts.</p>
<nav><a href="#house">House</a><a href="#farmhouse">Farm</a><a href="#school">School</a><a href="PRODUCTION_WORKFLOW.md">Production workflow</a><a href="VERIFICATION.md">Verification</a></nav>'''+''.join(sections)+'</html>'
html=html.replace('<nav><a href="#house">','<p><a href="previews/clean-and-worn-comparison.jpg">Clean / worn texture comparison</a> · The game uses the worn variants; clean originals are preserved.</p><nav><a href="#house">')
(ROOT/'REVIEW.html').write_text(html,encoding='utf-8')
print('Built review gallery and four contact sheets')
