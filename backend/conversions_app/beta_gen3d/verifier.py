import struct
import re
import os
import numpy as np
from PIL import Image, ImageDraw
from dotenv import load_dotenv

load_dotenv()

class Verifier:
    PASS_SCORE = 80

    def __init__(self, call_fn, model: str):
        self.call_fn = call_fn
        self.model   = model

    def verify(self, original_image: Image.Image,
               stl_path: str, analysis: dict) -> dict:
        print("Verifying result...")

        rendered = self._stl_to_multiview(stl_path)
        if rendered is None:
            print("STL render failed — skipping verifier")
            return {"score": 100, "needs_fix": False,
                    "issues": "NONE", "suggestion": "NONE"}

        rendered.save(os.path.join(os.path.dirname(stl_path), "last_render.png"))

        result = self._compare(original_image, rendered, analysis)
        score = result.get("score", 0)
        needs_fix = score < self.PASS_SCORE

        print(f"  Score : {score}/100")
        print(f"  Issues: {result.get('issues', 'NONE')}")
        if needs_fix:
            print("  Needs regeneration")
        else:
            print("  Result accepted")

        return {**result, "needs_fix": needs_fix}

    def _stl_to_multiview(self, stl_path: str, size: int = 300) -> Image.Image:
        try:
            triangles = self._read_stl(stl_path)
            if not triangles:
                return None

            all_verts = [v for _, v1, v2, v3 in triangles for v in [v1, v2, v3]]

            top   = self._render_silhouette(triangles, all_verts, 0, 1, size, False, "TOP")
            front = self._render_silhouette(triangles, all_verts, 0, 2, size, True,  "FRONT")
            side  = self._render_silhouette(triangles, all_verts, 1, 2, size, True,  "SIDE")

            combined = Image.new('RGB', (size*3+20, size+10), (240, 240, 240))
            combined.paste(top,   (0,         5))
            combined.paste(front, (size+10,   5))
            combined.paste(side,  (size*2+20, 5))
            return combined

        except Exception as e:
            print(f"  Render error: {e}")
            return None

    def _read_stl(self, stl_path: str) -> list:
        triangles = []
        with open(stl_path, 'rb') as f:
            f.read(80)
            n = struct.unpack('<I', f.read(4))[0]
            for _ in range(n):
                normal = struct.unpack('<3f', f.read(12))
                v1 = struct.unpack('<3f', f.read(12))
                v2 = struct.unpack('<3f', f.read(12))
                v3 = struct.unpack('<3f', f.read(12))
                f.read(2)
                triangles.append((normal, v1, v2, v3))
        return triangles

    def _render_silhouette(self, triangles, all_verts,
                           ax1, ax2, size, flip_y, label) -> Image.Image:
        pad = 20
        vals1 = [v[ax1] for v in all_verts]
        vals2 = [v[ax2] for v in all_verts]
        mn1, mx1 = min(vals1), max(vals1)
        mn2, mx2 = min(vals2), max(vals2)
        rng1 = mx1 - mn1 or 1
        rng2 = mx2 - mn2 or 1

        grid = np.zeros((size, size), dtype=np.uint8)

        for _, v1, v2, v3 in triangles:
            pts = []
            for v in [v1, v2, v3]:
                px = int((v[ax1]-mn1)/rng1*(size-2*pad)+pad)
                py = int((v[ax2]-mn2)/rng2*(size-2*pad)+pad)
                if flip_y:
                    py = size - 1 - py
                px = max(0, min(size-1, px))
                py = max(0, min(size-1, py))
                pts.append((px, py))

            tmp = Image.new('L', (size, size), 0)
            ImageDraw.Draw(tmp).polygon(pts, fill=255)
            grid = np.maximum(grid, np.array(tmp))

        arr = np.ones((size, size, 3), dtype=np.uint8) * 255
        mask = grid > 0
        arr[mask] = [100, 150, 220]

        img = Image.fromarray(arr)
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, size-1, size-1], outline=(0, 0, 0), width=2)
        draw.text((5, 5), label, fill=(0, 0, 0))
        return img

    def _compare(self, original: Image.Image,
                 rendered: Image.Image, analysis: dict) -> dict:
        shape = analysis.get("shape_type", "unknown")
        dims  = analysis.get("dimensions", {})

        prompt = f"""You are a strict CAD verification expert.
IMAGE 1: Original 2D engineering drawing (may contain top view AND section/side view).
IMAGE 2: Generated 3D model rendered as three silhouette views — Top / Front / Side (blue shapes).

Expected shape type : {shape}
Expected dimensions : {dims}

## STEP 1 — FLAT PLATE CHECK (apply before scoring)
Look at the FRONT and SIDE silhouettes in IMAGE 2.
If they are thin flat rectangles (height << width) but IMAGE 1's section view shows a tall
stepped profile (a boss, hub, or stepped cylinder rising from a base plate):
  → The model missed all vertical features — it is a flat plate error
  → SHAPE_OK: NO, HEIGHT_OK: NO
  → MATCH_SCORE must be 0–20

## STEP 2 — SCORING (only if not a flat plate)
- 90-100: shape, proportions, holes, and height layers all match exactly
- 70-89 : overall shape correct, minor dimension or hole-count errors
- 50-69 : rough shape recognizable but missing features or wrong proportions
- 0-49  : wrong shape, completely flat, or completely incorrect

Reply in EXACT format — no extra text:
MATCH_SCORE: [0-100]
DIAMETER_OK: [YES/NO]
HEIGHT_OK: [YES/NO]
HOLES_OK: [YES/NO]
SHAPE_OK: [YES/NO]
ISSUES: [specific problems, or NONE]
SUGGESTION: [one concrete CadQuery fix describing what layers/boss are missing, or NONE]
"""
        try:
            response = self.call_fn(prompt, [original, rendered])
            return self._parse_response(response.text)
        except Exception as e:
            print(f"  Verifier API error: {e}")
            return {"score": 50, "needs_fix": True,
                    "issues": f"Verifier unavailable: {e}", "suggestion": "NONE"}

    def _parse_response(self, text: str) -> dict:
        if not text:
            return {"score": 50, "needs_fix": True,
                    "issues": "Empty verifier response", "suggestion": "NONE"}
        result = {}
        for line in text.strip().split('\n'):
            line = line.strip()
            for key in ['MATCH_SCORE', 'DIAMETER_OK', 'HEIGHT_OK',
                        'HOLES_OK', 'SHAPE_OK', 'ISSUES', 'SUGGESTION']:
                if line.startswith(f'{key}:'):
                    result[key] = line.split(':', 1)[1].strip()
        score = 0
        try:
            score = int(re.findall(r'\d+', result.get('MATCH_SCORE', '0'))[0])
            score = max(0, min(100, score))
        except:
            score = 50

        return {
            "score"      : score,
            "diameter_ok": result.get("DIAMETER_OK", "?") == "YES",
            "height_ok"  : result.get("HEIGHT_OK",   "?") == "YES",
            "holes_ok"   : result.get("HOLES_OK",    "?") == "YES",
            "shape_ok"   : result.get("SHAPE_OK",    "?") == "YES",
            "issues"     : result.get("ISSUES",      "NONE"),
            "suggestion" : result.get("SUGGESTION",  "NONE"),
        }
