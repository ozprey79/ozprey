import bpy, json, math
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'output/jewel-case'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.length_unit='CENTIMETERS'
S=.142/4.458
mats={}
for name,rough in [('glass',.025),('edge',.055),('moulding',.075)]:
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(.97,.985,1,1);p.inputs['Roughness'].default_value=rough;p.inputs['IOR'].default_value=1.49;p.inputs['Transmission Weight'].default_value=1
 mats[name]=m
parents={}
for item in json.loads((BASE/'.tmp/jewel-geometry.json').read_text()):
 part=item['part']
 if part not in parents:
  par=bpy.data.objects.new(part,None);scene.collection.objects.link(par);parents[part]=par
 verts=[(x*S,-z*S,y*S) for x,y,z in item['vertices']]
 ids=item['indices'];faces=[ids[i:i+3] for i in range(0,len(ids),3)]
 mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(item['name'],mesh);scene.collection.objects.link(obj);obj.parent=parents[part];obj.data.materials.append(mats[item['material']])
 # Weld duplicated extrusion vertices without changing the bevel shape.
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 mod=obj.modifiers.new('Weld coincident vertices','WELD');mod.merge_threshold=.000001
 bpy.ops.object.modifier_apply(modifier=mod.name)
 for poly in mesh.polygons:poly.use_smooth=True
 normal=obj.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');normal.keep_sharp=True;normal.weight=50
 obj.select_set(False)
# Export the fitted components, without preview props, in metres.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(BASE/'static/movies/jewel-case.glb'),export_format='GLB',use_selection=True,export_apply=True)
# Preview disc with existing artwork.
verts=[];uv=[];faces=[]
for r in [.35,1.78]:
 for i in range(192):
  a=i*2*math.pi/192;x=.12+r*math.cos(a);y=r*math.sin(a)
  verts.append((x*S,-.028*S,y*S));uv.append(((x-.12)/3.56*(866/1536)+(354+433)/1536,y/3.56*(866/1024)+(1024-60-433)/1024))
for i in range(192):j=(i+1)%192;faces.append((i,j,j+192,i+192))
me=bpy.data.meshes.new('Disc print');me.from_pydata(verts,[],faces);me.uv_layers.new()
for face in me.polygons:
 for loop in face.loop_indices:me.uv_layers.active.data[loop].uv=uv[me.loops[loop].vertex_index]
obj=bpy.data.objects.new('Preview disc',me);scene.collection.objects.link(obj)
m=bpy.data.materials.new('Printed disc');m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.4
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(BASE/'static/movies/jewel-case-demo.png'));m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);obj.data.materials.append(m)
# HDR studio, physically refractive transparent shells.
world=bpy.data.worlds.new('HDR studio');world.use_nodes=True;scene.world=world
nodes=world.node_tree.nodes;env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(BASE/'static/movies/studio_small_09_1k.hdr'));world.node_tree.links.new(env.outputs['Color'],nodes.get('Background').inputs['Color']);nodes.get('Background').inputs['Strength'].default_value=.55
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.067));floor=bpy.context.object;floor.name='Preview ground'
m=bpy.data.materials.new('Charcoal');m.diffuse_color=(.025,.03,.04,1);floor.data.materials.append(m)
def camera(pos,target):
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.20;scene.camera=cam
camera((.15,-.28,.16),(0,0,0))
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.max_bounces=12;scene.cycles.transmission_bounces=8
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'closed-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'jewel-case.blend'));bpy.ops.render.render(write_still=True)
