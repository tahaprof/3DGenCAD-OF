import fitz  # pymupdf
import cv2
import numpy as np
from PIL import Image
import os

class ImageProcessor:
    """Accepts PDF, JPG, or PNG and returns a clean PIL image ready for Gemini."""

    SUPPORTED_FORMATS = [".pdf", ".png", ".jpg", ".jpeg"]

    def __init__(self, dpi: int = 300):
        self.dpi = dpi

    def process(self, file_path: str) -> list:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported format: {ext}")
        images = self._pdf_to_images(file_path) if ext == ".pdf" else self._load_image(file_path)
        processed = [self._enhance(img) for img in images]
        print(f"Processed: {len(processed)} image(s) from '{os.path.basename(file_path)}'")
        return processed

    def _pdf_to_images(self, pdf_path: str) -> list:
        images = []
        doc = fitz.open(pdf_path)
        zoom = self.dpi / 72
        matrix = fitz.Matrix(zoom, zoom)
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
            print(f"  Page {i+1}/{len(doc)}")
        doc.close()
        return images

    def _load_image(self, image_path: str) -> list:
        return [Image.open(image_path).convert("RGB")]

    def _enhance(self, pil_image: Image.Image) -> Image.Image:
        img_cv = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        return Image.fromarray(sharpened)

    def save(self, images: list, output_dir: str, prefix: str = "page") -> list:
        os.makedirs(output_dir, exist_ok=True)
        paths = []
        for i, img in enumerate(images):
            path = os.path.join(output_dir, f"{prefix}_{i+1}.png")
            img.save(path)
            paths.append(path)
        return paths
