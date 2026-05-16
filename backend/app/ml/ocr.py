"""
modules/ocr.py
Handwriting extraction using Microsoft's TrOCR transformer model.

TrOCR is an image-to-text model fine-tuned on handwritten text datasets.
It internally uses a Vision Encoder (BEiT/ViT) + Text Decoder (RoBERTa).
"""

from __future__ import annotations

import torch
from pathlib import Path

from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

from app.ml.config import TROCR_MODEL_ID
from app.utils.image_utils import preprocess_image, clean_image_for_ocr


class HandwritingOCR:
    """
    Wraps TrOCR for single- or multi-line handwriting recognition.

    Usage
    -----
    ocr = HandwritingOCR()
    text = ocr.extract("path/to/assignment.jpg")
    """

    def __init__(self, model_id: str = TROCR_MODEL_ID):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"  Loading TrOCR model: {model_id} on {self.device} (first run downloads ~1 GB) ...")
        self.processor = TrOCRProcessor.from_pretrained(model_id)
        self.model = VisionEncoderDecoderModel.from_pretrained(model_id).to(self.device)
        self.model.eval()

    def extract(self, image_path: str | Path) -> str:
        """
        Extract all handwritten text from an image.

        For multi-line documents the image is sliced into horizontal strips
        (one per line) and each strip is decoded independently -- this
        approach works well because TrOCR was trained on line-level crops.

        Args:
            image_path: Path to the assignment image.

        Returns:
            Full extracted text as a single string.
        """
        
        # We use the heavily preprocessed (binarized) image to reliably find line boundaries...
        preprocessed_image = preprocess_image(image_path)
        # ...but we feed a clean, high-contrast grayscale image to TrOCR.
        clean_image = clean_image_for_ocr(image_path)
        
        line_images = self._split_into_lines(preprocessed_image, raw_image=clean_image)

        lines: list[str] = []
        for line_img in line_images:
            line_text = self._decode_line(line_img)
            if line_text.strip():
                lines.append(line_text.strip())

        return "\n".join(lines)

    # -- Private helpers -------------------------------------------------------

    def _decode_line(self, line_image: Image.Image) -> str:
        """Run TrOCR on a single line crop and return the decoded string."""
        pixel_values = self.processor(
            images=line_image.convert("RGB"),
            return_tensors="pt",
        ).pixel_values.to(self.device)

        # Use beam search instead of greedy decoding for much higher accuracy
        # on messy cursive writing (fixes spelling errors like 'sumlight').
        with torch.no_grad():
            generated_ids = self.model.generate(
                pixel_values, 
                max_new_tokens=64,
                num_beams=4,
                early_stopping=True
            )
        return self.processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]

    @staticmethod
    def _split_into_lines(
        image: Image.Image,
        min_line_height: int = 25,
        gap_ratio: float = 0.08,
        min_gap_rows: int = 2,
        raw_image: Image.Image | None = None,
        padding_y: int = 12,
    ) -> list[Image.Image]:
        """
        Improved adaptive horizontal-projection line segmentation.
        Uses a smaller gap_ratio and padding to avoid cutting off cursive tails (like 'g', 'y').
        """
        import numpy as np

        gray = np.array(image.convert("L"))                      # H x W
        # Invert: text is now high values, background is low
        row_darkness = (255 - gray).sum(axis=1).astype(float)   # dark energy per row

        # Normalise darkness to 0-1 range
        if row_darkness.max() > 0:
            row_darkness /= row_darkness.max()

        # Light smoothing to suppress single-pixel noise spikes
        kernel = np.ones(7) / 7
        smoothed = np.convolve(row_darkness, kernel, mode="same")

        # Adaptive threshold: rows below this are "gap" rows
        threshold = gap_ratio * float(smoothed.max())
        is_gap = smoothed < threshold

        # If we need to crop from raw_image, calculate the scale factor
        scale_y = 1.0
        if raw_image is not None:
            scale_y = raw_image.height / image.height

        crops: list[Image.Image] = []
        H = len(is_gap)
        i = 0
        src_img = raw_image if raw_image is not None else image

        while i < H:
            if not is_gap[i]:                   # entering a text band
                band_start = i
                while i < H and not is_gap[i]:
                    i += 1
                band_end = i
                
                # Look ahead for very small gaps (noise or small spacing between lines)
                # If the gap is tiny, merge with next line
                while i < H:
                    gap_search_start = i
                    while i < H and is_gap[i]:
                        i += 1
                    gap_size = i - gap_search_start
                    if gap_size < min_gap_rows and i < H:
                        while i < H and not is_gap[i]:
                            i += 1
                        band_end = i
                    else:
                        break

                height = band_end - band_start
                if height >= min_line_height:
                    raw_start = int(band_start * scale_y)
                    raw_end = int(band_end * scale_y)
                    
                    # Add padding
                    raw_start = max(0, raw_start - padding_y)
                    raw_end = min(src_img.height, raw_end + padding_y)
                    
                    crops.append(src_img.crop((0, raw_start, src_img.width, raw_end)))
            else:
                i += 1

        return crops if crops else [src_img]
