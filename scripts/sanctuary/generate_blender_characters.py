"""
WeeklyLand 3D Aesthetic Humanoid Character Studio v2 (Blender 5.x bpy Pipeline)
===============================================================================
Generates 6 refined, stylized 5.5-head human-proportioned characters with:
  - Per-part semantic vertex-group skinning BEFORE mesh join (zero arm/hip weight bleed!)
  - Seamless continuous multi-ring lofted torso, sloped trapezius shoulders, continuous
    sculpted arms (shoulder -> elbow -> forearm -> wrist -> connected hand), and sculpted legs
  - Real C-shaped layered open jackets/cardigans & pleated skirts (zero clipping!)
  - Charming stylized face (tapered chin, expressive almond eyes with iris/pupil/catchlights,
    eyelashes, curved brows, delicate nose, warm smile, subtle blush)
  - Flowing multi-strand curved hairstyles & bespoke fashion accessories
  - Full 17-bone humanoid Armature + 5 smooth animations: Idle, Walk, Run, Sit, Wave

Usage:
  blender --background --python scripts/sanctuary/generate_blender_characters.py
"""

import math
import os
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

OUTPUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "site", "public", "assets", "models", "characters")
)


def hex_to_rgba(hex_str, alpha=1.0):
    h = hex_str.lstrip("#")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0

    def to_lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return (to_lin(r), to_lin(g), to_lin(b), alpha)


def make_mat(name, hex_color, roughness=0.62, metallic=0.0, emission=None, emission_strength=0.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
    if bsdf:
        rgba = hex_to_rgba(hex_color)
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.28
        if emission and emission_strength > 0:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = hex_to_rgba(emission)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
        mat.diffuse_color = rgba
    return mat


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def set_smooth(obj):
    if obj.type != "MESH":
        return
    mesh = obj.data
    n = len(mesh.polygons)
    if n > 0:
        mesh.polygons.foreach_set("use_smooth", [True] * n)
    mesh.update()


def assign_material(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def tag_part(obj, zone):
    """Stores anatomical zone on object so skinning weights never cross-bleed across limbs."""
    obj["rig_zone"] = zone
    return obj


# ---------------------------------------------------------------------------
# Smooth Anatomical Sculpting Primitives
# ---------------------------------------------------------------------------
def create_lofted_mesh(name, rings, mat, zone, cap_bottom=True, cap_top=True, segs=22):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vert_rings = []
    for ring in rings:
        z, rx, ry = ring[0], ring[1], ring[2]
        cx = ring[3] if len(ring) > 3 else 0.0
        cy = ring[4] if len(ring) > 4 else 0.0
        front_scale = ring[5] if len(ring) > 5 else 1.0
        back_scale = ring[6] if len(ring) > 6 else 1.0
        vring = []
        for s in range(segs):
            ang = (s / segs) * math.tau
            ca = math.cos(ang)
            sa = math.sin(ang)
            ry_eff = ry * (front_scale if sa < 0 else back_scale)
            vring.append(bm.verts.new((cx + ca * rx, cy + sa * ry_eff, z)))
        vert_rings.append(vring)

    for r_idx in range(len(vert_rings) - 1):
        r0 = vert_rings[r_idx]
        r1 = vert_rings[r_idx + 1]
        for s in range(segs):
            sn = (s + 1) % segs
            bm.faces.new((r0[s], r0[sn], r1[sn], r1[s]))

    if cap_bottom and vert_rings:
        bm.faces.new(list(reversed(vert_rings[0])))
    if cap_top and vert_rings:
        bm.faces.new(vert_rings[-1])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, zone)


def create_open_jacket_shell(name, rings, mat, zone, gap_half_deg=26.0, thickness=0.011, segs=24):
    """
    Creates a real 3D open-front jacket / cardigan wrapping smoothly outside the torso
    with zero z-fighting or box clipping! Front is -Y (angle = -90 deg = 3*pi/2).
    """
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    gap = math.radians(gap_half_deg)
    # Sweep from -pi/2 + gap around back to 3*pi/2 - gap
    start_ang = -math.pi * 0.5 + gap
    end_ang = math.pi * 1.5 - gap

    outer_rings = []
    inner_rings = []
    for ring in rings:
        z, rx, ry = ring[0], ring[1], ring[2]
        cx = ring[3] if len(ring) > 3 else 0.0
        cy = ring[4] if len(ring) > 4 else 0.0
        front_scale = ring[5] if len(ring) > 5 else 1.0
        back_scale = ring[6] if len(ring) > 6 else 1.0
        o_ring = []
        i_ring = []
        for s in range(segs + 1):
            t = s / float(segs)
            ang = start_ang + (end_ang - start_ang) * t
            ca = math.cos(ang)
            sa = math.sin(ang)
            f_sc = front_scale if sa < 0 else back_scale
            ox = cx + ca * (rx + thickness)
            oy = cy + sa * (ry * f_sc + thickness)
            ix = cx + ca * (rx + 0.002)
            iy = cy + sa * (ry * f_sc + 0.002)
            o_ring.append(bm.verts.new((ox, oy, z)))
            i_ring.append(bm.verts.new((ix, iy, z)))
        outer_rings.append(o_ring)
        inner_rings.append(i_ring)

    n_r = len(rings)
    for r in range(n_r - 1):
        for s in range(segs):
            # Outer wall
            bm.faces.new((outer_rings[r][s], outer_rings[r][s + 1], outer_rings[r + 1][s + 1], outer_rings[r + 1][s]))
            # Inner wall
            bm.faces.new((inner_rings[r][s + 1], inner_rings[r][s], inner_rings[r + 1][s], inner_rings[r + 1][s + 1]))
        # Front vertical lapel edges (s = 0 and s = segs)
        bm.faces.new((inner_rings[r][0], outer_rings[r][0], outer_rings[r + 1][0], inner_rings[r + 1][0]))
        bm.faces.new((outer_rings[r][segs], inner_rings[r][segs], inner_rings[r + 1][segs], outer_rings[r + 1][segs]))

    # Top and bottom rim caps
    for s in range(segs):
        bm.faces.new((inner_rings[0][s], inner_rings[0][s + 1], outer_rings[0][s + 1], outer_rings[0][s]))
        bm.faces.new((outer_rings[-1][s], outer_rings[-1][s + 1], inner_rings[-1][s + 1], inner_rings[-1][s]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, zone)


def create_tube_along_points(name, pts, radii, mat, zone, segs=16, cap_start=True, cap_end=True):
    """Creates a smooth continuous anatomical limb tube along a 3D spine with zero joint seams!"""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    vecs = [Vector(p) for p in pts]
    n = len(vecs)
    for i in range(n):
        if i == 0:
            tangent = (vecs[1] - vecs[0]).normalized()
        elif i == n - 1:
            tangent = (vecs[-1] - vecs[-2]).normalized()
        else:
            tangent = ((vecs[i + 1] - vecs[i]).normalized() + (vecs[i] - vecs[i - 1]).normalized()).normalized()

        ref = Vector((0, 1, 0)) if abs(tangent.y) < 0.9 else Vector((1, 0, 0))
        u = tangent.cross(ref).normalized()
        v = tangent.cross(u).normalized()

        rx, ry = radii[i] if isinstance(radii[i], tuple) else (radii[i], radii[i])
        ring = []
        for s in range(segs):
            a = (s / segs) * math.tau
            p = vecs[i] + u * (math.cos(a) * rx) + v * (math.sin(a) * ry)
            ring.append(bm.verts.new(p))
        rings.append(ring)

    for r in range(n - 1):
        for s in range(segs):
            sn = (s + 1) % segs
            bm.faces.new((rings[r][s], rings[r][sn], rings[r + 1][sn], rings[r + 1][s]))

    if cap_start:
        bm.faces.new(list(reversed(rings[0])))
    if cap_end:
        bm.faces.new(rings[-1])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, zone)


def create_ellipsoid(name, center, radii, mat, zone, rot_euler=(0, 0, 0), segs=18, rings=12):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    rot_m = Euler(rot_euler, "XYZ").to_matrix().to_4x4()
    scale_m = Matrix.Diagonal((radii[0], radii[1], radii[2], 1.0))
    trans_m = Matrix.Translation(Vector(center))
    bmesh.ops.transform(bm, matrix=trans_m @ rot_m @ scale_m, verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, zone)


def create_hair_strand(name, pts, radii, mat, zone="head", res=6, bevel_res=3):
    curve_data = bpy.data.curves.new(name=name + "_crv", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = res
    curve_data.bevel_depth = 1.0
    curve_data.bevel_resolution = bevel_res
    curve_data.use_fill_caps = True

    spline = curve_data.splines.new(type="NURBS")
    spline.points.add(len(pts) - 1)
    for i, (p, r) in enumerate(zip(pts, radii)):
        spline.points[i].co = (p[0], p[1], p[2], 1.0)
        spline.points[i].radius = r
    spline.use_endpoint_u = True
    spline.order_u = min(4, len(pts))

    curve_obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(curve_obj)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = curve_obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(eval_obj)
    mesh_obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(mesh_obj)
    bpy.data.objects.remove(curve_obj, do_unlink=True)
    bpy.data.curves.remove(curve_data, do_unlink=True)

    assign_material(mesh_obj, mat)
    set_smooth(mesh_obj)
    return tag_part(mesh_obj, zone)


def create_cylinder_part(name, p0, p1, r0, r1, mat, zone, segs=14):
    v0 = Vector(p0)
    v1 = Vector(p1)
    dv = v1 - v0
    length = dv.length
    if length < 1e-5:
        return None
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r0, radius2=r1, depth=length
    )
    quat = Vector((0, 0, 1)).rotation_difference(dv.normalized())
    mat4 = Matrix.Translation((v0 + v1) * 0.5) @ quat.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=mat4, verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, zone)


