import cadquery as cq
import os
import math
import threading
import re

class CADBuilder:

    def __init__(self, output_dir: str = "outputs"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def build(self, cadquery_code: str, filename: str = "output") -> dict:
        print("Building 3D model...")
        self.last_error = None
        shape = self._execute_code(cadquery_code)
        if shape is None:
            err = getattr(self, "last_error", None) or "unknown error"
            raise RuntimeError(err)
        paths = {}
        s = self._export_step(shape, filename)
        t = self._export_stl(shape, filename)
        if s: paths["step"] = s
        if t: paths["stl"]  = t
        print("Model built successfully!")
        return paths

    def build_with_fallback(self, cadquery_code: str, filename: str = "output") -> dict:
        try:
            return self.build(cadquery_code, filename)
        except Exception as e:
            print(f"Primary build failed: {e} — using fallback")
            return self.build(
                "result = cq.Workplane('XY').box(50, 50, 50)",
                filename + "_fallback"
            )

    def build_with_autofix(self, cadquery_code, filename, analyzer, image, max_attempts=2):
        code = cadquery_code
        for attempt in range(1, max_attempts + 1):
            print(f"  Attempt {attempt}/{max_attempts}...")
            shape = self._execute_code(code)
            if shape is not None:
                paths = {}
                s = self._export_step(shape, filename)
                t = self._export_stl(shape, filename)
                if s: paths["step"] = s
                if t: paths["stl"]  = t
                print(f"  Succeeded on attempt {attempt}")
                return paths
            if attempt < max_attempts:
                print("  Gemini fixing code...")
                code = analyzer.fix_code(code, image)
        print("All attempts failed — fallback")
        return self.build_with_fallback(
            "result = cq.Workplane('XY').cylinder(30, 50)",
            filename + "_fallback"
        )

    def _execute_code(self, code: str):
        code = self._sanitize_code(code)
        n_lines = len(code.splitlines())
        print(f"  Executing code ({n_lines} lines):")
        print("-" * 40)
        print(code)
        print("-" * 40)
        namespace = {
            "cq": cq,
            "math": math,
            "cos": math.cos,
            "sin": math.sin,
            "tan": math.tan,
            "radians": math.radians,
            "degrees": math.degrees,
            "pi": math.pi,
            "sqrt": math.sqrt,
            "ceil": math.ceil,
            "floor": math.floor,
        }
        result_c = [None]
        error_c  = [None]

        def run():
            try:
                exec(code, namespace)
                if "result" not in namespace:
                    error_c[0] = "No 'result' variable found"
                    return
                result_c[0] = namespace["result"]
            except Exception as e:
                error_c[0] = str(e)

        t = threading.Thread(target=run)
        t.start()
        t.join(timeout=60)

        if t.is_alive():
            self.last_error = "Execution timed out (60s limit)"
            print("Execution timed out (60s)")
            return None
        if error_c[0]:
            self.last_error = error_c[0]
            print(f"Code error: {error_c[0]}")
            return None
        print(f"  Model ready: {type(result_c[0]).__name__}")
        return result_c[0]

    def _export_step(self, shape, filename: str):
        path = os.path.join(self.output_dir, f"{filename}.step")
        try:
            cq.exporters.export(shape, path)
            print(f"  STEP saved: {path} ({os.path.getsize(path)//1024} KB)")
            return path
        except Exception as e:
            print(f"  STEP export failed: {e}")
            return None

    def _export_stl(self, shape, filename: str):
        path = os.path.join(self.output_dir, f"{filename}.stl")
        try:
            cq.exporters.export(shape, path)
            print(f"  STL  saved: {path} ({os.path.getsize(path)//1024} KB)")
            return path
        except Exception as e:
            print(f"  STL export failed: {e}")
            return None

    def _sanitize_code(self, code: str) -> str:
        code = code.replace('°', '')
        code = code.replace('Ø', '').replace('ø', '').replace('φ', '')

        code = re.sub(r'\.(edges|vertices)\s*\([^)]*\)\s*\.fillet\s*\([^)]*\)', '', code)
        code = re.sub(r'\.(edges|vertices)\s*\([^)]*\)\s*\.chamfer\s*\([^)]*\)', '', code)
        code = re.sub(r'\.fillet\s*\([^)]*\)', '', code)
        code = re.sub(r'\.chamfer\s*\([^)]*\)', '', code)
        code = re.sub(r'\.slot2D?\s*\([^)]*\)', '', code)

        code = re.sub(r'^\s*(\w+)\s*=\s*\1\s*\.\s*(edges|faces|vertices)\s*\([^)]*\)\s*$',
                      '', code, flags=re.MULTILINE)

        code = re.sub(r'\.cut\s*\(\s*(\d+(?:\.\d*)?)\s*\)', r'.cutBlind(-\1)', code)

        code = re.sub(
            r'\.polygon\(\s*(\[.*?\])\s*\)',
            r'.polyline(\1).close()',
            code,
            flags=re.DOTALL,
        )

        code = re.sub(
            r'(\.polyline\s*\((?:[^()]*|\([^()]*\))*\))\s*\.(cut|extrude)',
            r'\1.close().\2',
            code
        )

        code = self._fix_2d_union(code)

        code = re.sub(r'^\s*import\s+.*$', '', code, flags=re.MULTILINE)
        code = re.sub(r'^\s*from\s+\S+\s+import\s+.*$', '', code, flags=re.MULTILINE)

        code = re.sub(r'(\d+)\.(\))', r'\1.0\2', code)
        code = re.sub(r'(\d+)\.(,)', r'\1.0\2', code)
        code = re.sub(r'(\d+)\.([ \t])', r'\1.0\2', code)
        code = re.sub(r'(\d+)\.$', r'\1.0', code, flags=re.MULTILINE)

        code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)

        lines = [l for l in code.split('\n') if l.strip()]
        code = '\n'.join(lines)

        if 'result' not in code:
            last_cq_var = None
            for line in lines:
                m = re.match(r'^([A-Za-z_]\w*)\s*=\s*(?:.*\.(?:union|cut|extrude|shell|intersect|add)|cq\.)', line)
                if m and m.group(1) != 'result':
                    last_cq_var = m.group(1)
            if last_cq_var:
                code += f'\nresult = {last_cq_var}'
                print(f"  Auto-added: result = {last_cq_var}")

        return code

    def _fix_2d_union(self, code: str) -> str:
        lines = code.split('\n')
        out   = []
        i     = 0
        while i < len(lines):
            line = lines[i]

            m = re.match(
                r'^(\s*)(\w+)\s*=\s*'
                r'(cq\.Workplane\("[^"]*"\)\.rect\([^)]*\))'
                r'\.union\(\s*(cq\.Workplane\("[^"]*"\)\.pushPoints\(\[[^\]]*\]\)\.circle\([^)]*\))\s*\)'
                r'\.extrude\(([^)]+)\)\s*$',
                line
            )
            if m:
                ind, var, rect_chain, pts_chain, h = m.groups()
                out.append(f"{ind}_bar_  = {rect_chain}.extrude({h})")
                out.append(f"{ind}_caps_ = {pts_chain}.extrude({h})")
                out.append(f"{ind}{var} = _bar_.union(_caps_)")
                print(f"  Auto-fixed: 2D-union-before-extrude (inline) for '{var}'")
                i += 1
                continue

            m1 = re.match(
                r'^(\s*)(\w+)\s*=\s*'
                r'(cq\.Workplane\("[^"]*"\)\.rect\([^)]*\))'
                r'\.union\(\s*(cq\.Workplane\("[^"]*"\)\.pushPoints\(\[[^\]]*\]\)\.circle\([^)]*\))\s*\)\s*$',
                line
            )
            if m1 and i + 1 < len(lines):
                m2 = re.match(
                    r'^(\s*)(\w+)\s*=\s*' + re.escape(m1.group(2)) + r'\.extrude\(([^)]+)\)\s*$',
                    lines[i + 1]
                )
                if m2:
                    ind, var2d, rect_chain, pts_chain = m1.groups()
                    ind2, var3d, h = m2.groups()
                    out.append(f"{ind}_bar_  = {rect_chain}.extrude({h})")
                    out.append(f"{ind}_caps_ = {pts_chain}.extrude({h})")
                    out.append(f"{ind}{var2d} = _bar_.union(_caps_)")
                    out.append(f"{ind2}{var3d} = {var2d}")
                    print(f"  Auto-fixed: 2D-union-before-extrude (two-line) for '{var2d}'")
                    i += 2
                    continue

            out.append(line)
            i += 1

        return '\n'.join(out)
