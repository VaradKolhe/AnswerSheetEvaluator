from __future__ import annotations
import fitz  # PyMuPDF
import os
from pathlib import Path
from PIL import Image
import io

def convert_pdf_to_images(pdf_path: str | Path, output_dir: str | Path, dpi: int = 300) -> list[str]:
    """
    Splits a multi-page PDF into high-resolution PNG images.
    Returns a list of paths to the generated images.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(path))
    image_paths = []

    for i in range(len(doc)):
        page = doc.load_page(i)
        # Use exact Matrix from reference script (1.5x zoom)
        mat = fitz.Matrix(1.5, 1.5)
        pix = page.get_pixmap(matrix=mat)
        
        image_name = f"page_{i+1}.png"
        image_path = out_path / image_name
        pix.save(str(image_path))
        image_paths.append(str(image_path))

    doc.close()
    return image_paths

def get_pdf_page_count(pdf_path: str | Path) -> int:
    doc = fitz.open(str(pdf_path))
    count = len(doc)
    doc.close()
    return count
