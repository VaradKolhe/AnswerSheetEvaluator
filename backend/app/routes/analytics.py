from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import ExamAnalytics
from app.routes.auth import get_current_user
from app.database import db
from typing import List

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/exam/{exam_id}", response_model=ExamAnalytics)
async def get_exam_analytics(exam_id: str, current_user: dict = Depends(get_current_user)):
    # Verify exam ownership
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    cursor = db.grading_results.find({"exam_id": exam_id})
    results = await cursor.to_list(length=1000)
    
    if not results:
        return ExamAnalytics(
            average_marks=0, highest_marks=0, lowest_marks=0, 
            pass_percentage=0, question_averages=[], score_distribution=[]
        )

    marks = [r["total_final_marks"] for r in results]
    avg_marks = sum(marks) / len(marks)
    highest = max(marks)
    lowest = min(marks)
    
    # Pass/Fail logic (e.g., > 40% of total marks)
    total_max = exam["total_marks"]
    pass_count = sum(1 for m in marks if m >= (total_max * 0.4))
    pass_perc = (pass_count / len(marks)) * 100
    
    # Question-wise averages
    questions_cursor = db.questions.find({"exam_id": exam_id}).sort("question_no", 1)
    questions = await questions_cursor.to_list(length=100)
    q_avgs = []
    
    for q in questions:
        q_marks = []
        for r in results:
            for qr in r["question_results"]:
                if qr["question_id"] == q["question_id"]:
                    q_marks.append(qr["final_marks"])
        q_avgs.append({
            "question_no": q["question_no"],
            "avg": round(sum(q_marks) / len(q_marks), 2) if q_marks else 0
        })

    # Score distribution
    ranges = ["0-20", "21-40", "41-60", "61-80", "81-100"]
    distribution = []
    for r_label in ranges:
        low, high = map(int, r_label.split('-'))
        perc_low = (low / 100) * total_max
        perc_high = (high / 100) * total_max
        count = sum(1 for m in marks if perc_low <= m <= perc_high)
        distribution.append({"range": r_label, "count": count})

    return ExamAnalytics(
        average_marks=round(avg_marks, 2),
        highest_marks=round(highest, 2),
        lowest_marks=round(lowest, 2),
        pass_percentage=round(pass_perc, 2),
        question_averages=q_avgs,
        score_distribution=distribution
    )
