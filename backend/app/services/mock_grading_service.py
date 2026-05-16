import asyncio
import random

async def run_mock_grading(ocr_text: str, expected_answer: str, keywords: list, max_marks: float):
    """
    Simulates semantic grading by comparing extracted text with expected answer and keywords.
    """
    await asyncio.sleep(0.5)
    
    matched = []
    missing = []
    
    # Simple keyword matching simulation
    for k in keywords:
        if k.lower() in ocr_text.lower() or random.random() > 0.4:
            matched.append(k)
        else:
            missing.append(k)
            
    # Calculate score based on matched keywords and some randomness
    if not keywords:
        ai_marks = random.uniform(0, max_marks)
    else:
        base_score = (len(matched) / len(keywords)) * max_marks
        ai_marks = min(max_marks, base_score + random.uniform(-1, 1))
        ai_marks = max(0, ai_marks)
        
    confidence = random.uniform(60, 98)
    
    return {
        "matched_keywords": matched,
        "missing_keywords": missing,
        "ai_marks": round(ai_marks, 2),
        "confidence": round(confidence, 2)
    }
