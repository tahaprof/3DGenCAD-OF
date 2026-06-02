import os
import re
import io
import time
from google import genai
from PIL import Image
from dotenv import load_dotenv
from google.genai import types

load_dotenv()

class GeminiAnalyzer:

    def __init__(self):
        self.api_keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if not key:
                break
            self.api_keys.append(key)
            i += 1
        if not self.api_keys:
            single = os.getenv("GEMINI_API_KEY")
            if single:
                self.api_keys.append(single)
        if not self.api_keys:
            raise ValueError("No GEMINI_API_KEY found in .env file")

        self.current_key_index = 0
        self._dead_keys = set()
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.client = self._make_client()
        print(f"{len(self.api_keys)} API key(s) loaded — model: {self.model}")

    def _make_client(self):
        return genai.Client(api_key=self.api_keys[self.current_key_index])

    def _switch_key(self):
        nxt = (self.current_key_index + 1) % len(self.api_keys)
        if nxt == self.current_key_index:
            raise RuntimeError(
                "All API keys exhausted — daily free tier quota reached (20 req/day).\n"
                "Solutions:\n"
                "  1. Add more keys in .env (GEMINI_API_KEY_2, _3...) from different Google accounts\n"
                "  2. Wait until tomorrow for quota reset\n"
                "  3. Enable billing on Google AI Studio"
            )
        self.current_key_index = nxt
        self.client = self._make_client()
        print(f"Switched to key {self.current_key_index + 1}")

    @staticmethod
    def _parse_retry_delay(err_str: str) -> int:
        m = re.search(r"retryDelay['\"]?\s*[:=]\s*['\"]?(\d+)", err_str)
        if m:
            return int(m.group(1))
        m = re.search(r"retry[_ ]in[^0-9]*(\d+)", err_str, re.IGNORECASE)
        if m:
            return int(m.group(1))
        return 0

    def _make_config(self, max_tokens: int = 16384):
        base = dict(max_output_tokens=max_tokens, temperature=0.0)
        try:
            return types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                **base,
            )
        except Exception:
            return types.GenerateContentConfig(**base)

    def _call(self, prompt, image=None):
        contents = []
        if image is not None:
            imgs = image if isinstance(image, (list, tuple)) else [image]
            for img in imgs:
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                contents.append(types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png"))
        contents.append(prompt)

        available = len(self.api_keys) - len(self._dead_keys)
        max_retries = max(4, available * 2)
        max_tok_hits = 0

        for attempt in range(max_retries):
            while self.current_key_index in self._dead_keys:
                self._switch_key()

            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=self._make_config(16384),
                )
                finish = getattr(response.candidates[0], "finish_reason", None) if response.candidates else None
                if str(finish) in ("MAX_TOKENS", "2"):
                    max_tok_hits += 1
                    print(f"Response cut off at token limit (MAX_TOKENS hit #{max_tok_hits})")
                    if max_tok_hits == 1:
                        shorter_note = "\n\nIMPORTANT: Keep the code SHORT — max 18 lines, no comments, inline all numbers, end with result = ..."
                        if shorter_note not in contents[-1]:
                            contents[-1] = contents[-1] + shorter_note
                        continue
                    if getattr(response, "text", None):
                        print("Returning partial response after repeated MAX_TOKENS")
                        return response
                    continue
                return response
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    retry_delay = self._parse_retry_delay(err)
                    is_daily = "PerDay" in err or "per_day" in err.lower()
                    if not is_daily and retry_delay > 0 and retry_delay <= 120:
                        print(f"Rate limit (429) — waiting {retry_delay}s then retrying...")
                        time.sleep(retry_delay + 2)
                    else:
                        self._dead_keys.add(self.current_key_index)
                        print(f"Key {self.current_key_index+1} daily quota reached — switching key")
                        if len(self._dead_keys) >= len(self.api_keys):
                            raise RuntimeError(
                                "All API keys have reached their daily quota (20 req/day - free tier).\n"
                                "Solutions:\n"
                                "  1. Add more keys in .env (GEMINI_API_KEY_2, GEMINI_API_KEY_3...)\n"
                                "  2. Wait until tomorrow for quota reset\n"
                                "  3. Enable billing on Google AI Studio"
                            )
                        self._switch_key()
                elif "403" in err or "PERMISSION_DENIED" in err:
                    self._dead_keys.add(self.current_key_index)
                    print(f"Key {self.current_key_index+1} blocked (403) — switching key")
                    if len(self._dead_keys) >= len(self.api_keys):
                        raise RuntimeError("All API keys are blocked or exhausted")
                    self._switch_key()
                elif "400" in err or "INVALID_ARGUMENT" in err or "API_KEY_INVALID" in err:
                    self._dead_keys.add(self.current_key_index)
                    print(f"Key {self.current_key_index+1} invalid (400) — switching key")
                    if len(self._dead_keys) >= len(self.api_keys):
                        raise RuntimeError("All API keys are invalid — check your .env file")
                    self._switch_key()
                elif "503" in err or "UNAVAILABLE" in err:
                    wait = 5 * (attempt + 1)
                    print(f"Server busy (503) — waiting {wait}s ({attempt+1}/{max_retries})")
                    time.sleep(wait)
                else:
                    raise
        raise RuntimeError("All attempts failed — server unavailable or all keys exhausted")

    # ─────────────────────────────────────────
    # Main analysis methods
    # ─────────────────────────────────────────
    def analyze(self, image: Image.Image) -> dict:
        print("Analyzing image with Gemini...")
        result = self._analyze_and_generate(image)
        print(f"Dimensions: {result['dimensions']}")
        print(f"Shape type: {result['shape_type']}")
        print("CadQuery code generated")
        return result

    def analyze_preprocessed(self, preprocessed: dict) -> dict:
        has_split      = preprocessed.get("has_split", False)
        circle_summary = preprocessed.get("circle_summary", "")
        top_view       = preprocessed["top_view"]
        section_view   = preprocessed["section_view"]

        if has_split:
            split_note = (
                "The drawing has been split into TWO SEPARATE IMAGES:\n"
                "  IMAGE 1 = TOP/FRONT VIEW (from above — shows circular shape and hole pattern)\n"
                "  IMAGE 2 = SECTION/SIDE VIEW (cross-section — shows height layers and diameter steps)\n"
                "Read BOTH images carefully, then combine to build the full 3D part."
            )
            images = [top_view, section_view]
        else:
            split_note = "The full drawing is shown in one image (both views could not be separated)."
            images = [preprocessed["full"]]

        print(f"Pre-processing: split={has_split}, circles={circle_summary[:60]}...")

        prompt = f"""You are an expert mechanical engineer and CadQuery programmer.
Analyze the engineering drawing carefully and generate EXACT, CORRECT CadQuery code.

{split_note}

DETECTED CIRCLES (OpenCV — use as position hints only; read actual mm from φ/R labels):
{circle_summary}

══════════════════════════════════════════════════════════════════
STEP 0 — THE OUTER BOUNDARY IN THE TOP VIEW DEFINES THE PLAN SHAPE
══════════════════════════════════════════════════════════════════
FIRST, look ONLY at the outermost outline in IMAGE 1 (top view) and name its shape:
  • Triangle (3 sides)  → cq.Workplane("XY").polygon(3, across_corners_diameter)
  • Square / rectangle  → cq.Workplane("XY").rect(W, H)
  • Pentagon/hexagon(N) → cq.Workplane("XY").polygon(N, across_corners_diameter)
  • Circle              → cq.Workplane("XY").circle(r)
  • Oblong / racetrack  → rect + two end circles (see example C)
NEVER replace a polygonal or triangular plate with a plain cylinder. If the outer
boundary is a triangle, the base MUST be polygon(3, ...). Central circles are the
hub/bore — they do NOT change the plate's plan shape.

══════════════════════════════════════════════════════════════════
STEP 1 — CLASSIFY THE PART TYPE
══════════════════════════════════════════════════════════════════
[A] AXISYMMETRIC — entirely round (stepped shaft, pipe flange, hub):
    Top view: concentric circles only, outer boundary is a CIRCLE
[B] PRISMATIC — square/rectangular base with cylindrical boss:
    Top view: square/rect outer boundary + concentric circles in center
[C] EXTRUSION — uniform 2D profile extruded:
    Top view: irregular outline (L-shape, T-shape, oblong link)
[D] BLOCK WITH POCKET — rectangular solid with machined recess
[E] POLYGONAL FLANGE WITH HUB — triangle/polygon plate + central hub:
    Build: polygon plate, union hub cylinders (negative extrude for below-plate hub), cut bore

══════════════════════════════════════════════════════════════════
STEP 2 — EXTRACT ALL DIMENSIONS
══════════════════════════════════════════════════════════════════
FROM IMAGE 1 (TOP VIEW):
  • φD or ØD labels → DIAMETER; radius in code = D/2
  • R labels → RADIUS, use directly
  • "N-φD" → N holes of diameter D; "N-RD" → N holes of radius D
  • Dashed circle → PCD reference; Solid circle → physical feature edge

FROM IMAGE 2 (SECTION / SIDE VIEW):
  • Cross-hatching = SOLID MATERIAL; void areas = BORES or HOLES
  • DIMENSION CHAIN (e.g. "15 | 5 | 10 | 5 | 10"):
      - Each number = HEIGHT of one layer
      - Read LEFT→RIGHT = TOP→BOTTOM; ALL numbers used; sum = total height

══════════════════════════════════════════════════════════════════
STEP 3 — MAP DIAMETERS TO HEIGHTS
══════════════════════════════════════════════════════════════════
For PRISMATIC: widest boss circle → lowest layer; narrowest → highest.
NEVER produce a flat plate if section view shows 2+ steps.
For AXISYMMETRIC: outermost circle → widest/lowest layer; innermost → top or bore.

══════════════════════════════════════════════════════════════════
STEP 4 — BOLT HOLE POSITIONS
══════════════════════════════════════════════════════════════════
  CORNERS (diagonal ~45°):  pts = [(r*cos(radians(45+i*90)), r*sin(radians(45+i*90))) for i in range(4)]
  EDGE MIDPOINTS (0°/90°):  pts = [(r*cos(radians(i*90)),    r*sin(radians(i*90)))    for i in range(4)]
  N holes equally spaced:   pts = [(r*cos(radians(i*360/N)), r*sin(radians(i*360/N))) for i in range(N)]
Holes through base: body.faces("<Z").workplane().pushPoints(pts).circle(r).cutThruAll()
Central bore:       body.faces(">Z").workplane().circle(r).cutThruAll()

══════════════════════════════════════════════════════════════════
STEP 5 — GENERATE CADQUERY CODE
══════════════════════════════════════════════════════════════════
LAYER PATTERN (z=0 upward):
  l1 = cq.Workplane("XY").circle(r1).extrude(h1)
  l2 = cq.Workplane("XY").workplane(offset=h1).circle(r2).extrude(h2)
  body = l1.union(l2)
NEVER .translate() or .cylinder() — use workplane(offset=) instead.
POCKET: body.faces(">Z").workplane().rect(W,H).cutBlind(-depth)

STRICT RULES:
  1. Final variable MUST be `result`
  2. NO imports — available: cq, math, cos, sin, tan, radians, degrees, pi, sqrt
  3. NEVER use .fillet() .chamfer() .slot()
  4. ALL numbers inline — never `R=20` or `H=12`
  5. NO comments or explanations inside code — pure code only
  6. Max 30 lines
  7. polygon() is polygon(nSides, diameter). For custom vertices use .polyline([...]).close()
  8. DIAMOND/LOZENGE symbol = round hole → .circle(r).cutThruAll()

══════════════════════════════════════════════════════════════════
REFERENCE CODE EXAMPLES
══════════════════════════════════════════════════════════════════

[A] Stepped flange Ø100×10, Ø60×15, Ø30×20, bore Ø15, 6×Ø10 on Ø80 PCD:
```python
l1   = cq.Workplane("XY").circle(50).extrude(10)
l2   = cq.Workplane("XY").workplane(offset=10).circle(30).extrude(15)
l3   = cq.Workplane("XY").workplane(offset=25).circle(15).extrude(20)
body = l1.union(l2).union(l3)
body = body.faces(">Z").workplane().circle(7.5).cutThruAll()
pts  = [(40*cos(radians(i*60)), 40*sin(radians(i*60))) for i in range(6)]
result = body.faces("<Z").workplane().pushPoints(pts).circle(5).cutThruAll()
```

[B] 80×80 base h=10, φ80 ring h=5, φ50 h=10, φ40 h=5, φ30 top h=15, 4×Ø10 at CORNERS:
```python
base  = cq.Workplane("XY").rect(80, 80).extrude(10)
ring  = cq.Workplane("XY").workplane(offset=10).circle(40).extrude(5)
boss1 = cq.Workplane("XY").workplane(offset=15).circle(25).extrude(10)
boss2 = cq.Workplane("XY").workplane(offset=25).circle(20).extrude(5)
boss3 = cq.Workplane("XY").workplane(offset=30).circle(15).extrude(15)
body  = base.union(ring).union(boss1).union(boss2).union(boss3)
pts_b = [(40*cos(radians(45+i*90)), 40*sin(radians(45+i*90))) for i in range(4)]
body  = body.faces("<Z").workplane().pushPoints(pts_b).circle(5).cutThruAll()
pts_t = [(8*cos(radians(i*120)), 8*sin(radians(i*120))) for i in range(3)]
result = body.faces(">Z").workplane().pushPoints(pts_t).circle(5).cutThruAll()
```

[C] Connecting rod R20 ends at y=±60, bar 40×12, boss R30 h=24, bore R18, end holes R8:
```python
bar   = cq.Workplane("XY").rect(40, 120).extrude(12)
cap1  = cq.Workplane("XY").pushPoints([(0,  60)]).circle(20).extrude(12)
cap2  = cq.Workplane("XY").pushPoints([(0, -60)]).circle(20).extrude(12)
boss  = cq.Workplane("XY").circle(30).extrude(24)
body  = bar.union(cap1).union(cap2).union(boss)
body  = body.faces(">Z").workplane().circle(18).cutThruAll()
bore1 = cq.Workplane("XY").pushPoints([(0,  60)]).circle(8).extrude(25)
bore2 = cq.Workplane("XY").pushPoints([(0, -60)]).circle(8).extrude(25)
result = body.cut(bore1).cut(bore2)
```

[D] 80×50×50 block, pocket 50×30 depth=35, center hole Ø16:
```python
body   = cq.Workplane("XY").rect(80, 50).extrude(50)
body   = body.faces(">Z").workplane().rect(50, 30).cutBlind(-35)
result = body.faces(">Z").workplane().circle(8).cutThruAll()
```

[E] Triangle Φ60 plate t=15, hub Φ45 (+20 above / -10 below), bore Ø20, Ø35 counterbore depth=25:
```python
plate  = cq.Workplane("XY").polygon(3, 60).extrude(15)
hub_up = cq.Workplane("XY").workplane(offset=15).circle(22.5).extrude(20)
hub_dn = cq.Workplane("XY").circle(22.5).extrude(-10)
body   = plate.union(hub_up).union(hub_dn)
body   = body.faces(">Z").workplane().circle(10).cutThruAll()
result = body.faces(">Z").workplane().circle(17.5).cutBlind(-25)
```

══════════════════════════════════════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════════════════════════════════════
SHAPE_TYPE: [stepped_cylinder/flanged_hub/box_with_boss/link/bracket/composite]
PART_TYPE: [AXISYMMETRIC/PRISMATIC/EXTRUSION]
LENGTH: [mm or N/A]
WIDTH: [mm or N/A]
HEIGHT: [mm or N/A]
DIAMETER: [mm or N/A]
RADIUS: [mm or N/A]
HOLES: [count, size, position]
FEATURES: [list of key 3D features]
CODE:
```python
[exact code — no comments, all numbers inline, result = last line]
```
"""
        response = self._call(prompt, images)
        result = self._parse_combined(response.text)
        print(f"Dimensions: {result['dimensions']}")
        print(f"Shape type: {result['shape_type']}")
        print("CadQuery code generated")
        return result

    def _analyze_and_generate(self, image: Image.Image) -> dict:
        prompt = """You are an expert mechanical engineer and CadQuery programmer.
Analyze this engineering drawing and produce exact CadQuery code.

STEP 0 — OUTER BOUNDARY = PLAN SHAPE:
Triangle → polygon(3,D); Square/rect → rect(W,H); Polygon(N) → polygon(N,D);
Circle → circle(r); Oblong → rect + 2 end circles.
NEVER replace a polygon/triangle plate with a cylinder.

STEP 1 — CLASSIFY:
[A] AXISYMMETRIC: round boundary → stepped shaft/flange
[B] PRISMATIC: square + circles → flanged boss
[C] EXTRUSION: irregular outline → bracket/link
[D] BLOCK+POCKET: rectangle with inner rectangle
[E] POLYGONAL FLANGE+HUB: triangle/polygon + central hub (polygon plate + hub cylinders + bore)

STEP 2 — DIMENSIONS:
φD/ØD → diameter, radius=D/2; R → radius; "N-φD" → N holes diameter D
Section dimension chain (e.g. "15 5 10 5 10") → heights of layers top→bottom
Cross-hatching = solid; void = bore/hole

STEP 3 — MAP: widest boss circle → lowest layer; narrowest → highest.
NEVER flat plate if section shows multiple steps.

STEP 4 — BOLT HOLES:
Corners: [(r*cos(radians(45+i*90)), r*sin(radians(45+i*90))) for i in range(4)]
Midpoints: [(r*cos(radians(i*90)), r*sin(radians(i*90))) for i in range(4)]
N equal: [(r*cos(radians(i*360/N)), r*sin(radians(i*360/N))) for i in range(N)]

EXAMPLES:
[A] l1=cq.Workplane("XY").circle(50).extrude(10); l2=cq.Workplane("XY").workplane(offset=10).circle(25).extrude(20); body=l1.union(l2); result=body.faces(">Z").workplane().circle(7.5).cutThruAll()
[B] base=cq.Workplane("XY").rect(80,80).extrude(10); boss1=cq.Workplane("XY").workplane(offset=10).circle(25).extrude(15); body=base.union(boss1); pts=[(40*cos(radians(45+i*90)),40*sin(radians(45+i*90))) for i in range(4)]; result=body.faces("<Z").workplane().pushPoints(pts).circle(5).cutThruAll()
[E] plate=cq.Workplane("XY").polygon(3,60).extrude(15); hub_up=cq.Workplane("XY").workplane(offset=15).circle(22.5).extrude(20); hub_dn=cq.Workplane("XY").circle(22.5).extrude(-10); body=plate.union(hub_up).union(hub_dn); body=body.faces(">Z").workplane().circle(10).cutThruAll(); result=body.faces(">Z").workplane().circle(17.5).cutBlind(-25)

RULES: result=last var; no imports; no fillet/chamfer/slot; all numbers inline; no comments; max 30 lines; workplane(offset=N) not .translate(); cutBlind(-depth) not .cut(number).

OUTPUT FORMAT:
SHAPE_TYPE: [type]
PART_TYPE: [AXISYMMETRIC/PRISMATIC/EXTRUSION]
LENGTH: [mm or N/A]
WIDTH: [mm or N/A]
HEIGHT: [mm or N/A]
DIAMETER: [mm or N/A]
RADIUS: [mm or N/A]
HOLES: [description or N/A]
FEATURES: [description or N/A]
CODE:
```python
[exact code here]
```
"""
        response = self._call(prompt, image)
        return self._parse_combined(response.text)

    def fix_code(self, broken_code: str, image=None, error_msg: str = "") -> str:
        error_context = f"\nExecution error: {error_msg}\n" if error_msg else ""
        prompt = f"""Fix this broken CadQuery code. Look at the engineering drawing to get the correct dimensions.
{error_context}
BROKEN CODE:
```python
{broken_code}
```

COMMON MISTAKES TO FIX:
1. "must have at least one solid on the stack to union" → union 2D shapes before extrude.
   RIGHT: bar=cq.Workplane("XY").rect(40,120).extrude(12); cap1=cq.Workplane("XY").pushPoints([(0,60)]).circle(20).extrude(12); body=bar.union(cap1)
2. Layers: workplane(offset=cumulative_height) — NEVER .translate()
3. φD = DIAMETER → radius = D/2
4. Corner holes on square: 45+i*90 angle; edge midpoints: i*90
5. .cut(number) → use .cutBlind(-depth)
6. .slot() doesn't exist → use rect().extrude() or pushPoints().circle()
7. "polygon() missing 'diameter'" → polygon(nSides, diameter). Custom vertices: .polyline([...]).close()
8. DIAMOND symbol = round hole → .circle(r).cutThruAll()
9. All numbers inline; no R=20,H=12 variables
10. Code MUST end with: result = <shape>
11. No imports, no .fillet(), no .chamfer()
12. Output ONLY code — NO comments.

Return ONLY the corrected code inside ```python ```.
"""
        response = self._call(prompt, image)
        return self._extract_code(response.text)

    def reanalyze(self, image, previous_code: str,
                  issues: str, suggestion: str, error_msg: str = "") -> dict:
        error_context = f"\nBuild error: {error_msg}" if error_msg else ""
        prompt = f"""You are an expert CadQuery programmer. Fix the 3D model based on verifier feedback.

Verifier issues: {issues}
Verifier suggestion: {suggestion}{error_context}

Previous code (WRONG — fix it):
```python
{previous_code}
```

Look at the engineering drawing again. TWO views:
- TOP VIEW: outer shape, circles = boss diameters, small circles = bolt holes
- SECTION VIEW (cross-hatched): side profile showing height layers

IF THE ISSUE IS A FLAT PLATE:
Read the dimension chain below section view (e.g. "15 | 5 | 10 | 5 | 10"):
  - Each number = height of one layer
  - Build EVERY layer: .workplane(offset=N).circle(r).extrude(h)
  - Base = widest layer at bottom; boss layers rise above

RULES: phi/Ø=DIAMETER→r=D/2; workplane(offset=cumul); union layers; bolt holes via pushPoints; result=last var; no imports/fillet/chamfer; max 30 lines.

Reply in EXACT format:
SHAPE_TYPE: [type]
PART_TYPE: [AXISYMMETRIC/PRISMATIC]
LENGTH: [mm or N/A]
WIDTH: [mm or N/A]
HEIGHT: [mm or N/A]
DIAMETER: [mm or N/A]
RADIUS: [mm or N/A]
HOLES: [description or N/A]
FEATURES: [description or N/A]
CODE:
```python
[corrected code here]
```
"""
        response = self._call(prompt, image)
        return self._parse_combined(response.text)

    def analyze_text(self, description: str) -> dict:
        prompt = f"""Generate CadQuery code for this mechanical part:

{description}

SHAPE_TYPE: [type]
PART_TYPE: [AXISYMMETRIC/PRISMATIC]
LENGTH: [mm or N/A]
WIDTH: [mm or N/A]
HEIGHT: [mm or N/A]
DIAMETER: [mm or N/A]
RADIUS: [mm or N/A]
HOLES: [description or N/A]
FEATURES: [description or N/A]
CODE:
```python
[CadQuery code — result = last var, no imports, no fillet/chamfer, max 40 lines]
```
"""
        response = self._call(prompt, None)
        return self._parse_combined(response.text)

    # ─────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────
    def _parse_combined(self, text: str) -> dict:
        dims = {}
        shape_type = "composite"
        for line in text.strip().split("\n"):
            line = line.strip()
            if line.startswith("SHAPE_TYPE:"):
                shape_type = line.split(":", 1)[1].strip().lower()
            elif line.startswith("PART_TYPE:"):
                dims["part_type"] = line.split(":", 1)[1].strip()
            elif line.startswith("LENGTH:"):
                dims["length"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("WIDTH:"):
                dims["width"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("HEIGHT:"):
                dims["height"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("DIAMETER:"):
                dims["diameter"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("RADIUS:"):
                dims["radius"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("WALL_THICKNESS:"):
                dims["wall_thickness"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("HOLES:"):
                val = line.split(":", 1)[1].strip()
                dims["holes"] = None if val.upper() == "N/A" else val
            elif line.startswith("FEATURES:"):
                val = line.split(":", 1)[1].strip()
                dims["features"] = None if val.upper() == "N/A" else val
        return {
            "shape_type": shape_type,
            "dimensions": dims,
            "cadquery_code": self._extract_code(text)
        }

    def _extract_code(self, text: str) -> str:
        m = re.search(r"```python\s*(.*?)\s*```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
        m = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
        if "CODE:" in text:
            code_section = text.split("CODE:", 1)[1].strip()
            code_section = re.sub(r'^```\w*\n?', '', code_section)
            code_section = re.sub(r'\n?```\s*$', '', code_section)
            return code_section.strip()
        lines = text.split('\n')
        code_lines, in_code = [], False
        code_triggers = re.compile(r'^[A-Za-z_]\w*\s*=|cq\.|result\s*=|import ')
        for line in lines:
            if not in_code and code_triggers.search(line.strip()):
                in_code = True
            if in_code:
                code_lines.append(line)
        return '\n'.join(code_lines).strip() if code_lines else text.strip()

    def _parse_number(self, val: str):
        if not val or val.upper() == "N/A":
            return None
        try:
            nums = re.findall(r"[\d.]+", val)
            return float(nums[0]) if nums else None
        except Exception:
            return None
