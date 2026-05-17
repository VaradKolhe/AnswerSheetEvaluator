"""
modules/grader.py
Semantic similarity scoring using Sentence-BERT (SBERT).
"""

from __future__ import annotations

import os
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
        self.model = SentenceTransformer(
            model_id, 
            device=self.device,
            token=os.getenv("HF_TOKEN")
        )

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

        with torch.no_grad():
            embeddings = self.model.encode(
                [student_clean, reference_clean],
                convert_to_tensor=True,
                show_progress_bar=False,
            )
        
        sem_score = float(util.cos_sim(embeddings[0], embeddings[1])[0])
        rationale = f"Similarity: {sem_score:.2%}"
        
        return sem_score, rationale
