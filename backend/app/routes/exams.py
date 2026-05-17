from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import ExamCreate, ExamResponse
from app.routes.auth import get_current_user
from app.database import db
import uuid
from datetime import datetime
from typing import List

router = APIRouter(prefix="/exams", tags=["exams"])

@router.post("/", response_model=ExamResponse)
async def create_exam(exam_in: ExamCreate, current_user: dict = Depends(get_current_user)):
    exam_dict = exam_in.dict()
    exam_dict["exam_id"] = str(uuid.uuid4())
    exam_dict["teacher_id"] = current_user["id"]
    exam_dict["created_at"] = datetime.utcnow()
    
    await db.exams.insert_one(exam_dict)
    return exam_dict

@router.get("/", response_model=List[ExamResponse])
async def list_exams(current_user: dict = Depends(get_current_user)):
    cursor = db.exams.find({"teacher_id": current_user["id"]})
    return await cursor.to_list(length=100)

@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    # 1. Check if exam exists and belongs to the teacher
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found or unauthorized")
    
    # 2. Delete the exam
    await db.exams.delete_one({"exam_id": exam_id})
    
    # 3. Delete associated questions
    await db.questions.delete_many({"exam_id": exam_id})
    
    # 4. Optional: Delete associated submissions (could be many)
    # await db.submissions.delete_many({"exam_id": exam_id})
    
    return {"message": "Exam and associated questions deleted successfully"}