def create_rounded_box(name, center, dims, mat, zone, rot_euler=(0, 0, 0), bevel_w=0.012):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel_w, segments=2, affect="EDGES")
    mat4 = Matrix.Translation(Vector(center)) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=mat4, verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, zone)


# ---------------------------------------------------------------------------
# Charming Stylized Head, Face & Layered Hair
# ---------------------------------------------------------------------------
def build_sculpted_head_and_face(parts, mats, head_z, is_fem, eye_color_hex):
    skin = mats["skin"]
    hair = mats["hair"]
    eye_white = make_mat("EyeWhite", "#FFFFFF", roughness=0.22)
    iris_mat = make_mat(f"Iris_{eye_color_hex}", eye_color_hex, roughness=0.18)
    pupil_mat = make_mat("PupilDark", "#181326", roughness=0.16)
    lash_mat = make_mat("LashDark", "#231B2E", roughness=0.52)
    lip_mat = make_mat("LipSoft", "#E87A82" if is_fem else "#CE7E72", roughness=0.45)
    blush_mat = make_mat("BlushWarm", "#FCA5B8", roughness=0.72)

    w_s = 0.96 if is_fem else 1.01
    head_rings = [
        (head_z - 0.008, 0.032 * w_s, 0.034, 0.0, -0.020, 1.06, 0.84),
        (head_z + 0.016, 0.068 * w_s, 0.068, 0.0, -0.014, 1.08, 0.90),
        (head_z + 0.052, 0.095 * w_s, 0.092, 0.0, -0.006, 1.04, 0.96),
        (head_z + 0.098, 0.108 * w_s, 0.108, 0.0, 0.002, 1.00, 1.04),
        (head_z + 0.150, 0.112 * w_s, 0.116, 0.0, 0.008, 0.98, 1.08),
        (head_z + 0.200, 0.094 * w_s, 0.103, 0.0, 0.010, 0.96, 1.06),
        (head_z + 0.234, 0.048 * w_s, 0.054, 0.0, 0.008, 0.95, 1.02),
    ]
    parts.append(create_lofted_mesh("Head", head_rings, skin, "head", segs=24))

    for sx in (-1, 1):
        parts.append(
            create_ellipsoid(
                f"Ear_{sx}", (sx * 0.104 * w_s, 0.008, head_z + 0.088),
                (0.015, 0.020, 0.030), skin, "head", rot_euler=(0.0, sx * 0.15, sx * -0.22), segs=10, rings=8
            )
        )

    # Delicate stylized nose (subtle and cute)
    parts.append(
        create_ellipsoid(
            "Nose", (0.0, -0.099, head_z + 0.072),
            (0.0085, 0.011, 0.012), skin, "head", rot_euler=(0.3, 0, 0), segs=10, rings=8
        )
    )

    # Expressive Almond Stylized Eyes
    eye_z = head_z + 0.098
    eye_x = 0.042 * w_s
    eye_y = -0.094
    eye_h = 0.024 if is_fem else 0.019
    eye_w = 0.022 if is_fem else 0.020

    for sx in (-1, 1):
        yaw = sx * -0.22
        parts.append(create_ellipsoid(f"EyeWhite_{sx}", (sx * eye_x, eye_y, eye_z), (eye_w, 0.012, eye_h), eye_white, "head", rot_euler=(0, 0, yaw), segs=14, rings=10))
        parts.append(create_ellipsoid(f"EyeIris_{sx}", (sx * (eye_x - 0.001), eye_y - 0.008, eye_z - 0.001), (eye_w * 0.68, 0.009, eye_h * 0.80), iris_mat, "head", rot_euler=(0, 0, yaw), segs=14, rings=10))
        parts.append(create_ellipsoid(f"EyePupil_{sx}", (sx * (eye_x - 0.001), eye_y - 0.013, eye_z - 0.001), (eye_w * 0.36, 0.006, eye_h * 0.44), pupil_mat, "head", rot_euler=(0, 0, yaw), segs=10, rings=8))
        # Dual catchlights (main upper + mini lower sparkle)
        parts.append(create_ellipsoid(f"EyeShineA_{sx}", (sx * eye_x + 0.006, eye_y - 0.017, eye_z + 0.007), (0.0056, 0.003, 0.0056), eye_white, "head", segs=8, rings=6))
        parts.append(create_ellipsoid(f"EyeShineB_{sx}", (sx * eye_x - 0.005, eye_y - 0.016, eye_z - 0.007), (0.0030, 0.0025, 0.0030), eye_white, "head", segs=8, rings=6))

        lash_pts = [
            (sx * (eye_x - 0.020), eye_y - 0.009, eye_z + eye_h * 0.62),
            (sx * eye_x, eye_y - 0.014, eye_z + eye_h * 0.98),
            (sx * (eye_x + 0.023), eye_y - 0.003, eye_z + eye_h * 0.52),
        ]
        parts.append(create_hair_strand(f"Lash_{sx}", lash_pts, [0.0032, 0.0052 if is_fem else 0.0040, 0.0030], lash_mat, "head", res=4, bevel_res=2))

        brow_pts = [
            (sx * (eye_x - 0.020), eye_y - 0.008, eye_z + 0.035),
            (sx * eye_x, eye_y - 0.011, eye_z + 0.039),
            (sx * (eye_x + 0.022), eye_y - 0.003, eye_z + 0.034),
        ]
        parts.append(create_hair_strand(f"Brow_{sx}", brow_pts, [0.0028, 0.0044 if not is_fem else 0.0034, 0.0024], hair, "head", res=4, bevel_res=2))

        if is_fem:
            parts.append(create_ellipsoid(f"Blush_{sx}", (sx * (eye_x + 0.016), eye_y + 0.008, eye_z - 0.030), (0.017, 0.005, 0.0085), blush_mat, "head", rot_euler=(0, 0, sx * -0.42), segs=10, rings=6))

    # Warm clearly visible friendly smile curve sitting slightly proud of chin surface
    mouth_pts = [
        (-0.020, -0.088, head_z + 0.041),
        (-0.009, -0.095, head_z + 0.036),
        (0.000, -0.097, head_z + 0.035),
        (0.009, -0.095, head_z + 0.036),
        (0.020, -0.088, head_z + 0.041),
    ]
    parts.append(create_hair_strand("Mouth", mouth_pts, [0.0024, 0.0042, 0.0048, 0.0042, 0.0024], lip_mat, "head", res=5, bevel_res=2))


