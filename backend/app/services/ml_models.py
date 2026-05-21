import asyncio
from typing import List, Dict, Any
from pathlib import Path
import os

from app.ml.ocr import HandwritingOCR
from app.ml.grader import SemanticGrader
from app.ml.keyword_checker import KeywordChecker
from app.ml.segmenter import SmartSegmenter
from app.ml.report import build_report
from app.ml.config import DEFAULT_SCORE_WEIGHTS, IRRELEVANCE_THRESHOLD
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
    
    aggregated_text = " ".join(all_text_parts)
    
    # 3. SEGMENT TEXT (Identify which part belongs to which question)
    segmenter = SmartSegmenter(question_count=len(questions))
    segmented_answers = segmenter.segment_text(aggregated_text)
    
    # Check if we found ANY markers at all
    any_markers_found = segmenter.markers_found
    
    # 4. Grade each question against its OWN segment
    question_results = []
    total_ai_marks = 0
    
    for q in questions:
        q_no = q["question_no"]
        
        # ── SMART ASSIGNMENT LOGIC ───────────────────────────────────────────
        if any_markers_found:
            # If the student used markers (Ans 1, etc.), use the specific segment.
            # If this question number is missing, they probably skipped it (empty).
            answer_to_grade = segmented_answers.get(q_no, "")
        else:
            # If NO markers were found in the whole doc (student just wrote paragraphs),
            # and there is only 1 question in the exam, assume the whole doc is the answer.
            if len(questions) == 1:
                answer_to_grade = aggregated_text
            else:
                # Multiple questions but no markers? We can't safely know where one ends.
                # Use empty text to be safe, or just provide the first chunk of text.
                answer_to_grade = "" 
        
        # Ensure it's a string and trimmed
        answer_to_grade = str(answer_to_grade).strip()

        # Semantic Score
        sem_score, sem_rationale = await asyncio.to_thread(
            grader.score, answer_to_grade, q["expected_answer"]
        )
        
        # ── SCORING LOGIC (Exactly as reference) ──────────────────────────────────
        is_irrelevant = sem_score < IRRELEVANCE_THRESHOLD
        
        keywords = q.get("keywords", [])
        kw_details = []
        
        if is_irrelevant:
            kw_score = 0.0
            kw_rationale = "⚠️ Severely irrelevant answer. Keyword marks nullified."
            kw_details = [{"keyword": kw, "found": False} for kw in keywords]
        elif keywords:
            kw_score, _, kw_details = await asyncio.to_thread(
                checker.check, answer_to_grade, keywords
            )
            kw_rationale = f"Found {len([d for d in kw_details if d.get('found')])}/{len(keywords)} keywords."
        else:
            # If no keywords, keywords contribute same as semantic score
            kw_score = sem_score
            kw_rationale = "No keywords provided. Marks awarded based on semantic meaning only."
            kw_details = []

        # ── Final Marks (75/25) ──────────────────────────────────────────────────
        weights = DEFAULT_SCORE_WEIGHTS
        final_relative_score = (sem_score * weights["semantic"]) + (kw_score * weights["keywords"])
        
        # ai_marks = min(round(final_score * max_marks * 2) / 2, max_marks)
        ai_marks = min(round(final_relative_score * q["max_marks"] * 2) / 2, q["max_marks"])
        
        question_results.append({
            "question_id": q["question_id"],
            "question_no": q_no,
            "question_text": q["question_text"],
            "extracted_answer": answer_to_grade,
            "matched_keywords": [d["keyword"] for d in kw_details if d.get("found")],
            "missing_keywords": [d["keyword"] for d in kw_details if not d.get("found")],
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
