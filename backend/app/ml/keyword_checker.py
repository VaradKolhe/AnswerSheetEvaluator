"""
modules/keyword_checker.py
Mandatory keyword detection using semantic matching (not exact string search).
"""

from __future__ import annotations

from sentence_transformers import SentenceTransformer, util

from app.ml.config import SBERT_MODEL_ID, KEYWORD_SIMILARITY_THRESHOLD
from app.utils.text_utils import normalise_text


class KeywordChecker:
    """
    Checks that all mandatory keywords are semantically present in a text.
    """

    def __init__(
        self,
        model_id: str = SBERT_MODEL_ID,
        threshold: float = KEYWORD_SIMILARITY_THRESHOLD,
    ):
        self.model = SentenceTransformer(model_id)
        self.threshold = threshold

    def check(
        self,
        student_text: str,
        mandatory_keywords: list[str],
    ) -> tuple[float, str, list[dict]]:
        """
        Evaluate keyword coverage.
        """
        if not mandatory_keywords:
            return 1.0, "No mandatory keywords specified.", []

        clean_text = normalise_text(student_text)
        sentences  = [s.strip() for s in clean_text.split(".") if s.strip()]

        if not sentences:
            rationale = "Could not evaluate keywords — no text extracted."
            details   = [{"keyword": kw, "found": False, "best_similarity": 0.0, "matched_sentence": ""} for kw in mandatory_keywords]
            return 0.0, rationale, details

        # Encode sentences once; encode keywords individually
        sent_embeddings = self.model.encode(sentences, convert_to_tensor=True, show_progress_bar=False)

        details: list[dict] = []
        found_count = 0

        for keyword in mandatory_keywords:
            kw_embedding = self.model.encode(keyword, convert_to_tensor=True, show_progress_bar=False)
            sims         = util.cos_sim(kw_embedding, sent_embeddings)[0]
            best_idx     = int(sims.argmax())
            best_sim     = float(sims[best_idx])
            found        = best_sim >= self.threshold

            if found:
                found_count += 1

            details.append({
                "keyword":          keyword,
                "found":            found,
                "best_similarity":  round(best_sim, 3),
                "matched_sentence": sentences[best_idx] if found else "",
            })

        score     = found_count / len(mandatory_keywords)
        rationale = _build_rationale(score, details, self.threshold)
        return round(score, 4), rationale, details


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_rationale(
    score: float,
    details: list[dict],
    threshold: float,
) -> str:
    found_kws   = [d["keyword"] for d in details if d["found"]]
    missing_kws = [d["keyword"] for d in details if not d["found"]]

    lines = [
        f"Keyword coverage: {score:.0%} "
        f"({len(found_kws)}/{len(details)} keywords found at ≥{threshold:.0%} similarity)",
    ]

    if found_kws:
        lines.append(f"  Found    : {', '.join(found_kws)}")
    if missing_kws:
        lines.append(f"  Missing  : {', '.join(missing_kws)}")

    for d in details:
        marker = "✓" if d["found"] else "✗"
        sim    = d["best_similarity"]
        lines.append(f"  {marker} '{d['keyword']}' (sim={sim:.3f})")
        if d["found"]:
            lines.append(f"      → matched: \"{d['matched_sentence'][:80]}\"")

    return "\n".join(lines)
