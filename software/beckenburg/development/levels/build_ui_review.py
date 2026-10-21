"""Package actual UI/van captures into a repeatable local review; no game changes."""
from pathlib import Path
from html import escape
import json
ROOT=Path(__file__).resolve().parent
STYLE='body{font:17px/1.55 system-ui;background:#11171c;color:#e5e3d6;max-width:1450px;margin:auto;padding:28px}a{color:#b8d9e4}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:22px}figure{margin:0;background:#222c30;border:1px solid #42515b;border-radius:8px;overflow:hidden}img{width:100%;display:block}figcaption{padding:12px}p{max-width:1000px}'
def gallery(name,title,folder,intro):
    cards=[]
    for path in sorted((ROOT/'previews'/folder).glob('*.png')):
        rel=path.relative_to(ROOT).as_posix();label=path.stem.replace('-',' ')
        cards.append(f'<figure><a href="{rel}"><img src="{rel}" alt="{escape(label)}"></a><figcaption>{escape(label)}</figcaption></figure>')
    html=f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{STYLE}</style><nav><a href="REVIEW.html">Level review</a> · <a href="UI_REVIEW.html">Interaction UI</a> · <a href="VAN_REVIEW.html">Van fit</a></nav><h1>{title}</h1>{intro}<div class="grid">'+''.join(cards)+'</div></html>'
    (ROOT/name).write_text(html,encoding='utf-8')
gallery('UI_REVIEW.html','Pointed interaction and physical instrument readouts','ui','<p>Actual 960×600 game renderer captures: the hand, E and name identify the visible object under the centre crosshair. The held instruments use the actual source meshes. Display values in these review captures are explicitly supplied verification samples; they are not evidence from a live investigation.</p><p>Runtime uses successful solo scan results and host measurements. EMF uses its LEDs/analog needles, thermometers their LCDs, recorders their REC/time/peak display, and authored digital tools their actual panels. Analog spirit radios retain audio responses and the case record. The floor plan supports Page Up/Down. <a href="INTERACTION_UI_WORKFLOW.md">Implementation and repeatable checks</a> · <a href="verification/interaction-ui-results.json">Focused verification results</a>.</p>')
gallery('VAN_REVIEW.html','Measured van, loose shelf stock and upright screens','van','<p>Actual game renderer captures of the 2.059m-wide van, raised cargo floor, loading ramp, clear central aisle, retained street and source furniture. Stock review contains 204 native-sized physical units from an explicit six-investigator inventory fixture; carried items are excluded. It is a capacity/placement review, not a claim about a starting wallet.</p><p>Wall monitors face the aisle with upright text and have compact rear mounts. Equipment lies on wooden shelves without individual gray boxes. <a href="previews/van/stock.json">Exact review inventory</a> · <a href="VAN_REFIT_WORKFLOW.md">Dimensions and verification workflow</a>.</p>')
report=ROOT.parents[1]/'build/level-release/results.json'
if report.exists():
    rows=json.loads(report.read_text())
    if len(rows)!=24 or any(r['exit_code'] for r in rows):raise RuntimeError('The complete focused gate must pass before packaging its result')
    (ROOT/'verification/interaction-ui-results.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Packaged UI/van galleries and verified focused result')
