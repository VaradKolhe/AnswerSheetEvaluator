"""
modules/report.py
Assembles the final structured JSON grading report.
"""

from __future__ import annotations

import datetime
from pathlib import Path

from app.ml.config import score_to_grade


def build_report(
    image_path: str,
    extracted_text: str,
    final_score: float,
    semantic_score: float,
    keyword_score: float,
    semantic_rationale: str,
    keyword_rationale: str,
    keyword_details: list[dict],
) -> dict:
    """
    Build the canonical grading output dictionary.
    """
    rationale = _compose_rationale(
        final_score, semantic_score, keyword_score,
        semantic_rationale, keyword_rationale,
    )

    return {
        "metadata": {
            "image_path":  str(Path(image_path).resolve()),
            "graded_at":   datetime.datetime.utcnow().isoformat() + "Z",
            "system":      "HandwritingGrader v1.0",
        },
        "extracted_text": extracted_text,
        "score":          final_score,               # 0.0 – 1.0
        "grade":          score_to_grade(final_score),
        "rationale":      rationale,
        "breakdown": {
            "semantic_similarity": {
                "score":     round(semantic_score, 4),
                "weight":    0.70,
                "rationale": semantic_rationale,
            },
            "keyword_coverage": {
                "score":     round(keyword_score, 4),
                "weight":    0.30,
                "rationale": keyword_rationale,
                "details":   keyword_details,
            },
        },
    }


# ── Private helpers ───────────────────────────────────────────────────────────

def _compose_rationale(
    final: float,
    semantic: float,
    keyword: float,
    sem_detail: str,
    kw_detail: str,
) -> str:
    grade      = score_to_grade(final)
    verdict    = _verdict(final)

    return (
        f"Final score: {final:.0%} (Grade {grade}) — {verdict}\n\n"
        f"SEMANTIC ANALYSIS (70% of total)\n{sem_detail}\n\n"
        f"KEYWORD ANALYSIS (30% of total)\n{kw_detail}"
    )


def _verdict(score: float) -> str:
    if score >= 0.85:
        return "Excellent understanding of the topic."
    if score >= 0.70:
        return "Good coverage with minor gaps."
    if score >= 0.55:
        return "Adequate but missing several key concepts."
    if score >= 0.40:
        return "Significant gaps in understanding."
    return "Does not meet the minimum requirements."
