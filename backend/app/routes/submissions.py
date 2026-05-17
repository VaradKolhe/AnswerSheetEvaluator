from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.schemas.schemas import SubmissionResponse, StudentUpdate
from app.routes.auth import get_current_user
from app.database import db
import uuid
import os
import shutil
from datetime import datetime
from typing import List

router = APIRouter(prefix="/submissions", tags=["submissions"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload/{exam_id}", response_model=List[SubmissionResponse])
async def upload_submissions(
    exam_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    submissions = []
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            continue
            
        submission_id = str(uuid.uuid4())
        
        # Student name from filename
        base_name = os.path.splitext(file.filename)[0]
        student_name = base_name.replace('_', ' ').replace('-', ' ').title()
        
        # Force .pdf extension to match frontend expectations
        stored_filename = f"{submission_id}.pdf"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        submission_dict = {
            "submission_id": submission_id,
            "exam_id": exam_id,
            "student_name": student_name,
            "original_filename": file.filename,
            "file_path": file_path,
            "status": "pending",
            "uploaded_at": datetime.utcnow()
        }
        
        await db.submissions.insert_one(submission_dict)
        submissions.append(submission_dict)
        
    return submissions

@router.put("/{submission_id}", response_model=SubmissionResponse)
async def update_student(
    submission_id: str,
    update_in: StudentUpdate,
    current_user: dict = Depends(get_current_user)
):
    submission = await db.submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"student_name": update_in.student_name}}
    )
    
    # Also update grading results if they exist
    await db.grading_results.update_one(
        {"submission_id": submission_id},
        {"$set": {"student_name": update_in.student_name}}
    )
    
    return await db.submissions.find_one({"submission_id": submission_id})

@router.get("/exam/{exam_id}", response_model=List[SubmissionResponse])
async def list_submissions(exam_id: str, current_user: dict = Depends(get_current_user)):
    cursor = db.submissions.find({"exam_id": exam_id})
    return await cursor.to_list(length=100)

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.delete("/{submission_id}")
async def delete_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # 1. Delete physical file
    if os.path.exists(submission["file_path"]):
        os.remove(submission["file_path"])
    
    # 2. Delete from database
    await db.submissions.delete_one({"submission_id": submission_id})
    
    # 3. Delete grading results
    await db.grading_results.delete_one({"submission_id": submission_id})
    
    return {"message": "Submission deleted successfully"}
