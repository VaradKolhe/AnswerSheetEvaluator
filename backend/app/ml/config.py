"""
config.py — Central configuration for the grading system.
Tweak these values to adjust model choices and scoring behaviour.
"""

# ── Model identifiers ────────────────────────────────────────────────────────

# Qwen2-VL-2B: Best-in-class vision-language model for full-page OCR.
# This model fits in a 16GB GPU (like AWS G4dn/G5 or Colab T4).
QWEN_MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct"

# Sentence-BERT model for semantic similarity.
# 'all-mpnet-base-v2' is the best general-purpose model.
SBERT_MODEL_ID = "all-mpnet-base-v2"

# ── Scoring weights ──────────────────────────────────────────────────────────
# Must sum to 1.0.
# semantic  → how closely the student's answer mirrors the rubric in meaning.
# keywords  → whether mandatory vocabulary/concepts appear in the answer.
DEFAULT_SCORE_WEIGHTS = {
    "semantic": 0.75,
    "keywords": 0.25,
}

# ── Keyword matching ─────────────────────────────────────────────────────────
# Cosine-similarity threshold above which a keyword is considered "found"
# in the student's text (semantic keyword matching via SBERT).
KEYWORD_SIMILARITY_THRESHOLD = 0.45

# ── Image preprocessing ──────────────────────────────────────────────────────
# Target DPI for preprocessing before feeding into TrOCR.
IMAGE_DPI = 300
# Maximum image dimension (width or height) in pixels before resizing.
IMAGE_MAX_DIM = 2048

# ── Grading scale ────────────────────────────────────────────────────────────
GRADE_BOUNDARIES = {
    "A": (0.85, 1.00),
    "B": (0.70, 0.85),
    "C": (0.55, 0.70),
    "D": (0.40, 0.55),
    "F": (0.00, 0.40),
}


def score_to_grade(score: float) -> str:
    """Convert a 0–1 normalised score to a letter grade."""
    for grade, (low, high) in GRADE_BOUNDARIES.items():
        if low <= score <= high:
            return grade
    return "F"
