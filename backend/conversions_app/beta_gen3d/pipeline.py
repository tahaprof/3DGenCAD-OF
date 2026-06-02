import os
from conversions_app.beta_gen3d.image_processor import ImageProcessor
from conversions_app.beta_gen3d.drawing_preprocessor import DrawingPreprocessor
from conversions_app.beta_gen3d.gemini_analyzer import GeminiAnalyzer
from conversions_app.beta_gen3d.cad_builder import CADBuilder
from conversions_app.beta_gen3d.verifier import Verifier

class Drawing2CADPipeline:

    def __init__(self, output_dir: str = "outputs"):
        self.processor    = ImageProcessor()
        self.preprocessor = DrawingPreprocessor()
        self.analyzer     = GeminiAnalyzer()
        self.builder      = CADBuilder(output_dir=output_dir)
        self.verifier     = Verifier(
            call_fn=self.analyzer._call,
            model=self.analyzer.model
        )
        self.output_dir = output_dir

    def run(self, file_path: str, filename: str = None,
            max_attempts: int = 3) -> dict:

        if filename is None:
            filename = os.path.splitext(os.path.basename(file_path))[0]

        print(f"\n{'='*50}")
        print(f"Starting: {os.path.basename(file_path)}")
        print(f"{'='*50}")

        # Stage 1 — Convert file to PIL image
        print("\nStage 1: Loading image...")
        images = self.processor.process(file_path)
        image  = images[0]

        # Stage 2a — OpenCV preprocessing: split views + detect circles
        print("\nStage 2a: Splitting views + detecting circles (OpenCV)...")
        preprocessed = self.preprocessor.process(image)
        if preprocessed["has_split"]:
            print(f"   Views split successfully ({preprocessed['split_axis']})")
        else:
            print("   No split detected — sending full drawing")
        print(f"   {preprocessed['circle_summary'].splitlines()[0]}")

        # Stage 2b — Gemini analysis
        print("\nStage 2b: Gemini analysis...")
        analysis = self.analyzer.analyze_preprocessed(preprocessed)

        # Stage 3 + 4 — Build -> Verify -> Retry loop
        paths          = {}
        verify_result  = {}
        build_error    = ""
        best_candidate = None
        best_score     = -1

        for attempt in range(1, max_attempts + 1):
            print(f"\nStage 3: Building model (attempt {attempt}/{max_attempts})...")
            try:
                paths       = self.builder.build(analysis["cadquery_code"], filename=filename)
                build_error = ""
                build_ok    = True
            except Exception as e:
                build_error = str(e)
                print(f"Build failed: {build_error}")
                paths    = {}
                build_ok = False

            if build_ok and "stl" in paths:
                print(f"\nStage 4: Verifying result...")
                verify_result = self.verifier.verify(
                    original_image=image,
                    stl_path=paths["stl"],
                    analysis=analysis
                )
                score = verify_result.get("score", 0)

                if score > best_score:
                    best_score = score
                    best_candidate = {
                        "paths"   : paths.copy(),
                        "analysis": analysis.copy(),
                        "verify"  : verify_result.copy()
                    }

                if not verify_result.get("needs_fix", False):
                    print(f"Result accepted (score: {score})")
                    break

                if attempt < max_attempts:
                    print(f"Regenerating (score={score})...")
                    analysis = self.analyzer.reanalyze(
                        image=image,
                        previous_code=analysis["cadquery_code"],
                        issues=verify_result.get("issues", ""),
                        suggestion=verify_result.get("suggestion", ""),
                        error_msg=build_error
                    )
            else:
                if attempt < max_attempts:
                    print("Fixing code...")
                    fixed = self.analyzer.fix_code(
                        broken_code=analysis["cadquery_code"],
                        image=image,
                        error_msg=getattr(self.builder, "last_error", build_error)
                    )
                    analysis["cadquery_code"] = fixed

        # Use best successful build
        used_fallback = False
        if best_candidate is not None:
            print(f"Best model: score={best_score}/100")
            paths         = best_candidate["paths"]
            analysis      = best_candidate["analysis"]
            verify_result = best_candidate["verify"]
        else:
            used_fallback = True
            print("All attempts failed — using fallback shape")
            paths = self.builder.build_with_fallback(
                analysis["cadquery_code"], filename=filename
            )

        print(f"\n{'='*50}")
        print(f"Done!")
        print(f"   Shape : {analysis['shape_type']}")
        print(f"   Dims  : {analysis['dimensions']}")
        print(f"   Files : {list(paths.keys())}")
        print(f"{'='*50}\n")

        return {
            "input_file"      : file_path,
            "shape_type"      : analysis["shape_type"],
            "dimensions"      : analysis["dimensions"],
            "cadquery_code"   : analysis["cadquery_code"],
            "output_files"    : paths,
            "verify_score"    : verify_result.get("score", "N/A"),
            "verify_issues"   : verify_result.get("issues", "N/A"),
            "used_fallback"   : used_fallback,
            "last_build_error": build_error,
        }
