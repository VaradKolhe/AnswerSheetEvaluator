"""
utils/image_utils.py
Image loading and preprocessing helpers for TrOCR input.

Key improvement: ruled notebook lines (horizontal blue lines, red margin)
are removed via HSV colour masking BEFORE binarisation so TrOCR only
sees handwritten ink, not notebook grid artefacts.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.ml.config import IMAGE_MAX_DIM


def preprocess_image(image_path: str | Path) -> Image.Image:
    """
    Load an image and apply preprocessing steps that improve OCR accuracy:

    1. Remove ruled notebook lines (blue horizontal + red margin) via HSV masking.
    2. Convert to grayscale.
    3. Resize to cap the longest dimension (avoids memory issues).
    4. Binarise with adaptive thresholding (handles uneven lighting).
    5. Denoise with a fast median blur.
    6. Return as a PIL Image (RGB) for the TrOCR processor.

    Args:
        image_path: Path to the source image (JPEG, PNG, TIFF, …).

    Returns:
        Preprocessed PIL Image in RGB mode.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    # Read with OpenCV (handles many formats inc. TIFF)
    img_bgr = cv2.imread(str(path))
    if img_bgr is None:
        raise ValueError(f"cv2 could not decode image: {path}")

    # ── 1. Remove ruled notebook lines (blue horizontal + red margin) ─────────
    img_bgr = _remove_ruled_lines(img_bgr)

    # ── 2. Grayscale ──────────────────────────────────────────────────────────
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # ── 3. Resize ─────────────────────────────────────────────────────────────
    h, w = gray.shape
    if max(h, w) > IMAGE_MAX_DIM:
        scale = IMAGE_MAX_DIM / max(h, w)
        gray  = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # ── 4. Adaptive threshold → binary ────────────────────────────────────────
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10,
    )

    # ── 5. Denoise ────────────────────────────────────────────────────────────
    denoised = cv2.medianBlur(binary, 3)

    # ── 6. Back to PIL RGB ────────────────────────────────────────────────────
    pil_image = Image.fromarray(denoised).convert("RGB")
    return pil_image


def _remove_ruled_lines(img_bgr: np.ndarray) -> np.ndarray:
    """
    Erase ruled notebook lines from a BGR image.
    
    1. Uses HSV masking for the red vertical margin line.
    2. Uses morphological operations to detect and remove horizontal ruled lines,
       which works regardless of ink color (preserves blue ink!).
    """
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    result = img_bgr.copy()

    # ── Red / pink margin lines (hue ~0–10 OR ~165–180) ──────────────────────
    red_lo1 = np.array([0,   40,  80], dtype=np.uint8)
    red_hi1 = np.array([12, 255, 255], dtype=np.uint8)
    red_lo2 = np.array([160, 40,  80], dtype=np.uint8)
    red_hi2 = np.array([180, 255, 255], dtype=np.uint8)
    red_mask = cv2.inRange(hsv, red_lo1, red_hi1) | cv2.inRange(hsv, red_lo2, red_hi2)

    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 40))
    red_mask = cv2.dilate(red_mask, kernel_v, iterations=1)
    result[red_mask > 0] = [255, 255, 255]

    # ── Horizontal ruled lines (Morphological) ───────────────────────────────
    # Convert to grayscale and threshold to isolate dark lines/text
    gray = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 10
    )
    
    # Detect horizontal lines (e.g. at least 40 pixels wide)
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
    
    # Dilate the detected lines slightly to ensure we erase them completely
    horizontal_lines = cv2.dilate(horizontal_lines, np.ones((3, 1), np.uint8), iterations=1)
    
    # Paint the detected lines white in the result
    result[horizontal_lines > 0] = [255, 255, 255]

    return result


def clean_image_for_ocr(image_path: str | Path) -> Image.Image:
    """
    Produce a clean, high-contrast grayscale image for TrOCR.
    TrOCR was trained on IAM datasets which are clean grayscale crops.
    Feeding it raw color photos causes hallucinations due to lighting/lines.
    Feeding it heavily binarized photos destroys cursive stroke depth.
    """
    path = Path(image_path)
    img_bgr = cv2.imread(str(path))
    
    # 1. Erase notebook lines
    img_no_lines = _remove_ruled_lines(img_bgr)
    
    # 2. Convert to grayscale
    gray = cv2.cvtColor(img_no_lines, cv2.COLOR_BGR2GRAY)
    
    # 3. Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    contrast_enhanced = clahe.apply(gray)
    
    # We purposefully skip heavy denoising because thin cursive connectors
    # (like the loop in 'o' or the stem of 't') can be blurred away,
    # causing words like "own" to be misread.
    
    return Image.fromarray(contrast_enhanced).convert("RGB")

def load_raw(image_path: str | Path) -> Image.Image:
    """Load an image without any preprocessing (useful for debugging)."""
    return Image.open(str(image_path)).convert("RGB")
