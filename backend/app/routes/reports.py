from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.routes.auth import get_current_user
from app.database import db
from app.services.report_service import generate_student_report
import os

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/student/{submission_id}")
async def get_student_report(submission_id: str, current_user: dict = Depends(get_current_user)):
    grading_result = await db.grading_results.find_one({"submission_id": submission_id})
    if not grading_result:
        raise HTTPException(status_code=404, detail="Grading result not found")
        
    exam = await db.exams.find_one({"exam_id": grading_result["exam_id"]})
    if not exam or exam.get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Report not found or unauthorized")

    classroom = await db.classrooms.find_one({"classroom_id": exam["classroom_id"]})
    
    # Re-generate PDF every time for latest comments/marks
    report_path = await generate_student_report(grading_result, exam, classroom)
    
    if not os.path.exists(report_path):
        raise HTTPException(status_code=500, detail="Failed to generate report")
        
    return FileResponse(
        path=report_path, 
        filename=f"Report_{grading_result['student_name']}.pdf",
        media_type='application/pdf'
    )
