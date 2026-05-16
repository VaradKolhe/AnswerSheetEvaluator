"""
modules/grader.py
Semantic similarity scoring using Sentence-BERT (SBERT).
"""

from __future__ import annotations

import torch
from sentence_transformers import SentenceTransformer, util

from app.ml.config import SBERT_MODEL_ID
from app.utils.text_utils import normalise_text


class SemanticGrader:
    """
    Scores how semantically similar a student's answer is to the rubric.

    Usage
    -----
    grader = SemanticGrader()
    score, rationale = grader.score(student_text, reference_text)
    """

    def __init__(self, model_id: str = SBERT_MODEL_ID):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"  Loading Sentence-BERT model: {model_id} on {self.device} …")
        self.model = SentenceTransformer(model_id, device=self.device)

    def score(
        self,
        student_text: str,
        reference_text: str,
    ) -> tuple[float, str]:
        """
        Compute a normalised semantic similarity score (0.0 – 1.0).
        """
        student_clean   = normalise_text(student_text)
        reference_clean = normalise_text(reference_text)

        if not student_clean.strip():
            return 0.0, "No text could be extracted from the submission."

        # ── Paragraph-level similarity ────────────────────────────────────────
        with torch.no_grad():
            para_embeddings = self.model.encode(
                [student_clean, reference_clean],
                convert_to_tensor=True,
                show_progress_bar=False,
            )
        para_similarity = float(
            util.cos_sim(para_embeddings[0], para_embeddings[1])
        )

        # ── Sentence-level alignment (best-match average) ─────────────────────
        ref_sentences = [s.strip() for s in reference_clean.split(".") if s.strip()]
        stu_sentences = [s.strip() for s in student_clean.split(".") if s.strip()]

        sentence_score = 0.0
        matched_pairs: list[dict] = []

        if ref_sentences and stu_sentences:
            with torch.no_grad():
                ref_embs = self.model.encode(ref_sentences, convert_to_tensor=True, show_progress_bar=False)
                stu_embs = self.model.encode(stu_sentences, convert_to_tensor=True, show_progress_bar=False)

            total_sim = 0.0
            for i, ref_emb in enumerate(ref_embs):
                sims = util.cos_sim(ref_emb, stu_embs)[0]
                best_idx  = int(sims.argmax())
                best_sim  = float(sims[best_idx])
                total_sim += best_sim
                matched_pairs.append({
                    "rubric_point": ref_sentences[i],
                    "best_student_match": stu_sentences[best_idx],
                    "similarity": round(best_sim, 3),
                })

            sentence_score = total_sim / len(ref_sentences)

        # ── Composite semantic score (paragraph 40 % + sentence 60 %) ─────────
        composite = round(0.4 * para_similarity + 0.6 * sentence_score, 4)

        rationale = _build_rationale(composite, para_similarity, sentence_score, matched_pairs)
        return composite, rationale


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_rationale(
    composite: float,
    para_sim: float,
    sent_sim: float,
    matched_pairs: list[dict],
) -> str:
    lines = [
        f"Overall semantic score: {composite:.2%}",
        f"  • Paragraph-level cosine similarity: {para_sim:.2%}",
        f"  • Sentence-level best-match average:  {sent_sim:.2%}",
        "",
        "Rubric point coverage:",
    ]
    for pair in matched_pairs:
        marker = "✓" if pair["similarity"] >= 0.55 else "✗"
        lines.append(
            f"  {marker} [{pair['similarity']:.0%}] "
            f"'{pair['rubric_point'][:60]}…'"
        )
    return "\n".join(lines)
