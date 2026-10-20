"""Reopen the native public Blender libraries; verify real Asset Browser metadata."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT.parents[1]
index=json.loads((SITE/'assets/beckenburg/libraries/index.json').read_text())
for library in index['libraries']:
    file=SITE/f'assets/beckenburg/libraries/{library["id"]}/asset-library.blend'
    bpy.ops.wm.open_mainfile(filepath=str(file));assets=[obj for obj in bpy.data.objects if obj.asset_data]
    assert len(assets)==library['count']
    for obj in assets:
        assert obj['license']=='CC0-1.0' and 'CC0' in [tag.name for tag in obj.asset_data.tags]
        assert obj.asset_data.catalog_id and obj.preview and obj.preview.image_size[0]>0
    print('PASS_NATIVE_ASSET_LIBRARY',library['id'],len(assets),'embedded previews and CC0 metadata',flush=True)
