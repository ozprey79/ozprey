"""Original 12-inch record and open cardboard sleeve, modelled in Blender.

Run: blender --background --python scripts/build-vinyl-blender.py
The assembly is in centimetres, front is -Y, vertical is Z (glTF exports Y-up).
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'output/vinyl'
OUT.mkdir(parents=True, exist_ok=True)
(BASE / 'static/music').mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = .01
scene.unit_settings.length_unit = 'CENTIMETERS'


def material(name, color, roughness, metal=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    return mat


vinyl = material('Pressed black vinyl', (.009, .010, .012), .26)
vinyl.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value = .24
vinyl.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value = .23
paper = material('Charcoal cardboard', (.021, .023, .027), .68)
edge = material('Cardboard cut edge', (.062, .057, .050), .86)
cover = material('Sleeve artwork', (.025, .027, .030), .53)
rear = material('Sleeve back artwork', (.020, .022, .026), .66)
label = material('Record label artwork', (.80, .23, .035), .75)

# Actual radial grooves are part of the mesh. Radial microgrooves also give
# grazing studio reflections enough detail to survive preview denoising.
nodes = vinyl.node_tree.nodes
coordinates = nodes.new('ShaderNodeTexCoord')
radius = nodes.new('ShaderNodeVectorMath')
radius.operation = 'LENGTH'
frequency = nodes.new('ShaderNodeMath')
frequency.operation = 'MULTIPLY'
frequency.inputs[1].default_value = 96
wave = nodes.new('ShaderNodeMath')
wave.operation = 'SINE'
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .32
bump.inputs['Distance'].default_value = .012
vinyl.node_tree.links.new(coordinates.outputs['Object'], radius.inputs[0])
vinyl.node_tree.links.new(radius.outputs['Value'], frequency.inputs[0])
vinyl.node_tree.links.new(frequency.outputs[0], wave.inputs[0])
vinyl.node_tree.links.new(wave.outputs[0], bump.inputs['Height'])
vinyl.node_tree.links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])


def mesh_object(name, vertices, faces, mat, parent=None, uv_scale=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    if uv_scale:
        mesh.uv_layers.new(name='Print UV')
        for face in mesh.polygons:
            for loop in face.loop_indices:
                vertex = vertices[mesh.loops[loop].vertex_index]
                mesh.uv_layers.active.data[loop].uv = (vertex[0] / uv_scale + .5, vertex[2] / uv_scale + .5)
    return obj


def box(name, size, location, mat, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Soft folded paper edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def lathe(name, profile, mat, parent, uv_scale=30.2, segments=128):
    vertices = []
    for radius, y in profile:
        for i in range(segments):
            angle = math.tau * i / segments
            vertices.append((radius * math.cos(angle), y, radius * math.sin(angle)))
    faces = []
    for row in range(len(profile)):
        next_row = (row + 1) % len(profile)
        for i in range(segments):
            j = (i + 1) % segments
            faces.append((row * segments + i, next_row * segments + i, next_row * segments + j, row * segments + j))
    obj = mesh_object(name, vertices, faces, mat, parent, uv_scale)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


record = bpy.data.objects.new('Vinyl_Record', None)
scene.collection.objects.link(record)
record.location = (11.2, 0, 0)

# A closed revolved cross-section includes the spindle bore, label recess,
# raised outer lip, playing surface, quiet bands, run-out and the reverse face.
front = [(.36, -.060), (.39, -.085), (.60, -.095), (4.63, -.095),
         (4.75, -.105), (4.86, -.110), (4.96, -.095), (5.22, -.090)]
quiet_bands = (6.65, 8.48, 10.52, 12.60)
for i in range(152):
    radius = 5.28 + i * (9.40 / 151)
    depth = .0004 if any(abs(radius - band) < .08 for band in quiet_bands) else .0032
    front.extend([(radius, -.090), (radius + .023, -.090 + depth), (radius + .048, -.090)])
front.extend([(14.82, -.091), (14.91, -.108), (15.02, -.112), (15.08, -.089), (15.10, -.055)])
profile = front + [(15.10, .055)] + [(r, -y) for r, y in reversed(front[:-1])]
disc = lathe('Grooved record with open spindle hole', profile, vinyl, record)

for side, name in [(-1, 'Front paper label'), (1, 'Back paper label')]:
    label_profile = [(.36, side * .107), (4.69, side * .107), (4.69, side * .120), (.36, side * .120)]
    printed_label = lathe(name, label_profile, label, record, uv_scale=9.38)
    for face in printed_label.data.polygons:
        face.use_smooth = False

quiet = material('Quiet vinyl bands', (.009, .010, .012), .20)
for index, band in enumerate(quiet_bands):
    lathe(f'Quiet band {index + 1}', [(band - .06, -.091), (band + .06, -.091), (band + .06, .091), (band - .06, .091)], quiet, record)

# The sleeve is hollow and open at the right. Separate paper faces, folded
# spine, glued top/bottom seams and a die-cut thumb notch give it real depth.
left, right, half = -21.7, 9.7, 15.7
front_outline = [(left, -half), (right, -half), (right, -1.65)]
for i in range(25):
    angle = -math.pi / 2 + i * math.pi / 24
    front_outline.append((right - 1.65 * math.cos(angle), 1.65 * math.sin(angle)))
front_outline.extend([(right, half), (left, half)])
for side, name, mat in [(-1, 'Sleeve_Front_Print', cover), (1, 'Sleeve_Back_Print', rear)]:
    outline = front_outline if side < 0 else [(left, -half), (right, -half), (right, half), (left, half)]
    verts = [(x, side * .35, z) for x, z in outline]
    faces = [tuple(range(len(verts)))]
    if side > 0:
        faces = [tuple(reversed(faces[0]))]
    obj = mesh_object(name, verts, faces, mat)
    obj.data.uv_layers.new(name='Print UV')
    for face in obj.data.polygons:
        for loop in face.loop_indices:
            x, _, z = verts[obj.data.loops[loop].vertex_index]
            u = (x - left) / (right - left)
            obj.data.uv_layers.active.data[loop].uv = (u if side < 0 else 1 - u, (z + half) / (half * 2))
    thickness = obj.modifiers.new('Real cardboard thickness', 'SOLIDIFY')
    thickness.thickness = .065
    thickness.offset = 0
    obj.data.materials.append(edge)
    thickness.material_offset_rim = 1
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=thickness.name)
    bevel = obj.modifiers.new('Paper edge radius', 'BEVEL')
    bevel.width = .012
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.select_set(False)

box('Folded left spine', (.12, .70, 31.40), (left + .035, 0, 0), paper)
for side in [-1, 1]:
    box('Glued horizontal seam', (31.25, .70, .095), (-6, 0, side * (half - .035)), paper)
    box('Inner paper seam', (30.90, .055, .25), (-6, .25, side * (half - .18)), edge, .005)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(BASE / 'static/music/vinyl.glb'), export_format='GLB', use_selection=True, export_apply=True)
mesh_objects = [obj for obj in scene.objects if obj.type == 'MESH']
print(f'VINYL_ASSET: {len(mesh_objects)} meshes; {sum(len(obj.data.polygons) for obj in mesh_objects)} faces; 152 physical groove rings per side')

# A clean studio image of the editable Blender master, matching the blank
# charcoal-sleeve/orange-label reference. Live artwork is applied by the app.
world = bpy.data.worlds.new('Vinyl studio')
world.use_nodes = True
world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.10, .11, .13, 1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .55
scene.world = world


def softbox(name, position, power, size, size_y, color):
    bpy.ops.object.light_add(type='AREA', location=position)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = power
    obj.data.shape = 'RECTANGLE'
    obj.data.size = size
    obj.data.size_y = size_y
    obj.data.color = color
    obj.rotation_euler = (Vector((3, 0, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()


softbox('Tall left reflection', (-24, -35, 18), 23000, 12, 45, (1, .95, .87))
softbox('Record groove highlight', (29, -24, 28), 18000, 7, 32, (.80, .88, 1))
softbox('Top edge light', (2, -10, 35), 14000, 38, 6, (1, 1, 1))
bpy.ops.object.camera_add(location=(10, -85, 11))
camera = bpy.context.object
camera.rotation_euler = (Vector((2.3, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 54
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1400
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT / 'vinyl-preview.png')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'vinyl.blend'), compress=True)
bpy.ops.render.render(write_still=True)
