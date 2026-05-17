from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import ExamCreate, ExamUpdate, ExamResponse
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

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str, 
    exam_in: ExamUpdate, 
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    update_data = {k: v for k, v in exam_in.dict().items() if v is not None}
    if update_data:
        await db.exams.update_one({"exam_id": exam_id}, {"$set": update_data})
    
    return await db.exams.find_one({"exam_id": exam_id})

@router.get("/", response_model=List[ExamResponse])
async def list_exams(current_user: dict = Depends(get_current_user)):
    exams = await db.exams.find({"teacher_id": current_user["id"]}).to_list(length=100)
    
    # Enrich with counts
    enriched_exams = []
    for exam in exams:
        exam["question_count"] = await db.questions.count_documents({"exam_id": exam["exam_id"]})
        exam["submission_count"] = await db.submissions.count_documents({"exam_id": exam["exam_id"]})
        enriched_exams.append(exam)
        
    return enriched_exams

@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Enrich with counts
    exam["question_count"] = await db.questions.count_documents({"exam_id": exam_id})
    exam["submission_count"] = await db.submissions.count_documents({"exam_id": exam_id})
    
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
