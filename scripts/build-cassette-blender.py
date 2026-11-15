"""Build an original compact cassette, export GLB, and keep an editable Blender master.
Run: blender --background --python scripts/build-cassette-blender.py
Coordinates are centimetres; front is -Y, height is Z. glTF converts to Y-up.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'output/cassette'
OUT.mkdir(parents=True, exist_ok=True)
(BASE / 'static/music').mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness, transmission=0, metal=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = 1.49
    p.inputs['Metallic'].default_value = metal
    return m

clear = material('Clear moulded plastic', (.82,.89,.88), .11, 1)
hub = material('Ivory reel hubs', (.83,.85,.77), .28)
tape = material('Magnetic tape', (.038,.022,.017), .34)
steel = material('Blackened screw steel', (.09,.10,.10), .27, metal=.85)
paper = material('White paper sticker', (.92,.92,.85), .85)
ink = material('Slate label surround', (.19,.26,.25), .6)
blue = material('Cobalt edition strip', (.025,.12,.40), .45)

def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def box(name, size, pos, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.object
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('Moulded edge radius','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat)

def cylinder(name, radius, depth, pos, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=pos, rotation=(math.pi/2,0,0))
    return finish(bpy.context.object,name,mat)

def subtract(obj, cutter):
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Physical opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def ring(name, outer, inner, depth, x, y, z, mat):
    o=cylinder(name,outer,depth,(x,y,z),mat)
    subtract(o,cylinder('cut',inner,depth+1,(x,y,z),mat))
    return o

# Two actual thin shell faces with spindle apertures, seam, and perimeter walls.
for side in [-1,1]:
    y=side*.535
    face=box('Front shell' if side<0 else 'Rear shell',(10,.10,6.3),(0,y,0),clear,.055)
    for x in [-2.2,2.2]:
        subtract(face,cylinder('spindle cut',.68,2,(x,y,.05),clear))
    for x,r in [(-2.4,.20),(-1.35,.15),(1.35,.15),(2.4,.20)]:
        subtract(face,cylinder('transport cut',r,2,(x,y,-2.65),clear))
    for x in [-4.91,4.91]:
        box('Side seam wall',(.12,.47,5.95),(x,side*.27,0),clear)
    for z in [-3.06,3.06]:
        box('Edge seam wall',(9.72,.47,.12),(0,side*.27,z),clear)
    # Label surround and rectangular viewing window reveal the real reels.
    label=box('Label surround',(8.65,.025,3.85),(0,side*.604,.63),ink,.12)
    subtract(label,box('Window cut',(6.85,2,1.58),(0,side*.604,-.05),ink,.13))
    box('White title sticker',(8.20,.025,1.19),(0,side*.628,1.83),paper,.06)
    box('Blue footer',(8.65,.028,.48),(0,side*.63,-1.06),blue,.025)
    # Raised transport housing on the bottom face.
    box('Transport upper lip',(6.1,.13,.12),(0,side*.62,-1.94),clear,.04)
    for x in [-3.18,3.18]:
        slope=box('Transport sloped side',(.12,.13,1.02),(x,side*.62,-2.42),clear,.04)
        slope.rotation_euler.y=math.copysign(.23,x)
    for x,z in [(-4.55,2.73),(4.55,2.73),(-4.55,-2.73),(4.55,-2.73),(0,-2.0)]:
        ring('Screw seat',.26,.13,.18,x,side*.51,z,clear)
        screw=cylinder('Phillips screw',.145,.055,(x,side*.642,z),steel)
        for angle in [0, math.pi/2]:
            cutter=box('Driver slot',(.19,.06,.035),(x,side*.67,z),steel,.005)
            cutter.rotation_euler.y=angle
            subtract(screw,cutter)
    for x in [-4.65,4.65]:
        for i in range(29):
            box('Moulded grip rib',(.12,.025,.038),(x,side*.60,-2.35+i*.17),clear,.008)

# Unequal tape packs, open hubs and six inward drive teeth.
for x,radius in [(-2.2,2.08),(2.2,1.18)]:
    ring('Wound magnetic tape',radius,.88,.55,x,0,.05,tape)
    ring('Reel flange',radius+.055,.67,.035,x,-.33,.05,clear)
    ring('Reel flange',radius+.055,.67,.035,x,.33,.05,clear)
    ring('Open reel hub',.88,.57,.72,x,0,.05,hub)
    for i in range(6):
        a=i*math.tau/6
        tooth=box('Spindle drive tooth',(.16,.72,.12),(x+.59*math.cos(a),0,.05+.59*math.sin(a)),hub,.025)
        tooth.rotation_euler.y=-a
    # Fine concentric tape layers catch a grazing highlight.
    for i in range(10):
        r=.94+(radius-.94)*i/10
        ring('Tape winding',r+.006,r,.012,x,-.282,.05,tape)
for x in [-4.12,4.12]:
    ring('Guide roller',.28,.11,.63,x,0,-2.49,hub)
    cylinder('Guide pin',.09,.8,(x,0,-2.49),steel)
box('Exposed tape at head',(7.95,.04,.37),(0,-.03,-2.73),tape,.008)
box('Pressure pad spring',(1.15,.10,.14),(0,.08,-2.67),steel,.015)
box('Pressure pad',(.65,.15,.20),(0,-.05,-2.63),hub,.025)

# Export only the assembly; lighting and camera remain in the editable master.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(BASE/'static/music/cassette.glb'),export_format='GLB',use_selection=True,export_apply=True)
scene=bpy.context.scene
world=bpy.data.worlds.new('Jewel case studio');world.use_nodes=True;scene.world=world
hdr=BASE/'static/movies/studio_small_09_1k.hdr'
if hdr.exists():
    env=world.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(hdr))
    world.node_tree.links.new(env.outputs['Color'],world.node_tree.nodes.get('Background').inputs['Color'])
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.7
bpy.ops.object.camera_add(location=(8,-23,8))
cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=13;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.cycles.max_bounces=12;scene.cycles.transmission_bounces=8
scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'cassette-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cassette.blend'))
bpy.ops.render.render(write_still=True)
