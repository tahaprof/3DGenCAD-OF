import os
from conversions_app.beta_gen3d.image_processor2 import ImageProcessor
from conversions_app.beta_gen3d.gemini_analyzer2 import GeminiAnalyzer
from conversions_app.beta_gen3d.cad_builder2 import CADBuilder

class Drawing2CADPipeline:
    """
    Pipeline كامل:
    PDF/PNG/JPG → ImageProcessor → GeminiAnalyzer → CADBuilder → STEP/STL
    """

    def __init__(self, output_dir: str = "outputs"):
        self.processor = ImageProcessor()
        self.analyzer  = GeminiAnalyzer()
        self.builder   = CADBuilder(output_dir=output_dir)
        self.output_dir = output_dir

    def run(self, file_path: str, filename: str = None) -> dict:
        """
        المدخل : مسار ملف PDF/PNG/JPG
        المخرج : dict يحتوي كل النتائج
        """
        if filename is None:
            filename = os.path.splitext(os.path.basename(file_path))[0]

        print(f"\n{'='*50}")
        print(f"🚀 بدء المعالجة: {os.path.basename(file_path)}")
        print(f"{'='*50}")

        # ── Stage 1: معالجة الصورة ──
        print("\n📸 Stage 1: معالجة الصورة...")
        images = self.processor.process(file_path)
        # نأخذ الصفحة الأولى فقط
        image = images[0]

        # ── Stage 2: تحليل Gemini ──
        print("\n🤖 Stage 2: تحليل Gemini...")
        analysis = self.analyzer.analyze(image)

        # ── Stage 3: بناء النموذج ──
# في دالة run() عدّل Stage 3:
        print("\n🔨 Stage 3: بناء النموذج 3D...")
        paths = self.builder.build_with_autofix(
            analysis["cadquery_code"],
            filename=filename,
            analyzer=self.analyzer,
            image=image,
            max_attempts=3
        )

        # ── النتيجة النهائية ──
        result = {
            "input_file"    : file_path,
            "shape_type"    : analysis["shape_type"],
            "dimensions"    : analysis["dimensions"],
            "cadquery_code" : analysis["cadquery_code"],
            "output_files"  : paths
        }

        print(f"\n{'='*50}")
        print(f"✅ اكتملت المعالجة!")
        print(f"   الشكل     : {result['shape_type']}")
        print(f"   الأبعاد   : {result['dimensions']}")
        print(f"   الملفات   : {list(paths.keys())}")
        print(f"{'='*50}\n")

        return result