def build_hairstyle(parts, hair_mat, accent_mat, head_z, style):
    cap_rings = [
        (head_z + 0.062, 0.105, 0.110, 0.0, 0.024, 0.62, 1.08),
        (head_z + 0.115, 0.118, 0.123, 0.0, 0.012, 0.85, 1.12),
        (head_z + 0.168, 0.121, 0.127, 0.0, 0.010, 0.99, 1.10),
        (head_z + 0.214, 0.100, 0.108, 0.0, 0.010, 0.96, 1.05),
        (head_z + 0.246, 0.048, 0.055, 0.0, 0.008, 0.95, 1.00),
    ]
    parts.append(create_lofted_mesh("HairCap", cap_rings, hair_mat, "head", segs=22))

    if style == "ponytail":
        bangs = [
            ([(0.01, -0.075, head_z + 0.218), (-0.035, -0.116, head_z + 0.166), (-0.078, -0.104, head_z + 0.106)], [0.024, 0.028, 0.010]),
            ([(-0.01, -0.080, head_z + 0.215), (0.025, -0.120, head_z + 0.164), (0.060, -0.110, head_z + 0.118)], [0.024, 0.027, 0.009]),
            ([(0.03, -0.065, head_z + 0.208), (0.082, -0.098, head_z + 0.148), (0.102, -0.076, head_z + 0.055)], [0.022, 0.024, 0.009]),
            ([(-0.04, -0.065, head_z + 0.208), (-0.095, -0.084, head_z + 0.140), (-0.105, -0.056, head_z + 0.040)], [0.022, 0.024, 0.009]),
        ]
        for idx, (pts, rads) in enumerate(bangs):
            parts.append(create_hair_strand(f"Bang_{idx}", pts, rads, hair_mat, "head"))
        parts.append(create_ellipsoid("HairTie", (0.0, 0.132, head_z + 0.178), (0.040, 0.025, 0.040), accent_mat, "head", rot_euler=(0.45, 0, 0)))
        tail_strands = [
            ([(0.0, 0.128, head_z + 0.175), (0.0, 0.210, head_z + 0.135), (0.0, 0.242, head_z - 0.01), (0.0, 0.210, head_z - 0.16)], [0.036, 0.052, 0.040, 0.012]),
            ([(-0.018, 0.128, head_z + 0.170), (-0.052, 0.198, head_z + 0.120), (-0.058, 0.214, head_z - 0.03), (-0.036, 0.188, head_z - 0.13)], [0.028, 0.038, 0.028, 0.009]),
            ([(0.018, 0.128, head_z + 0.170), (0.052, 0.198, head_z + 0.120), (0.058, 0.214, head_z - 0.03), (0.036, 0.188, head_z - 0.13)], [0.028, 0.038, 0.028, 0.009]),
        ]
        for idx, (pts, rads) in enumerate(tail_strands):
            parts.append(create_hair_strand(f"Ponytail_{idx}", pts, rads, hair_mat, "head"))

    elif style == "short_textured":
        locks = [
            ([(0.0, -0.05, head_z + 0.232), (-0.02, -0.122, head_z + 0.176), (-0.035, -0.118, head_z + 0.126)], [0.027, 0.030, 0.011]),
            ([(0.02, -0.05, head_z + 0.232), (0.032, -0.122, head_z + 0.172), (0.026, -0.116, head_z + 0.130)], [0.026, 0.028, 0.010]),
            ([(-0.04, -0.04, head_z + 0.222), (-0.078, -0.105, head_z + 0.162), (-0.092, -0.084, head_z + 0.112)], [0.026, 0.026, 0.010]),
            ([(0.04, -0.04, head_z + 0.222), (0.084, -0.098, head_z + 0.160), (0.098, -0.074, head_z + 0.110)], [0.026, 0.026, 0.010]),
            ([(-0.02, 0.04, head_z + 0.242), (-0.058, 0.122, head_z + 0.16), (-0.060, 0.105, head_z + 0.055)], [0.032, 0.036, 0.016]),
            ([(0.02, 0.04, head_z + 0.242), (0.058, 0.122, head_z + 0.16), (0.060, 0.105, head_z + 0.055)], [0.032, 0.036, 0.016]),
        ]
        for idx, (pts, rads) in enumerate(locks):
            parts.append(create_hair_strand(f"ShortLock_{idx}", pts, rads, hair_mat, "head"))

    elif style == "long_wavy_beret":
        back_locks = [
            ([(0.0, 0.08, head_z + 0.18), (0.0, 0.148, head_z + 0.05), (0.0, 0.158, head_z - 0.10), (0.0, 0.130, head_z - 0.24)], [0.044, 0.054, 0.048, 0.018]),
            ([(-0.05, 0.06, head_z + 0.17), (-0.088, 0.128, head_z + 0.04), (-0.098, 0.128, head_z - 0.10), (-0.078, 0.108, head_z - 0.22)], [0.036, 0.044, 0.040, 0.016]),
            ([(0.05, 0.06, head_z + 0.17), (0.088, 0.128, head_z + 0.04), (0.098, 0.128, head_z - 0.10), (0.078, 0.108, head_z - 0.22)], [0.036, 0.044, 0.040, 0.016]),
            ([(-0.07, -0.02, head_z + 0.17), (-0.120, -0.045, head_z + 0.06), (-0.114, -0.058, head_z - 0.07), (-0.096, -0.068, head_z - 0.17)], [0.026, 0.030, 0.026, 0.010]),
            ([(0.07, -0.02, head_z + 0.17), (0.120, -0.045, head_z + 0.06), (0.114, -0.058, head_z - 0.07), (0.096, -0.068, head_z - 0.17)], [0.026, 0.030, 0.026, 0.010]),
            ([(0.0, -0.07, head_z + 0.205), (-0.035, -0.118, head_z + 0.158), (-0.060, -0.110, head_z + 0.118)], [0.024, 0.026, 0.010]),
            ([(0.01, -0.07, head_z + 0.205), (0.042, -0.118, head_z + 0.158), (0.068, -0.106, head_z + 0.115)], [0.024, 0.026, 0.010]),
        ]
        for idx, (pts, rads) in enumerate(back_locks):
            parts.append(create_hair_strand(f"WavyLock_{idx}", pts, rads, hair_mat, "head"))
        parts.append(create_ellipsoid("Beret", (-0.024, 0.015, head_z + 0.240), (0.135, 0.135, 0.048), accent_mat, "head", rot_euler=(-0.18, -0.22, 0.1)))
        parts.append(create_cylinder_part("BeretStem", (-0.032, 0.018, head_z + 0.276), (-0.038, 0.022, head_z + 0.308), 0.008, 0.005, accent_mat, "head", segs=8))

    elif style == "comma_glasses":
        locks = [
            ([(-0.02, -0.06, head_z + 0.228), (-0.052, -0.118, head_z + 0.170), (-0.026, -0.120, head_z + 0.126)], [0.026, 0.028, 0.011]),
            ([(0.02, -0.06, head_z + 0.228), (0.064, -0.112, head_z + 0.165), (0.090, -0.084, head_z + 0.116)], [0.026, 0.028, 0.011]),
            ([(-0.06, -0.03, head_z + 0.208), (-0.106, -0.060, head_z + 0.140), (-0.104, -0.025, head_z + 0.075)], [0.024, 0.024, 0.010]),
            ([(0.06, -0.03, head_z + 0.208), (0.106, -0.060, head_z + 0.140), (0.104, -0.025, head_z + 0.075)], [0.024, 0.024, 0.010]),
        ]
        for idx, (pts, rads) in enumerate(locks):
            parts.append(create_hair_strand(f"CommaLock_{idx}", pts, rads, hair_mat, "head"))

        frame_mat = make_mat("GlassesFrame", "#2B2630", roughness=0.25, metallic=0.65)
        eye_z = head_z + 0.098
        for sx in (-1, 1):
            ring_pts = []
            for k in range(13):
                a = (k / 12.0) * math.tau
                ring_pts.append((sx * 0.043 + math.cos(a) * 0.027, -0.111 + abs(math.cos(a)) * 0.005, eye_z + math.sin(a) * 0.026))
            parts.append(create_hair_strand(f"GlassRim_{sx}", ring_pts, [0.0034] * len(ring_pts), frame_mat, "head", res=2, bevel_res=2))
            parts.append(create_cylinder_part(f"GlassArm_{sx}", (sx * 0.070, -0.106, eye_z + 0.005), (sx * 0.108, 0.002, eye_z + 0.004), 0.0028, 0.0028, frame_mat, "head", segs=6))
        parts.append(create_cylinder_part("GlassBridge", (-0.016, -0.112, eye_z + 0.004), (0.016, -0.112, eye_z + 0.004), 0.003, 0.003, frame_mat, "head", segs=6))

    elif style == "twintails_headband":
        bangs = [
            ([(0.0, -0.07, head_z + 0.218), (0.0, -0.120, head_z + 0.168), (0.0, -0.118, head_z + 0.124)], [0.024, 0.026, 0.010]),
            ([(-0.03, -0.07, head_z + 0.215), (-0.058, -0.114, head_z + 0.162), (-0.070, -0.100, head_z + 0.112)], [0.022, 0.024, 0.009]),
            ([(0.03, -0.07, head_z + 0.215), (0.058, -0.114, head_z + 0.162), (0.070, -0.100, head_z + 0.112)], [0.022, 0.024, 0.009]),
        ]
        for idx, (pts, rads) in enumerate(bangs):
            parts.append(create_hair_strand(f"TwinBang_{idx}", pts, rads, hair_mat, "head"))

        for sx in (-1, 1):
            parts.append(create_ellipsoid(f"TwinTie_{sx}", (sx * 0.116, 0.045, head_z + 0.174), (0.026, 0.028, 0.028), accent_mat, "head"))
            t_pts = [
                (sx * 0.116, 0.045, head_z + 0.174),
                (sx * 0.184, 0.062, head_z + 0.118),
                (sx * 0.200, 0.075, head_z - 0.035),
                (sx * 0.172, 0.055, head_z - 0.175),
            ]
            parts.append(create_hair_strand(f"TwinTail_{sx}", t_pts, [0.032, 0.046, 0.036, 0.012], hair_mat, "head"))
            parts.append(create_cylinder_part(f"CatEar_{sx}", (sx * 0.068, -0.005, head_z + 0.236), (sx * 0.095, -0.005, head_z + 0.296), 0.026, 0.005, accent_mat, "head", segs=6))

        hb_pts = [(-0.118, 0.0, head_z + 0.13), (-0.098, -0.01, head_z + 0.218), (0.0, -0.015, head_z + 0.256), (0.098, -0.01, head_z + 0.218), (0.118, 0.0, head_z + 0.13)]
        parts.append(create_hair_strand("Headband", hb_pts, [0.009] * 5, make_mat("BandDark", "#1E293B", roughness=0.35), "head", res=5, bevel_res=2))

    else:  # "side_part_wave"
        locks = [
            ([(-0.04, -0.05, head_z + 0.235), (0.015, -0.122, head_z + 0.180), (0.068, -0.106, head_z + 0.124)], [0.028, 0.032, 0.011]),
            ([(-0.05, -0.05, head_z + 0.225), (-0.090, -0.098, head_z + 0.160), (-0.102, -0.064, head_z + 0.100)], [0.026, 0.026, 0.010]),
            ([(0.05, -0.03, head_z + 0.218), (0.100, -0.070, head_z + 0.148), (0.106, -0.032, head_z + 0.088)], [0.024, 0.024, 0.010]),
        ]
        for idx, (pts, rads) in enumerate(locks):
            parts.append(create_hair_strand(f"SideWave_{idx}", pts, rads, hair_mat, "head"))


