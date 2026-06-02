import cv2
import numpy as np
from PIL import Image


class DrawingPreprocessor:
    """
    Stage B+D:
    - D: Split the drawing image into its individual views (top view / section view)
    - B: Detect circles and their relative sizes using HoughCircles
    Outputs structured hints that make Gemini's job much easier.
    """

    def process(self, pil_image: Image.Image) -> dict:
        img_rgb = np.array(pil_image.convert("RGB"))
        gray    = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

        left_img, right_img, split_axis = self._split_views(pil_image, gray)
        has_split = left_img is not None

        left_circles  = self._detect_circles(left_img)  if has_split else []
        right_circles = self._detect_circles(right_img) if has_split else []
        full_circles  = self._detect_circles(pil_image) if not has_split else []

        if has_split:
            if len(left_circles) >= len(right_circles):
                top_view     = left_img
                section_view = right_img
                top_circles  = left_circles
            else:
                top_view     = right_img
                section_view = left_img
                top_circles  = right_circles
        else:
            top_view = section_view = pil_image
            top_circles = full_circles

        circle_summary = self._summarize_circles(top_circles)

        return {
            "full"          : pil_image,
            "top_view"      : top_view,
            "section_view"  : section_view,
            "top_circles"   : top_circles,
            "circle_summary": circle_summary,
            "has_split"     : has_split,
            "split_axis"    : split_axis,
        }

    def _split_views(self, pil_image, gray):
        h, w = gray.shape

        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        row_lo = int(h * 0.15)
        row_hi = int(h * 0.85)
        col_sums = binary[row_lo:row_hi, :].sum(axis=0).astype(float)
        gap_col, quality_col = self._find_gap(col_sums, w)

        col_lo = int(w * 0.10)
        col_hi = int(w * 0.90)
        usable_h = int(h * 0.80)
        row_sums = binary[:usable_h, col_lo:col_hi].sum(axis=1).astype(float)
        gap_row, quality_row = self._find_gap(row_sums, usable_h)

        if gap_col is not None and gap_row is not None:
            if quality_row * 1.20 >= quality_col:
                gap_col = None
            else:
                gap_row = None

        if gap_col is not None:
            left  = pil_image.crop((0,       0, gap_col, h))
            right = pil_image.crop((gap_col, 0, w,       h))
            return left, right, "vertical"

        if gap_row is not None:
            top    = pil_image.crop((0, 0,       w, gap_row))
            bottom = pil_image.crop((0, gap_row, w, h))
            return top, bottom, "horizontal"

        return None, None, None

    def _find_gap(self, sums: np.ndarray, length: int):
        lo = int(length * 0.30)
        hi = int(length * 0.70)
        region = sums[lo:hi]
        if region.size == 0:
            return None, 0

        min_val  = region.min()
        mean_val = sums.mean()

        if mean_val == 0:
            return None, 0

        quality = 1.0 - (min_val / mean_val)

        if quality < 0.75:
            return None, 0

        gap_idx = int(region.argmin()) + lo
        return gap_idx, quality

    def _detect_circles(self, pil_img) -> list:
        if pil_img is None:
            return []

        img_np = np.array(pil_img.convert("L"))
        blurred = cv2.GaussianBlur(img_np, (7, 7), 2)

        w, h   = pil_img.size
        min_r  = max(6, min(w, h) // 60)
        max_r  = min(w, h) // 2

        raw = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=max(15, min(w, h) // 25),
            param1=60,
            param2=22,
            minRadius=min_r,
            maxRadius=max_r,
        )

        if raw is None:
            return []

        circles = []
        for c in raw[0]:
            cx, cy, r = int(c[0]), int(c[1]), int(c[2])
            circles.append({"cx": cx, "cy": cy, "r_px": r})

        circles = self._deduplicate(circles)
        circles.sort(key=lambda x: x["r_px"], reverse=True)
        return circles[:12]

    def _deduplicate(self, circles: list) -> list:
        keep = []
        for c in circles:
            duplicate = False
            for k in keep:
                dist = ((c["cx"]-k["cx"])**2 + (c["cy"]-k["cy"])**2) ** 0.5
                if dist < 12 and abs(c["r_px"]-k["r_px"]) < 8:
                    duplicate = True
                    break
            if not duplicate:
                keep.append(c)
        return keep

    def _summarize_circles(self, circles: list) -> str:
        if not circles:
            return "No circles detected by OpenCV."

        n = len(circles)
        radii = [c["r_px"] for c in circles]

        groups = []
        used   = [False] * n
        for i in range(n):
            if used[i]:
                continue
            group = [radii[i]]
            used[i] = True
            for j in range(i+1, n):
                if not used[j] and abs(radii[j] - radii[i]) / max(radii[i], 1) < 0.12:
                    group.append(radii[j])
                    used[j] = True
            groups.append(group)

        lines = [f"OpenCV detected {n} circle(s) in the top/round view:"]
        for g in groups:
            count = len(g)
            avg_r = int(sum(g) / count)
            note  = " ← likely bolt-hole pattern" if count >= 3 else ""
            lines.append(f"  - {count}x circle(s), ~{avg_r}px radius{note}")

        lines.append("(Pixel radii are relative — use the labeled φ/Ø dimensions for actual mm values.)")
        return "\n".join(lines)
