"""Create native Blender Asset Browser libraries of original CC0 assets only."""
import bpy,json,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT.parents[1]
rows=json.loads((ROOT/'development/levels/lived-assets.json').read_text())['assets']
for library in ['industrial','household','hiding']:
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
    folder=SITE/f'assets/beckenburg/libraries/{library}';folder.mkdir(parents=True,exist_ok=True)
    catalog=str(uuid.uuid5(uuid.NAMESPACE_URL,'https://mrcalzon02.github.io/HB-TTRPG-tools/beckenburg-assets/'+library))
    for row in rows:
        if row['library']!=library:continue
        assert row['license']=='CC0-1.0' and row['source']=='original geometry and procedural textures'
        with bpy.data.libraries.load(str(ROOT/row['editable']),link=False) as (incoming,outgoing):outgoing.objects=[row['id']]
        obj=outgoing.objects[0];obj.asset_mark();obj.use_fake_user=True
        obj.asset_data.author='The Beckenburg Project';obj.asset_data.description='Original PSX scenery. CC0 1.0 Universal. Metres; native floor origin.'
        obj.asset_data.catalog_id=catalog;obj.asset_data.tags.new('CC0');obj.asset_data.tags.new(library);obj.asset_data.tags.new(row.get('variant','clean'))
        with bpy.context.temp_override(id=obj):bpy.ops.ed.lib_id_load_custom_preview(filepath=str(ROOT/f'development/levels/previews/{row["id"]}.png'))
    (folder/'blender_assets.cats.txt').write_text(f'VERSION 1\n{catalog}:{library.title()}:{library.title()}\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/'asset-library.blend'),compress=True)
    print('CC0_LIBRARY',library,len([o for o in bpy.data.objects if o.asset_data]),flush=True)