# ---------------------------------------------------------------------------
# Full Stylized Humanoid Builder (Per-Part Semantic Rigging!)
# ---------------------------------------------------------------------------
def build_character_and_armature(spec):
    parts = []
    is_fem = spec["gender"] == "F"
    H = spec["height"]
    scale_z = H / 1.74

    mats = {
        "skin": make_mat("Skin", spec["skin"], roughness=0.58),
        "hair": make_mat("Hair", spec["hair"], roughness=0.52),
        "top": make_mat("Top", spec["top"], roughness=0.68),
        "inner": make_mat("Inner", spec["inner"], roughness=0.70),
        "bottom": make_mat("Bottom", spec["bottom"], roughness=0.72),
        "accent": make_mat("Accent", spec["accent"], roughness=0.46, emission=spec.get("accent_emit"), emission_strength=spec.get("accent_emit_str", 0.0)),
        "shoe": make_mat("Shoe", spec["shoe"], roughness=0.44),
        "sole": make_mat("Sole", "#F8FAFC", roughness=0.55),
        "sock": make_mat("Sock", spec.get("sock", "#F8FAFC"), roughness=0.72),
        "metal": make_mat("Metal", "#E2E8F0", roughness=0.25, metallic=0.8),
    }

    z_ankle = 0.088 * scale_z
    z_knee = 0.462 * scale_z
    z_hip = 0.860 * scale_z
    z_waist = 1.050 * scale_z
    z_chest = 1.255 * scale_z
    z_shoulder = 1.385 * scale_z
    z_neck_top = 1.468 * scale_z
    z_head_base = 1.452 * scale_z

    hip_x = 0.092 if is_fem else 0.100
    sh_x = 0.156 if is_fem else 0.184

    # 1. Head & Hairstyle
    build_sculpted_head_and_face(parts, mats, z_head_base, is_fem, spec["eye"])
    build_hairstyle(parts, mats["hair"], mats["accent"], z_head_base, spec["hair_style"])

    # 2. Graceful Neck with soft collarbone base
    neck_rings = [
        (z_shoulder - 0.025, 0.068, 0.062),
        (z_shoulder + 0.022, 0.044, 0.044),
        (z_neck_top + 0.028, 0.041, 0.041),
    ]
    parts.append(create_lofted_mesh("Neck", neck_rings, mats["skin"], "neck", segs=18))

    # 3. Sculpted Torso (with natural sloped trapezius shoulders!)
    if is_fem:
        torso_rings = [
            (z_hip - 0.032, 0.146, 0.104, 0.0, 0.005, 0.96, 1.08),
            (z_hip + 0.055, 0.130, 0.093, 0.0, 0.002, 0.98, 1.04),
            (z_waist,       0.102, 0.077, 0.0, 0.000, 1.00, 1.00),
            (z_waist + 0.10, 0.124, 0.093, 0.0, -0.004, 1.08, 0.98),
            (z_chest,       0.142, 0.110, 0.0, -0.012, 1.18, 0.96),
            (z_shoulder - 0.032, 0.152, 0.088, 0.0, 0.000, 1.00, 1.00),
            (z_shoulder + 0.004, 0.116, 0.068, 0.0, 0.002, 0.96, 0.96),
            (z_shoulder + 0.026, 0.062, 0.058, 0.0, 0.002, 0.96, 0.96),
        ]
    else:
        torso_rings = [
            (z_hip - 0.032, 0.144, 0.102, 0.0, 0.002, 1.00, 1.02),
            (z_hip + 0.055, 0.136, 0.096, 0.0, 0.000, 1.00, 1.00),
            (z_waist,       0.126, 0.092, 0.0, 0.000, 1.00, 1.00),
            (z_waist + 0.11, 0.154, 0.108, 0.0, -0.004, 1.05, 1.00),
            (z_chest + 0.02, 0.176, 0.116, 0.0, -0.006, 1.08, 1.02),
            (z_shoulder - 0.028, 0.184, 0.098, 0.0, 0.000, 1.00, 1.00),
            (z_shoulder + 0.008, 0.132, 0.074, 0.0, 0.002, 0.96, 0.96),
            (z_shoulder + 0.028, 0.068, 0.062, 0.0, 0.002, 0.96, 0.96),
        ]

    if spec.get("open_jacket"):
        # Inner shirt is the clean base torso, outer tailored C-shaped jacket wraps outside!
        parts.append(create_lofted_mesh("InnerTorso", torso_rings, mats["inner"], "torso", segs=24))
        jacket_rings = torso_rings[1:7]  # from upper hip to collarbone!
        parts.append(create_open_jacket_shell("OpenJacket", jacket_rings, mats["top"], "torso", gap_half_deg=24.0, thickness=0.013, segs=24))
    else:
        parts.append(create_lofted_mesh("Torso", torso_rings, mats["top"], "torso", segs=24))

    # Crisp Collar Rim
    collar_rings = [
        (z_shoulder - 0.008, 0.076, 0.072, 0.0, -0.004),
        (z_shoulder + 0.028, 0.062, 0.060, 0.0, -0.002),
    ]
    parts.append(create_lofted_mesh("Collar", collar_rings, mats["accent"] if not spec.get("open_jacket") else mats["top"], "torso", cap_top=False, segs=20))

    # Belt / Waist Sash
    belt_rings = [
        (z_waist - 0.044, (0.114 if is_fem else 0.136), (0.088 if is_fem else 0.102)),
        (z_waist + 0.006, (0.109 if is_fem else 0.133), (0.084 if is_fem else 0.100)),
    ]
    parts.append(create_lofted_mesh("WaistBelt", belt_rings, mats["accent"], "torso", segs=22))

    # 4. Lower Garment (Skirt / Dress / Shorts / Pants Pelvis)
    bottom_style = spec["bottom_style"]
    if bottom_style in ("skirt", "dress"):
        hem_z = z_hip - (0.28 if bottom_style == "dress" else 0.21) * scale_z
        skirt_rings = [
            (hem_z,          0.242 if bottom_style == "dress" else 0.215, 0.194 if bottom_style == "dress" else 0.172, 0.0, 0.004),
            (hem_z + 0.12,   0.196, 0.156, 0.0, 0.004),
            (z_hip + 0.02,   0.162, 0.122, 0.0, 0.003),
            (z_waist - 0.01, 0.114, 0.088, 0.0, 0.001),
        ]
        parts.append(create_lofted_mesh("Skirt", skirt_rings, mats["bottom"], "skirt", cap_bottom=False, segs=26))
        trim_rings = [
            (hem_z - 0.004, (0.245 if bottom_style == "dress" else 0.218), (0.197 if bottom_style == "dress" else 0.175)),
            (hem_z + 0.022, (0.237 if bottom_style == "dress" else 0.210), (0.190 if bottom_style == "dress" else 0.168)),
        ]
        parts.append(create_lofted_mesh("SkirtTrim", trim_rings, mats["accent"], "skirt", cap_bottom=False, cap_top=False, segs=26))
    else:
        pelvis_rings = [
            (z_hip - 0.088, 0.132, 0.092, 0.0, 0.004),
            (z_hip - 0.032, 0.156, 0.112, 0.0, 0.004),
            (z_hip + 0.045, 0.148, 0.106, 0.0, 0.002),
            (z_waist - 0.02, (0.114 if is_fem else 0.136), (0.088 if is_fem else 0.102)),
        ]
        parts.append(create_lofted_mesh("Pelvis", pelvis_rings, mats["bottom"], "hips", segs=22))

    # 5. Seamless Sculpted Legs + Contoured Sneakers (each leg cleanly tagged leg_L / leg_R!)
    for side, sx in (("L", 1), ("R", -1)):
        z_tag = f"leg_{side}"
        lx = sx * hip_x
        thigh_r = 0.068 if is_fem else 0.074
        knee_r = 0.048 if is_fem else 0.053
        calf_r = 0.052 if is_fem else 0.057
        ankle_r = 0.035 if is_fem else 0.039

        if bottom_style == "pants":
            leg_rings = [
                (z_ankle + 0.015, ankle_r * 1.22, ankle_r * 1.22, lx, 0.0),
                (z_ankle + 0.17,  calf_r * 1.08, calf_r * 1.10, lx, 0.005),
                (z_knee,          knee_r * 1.12, knee_r * 1.12, lx, -0.004),
                (z_hip - 0.16,    thigh_r * 1.06, thigh_r * 1.06, lx, 0.0),
                (z_hip - 0.04,    thigh_r * 1.02, thigh_r * 1.02, lx * 0.90, 0.002),
                (z_hip + 0.02,    thigh_r * 0.86, thigh_r * 0.88, lx * 0.72, 0.003),
            ]
            parts.append(create_lofted_mesh(f"Leg_{side}", leg_rings, mats["bottom"], z_tag, segs=18))
            parts.append(create_ellipsoid(f"HipBlend_{side}", (lx * 0.92, 0.002, z_hip - 0.045), (thigh_r * 1.04, thigh_r * 1.06, 0.072), mats["bottom"], z_tag, segs=14, rings=10))
        else:
            if bottom_style == "shorts":
                short_rings = [
                    (z_hip - 0.175, thigh_r * 1.10, thigh_r * 1.08, lx, 0.0),
                    (z_hip - 0.04,  thigh_r * 1.04, thigh_r * 1.04, lx * 0.90, 0.002),
                    (z_hip + 0.02,  thigh_r * 0.88, thigh_r * 0.90, lx * 0.72, 0.003),
                ]
                parts.append(create_lofted_mesh(f"Shorts_{side}", short_rings, mats["bottom"], z_tag, segs=18))
                parts.append(create_ellipsoid(f"HipBlend_{side}", (lx * 0.92, 0.002, z_hip - 0.045), (thigh_r * 1.05, thigh_r * 1.05, 0.068), mats["bottom"], z_tag, segs=14, rings=10))

            sock_top_z = z_knee - (0.035 if spec.get("high_socks") else 0.24) * scale_z
            skin_leg_rings = [
                (sock_top_z - 0.015, (knee_r * 0.96 if spec.get("high_socks") else ankle_r * 1.04), (knee_r * 0.96 if spec.get("high_socks") else ankle_r * 1.04), lx, 0.0),
                (z_knee,             knee_r, knee_r, lx, -0.004),
                (z_hip - 0.175,      thigh_r * 0.96, thigh_r * 0.98, lx, 0.0),
                (z_hip - 0.03,       thigh_r * 0.94, thigh_r * 0.94, lx * 0.88, 0.003),
            ]
            parts.append(create_lofted_mesh(f"LegSkin_{side}", skin_leg_rings, mats["skin"], z_tag, segs=18))

            sock_rings = [
                (z_ankle,         ankle_r * 1.08, ankle_r * 1.08, lx, 0.0),
                ((z_ankle + sock_top_z) * 0.55, calf_r * 0.99, calf_r * 1.03, lx, 0.006),
                (sock_top_z + 0.008, (knee_r * 0.98 if spec.get("high_socks") else ankle_r * 1.10), (knee_r * 0.98 if spec.get("high_socks") else ankle_r * 1.10), lx, 0.0),
            ]
            parts.append(create_lofted_mesh(f"Sock_{side}", sock_rings, mats["sock"], z_tag, segs=18))

        # Contoured Modern Sneaker (ankle collar + upper + curved midsole planted at Z=0!)
        parts.append(create_lofted_mesh(
            f"ShoeAnkle_{side}",
            [(0.042, 0.046, 0.056, lx, -0.012), (z_ankle + 0.018, 0.042, 0.044, lx, -0.002)],
            mats["shoe"], z_tag, segs=16
        ))
        parts.append(create_ellipsoid(f"ShoeUpper_{side}", (lx, -0.042, 0.050), (0.048, 0.104, 0.038), mats["shoe"], z_tag, segs=16, rings=10))
        parts.append(create_rounded_box(f"ShoeSole_{side}", (lx, -0.042, 0.016), (0.098, 0.214, 0.032), mats["sole"], z_tag, bevel_w=0.011))

    # 6. Seamless Continuous Sculpted Arms (rounded organic deltoid shoulder + connected hands!)
    elbow_x_off = 0.068
    wrist_x_off = 0.118
    z_elbow = z_shoulder - 0.272 * scale_z
    z_wrist = z_shoulder - 0.530 * scale_z

    sleeve_mat = mats["top"]
    short_sleeve = spec.get("short_sleeve", False)

    for side, sx in (("L", 1), ("R", -1)):
        z_tag = f"arm_{side}"
        p_in = Vector((sx * (sh_x - 0.042), 0.0, z_shoulder - 0.036))
        p_sh = Vector((sx * (sh_x - 0.004), 0.0, z_shoulder - 0.040))
        p_el = Vector((sx * (sh_x + elbow_x_off), 0.010, z_elbow))
        p_wr = Vector((sx * (sh_x + wrist_x_off), -0.012, z_wrist))
        p_ha = Vector((sx * (sh_x + wrist_x_off + 0.012), -0.018, z_wrist - 0.042))

        r_sh = 0.042 if is_fem else 0.050
        r_el = 0.033 if is_fem else 0.040
        r_wr = 0.025 if is_fem else 0.030

        # Smooth rounded deltoid cap blending torso slope into upper arm!
        parts.append(create_ellipsoid(
            f"Deltoid_{side}",
            (sx * (sh_x - 0.010), 0.0, z_shoulder - 0.038),
            (r_sh * 1.10, r_sh * 1.06, r_sh * 1.08),
            sleeve_mat, z_tag, segs=14, rings=10
        ))

        if short_sleeve:
            p_mid = p_sh.lerp(p_el, 0.52)
            parts.append(create_tube_along_points(
                f"Sleeve_{side}", [p_in, p_sh, p_mid], [r_sh * 0.90, r_sh * 1.02, r_el * 1.12], sleeve_mat, z_tag, segs=16
            ))
            parts.append(create_tube_along_points(
                f"BareArm_{side}", [p_sh.lerp(p_mid, 0.7), p_mid, p_el, p_wr], [r_el * 0.96, r_el * 0.98, r_el * 0.94, r_wr], mats["skin"], z_tag, segs=16
            ))
        else:
            p_cuff = p_el.lerp(p_wr, 0.88)
            parts.append(create_tube_along_points(
                f"FullSleeve_{side}", [p_in, p_sh, p_el, p_cuff, p_wr],
                [r_sh * 0.90, r_sh * 1.00, r_el * 1.02, r_wr * 1.12, r_wr * 1.06], sleeve_mat, z_tag, segs=16
            ))
            parts.append(create_tube_along_points(
                f"WristSkin_{side}", [p_cuff, p_wr, p_ha], [r_wr * 0.88, r_wr * 0.86, r_wr * 0.82], mats["skin"], z_tag, segs=12
            ))

        # Sculpted Connected Hand + Curved Fingers + Thumb
        parts.append(create_ellipsoid(f"Palm_{side}", p_ha, (0.024, 0.032, 0.040), mats["skin"], z_tag, rot_euler=(0.08, sx * -0.14, 0), segs=12, rings=8))
        parts.append(create_ellipsoid(f"Fingers_{side}", p_ha + Vector((sx * 0.005, -0.006, -0.034)), (0.020, 0.024, 0.028), mats["skin"], z_tag, rot_euler=(0.2, sx * -0.1, 0), segs=10, rings=8))
        parts.append(create_ellipsoid(f"Thumb_{side}", p_ha + Vector((sx * -0.020, -0.022, 0.004)), (0.011, 0.017, 0.014), mats["skin"], z_tag, segs=8, rings=6))

    # 7. Bespoke Accessories (tagged cleanly to torso/chest!)
    acc = spec.get("accessory")
    if acc == "crossbody_bag":
        strap_pts = [(0.10, -0.098, z_shoulder - 0.008), (0.0, -0.125, z_chest - 0.04), (-0.152, -0.068, z_hip + 0.04), (-0.152, 0.062, z_hip + 0.04), (0.04, 0.118, z_chest), (0.10, 0.092, z_shoulder - 0.008)]
        parts.append(create_hair_strand("BagStrap", strap_pts, [0.010] * len(strap_pts), mats["accent"], "torso", res=4, bevel_res=2))
        parts.append(create_rounded_box("CrossPouch", (-0.168, -0.02, z_hip + 0.01), (0.062, 0.132, 0.120), mats["accent"], "hips", rot_euler=(0, 0.15, 0), bevel_w=0.015))
    elif acc == "neck_headphones":
        hp_pts = [(-0.080, -0.056, z_shoulder - 0.005), (-0.086, 0.024, z_shoulder + 0.018), (0.0, 0.090, z_shoulder + 0.028), (0.086, 0.024, z_shoulder + 0.018), (0.080, -0.056, z_shoulder - 0.005)]
        parts.append(create_hair_strand("HPBand", hp_pts, [0.013] * 5, mats["accent"], "chest", res=4, bevel_res=2))
        for sx in (-1, 1):
            parts.append(create_ellipsoid(f"HPCup_{sx}", (sx * 0.084, -0.072, z_shoulder - 0.012), (0.024, 0.036, 0.038), mats["shoe"], "chest"))
    elif acc == "camera_strap":
        cam_z = z_chest - 0.05
        strap_pts = [(-0.064, 0.04, z_shoulder + 0.012), (-0.080, -0.088, z_chest + 0.04), (-0.05, -0.134, cam_z + 0.02), (0.05, -0.134, cam_z + 0.02), (0.080, -0.088, z_chest + 0.04), (0.064, 0.04, z_shoulder + 0.012)]
        parts.append(create_hair_strand("CamStrap", strap_pts, [0.0065] * 6, mats["accent"], "chest", res=4, bevel_res=2))
        parts.append(create_rounded_box("CamBody", (0.0, -0.145, cam_z), (0.112, 0.046, 0.068), make_mat("CamDark", "#1F2937", roughness=0.35), "chest", bevel_w=0.008))
        parts.append(create_cylinder_part("CamLens", (0.0, -0.164, cam_z - 0.004), (0.0, -0.204, cam_z - 0.004), 0.024, 0.022, mats["metal"], "chest", segs=14))
    elif acc == "scarf":
        sc_pts = [(-0.074, -0.045, z_shoulder + 0.012), (0.0, -0.088, z_shoulder + 0.006), (0.074, -0.045, z_shoulder + 0.012), (0.068, 0.062, z_shoulder + 0.020), (0.0, 0.082, z_shoulder + 0.022), (-0.068, 0.062, z_shoulder + 0.020), (-0.074, -0.045, z_shoulder + 0.012)]
        parts.append(create_hair_strand("ScarfLoop", sc_pts, [0.026] * 7, mats["accent"], "chest", res=4, bevel_res=2))
        parts.append(create_rounded_box("ScarfTail", (0.036, -0.122, z_chest - 0.02), (0.056, 0.020, 0.21), mats["accent"], "chest", rot_euler=(0.05, 0, -0.06), bevel_w=0.008))

    # 8. Build 17-Bone Humanoid Armature
    arm_data = bpy.data.armatures.new(f"Armature_{spec['id']}")
    arm_obj = bpy.data.objects.new(f"Armature_{spec['id']}", arm_data)
    bpy.context.collection.objects.link(arm_obj)

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def add_bone(name, head, tail, parent=None, connected=False):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if parent:
            b.parent = eb[parent]
            b.use_connect = connected
        return b

    add_bone("Hips", (0, 0, z_hip), (0, 0, z_waist))
    add_bone("Spine", (0, 0, z_waist), (0, 0, z_chest), "Hips", True)
    add_bone("Chest", (0, 0, z_chest), (0, 0, z_shoulder + 0.015), "Spine", True)
    add_bone("Neck", (0, 0, z_shoulder + 0.015), (0, 0, z_neck_top + 0.02), "Chest", True)
    add_bone("Head", (0, 0, z_neck_top + 0.02), (0, 0, z_neck_top + 0.24), "Neck", True)

    for side, sgn in (("L", 1), ("R", -1)):
        p_sh = (sgn * sh_x, 0.0, z_shoulder - 0.030)
        p_el = (sgn * (sh_x + elbow_x_off), 0.010, z_elbow)
        p_wr = (sgn * (sh_x + wrist_x_off), -0.012, z_wrist)
        p_ha = (sgn * (sh_x + wrist_x_off + 0.018), -0.020, z_wrist - 0.075)
        add_bone(f"UpperArm.{side}", p_sh, p_el, "Chest", False)
        add_bone(f"LowerArm.{side}", p_el, p_wr, f"UpperArm.{side}", True)
        add_bone(f"Hand.{side}", p_wr, p_ha, f"LowerArm.{side}", True)

        p_hip = (sgn * hip_x, 0.0, z_hip)
        p_kn = (sgn * hip_x, -0.004, z_knee)
        p_an = (sgn * hip_x, 0.0, z_ankle)
        p_ft = (sgn * hip_x, -0.125, 0.02)
        add_bone(f"UpperLeg.{side}", p_hip, p_kn, "Hips", False)
        add_bone(f"LowerLeg.{side}", p_kn, p_an, f"UpperLeg.{side}", True)
        add_bone(f"Foot.{side}", p_an, p_ft, f"LowerLeg.{side}", True)

    bone_names = [b.name for b in eb]
    bpy.ops.object.mode_set(mode="OBJECT")

    # 9. Assign Clean Per-Part Semantic Vertex Groups BEFORE Join (ZERO weight bleed!)
    parts = [p for p in parts if p is not None]
    for obj in parts:
        zone = obj.get("rig_zone", "torso")
        vgs = {bn: obj.vertex_groups.new(name=bn) for bn in bone_names}
        for v in obj.data.vertices:
            x, y, z = v.co.x, v.co.y, v.co.z
            w = {}
            if zone == "head":
                w["Head"] = 1.0
            elif zone == "neck":
                t = max(0.0, min(1.0, (z - (z_shoulder - 0.02)) / max(0.01, z_neck_top - (z_shoulder - 0.02))))
                w["Chest"] = max(0.0, 0.45 * (1.0 - t))
                w["Neck"] = 0.55 + 0.25 * (1.0 - t)
                w["Head"] = 0.45 * t
            elif zone == "chest":
                w["Chest"] = 1.0
            elif zone == "hips":
                w["Hips"] = 1.0
            elif zone == "skirt":
                side = "L" if x >= 0 else "R"
                # Smoothly follow Hips near waist, slight UpperLeg follow near hem
                t = max(0.0, min(1.0, (z_hip - z) / 0.24))
                w["Hips"] = 1.0 - 0.35 * t
                w[f"UpperLeg.{side}"] = 0.35 * t
            elif zone == "torso":
                if z >= z_chest:
                    t = max(0.0, min(1.0, (z - z_chest) / max(0.01, z_shoulder - z_chest)))
                    w["Chest"] = 0.65 + 0.35 * t
                    w["Spine"] = 0.35 * (1.0 - t)
                elif z >= z_waist:
                    t = max(0.0, min(1.0, (z - z_waist) / max(0.01, z_chest - z_waist)))
                    w["Spine"] = 1.0 - t * 0.45
                    w["Chest"] = t * 0.45
                else:
                    t = max(0.0, min(1.0, (z - (z_hip - 0.03)) / max(0.01, z_waist - (z_hip - 0.03))))
                    w["Hips"] = 1.0 - t * 0.65
                    w["Spine"] = t * 0.65
            elif zone in ("arm_L", "arm_R"):
                side = "L" if zone == "arm_L" else "R"
                abs_x = abs(x)
                if z >= z_elbow + 0.035:
                    sh_t = max(0.0, min(1.0, (abs_x - (sh_x - 0.03)) / 0.06))
                    w[f"UpperArm.{side}"] = sh_t
                    if sh_t < 0.99:
                        w["Chest"] = 1.0 - sh_t
                elif z >= z_elbow - 0.035:
                    t = (z_elbow + 0.035 - z) / 0.070
                    w[f"UpperArm.{side}"] = 1.0 - t
                    w[f"LowerArm.{side}"] = t
                elif z >= z_wrist + 0.01:
                    w[f"LowerArm.{side}"] = 1.0
                else:
                    w[f"Hand.{side}"] = 1.0
            elif zone in ("leg_L", "leg_R"):
                side = "L" if zone == "leg_L" else "R"
                if z >= z_knee + 0.04:
                    hip_t = max(0.0, min(1.0, (z - (z_hip - 0.08)) / 0.09))
                    w["Hips"] = hip_t * 0.30
                    w[f"UpperLeg.{side}"] = 1.0 - hip_t * 0.30
                elif z >= z_knee - 0.04:
                    t = (z_knee + 0.04 - z) / 0.08
                    w[f"UpperLeg.{side}"] = 1.0 - t
                    w[f"LowerLeg.{side}"] = t
                elif z >= z_ankle + 0.02:
                    w[f"LowerLeg.{side}"] = 1.0
                else:
                    w[f"Foot.{side}"] = 1.0

            total = sum(w.values()) or 1.0
            for bn, val in w.items():
                if val > 0.001:
                    vgs[bn].add([v.index], val / total, "REPLACE")

    # Join all cleanly weighted parts into one single SkinnedMesh!
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    char_mesh = bpy.context.active_object
    char_mesh.name = f"Mesh_{spec['id']}"
    char_mesh.parent = arm_obj
    mod = char_mesh.modifiers.new(name="Armature", type="ARMATURE")
    mod.object = arm_obj

    return char_mesh, arm_obj


