#!/usr/bin/env python3
"""
Blender Headless 8-Directional Pixel Sprite Sheet Baker
Usage:
  blender -b character.blend -P scripts/blender_8dir_sprite_baker.py -- \
    --output ./site/public/assets/sprites \
    --name Solar_Guard \
    --size 128 \
    --step 2 \
    --pitch 35
"""

import argparse
import json
import math
import os
import sys

try:
    import bpy
    from mathutils import Vector
except ImportError:
    bpy = None
    Vector = None


DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
DEFAULT_ACTIONS = {
    "Idle": {"start": 0, "end": 3, "fps": 6, "loop": True},
    "Walk": {"start": 4, "end": 9, "fps": 10, "loop": True},
    "Attack": {"start": 10, "end": 15, "fps": 12, "loop": False},
    "Cast": {"start": 16, "end": 20, "fps": 10, "loop": True},
    "Sit": {"start": 21, "end": 23, "fps": 4, "loop": True},
}


def parse_args():
    """Parse CLI arguments passed after `--` in Blender."""
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="Bake 8-directional sprite sheet from Blender scene.")
    parser.add_argument("--output", default="./site/public/assets/sprites", help="Output directory")
    parser.add_argument("--name", default="Solar_Guard", help="Actor base name")
    parser.add_argument("--size", type=int, default=128, help="Square cell pixel size")
    parser.add_argument("--step", type=int, default=2, help="Frame sampling step")
    parser.add_argument("--pitch", type=float, default=35.0, help="Camera pitch angle in degrees")
    parser.add_argument("--world-height", type=float, default=2.4, help="Target world height in Three.js units")
    return parser.parse_args(argv)


def ensure_pivot_and_camera(scene, pitch_deg):
    """Create or reuse turntable root empty and crisp pixel-art camera."""
    pivot = bpy.data.objects.get("SpriteBaker_Pivot")
    if pivot is None:
        pivot = bpy.data.objects.new("SpriteBaker_Pivot", None)
        scene.collection.objects.link(pivot)

    for obj in scene.objects:
        if obj.type in {"MESH", "ARMATURE"} and obj.parent is None:
            obj.parent = pivot

    cam = bpy.data.objects.get("SpriteBaker_Camera")
    if cam is None:
        cam_data = bpy.data.cameras.new("SpriteBaker_Camera")
        cam = bpy.data.objects.new("SpriteBaker_Camera", cam_data)
        scene.collection.objects.link(cam)

    cam.data.type = "PERSP"
    cam.data.lens_unit = "FOV"
    cam.data.angle = math.radians(30.0)

    pitch_rad = math.radians(pitch_deg)
    dist = 6.5
    cam.location = Vector((0.0, -dist * math.cos(pitch_rad), 1.1 + dist * math.sin(pitch_rad)))
    direction = Vector((0.0, 0.0, 1.0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    return pivot


def configure_render_settings(scene, cell_size):
    """Configure Blender renderer for crisp transparent pixel-art silhouettes."""
    scene.render.resolution_x = cell_size
    scene.render.resolution_y = cell_size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.filter_size = 0.01
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 1


def assemble_sheet_and_atlas(frame_paths, out_dir, name, cell_size, cols, rows, world_height):
    """Composite individual PNG frames into an 8xN atlas sheet and write JSON metadata."""
    sheet_filename = f"{name}_8dir_sheet.png"
    atlas_filename = f"{name}_8dir_atlas.json"
    sheet_path = os.path.join(out_dir, sheet_filename)
    atlas_path = os.path.join(out_dir, atlas_filename)

    sheet_w = cell_size * cols
    sheet_h = cell_size * rows
    sheet_img = bpy.data.images.new(sheet_filename, width=sheet_w, height=sheet_h, alpha=True)
    pixels = [0.0] * (sheet_w * sheet_h * 4)

    for (row, col), fpath in frame_paths.items():
        tile = bpy.data.images.load(fpath)
        tile_px = list(tile.pixels)
        # Blender image pixels start bottom-left; Row 0 (S) goes at top of PNG
        dest_row_from_bottom = (rows - 1 - row) * cell_size
        dest_col_offset = col * cell_size
        for y in range(cell_size):
            src_start = y * cell_size * 4
            src_end = src_start + cell_size * 4
            dst_start = ((dest_row_from_bottom + y) * sheet_w + dest_col_offset) * 4
            pixels[dst_start : dst_start + cell_size * 4] = tile_px[src_start:src_end]
        bpy.data.images.remove(tile)

    sheet_img.pixels.foreach_set(pixels)
    sheet_img.filepath_raw = sheet_path
    sheet_img.file_format = "PNG"
    sheet_img.save()
    bpy.data.images.remove(sheet_img)

    atlas = {
        "name": name,
        "sheet": f"assets/sprites/{sheet_filename}",
        "cols": cols,
        "rows": rows,
        "cell_width": cell_size,
        "cell_height": cell_size,
        "world_height": world_height,
        "directions": DIRECTIONS,
        "columns": DEFAULT_ACTIONS,
    }
    with open(atlas_path, "w", encoding="utf-8") as fp:
        json.dump(atlas, fp, indent=2, ensure_ascii=False)

    return sheet_path, atlas_path


def main():
    if bpy is None:
        raise RuntimeError("This script must be executed inside Blender: blender -b file.blend -P blender_8dir_sprite_baker.py")

    args = parse_args()
    out_dir = os.path.abspath(args.output)
    tmp_dir = os.path.join(out_dir, f".tmp_{args.name}")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(tmp_dir, exist_ok=True)

    scene = bpy.context.scene
    configure_render_settings(scene, args.size)
    pivot = ensure_pivot_and_camera(scene, args.pitch)

    frame_start = scene.frame_start
    total_cols = 24
    rows = len(DIRECTIONS)
    frame_paths = {}

    for row_idx in range(rows):
        # Clockwise 45-deg increments: 0:S, 1:SW, 2:W, 3:NW, 4:N, 5:NE, 6:E, 7:SE
        pivot.rotation_euler[2] = -math.radians(row_idx * 45.0)
        for col_idx in range(total_cols):
            scene.frame_set(frame_start + col_idx * args.step)
            tile_path = os.path.join(tmp_dir, f"r{row_idx}_c{col_idx:02d}.png")
            scene.render.filepath = tile_path
            bpy.ops.render.render(write_still=True)
            frame_paths[(row_idx, col_idx)] = tile_path

    sheet_path, atlas_path = assemble_sheet_and_atlas(
        frame_paths, out_dir, args.name, args.size, total_cols, rows, args.world_height
    )
    print(f"[SpriteBaker] Baked sheet: {sheet_path}")
    print(f"[SpriteBaker] Baked atlas: {atlas_path}")


if __name__ == "__main__":
    main()
