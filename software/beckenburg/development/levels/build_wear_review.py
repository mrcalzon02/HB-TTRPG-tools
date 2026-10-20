"""Contact sheet of actual clean/worn Blender renders, with unchanged lighting."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
families=[('level_boiler_modern','Condensing boiler'),('level_boiler_coal','Retired coal boiler'),
          ('level_lived_curio','Inherited display'),('level_hiding_cupboard','Hiding cupboard')]
canvas=Image.new('RGB',(1600,4*380),'#151a1f');draw=ImageDraw.Draw(canvas)
for y,(name,label) in enumerate(families):
    for x,suffix in enumerate(['','_worn']):
        with Image.open(ROOT/f'previews/{name}{suffix}.png') as source:
            source.thumbnail((800,334),Image.Resampling.LANCZOS);canvas.paste(source,(x*800,y*380+42))
        draw.text((x*800+20,y*380+7),label+' — '+('Clean' if x==0 else 'Worn'),font=font,fill='#e2e7ef')
canvas.save(ROOT/'previews/clean-and-worn-comparison.jpg',quality=92)
print('Built clean/worn comparison from actual mesh renders')
