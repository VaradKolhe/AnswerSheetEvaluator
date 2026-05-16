"""
utils/text_utils.py
Text normalisation helpers used before semantic comparison.
"""

from __future__ import annotations

import re
import unicodedata


def normalise_text(text: str) -> str:
    """
    Clean and normalise raw OCR output for reliable semantic comparison.

    Steps
    -----
    1. Unicode normalisation (NFC) — collapses composed characters.
    2. Replace common OCR mis-reads (e.g. '0' → 'o' in words is NOT done
       here because it is context-dependent; handle in domain-specific rules).
    3. Remove non-printable / control characters.
    4. Collapse excessive whitespace and fix punctuation spacing.
    5. Strip leading/trailing whitespace.

    Args:
        text: Raw string from OCR or teacher input.

    Returns:
        Cleaned string ready for embedding.
    """
    if not text:
        return ""

    # 1. Unicode NFC normalisation
    text = unicodedata.normalize("NFC", text)

    # 2. Remove non-printable characters (keep newlines & tabs)
    text = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]", " ", text)

    # 3. Normalise line endings → single newline
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 4. Collapse multiple spaces / tabs on the same line
    text = re.sub(r"[ \t]{2,}", " ", text)

    # 5. Fix common OCR spacing artefacts around punctuation
    text = re.sub(r"\s([.,;:!?])", r"\1", text)   # "word ." → "word."
    text = re.sub(r"([.,;:!?])([^\s\d])", r"\1 \2", text)  # "word.next" → "word. next"

    # 6. Collapse blank lines (>1 empty line → 1 empty line)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def split_into_sentences(text: str) -> list[str]:
    """
    Simple sentence tokeniser (no NLTK dependency).
    Splits on '. ', '? ', '! ' and newlines.

    For production, replace with spaCy or NLTK sent_tokenize.
    """
    text  = normalise_text(text)
    parts = re.split(r"(?<=[.!?])\s+|\n", text)
    return [p.strip() for p in parts if p.strip()]
