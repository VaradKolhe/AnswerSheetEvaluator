"""
config.py — Central configuration for the grading system.
Tweak these values to adjust model choices and scoring behaviour.
"""

# ── Model identifiers ────────────────────────────────────────────────────────

# TrOCR variant: 'microsoft/trocr-large-handwritten' for best accuracy,
# 'microsoft/trocr-base-handwritten' for faster inference.
TROCR_MODEL_ID = "microsoft/trocr-large-handwritten"

# Sentence-BERT model for semantic similarity.
# 'all-mpnet-base-v2' is the best general-purpose model.
SBERT_MODEL_ID = "all-mpnet-base-v2"

# ── Scoring weights ──────────────────────────────────────────────────────────
# Must sum to 1.0.
# semantic  → how closely the student's answer mirrors the rubric in meaning.
# keywords  → whether mandatory vocabulary/concepts appear in the answer.
DEFAULT_SCORE_WEIGHTS = {
    "semantic": 0.70,
    "keywords": 0.30,
}

# ── Keyword matching ─────────────────────────────────────────────────────────
# Cosine-similarity threshold above which a keyword is considered "found"
# in the student's text (semantic keyword matching via SBERT).
KEYWORD_SIMILARITY_THRESHOLD = 0.55

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
