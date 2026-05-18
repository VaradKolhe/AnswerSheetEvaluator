from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import QuestionCreate, QuestionResponse
from app.routes.auth import get_current_user
from app.database import db
import uuid
from typing import List

router = APIRouter(prefix="/questions", tags=["questions"])

@router.post("/", response_model=List[QuestionResponse])
async def create_questions(questions_in: List[QuestionCreate], current_user: dict = Depends(get_current_user)):
    if not questions_in:
        return []
    
    exam_id = questions_in[0].exam_id
    # Verify exam ownership
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Clear existing questions for this exam (Sync with prompt "dynamic form where teacher can add/remove")
    await db.questions.delete_many({"exam_id": exam_id})

    new_questions = []
    for q in questions_in:
        q_dict = q.dict()
        q_dict["question_id"] = str(uuid.uuid4())
        new_questions.append(q_dict)
    
    if new_questions:
        await db.questions.insert_many(new_questions)
        
    # Update total marks in exam
    total_marks = sum(q.max_marks for q in questions_in)
    await db.exams.update_one({"exam_id": exam_id}, {"$set": {"total_marks": total_marks}})
    
    return new_questions

@router.get("/{exam_id}", response_model=List[QuestionResponse])
async def list_questions(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    cursor = db.questions.find({"exam_id": exam_id}).sort("question_no", 1)
    return await cursor.to_list(length=100)