# ---------------------------------------------------------------------------
# 5 Smooth Skeletal Animations (Idle, Walk, Run, Sit, Wave)
# ---------------------------------------------------------------------------
def bake_animations(arm_obj):
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")

    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "XYZ"

    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    def reset_pose():
        for pb in arm_obj.pose.bones:
            pb.location = (0.0, 0.0, 0.0)
            pb.rotation_euler = (0.0, 0.0, 0.0)

    def set_rot(bname, rx_deg=0.0, ry_deg=0.0, rz_deg=0.0):
        pb = arm_obj.pose.bones.get(bname)
        if pb:
            pb.rotation_euler = (math.radians(rx_deg), math.radians(ry_deg), math.radians(rz_deg))

    def set_loc(bname, lx=0.0, ly=0.0, lz=0.0):
        pb = arm_obj.pose.bones.get(bname)
        if pb:
            pb.location = (lx, ly, lz)

    def record_action(action_name, frame_count, pose_fn):
        act = bpy.data.actions.new(name=action_name)
        arm_obj.animation_data.action = act
        for f in range(1, frame_count + 1):
            t = (f - 1) / float(frame_count - 1)
            phase = t * math.tau
            reset_pose()
            pose_fn(phase, t)
            for pb in arm_obj.pose.bones:
                pb.keyframe_insert(data_path="rotation_euler", frame=f)
                if pb.name == "Hips":
                    pb.keyframe_insert(data_path="location", frame=f)
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, act)
        strip.name = action_name
        arm_obj.animation_data.action = None

    def anim_idle(ph, _t):
        s = math.sin(ph)
        c = math.cos(ph)
        set_loc("Hips", 0.0, 0.0, s * 0.008)
        set_rot("Spine", s * 1.5, c * 1.2, 0)
        set_rot("Chest", s * 2.0, 0, c * 1.2)
        set_rot("Head", -s * 1.8, math.sin(ph * 0.5) * 4.5, 0)
        set_rot("UpperArm.L", 4 + s * 2.2, 0, -4)
        set_rot("UpperArm.R", 4 - s * 2.2, 0, 4)
        set_rot("LowerArm.L", -10, 0, 0)
        set_rot("LowerArm.R", -10, 0, 0)

    def anim_walk(ph, _t):
        s = math.sin(ph)
        c = math.cos(ph)
        set_loc("Hips", 0.0, 0.0, abs(s) * 0.030 - 0.014)
        set_rot("Hips", 2.0, s * 4.0, c * 2.5)
        set_rot("Spine", 3.0, -s * 4.5, 0)
        set_rot("Chest", 2.0, -s * 5.5, 0)
        set_rot("Head", -2.0, s * 3.0, 0)

        l_swing = s * 27.0
        r_swing = -s * 27.0
        set_rot("UpperLeg.L", l_swing, 0, 0)
        set_rot("UpperLeg.R", r_swing, 0, 0)
        set_rot("LowerLeg.L", max(0.0, -c) * 34.0 + 4.0, 0, 0)
        set_rot("LowerLeg.R", max(0.0, c) * 34.0 + 4.0, 0, 0)
        set_rot("Foot.L", -l_swing * 0.25, 0, 0)
        set_rot("Foot.R", -r_swing * 0.25, 0, 0)

        set_rot("UpperArm.L", -s * 23.0, 0, -3)
        set_rot("UpperArm.R", s * 23.0, 0, 3)
        set_rot("LowerArm.L", -14.0 - max(0.0, s) * 14.0, 0, 0)
        set_rot("LowerArm.R", -14.0 - max(0.0, -s) * 14.0, 0, 0)

    def anim_run(ph, _t):
        s = math.sin(ph)
        c = math.cos(ph)
        set_loc("Hips", 0.0, 0.0, abs(s) * 0.052 - 0.022)
        set_rot("Hips", 7.5, s * 5.5, c * 3.5)
        set_rot("Spine", 7.5, -s * 7.5, 0)
        set_rot("Chest", 5.5, -s * 7.5, 0)
        set_rot("Head", -9.0, s * 4.0, 0)

        set_rot("UpperLeg.L", s * 44.0, 0, 0)
        set_rot("UpperLeg.R", -s * 44.0, 0, 0)
        set_rot("LowerLeg.L", max(0.0, -c) * 58.0 + 10.0, 0, 0)
        set_rot("LowerLeg.R", max(0.0, c) * 58.0 + 10.0, 0, 0)

        set_rot("UpperArm.L", -s * 42.0, 0, -3)
        set_rot("UpperArm.R", s * 42.0, 0, 3)
        set_rot("LowerArm.L", -50.0, 0, 0)
        set_rot("LowerArm.R", -50.0, 0, 0)

    def anim_sit(ph, _t):
        s = math.sin(ph)
        set_loc("Hips", 0.0, 0.0, -0.34)
        set_rot("Spine", -5.0 + s * 2.5, 0, s * 2.5)
        set_rot("Chest", -3.0, 0, s * 3.5)
        set_rot("Head", -7.0 + s * 3.5, s * 5.5, 0)
        set_rot("UpperLeg.L", -86.0, 0, -5.0)
        set_rot("UpperLeg.R", -86.0, 0, 5.0)
        set_rot("LowerLeg.L", 82.0, 0, 0)
        set_rot("LowerLeg.R", 82.0, 0, 0)
        set_rot("UpperArm.L", -142.0 + s * 14.0, 0, -16.0)
        set_rot("UpperArm.R", -142.0 - s * 14.0, 0, 16.0)
        set_rot("LowerArm.L", -15.0, 0, 0)
        set_rot("LowerArm.R", -15.0, 0, 0)

    def anim_wave(ph, _t):
        s = math.sin(ph * 2.0)
        set_loc("Hips", 0.0, 0.0, math.sin(ph) * 0.010)
        set_rot("Spine", 0, 0, -3.5)
        set_rot("Head", -3.5, 5.5, -4.5)
        set_rot("UpperArm.R", -136.0, 0, 24.0 + s * 16.0)
        set_rot("LowerArm.R", -22.0, 0, s * 20.0)
        set_rot("UpperArm.L", 5.0, 0, -6.0)
        set_rot("LowerArm.L", -12.0, 0, 0)

    record_action("Idle", 49, anim_idle)
    record_action("Walk", 25, anim_walk)
    record_action("Run", 19, anim_run)
    record_action("Sit", 31, anim_sit)
    record_action("Wave", 33, anim_wave)

    bpy.ops.object.mode_set(mode="OBJECT")


