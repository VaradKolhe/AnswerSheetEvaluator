"""
modules/keyword_checker.py
Mandatory keyword detection using semantic matching (not exact string search).
"""

from __future__ import annotations

import re
from sentence_transformers import SentenceTransformer, util

from app.ml.config import SBERT_MODEL_ID, KEYWORD_SIMILARITY_THRESHOLD
from app.utils.text_utils import normalise_text


def get_word_variations(word: str) -> set[str]:
    """
    Generate common linguistic variations of a word (plurals, etc.)
    to improve literal matching coverage. Exactly matches reference.
    """
    w = word.lower().strip()
    vars = {w}
    if w.endswith('ies') and len(w) > 3: vars.add(w[:-3] + 'y')
    if w.endswith('es') and len(w) > 2: vars.add(w[:-2]); vars.add(w[:-1])
    if w.endswith('s') and len(w) > 1: vars.add(w[:-1])
    if w.endswith('y'): vars.add(w[:-1] + 'ies')
    elif w.endswith(('s', 'x', 'z', 'ch', 'sh')): vars.add(w + 'es')
    else: vars.add(w + 's')
    return vars

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
        Evaluate keyword coverage using a hybrid approach exactly as reference.
        """
        if not mandatory_keywords:
            return 1.0, "No mandatory keywords specified.", []

        clean_text = normalise_text(student_text)
        # Split into sentences for semantic keyword matching
        sentences = [s.strip() for s in re.split(r'[.\n!?;]', clean_text.lower()) if s.strip()]

        if not sentences and not clean_text:
            rationale = "No text found."
            details = [{"keyword": kw, "found": False} for kw in mandatory_keywords]
            return 0.0, rationale, details

        details: list[dict] = []
        found_count = 0

        for keyword in mandatory_keywords:
            kw_low = keyword.lower().strip()
            found = False
            
            # 1. Regex Variation Match
            for var in get_word_variations(kw_low):
                if re.search(rf'\b{re.escape(var)}\b', clean_text.lower()):
                    found = True
                    break
            
            # 2. Semantic Match Fallback
            if not found and sentences:
                kw_emb = self.model.encode(kw_low, convert_to_tensor=True)
                sent_embs = self.model.encode(sentences, convert_to_tensor=True)
                max_sim = float(util.cos_sim(kw_emb, sent_embs)[0].max())
                if max_sim >= self.threshold:
                    found = True

            if found:
                found_count += 1

            details.append({
                "keyword": keyword,
                "found": found
            })

        score = found_count / len(mandatory_keywords)
        rationale = f"Found {found_count}/{len(mandatory_keywords)} keywords."
        return score, rationale, details
