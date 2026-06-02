import cadquery as cq
import os
import traceback

class CADBuilder:
    """
    يستقبل كود CadQuery من GeminiAnalyzer
    يولّد ملفات STEP و STL حقيقية
    """

    def __init__(self, output_dir: str = "outputs"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    # ─────────────────────────────────────────
    # الدالة الرئيسية
    # ─────────────────────────────────────────
    def build(self, cadquery_code: str, filename: str = "output") -> dict:
        """
        المدخل : كود CadQuery نصي
        المخرج : dict يحتوي مسارات الملفات الناتجة
        """
        print("🔨 جاري بناء النموذج 3D...")

        # تنفيذ الكود
        result_shape = self._execute_code(cadquery_code)

        if result_shape is None:
            raise RuntimeError("❌ فشل بناء النموذج — تحقق من الكود")

        # تصدير الملفات
        paths = {}

        step_path = self._export_step(result_shape, filename)
        if step_path:
            paths["step"] = step_path

        stl_path = self._export_stl(result_shape, filename)
        if stl_path:
            paths["stl"] = stl_path

        print(f"✅ تم بناء النموذج بنجاح!")
        return paths

    # ─────────────────────────────────────────
    # تنفيذ كود CadQuery
    # ─────────────────────────────────────────

    def _execute_code(self, code: str):
        import threading
        import math

        # نوفر كل الدوال الرياضية تلقائياً
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

        result_container = [None]
        error_container  = [None]

        def run():
            try:
                exec(code, namespace)
                if "result" not in namespace:
                    error_container[0] = "❌ الكود لا يحتوي على متغير 'result'"
                    return
                result_container[0] = namespace["result"]
            except Exception as e:
                error_container[0] = str(e)

        thread = threading.Thread(target=run)
        thread.start()
        thread.join(timeout=30)

        if thread.is_alive():
            print("⏰ تجاوز الوقت المحدد")
            return None

        if error_container[0]:
            print(f"❌ خطأ: {error_container[0]}")
            return None

        print(f"  → النموذج جاهز: {type(result_container[0])}")
        return result_container[0]

    # ─────────────────────────────────────────
    # تصدير STEP
    # ─────────────────────────────────────────
    def _export_step(self, shape, filename: str) -> str:
        path = os.path.join(self.output_dir, f"{filename}.step")
        try:
            cq.exporters.export(shape, path)
            size = os.path.getsize(path) / 1024
            print(f"  💾 STEP: {path} ({size:.1f} KB)")
            return path
        except Exception as e:
            print(f"  ❌ فشل تصدير STEP: {e}")
            return None

    # ─────────────────────────────────────────
    # تصدير STL
    # ─────────────────────────────────────────
    def _export_stl(self, shape, filename: str) -> str:
        path = os.path.join(self.output_dir, f"{filename}.stl")
        try:
            cq.exporters.export(shape, path)
            size = os.path.getsize(path) / 1024
            print(f"  💾 STL : {path} ({size:.1f} KB)")
            return path
        except Exception as e:
            print(f"  ❌ فشل تصدير STL: {e}")
            return None

    # ─────────────────────────────────────────
    # إصلاح تلقائي للكود إذا فشل
    # ─────────────────────────────────────────
    def build_with_fallback(self, cadquery_code: str, filename: str = "output") -> dict:
        """
        يحاول البناء، وإذا فشل يستخدم شكل افتراضي بسيط
        """
        try:
            return self.build(cadquery_code, filename)
        except Exception as e:
            print(f"⚠️ فشل البناء الأساسي، استخدام الشكل الافتراضي")
            fallback_code = """
# شكل افتراضي عند فشل التوليد
result = cq.Workplane("XY").box(50, 50, 50)
"""
            return self.build(fallback_code, filename + "_fallback")
        
    def build_with_autofix(self, cadquery_code: str, filename: str, analyzer, image, max_attempts: int = 3) -> dict:
        """
        يحاول البناء، وإذا فشل يطلب من Gemini إصلاح الكود تلقائياً
        """
        code = cadquery_code
        
        for attempt in range(1, max_attempts + 1):
            print(f"  🔄 محاولة {attempt}/{max_attempts}...")
            result = self._execute_code(code)
            
            if result is not None:
                # نجح — صدّر الملفات
                paths = {}
                step_path = self._export_step(result, filename)
                stl_path  = self._export_stl(result, filename)
                if step_path: paths["step"] = step_path
                if stl_path:  paths["stl"]  = stl_path
                print(f"  ✅ نجح في المحاولة {attempt}")
                return paths
            
            if attempt < max_attempts:
                print(f"  🔧 Gemini يصلح الكود...")
                code = analyzer.fix_code(code, image)
        
        # فشلت كل المحاولات — fallback
        print("⚠️ استخدام الشكل الافتراضي")
        fallback = "result = cq.Workplane('XY').cylinder(30, 50)"
        result = self._execute_code(fallback)
        paths = {}
        if self._export_step(result, filename + "_fallback"):
            paths["step"] = os.path.join(self.output_dir, filename + "_fallback.step")
        if self._export_stl(result, filename + "_fallback"):
            paths["stl"] = os.path.join(self.output_dir, filename + "_fallback.stl")
        return paths