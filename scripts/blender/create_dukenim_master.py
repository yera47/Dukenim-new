import bpy
import math
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "design" / "dukenim-master-room-preview.png"
BLEND = ROOT / "public" / "design" / "dukenim-master-room.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, metallic=0.0, roughness=0.45, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Metallic"].default_value = metallic
    bs.inputs["Roughness"].default_value = roughness
    if emission:
        bs.inputs["Emission Color"].default_value = (*emission, 1)
        bs.inputs["Emission Strength"].default_value = 0.35
    return m

stone = mat("Warm limestone", (0.43, 0.29, 0.18), roughness=0.78)
stone_light = mat("Sunlit limestone", (0.67, 0.48, 0.31), roughness=0.72)
jade = mat("Black Jade glass", (0.015, 0.055, 0.045), metallic=0.1, roughness=0.2)
cream = mat("Catalog glass", (0.78, 0.71, 0.60), roughness=0.28)
gold = mat("Dukenim gold", (0.72, 0.38, 0.10), metallic=0.72, roughness=0.22)
phone_mat = mat("Phone frame", (0.025, 0.03, 0.028), metallic=0.65, roughness=0.18)

def cube(name, loc, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("Soft glass edges", "BEVEL")
        mod.width = bevel
        mod.segments = 5
    o.data.materials.append(material)
    return o

# Collections keep every block reusable and consistently framed.
for name in ("Room_Base", "Room_Lighting", "Glass_UI", "Catalog", "CRM", "Phone", "Cameras"):
    bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(bpy.data.collections[name])

floor = cube("Room floor", (0, 0, -0.2), (8, 7, 0.2), stone_light, 0.08)
back = cube("Continuous warm wall", (0, 3.8, 3.8), (8, 0.2, 4.0), stone, 0.08)
left = cube("Left wall", (-7.8, 0, 3.8), (0.2, 4, 4.0), stone, 0.08)
# stepped platforms establish the visual rhythm shared by every scroll block
for i, (x, y, z, sx, sy, sz) in enumerate([(-2.8, 1.0, 0.25, 1.2, 1.5, 0.25), (0.0, 1.2, 0.45, 1.4, 1.8, 0.45), (2.8, 1.1, 0.25, 1.3, 1.6, 0.25)]):
    cube(f"Stone plinth {i+1}", (x, y, z), (sx, sy, sz), stone_light, 0.08)

# Separate hero surfaces: catalog, CRM, phone.
catalog = cube("Catalog screen", (-0.8, 2.9, 4.4), (2.65, 0.10, 1.65), cream, 0.18)
crm = cube("CRM screen", (4.2, 2.82, 3.9), (1.8, 0.10, 1.75), jade, 0.16)
phone = cube("Phone purchase flow", (5.9, 2.55, 1.65), (0.62, 0.16, 1.35), phone_mat, 0.22)
phone.rotation_euler[1] = math.radians(-5)

# Minimal glass content markers; real UI is overlaid by Next.js.
for i in range(2):
    cube(f"Catalog row {i+1}", (-0.8, 2.75, 4.0 - i * 0.95), (2.25, 0.03, 0.32), stone_light, 0.05)
for i in range(3):
    cube(f"CRM metric {i+1}", (4.2 + (i-1)*0.48, 2.68, 3.35), (0.18, 0.03, 0.28 + i*0.16), gold, 0.04)

# Warm key light and soft fill.
bpy.ops.object.light_add(type="AREA", location=(0, -1.0, 8.5))
key = bpy.context.object; key.name = "Warm daylight"; key.data.energy = 1100; key.data.shape = "DISK"; key.data.size = 6
key.data.color = (1.0, 0.70, 0.42); key.rotation_euler = (math.radians(12), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(-5, 1, 4))
fill = bpy.context.object; fill.name = "Soft room fill"; fill.data.energy = 450; fill.data.size = 5; fill.data.color = (0.62, 0.78, 0.68)

bpy.ops.object.camera_add(location=(0.0, -15.5, 5.3))
cam = bpy.context.object; cam.name = "Hero camera"; cam.data.lens = 48
direction = Vector((0.0, 2.5, 3.3)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = cam

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1600; scene.render.resolution_y = 900; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT)
scene.world = bpy.data.worlds.new("Dukenim World")
scene.world.color = (0.025, 0.035, 0.03)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)
