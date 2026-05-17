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
    to improve literal matching coverage.
    """
    w = word.lower().strip()
    vars = {w}
    
    # ── PLURALS ──────────────────────────────────────────────────────────────
    if w.endswith('ies') and len(w) > 3:
        vars.add(w[:-3] + 'y')    # berries -> berry
    if w.endswith('es') and len(w) > 2:
        vars.add(w[:-2])         # processes -> process
        vars.add(w[:-1])         # cases -> case
    if w.endswith('s') and len(w) > 1:
        vars.add(w[:-1])         # plants -> plant
        
    # ── SINGULARS TO PLURAL ──────────────────────────────────────────────────
    if w.endswith('y'):
        vars.add(w[:-1] + 'ies') # berry -> berries
    elif w.endswith(('s', 'x', 'z', 'ch', 'sh')):
        vars.add(w + 'es')       # process -> processes
    else:
        vars.add(w + 's')        # plant -> plants
        
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
        Evaluate keyword coverage using a hybrid approach:
        1. Exact substring match with word boundaries
        2. Suffix variation matching (ies, es, s, etc.)
        3. Semantic similarity fallback
        """
        if not mandatory_keywords:
            return 1.0, "No mandatory keywords specified.", []

        clean_text = normalise_text(student_text).lower()
        # Better sentence splitter
        sentences = [s.strip() for s in re.split(r'[.\n!?;]', clean_text) if s.strip()]

        if not sentences:
            sentences = [clean_text] if clean_text else []

        if not sentences:
            rationale = "Could not evaluate keywords — no text extracted."
            details = [{"keyword": kw, "found": False, "best_similarity": 0.0, "matched_sentence": ""} for kw in mandatory_keywords]
            return 0.0, rationale, details

        sent_embeddings = self.model.encode(sentences, convert_to_tensor=True, show_progress_bar=False)

        details: list[dict] = []
        found_count = 0

        for keyword in mandatory_keywords:
            kw_lower = keyword.lower().strip()
            found = False
            best_sim = 0.0
            matched_sentence = ""

            # Generate variations (berry, berries, plants, plant, etc.)
            variations = get_word_variations(kw_lower)
            
            # ── 1. VARIATION MATCHING WITH WORD BOUNDARIES ───────────────────
            for var in variations:
                # Use regex to ensure we match whole words, not parts of words
                # e.g., "plant" matches "plants" (as variation) but not "implantation"
                pattern = rf'\b{re.escape(var)}\b'
                if re.search(pattern, clean_text):
                    found = True
                    best_sim = 1.0
                    for s in sentences:
                        if re.search(pattern, s):
                            matched_sentence = s
                            break
                    break
            
            # ── 2. SEMANTIC MATCH FALLBACK (Synonyms) ────────────────────────
            if not found:
                kw_embedding = self.model.encode(kw_lower, convert_to_tensor=True, show_progress_bar=False)
                sims = util.cos_sim(kw_embedding, sent_embeddings)[0]
                best_idx = int(sims.argmax())
                best_sim = float(sims[best_idx])
                found = best_sim >= self.threshold
                if found:
                    matched_sentence = sentences[best_idx]

            if found:
                found_count += 1

            details.append({
                "keyword": keyword,
                "found": found,
                "best_similarity": round(best_sim, 3),
                "matched_sentence": matched_sentence,
            })

        score = found_count / len(mandatory_keywords)
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