CHARACTER_SPECS = [
    {
        "id": "Sera_Street",
        "label": "세라 · 스트리트",
        "gender": "F",
        "height": 1.72,
        "skin": "#FDE2CE",
        "hair": "#3D2B3D",
        "eye": "#4F46E5",
        "hair_style": "ponytail",
        "top": "#FFF5EA",
        "inner": "#FF7A6B",
        "bottom": "#4A6FA5",
        "bottom_style": "shorts",
        "accent": "#FF7A6B",
        "shoe": "#FFFFFF",
        "sock": "#FFF8F0",
        "high_socks": True,
        "open_jacket": True,
        "accessory": "crossbody_bag",
    },
    {
        "id": "Dohyun_Varsity",
        "label": "도현 · 바시티",
        "gender": "M",
        "height": 1.78,
        "skin": "#F7D6BD",
        "hair": "#24222B",
        "eye": "#2563EB",
        "hair_style": "short_textured",
        "top": "#1E3A5F",
        "inner": "#F8FAFC",
        "bottom": "#334155",
        "bottom_style": "pants",
        "accent": "#F59E0B",
        "shoe": "#F8FAFC",
        "open_jacket": True,
        "accessory": "neck_headphones",
    },
    {
        "id": "Harin_Pastel",
        "label": "하린 · 파스텔",
        "gender": "F",
        "height": 1.70,
        "skin": "#FFE6D4",
        "hair": "#6B4433",
        "eye": "#0D9488",
        "hair_style": "long_wavy_beret",
        "top": "#F5E9FF",
        "inner": "#FFFFFF",
        "bottom": "#C4B5FD",
        "bottom_style": "dress",
        "accent": "#EC4899",
        "shoe": "#FFF1F2",
        "sock": "#FFFFFF",
        "high_socks": False,
        "short_sleeve": True,
        "accessory": None,
    },
    {
        "id": "Jihun_Creator",
        "label": "지훈 · 포토그래퍼",
        "gender": "M",
        "height": 1.76,
        "skin": "#F5D2B8",
        "hair": "#3A2A22",
        "eye": "#059669",
        "hair_style": "comma_glasses",
        "top": "#52796F",
        "inner": "#F8FAFC",
        "bottom": "#D4B996",
        "bottom_style": "pants",
        "accent": "#8D5B3C",
        "shoe": "#5C3D2E",
        "open_jacket": True,
        "accessory": "camera_strap",
    },
    {
        "id": "Luna_CyberPop",
        "label": "루나 · 사이버팝",
        "gender": "F",
        "height": 1.71,
        "skin": "#FDE4D2",
        "hair": "#3B4A7A",
        "eye": "#06B6D4",
        "hair_style": "twintails_headband",
        "top": "#1E293B",
        "inner": "#38BDF8",
        "bottom": "#0F172A",
        "bottom_style": "skirt",
        "accent": "#2DD4BF",
        "accent_emit": "#2DD4BF",
        "accent_emit_str": 0.45,
        "shoe": "#0F172A",
        "sock": "#E2E8F0",
        "high_socks": True,
        "open_jacket": True,
        "accessory": None,
    },
    {
        "id": "Minjae_Resort",
        "label": "민재 · 리조트",
        "gender": "M",
        "height": 1.77,
        "skin": "#F8D9C0",
        "hair": "#4B3529",
        "eye": "#475569",
        "hair_style": "side_part_wave",
        "top": "#C89566",
        "inner": "#FFFDF9",
        "bottom": "#2B3A55",
        "bottom_style": "pants",
        "accent": "#E05A47",
        "shoe": "#F8FAFC",
        "open_jacket": True,
        "accessory": "scarf",
    },
]


def export_character(spec):
    clear_scene()
    char_mesh, arm_obj = build_character_and_armature(spec)
    bake_animations(arm_obj)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, f"{spec['id']}.glb")

    bpy.ops.object.select_all(action="DESELECT")
    arm_obj.select_set(True)
    char_mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_animations=True,
        export_nla_strips=True,
        export_skins=True,
        export_materials="EXPORT",
    )
    size_kb = os.path.getsize(out_path) / 1024.0
    tris = sum(max(1, len(p.vertices) - 2) for p in char_mesh.data.polygons)
    print(f"[OK] Exported {spec['id']}.glb ({size_kb:.1f} KB, {tris} tris, 5 anims)")


def main():
    print(f"Blender {bpy.app.version_string} -> Generating {len(CHARACTER_SPECS)} aesthetic humanoid characters (v2)...")
    for spec in CHARACTER_SPECS:
        export_character(spec)
    print("All 6 Blender characters exported cleanly to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
