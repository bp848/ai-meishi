from __future__ import annotations

import cv2
import numpy as np

from app.models import LogoCandidate


class LogoDetector:
    def detect_logos(self, image_bytes: bytes) -> list[LogoCandidate]:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                return []
            logo_regions = self._find_logo_regions(image)
            logos: list[LogoCandidate] = []
            for i, region in enumerate(logo_regions):
                svg_path = self._region_to_svg(region)
                confidence = self._calculate_confidence(region)
                logos.append(LogoCandidate(name=f"logo_{i}", svg=svg_path, confidence=confidence))
            return logos
        except Exception:
            return []

    def _find_logo_regions(self, image: np.ndarray) -> list[np.ndarray]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        logo_regions: list[np.ndarray] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if 1000 < area < 50000:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                if 0.5 < aspect_ratio < 2.0:
                    logo_regions.append(image[y : y + h, x : x + w])
        return logo_regions

    def _region_to_svg(self, region: np.ndarray) -> str:
        height, width = region.shape[:2]
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        svg_paths: list[str] = []
        for contour in contours:
            if len(contour) > 4:
                svg_paths.append(self._contour_to_svg_path(contour))
        path_data = " ".join(svg_paths)
        return (
            f'<svg viewBox="0 0 {width} {height}">'
            f'<path d="{path_data}" fill="black"/>'
            "</svg>"
        )

    def _contour_to_svg_path(self, contour: np.ndarray) -> str:
        path_parts: list[str] = []
        for i, point in enumerate(contour):
            x, y = point[0]
            command = "M" if i == 0 else "L"
            path_parts.append(f"{command}{x} {y}")
        path_parts.append("Z")
        return " ".join(path_parts)

    def _calculate_confidence(self, region: np.ndarray) -> float:
        height, width = region.shape[:2]
        area = height * width
        aspect_ratio = width / height
        confidence = min(1.0, area / 10000)
        if 0.8 < aspect_ratio < 1.2:
            confidence *= 1.2
        return min(1.0, confidence)
