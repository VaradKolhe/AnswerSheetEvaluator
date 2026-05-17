import asyncio
from typing import List, Dict, Any
from pathlib import Path
import os

from app.ml.ocr import HandwritingOCR
from app.ml.grader import SemanticGrader
from app.ml.keyword_checker import KeywordChecker
from app.ml.segmenter import SmartSegmenter
from app.ml.report import build_report
from app.ml.config import DEFAULT_SCORE_WEIGHTS
from app.utils.pdf_utils import convert_pdf_to_images

# Singleton instances
_ocr_engine = None
_semantic_grader = None
_keyword_checker = None

def get_ml_engines():
    global _ocr_engine, _semantic_grader, _keyword_checker
    if _ocr_engine is None:
        _ocr_engine = HandwritingOCR()
    if _semantic_grader is None:
        _semantic_grader = SemanticGrader()
    if _keyword_checker is None:
        _keyword_checker = KeywordChecker()
    return _ocr_engine, _semantic_grader, _keyword_checker

async def process_full_grading(
    pdf_path: str,
    submission_id: str,
    questions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Improved Orchestrator with Answer Segmentation.
    """
    
    # 1. Split PDF into images
    upload_dir = Path("uploads") / submission_id
    image_paths = convert_pdf_to_images(pdf_path, upload_dir)
    
    ocr, grader, checker = get_ml_engines()
    
    # 2. Extract text from all pages
    all_text_parts = []
    for img_p in image_paths:
        text = await asyncio.to_thread(ocr.extract, img_p)
        all_text_parts.append(text)
    
    aggregated_text = "\n".join(all_text_parts)
    
    # 3. SEGMENT TEXT (Identify which part belongs to which question)
    segmenter = SmartSegmenter(question_count=len(questions))
    segmented_answers = segmenter.segment_text(aggregated_text)
    
    # 4. Grade each question against its OWN segment
    question_results = []
    total_ai_marks = 0
    
    for q in questions:
        q_no = q["question_no"]
        # Use segmented text if available, otherwise fallback to full text
        answer_to_grade = segmented_answers.get(q_no, aggregated_text)
        
        # Fallback: if segmenter failed (returned empty), use full text
        if not answer_to_grade.strip():
            answer_to_grade = aggregated_text

        # Semantic Score
        sem_score, sem_rationale = await asyncio.to_thread(
            grader.score, answer_to_grade, q["expected_answer"]
        )
        
        # ── SAFETY NET: If meaning is < 20%, nullify keywords ─────────────────
        is_irrelevant = sem_score < 0.20
        
        if is_irrelevant:
            kw_score = 0.0
            kw_details = [{"keyword": kw, "found": False} for kw in q["keywords"]]
            kw_rationale = "⚠️ Answer is semantically irrelevant. Keyword marks nullified."
        else:
            # Keyword Score
            kw_score, kw_rationale, kw_details = await asyncio.to_thread(
                checker.check, answer_to_grade, q["keywords"]
            )
        
        # Calculate marks
        if not q.get("keywords"):
            # If no keywords, 100% weight on semantic similarity
            ai_marks = sem_score * q["max_marks"]
            kw_score = 0.0
            kw_rationale = "No keywords provided. Marks awarded based on semantic meaning only."
            kw_details = []
        else:
            # Keyword Score
            if is_irrelevant:
                kw_score = 0.0
                kw_details = [{"keyword": kw, "found": False} for kw in q["keywords"]]
                kw_rationale = "⚠️ Answer is semantically irrelevant. Keyword marks nullified."
            else:
                kw_score, kw_rationale, kw_details = await asyncio.to_thread(
                    checker.check, answer_to_grade, q["keywords"]
                )
            
            weights = DEFAULT_SCORE_WEIGHTS
            final_relative_score = (sem_score * weights["semantic"]) + (kw_score * weights["keywords"])
            ai_marks = final_relative_score * q["max_marks"]
        
        # ── 0.5 ROUNDING LOGIC ───────────────────────────────────────────────
        ai_marks = round(ai_marks * 2) / 2
        ai_marks = min(ai_marks, q["max_marks"])
        
        question_results.append({
            "question_id": q["question_id"],
            "question_no": q_no,
            "extracted_answer": answer_to_grade,
            "matched_keywords": [d["keyword"] for d in kw_details if d["found"]],
            "missing_keywords": [d["keyword"] for d in kw_details if not d["found"]],
            "ai_marks": ai_marks,
            "final_marks": ai_marks,
            "max_marks": q["max_marks"],
            "confidence": round(sem_score, 2),
            "teacher_comment": "",
            "semantic_rationale": sem_rationale,
            "keyword_rationale": kw_rationale
        })
        total_ai_marks += ai_marks
        
    return {
        "question_results": question_results,
        "total_ai_marks": round(total_ai_marks, 2),
        "aggregated_text": aggregated_text,
        "page_images": [os.path.basename(p) for p in image_paths]
    }
