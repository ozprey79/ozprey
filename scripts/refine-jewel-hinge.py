import bpy,math,json
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[1];OUT=BASE/'output/jewel-case';S=.142/4.458
# Work on the supplied .blend; preserve its existing topology and materials.
def extent(o,axis):
 vals=[v.co[axis] for v in o.data.vertices];return min(vals),max(vals)
def remap(o,axis,lo,hi):
 a,b=extent(o,axis)
 for v in o.data.vertices:v.co[axis]=lo+(v.co[axis]-a)/(b-a)*(hi-lo)
 o.data.update()
def shift(o,axis,amount):
 for v in o.data.vertices:v.co[axis]+=amount
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 name=o.name
 if name.startswith('spine channel wall'):
  a,b=extent(o,0);center=(a+b)/2/S;target=-2.135 if center<-2 else -1.85;shift(o,0,(target-center)*S)
 elif name.startswith('spine end bridge'):remap(o,0,-2.1475*S,-1.8375*S)
 elif name=='lid downward skirt':remap(o,1,-.149*S,.064*S)
 elif name=='rear upright walls':
  remap(o,0,-2.199*S,2.199*S);remap(o,2,-1.924*S,1.924*S)
 elif name.startswith('vertical sidewall microflutes'):
  remap(o,1,-.143*S,.055*S)
  rear=o.copy();rear.data=o.data.copy();rear.name=name.replace('vertical sidewall','rear sidewall');bpy.context.scene.collection.objects.link(rear);rear.parent=bpy.data.objects['rear-shell']
  remap(rear,1,.065*S,.114*S)
  a,b=extent(rear,2);shift(rear,2,(-.03 if a+b>0 else .03)*S)
 elif name.startswith('sidewall polished seam rail'):
  a,b=extent(o,1);old=-(a+b)/2/S;shift(o,1,-((-.053 if old<.11 else .143)-old)*S)
 elif name.startswith('latch recess jamb'):remap(o,1,-.139*S,.052*S)
 elif name.startswith('latch recess sill'):
  a,b=extent(o,1);shift(o,1,.051*S-(a+b)/2)
# A broad clear inset web makes the spine channel read as a continuous assembly.
bpy.ops.mesh.primitive_cube_add(size=1,location=(-1.9925*S,.10*S,0));web=bpy.context.object;web.name='wide spine inset web';web.dimensions=(.285*S,.015*S,3.54*S);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);web.parent=bpy.data.objects['rear-shell'];web.data.materials.append(bpy.data.materials['glass']);bevel=web.modifiers.new('small polished web bevel','BEVEL');bevel.width=.003*S;bevel.segments=3
# Export only model components; presentation objects remain in the .blend.
parts={'rear-shell','front-lid','disc-tray','hinges','spring-hub'}
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 p=o
 while p is not None:
  if p.name in parts:o.select_set(True);break
  p=p.parent
bpy.ops.export_scene.gltf(filepath=str(BASE/'static/movies/jewel-case.glb'),export_format='GLB',use_selection=True,export_apply=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
cam=scene.camera;cam.location=(.17,-.13,.15);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.18
scene.render.filepath=str(OUT/'hinge-sidewall-preview.png')
for img in bpy.data.images:
 candidate=BASE/'static/movies'/Path(img.filepath).name
 if candidate.is_file():img.filepath=str(candidate);img.reload()
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'jewel-case-hinge-v2.blend'))
bpy.ops.render.render(write_still=True)
