import fitz  # pymupdf
import cv2
import numpy as np
from PIL import Image
import os

class ImageProcessor:
    """
    يستقبل PDF أو JPG أو PNG
    يرجع صورة نظيفة جاهزة لـ Gemini
    """

    SUPPORTED_FORMATS = [".pdf", ".png", ".jpg", ".jpeg"]

    def __init__(self, dpi: int = 300):
        self.dpi = dpi  # دقة تحويل PDF → صورة

    # ─────────────────────────────────────────
    # الدالة الرئيسية — هي التي ستستدعيها دائماً
    # ─────────────────────────────────────────
    def process(self, file_path: str) -> list[Image.Image]:
        """
        المدخل : مسار الملف (PDF/PNG/JPG)
        المخرج : قائمة صور PIL جاهزة لـ Gemini
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"الملف غير موجود: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()

        if ext not in self.SUPPORTED_FORMATS:
            raise ValueError(f"صيغة غير مدعومة: {ext}")

        if ext == ".pdf":
            images = self._pdf_to_images(file_path)
        else:
            images = self._load_image(file_path)

        # تنظيف وتحسين كل صورة
        processed = [self._enhance(img) for img in images]

        print(f"✅ تمت المعالجة: {len(processed)} صورة من '{os.path.basename(file_path)}'")
        return processed

    # ─────────────────────────────────────────
    # PDF → قائمة صور
    # ─────────────────────────────────────────
    def _pdf_to_images(self, pdf_path: str) -> list[Image.Image]:
        images = []
        doc = fitz.open(pdf_path)
        zoom = self.dpi / 72  # 72 هو الـ DPI الافتراضي لـ PDF
        matrix = fitz.Matrix(zoom, zoom)

        for page_num in range(len(doc)):
            page = doc[page_num]
            pixmap = page.get_pixmap(matrix=matrix)
            img = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            images.append(img)
            print(f"  → صفحة {page_num + 1}/{len(doc)} تم تحويلها")

        doc.close()
        return images

    # ─────────────────────────────────────────
    # JPG/PNG → قائمة صورة واحدة
    # ─────────────────────────────────────────
    def _load_image(self, image_path: str) -> list[Image.Image]:
        img = Image.open(image_path).convert("RGB")
        return [img]

    # ─────────────────────────────────────────
    # تحسين جودة الصورة للـ OCR والـ Vision
    # ─────────────────────────────────────────
    def _enhance(self, pil_image: Image.Image) -> Image.Image:
        # PIL → OpenCV
        img_cv = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

        # تحويل لـ Grayscale
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

        # رفع التباين
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # إزالة الضوضاء
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10)

        # تحسين الحدة
        kernel = np.array([[0, -1, 0],
                           [-1, 5, -1],
                           [0, -1, 0]])
        sharpened = cv2.filter2D(denoised, -1, kernel)

        # OpenCV → PIL
        result = Image.fromarray(sharpened)
        return result

    # ─────────────────────────────────────────
    # حفظ الصور المعالجة (اختياري للمراجعة)
    # ─────────────────────────────────────────
    def save(self, images: list[Image.Image], output_dir: str, prefix: str = "page") -> list[str]:
        os.makedirs(output_dir, exist_ok=True)
        paths = []
        for i, img in enumerate(images):
            path = os.path.join(output_dir, f"{prefix}_{i+1}.png")
            img.save(path)
            paths.append(path)
            print(f"  💾 حُفظت: {path}")
        return paths